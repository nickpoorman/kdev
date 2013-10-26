var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');

window.NotificationsClient = NotificationsClient;

function NotificationsClient(opts) {
  if (!(this instanceof NotificationsClient)) return new NotificationsClient(opts);
  if (!opts) opts = {};

  if (!opts.sockjs_url || !opts.session_id || !opts.api_key) throw new Error('requires valid options for "sockjs_url", "session_id", "api_key"');

  this.opts = opts;

  this.reconnectInterval = null;
  this._reconnectAttempts = 0;
  this.reconnectAttempts = opts.reconnectAttempts || 10;
  this.forceReload = opts.forceReload || false;
  this.debug = opts.debug || false;

  if (self.debug) console.log("created Notification Client");
  this.createConnection();

}

inherits(NotificationsClient, EventEmitter);

NotificationsClient.prototype.setViewed = function(id) {
  this.sock.send(JSON.stringify({
    type: 'SEEN_NOTIFICATION',
    id: id
  }));
}

NotificationsClient.prototype.pull = function(opts) {
  opts = opts || {};
  var message = {
    type: 'PULL_NOTIFICATIONS'
  };
  if (opts.limit) message.limit = opts.limit;
  if (opts.start) message.start = opts.start;
  if (opts.field && opts.fieldValue) {
    message.field = opts.field;
    message.fieldValue = opts.fieldValue;
  }
  this.sock.send(JSON.stringify(message));
}

NotificationsClient.prototype.createConnection = function() {
  if (this.debug) console.log("_reconnectAttempts: " + this._reconnectAttempts);
  if (this.debug) console.log("reconnectAttempts: " + this.reconnectAttempts);
  if (this.debug) console.log("Create Connection");
  var self = this;

  this.sock = new SockJS(self.opts.sockjs_url);

  this.sock.onopen = function() {
    if (self.debug) console.log("Connected");
    self._reconnectAttempts = 0;
    if (self.debug) console.log("Sending Auth...");
    self.sock.send(JSON.stringify({
      session_id: self.opts.session_id,
      api_key: self.opts.api_key
    }));
  };

  /**
   * message.data contains the json sent from the server
   */
  this.sock.onmessage = function(message) {
    if (self.debug) console.log(message);

    if (!message || typeof message.data === 'undefined') {
      if (self.debug) console.log("Error parsing JSON from server.");
      return;
    }
    var data = '';
    try {
      data = JSON.parse(message.data);
    } catch (err) {
      if (self.debug) console.log("Error parsing JSON from server.");
      return;
    }

    if (!data) {
      if (self.debug) console.log("No data from server.");
      return;
    }

    switch (data.type) {
      case 'ERROR':
        // fire an error event
        self.emit('error', data);
        break;
      case 'SUCCESS':
        if (data.code === 'AUTH_SUCCESSFUL') {
          self.emit('authed', data);
          break;
        }
        if (data.code === 'READY') {
          self.emit('ready', data);
          break;
        }
        self.emit('success', data);
        break;
      case 'NEW_NOTIFICATION':
      case 'DELETED_NOTIFICATION':
      case 'UPDATED_NOTIFICATION':
        self.emit('notification', data);
        break;
      case 'PULLED_NOTIFICATIONS':
        self.emit('notifications', data)
        break;
      default:
        // if it's not an error or success what is it?
        self.emit('unknown', data);
    }
  };

  this.sock.onclose = function() {
    if (self.debug) console.log('Disconnected');

    if (self._reconnectAttempts < self.reconnectAttempts) {
      self.reconnectInterval = setTimeout(function() {
        if (self.debug) console.log("trying to reconnect");
        self.createConnection();
      }, 1500 + ((self._reconnectAttempts++) * 500));
    } else {
      // should probably refresh the page if reconnecting isn't working.
      // there might be a new client that needs to be pulled.
      if (self.debug) console.log("Done trying to reconnect.");
      if (self.forceReload) {
        if (self.debug) console.log("Going to reload the page.");
        window.location.reload(true);
      }
    }

  };
}