import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';
import Parent from '../models/Parent.js';

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    // Try User first
    let user = await User.findById(id);
    if (user) {
      return done(null, user);
    }
    // Try Parent
    let parent = await Parent.findById(id);
    if (parent) {
      return done(null, parent);
    }
    done(null, false);
  } catch (error) {
    done(error, false);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const googleId = profile.id;

        if (!email) {
          return done(new Error('No email provided by Google'), null);
        }

        // Try to find existing user by email
        let user = await User.findOne({ email });
        if (user) {
          // Link Google account if not already linked
          if (!user.googleId) {
            user.googleId = googleId;
            user.authProvider = 'google';
            await user.save();
          }
          return done(null, user);
        }

        // Try to find existing parent by email
        let parent = await Parent.findOne({ email });
        if (parent) {
          // Link Google account if not already linked
          if (!parent.googleId) {
            parent.googleId = googleId;
            parent.authProvider = 'google';
            await parent.save();
          }
          return done(null, parent);
        }

        // No account found - return error (no auto-signup)
        return done(
          new Error('Account not found. Please contact your school administrator.'),
          null
        );
      } catch (error) {
        done(error, null);
      }
    }
  )
);

export default passport;
