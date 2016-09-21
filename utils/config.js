module.exports = {
 	creds: {
    callbackURL: 'https://local.vroov.com:8443/token',
	clientID: '1b18af48-c6a5-46b2-98a2-e03ba4654a33',
    clientSecret: 'M59ant5z5ZzZ96LS8EGOdwS',
    identityMetadata: 'https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration',
    skipUserProfile: true,
    responseType: 'code',
	validateIssuer: false,
    responseMode: 'query',
	scope: ['User.Read', 'Mail.Send', 'Profile']
  }
};