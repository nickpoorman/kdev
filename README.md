#Notification System

This is the notification system. It is responsible for notification and the message passing to and from the clients. 

It has a config file called `config.json`.

##io-api

Any event that comes in from the Redis channel (probably originating from the http-api) to the io-api gets passed along to the notifications-client through the sockjs connection.

###Auth with io-api

First message to server must be an auth object:
``` javascript
{
  sessionId: <the user's session id>,
  api_key: <the private api key provided to the user>
}
```
On successful auth, io-api will issue an `AUTH_SUCCESSFUL` message.

Once the server is ready to begin accepting messages after a successful auth, a `READY` message will be sent to the user.
At this point it's ok to start sending the io-api messages.

Messages to the io-api at this point should be objects with a type:
``` javascript
{
  type: 'SEEN_NOTIFICATION'
  ID: <Notification ID>,
}
```

###Message Objects

####Seen notification message.

This event shouldn't ever get sent to the browser client. It should only come from the browser client.

``` javascript
{
  type: 'SEEN_NOTIFICATION',
  id: <ID of the object to mark as seen>
}
```

####Error message.

``` javascript
{
  type: 'ERROR',
  code: 'INVALID_JSON',
  message: 'A message here', 
  request: '<optionally echo the request that was received>',
  error: <may or may not contain the error message, optional>
}
```
Valid codes: 
* INVALID_JSON - the JSON received could not be parsed
* MISSING_TYPE - the JSON object had no type associated with it
* INVALID_TYPE - the JSON object had an invalid type associated with it
* SET_NOTIFICATION_SEEN_UNSUCCESSFUL - if setting a notification to seen was unsuccessful, +{id: <the id of the notification>}
* PULL_NOTIFICATIONS_UNSUCCESSFUL - if a request for notifications was unsuccessful, 

####Success message

``` javascript
{
  type: 'SUCCESS',
  code: 'AUTH_SUCCESSFUL',
  message: 'An optional message here', 
  request: '<optionally echo the request that was received>'
}
```
Valid codes: 
* AUTH_SUCCESSFUL - the authorization process was successfully completed
* READY - the server is ready to begin accepting messages
* SET_NOTIFICATION_SEEN_SUCCESSFUL - if setting a notification to seen was successful, +{id: <the id of the notification>}

####New Notification message

This message gets sent from the http-api to the io-api(s) and then to the clients when a new notification is created by the http-api.

``` javascript
{
  type: 'NEW_NOTIFICATION',
  notification: <the new notification itself>
}
```

####Deleted Notification message

This message gets sent from the http-api to the io-api(s) then to the clients when a notification is deleted by the http-api.

``` javascript
{
  type: 'DELETED_NOTIFICATION',
  id: <ID of the notification deleted>
}
```

####Updated Notification message

This message gets sent from the http-api to the io-api(s) and then to the clients when a notification is updated by the http-api.

This also gets sent when a notification is set as `seen`, ie. `TimeViewed` has a value.

Important!: Any time this message gets sent it will only send the ID and the updated information as the `notification`. (This prevents us from having to make another DB call and it means passing less information to save on bandwidth).

Note: you might want to use `notification.ID` to update any notifications on the view with the same `ID`.

``` javascript
{
  type: 'UPDATED_NOTIFICATION',
  notification: <the updated notification information>
}
```

####Pulled Notifications message (index)

This message gets sent from the http-api to the io-api(s) and then to the clients when notifications are retrieved the http-api.

If this fails it will emit an error with code: `PULL_NOTIFICATIONS_UNSUCCESSFUL`.

`request` is the original request, so you know where what to update on the view.

`notifications` contains the notifications retrieved.

``` javascript
{
  type: 'PULLED_NOTIFICATIONS',
  message: 'Notifications were successfully retrieved.',
  request: message,
  notifications: [<notifications>]
}
```

##Notifications Client

The use the events the io-server passes around. There are some exceptions noted above. Obviously the client should never send an AUTH_SUCCESSFUL or other messages like it. If it does, the server ignores them.

###Methods

####var c = new Notifications(opts)
Create a new notification client that will automatically try to connect to the io-server. `opts` takes the following params:

 * `opts.sockjs_url` - The url to the io-api.
 * `opts.session_id` - The session id of the user.
 * `opts.api_key` - The api key of the user.
 * `opts.reconnectAttempts` - The number of times to reconnect if the client disconnects from the server. Default `10`.
 * `opts.forceReload` - A boolean value to force a reload of the page if the number of reconnect attempts is exceeded. Default: `false`.
 * `opts.debug` - Print debug messages to the client. Default: `false`.

####client.createConnection()
Create a new connection to the io-api. This will automatically try to reconnect.

####client.pull(opts)
This method will pull all the notifications. You may provide an the `opts` parameter to specify exactly what to load.

  * `opts.start` - the offset to start from. Default `0`.
  * `opts.limit` - the limit on the number of results returned. Default: `10`.
   `opts.field` - the field to limit the results to. ie. 'Page'
  * `opts.fieldValue` - the value to limit the results to with the field.

####client.setViewed(id)
Set a notification as viewed. `id` is the id of the notification to set as viewed. This simply sets a time for TimeViewed in the database.


###Events

####client.on('authed', function(event))
The client will emit an authed event when it has been authenticated with the server. At this point it may not be safe to send messages to the server.

####client.on('ready', function(event))
The client will emit a `ready` event when it has been authenticated with the server and is ready to begin receiving messages. It is only safe to send messages to the server after the ready event.

####client.on('error', function(event))
The client will emit an `error` event when it receives one from the server. Possible error event codes are listed above.

####client.on('success', function(event))
The client will emit a `success` event when it receives one from the server. Possible success event codes are listed above.

####client.on('notification', function(event))
The client will emit a `notification` event when it receives a message with type `*_NOTIFICATION` from the server.

####client.on('notifications', function(event))
The client will emit a `notifications` event when it receives a message with type `PULLED_NOTIFICATIONS` from the server.

TODO:
  * If an io-api client disconnects, automatically reconnect them.

##http-api


### get /server/status

Return the server status. Will return `online` with Content-Type as `text/plain`.

### post /notifications

Handles create Notification requests to the API.

POST body must include:
  * `Type`
  * `Page`
  * `ToUserID`
  * `Description`

### get /notifications/:ID

Handle show Notification requests to the API.
`:ID` must be the ID of the notification you are trying to get.

### get /notifications

Handle an index call to Notifications. This will return a list of all the notifications for a user.

Query params must include:
  * `ToUserID` - this will act as the key to lookup notifications for a user.
Query params may include:
  * `start` - the offset to start from. Default `0`.
  * `limit` - the limit on the number of results returned. Default: `10`.

### del /notifications/:ID

Handle delete Notification requests to the API.
`:ID` must be the ID of the notification you are trying to delete.

Query params must include:
  * `ToUserID` - this will act as the key to verify notification ownership of a user.

### put /notifications/:ID
Handle update/set Notification requests to the API. This resource acts more like PATCH than PUT.
`:ID` must be the ID of the notification you are trying to delete.

PUT body must include:
  * `ToUserID` - this will act as the key to verify notification ownership of a user.

### put /notifications/:ID/seen
Handle marking Notification as seen. This is practically the same thing as `put /notifications/:ID` only it will set `TimeViewed` automatically using node.js `new Date()` as part of the sql query.
`:ID` must be the ID of the notification you are trying to delete.

PUT body must include:
  * `ToUserID` - this will act as the key to verify notification ownership of a user.


To setup: [http://blog.dealspotapp.com/post/40184153657/node-js-production-deployment-with-nginx-varnish](http://blog.dealspotapp.com/post/40184153657/node-js-production-deployment-with-nginx-varnish)

```
$ cat /etc/monit/conf.d/regattable.conf 
check host localhost with address 127.0.0.1
        start "/sbin/start regattable"
        stop "/sbin/stop regattable"
        if failed port 3000 protocol HTTP
                request /server/status
                with timeout 5 seconds
                then restart
```
