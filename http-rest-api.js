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
if (typeof config === 'undefined' || typeof config.mysql === 'undefined' || typeof config.redis === 'undefined') {
  console.log("Error with: " + configFile);
}

/**
 * Module dependencies
 */
var express = require('express');
var app = express();
var expressValidator = require('express-validator');
var Notification = require('./lib/notification');
var redis = require("redis");


// *
//  * The API-Key to validate against.

// var API_KEY = 'foobar';

/**
 * The redis client used to get/set API-Key data.
 */
var redisSessionClient = redis.createClient(config.redisPort, config.redisHost);


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
  app.set('port', process.env.PORT || 3000);
  app.set("views", __dirname + "/views");
  app.set('views', __dirname);
  app.set('view engine', 'jade');

  // make sure this is above the logger so to
  // not log all the server status messages
  // app.get("/server/status", function(req, res) {
  //   return res.type('txt').send('online');
  // });

  // log level depending on run mode
  if ('production' == process.env.NODE_ENV) {
    app.use(express.logger());
  } else {
    app.use(express.logger('dev'));
  }

  app.use(express.compress());
  app.use(express.bodyParser());
  app.use(expressValidator());
  app.use(express.methodOverride());
  // app.user(function(req, res, next) {
  //   // check the api-key header
  //   if (!req.get('API-Key') || req.get('API-Key') !== API_KEY) {
  //     return res.json(401, {
  //       'API-Key not found'
  //     });
  //   }
  //   return next();
  // });

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
 * HTTP Notifications API
 * All requests to the API should provide a `api-key` header
 *  to run the query in the context of a user.
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

  var opts = {};
  if (req.param('start')) opts.start = req.param('start');
  if (req.param('limit')) opts.limit = req.param('limit');

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

  // delete the notification based on the id
  var n = new Notification({
    ID: req.param('ID')
  });
  n.del(function(err, count) {
    if (err) return next(err);

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

    return res.json({
      count: count
    })
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
  if (req.body['Type']) {
    req.checkBody('Type', 'Type must not be empty.').notEmpty();
  }
  if (req.body['Page']) {
    req.checkBody('Page', 'Page must not be empty.').notEmpty();
  }
  if (req.body['ToUserID']) {
    req.checkBody('ToUserID', 'ToUserID must not be empty.').notEmpty();
  }
  if (req.body['Description']) {
    req.checkBody('Description', 'Description must not be empty.').notEmpty();
  }

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