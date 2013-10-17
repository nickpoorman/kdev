/**
 * Module dependencies
 */
var mysql = require("mysql");
var util = require('util');
//   optimist = require('optimist')
//     .usage('Setup the mysql database for the tests.\nUsage: $0')
//     .alias('P', 'port')
//     .alias('a', 'address')
//     .alias('h', 'help')
//     .alias('d', 'database')
//     // .alias('p', 'password')
//     .describe('P', 'The port to connect to the mysql database on.')
//     .describe('a', 'The host address of the mysql database.')
//     .describe('h', 'Display this usage info.')
//     .describe('d', 'The name of the database to connect to.')
//     .default ('P', 3306)
//     .default ('a', 'localhost');
//     .default ('d', 'test')

// var argv = optimist.argv;

// if (argv.help) {
//   optimist.showHelp();
//   process.exit(0);
// }
// 
// mysql> describe notifications
//    -> ;
// +-------------+------------------+------+-----+-------------------+-----------------------------+
// | Field       | Type             | Null | Key | Default           | Extra                       |
// +-------------+------------------+------+-----+-------------------+-----------------------------+
// | ID          | int(10) unsigned | NO   | PRI | NULL              | auto_increment              |
// | Type        | tinytext         | YES  |     | NULL              |                             |
// | Page        | tinytext         | YES  |     | NULL              |                             |
// | ResourceID  | tinytext         | YES  |     | NULL              |                             |
// | SubPage     | tinytext         | YES  |     | NULL              |                             |
// | Section     | tinytext         | YES  |     | NULL              |                             |
// | FromUserID  | int(10) unsigned | YES  |     | NULL              |                             |
// | ToUserID    | int(10) unsigned | YES  |     | NULL              |                             |
// | Description | text             | YES  |     | NULL              |                             |
// | TimeCreated | timestamp        | NO   |     | CURRENT_TIMESTAMP | on update CURRENT_TIMESTAMP |
// | TimeViewed  | datetime         | YES  |     | NULL              |                             |
// | ExtraData   | text             | YES  |     | NULL              |                             |
// +-------------+------------------+------+-----+-------------------+-----------------------------+

var options = {
  host: process.env.HOST,
  port: process.env.PORT,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE
};

var connection = mysql.createConnection(options);

var TABLE_NAME = 'notifications';

/**
 * The mysql client used to get/set API-Key data.
 */
connection.connect(function(err) {
  if (err) {
    console.log("ERROR: " + err);
    return process.exit(1);
  }
  // drop the notifications table
  connection.query('DROP TABLE IF EXISTS ' + TABLE_NAME, function(err, rows) {
    if (err) {
      console.log("ERROR: " + err);
      return process.exit(1);
    }
    // console.log("rows: " + util.inspect(rows));
    var sql = 'CREATE TABLE IF NOT EXISTS ' + TABLE_NAME + ' (ID INT(11) UNSIGNED NOT NULL AUTO_INCREMENT, Type TINYTEXT, Page TINYTEXT, ResourceID TINYTEXT, SubPage TINYTEXT, Section TINYTEXT, FromUserID INT(11) UNSIGNED, ToUserID INT(11) UNSIGNED, Description TEXT, TimeCreated TIMESTAMP, TimeViewed DATETIME, PRIMARY KEY(ID) );'
    connection.query(sql, function(err, rows) {
      if (err) {
        console.log("ERRROR: " + err);
        return process.exit(1);
      }
      // console.log("rows: " + util.inspect(rows));
      // CREATE
      //  - doesn't require anything
      // SHOW
      //  - Retrieve a Notification from the database.
      //    Should populate the database with one for us that we know will be there
      var sql = 'INSERT INTO ' + TABLE_NAME + ' SET ' + connection.escape({
        Type: 'User',
        Page: 'Home',
        ToUserID: 1,
        Description: 'Hello there!'
      });
      connection.query(sql, function(err, rows) {
        if (err) {
          console.log("ERRROR: " + err);
          return process.exit(1);
        }
        // INDEX
        //  - Retrieve Notifications from the database.
        //     This requires multiple items so lets add 3 more
        var input = [];
        for(var i = 0; i < 3; i++){
          input.push(['User','Home',1,'Hello There: ' + i]);
        }
        var sql = 'INSERT INTO ' + TABLE_NAME + ' (Type,Page,ToUserID,Description) VALUES'+ connection.escape(input);
        connection.query(sql, function(err, rows) {
          if (err) {
            console.log("ERRROR: " + err);
            return process.exit(1);
          }
          console.log("MYSQL Reply: " + 'OK');

          // DELETE
          //  - Delete the Notification from the database.
          //  We'll just delete the first one
          // UPDATE
          //  - Update the Notification in the database.
          //  Just update the second one


          connection.end(function(err) {
            // The connection is terminated now
          });
        });
      });
    });
  });
});

// TODO: need to setup the mysql database with some notification data