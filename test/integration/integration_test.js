var async = require('async');

var testUtils = require('../utils');

describe('Orm', function() {

  before(function() {
    // Create test orm.
    this.orm = testUtils.createTestOrm();
    this.createModel = testUtils.createModel(this.orm, testUtils.baseOptions);
    this.createNewModel = testUtils.createModel(this.orm);
  });

  before(function() {
    // Define test models.
    this.BasicModel = this.createModel();

    this.ValidatedModel = this.createModel({properties: {
      foo: {type: 'string', rules: {min: 5}},
      bar: {type: 'string', required: true}
    }});
  });

  describe('Model', function() {

    beforeEach(function(cb) {
      this.orm._resetDatastores(cb);
    });

    describe('#save()', function() {

      // Saving without options

      before(function() {
        this.TypeModel = this.createNewModel({
          table: 'table',
          properties: {
            id: {type: 'string', primary: true},

            integer: {type: 'integer'},
            string: {type: 'string'},
            booleanTrue: {type: 'boolean'},
            booleanFalse: {type: 'boolean'},
            datetime: {type: 'datetime'},
            date: {type: 'date'},

            cached_integer: {type: 'integer', cache: true},
            cache_only_integer: {type: 'integer', cacheOnly: true}
          },
          scopes: {
            all: ['id', 'integer', 'string', 'booleanTrue', 'booleanFalse',
              'datetime', 'date', 'cached_integer', 'cache_only_integer']
          }
        });
      });

      it('should use default "orm.generateId"', function(done) {
        var self = this;
        var instance = this.BasicModel.create({foo: 'foo'});
        instance.save(function(err) {
          if (err) {return done(err);}
          instance.getId().should.eq('1');
          done();
        });
      });

      it('should save properties to datastores', function(done) {
        var self = this;
        var datetime = 1264982400000;
        var date = 1264982400000;

        var instance = this.TypeModel.create({
          integer: 123,
          string: 'foobar',
          booleanTrue: true,
          booleanFalse: false,
          datetime: new Date(datetime),
          date: new Date(date),
          cached_integer: 123,
          cache_only_integer: 123
        }, true);

        instance.save(function(err) {
          if (err) {return done(err);}
          var fetchedInstance = self.TypeModel.get(instance.getId());
          fetchedInstance.fetch('all', function(err) {
            if (err) {return done(err);}
            fetchedInstance.getId(true).should.exist;

            // Tests serialization.

            var data = fetchedInstance.toObject('all');
            data.integer.should.equal(123);
            data.string.should.equal('foobar');
            data.booleanTrue.should.equal(true);
            data.booleanFalse.should.equal(false);
            data.datetime.should.equal(datetime);
            data.date.should.equal('2010-02-01');
            data.cached_integer.should.equal(123);
            data.cache_only_integer.should.equal(123);

            var rawData = fetchedInstance.toObject('all', true);
            rawData.integer.should.equal(123);
            rawData.string.should.equal('foobar');
            rawData.booleanTrue.should.equal(true);
            rawData.booleanFalse.should.equal(false);
            rawData.datetime.getTime().should.equal(datetime);
            rawData.date.getTime().should.equal(date);
            rawData.cached_integer.should.equal(123);
            rawData.cache_only_integer.should.equal(123);

            done();
          });
        });
      });

      it('should validate data', function(done) {
        var instance = this.ValidatedModel.create({foo: 123});
        instance.save(function(err) {
          err.should.deep.eq({
            foo: 'attribute "foo" must have a minimum of 5 characters',
            bar: 'attribute "bar" is required'
          });
          done();
        });
      });

      it('should update values', function(done) {
        var ValidatedModel = this.ValidatedModel;

        async.waterfall([
          function(cb) {
            var instance = ValidatedModel.create({foo: 'foooo', bar: 'bar'});
            instance.save(function(err) {
              if (err) {return cb(err);}
              instance.set({bar: 'baz'});
              instance.save(function(err) {
                if (err) {return cb(err);}
                cb(null, instance.getId());
              });
            });
          },
          function(id, cb) {
            var instance = ValidatedModel.get(id);
            instance.fetch(['bar'], function(err) {
              if (err) {return cb(err);}
              instance.get('bar').should.eq('baz');
              cb();
            });
          }
        ], done);
      });

      // Saving with options

      it('should run callbacks', function(done) {
        var Model = this.createModel({
          callbacks: {
            beforeSave: function(options, data, cb) {
              options.should.eq('options');
              cb(null, options, data);
            },
            afterSave: function(options, data, cb) {
              options.should.eq('options');
              cb(null, options, data);
            }
          }
        });

        Model.create({foo: 'foo'}).save('options', done);
      });
    });

    describe('#incr()', function() {

      before(function() {
        this.CounterModel = this.createModel({
          properties: {
            integer_count: {type: 'integer', counter: true, cache: true},
            float_count: {type: 'float', counter: true, cache: true},
            rel_count: {type: 'integer', counter: true, cache: true}
          },
          scopes: {all: ['integer_count', 'float_count', 'rel_count']}
        });
      });

      it('should only increment counters', function() {
        var instance = this.BasicModel.create({foo: 'foo'});

        (function() {instance.incr('foo', 1);}).should.throw(
          'only counters can be incremented'
        );
        (function() {instance.decr('foo', 1);}).should.throw(
          'only counters can be decremented'
        );
      });

      it('should increment values', function(done) {
        var self = this;

        async.waterfall([
          function(cb) {
            var instance = self.CounterModel.create({rel_count: 2});
            instance.save(function(err) {
              if (err) {return cb(err);}

              instance.incr('integer_count', 10);
              instance.decr('integer_count', 5);
              instance.incr('rel_count', 10);
              instance.decr('rel_count', 5);
              instance.incr('float_count', 9.0);
              instance.decr('float_count', 1.2);
              instance.save(function(err) {
                if (err) {return cb(err);}
                cb(null, instance.getId());
              });
            });
          },
          function(id, cb) {
            var instance = self.CounterModel.get(id);
            instance.fetch('all', function(err) {
              if (err) {return cb(err);}
              instance.get([
                'integer_count', 'rel_count', 'float_count'
              ], true).should.deep.eq({
                integer_count: 5,
                rel_count: 7,
                float_count: 7.8
              });
              cb();
            })
          },
        ], done);
      });
    });

    xdescribe('#fetch()', function() {

      beforeEach(function(cb) {
        this.orm._resetDatastores(cb);
      });

      it('should fail if model errors exist', function(done) {
        var model = this.ErrorModel.get('foo', true);
        model.set('foo', 'bar');
        model.fetch(function(err) {
          err.should.deep.eq({foo: 'message'});
          done();
        });
      });

      it('should fail if the model\'s primary key property is not set',
        function() {
        var model = this.Model.create({foo: 'bar'});

        (function() {
          model.fetch('scope', function(err) {});
        }).should.throw('the model primary key "id" must be set');
      });

      xit('should fail when the model is not found', function(done) {

      });

      xit('should fail with callback errors', function() {
        // make function and use for .save()
      });

      xit('should execute all callbacks', function(done) {
        // check scope parameter
        // check user and options
        var Model = orm.createModel({callbacks: {
          beforeFetch: function(options, attributes, cb) {
            options.should.eq('options');
            attributes.should.eq(['attribute']);
            cb(options);
          },
          afterFetch: function(options, values, cb) {
            options.should.eq('options');
            values.should.eq('values');
            cb(options);
          }
        }});

        Model.create({}).save(function(err) {
          if (err) {throw err;}
          model.fetch(done);
          model.fetch('options', done);
          model.fetch([attributes], 'options', done);
        });
      });

      it('should use scopes', function() {
        // name or array
      });

      it('should overwrite local changes', function() {

      });
    });

    xdescribe('#find()', function() {

      xit('should mutate the index value by default', function(done) {
        Model.create({indexed: 'foo'}).save(cb);
        Model.find('indexed', 'foo', function(err, instance) {
          instance.getId(true).should.eq('foo');
          done();
        });

        // check found model id
      });

      xit('should not mutate the index value if requested', function(done) {
        Model.create({indexed: 'foo'}, true).save(cb);
        Model.find('indexed', 'foo', true, function(err, instance) {
          instance.getId(true).should.eq('foo');
          done();
        });

        // check found model id
      });

      it('should only work with indexed properties', function(done) {
        (function() {
          Model.find({nonindex: 'foo'}, function() {});
        }).should.throw('attribute "nonindex" is not an index');
      });

      it('should callback with null if nothing is found', function(done) {
        Model.find('indexed', 'bar', function(err, instance) {
          instance.should.be.null;
          done();
        });
      });
    });

    xdescribe('#destroy()', function() {

      beforeEach(function(cb) {
        this.orm._resetDatastores(cb);
      });

      it('should fail if model errors exist', function(done) {
        var model = this.ErrorModel.get('foo', true);
        model.set('foo', 'bar');
        model.destroy(function(err) {
          err.should.deep.eq({foo: 'message'});
          done();
        });
      });

      it('should fail if the model\'s primary key property is not set',
        function() {
        var model = this.Model.create();

        (function() {
          model.destroy(function() {});
        }).should.throw('the model primary key "id" must be set');
      });

      xit('should delete the model', function() {
        // - test the model is actually destroyed (create -> destroy -> fetch)
      });

      xit('should fail with callback errors', function() {

      });

      xit('should execute all callbacks', function(done) {
        /*
          - test beforeDestroy w/ mixin order (maybe change a value)
          - test destroy fails when beforeSave fails
          - test afterDestroy w/ mixin order
          - test destroy fails when afterSave fails
         */
        // check user and options
        var Model = orm.createModel({callbacks: {
          beforeDestroy: function(options, cb) {
            options.should.eq('options');
            cb(null, options);
          },
          afterDestroy: function(options, cb) {
            options.should.eq('options');
            cb(null, options);
          }
        }});

        Model.create({}).save(function(err) {
          if (err) {throw err;}
          model.destroy(done);
          model.destroy('options', done);
        });
      });
    });

    describe('indexing', function() {
      /*
      - test replace (test that refs are deleted)
      - test no replace (test that refs are kept)
      - test destroy removes both types of indexes.
      - test that changing an attribute will also update an index
       */
    });
  });
});
