import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import linkedin from 'passport-linkedin-oauth2';
import User from '../model/user.model.js';
import dotenv from 'dotenv';
dotenv.config();
const LinkedInStrategy = linkedin.Strategy;

// ─── Serialize/Deserialize ─────────────────────
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// ─── Google Strategy ────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  let user = await User.findOne({ email: profile.emails[0].value });
  if (!user) {
    user = await User.create({
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email: profile.emails[0].value,
      photo: profile.photos[0].value,
      referralCode: generateReferralCode(),
      isVerified: true,
    });
  }
  return done(null, user);
}));

// ─── Facebook Strategy ──────────────────────────
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: '/auth/facebook/callback',
  profileFields: ['id', 'emails', 'name', 'picture.type(large)']
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails ? profile.emails[0].value : `fb-${profile.id}@noemail.com`;
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName: profile.name.givenName,
      lastName: profile.name.familyName,
      email,
      photo: profile.photos?.[0]?.value,
      referralCode: generateReferralCode(),
      isVerified: true,
    });
  }
  return done(null, user);
}));

// ─── LinkedIn Strategy ──────────────────────────
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: '/auth/linkedin/callback',
  scope: ['r_emailaddress', 'r_liteprofile'],
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({
      firstName: profile.name.givenName || '',
      lastName: profile.name.familyName || '',
      email,
      photo: profile.photos?.[0]?.value,
      referralCode: generateReferralCode(),
      isVerified: true,
    });
  }
  return done(null, user);
}));

// ─── Referral Code Generator ────────────────────
function generateReferralCode(length = 5) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// ─── Export Passport ────────────────────────────
export default passport;
