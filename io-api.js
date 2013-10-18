/**
 * Read the config
 */
var fs = require('fs');
var configFile = 'config.json';
try {
  var config = JSON.parse(fs.readFileSync(configFile));
} catch (err) {
  console.log("Error with JSON.parse: " + err);
}
if (!config) {
  console.log("Error loading: " + configFile);
}
if (typeof config === 'undefined' || typeof config.redis === 'undefined' || typeof config.ioAPI === 'undefined' || typeof config.httpAPI === 'undefined') {
  console.log("Error with: " + configFile);
}
if (typeof config.httpAPI.host === 'undefined') {
  console.log("Error with: " + configFile + '. Must specify httpAPI host.');
}

/**
 * This debug variable controls the level of logging.
 */
var debug = false;
if (typeof config.ioAPI.debug !== 'undefined') {
  debug = config.ioAPI.debug;
  process.env.debug = config.ioAPI.debug;
}


/**
 * Include request
 */
var request = require('request');

/**
 * The keys to allow to send to the client
 */
var WHITELISTED_KEYS = [
  'ID', 'Type', 'Page', 'ResourceID', 'SubPage', 'Section',
  'FromUserID', 'ToUserID', 'Description', 'TimeCreated',
  'TimeViewed', 'ExtraData'
];

/**
 * Create the servers
 */
var server = require('http').createServer(app); // create the express.js server
var redis = require("redis");
var sockjs = require('sockjs');

/**
 * Express web server configuration.
 */
var express = require('express');
var app = express();
app.configure(function() {
  app.set('port', config.ioAPI.port || 4000);
  app.set("views", __dirname + "/views");
  app.set('views', __dirname);
  app.set('view engine', 'jade');
  app.use(express.compress());
  app.use(express.bodyParser());
  app.use(app.router);

});

/**
 * Tell express to start listening.
 */
server.listen(app.get("port"), function() {
  console.log("Express server listening on port " + app.get("port"));
});

/**
 * Provide a resource to check if the server is online
 */
app.get("/server/status", function(req, res) {
  return res.type('txt').send('online');
});

/**
 * io api
 */

/**
 * Create a redis connection for looking up sessions.
 */
var redisSession = redis.createClient(config.redis.port, config.redis.host);
redisSession.on("error", function(err) {
  console.log("Error " + err);
  throw err;
});

redisSession.on("ready", function(err) {
  if (err) {
    console.log("Err: " + err);
    throw err;
  }
  console.log("Redis ready...");
});

// create a publish object for everyone to use
var publish = redis.createClient(config.redis.port, config.redis.host);

/**
 * Handle sockjs requests
 */

// var subscriptions = {}; // this object stores all the active connections

var sockjs_opts = {
  sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"
};

var sockjsServer = sockjs.createServer(sockjs_opts);

sockjsServer.on('connection', function(conn) {
  conn.isAuthed = false;
  conn.firstMessage = true;
  conn.on('data', function(message) {
    if (debug) console.log("Got data: " + message);

    // Auth the user on their first message
    if (conn.firstMessage && !conn.isAuthed) {
      if (debug) console.log("Doing Auth...");
      conn.firstMessage = false;

      // get the first thing sent and verify it
      // parse the message
      try {
        var fromUser = JSON.parse(message);
      } catch (err) {
        return conn.end();
      }

      if (debug) console.log("fromUser: " + util.inspect(fromUser));

      if (typeof fromUser.api_key === 'undefined' || typeof fromUser.sessionId === 'undefined') {
        if (debug) console.log("was undefined");
        return conn.end();
      }

      // lookup the session in redis
      redisSession.get(fromUser.sessionId, function(err, session) {
        if (err) {
          console.log("Err: " + err);
          return conn.end();
        }
        if (!session) {
          if (debug) console.log("Key is missing");
          // just end the connection here
          return conn.end();
        }
        if (debug) console.log("Got session: " + session);

        // check if the api_key we received from the user matches the one in the redis session store
        if (typeof session.api_key === 'undefined' || typeof session.sessionId === 'undefined') {
          // end the connection because we can't get the params
          return conn.end();
        }
        if (session.api_key !== fromUser.api_key) {
          // disconnect them because they didn't give us the correct api_key
          return conn.end();
        }

        // should only be here if they provided the correct api_key
        conn.session = session;
        var channelName = session.userId; // TODO: figure out what this variable will actually be

        var subscribe = redis.createClient(config.redis.port, config.redis.host);
        // var publish = redis.createClient(config.redis.port, config.redis.host);

        conn.on('close', function() {
          if (debug) console.dir("doing close");
          // delete subscriptions[channelName];
          subscribe.unsubscribe();
          subscribe.end();
        });

        subscribe.on("subscribe", function(channel, count) {
          if (debug) console.dir("Subscribed to channel: " + channel);
          // can now begin publishing to redis
          // subscriptions[channelName] = {
          //   subscribe: subscribe,
          // };
        });

        subscribe.on("message", function(channel, message) {
          if (debug) console.dir("got a message on subscribe client");
          // do something when we get a message from redis
          // this is like we are getting a message to our channel
          // parse the json
          var parsedMessage = '';
          try {
            parsedMessage = JSON.parse(message);
          } catch (err) {
            // let's log it because this shouldn't be happening
            console.log("ERROR: Got message with non parsable JSON. CHANNEL: " + channel + ' ' + redis.print(message));
            // do nothing
            return;
          }
          if (parsedMessage) {
            // handle the message here
            // it could be coming from the API Server or from another io client
            // currently it only comes from the API Server to send messages to the client
            // but I don't know what the behavior would be if we sent a message
            // I think it could loop back to us here
            if (parsedMessage.to === 'client') {
              if (debug) console.dir("doing write to client");
              conn.write(JSON.stringify(_.pick(parsedMessage.body, WHITELISTED_KEYS)));
            }
          }

          subscribe.subscribe(channelName);

          // tell the client we are now ready
          return conn.write({
            type: 'SUCCESS',
            code: 'AUTH_SUCCESSFUL'
          });
        });
      });
    } else if (!conn.firstMessage && conn.isAuthed) {
      // do the parse of data here, ie. when a user clicks the message
      // need to check the database for any messages we haven't read yet
      // make this a request to the api
      // conn.app should hold the messages
      console.log("got data after auth!: " + message);

      // parse the message
      try {
        var fromUser = JSON.parse(message);
      } catch (err) {
        // let's log it because this shouldn't be happening
        console.log("ERROR: Got message with non parsable JSON. CHANNEL: " + channel + ' ' + redis.print(message));
        return conn.write({
          type: 'ERROR',
          code: 'INVALID_JSON',
          message: 'Invalid JSON.',
          request: message
        });
      }
      if (fromUser) {
        // the only thing we currently get is the id of a Notification to mark as seen
        if (typeof fromUser.type === 'undefined') {
          // return an error message
          return conn.write({
            type: 'ERROR',
            code: 'MISSING_TYPE',
            message: 'No message type was provided.',
            request: message
          });
        }
        switch (fromUser.type) {
          case 'SEEN_NOTIFICATION':
            // send an update request to the server to mark the message as seen
            markNotificationAsSeen(fromUser.id, conn.session.userId, function(err, res) {
              if (err) return conn.send({
                type: 'ERROR',
                code: 'SET_NOTIFICATION_SEEN_UNSUCCESSFUL',
                message: 'API error',
                request: message
              });
              if (typeof res.affectedRows === 'undefined') {
                return conn.send({
                  type: 'ERROR',
                  code: 'SET_NOTIFICATION_SEEN_UNSUCCESSFUL',
                  message: 'affectedRows was undefined in response',
                  request: message
                });
              }
              if (res.affectedRows == 0) {
                return conn.send({
                  type: 'ERROR',
                  code: 'SET_NOTIFICATION_SEEN_UNSUCCESSFUL',
                  message: 'set was unsuccessful on notification with provided ID',
                  request: message
                });
              }
              if (res.affectedRows < 1) {
                return conn.send({
                  type: 'SUCCESS',
                  code: 'SET_NOTIFICATION_SEEN_SUCCESSFUL',
                  message: 'Notificat was successfully set as seen.',
                  request: message
                });
              }
            });
            break;
          default:
            return conn.write({
              type: 'ERROR',
              code: 'INVALID_TYPE',
              message: 'Message type could not be identified.',
              request: message
            });
        }
      }
    }
  });
});

function markNotificationAsSeen(notificationId, userId, cb) {
  // create a request to the rest API to mark the notification as seen
  request.post('http://' + config.httpAPI.host + ':' + config.httpAPI.port + '/' + notificationId, {
    form: {
      ToUserID: userId,
      TimeViewed: Date.now
    }
  }, function(error, response, body) {
    if (error) return cb(error);
    return cb(null, body);
  });
}