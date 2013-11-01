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
      .send({
        Type: 'User',
        Page: 'Home',
        ToUserID: 1,
        Description: 'Hello there!'
      })
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

describe('get /notifications', function() {

  var uri = '/notifications';

  it('respond with status 400', function(done) {
    request.get(uri)
      .expect(400, done);
  });

  it('respond with json', function(done) {
    request.get(uri)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the Notification as an array', function(done) {
    request.get(uri)
      .send({
        ToUserID: 1
      })
      .end(function(error, res) {
        res.body.should.be.instanceof(Array);
        res.body.length.should.be.above(1);
        done();
      });
  });
  it('respond with the Notification as an array limit 1', function(done) {
    request.get(uri)
      .send({
        ToUserID: 1,
        limit: 1
      })
      .end(function(error, res) {
        res.body.should.be.instanceof(Array);
        res.body.length.should.not.be.above(1);
        done();
      });
  });
    it('respond with a Notification including a property ID', function(done) {
    request.get(uri)
      .send({
        ToUserID: 1,
        limit: 1
      })
      .end(function(error, res) {
        res.body[0].should.have.property('ID')
        done();
      });
  });
});

describe('delete /notifications/:id', function() {

  var badURI = '/notifications';
  var uri = '/notifications/';
  var count = 1;

  it('respond with status 404', function(done) {
    request.del(badURI)
      .expect(404, done);
  });

  it('respond with json', function(done) {
    request.del(uri + count++)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the number of Notifications deleted as 1', function(done) {
    request.del(uri + count++)
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('affectedRows')
        res.body.should.have.property('insertId')
        res.body.should.have.property('serverStatus')
        res.body.should.have.property('warningCount')
        res.body.should.have.property('message')
        res.body.should.have.property('protocol41')
        res.body.should.have.property('changedRows')
        res.body.affectedRows.should.match(/^-?[0-9]+$/)
        res.body.affectedRows.should.be.above(0)
        done();
      });
  });

  it('respond with the number of Notifications deleted as 0', function(done) {
    request.del(uri + 0)
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('affectedRows')
        res.body.should.have.property('insertId')
        res.body.should.have.property('serverStatus')
        res.body.should.have.property('warningCount')
        res.body.should.have.property('message')
        res.body.should.have.property('protocol41')
        res.body.should.have.property('changedRows')
        res.body.affectedRows.should.match(/^-?[0-9]+$/)
        res.body.affectedRows.should.equal(0)
        done();
      });
  });
});

describe('put /notifications/:id', function() {

  var badURI = '/notifications';
  var uri = '/notifications/3';
  var count = 1;

  it('respond with status 404', function(done) {
    request.put(badURI)
      .expect(404, done);
  });

  it('respond with json', function(done) {
    request.put(uri)
      .expect('Content-Type', /json/, done);
  });

  it('respond with the number of Notifications updated as 1', function(done) {
    request.put(uri)
      .send({
        Type: 'Other',
        ToUserID: 1
      })
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('affectedRows')
        res.body.should.have.property('insertId')
        res.body.should.have.property('serverStatus')
        res.body.should.have.property('warningCount')
        res.body.should.have.property('message')
        res.body.should.have.property('protocol41')
        res.body.should.have.property('changedRows')
        res.body.affectedRows.should.match(/^-?[0-9]+$/)
        res.body.affectedRows.should.be.above(0)
        done();
      });
  });
  it('respond with the number of Notifications updated as 0', function(done) {
    request.put(badURI + '/0')
      .send({
        ToUserID: 1
      })
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('affectedRows')
        res.body.should.have.property('insertId')
        res.body.should.have.property('serverStatus')
        res.body.should.have.property('warningCount')
        res.body.should.have.property('message')
        res.body.should.have.property('protocol41')
        res.body.should.have.property('changedRows')
        res.body.affectedRows.should.match(/^-?[0-9]+$/)
        res.body.affectedRows.should.equal(0)
        done();
      });
  });
  it('respond with an error message', function(done) {
    request.put(uri)
      .send({
        Type: '',
        ToUserID: 1
      })
      .end(function(error, res) {
        res.should.be.json
        res.body.should.be.instanceof(Array);
        res.body[0].should.have.property('param', 'Type')
        res.body[0].should.have.property('msg', 'Type must not be empty.')
        res.body[0].should.have.property('value', '')
        done();
      });
  });
});


describe('put /notifications/:id/seen', function() {

  var uri = '/notifications/';
  var count = 3;

  it('respond with json', function(done) {
    request.put(uri + (count++) + '/seen')
      .expect('Content-Type', /json/, done);
  });

  it('respond with the number of Notifications updated as 1', function(done) {
    request.put(uri + (count++) + '/seen')
      .send({
        ToUserID: 1
      })
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('affectedRows')
        res.body.should.have.property('insertId')
        res.body.should.have.property('serverStatus')
        res.body.should.have.property('warningCount')
        res.body.should.have.property('message')
        res.body.should.have.property('protocol41')
        res.body.should.have.property('changedRows')
        res.body.affectedRows.should.match(/^-?[0-9]+$/)
        res.body.affectedRows.should.be.above(0)
        done();
      });
  });
  it('respond with the number of Notifications updated as 0 for bad Notification ID', function(done) {
    request.put(uri + 0 + '/seen')
      .send({
        ToUserID: 1
      })
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('affectedRows')
        res.body.should.have.property('insertId')
        res.body.should.have.property('serverStatus')
        res.body.should.have.property('warningCount')
        res.body.should.have.property('message')
        res.body.should.have.property('protocol41')
        res.body.should.have.property('changedRows')
        res.body.affectedRows.should.match(/^-?[0-9]+$/)
        res.body.affectedRows.should.equal(0)
        done();
      });
  });
  it('respond with the number of Notifications updated as 0 for wrong ToUserID', function(done) {
    request.put(uri + (count++) + '/seen')
      .send({
        ToUserID: 0
      })
      .end(function(error, res) {
        res.should.be.json
        res.body.should.have.property('affectedRows')
        res.body.should.have.property('insertId')
        res.body.should.have.property('serverStatus')
        res.body.should.have.property('warningCount')
        res.body.should.have.property('message')
        res.body.should.have.property('protocol41')
        res.body.should.have.property('changedRows')
        res.body.affectedRows.should.match(/^-?[0-9]+$/)
        res.body.affectedRows.should.equal(0)
        done();
      });
  });
});