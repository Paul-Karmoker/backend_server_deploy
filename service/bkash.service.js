// src/services/bkash.service.js
import fetch from 'node-fetch';       // or global `fetch` in Node 18+
import dayjs from 'dayjs';
import jwt   from 'jsonwebtoken';
import User  from '../model/user.model.js';
import Tx    from '../model/bkashTransaction.model.js';

const {
  BKASH_BASE_URL,        // e.g. https://tokenized.sandbox.bka.sh/v1.2.0-beta
  BKASH_USER_NAME,       // your bKash username
  BKASH_PASSWORD,        // your bKash password
  BKASH_APP_KEY,         // your bKash app key
  BKASH_APP_SECRET,      // your bKash app secret
  CLIENT_URL,            // your front-end base URL
  JWT_SECRET
} = process.env;

// In-memory token cache
let idToken       = null;
let refreshToken  = null;
let tokenExpiryTs = 0;

/** Ensure we have a valid id_token (grant or refresh) */
async function ensureIdToken() {
  const now = Date.now();
  if (idToken && now < tokenExpiryTs) {
    return idToken;
  }

  // If we have a refreshToken, try to refresh
  if (refreshToken) {
    const resp = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept':       'application/json',
        'username':     BKASH_USER_NAME,
        'password':     BKASH_PASSWORD
      },
      body: JSON.stringify({
        app_key:      BKASH_APP_KEY,
        app_secret:   BKASH_APP_SECRET,
        refresh_token: refreshToken
      })
    });
    const j = await resp.json();
    if (j.id_token) {
      idToken       = j.id_token;
      refreshToken  = j.refresh_token;
      tokenExpiryTs = now + (j.expires_in - 60) * 1000;
      return idToken;
    }
  }

  // Otherwise do a full grant
  const resp = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept':       'application/json',
      'username':     BKASH_USER_NAME,
      'password':     BKASH_PASSWORD
    },
    body: JSON.stringify({
      app_key:    BKASH_APP_KEY,
      app_secret: BKASH_APP_SECRET
    })
  });
  const j = await resp.json();
  if (!j.id_token) {
    throw new Error(`bKash grant failed: ${j.statusMessage || JSON.stringify(j)}`);
  }
  idToken       = j.id_token;
  refreshToken  = j.refresh_token;
  tokenExpiryTs = now + (j.expires_in - 60) * 1000;
  return idToken;
}

/** Create Payment → returns { paymentID, bkashURL } */
export async function createPayment({
  userId,
  plan,
  amount,
  phoneNumber,
  paymentReference
}) {
  const token = await ensureIdToken();
  const resp  = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/create`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': token,
      'X-App-Key':     BKASH_APP_KEY
    },
    body: JSON.stringify({
      mode:                  '0011',
      payerReference:        phoneNumber,
      callbackURL:           `${CLIENT_URL}/api/payment/bkash/callback`,
      amount:                amount.toString(),
      currency:              'BDT',
      intent:                'sale',
      merchantInvoiceNumber: paymentReference
    })
  });
  const j = await resp.json();
  if (!j.paymentID || !j.bkashURL) {
    throw new Error(`bKash create failed: ${j.statusMessage || JSON.stringify(j)}`);
  }
  await Tx.create({
    user:             userId,
    paymentID:        j.paymentID,
    plan,
    amount,
    phoneNumber,
    paymentReference,
    status:           'created'
  });
  return { paymentID: j.paymentID, bkashURL: j.bkashURL };
}

/** Execute Payment → returns execute response JSON */
async function executePayment(paymentID) {
  const token = await ensureIdToken();
  const resp  = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/execute`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': token,
      'X-App-Key':     BKASH_APP_KEY
    },
    body: JSON.stringify({ paymentID })
  });
  return resp.json();
}

/** Query Payment Status → returns query response JSON */
async function queryPayment(paymentID) {
  const token = await ensureIdToken();
  const resp  = await fetch(`${BKASH_BASE_URL}/tokenized/checkout/payment/status`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'Authorization': token,
      'X-App-Key':     BKASH_APP_KEY
    },
    body: JSON.stringify({ paymentID })
  });
  return resp.json();
}

/**
 * Handle callback from bKash.
 *  - status==="success" → try Execute
 *  - if Execute times out/unknown → fallback to Query
 *  - upgrade user on Completed
 */
export async function handleCallback({ paymentID, status }) {
  const tx = await Tx.findOne({ paymentID });
  if (!tx) return { success: false, message: 'Unknown paymentID' };

  if (status !== 'success') {
    tx.status = 'failed';
    await tx.save();
    return { success: false, message: 'Payment cancelled or failed' };
  }

  // 1) Try to execute
  let execRes;
  try {
    execRes = await executePayment(paymentID);
  } catch {
    // network/timeout → fallback to query
  }

  // 2) If no execRes or unknown status, query
  let finalStatus = execRes?.transactionStatus;
  let statusMsg   = execRes?.statusMessage;
  if (!finalStatus) {
    const q = await queryPayment(paymentID);
    finalStatus = q.transactionStatus;
    statusMsg   = q.statusMessage;
  }

  if (finalStatus !== 'Completed') {
    tx.status = 'failed';
    await tx.save();
    return { success: false, message: statusMsg || 'Payment not completed' };
  }

  // 3) Mark executed
  tx.status     = 'executed';
  tx.executedAt = new Date();
  await tx.save();

  // 4) Upgrade user's subscription
  const user = await User.findById(tx.user);
  if (!user) throw new Error('User not found');

  const now = dayjs();
  let expires;
  switch (tx.plan) {
    case 'monthly':    expires = now.add(1, 'month');  break;
    case 'quarterly':  expires = now.add(3, 'month');  break;
    case 'semiannual': expires = now.add(6, 'month');  break;
    default:           expires = now.add(1, 'year');   break;
  }

  user.subscriptionPlan      = 'premium';
  user.subscriptionExpiresAt = expires.toDate();
  user.subscriptionPhone     = tx.phoneNumber;
  user.subscriptionReference = tx.paymentReference;
  await user.save();

  // 5) Issue new JWT
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
  return { success: true, token };
}
