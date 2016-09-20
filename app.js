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

const config = {
    callbackURL: 'https://local.vroov.com:8443/token',
	clientID: '1b18af48-c6a5-46b2-98a2-e03ba4654a33',
    clientSecret: 'M59ant5z5ZzZ96LS8EGOdwS',
    identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    skipUserProfile: true,
    responseType: 'code',
	validateIssuer: false,
    responseMode: 'query',
	scope: ['User.Read', 'Mail.Send', 'Profile']
  };

function callback (iss, sub, profile, accessToken, refreshToken, done) {
	done (null, {
		profile,
		accessToken,
		refreshToken
	})
};

passport.use(new OIDCStrategy(config, callback));

const users = {};
passport.serializeUser((user, done) => {
    const id = uuid.v4();
    users[id] = user;
    done(null, id);
});
passport.deserializeUser((id, done) => {
    const user = users[id];
    done(null, user)
});

// configuration ===============================================================					
app.use(express.static(__dirname + '/public'));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({'extended':'true'}));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(methodOverride());
app.set('view engine', 'jade');
app.use(cookieParser());
app.use(session({
	secret: 'sshhhhhh',
	name: 'nodecookie',
	resave: false,
	saveUninitialized: false,
	cookie: {secure: true}
}));
app.use(passport.initialize());
app.use(passport.session());

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
		res.render('emailSender', { user: req.user.profile});
});

// app.get('/emailSender', 
// 	passport.authenticate('azuread-openidconnect', { failureRedirect: '/' }), 
// 	function (req, res) {
// 		res.render('emailSender', { user: req.user.profile});
// });

app.post('/emailSender',
	ensureAuthenticated,
	function initGraph(req, res) {
		var client = graph.init({
			defaultVersion: 'v1.0',
			debugLogging: true,
			authProvider: function(done) {
				done(null, req.user.accessToken);
			}
	});
	client.api('/me').select(["displayName", "userPrincipalName"]).get((err, me) => {
        if (err) {
            console.log(err);
            return;
        }
		var mailBody = emailHelper.generateMailBody(me.displayName, me.userPrincipalName);
		client.api('/users/me/sendMail').post(mailBody,(err, mail) => {
			if (err){
				console.log(err);
				return;
			}
			else
				console.log("Sent an email");
				res.render('emailSender', { user: req.user.profile});
		})
    });
});


// listen (start app with node app.js) ======================================
server.listen(port);
console.log("Magic happens here: https://local.vroov.com:" + port);

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
	console.log("aaahhhhhh!!!!");
    res.redirect('/login');
}

function renderError(res, e) {
	res.render('error', {
		message: e.message,
		error: e
	});
	console.error(e);
}
