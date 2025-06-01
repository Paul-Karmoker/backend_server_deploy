export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }
};