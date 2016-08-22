var simpleOAuth = require('simple-oauth2');
var uuid = require('node-uuid');

var credentials = {
	site: 'https://login.microsoftonline.com/common',
	authorizationPath: '/oauth2/v2.0/authorize',
	tokenPath: '/oauth2/v2.0/token',
	clientID: '1b18af48-c6a5-46b2-98a2-e03ba4654a33',
	clientSecret: 'M59ant5z5ZzZ96LS8EGOdwS'
};

var OAuth2 = simpleOAuth(credentials);

var ACCESS_TOKEN_CACHE_KEY = 'ACCESS_TOKEN_CACHE_KEY';
var REFRESH_TOKEN_CACHE_KEY = 'REFRESH_TOKEN_CACHE_KEY';

module.exports = {
	getTokenFromCode: function(code, callback) {
		var tokenConfig = {
			code: code,
			redirect_uri: 'https://local.vroov.com:8443/token'
		};
		OAuth2.authCode.getToken(tokenConfig, function saveToken(error, result) {
			if(error) {
				console.log('Acces Token Error', error.message);
			}
			var token = OAuth2.accessToken.create(result);
			callback(error, token);
		});
	},

	// getAuthUrl: function() {
	// 	return credentials.site + credentials.authorizationPath +
	//     '?client_id=' + credentials.clientID +
	//     '&response_type=code' +
	//     '&redirect_uri=' + tokenConfig.redirect_uri +
	//     '&scope=' + 'User.Read Mail.Send offline_access' +
	//     '&response_mode=query' +
	//     '&nonce=' + uuid.v4() +
	//     '&state=abcd';
	// },

	getAuthUrl: function(csrfToken) {
		return OAuth2.authCode.authorizeURL({
			redirect_uri: 'https://local.vroov.com:8443/token',
			scope: 'User.Read Mail.Send offline_access',
			state: csrfToken
		})
	},

	ACCESS_TOKEN_CACHE_KEY,
	REFRESH_TOKEN_CACHE_KEY
}