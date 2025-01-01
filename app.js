const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();
const app = express();
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const connectDB = require('./config/dbconnection.js');
const User = require('./models/userModel');
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const nocache = require("nocache");

app.use(session({
  secret: "123456755",
  resave: false,
  saveUninitialized: true,
})
);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());

app.set('view engine', 'ejs');
connectDB();

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8000/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        if (user) {
          if (user.status === "Blocked") {
            return done(null, false, {
              message: `${profile.emails[0].value} is blocked`,
            });
            
          }

          user.googleId = profile.id;
        } else {
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
          });
        }

        await user.save();
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      return res.status(500).render("user/user-login", {
        error: "An error occurred during authentication.",
      });
    }

    if (!user && info && info.message) {
      // Display the block message

      return res.render("user/user-login", { error: info.message });
    }

    // Successful login
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).render("user/user-login", {
          error: "Failed to log in the user.",
        });
      }

      // Update the session with the user data
      req.session.user = user;
      res.redirect("/");
    });
  })(req, res, next);
});

app.use('/', userRoutes);
app.use('/admin', adminRoutes);
/* const PORT =process.env.PORT||3000; */
app.listen(8000, () => {
  console.log("...server starts running")
})