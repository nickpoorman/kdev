var EventEmitter = require('events').EventEmitter;
var inherits = require('inherits');
var debug = true;

window.NotificationsClient = NotificationsClient;

function NotificationsClient(opts) {
  if (!(this instanceof NotificationsClient)) return new NotificationsClient(opts);
  if (!opts) opts = {};

  if (!opts.sockjs_url || !opts.session_id || !opts.api_key) return null;

  var self = this;

  console.log("created Notification Client");

  this.sock = new SockJS(opts.sockjs_url);

  this.sock.onopen = function() {
    if (debug) console.log("Connected");
    if (debug) console.log("Sending Auth...");
    self.sock.send(JSON.stringify({
      session_id: opts.session_id,
      api_key: opts.api_key
    }));
  };

  /**
   * message.data contains the json sent from the server
   */
  this.sock.onmessage = function(message) {
    if (debug) console.log(message);

    if (!message || typeof message.data === 'undefined') {
      return console.log("Error parsing JSON from server.");
    }
    var data = '';
    try {
      data = JSON.parse(message.data);
    } catch (err) {
      return console.log("Error parsing JSON from server.");
    }

    if (!data) {
      console.log("No data from server.");
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
      default:
        // if it's not an error or success what is it?
        self.emit('unknown', data);
    }
  };

  this.sock.onclose = function() {
    console.log('Disconnected');
  };
}

inherits(NotificationsClient, EventEmitter);

NotificationsClient.prototype.setViewed = function(id) {
  this.sock.send(JSON.stringify({
    type: 'SEEN_NOTIFICATION',
    id: id
  }));
}