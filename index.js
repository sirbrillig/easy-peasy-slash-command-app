/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 ______    ______    ______   __  __    __    ______
 /\  == \  /\  __ \  /\__  _\ /\ \/ /   /\ \  /\__  _\
 \ \  __<  \ \ \/\ \ \/_/\ \/ \ \  _"-. \ \ \ \/_/\ \/
 \ \_____\ \ \_____\   \ \_\  \ \_\ \_\ \ \_\   \ \_\
 \/_____/  \/_____/    \/_/   \/_/\/_/  \/_/    \/_/


 This is a sample Slack Button application that provides a custom
 Slash command.

 This bot demonstrates many of the core features of Botkit:

 *
 * Authenticate users with Slack using OAuth
 * Receive messages using the slash_command event
 * Reply to Slash command both publicly and privately

 # RUN THE BOT:

 Create a Slack app. Make sure to configure at least one Slash command!

 -> https://api.slack.com/applications/new

 Run your bot from the command line:

 clientId=<my client id> clientSecret=<my client secret> PORT=3000 node bot.js

 Note: you can test your oauth authentication locally, but to use Slash commands
 in Slack, the app must be hosted at a publicly reachable IP or host.


 # EXTEND THE BOT:

 Botkit is has many features for building cool and useful bots!

 Read all about it here:

 -> http://howdy.ai/botkit

 ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

/* Uses the slack button feature to offer a real time bot to multiple teams */
var Botkit = require('botkit');

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN || !process.env.OAUTH_TOKEN) {
    console.log('Error: Specify OAUTH_TOKEN, CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment');
    process.exit(1);
}

var config = {}
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: './db_slackbutton_slash_command/',
    };
}

var controller = Botkit.slackbot(config).configureSlackApp(
    {
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        scopes: ['commands'],
    }
);

controller.setupWebserver(process.env.PORT, function (err, webserver) {
    if (err) {
        console.log('error!');
        process.exit(1);
    }
    console.log( 'listening...' );
    webserver.use( ( req, res, next ) => {
        console.log( 'got http request', req.method, req.url, JSON.stringify( req.body, null, 2 ) );
        console.log( 'headers', req.headers );
        next();
    } );
    controller.createWebhookEndpoints(webserver);

    controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
        if (err) {
            res.status(500).send('ERROR: ' + err);
        } else {
            res.send('Success!');
        }
    });
});


//
// BEGIN EDITING HERE!
//

// TODO: credit icon somewhere with: <div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>

function isUserAtLunch(bot) {
    return new Promise((resolve, reject) => {
        const requestData = {
            token: process.env.OAUTH_TOKEN,
        };
        const callback = (err, response) =>  {
            console.log( 'got profile response', response );
            const isAtLunch = (response.profile.status_emoji === ':lunch:');
            resolve( isAtLunch );
        };
        bot.api.users.profile.get(requestData, callback);
    });
}

function setLunchStatus(bot) {
    const statusPayload = {
        token: process.env.OAUTH_TOKEN,
        'status_text': 'lunch time!',
        'status_emoji': ':lunch:',
    };
    bot.api.users.profile.set(statusPayload, callback);
    const callback = (err, response) =>  {
        console.log( 'got set profile response', response );
    };
}

function clearStatus() {
    const statusPayload = {
        token: process.env.OAUTH_TOKEN,
        'status_text': '',
        'status_emoji': '',
    };
    bot.api.users.profile.set(statusPayload, callback);
    const callback = (err, response) =>  {
        console.log( 'got clear profile response', response );
    };
}

controller.on('slash_command', function (bot, message) {
    console.log( 'slash_command heard');

    switch (message.command) {
        case "/lunch":
            if (message.token !== process.env.VERIFICATION_TOKEN) return;
            isUserAtLunch(bot)
            .then( ( isAtLunch ) => {
                if (isAtLunch) {
                    bot.replyPrivate(message, "Welcome back from lunch!");
                    clearStatus(bot);
                    return;
                }
                bot.replyPrivate(message, "Enjoy lunch!");
                setLunchStatus(bot);
            } )
            break;
        default:
            bot.replyPrivate(message, "I'm afraid I don't know how to " + message.command + " yet.");

    }

})
;

