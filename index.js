var Botkit = require('botkit')

if (!process.env.CLIENT_ID || !process.env.CLIENT_SECRET || !process.env.PORT || !process.env.VERIFICATION_TOKEN || !process.env.OAUTH_TOKEN) {
  console.log('Error: Specify OAUTH_TOKEN, CLIENT_ID, CLIENT_SECRET, VERIFICATION_TOKEN and PORT in environment')
  process.exit(1)
}

var config = {}
if (process.env.MONGOLAB_URI) {
  var BotkitStorage = require('botkit-storage-mongo')
  config = {
    storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI})
  }
} else {
  config = {
    json_file_store: './db_slackbutton_slash_command/'
  }
}

var controller = Botkit.slackbot(config).configureSlackApp(
  {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    scopes: ['commands']
  }
)

controller.setupWebserver(process.env.PORT, function (err, webserver) {
  if (err) {
    console.log('error!')
    process.exit(1)
  }
  console.log('listening...')
  webserver.use((req, res, next) => {
    console.log('got http request', req.method, req.url, JSON.stringify(req.body, null, 2))
    console.log('headers', req.headers)
    next()
  })
  controller.createWebhookEndpoints(webserver)

  controller.createOauthEndpoints(controller.webserver, function (err, req, res) {
    if (err) {
      res.status(500).send('ERROR: ' + err)
    } else {
      res.send('Success!')
    }
  })
})

//
// BEGIN EDITING HERE!
//

// TODO: credit icon somewhere with: <div>Icons made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>

function isUserAtLunch (bot) {
  return new Promise((resolve, reject) => {
    const requestData = {
      token: process.env.OAUTH_TOKEN
    }
    const callback = (err, response) => {
      console.log('got profile response', response)
      if (err) {
        return reject(err)
      }
      const isAtLunch = (response.profile.status_emoji === ':lunch:')
      resolve(isAtLunch)
    }
    bot.api.users.profile.get(requestData, callback)
  })
}

function setStatus (bot, text, emoji) {
  const statusPayload = {
    token: process.env.OAUTH_TOKEN,
    profile: JSON.stringify({
      'status_text': text,
      'status_emoji': emoji
    }
  }
  const callback = (err, response) => {
    if (err) {
      console.log(`error setting status to "${emoji}":`, err)
      return
    }
    console.log('got set profile response', response)
  }
  bot.api.users.profile.set(statusPayload, callback)
}

function setLunchStatus (bot) {
  setStatus(bot, 'lunch time!', ':lunch:')
}

function clearStatus (bot) {
  setStatus(bot, '', '')
}

controller.on('slash_command', function (bot, message) {
  console.log('slash_command heard')

  switch (message.command) {
    case '/lunch':
      if (message.token !== process.env.VERIFICATION_TOKEN) return
      isUserAtLunch(bot)
            .then((isAtLunch) => {
              if (isAtLunch) {
                bot.replyPrivate(message, 'Welcome back from lunch!')
                clearStatus(bot)
                return
              }
              bot.replyPrivate(message, 'Enjoy lunch!')
              setLunchStatus(bot)
            })
      break
    default:
      bot.replyPrivate(message, "I'm afraid I don't know how to " + message.command + ' yet.')
  }
})
