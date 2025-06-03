import * as authService from '../service/user.service.js';

import {
  forgotPassword as forgotPasswordSvc,
  resetPassword   as resetPasswordSvc,
  // … other exports like signUp, login, etc.
} from '../service/user.service.js';

export async function signUp(req, res, next) {
  try {
    const result = await authService.signUp(req.body);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (e) {
    next(e);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await forgotPasswordSvc(req.body.email);
    res.json({ message: 'Password reset link sent to your email' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body;
    await resetPasswordSvc(token, newPassword);
    res.json({ message: 'Password has been reset' });
  } catch (err) {
    next(err);
  }
}


export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(
      req.user._id,
      oldPassword,
      newPassword
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}


export async function verifyEmail(req, res, next) {
  try {
    await authService.verifyEmail(req.query.token);
   const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            color: #333;
          }
          .container {
            background-color: #fff;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
            width: 90%;
          }
          .success-icon {
            font-size: 3rem;
            color: #28a745;
          }
          .message {
            margin: 1rem 0;
            font-size: 1.2rem;
          }
          .login-link {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.5rem 1rem;
            background-color: #007bff;
            color: #fff;
            text-decoration: none;
            border-radius: 4px;
            transition: background-color 0.3s;
          }
          .login-link:hover {
            background-color: #0056b3;
          }
          .footer {
            margin-top: 2rem;
            font-size: 0.9rem;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✔</div>
          <div class="message">Email verified! You can now log in.</div>
          <a href="/signin" class="login-link">Go to Login</a>
          <div class="footer">Thank you for verifying your email. Contact support if you need assistance.</div>
        </div>
      </body>
      </html>
    `;
    res.set('Content-Type', 'text/html');
    res.send(htmlResponse);
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    const user = await authService.getUser(req.user._id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const updatedUser = await authService.updateProfile(req.user._id, req.body);
    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
}

export async function subscribe(req, res, next) {
  try {
    const updatedUser = await authService.subscribe(req.user._id, req.body);
    res.json({ user: updatedUser });
  } catch (err) {
    next(err);
  }
}




