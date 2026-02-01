// src/routes/user.router.js
import { Router } from "express";
import * as authCtrl from "../controller/user.controller.js";
import * as userWithdrawCtrl from "../controller/user.withdraw.controller.js";
import {
  protect,
  authorizeRoles,
  requireFullAccess,
} from "../utils/auth.middleware.js";
import passport from "../utils/passport.js";

const router = Router();

/* ───────── PUBLIC ROUTES ───────── */
router.post("/signup", authCtrl.signUp);
router.post("/login", authCtrl.login);
router.post("/forgot-password", authCtrl.forgotPassword);
router.post("/reset-password", authCtrl.resetPassword);
router.post("/verify-email-otp", authCtrl.verifyEmailOtp);
router.post("/resend-email-otp", authCtrl.resendEmailOtp);

/* ───────── BASIC AUTHENTICATED ROUTES ───────── */
router.patch(
  "/profile",
  protect,
  authorizeRoles("user"),
  authCtrl.updateProfile
);

router.get(
  "/get-profile",
  protect,
  authorizeRoles("user"),
  authCtrl.getProfile
);

router.patch(
  "/change-password",
  protect,
  authorizeRoles("user"),
  authCtrl.changePassword
);

/* ───────── PREMIUM / FULL ACCESS ROUTES ───────── */
// trial (7 days) OR premium user only
router.post(
  "/withdraw",
  protect,
  authorizeRoles("user"),
  requireFullAccess,
  userWithdrawCtrl.requestWithdrawal
);

router.get(
  "/withdraw",
  protect,
  authorizeRoles("user"),
  requireFullAccess,
  userWithdrawCtrl.getUserWithdrawals
);

/* ───────── OAUTH ROUTES ───────── */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: true,
  }),
  (req, res) => {
    res.redirect("http://localhost:5173");
  }
);

router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"] })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "/login",
    session: true,
  }),
  (req, res) => {
    res.redirect("http://localhost:3000/dashboard");
  }
);

router.get("/linkedin", passport.authenticate("linkedin"));

router.get(
  "/linkedin/callback",
  passport.authenticate("linkedin", {
    failureRedirect: "/login",
    session: true,
  }),
  (req, res) => {
    res.redirect("http://localhost:3000/dashboard");
  }
);

export default router;
