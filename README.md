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
* SET_NOTIFICATION_SEEN_UNSUCCESSFUL - if setting a notification to seen was unsuccessful

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


TODO: If an io-api client disconnects, automatically reconnect them.