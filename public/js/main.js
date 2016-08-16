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

app.controller('LoginController', ['$scope', function($scope) {
  $scope.message = 'This is the login page!';
}]);

app.controller('EmailSenderController', function($scope) {
  $scope.message = 'This is the email page!';
});
