var app = angular.module('app', ['ngRoute']);

// app.config(['$routeProvider', function ($routeProvider) {
// 	$routeProvider
// 		.when('/', {
// 			templateUrl: '/views/login',
// 			controller: 'LoginController'
// 		})
// 		.when('/emailSender', {
// 			templateUrl: '/views/emailSender',
// 			controller: 'EmailSenderController'
// 		})
// 		.otherwise({
// 			redirectTo: '/'
// 		});

// }]);

app.controller('LoginController', ['$scope', '$window', function($scope, $window) {
	$scope.redirectToLogin = function() {
		$window.location = '/login';
	};
}]);

app.controller('EmailSenderController',['$scope', function($scope) {
 	$scope.message = 'This is the email page!';
}]);

