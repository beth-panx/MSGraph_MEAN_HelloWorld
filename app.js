// set up ======================================================================
var express  = require('express');
var app      = express();
var port  	 = process.env.PORT || 8080;
//var mongoose = require('mongoose');
//var database = require('./config/database');
var morgan = require('morgan'); 						// log requests to the console (express4)
var bodyParser = require('body-parser'); 				// pull information from HTML POST (express4)
var methodOverride = require('method-override'); 		// simulate DELETE and PUT (express4)

// configuration ===============================================================
//mongoose.connect(database.url); 	// connect to mongoDB database on modulus.io (v2.0)
app.use(express.static(__dirname + '/public')); 				// set the static files location /public/img will be /img for users
app.use(morgan('dev')); 										// log every request to the console
app.use(bodyParser.urlencoded({'extended':'true'})); 			// parse application/x-www-form-urlencoded
app.use(bodyParser.json()); 									// parse application/json
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
app.use(methodOverride());


// application ======================================
app.get('*', function (req, res) {
	res.sendFile(__dirname + '/public/index.html');
});


// listen (start app with node app.js) ======================================
app.listen(port);
console.log("Magic happens on port " + port);
