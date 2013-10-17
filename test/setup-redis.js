/**
 * Module dependencies
 */
var redis = require("redis"),
  optimist = require('optimist')
    .usage('Setup the redis database for the tests.\nUsage: $0')
    .alias('p', 'port')
    .alias('a', 'address')
    .alias('h', 'help')
    .describe('p', 'The port to connect to the Redis database on.')
    .describe('a', 'The host address of the Redis database.')
    .describe('h', 'Display this usage info.')
    .default ('p', 6379)
    .default ('a', '127.0.0.1');

var argv = optimist.argv;

if (argv.help) {
  optimist.showHelp();
  process.exit(0);
}

/**
 * The redis client used to get/set session data.
 */
var client = redis.createClient(argv.p, argv.a);

var sessionKey = 'foobar';
var session = {
  ID: 1
};
// add the session to the redis database

client.on("error", function(err) {
  console.log("Error " + err);
  process.exit(1);
});

client.on("ready", function(err) {
  if(err){
    console.log("Err: " + err);
    process.exit(1);
  }
  client.set(sessionKey, session, function(err, reply) {
    if(err){
      console.log("Err: " + err);
      process.exit(1);
    }
    console.log("Redis Reply: " + reply);
    client.quit()
  });
});