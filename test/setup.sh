#!/bin/bash
node setup-redis.js -a '192.237.181.91'
status=$?
if [[ $status != 0 ]] ; then
    exit $status
fi
HOST='192.237.181.91' PORT=3306 USER=nicknick PASSWORD=testtest111 DATABASE=test node setup-mysql.js
if [[ $status != 0 ]] ; then
    exit $status
fi