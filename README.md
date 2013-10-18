#Notification System

##Environment Variables
 * MYSQL_HOST = MYSQL Host Address
 * MYSQL_USER = MYSQL Username
 * MYSQL_PASS = MYSQL Password
 * MYSQL_DATABASE = MYSQL Database Name

#IO-Server

##Auth with io-api
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
  request: '<optionally echo the request that was received>'
}
```
Valid codes: 
* INVALID_JSON - the JSON received could not be parsed
* MISSING_TYPE - the JSON object had no type associated with it
* INVALID_TYPE - the JSON object had an invalid type associated with it
* SET_NOTIFICATION_SEEN_UNSUCCESSFUL - if setting a notification to seen was unsuccessful, +{id: <the id of the notification>}

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


TODO: If an io-api client disconnects, automatically reconnect them.

##Notifications Client

The use the events the io-server passes around. There are some exceptions noted above. Obviously the client should never send an AUTH_SUCCESSFUL or other messages like it. If it does the server ignore them.

###Events

####client.on('authed', function(event))
The client will emit an authed event when it has been authenticated with the server. At this point it may not be safe to send messages to the server.

####client.on('ready', function(event))
The client will emit a ready event when it has been authenticated with the server and is ready to begin receiving messages. It is only safe to send messages to the server after the ready event.

####client.on('error', function(event))
The client will emit an error event when it receives one from the server. Possible error event codes are listed above.

####client.on('success', function(event))
The client will emit a success event when it receives one from the server. Possible success event codes are listed above.