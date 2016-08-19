// set up ======================================================================
var express  = require('express');
var session  = require('express-session');
var app      = express();
var port  	 = process.env.PORT || 8080;
//var mongoose = require('mongoose');
//var database = require('./config/database');
var morgan = require('morgan'); 						// log requests to the console (express4)
var bodyParser = require('body-parser'); 				// pull information from HTML POST (express4)
var methodOverride = require('method-override'); 		// simulate DELETE and PUT (express4)
var cookieParser = require('cookie-parser');
var authHelper = require('./Utils/authHelper.js');
var requestHelper = require('./Utils/requestHelper.js');
var emailHelper = require('./Utils/emailHelper.js');

// configuration ===============================================================
//mongoose.connect(database.url); 	// connect to mongoDB database on modulus.io (v2.0)
app.use(express.static(__dirname + '/public')); 				// set the static files location /public/img will be /img for users
app.use(morgan('dev')); 										// log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'})); 			// parse application/x-www-form-urlencoded
app.use(bodyParser.json()); 									// parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs'); 

// application ======================================
app.use(cookieParser());
app.use(session({
	secret: 'sshhhhhh',
	name: 'nodecookie',
	resave: false,
	saveUninitialized: false
}));

// app.use(function (req, res, next) {
// 	var err = new Error('Not Found');
// 	err.status = 404;
// 	next(err);
// });

// app.get('*', function (req, res) {
// 	res.sendFile(__dirname + '/public/index.html');
// });

var ACCESS_TOKEN_CACHE_KEY = 'ACCESS_TOKEN_CACHE_KEY';
var REFRESH_TOKEN_CACHE_KEY = 'REFRESH_TOKEN_CACHE_KEY';

app.get('/emailSender', function (req, res) {
  // check for token
	// if (req.cookies.REFRESH_TOKEN_CACHE_KEY === undefined) {
	// 	res.redirect('login');
	// } else {
		sendEmail(req, res);

	//}
});

app.get('/login', function (req, res) {
	if(req.query.code !== undefined) {
		authHelper.getTokenFromCode(req.query.code, function(e, accessToken, refreshToken) {
			if (e === null) {
				res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
				res.cookie(authHelper.REFRESH_TOKEN_CACHE_KEY, refreshToken);
				res.redirect('/emailSender');
			}
			else {
				console.log(JSON.parse(e.data).error_description);
				res.status(500);
				res.send();
			}
		})
	}
	else {
		res.render('login',{ authUrl: authHelper.getAuthUrl()});
	}
});

app.post('/emailSender', function (req, res) {
	var destinationEmailAddress = req.body.default_mail;
	var mailBody = emailHelper.generateMailBody(req.session.user.displayName, destinationEmailAddress);
	var templateData = {
		display_name: req.session.user.displayName,
    	user_principal_name: req.session.user.userPrincipalName,
    	actual_recipient: destinationEmailAddress
	};

	requestHelper.postSendEmail(req.cookies.ACCESS_TOKEN_CACHE_KEY, JSON.stringify(mailBody), function(firstRequestError) {
		if(!firstRequestError) {
			res.render('emailSender', templateData);
		}
		else if (hasAccessTokenExpired(firstRequestError)) {
			authHelper.getTokenFromRefreshToken(req.cookies.REFRESH_TOKEN_CACHE_KEY, function(refreshError, accessToken) {
				res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
				if (accessToken !== null) {
					requestHelper.postSendEmail(req.cookies.ACCESS_TOKEN_CACHE_KEY, JSON.stringify(mailBody), function(secondRequestError) {
						if (!secondRequestError) {
							res.render('emailSender', templateData);
						}
						else {
							clearCookies(res);
							renderError(res, secondRequestError);
						}
					});
				}
				else {
					renderError(res, refreshError);
				}
			});
		}
		else {
			renderError(res, firstRequestError);
		}
	});
});

function sendEmail(req, res) {
	requestHelper.getUserData(req.cookies.ACCESS_TOKEN_CACHE_KEY, function (firstRequestError, firstTryUser) {
		if(firstTryUser !== null) {
			req.session.user = firstTryUser;
			var templateData = {
				display_name: req.session.user.displayName,
		    	user_principal_name: req.session.user.userPrincipalName
			};
			req.render('emailSender', templateData);
		}
		else if (hasAccessTokenExpired(firstRequestError)) {
			authHelper.getTokenFromRefreshToken(req.cookies.REFRESH_TOKEN_CACHE_KEY, function (refreshError, accessToken) {
				res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
				if(accessToken !== null) {
					requestHelper.getUserData(req.cookies.ACCESS_TOKEN_CACHE_KEY, function (secondRequestError, secondTryUser){
						if(secondTryUser !== null) {
							req.session.user = secondTryUser;
							var templateData = {
								display_name: req.session.user.displayName,
						    	user_principal_name: req.session.user.userPrincipalName
							};
							req.render('emailSender', templateData);
						}
						else {
							clearCookies(res);
							renderError(res, secondRequestError);
						}
					})
				}
				else {
					renderError(res,refreshError);
				}
			})
		}
		else {
			renderError(res, firstRequestError);
		}
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
	// res.render('error', {
	// 	message: e.message,
	// 	error: e
	// });
	console.error(e);
}

// listen (start app with node app.js) ======================================
app.listen(port);
console.log("Magic happens on port " + port);
