var request = require('supertest'),
  express = require('express'),
  expressValidator = require('express-validator'),
  should = require('should');
  // api = require('../http-rest-api');

var testAPIKey = 'foobar';

request = request('http://localhost:3000');

describe('post /notifications', function() {

  var uri = '/notifications';

  it('respond with status 400', function(done) {
    request.post(uri)
      .expect(400, done);
  });

  it('respond with json', function(done) {
    request.post(uri)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the id of the newly created Notification as a number', function(done) {
    request.post(uri)
      .send({ Type: 'User', Page: 'Home', ToUserID: 1, Description: 'Hello there!' })
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('ID')
        res.body.ID.should.match(/^-?[0-9]+$/)
        done();
      });
  });
});

describe('get /notifications/:id', function() {

  var uri = '/notifications/1';

  it('respond with json', function(done) {
    request.get(uri)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the Notification as an object with the result', function(done) {
    request.get(uri)
      .end(function(error, res) {
        res.body.should.have.property('ID', 1)
        res.body.should.have.property('Type', "User")
        res.body.should.have.property('Page', "Home")
        res.body.should.have.property('Description', "Hello there!")
        res.body.should.not.have.property('Wakakakaka')
        done();
      });
  });
});

// describe('get /notifications', function() {

//   var uri = '/notifications';

//   it('respond with status 400', function(done) {
//     request.get(uri)
//       .expect(400, done);
//   });

//   it('respond with json', function(done) {
//     request.get(uri)
//       .expect('Content-Type', /json/, done);
//   });

//   it('respond with the Notification as an array', function(done) {
//     request.get(uri)
//       .end(function(error, res) {
//         res.should.be.instanceof(Array);
//         done();
//       });
//   });
// });

// describe('delete /notifications/:id', function() {

//   var uri = '/notifications/:id';

//   it('respond with status 400', function(done) {
//     request.del(uri)
//       .expect(400, done);
//   });

//   it('respond with json', function(done) {
//     request.del(uri)
//       .expect('Content-Type', /json/, done);
//   });

//   it('respond with the number of Notifications deleted', function(done) {
//     request.del(uri)
//       .expect(/^-?[0-9]+$/, done);
//   });
// });

// describe('put /notifications/:id', function() {

//   var uri = '/notifications/:id';

//   it('respond with status 400', function(done) {
//     request.put(uri)
//       .expect(400, done);
//   });

//   it('respond with json', function(done) {
//     request.put(uri)
//       .expect('Content-Type', /json/, done);
//   });

//   it('respond with the number of Notifications updated', function(done) {
//     request.put(uri)
//       .expect(/^-?[0-9]+$/, done);
//   });
// });