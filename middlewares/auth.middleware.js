// // auth.middleware.js
// import jwt from 'jsonwebtoken';
// import User from '../model/user.model.js';

// // Utility function for token verification
// const verifyToken = (token) => {
//   return new Promise((resolve, reject) => {
//     jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//       if (err) return reject(err);
//       resolve(decoded);
//     });
//   });
// };

// // Your existing authenticate function (unchanged)
// export const authenticate = async (req, res, next) => {
//     try {
//         // 1. Get token from header
//         const token = req.header('Authorization')?.replace('Bearer ', '');
        
//         if (!token) {
//             return res.status(401).json({ 
//                 error: 'Authentication required' 
//             });
//         }

//         // 2. Verify token
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
//         // 3. Find user
//         const user = await User.findOne({ 
//             _id: decoded.id, 
//             'tokens.token': token 
//         }).select('-password');
        
//         if (!user) {
//             throw new Error('User not found');
//         }

//         // 4. Attach user and token to request
//         req.user = user;
//         req.token = token;
        
//         next();
//     } catch (error) {
//         console.error('Authentication error:', error);
//         res.status(401).json({ 
//             error: 'Please authenticate' 
//         });
//     }
// };

// // Your existing authorizeRoles function (unchanged)
// export const authorizeRoles = (...roles) => {
//     return (req, res, next) => {
//         if (!roles.includes(req.user.role)) {
//             return res.status(403).json({
//                 error: `Role (${req.user.role}) is not allowed to access this resource`
//             });
//         }
//         next();
//     };
// };

// // NEW: Add protect function that simply aliases authenticate
// export const protect = authenticate;

// // NEW: Optional authentication middleware
// export const optionalAuth = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (token) {
//       const decoded = await verifyToken(token);
//       req.user = await User.findOne({ 
//         _id: decoded.id,
//         'tokens.token': token
//       }).select('-password');
//     }
//     next();
//   } catch (error) {
//     console.error('Optional auth error:', error);
//     next();
//   }
// };

// // NEW: Required authentication middleware (alternative to authenticate)
// export const requiredAuth = async (req, res, next) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Not authorized, no token' 
//       });
//     }

//     const decoded = await verifyToken(token);
//     req.user = await User.findOne({ 
//       _id: decoded.id,
//       'tokens.token': token
//     }).select('-password');
    
//     if (!req.user) {
//       return res.status(401).json({ 
//         success: false,
//         message: 'Not authorized, user not found' 
//       });
//     }

//     next();
//   } catch (error) {
//     console.error('Required auth error:', error);
//     return res.status(401).json({ 
//       success: false,
//       message: 'Not authorized, token failed' 
//     });
//   }
// };

// export { 
//   optionalAuth as optional,
//   requiredAuth as required
// };

// // Keep your default export
// const authMiddleware = {
//   authenticate,
//   authorizeRoles,
//   protect,
//   optional: optionalAuth,
//   required: requiredAuth,
// };

// export default authMiddleware;