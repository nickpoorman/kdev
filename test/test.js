var request = require('supertest'),
  express = require('express'),
  expressValidator = require('express-validator'),
  should = require('should'),
  api = require('../');

var testAPIKey = 'foobar';
// TODO: add the test api-key to the redis database

request = request('http://localhost:3000');

describe('post /notifications', function() {

  var uri = '/notifications';

  it('respond with unauthorized', function(done) {
    request.post(uri)
      .expect(401, done);
  });

  it('respond with status 200', function(done) {
    request.post(uri)
      .set('API-Key', testAPIKey)
      .expect(200, done);
  });

  it('respond with json', function(done) {
    request.post(uri)
      .set('API-Key', testAPIKey)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the id of the newly created Notification as a number', function(done) {
    request.post(uri)
      .set('API-Key', testAPIKey)
      .expect(/^-?[0-9]+$/, done);
  });
});

describe('get /notifications/:id', function() {

  var uri = '/notifications/1';

  it('respond with unauthorized', function(done) {
    request.get(uri)
      .expect(401, done);
  });

  it('respond with status 200', function(done) {
    request.get(uri)
      .set('API-Key', testAPIKey)
      .expect(200, done);
  });

  it('respond with json', function(done) {
    request.get(uri)
      .set('API-Key', testAPIKey)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the Notification as an array', function(done) {
    request.get(uri)
      .set('API-Key', testAPIKey)
      .end(function(error, res) {
        res.should.be.an.Array;
        done();
      });
  });
});

describe('get /notifications', function() {

  var uri = '/notifications';

  it('respond with unauthorized', function(done) {
    request.get(uri)
      .expect(401, done);
  });

  it('respond with status 200', function(done) {
    request.get(uri)
      .set('API-Key', testAPIKey)
      .expect(200, done);
  });

  it('respond with json', function(done) {
    request.get(uri)
      .set('API-Key', testAPIKey)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the Notification as an array', function(done) {
    request.get(uri)
      .set('API-Key', testAPIKey)
      .end(function(error, res) {
        res.should.be.an.Array;
        done();
      });
  });
});

describe('delete /notifications/:id', function() {

  var uri = '/notifications/:id';

  it('respond with unauthorized', function(done) {
    request.del(uri)
      .expect(401, done);
  });

  it('respond with status 200', function(done) {
    request.del(uri)
      .set('API-Key', testAPIKey)
      .expect(200, done);
  });

  it('respond with json', function(done) {
    request.del(uri)
      .set('API-Key', testAPIKey)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the number of Notifications deleted', function(done) {
    request.del(uri)
      .set('API-Key', testAPIKey)
      .expect(/^-?[0-9]+$/, done);
  });
});

describe('put /notifications/:id', function() {

  var uri = '/notifications/:id';

  it('respond with unauthorized', function(done) {
    request.put(uri)
      .expect(401, done);
  });

  it('respond with status 200', function(done) {
    request.put(uri)
      .set('API-Key', testAPIKey)
      .expect(200, done);
  });

  it('respond with json', function(done) {
    request.put(uri)
      .set('API-Key', testAPIKey)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the number of Notifications updated', function(done) {
    request.put(uri)
      .set('API-Key', testAPIKey)
      .expect(/^-?[0-9]+$/, done);
  });
});