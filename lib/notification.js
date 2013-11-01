var _ = require('underscore');
var pool = require('./mysql');
var util = require('util');
var debug = false || process.env.debug;
var util = require('util');

module.exports = Notification;

var TABLE_NAME = process.env.MYSQL_NOTIFICATION_TABLE || 'notifications';

var WHITELISTED_KEYS = [
  'ID', 'Type', 'Page', 'ResourceID', 'SubPage', 'Section',
  'FromUserID', 'ToUserID', 'Description', 'TimeCreated',
  'TimeViewed', 'ExtraData', 'TimeViewed_epoch'
];

/**
 * A Notification object.
 * @param {Object} opts The options to supply to the Notification constructor.
 * @param {Array} opts.data An object of data for the Notification.
 */

function Notification(opts) {
  if (!(this instanceof Notification)) return new Notification(opts);
  opts = opts || {};

  if (!pool) {
    throw new Error('No mysql connection pool.');
  }

  this.data = _.pick(opts, WHITELISTED_KEYS);

  return this;
}

/**
 * Insert the new notification into the database.
 * @param  {Function} cb  The callback to call when either an
 *                        error occurs, or the notification has
 *                        been inserted.
 * * cb(error|null, inserted ID)
 */
Notification.prototype.create = function(cb) {
  var self = this;
  console.log("this.data: " + util.inspect(this.toObject()));
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var sql = 'INSERT INTO ' + TABLE_NAME + ' SET ' + connection.escape(self.toObject());
    if (debug) console.log("DEBUG-SQL: " + sql);

    var query = connection.query(sql, function(err, result) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, result.insertId);
    });
    // if (debug) console.log("DEBUG-POST-SQL: " + query.sql);
  });
}

/**
 * Retrieve a Notification from the database.
 * @param  {int|String} id The id of the Notification to retrieve.
 * @param  {Function} cb The callback.
 * * cb(error|null, Notifications)
 */
Notification.prototype.get = function(cb) {
  var self = this;
  console.log("self.ID: " + self.ID);
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var sql = 'SELECT * FROM ' + TABLE_NAME + ' WHERE ID = ' + connection.escape([self.toObject().ID]) + ' LIMIT 1';
    if (debug) console.log("DEBUG-SQL: " + sql);

    var query = connection.query(sql, function(err, results) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      // return the results
      if (typeof results.length !== 'undefined' && results.length > 0) {
        cb(err, results[0]);
      }
      cb(err, null);
    });
    // if (debug) console.log("DEBUG-POST-SQL: " + query.sql);
  });
}

/**
 * Update the Notification in the database.
 * @param  {int|String} ID The id of the Notification to update.
 * @param  {int|String} ToUserID The id of the user the Notification belongs to.
 * @param  {Function} cb The callback.
 * * cb(error|null, number of rows updated)
 */
Notification.prototype.update = function(cb) {
  var self = this;
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var sql = 'UPDATE ' + TABLE_NAME + ' SET ' + connection.escape(self.toObject()) + ' WHERE ID = ' + connection.escape(self.toObject().ID) + ' AND ToUserID = ' + connection.escape(self.toObject().ToUserID);
    if (debug) console.log("DEBUG-SQL: " + sql);

    var query = connection.query(sql, function(err, count) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, count);
    });
    // if (debug) console.log("DEBUG-POST-SQL: " + query.sql);
  });
}

/**
 * Delete the Notification from the database.
 * Note: All notifications should just be marked as "read" by setting timeViewed.
 * @param  {int|String} id The id of the Notification to delete.
 * @param  {Function} cb The callback.
 *
 * * cb(error|null, number of rows deleted)
 */
Notification.prototype.del = function(cb) {
  var self = this;

  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var sql = 'DELETE FROM ' + TABLE_NAME + ' WHERE ID = ' + connection.escape(self.toObject().ID);
    if (debug) console.log("DEBUG-SQL: " + sql);

    var query = connection.query(sql, function(err, count) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, count);
    });
    // if (debug) console.log("DEBUG-POST-SQL: " + query.sql);
  });
}

/**
 * Retrieve Notifications from the database.
 * @param  {Object} opts The options to supply to the function.
 *
 * @param  {int|String} opts.id An id of a user to retrieve Notifications for.
 *                   If no id is specified, it will get all the Notifications.
 * @param  {int} opts.start The pagination start.
 * @param  {int} opts.limit Number of results to limit to.
 *
 * @param  {Function} cb The callback.
 * * cb(error|null, Notifications)
 */
Notification.prototype.index = function(opts, cb) {
  var self = this;

  opts = opts || {};
  opts.start = opts.start || 0;
  opts.limit = opts.limit || 10;

  if (!this.toObject().ToUserID) return cb(new Error('user must be specified'));

  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var sql = 'SELECT * FROM ' + TABLE_NAME + ' WHERE ToUserID = ' + connection.escape(self.toObject().ToUserID);
    if (opts.field && opts.fieldValue) sql = sql + ' AND ' + connection.escape(opts.field) + ' = ' + connection.escape(opts.fieldValue);
    sql = sql + ' ORDER BY TimeCreated DESC LIMIT ' + connection.escape(opts.start) + ',' + connection.escape(opts.limit);
    if (debug) console.log("DEBUG-SQL: " + sql);

    var query = connection.query(sql, function(err, results) {
      if (err) throw err;
      // And done with the connection.
      connection.release();
      console.log("RESULTS: " + util.inspect(results));

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, results);
    });
    // if (debug) console.log("DEBUG-POST-SQL: " + query.sql);
  });
}

/**
 * Update the Notification in the database.
 * @param  {int|String} ID The id of the Notification to update.
 * @param  {int|String} ToUserID The id of the user the Notification belongs to.
 * @param  {Function} cb The callback.
 * * cb(error|null, number of rows updated)
 */
Notification.prototype.seen = function(cb) {
  var self = this;
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection NOW()
    var date = new Date();
    self.setTimeViewed(connection.escape(date), date.getTime());

    var sql = 'UPDATE ' + TABLE_NAME + ' SET TimeViewed = ' + self.toObject().TimeViewed + ' WHERE ID = ' + connection.escape(self.toObject().ID) + ' AND ToUserID = ' + connection.escape(self.toObject().ToUserID);
    if (debug) console.log("DEBUG-SQL: " + sql);

    var query = connection.query(sql, function(err, count) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, count);
    });
    // if (debug) console.log("DEBUG-POST-SQL: " + query.sql);
  });
}

/**
 * Returns only this objects valid data.
 * @return {Object}   Return a copy of the data object,
 *                    filtered to only have values for
 *                    the whitelisted keys (or array of
 *                    valid keys).
 */
Notification.prototype.toObject = function(data) {
  return _.pick(this.data, WHITELISTED_KEYS);
}

/**
 * Set the TimeViewed for a the Notification
 */
Notification.prototype.setTimeViewed = function(date, millis) {
  this.data.TimeViewed = date;
  this.data.TimeViewed_epoch = millis;
}