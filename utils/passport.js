import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import FacebookStrategy from 'passport-facebook';
import linkedin from 'passport-linkedin-oauth2';
import User from '../model/user.model.js';
import dotenv from 'dotenv';

dotenv.config();

// Debug environment variables
// console.log('Environment Variables:', {
//   GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
//   GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
//   FACEBOOK_CLIENT_ID: process.env.FACEBOOK_CLIENT_ID,
//   FACEBOOK_CLIENT_SECRET: process.env.FACEBOOK_CLIENT_SECRET,
//   LINKEDIN_CLIENT_ID: process.env.LINKEDIN_CLIENT_ID,
//   LINKEDIN_CLIENT_SECRET: process.env.LINKEDIN_CLIENT_SECRET
// });

const LinkedInStrategy = linkedin.Strategy;

// ─── Serialize/Deserialize ─────────────────────
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ─── Google Strategy ────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://backend-server-deploy.onrender.com/auth/google/callback' // Update for local testing
}, async (accessToken, refreshToken, profile, done) => {
  try {
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
  } catch (error) {
    console.error('Google Strategy Error:', error);
    return done(error, null);
  }
}));

// ─── Facebook Strategy ──────────────────────────
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: 'https://backend-server-deploy.onrender.com/auth/facebook/callback', // Update for local testing
  profileFields: ['id', 'emails', 'name', 'picture.type(large)']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Facebook Profile:', profile);
    const email = profile.emails ? profile.emails[0].value : `fb-${profile.id}@noemail.com`;
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
  } catch (error) {
    console.error('Facebook Strategy Error:', error);
    return done(error, null);
  }
}));

// ─── LinkedIn Strategy ──────────────────────────
passport.use(new LinkedInStrategy({
  clientID: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  callbackURL: 'https://backend-server-deploy.onrender.com/auth/linkedin/callback', // Update for local testing
  scope: ['r_emailaddress', 'r_liteprofile']
}, async (accessToken, refreshToken, profile, done) => {
  try {
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
  } catch (error) {
    console.error('LinkedIn Strategy Error:', error);
    return done(error, null);
  }
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