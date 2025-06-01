import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
  throw new Error(
    'Missing SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS or EMAIL_FROM in .env'
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465, // true on 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/**
 * Send an email.
 * @param {string} to
 * @param {string} subject
 * @param {string} html
 * @param {string} [text]
 */
export default function sendEmail(to, subject, html, text) {
  return transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
}
