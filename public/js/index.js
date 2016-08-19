var app = angular.module('app', ['ngRoute']);

app.config(['$routeProvider', function ($routeProvider) {
	$routeProvider
		.when('/', {
			templateUrl: '/views/login.html',
			controller: 'LoginController'
		})
		.when('/emailSender', {
			templateUrl: '/views/emailSender.html',
			controller: 'EmailSenderController'
		})
		.otherwise({
			redirectTo: '/'
		});

}]);

app.controller('LoginController', ['$scope', '$window', function($scope, $window) {
	$scope.redirectToLogin = function() {
		$window.location = getAuthUrl().replace(/&amp;/g, '&');
	};

	var credentials = {
		site: 'https://login.microsoftonline.com/common',
		authorizationPath: '/oauth2/v2.0/authorize',
		tokenPath: '/oauth2/v2.0/token',
		clientID: '1b18af48-c6a5-46b2-98a2-e03ba4654a33'
	};

	function getAuthUrl() {
		return credentials.site + credentials.authorizationPath +
	    '?client_id=' + credentials.clientID +
	    '&response_type=code' +
	    '&redirect_uri=' + 'http://localhost:8080/emailSender' +
	    '&scope=' + 'User.Read Mail.Send offline_access' +
	    '&response_mode=query' +
	    '&nonce=' + '0293fd79-b7f9-4d9f-a53d-66ebea792899' +
	    '&state=abcd';
	}
}]);

app.controller('EmailSenderController',['$scope', function($scope) {
 	$scope.message = 'This is the email page!';
}]);

