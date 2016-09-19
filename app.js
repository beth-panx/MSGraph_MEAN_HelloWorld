// set up ======================================================================
const express = require('express');
const session = require('express-session');
const stack = require('./routes/stack');

const port = process.env.PORT || 8443;
const fs = require('fs');
const https = require('https');
const uuid = require('uuid');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const OIDCStrategy = require('passport-azure-ad').OIDCStrategy;
const emailHelper = require('./utils/emailHelper.js');
const graph = require("./vendor/index.js");

const csrfTokenCookie = 'csrf-token';
const certConfig = {
	key: fs.readFileSync('./Utils/cert/server.key', 'utf8'),
	cert: fs.readFileSync('./Utils/cert/server.crt', 'utf8')
};

const app = express();
const server = https.createServer(certConfig, app);

// authentication =================================================================
passport.serializeUser(function(user, done) {
	done(null, user.email);
});

passport.deserializeUser(function(id, done) {
	findByEmail(id, function (err, user) {
		done(err, user);
	});
});

// array to hold logged in users
var users = [];
var myAccessToken;

var findByEmail = function(email, fn) {
	for (var i = 0, len = users.length; i < len; i++) {
		var user = users[i];
		if (user.email === email) {
			console.log("found user");
			return fn(null, user);
		}
	}
	console.log("no user found.");
	return fn(null, null);
};

// Use the OIDCStrategy within Passport. (Section 2) 
// 
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier), and invoke a callback
//   with a user object.
passport.use(new OIDCStrategy({
    callbackURL: 'https://local.vroov.com:8443/token',
    clientID: '1b18af48-c6a5-46b2-98a2-e03ba4654a33',
    clientSecret: 'M59ant5z5ZzZ96LS8EGOdwS',
    identityMetadata: 'https://login.microsoftonline.com/common/.well-known/openid-configuration',
    skipUserProfile: true,
    responseType: 'id_token code',
	validateIssuer: false,
    responseMode: 'query'
  },
  function(iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.email) {
      return done(new Error("No email found"), null);
    }

	myAccessToken = accessToken;

	findByEmail(profile.email, function(err, user) {
		if (err) {
			return done(err);
		}
		if (!user) {
			// "Auto-registration"
			users.push(profile);
			console.log("added new user..");
			return done(null, profile);
		}
		return done(null, user);
	});

  }
));

// configuration ===============================================================					
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(methodOverride());
app.set('view engine', 'jade');
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser());
app.use(session({
	secret: 'sshhhhhh',
	name: 'nodecookie',
	resave: false,
	saveUninitialized: false,
	cookie: {secure: true}
}));

// application =================================================================
app.get('/', stack.login);

app.get('/login',
	passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }),
	function (req, res) {
		res.redirect('/');
});

app.get('/token', 
	passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), 
	function(req, res){ 
		console.log("In token...");

		sendEmail(req, res);
		res.render('emailSender', { user: req.user});
});

app.get('/emailSender', 
	passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), 
	function (req, res) {
		res.render('emailSender', { user: req.user});
});

app.post('/emailSender',
	passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), 
	function (req, res) {
		console.log(myAccessToken);
		console.log("trying to send email..");
		var client = graph.init({
			defaultVersion: 'v1.0',
			debugLogging: true,
			authProvider: function(done) {
				done(null, myAccessToken);
			}
	});
	console.log("sending email..");
	client.api('/me').select(["displayName", "userPrincipalName"]).get((err, me) => {
        if (err) {
            console.log(err);
            return;
        }
		var templateData = {
			display_name: me.displayName,
			user_principal_name: me.userPrincipalName
		};
		var mailBody = emailHelper.generateMailBody(templateData.display_name, templateData.user_principal_name);
		client.api('/users/me/sendMail').post(mailBody,(err, mail) => {
			if (err){
				console.log(err);
				return;
			}
			else
				console.log("Sent an email");
				res.render('emailSender', templateData);
		})
    });
});

function sendEmail(req, res) {
	console.log(myAccessToken);
	var client = graph.init({
		defaultVersion: 'v1.0',
		debugLogging: true,
		authProvider: function(done) {
			done(null, myAccessToken);
		}
	});
	console.log("in sendemail..");
	client.api('/me').get((err, res) => {
		cosole.log(res);
	})
	client.api('/me').select(["displayName"]).get((err, me) => {
		if (err) {
			console.log(err);
			return;
		}
		var templateData = {
			display_name: me.displayName,
			//user_principal_name: me.email
		};
		res.render('emailSender', templateData);
	})
}

function renderError(res, e) {
	res.render('error', {
		message: e.message,
		error: e
	});
	console.error(e);
}

function ensureAuthenticated(req, res, next) { 
	console.log("ensuring...");
	if (req.isAuthenticated()) { 
		console.log("successfully authenticated!");
		return next();  
	}
	res.redirect('/login');
	console.log("Some shit happened");

}

// listen (start app with node app.js) ======================================
server.listen(port);
console.log("Magic happens here: https://local.vroov.com:" + port);
