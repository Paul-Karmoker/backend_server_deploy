// src/services/adminAuth.service.js
import jwt from 'jsonwebtoken';
import UserModel from "../../client/auth/auth.model.js";

const { JWT_SECRET } = process.env;

export async function adminLogin({ email, password }) {
  const user = await UserModel.findOne({ email });
  if (!user || user.role !== 'admin' || user.isDeleted) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '60d' }
  );

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
      role: user.role,
      photo: user.photo,
    },
  };
}
