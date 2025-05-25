// import express from 'express';
// import crypto from 'crypto';
// import User from '../model/user.model.js';
// import sendEmail from '../utils/sendEmail.js';
// import { requiredAuth } from '../middlewares/auth.middleware.js';

// const router = express.Router();

// // Forgot password route
// router.post('/forgot-password', async (req, res) => {
//   try {
//     const { email } = req.body;
    
//     // 1. Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ success: false, message: 'Email not found' });
//     }

//     // 2. Generate reset token
//     const resetToken = crypto.randomBytes(20).toString('hex');
//     const resetPasswordToken = crypto
//       .createHash('sha256')
//       .update(resetToken)
//       .digest('hex');

//     // 3. Set token expiration (1 hour)
//     const resetPasswordExpire = Date.now() + 3600000;

//     // 4. Save to database
//     user.resetPasswordToken = resetPasswordToken;
//     user.resetPasswordExpire = resetPasswordExpire;
//     await user.save();

//     // 5. Create reset URL
//     const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

//     // 6. Send email
//     const message = `You are receiving this email because you (or someone else) has requested to reset your password. Please make a PUT request to: \n\n ${resetUrl}`;

//     try {
//       await sendEmail({
//         email: user.email,
//         subject: 'Password Reset Token',
//         message
//       });

//       res.status(200).json({ 
//         success: true, 
//         message: 'Email sent successfully' 
//       });
//     } catch (err) {
//       // Reset token if email fails
//       user.resetPasswordToken = undefined;
//       user.resetPasswordExpire = undefined;
//       await user.save();

//       return res.status(500).json({ 
//         success: false, 
//         message: 'Email could not be sent' 
//       });
//     }
//   } catch (err) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error' 
//     });
//   }
// });

// // Added protected profile route
// router.get('/profile', requiredAuth, async (req, res) => {
//   try {
//     // Return user profile without sensitive information
//     const userProfile = {
//       _id: req.user._id,
//       name: req.user.name,
//       email: req.user.email,
//       role: req.user.role,
//       createdAt: req.user.createdAt
//     };

//     res.status(200).json({ 
//       success: true, 
//       user: userProfile 
//     });
//   } catch (err) {
//     res.status(500).json({ 
//       success: false, 
//       message: 'Error fetching profile' 
//     });
//   }
// });

// export default router;