// src/middleware/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../model/user.model.js";
import { getAccessLevel } from "../utils/access.util.js";

/**
 * Protect middleware
 * - JWT verify করবে
 * - user attach করবে
 * - auto logout করবে না
 * - accessLevel (FULL / LIMITED) attach করবে
 */
export async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.isDeleted) {
      return res
        .status(401)
        .json({ message: "Unauthorized: User not found or deleted" });
    }

    // 🔥 dynamic access check
    const accessLevel = getAccessLevel(user);

    req.user = user;
    req.accessLevel = accessLevel; // FULL | LIMITED

    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid token" });
  }
}

/**
 * Role based access (unchanged)
 */
export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Forbidden: Requires role ${roles.join(", ")}`,
      });
    }
    next();
  };
}

/**
 * 🔒 Premium / Full access only middleware
 */
export function requireFullAccess(req, res, next) {
  if (req.accessLevel !== "FULL") {
    return res.status(403).json({
      message: "Premium subscription required",
    });
  }
  next();
}
