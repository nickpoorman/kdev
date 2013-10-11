var mysql = require('mysql');

module.exports = DB;

function DB(opts) {
  if (!(this instanceof DB)) return new DB(opts);
  opts = opts || {};

  this.dbConfig = {
    host: opts.host,
    user: opts.user,
    password: opts.password,
    supportBigNumbers: opts.supportBigNumbers || true,
    database: opts.database,
  };

  this.pool = mysql.createPool(this.dbConfig);

  return this;
}
