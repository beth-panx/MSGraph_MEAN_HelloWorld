var https = require('https');

module.exports = {
    getUserData: function(accessToken, callback) {
        var options = {
            host: 'graph.microsoft.com',
            path: '/v1.0/me',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: 'Bearer ' + accessToken
            }
        };

        https.get(options, function (response) {
            var body = '';
            response.on('data', function (d) {
                body += d;
            });
            response.on('end', function () {
                var error;
                if (response.statusCode === 200) {
                    callback(null, JSON.parse(body));
                } 
                else {
                    error = new Error();
                    error.code = response.statusCode;
                    error.message = response.statusMessage;
                    body = body.trim();
                    error.innerError = JSON.parse(body).error;
                    callback(error, null);
                }
            });
        })
        .on('error', function (e) {
            callback(e, null);
        });
    },

    postSendMail: function(accessToken, mailBody, callback) {
        var outHeaders = {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + accessToken,
            'Content-Length': mailBody.length
        };
        var options = {
            host: 'graph.microsoft.com',
            path: '/v1.0/me/microsoft.graph.sendMail',
            method: 'POST',
            headers: outHeaders
        };

        var post = https.request(options, function (response) {
            var body = '';
            response.on('data', function (d) {
                body += d;
            });
            response.on('end', function () {
                var error;
                if (response.statusCode === 202) {
                    callback(null);
                } 
                else {
                    error = new Error();
                    error.code = response.statusCode;
                    error.message = response.statusMessage;
                    body = body.trim();
                    error.innerError = JSON.parse(body).error;
                    callback(error);
                }
            });
        });

    post.write(mailBody);
    post.end();

    post.on('error', function (e) {
        callback(e);
    });
  }
}

