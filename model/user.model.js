// import mongoose from 'mongoose';
// import crypto from 'crypto';

// const userSchema = new mongoose.Schema({
//   firstName: {
//     type: String,
//     required: [true, 'Please provide your firstname'],
//     trim: true
//   },
//   lastName: {
//     type: String,
//     required: [true, 'Please provide your last name'],
//     trim: true
//   },
//   email: {
//     type: String,
//     required: [true, 'Please provide your email'],
//     unique: true,
//     lowercase: true,
//     trim: true,
//     match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
//   },
//   password: {
//     type: String,
//     required: [true, 'Please provide a password'],
//     minlength: [6, 'Password must be at least 6 characters'],
//     select: false // Never show password in queries
//   },
//   passwordChangedAt: Date,
//   resetPasswordToken: String,
//   resetPasswordExpire: Date,
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Generate password reset token
// userSchema.methods.createPasswordResetToken = function() {
//   const resetToken = crypto.randomBytes(32).toString('hex');
  
//   this.resetPasswordToken = crypto
//     .createHash('sha256')
//     .update(resetToken)
//     .digest('hex');
  
//   this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  
//   return resetToken;
// };

// // Check if password was changed after token was issued
// userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
//   if (this.passwordChangedAt) {
//     const changedTimestamp = parseInt(
//       this.passwordChangedAt.getTime() / 1000,
//       10
//     );
//     return JWTTimestamp < changedTimestamp;
//   }
//   return false;
// };

// const User = mongoose.model('User', userSchema);

// export default User;