// import User from "../model/user.model.js";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import crypto from "crypto";
// import sendEmail from "../utils/sendEmail.js";
// import dotenv from "dotenv";

// dotenv.config();

// // Helper function to generate JWT token
// const generateToken = (userId) => {
//   if (!process.env.JWT_SECRET) {
//     throw new Error('JWT_SECRET is not defined');
//   }
//   return jwt.sign(
//     { id: userId },
//     process.env.JWT_SECRET,
//     { expiresIn: '30d' }
//   );
// };

// export const signup = async (req, res) => {
//   try {
//     const { firstName, lastName, email, password } = req.body;

//     if (!firstName || !lastName || !email || !password) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     const existingUser = await User.findOne({ email });
//     if (existingUser) {
//       return res.status(400).json({ message: "User already exists" });
//     }

//     const saltRounds = 10;
//     const hashedPassword = await bcrypt.hash(password, saltRounds);

//     const createdUser = await User.create({
//       firstName,
//       lastName,
//       email,
//       password: hashedPassword,
//     });

//     const token = generateToken(createdUser._id);

//     res.status(201).json({
//       message: "User created successfully",
//       token,
//       user: {
//         _id: createdUser._id,
//         firstName: createdUser.firstName,
//         lastName: createdUser.lastName,
//         email: createdUser.email,
//       },
//     });
//   } catch (error) {
//     console.error("Error in signup:", error.message);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// export const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     // Input validation
//     if (!email || !password) {
//       return res.status(400).json({ message: "Email and password are required" });
//     }

//     const user = await User.findOne({ email }).select('+password');
//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const token = generateToken(user._id);

//     return res.status(200).json({
//       success: true,
//       message: "Login successful",
//       token,
//       user: {
//         _id: user._id,
//         firstName: user.firstName,
//         email: user.email,
//       }
//     });

//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ 
//       success: false,
//       message: "An error occurred during login" 
//     });
//   }
// };

// export const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // 1. Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "User not found with this email" });
//     }

//     // 2. Generate reset token
//     const resetToken = crypto.randomBytes(20).toString("hex");
    
//     // 3. Hash token and set expiry (1 hour)
//     user.resetPasswordToken = crypto
//       .createHash("sha256")
//       .update(resetToken)
//       .digest("hex");
//     user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    
//     await user.save();

//     // 4. Create reset URL
//     const resetUrl = `${req.protocol}://${req.get(
//       "host"
//     )}/api/users/reset-password/${resetToken}`;

//     // 5. Email message
//     const message = `You are receiving this email because you requested a password reset. Please click on the following link to reset your password:\n\n${resetUrl}\n\nIf you didn't request this, please ignore this email.`;

//     try {
//       await sendEmail({
//         email: user.email,
//         subject: "Password Reset Request",
//         message,
//       });

//       res.status(200).json({
//         success: true,
//         message: "Password reset email sent",
//       });
//     } catch (err) {
//       // Reset token if email fails
//       user.resetPasswordToken = undefined;
//       user.resetPasswordExpire = undefined;
//       await user.save();

//       return res.status(500).json({
//         message: "Email could not be sent",
//       });
//     }
//   } catch (error) {
//     console.error("Forgot password error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

// export const resetPassword = async (req, res) => {
//   try {
//     // 1. Get hashed token from URL
//     const resetPasswordToken = crypto
//       .createHash("sha256")
//       .update(req.params.token)
//       .digest("hex");

//     // 2. Find user with matching token that hasn't expired
//     const user = await User.findOne({
//       resetPasswordToken,
//       resetPasswordExpire: { $gt: Date.now() },
//     });

//     if (!user) {
//       return res.status(400).json({ message: "Invalid or expired token" });
//     }

//     // 3. Set new password
//     const saltRounds = 10;
//     user.password = await bcrypt.hash(req.body.password, saltRounds);
//     user.resetPasswordToken = undefined;
//     user.resetPasswordExpire = undefined;
    
//     await user.save();

//     // 4. Generate new JWT token
//     const token = generateToken(user._id);

//     res.status(200).json({
//       success: true,
//       message: "Password updated successfully",
//       token,
//       user: {
//         _id: user._id,
//         firstName: user.firstName,
//         email: user.email,
//       },
//     });
//   } catch (error) {
//     console.error("Reset password error:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };