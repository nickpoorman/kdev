var mysql = require('mysql');

// read the config for mysql
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
if (typeof config === 'undefined' || typeof config.mysql === 'undefined') {
  console.log("Error with: " + configFile);
}

var dbConfig = {
  host: config.mysql.host,
  port: config.mysql.port,
  user: config.mysql.user,
  password: config.mysql.password,
  supportBigNumbers: config.mysql.supportBigNumbers || true,
  database: config.mysql.database,
};

var pool = mysql.createPool(dbConfig);

module.exports = pool;