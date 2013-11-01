var util = require('util');
/**
 * Load the config file
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
if (typeof config === 'undefined' || typeof config.mysql === 'undefined' || typeof config.redis === 'undefined' || typeof config.httpAPI === 'undefined') {
  console.log("Error with: " + configFile);
}

/**
 * This debug variable controls the level of logging.
 */
var debug = false;
if (typeof config.httpAPI.debug !== 'undefined') {
  debug = config.httpAPI.debug;
  process.env.debug = config.httpAPI.debug;
}

/**
 * Module dependencies
 */
var express = require('express');
var app = express();
var expressValidator = require('express-validator');
var Notification = require('./lib/notification');
var redis = require("redis");
var _ = require('underscore');


// *
//  * The API-Key to validate against.

// var API_KEY = 'foobar';

/**
 * The redis client used to get/set API-Key data.
 */
var redisClient = redis.createClient(config.redis.port, config.redis.host);
redisClient.on("error", function(err) {
  console.log("Redis Client Error " + err);
  throw err;
});

redisClient.on("ready", function(err) {
  if (err) {
    console.log("Redis Client Err: " + err);
    throw err;
  }
  console.log("Redis ready......");
});


/**
 * Create the servers
 */
var server = require('http').createServer(app); // create the express.js server

/**
 * Preemptively load the MYSQL Database
 */
var pool = require('./lib/mysql');

/**
 * App configuration.
 */

app.configure(function() {
  app.set('port', config.httpAPI.port || 3000);
  app.set("views", __dirname + "/views");
  app.set('views', __dirname);
  app.set('view engine', 'jade');

  // log level depending on run mode
  if (debug) {
    if ('production' == process.env.NODE_ENV) {
      app.use(express.logger());
    } else {
      app.use(express.logger('dev'));
    }
  }

  app.use(express.compress());
  app.use(express.bodyParser());
  app.use(expressValidator());
  app.use(express.methodOverride());

  app.use(express.static(__dirname + '/public'));

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
 * HTTP Notifications API
 */

/**
 * Handle create Notification requests to the API.
 *           query params, ?=
 * @param {int} sessionID  The sessionID to run the query in the context of a user
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the id of the created Notification in the response.
 */
app.post('/notifications', validateNewNotification, function(req, res, next) {

  // save the object
  var n = new Notification(req.body);
  n.create(function(err, id) {
    if (err) return next(err);

    // publish the new notification to the user's channel
    var channel = n.toObject().ToUserID;
    redisClient.publish(channel, JSON.stringify({
      type: 'NEW_NOTIFICATION',
      notification: _.extend(n.toObject(), {
        ID: id
      })
    }));

    return res.json({
      ID: id
    })
  });
});

/**
 * Handle show Notification requests to the API.
 *           query params, ?=
 * @param {int} ID The ID of the Notification to query.
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the Notification matching the given id in the response.
 */
app.get('/notifications/:ID', validateID, function(req, res, next) {

  console.log("ID is: " + req.param('ID'));
  // get the object based on the id
  var n = new Notification({
    ID: req.param('ID')
  });
  n.get(function(err, result) {
    if (err) return next(err);

    return res.json(result)
  });
});

/**
 * Handle index Notification requests to the API.
 *           query params, ?=
 * @param {int} start The offset to start the query, ie. for pagination. Default is 0.
 * @param {int} limit Limit the number of results returned. Default is 0.
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the Notifications for the given user in the response.
 */
app.get('/notifications', validateToUserID, function(req, res, next) {

  // Validate start and limit as numbers
  if (req.param('start')) {
    req.assert('start').isNumeric();
  }
  if (req.param('limit')) {
    req.assert('limit').isNumeric();
  }
  var errors = req.validationErrors();
  if (errors) {
    return res.json(400, errors);
  }
  // need to search on a bunch of values and build the search dynamically

  var opts = {};
  if (req.param('start')) opts.start = req.param('start');
  if (req.param('limit')) opts.limit = req.param('limit');
  if (req.param('field') && req.param('fieldValue')) {
    opts.field = req.param('field');
    opts.fieldValue = req.param('fieldValue');
  }

  // get all the notifications for the user
  var n = new Notification({
    ToUserID: req.param('ToUserID')
  });
  n.index(opts, function(err, results) {
    if (err) return next(err);

    return res.json(results);
  });
});


/**
 * Handle delete Notification requests to the API.
 *           query params, ?=
 * @param {int} ID The ID of the Notification to query.
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the number of rows deleted in the response.
 */
app.del('/notifications/:ID', validateID, function(req, res, next) {

  var id = req.param('ID');
  // delete the notification based on the id
  var opts = _.extend(req.body, {
    ID: id
  });
  var n = new Notification(opts);
  n.del(function(err, count) {
    if (err) return next(err);

    // publish the deleted notification event to the user's channel
    var channel = n.toObject().ToUserID;
    redisClient.publish(channel, JSON.stringify({
      type: 'DELETED_NOTIFICATION',
      id: id
    }));

    return res.json(count)
  });
});

/**
 * Handle set Notification requests to the API.
 *           query params, ?=
 * @param {int} ID The ID of the Notification to query.
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the number of Notifications updated in the response.
 */
app.put('/notifications/:ID', validateUpdateNotification, function(req, res, next) {
  //  a proper `PUT` would require all the params to be set,
  //  this resource acts more like a `PATCH`.

  var opts = _.extend(req.body, {
    ID: req.param('ID')
  });
  // update the object based on the id
  var n = new Notification(opts);
  n.update(function(err, count) {
    if (err) return next(err);

    // publish the updated notification to the user's channel
    var channel = n.toObject().ToUserID;
    redisClient.publish(channel, JSON.stringify({
      type: 'UPDATED_NOTIFICATION',
      notification: n.toObject()
    }));

    return res.json(count)
  });
});

/**
 * Handle marking Notification as seen requests to the API.
 *           query params, ?=
 * @param {int} ID The ID of the Notification to query.
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the number of Notifications updated in the response.
 */
app.put('/notifications/:ID/seen', validateUpdateNotification, function(req, res, next) {
  //  a proper `PUT` would require all the params to be set,
  //  this resource acts more like a `PATCH`.

  var opts = _.extend(req.body, {
    ID: req.param('ID')
  });
  // update the object based on the id
  var n = new Notification(opts);
  n.seen(function(err, count) {
    if (err) return next(err);

    // publish the updated notification to the user's channel
    var channel = n.toObject().ToUserID;
    redisClient.publish(channel, JSON.stringify({
      type: 'UPDATED_NOTIFICATION',
      notification: n.toObject()
    }));
    return res.json(count)
  });
});

/**
 * Validations for creating a Notification.
 */

function validateNewNotification(req, res, next) {
  if (!req.body) req.body = {};

  // Check for validation errors
  req.checkBody('Type', 'Type must not be empty.').notEmpty();
  req.checkBody('Page', 'Page must not be empty.').notEmpty();
  req.checkBody('ToUserID', 'ToUserID must not be empty.').notEmpty();
  req.checkBody('Description', 'Description must not be empty.').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.json(400, errors);
  }
  return next();
}

/**
 * Validations for updating a Notification.
 */

function validateUpdateNotification(req, res, next) {
  if (!req.body) req.body = {};

  // Check for validation errors
  if (typeof req.body['Type'] !== 'undefined') {
    req.checkBody('Type', 'Type must not be empty.').notEmpty();
  }
  if (typeof req.body['Page'] !== 'undefined') {
    req.checkBody('Page', 'Page must not be empty.').notEmpty();
  }
  // if (typeof req.body['ToUserID'] !== 'undefined') {
  req.checkBody('ToUserID', 'ToUserID must not be empty.').notEmpty();
  // }
  if (typeof req.body['Description'] !== 'undefined') {
    req.checkBody('Description', 'Description must not be empty.').notEmpty();
  }

  var errors = req.validationErrors();
  if (errors) {
    return res.json(400, errors);
  }
  return next();
}

/**
 * Validations for updating a Notification as seen.
 */

function validateSeenNotification(req, res, next) {
  if (!req.body) req.body = {};

  // Check for validation errors
  req.checkBody('ToUserID', 'ToUserID must not be empty.').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.json(400, errors);
  }
  return next();
}

/**
 * Validations for the ID param.
 */

function validateID(req, res, next) {
  req.assert('ID', 'ID must not be empty.').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.json(400, errors);
  }

  return next();
}

/**
 * Validations for the ToUserID param.
 */

function validateToUserID(req, res, next) {
  req.assert('ToUserID', 'ToUserID must not be empty.').notEmpty();

  var errors = req.validationErrors();
  if (errors) {
    return res.json(400, errors);
  }
  return next();
}