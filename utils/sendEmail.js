// utils/sendEmail.js
import nodemailer from 'nodemailer';

const sendEmail = async ({ email, subject, message }) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Send email
    await transporter.sendMail({
      from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject,
      text: message
    });

    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
};

// Export as default
export default sendEmail;