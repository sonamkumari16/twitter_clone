const express = require('express');
const app = express();
const session = require('express-session');
const bodyParser = require("body-parser");
require('dotenv').config();
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
const passport = require('passport');
const db = require('./config/dbconfig');
app.set("view engine", "ejs");
const GoogleStrategy = require('passport-google-oauth20').Strategy;

function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}

app.use(session({ secret: 'cats', resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html')
})

passport.use(new GoogleStrategy({
  clientID: 'Iv1.451671289030f210',
  clientSecret: '97d5b6537a2be9ef49011330ec0a4c78d4578819',
  callbackURL: `https://twitter-clone-nagarro-task.herokuapp.com/user/oauth2/github/callback`,
  passReqToCallback: true
},
  function (request, accessToken, refreshToken, profile, done) {
    // console.log(profile);
    db.searchByValue({
      table: "register",
      searchAttribute: "email",
      searchValue: profile.emails[0].value,
      attributes: ["*"]
    }).then(result => {
      const userData = result.data;
      if (userData.length > 0) {
        return done(null, { id: userData[0].id })
      }
      else {
        db.insert({
          table: "register",
          records: [{
            googleid: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            photos: profile.photos[0].value,
            username: profile.name.familyName + Math.floor(Math.random() * 10000)
          }]
        })
          .then(result => {
            return done(null, { id: result.data.inserted_hashes[0] })
          })
          .catch(err => {
            console.log(err);
          })
      }
    })
      .catch(err => {
        console.log(err);
      })
  }
));
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/google' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/home');
  });
app.get('/home', (req, res) => {
  if(req.isAuthenticated()){
  db.searchByHash({
    table: 'register',
    hashValues: [req.user.id],
    attributes: ['*'],
  })
    .then(result => {
      //console.log(result.data);
      const user = result.data[0];
      db.query(`Select t.userId as userId,t.id as id,t.__createdtime__ as tweetTime,r.name as name,r.photos as photo,t.tweet as tweet,t.likesCount as likes,r.username as userName,l.isLiked as liked from twitter.register as r Inner join twitter.tweets as t ON r.id=t.userId Left outer join twitter.likes as l ON l.tweetId=t.id and l.userId= "${req.user.id}" ORDER BY t.__createdtime__ DESC`)
        .then(results => {
          console.log(results);
          const tweets = results.data;
          tweets.forEach((tweet) => {
            // console.log(tweet.tweetTime);
            tweet.tweetTime =
              (new Date().getTime().toString() - tweet.tweetTime) / 1000 / 60 / 60;
            if (tweet.tweetTime >= 24) {
              tweet.tweetTime = Math.floor(tweet.tweetTime / 24) + "d ago";
            } else if (tweet.tweetTime < 1) {
              tweet.tweetTime = "less than 1h ago";
            } else {
              tweet.tweetTime = Math.floor(tweet.tweetTime) + "h ago";
            }
          });
          db.query('Select t.userId as userId,t.id as id,t.__createdtime__ as tweetTime,r.name as name,r.photos as photo,t.tweet as tweet,t.likesCount as likes,r.username as userName from twitter.register as r Inner join twitter.tweets as t ON r.id=t.userId ORDER BY t.likesCount DESC LIMIT 5')
            .then(result => {
              // console.log(result);
              const trends = result.data;
              trends.forEach((trend) => {
                trend.tweetTime = (new Date().getTime().toString() - trend.tweetTime) / 1000 / 60 / 60;
                if (trend.tweetTime >= 24) {
                  trend.tweetTime = Math.floor(trend.tweetTime / 24) + "d ago";
                } else if (trend.tweetTime < 1) {
                  trend.tweetTime = "less than 1h ago";
                } else {
                  trend.tweetTime = Math.floor(trend.tweetTime) + "h ago";
                }
              })
              //console.log(tweets);
              // console.log(tweets);
              res.render("home", { user, tweets, trends });
            })
            .catch(err => {
              console.log(err);
            })
        })
        .catch(err => {
          console.log(err);
        })
    })
    .catch(err => {
      console.log(err);
    })
  }
  else{
    res.redirect('/');
  }
})
app.listen(process.env.PORT);
app.post('/api/posts', function (request, response) {
  console.log("data received from client", request.body);
  if (request.body != "") {
    db.insert({
      table: "tweets",
      records: [{
        tweet: request.body.tweet,
        likesCount: 0,
        userId: request.user.id
      }]
    })
      .then(result => {
        response.redirect("/home");
      })
      .catch(err => {
        console.log(err);
      })
  }
})
app.post('/like/:id', (req, res) => {
  console.log(req.user.id);
  console.log(req.params.id);
  db.query(`SELECT * FROM twitter.likes where userId="${req.user.id}" and tweetId="${req.params.id}"`)
    .then(result => {
      const tweetData = result.data;
      if (tweetData.length > 0) {
        if (tweetData.isLiked == false) {
          db.query(`UPDATE twitter.likes set isLiked=true where userId="${req.user.id}" and tweetId="${req.params.id}"`)
            .then(result => {
              db.query(`SELECT t.likesCount FROM twitter.tweets as t where t.id="${req.params.id}"`)
                .then(data => {
                  console.log(data);
                  var likeCount = data.data[0].likesCount + 1;
                  db.query(`UPDATE twitter.tweets SET likesCount=${likeCount} where id="${req.params.id}"`)
                    .then(results => {
                      res.redirect("/home");
                    })
                    .catch(err => {
                      console.log(err);
                    })
                })
                .catch(err => {
                  console.log(err);
                })
            })
            .catch(err => {
              console.log(err);
            })
        }
        else {
          db.query(`UPDATE twitter.likes set isLiked=false where userId="${req.user.id}" and tweetId="${req.params.id}"`)
            .then(result => {
              db.query(`SELECT t.likesCount FROM twitter.tweets as t where t.id="${req.params.id}"`)
                .then(data => {
                  console.log(data);
                  var likeCount = data.data[0].likesCount - 1;
                  if(likeCount<0){
                    likeCount=0;
                  }
                  db.query(`UPDATE twitter.tweets SET likesCount=${likeCount} where id="${req.params.id}"`)
                    .then(results => {
                      res.redirect("/home");
                    })
                    .catch(err => {
                      console.log(err);
                    })
                })
                .catch(err => {
                  console.log(err);
                })
            })
            .catch(err => {
              console.log(err);
            })
        }
      }
      else {
        db.insert({
          table: "likes",
          records: [{
            isLiked: true,
            tweetId: req.params.id,
            userId: req.user.id
          }]
        })
          .then(data => {
            db.query(`SELECT t.likesCount FROM twitter.tweets as t where t.id="${req.params.id}"`)
              .then(data => {
                console.log(data);
                var likeCount = data.data[0].likesCount + 1;
                db.query(`UPDATE twitter.tweets SET likesCount=${likeCount} where id="${req.params.id}"`)
                  .then(results => {
                    res.redirect("/home");
                  })
                  .catch(err => {
                    console.log(err);
                  })
              })
              .catch(err => {
                console.log(err);
              })
          })
          .catch(err => {
            console.log(err);
          })
      }
    })
    .catch(err => {
      console.log(err);
    })
})
app.post('/delete/:id', (req, res) => {
  db.query(`DELETE FROM twitter.tweets WHERE id = "${req.params.id}"`)
    .then(result => {
      db.query(`DELETE FROM twitter.likes WHERE tweetId = "${req.params.id}"`)
        .then(data => {
          res.redirect('/home');
        })
        .catch(err => {
          console.log(err);
        })
    })
    .catch(err => {
      console.log(err);
    })
})
app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.log(err);
    }
    else {
      res.redirect('/');
    }
  });
});