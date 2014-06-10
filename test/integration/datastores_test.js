var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');
var redis = require('redis');
var helenus = require('helenus');

var databases = require('./databases');
var datastores = require('../../lib/datastores');

var expect = chai.expect;

chai.should();
chai.use(sinonChai);


var modelOptions = {
  attributes: {
    primary_key: {type: 'string'},
    integer: {type: 'integer'},
    string: {type: 'string'},
    booleanTrue: {type: 'boolean'},
    booleanFalse: {type: 'boolean'},
    datetime: {type: 'datetime'},
    date: {type: 'date'}
  },
  table: 'family',
  pkAttribute: 'primary_key',
  indexes: ['integer']
};

describe('RedisDatastore', function() {

  before(function() {
    this.rds = new datastores.RedisDatastore({
      redis: databases.redis,
      keyspace: 'test'
    });
  });

  it('persists to redis', function(done) {
    // Fetching with a primary key value that does not exist.
    // this.rds.fetch('modelType', 'id', 1234)
    var rds = this.rds;

    var datetime = new Date(2010, 1, 2, 3, 4, 5, 6);
    var date = new Date(2010, 1, 1);
    var attributes = ['integer', 'string', 'booleanTrue', 'booleanFalse',
      'datetime', 'date'];

    rds.save(modelOptions, {
      primary_key: 'key',
      integer: 1234,
      string: 'string',
      booleanTrue: true,
      booleanFalse: false,
      datetime: datetime,
      date: date
    }, function() {
      rds.fetch(modelOptions, 'key', attributes, function(err, result) {
        result.integer.should.equal(1234);
        result.string.should.equal('string');
        result.booleanTrue.should.be.true
        result.booleanFalse.should.be.false
        result.datetime.getTime().should.equal(datetime.getTime());
        result.date.getTime().should.equal(date.getTime());
        databases.redis.exists('test:family:key', function(err, exists) {
          exists.should.equal(1);
          done();
        });
      });
    });
  });
});

describe('CassandraDatastore', function() {

  before(function() {
    this.cds = new datastores.CassandraDatastore({
      cassandra: databases.cassandra
    });
  });

  after(function(done) {
    // Clear the testing table.
    databases.cassandraRun('TRUNCATE family;', done);
  });

  it('persists to cassandra', function(done) {
    var cds = this.cds;

    var datetime = new Date(2010, 1, 2, 3, 4, 5, 6);
    var date = new Date(2010, 1, 1);
    var attributes = ['integer', 'string', 'booleanTrue', 'booleanFalse',
      'datetime', 'date'];

    cds.save(modelOptions, {
      primary_key: 'key',
      integer: 1234,
      string: 'string',
      booleanTrue: true,
      booleanFalse: false,
      datetime: datetime,
      date: date
    }, function(err) {
      if (err) { throw err; }
      cds.fetch(modelOptions, 'key', attributes, function(err, result) {
        result.integer.should.equal(1234);
        result.string.should.equal('string');
        result.booleanTrue.should.be.true
        result.booleanFalse.should.be.false
        result.datetime.getTime().should.equal(datetime.getTime());
        result.date.getTime().should.equal(date.getTime());
        done();
      });
    });
  });
});
