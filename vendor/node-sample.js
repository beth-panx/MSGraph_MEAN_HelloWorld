// when using the npm module, use the following syntax
// var graph = require("msgraph-sdk-javascript");

// for fast development, simply require the generated lib without bundling the npm module
var graph = require("../../lib/index.js");

var secrets = require("./secrets");

var client = graph.init({
    defaultVersion: 'v1.0',
    debugLogging: true,
    authProvider: function(done) {
        done(null, secrets.accessToken);
    }
});

// Get the name of the authenticated user
client
    .api('/me')
    .select("displayName")
    .get((err, res) => {
        if (err) {
            console.log(err)
            return;
        }
        console.log(res.displayName);
    });

// Update the authenticated users birthday.
client
    .api('/me')
    .update(
        {"birthday": "1908-12-22T00:00:00Z"},
        (err, res) => {
            if (err) {
                console.log(err);
                return;
            }
            console.log("Updated my birthday");
        }
    );

// GET /users
client
    .api('/users')
    .version('beta')
    .get((err, res) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log("Found", res.value.length, "users");
    });

// Find my top 5 contacts on the beta endpoint
client
    .api('/me/people')
    .version('beta')
    .top(5)
    .select("displayName")
    .get((err, res) => {
        if (err) {
            console.log(err)
            return;
        }
        var topContacts = res.value.map((u) => {return u.displayName});    
        console.log("Your top contacts are", topContacts.join(", "));
    });

// Find my top 5 contacts on the beta endpoint
// .select() can be called multiple times
client
    .api('/me/people')
    .top(5)
    .version('beta')
    .select("displayName")
    .select("title") // or call with .select(["displayName", "title"])
    .get((err, res) => {
        if (err) {
            console.log(err)
            return;
        }
        console.log(res.value[0].title, res.value[0].displayName);
    });


// send an email
var mail = {
    subject: "MicrosoftGraph JavaScript SDK Samples",
    toRecipients: [{
        emailAddress: {
            address: "dansil@microsoft.com"
        }
    }],
    body: {
        content: "<h1>MicrosoftGraph TypeScript Connect Sample</h1><br>https://github.com/microsoftgraph/msgraph-sdk-javascript",
        contentType: "html"
    }
}

client
    .api('/users/me/sendMail')
    .post(
        {message: mail},
        (err, res) => {
            if (err)
                console.log(err);
            else
                console.log("Sent an email");
        })

// GET 3 of my events
client
    .api('/me/events') //full URLs can be passed
    .top(3)
    .get((err, res) => {
        if (err) {
            console.log(err)
            return;
        }
        var upcomingEventNames = []
        for (var i=0; i<res.value.length; i++) {
            upcomingEventNames.push(res.value[i].subject);
        }
        console.log("My calendar events include", upcomingEventNames.join(", "))
    })


// URL substitution example
var userIds = [secrets.userId1,
               secrets.userId2];

var fetchUser = client
    .api('/me/people/{userId}')
    .version('beta')
    .select('displayName')

for (var i=0; i<userIds.length; i++) {
    var userId = userIds[i];
    fetchUser
        .setParam({'userId': userId})
        .get((err, res) => {
            if (err) {
                console.log(err)
                return;
            }
            console.log(res.displayName)
        })
}

// Find my top 5 contacts
client
    .api('/me/people')
    .version('beta')
    .top(5)
    .select("displayName")
    .select("id")
    .get((err, res) => {
        console.log(res)
    });


// Find {{user}} top 5 contacts, example on URL substitution
client
    .api('/{userName}/people')
    .setParam({userName: 'me'})
    .version('beta')
    .top(5)
    .select("displayName")
    .get((err, res) => {
        if (err) {
            console.log(err)
            return;
        }
        var topContacts = res.value.map((u) => {return u.displayName});
        console.log("Your top contacts are", topContacts.join(", "));
    });



client
    .api("/users")
    .filter("startswith(displayName, 'david')")
    .get((err, res) => {
        if (err) {
            console.log(err);
            return;
        }
        console.log(res.length)
    })


// custom header example
client
    .api('/me')
    .select("displayName")
    .header('foo1', 'bar1')
    .headers({'foo2': 'bar2'}) //.headers() for object, .header() for 2 params
    .headers({'foo3': 'bar3', 'foo4': 'bar4'})
    .get((err, res) => {
        if (err) {
            console.log(err)
            return;
        }
    });

// delete a OneDrive item
client
    .api("/me/drive/items/{item-id}")
    .setParam({"item-id": secrets.ONE_DRIVE_FILE_ID_TO_DELETE})
    .delete(function(err, res) {
        if (err) {
            console.log(err)
            return;
        }
        console.log(res)
    })

// iterate through my messages
var iter = client
    .api('/me/messages')
    .getResultIterator();
    

function getNextMessage() {
    iter.next().value((err, res) => {
        if (err) {
            console.log(err)
            return;
        }

        console.log(res.subject);
        getNextMessage();
    })
}

getNextMessage();



// Download a file from OneDrive
var fs = require('fs'); // requires filesystem module
client
    .api('/me/drive/root/children/Book.xlsx/content')
    .getStream((err, downloadStream) => {
        if (err) {
            console.log(err);
            return;
        }
        var writeStream = fs.createWriteStream('../Book1.xlsx');
        downloadStream.pipe(writeStream).on('error', console.log);
    });

// Upload a file to OneDrive
var stream = fs.createReadStream('../logo.png');
client
    .api('/me/drive/root/children/logo234.png/content')
    .put(stream, function(err) {
        console.log(err);
    });

// Download my photo
var fs = require('fs'); // requires filesystem module
client
    .api('https://graph.microsoft.com/v1.0/me/photo/$value')
    .getStream((err, downloadStream) => {
        var writeStream = fs.createWriteStream('../myPhoto.jpg');
        downloadStream.pipe(writeStream).on('error', console.log);
    });

// Update my photo
var fs = require('fs'); // requires filesystem module
var stream = fs.createReadStream('../me.jpg');

client
    .api('/me/photo/$value')
    .put(stream, function(err) {
        console.log(err);
    });