/**
 * Module dependencies
 */
var app = express(),
  expressValidator = require('express-validator'),
  Notification = require('./lib/notification');


/**
 * Create the servers
 */
var  server = require('http').createServer(app), // create the express.js server
  io = io.listen(server); // create the socket.io server

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
  app.use(app.router);

});

/**
 * Tell express to start listening.
 */
server.listen(app.get("port"), function() {
  console.log("Express server listening on port " + app.get("port"));
});

/**
 * Handle socket.io requests
 */
io.sockets.on('connection', function(socket) {
  socket.emit('news', {
    hello: 'world'
  });
  socket.on('my other event', function(data) {
    console.log(data);
  });
});