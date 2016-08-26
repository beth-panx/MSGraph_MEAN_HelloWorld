// set up ======================================================================
var express  = require('express');
var session  = require('express-session');
var stack 	 = require('./routes/stack');
var app      = express();
var port  	 = process.env.PORT || 8443;
var fs		 = require('fs');
var https	 = require('https');
var uuid	 = require('uuid');
//var mongoose = require('mongoose');
//var database = require('./config/database');
var morgan 			= require('morgan'); 						// log requests to the console (express4)
var bodyParser 		= require('body-parser'); 					// pull information from HTML POST (express4)
var methodOverride 	= require('method-override'); 				// simulate DELETE and PUT (express4)
var cookieParser 	= require('cookie-parser');
var authHelper 		= require('./utils/authHelper.js');
var emailHelper 	= require('./utils/emailHelper.js');
var graph 			= require("./vendor/index.js");

var csrfTokenCookie = 'csrf-token';
var certConfig ={
	key: fs.readFileSync('./Utils/cert/server.key', 'utf8'),
	cert: fs.readFileSync('./Utils/cert/server.crt', 'utf8')
};
var server = https.createServer(certConfig, app);

// configuration ===============================================================
//mongoose.connect(database.url); 								// connect to mongoDB database on modulus.io (v2.0)
app.use(express.static(__dirname + '/public')); 				// set the static files location /public/img will be /img for users
app.use(morgan('dev')); 										// log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'})); 			// parse application/x-www-form-urlencoded
app.use(bodyParser.json()); 									// parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());
app.set('view engine', 'jade'); 

// application =================================================================
app.use(cookieParser());
app.use(session({
	secret: 'sshhhhhh',
	name: 'nodecookie',
	resave: false,
	saveUninitialized: false,
	cookie: {secure: true}
}));

app.get('/', stack.login);

var ACCESS_TOKEN_CACHE_KEY = 'ACCESS_TOKEN_CACHE_KEY';
var REFRESH_TOKEN_CACHE_KEY = 'REFRESH_TOKEN_CACHE_KEY';

app.get('/token', function(req, res){
	var csrfToken = req.query.state;
	if(req.cookies[csrfTokenCookie] !== req.query.state) {
		res.state(400).send('Invalid Authentication State.').end();
		return;
	}
	authHelper.getTokenFromCode(req.query.code, function(e, token) {
		if (e === null) {
			req.session.aadToken = token;
			res.redirect('/emailSender');
		}
		else {
			console.log(JSON.parse(e.data).error_description);
			res.status(500);
			res.send();
		}
	})
});

app.get('/login', function (req, res) {
	var csrfToken = uuid.v4();
	res.cookie(csrfTokenCookie, csrfToken);
	res.redirect(authHelper.getAuthUrl(csrfToken));
});

app.get('/emailSender', function (req, res) {
	if (!req.session.aadToken) {
		res.render('login');
	} else {
		sendEmail(req, res);
	}
});

app.post('/emailSender', function (req, res) {
	var client = graph.init({
		defaultVersion: 'v1.0',
		debugLogging: true,
		authProvider: function(done) {
			done(null, req.session.aadToken.token.access_token);
		}
	});
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
	var client = graph.init({
		defaultVersion: 'v1.0',
		debugLogging: true,
		authProvider: function(done) {
			done(null, req.session.aadToken.token.access_token);
		}
	});
	client.api('/me').select(["displayName","userPrincipalName"]).get((err, me) => {
		if (err) {
			console.log(err)
			return;
		}
		var templateData = {
			display_name: me.displayName,
			user_principal_name: me.userPrincipalName
		};
		res.render('emailSender', templateData);
	})
}

function hasAccessTokenExpired(e) {
	var expired;
	if (!e.innerError) {
		expired = false;
	} 
	else {
		expired = e.code === 401 &&
		e.innerError.code === 'InvalidAuthenticationToken' &&
		e.innerError.message === 'Access token has expired.';
	}
	return expired;
}

function clearCookies(res) {
	res.clearCookie(authHelper.ACCESS_TOKEN_CACHE_KEY);
	res.clearCookie(authHelper.REFRESH_TOKEN_CACHE_KEY);
}

function renderError(res, e) {
	res.render('error', {
		message: e.message,
		error: e
	});
	console.error(e);
}

// listen (start app with node app.js) ======================================
server.listen(port);
console.log("Magic happens on port " + port);
