var util = require('util');
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
  return console.log("Error loading: " + configFile);
}
if (typeof config === 'undefined' || typeof config.redis === 'undefined' || typeof config.ioAPI === 'undefined' || typeof config.httpAPI === 'undefined') {
  return console.log("Error with: " + configFile);
}
if (typeof config.httpAPI.host === 'undefined') {
  return console.log("Error with: " + configFile + '. Must specify httpAPI host.');
}
if (typeof config.sessionPrefix === 'undefined') {
  config.sessionPrefix = "SESSION";
}

/**
 * Logging
 */
var winston = require('winston');
winston.add(winston.transports.File, {
  filename: config.logfile || "/var/log/io-api.log"
});
winston.remove(winston.transports.Console);

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
  app.use(express.static(__dirname + '/public'));
});

/**
 * Create the servers
 */
var server = require('http').createServer(app); // create the express.js server
var redis = require("redis");
var sockjs = require('sockjs');

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

sockjsServer.installHandlers(server, {
  prefix: '/io'
});

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

      if (typeof fromUser.api_key === 'undefined' || typeof fromUser.session_id === 'undefined') {
        if (debug) console.log("was undefined");
        return conn.end();
      }

      // lookup the session in redis
      redisSession.get(config.sessionPrefix + ':' + fromUser.session_id, function(err, s) {
        if (err) {
          console.log("Err: " + err);
          return conn.end();
        }
        if (!s) {
          if (debug) console.log("Key is missing");
          // just end the connection here
          return conn.end();
        }
        if (debug) console.log("Got session: " + s);

        try {
          var session = JSON.parse(s);
        } catch (err) {
          if (debug) console.log("Failed to parse session from Redis1");
          return conn.end();
        }
        if (!session) {
          if (debug) console.log("Failed to parse session from Redis2");
          // just end the connection here
          return conn.end();
        }

        // make sure the session we got from redis has the values we want
        if (typeof session.api_key === 'undefined' || typeof session.session_id === 'undefined') {
          // end the connection because we can't get the params
          if (debug) console.log("Session property was undefined");
          return conn.end();
        }
        // check if the api_key we received from the user matches the one in the redis session store
        if (session.api_key !== fromUser.api_key) {
          // disconnect them because they didn't give us the correct api_key
          if (debug) console.log("session.api_key does not match fromUser.api_key: " + session.api_key + ':' + fromUser.api_key);
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
          // until this event fires, we are not actually ready
          conn.isAuthed = true;
          return conn.write(JSON.stringify({
            type: 'SUCCESS',
            code: 'READY'
          }));
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
          if (!parsedMessage) {
            console.log("ERROR: Got an empty message. CHANNEL: " + channel + ' ' + redis.print(message));
            // do nothing
            return;
          }
          // handle the message here
          // it could be coming from the API Server or from another io client
          // currently it only comes from the API Server to send messages to the client
          // but I don't know what the behavior would be if we sent a message
          // I think it could loop back to us here
          
          // I know this doesn't have to be parsed but in the future, 
          // ie. if you wanted to filter what got sent to the server
          // you can do that now because it's parsed.
          conn.write(JSON.stringify(parsedMessage));

        });
        if (debug) console.log("doing subscribe");
        subscribe.subscribe(channelName);
        if (debug) console.log("subscribed");

        // tell the client we are now ready
        return conn.write(JSON.stringify({
          type: 'SUCCESS',
          code: 'AUTH_SUCCESSFUL'
        }));
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
        return conn.write(JSON.stringify({
          type: 'ERROR',
          code: 'INVALID_JSON',
          message: 'Invalid JSON.',
          request: message
        }));
      }
      if (fromUser) {
        // the only thing we currently get is the id of a Notification to mark as seen
        if (typeof fromUser.type === 'undefined') {
          // return an error message
          return conn.write(JSON.stringify({
            type: 'ERROR',
            code: 'MISSING_TYPE',
            message: 'No message type was provided.',
            request: message
          }));
        }
        switch (fromUser.type) {
          case 'SEEN_NOTIFICATION':
            // send an update request to the server to mark the message as seen
            var notificationId = fromUser.id;
            markNotificationAsSeen(notificationId, conn.session.userId, function(err, res) {
              console.log("res: " + util.inspect(res));
              if (err) return conn.write(JSON.stringify({
                type: 'ERROR',
                code: 'SET_NOTIFICATION_SEEN_UNSUCCESSFUL',
                message: 'API error',
                request: message,
                id: notificationId
              }));
              if (typeof res.affectedRows === 'undefined') {
                return conn.write(JSON.stringify({
                  type: 'ERROR',
                  code: 'SET_NOTIFICATION_SEEN_UNSUCCESSFUL',
                  message: 'affectedRows was undefined in response',
                  request: message,
                  id: notificationId
                }));
              }
              if (res.affectedRows == 0) {
                return conn.write(JSON.stringify({
                  type: 'ERROR',
                  code: 'SET_NOTIFICATION_SEEN_UNSUCCESSFUL',
                  message: 'set was unsuccessful on notification with provided ID',
                  request: message,
                  id: notificationId
                }));
              }
              if (res.affectedRows > 0) {
                return conn.write(JSON.stringify({
                  type: 'SUCCESS',
                  code: 'SET_NOTIFICATION_SEEN_SUCCESSFUL',
                  message: 'Notificat was successfully set as seen.',
                  request: message,
                  id: notificationId
                }));
              }
            });
            break;
          default:
            return conn.write(JSON.stringify({
              type: 'ERROR',
              code: 'INVALID_TYPE',
              message: 'Message type could not be identified.',
              request: message
            }));
        }
      }
    }
  });
});

function markNotificationAsSeen(notificationId, userId, cb) {
  // create a request to the rest API to mark the notification as seen
  request.put('http://' + config.httpAPI.host + ':' + config.httpAPI.port + '/notifications/' + notificationId + '/seen', {
    form: {
      ToUserID: userId
    },
    json: true
  }, function(error, response, body) {
    if (error) return cb(error);
    return cb(null, body);
  });
}