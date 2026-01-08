import axios from 'axios';
import { bkashConfig } from '../config/bkash.config.js';

export async function getBkashToken() {
  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/token/grant`,
    {
      app_key: bkashConfig.appKey,
      app_secret: bkashConfig.appSecret,
    },
    {
      headers: {
        username: bkashConfig.username,
        password: bkashConfig.password,
      },
    }
  );
  return data.id_token;
}

export async function createBkashPayment(token, payload) {
  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/create`,
    payload,
    {
      headers: {
        Authorization: token,
        'X-APP-Key': bkashConfig.appKey,
      },
    }
  );
  return data;
}

export async function executeBkashPayment(token, paymentID) {
  const { data } = await axios.post(
    `${bkashConfig.baseURL}/tokenized/checkout/execute`,
    { paymentID },
    {
      headers: {
        Authorization: token,
        'X-APP-Key': bkashConfig.appKey,
      },
    }
  );
  return data;
}
