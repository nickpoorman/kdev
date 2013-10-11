var _ = require('underscore');
var debug = false;

module.exports = Notification;

var TABLE_NAME = process.env.MYSQL_NOTIFICATION_TABLE || 'notifications';

var WHITELISTED_KEYS = [
  'ID', 'Type', 'Page', 'ResourceID', 'SubPage', 'Section',
  'FromUserID', 'ToUserID', 'Description', 'TimeCreated',
  'TimeViewed', 'ExtraData'
];

/**
 * A Notification object.
 * @param {Object} opts The options to supply to the Notification constructor.
 * @param {Array} opts.data An object of data for the Notification.
 */

function Notification(opts) {
  if (!(this instanceof Notification)) return new Notification(opts);
  opts = opts || {};

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
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var query = connection.query('INSERT INTO ' + TABLE_NAME + ' SET ?', this.toObject(), function(err, result) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, result.insertId);
    });
    if (debug) console.log(query.sql);
  });
}

/**
 * Retrieve a Notification from the database.
 * @param  {int|String} id The id of the Notification to retrieve.
 * @param  {Function} cb The callback.
 * * cb(error|null, Notifications)
 */
Notification.prototype.get = function(id, cb) {
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var query = connection.query('SELECT * FROM ' + TABLE_NAME + ' WHERE ID = ?', [id], function(err, results) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      // return the results
      cb(err, results);
    });
    if (debug) console.log(query.sql);
  });
}

/**
 * Update the Notification in the database.
 * @param  {int|String} id The id of the Notification to update.
 * @param  {Function} cb The callback.
 * * cb(error|null, number of rows updated)
 */
Notification.prototype.update = function(id, cb) {
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var query = connection.query('UPDATE ' + TABLE_NAME + ' SET ? WHERE ID = ?', [this.toObject(), id], function(err, count) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, count);
    });
    if (debug) console.log(query.sql);
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
Notification.prototype.delete = function(id, cb) {
  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var query = connection.query('DELETE FROM' + TABLE_NAME + ' WHERE ID = ?', [id], function(err, count) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, count);
    });
    if (debug) console.log(query.sql);
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
  opts = opts || {};
  opts.start = opts.start || 0;
  opts.limit = opts.limit || 10;

  if (!opts.user) return cb(new Error('user must be specified'));

  pool.getConnection(function(err, connection) {
    if (err) {
      console.log(['ERROR: '] + err);
      return cb(err);
    }
    // Use the connection
    var query = connection.query('SELECT * FROM ' + TABLE_NAME + ' WHERE ToUserID = ? LIMIT ?,? ORDER BY TimeCreated DESC', [id, opts.start, opts.limit], function(err, results) {
      if (err) throw err;
      // And done with the connection.
      connection.release();

      // Don't use the connection here, it has been returned to the pool.

      // do the callback
      cb(err, results);
    });
    if (debug) console.log(query.sql);
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