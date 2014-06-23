var _ = require('lodash');
var chai = require('chai');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var datastored = require('../..');
var ModelClass = require('../../lib/model').Model;

chai.should();
chai.use(sinonChai);

describe('Model', function() {

  var options = {
    table: 'models',
    schema: {
      id: {
        primary: true,
        type: 'string'
      }
    }
  };

  beforeEach(function() {
    this.orm = datastored.createOrm({
      redisClient: true,
      cassandraClient: true
    });
    this.redis = this.orm.datastores.redis;
    this.cassandra = this.orm.datastores.cassandra;
  });

  it('should set `methods` and `staticMethods`', function() {
    var Model = this.orm.createModel('Model', _.extend({}, options, {
      methods: {
        getInstanceThis: function() {return this;}
      },
      staticMethods: {
        getStaticThis: function() {return this;}
      }
    }));

    // Test static methods.
    Model.getStaticThis().should.deep.equal(Model);

    // Test instance methods.
    var model = Model.create({});
    model.getInstanceThis().should.deep.equal(model);
  });

  describe('constructor', function() {

    it('should fail when any required option is not defined', function() {
      var orm = this.orm;

      (function() {
        orm.createModel('Model', _.omit(options, ['table']));
      }).should.throw('`table` is not defined');

      (function() {
        orm.createModel('Model', _.omit(options, ['schema']));
      }).should.throw('`schema` is not defined');
    });

    it('should fail if a primary key attribute is not defined', function() {
      var orm = this.orm;

      (function() {
        orm.createModel('Model', _.extend({}, options, {
          schema: {}
        }));
      }).should.throw('a primary key attribute is required');
    });

    it('should fail if multiple primary key attributes are ' +
      'defined', function() {
      var orm = this.orm;

      (function() {
        orm.createModel('Model', {
          table: 'models',
          schema: {
            id1: {primary: true},
            id2: {primary: true}
          }
        });
      }).should.throw('only one primary key attribute can be defined per ' +
        'model');
    });

    it('should fail if an attribute is defined without a type', function() {
      var orm = this.orm;

      (function() {
        orm.createModel('Model', _.extend({}, options, {
          schema: {invalidAttribute: {}}
        }));
      }).should.throw('a primary key attribute is required');
    });
  });

  describe('#Model.create()', function() {

    beforeEach(function() {
      sinon.spy(ModelClass.prototype, 'set');
    });

    afterEach(function() {
      ModelClass.prototype.set.restore();
    });

    it('should initially set the attributes', function() {
      var model = this.orm.createModel('Model', options).create({id: 'foo'});
      model.set.should.have.been.called
    });
  });

  describe('#Model.get()', function() {

    it('should use the primary key attribute', function() {
      var model = this.orm.createModel('Model', options).get('foo');
      model.get('id').should.equal('foo');
    });
  });

  xdescribe('#Model.find()', function() {
    // this.createModel().find()
    it('should only allow indexed attributes in the query', function() {
      // try undefined, nonindex, and primary key attributes
    });

    it('should find a single model through the datastore', function() {
      // TODO: Check transform chain here.

      // similar to fetch
      // redis first if ()
      // [model options, attribute map] (orm options are already given at init)
      //   should give -> id or null
      // cassandra
      // err filter (have a function for this pattern and test the function)
      // Check that the pk is set. when datastore returns id, and calls back null
      // if no model was found.
      //
      // datastore access needs different strategies. Each strategy needs to be
      // tested.
    });
  });

  describe('#transform()', function() {

    it('should transform with chains in the right order', function(done) {
      var model = this.orm.createModel('Model', _.extend({}, options, {
        transforms: [{
          input: function(attributes, model) {
            attributes.foo += '1';
            return attributes;
          },
          output: function(attributes, model) {
            attributes.foo += '1';
            return attributes;
          },
          fetch: function(attributes, model) {
            attributes.foo += '1';
            return attributes;
          },
          save: function(attributes, model, cb) {
            attributes.foo += '1';
            cb(null, attributes);
          }
        }, {
          input: function(attributes, model) {
            attributes.foo += '2';
            return attributes;
          },
          output: function(attributes, model) {
            attributes.foo += '2';
            return attributes;
          },
          fetch: function(attributes, model) {
            attributes.foo += '2';
            return attributes;
          },
          save: function(attributes, model, cb) {
            attributes.foo += '2';
            cb(null, attributes);
          }
        }]
      })).create();

      model.transform({foo: '0'}, 'input').foo.should.equal('012');
      model.transform({foo: '0'}, 'output').foo.should.equal('021');
      model.transform({foo: '0'}, 'fetch').foo.should.equal('012');
      model.transform({foo: '0'}, 'save', function(err, attributes) {
        attributes.foo.should.equal('021');
        done();
      });
    });
  });

  describe('#set()', function() {

    it('should accept a single attribute', function() {
      var model = this.orm.createModel('Model', options).create();
      model.set('id', 'foo');
      model.get('id').should.equal('foo');
      // TODO: Check transform chain here.
    });

    it('should accept multiple attributes', function() {
      var modelOptions = _.merge({}, options, {schema: {
        foo: {type: 'string'}
      }});
      var model = this.orm.createModel('Model', modelOptions).create();

      model.set({id: 'foo', foo: 'bar'});
      model.get(['id', 'foo']).should.deep.equal({id: 'foo', foo: 'bar'});
      // TODO: Check transform chain here.
    });

    it('should omit attributes that are not defined in the ' +
      'schema', function() {
      var model = this.orm.createModel('Model', options).create();
      model.set({id: 'foo', invalid: 'bar'});
      // TODO: Check transform chain does not receive the undefined attr.
    });
  });

  describe('#get()', function() {

    it('should fail when getting an undefined attribute', function() {
      var orm = this.orm;

      (function() {
        orm.createModel('Model', options).create().get(['id', 'invalid'])
      }).should.throw('invalid attribute `invalid`');
    });
  });

  xdescribe('#show()', function() {

    it('should only return the attributes included in the scope', function() {

    });

    it('should use the output transform chain', function() {

    });
  });

  xdescribe('#save()', function() {

    it('should save changed attributes to both datastores', function() {

    });

    it('should save to cassandra before saving to redis', function() {

    });

    it('should only fail when saving to the cassandra datastore ' +
      'fails', function() {
      // Redis failure should not stop it.
    });

    // - caching
    // - relations
    // - permissions (mixin)
  });

  xdescribe('#fetch()', function() {

    it('should fail if the primary key attribute is not set', function() {

    });

    // scopes
    // fetch from cache if set
    // when to fail

    it('should fetch the model from', function() {

    });
  });

  describe.only('#destroy()', function() {

    function noop(pk, options, cb) {cb();}

    beforeEach(function() {
      sinon.stub(this.redis, 'destroy', noop);
      sinon.stub(this.cassandra, 'destroy', noop);
    });

    afterEach(function() {
      this.redis.destroy.restore();
      this.cassandra.destroy.restore();
    });

    xit('should destroy the model from both datastores', function(done) {
      var self = this;
      var model = this.orm.createModel('Model', _.extend({}, options, {
        cachedVariables: true
      })).get('foo');
      model.destroy(function() {
        var testOptions = {schema: {id: {
          primary: true, type: 'string'
        }}, table: 'models'};
        self.redis.destroy.should.have.been.calledWith(
          'foo', testOptions, sinon.match.func);
        self.cassandra.destroy.should.have.been.calledWith(
          'foo', testOptions, sinon.match.func);
        done();
      });
    });

    it('should not attempt to destroy from the redis datastore if all ' +
      'attributes are uncached', function() {
      var self = this;
      var model = this.orm.createModel('Model', options).get('foo');
      model.destroy(function() {
        self.redis.destroy.should.not.have.been.called;
        self.cassandra.destroy.should.have.been.called;
      });
    });

    it('should fail if destroying from any datastore fails', function(done) {
      var self = this;
      this.redis.destroy.restore();
      sinon.stub(this.redis, 'destroy', function(pk, options, cb) {
        cb('error');
      });
      var model = this.orm.createModel('Model', options).get('foo');
      model.destroy(function(err) {
        self.cassandra.destroy.should.not.have.been.called;
        err.should.equal('error');
        done();
      });
    });
  });
});
