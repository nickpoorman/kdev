/**
 * Module dependencies
 */
var app = express(),
  expressValidator = require('express-validator'),
  Notification = require('./lib/notification'),
  redis = require("redis");

/**
 * The redis client used to get/set session data.
 */
var redisSessionClient = redis.createClient();


/**
 * Create the servers
 */
var server = require('http').createServer(app); // create the express.js server

/**
 * MYSQL Database
 */
var dbConfig = {
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER || 'nick',
  password: process.env.MYSQL_PASS || 'testpassword000',
  database: process.env.MYSQL_DATABASE || 'kdev';
};
var db = require('./lib/db')(dbConfig);

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
  app.get("/server/status", function(req, res) {
    return res.type('txt').send('online');
  });

  // make sure this is above the logger so to
  // not log all the static asset requests
  app.use(express.static(__dirname + '/public'));

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
  app.user(function(req, res, next){
    // check the api-key header
    if(!req.get('API-Key')) return res.json(401, {'API-Key not found'})
    return next();
  });
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
app.post('/notifications', function(req, res, next) {
  // TODO: determine proper validations for this resource

  // save the object
  var n = new Notification(req.body);
  n.create(function(err, id) {
    if (err) return next(err);

    return res.json({
      id: id
    })
  });
});

/**
 * Handle show Notification requests to the API.
 *           query params, ?=
 * @param {int} sessionID  The sessionID to run the query in the context of a user
 * @param {int} id The ID of the Notification to query.
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the Notifications matching the given id in the response.
 */
app.get('/notifications/:id', function(req, res, next) {
  // TODO: determine proper validations for this resource

  // get the object based on the id
  var n = new Notification(req.body);
  n.get(req.param('id'), function(err, results) {
    if (err) return next(err);

    return res.json({
      results: results
    })
  });
});

/**
 * Handle index Notification requests to the API.
 *           query params, ?=
 * @param {int} sessionID  The sessionID to run the query in the context of a user
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
app.get('/notifications', function(req, res, next) {
  // TODO: determine proper validations for this resource

  if (!res.session) {
    return res.json(401, {
      message: "No session found."
    });
  }

  var opts = {};
  if (req.param('start')) opts.start = req.param('start');
  if (req.param('limit')) opts.limit = req.param('limit');

  // get all the notifications for the user
  var n = new Notification(req.body);
  n.index(opts, function(err, results) {
    if (err) return next(err);

    return res.json({
      results: results
    })
  });
});


/**
 * Handle delete Notification requests to the API.
 *           query params, ?=
 * @param {int} sessionID  The sessionID to run the query in the context of a user
 * @param {int} start The offset to start the query, ie. for pagination. Default is 0.
 * @param {int} limit Limit the number of results returned. Default is 0.
 * @param {int} id The ID of the Notification to query.
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the number of rows deleted in the response.
 */
app.delete('/notifications/:id', function(req, res, next) {
  // TODO: determine proper validations for this resource

  // delete the notification based on the id
  var n = new Notification(req.body);
  n.get(req.param('id'), function(err, count) {
    if (err) return next(err);

    return res.json({
      count: count
    })
  });
});

/**
 * Handle set Notification requests to the API.
 *           query params, ?=
 * @param {int} sessionID  The sessionID to run the query in the context of a user
 *
 *           function callback params
 * @param  {Object}   req  The request object express provides.
 * @param  {Object}   res  The response object express provides.
 * @param  {Function} next An optional callback to the next middleware.
 *
 * @returns {JSON} Sends back the number of Notifications updated in the response.
 */
app.put('/notifications/:id', function(req, res, next) {
  // TODO: determine proper validations for this resource
  //  a proper `PUT` would require all the params to be set,
  //  this resource acts more like a `PATCH`.

  // get the object based on the id
  var n = new Notification(req.body);
  n.get(req.param('id'), function(err, count) {
    if (err) return next(err);

    return res.json({
      count: count
    })
  });
});