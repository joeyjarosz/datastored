var _ = require('lodash');

var datastored = require('..');

var baseOptions = {
  keyspace: 'keyspace',
  id: datastored.Integer,
  attributes: {
    foo: datastored.String({
      datastores: [1, 2]
    }),
    bar: datastored.String({
      datastores: [1, 2]
    }),
    guarded: datastored.String({
      datastores: [1, 2],
      guarded: true
    }),
    index: datastored.String({
      datastores: [1, 2],
      indexed: true
    })
  },
  scopes: {
    foo: ['foo']
  },
  transform: {
    input: function(data) {
      return replaceValues(data, 'input');
    },
    output: function(data) {
      return replaceValues(data, 'output');
    }
  }
};

function replaceValues(data, value) {
  return _.object(_.map(data, function(dataValue, key) {
    return [key, value];
  }));
}

function createModel(orm, baseOptions) {
  return function(name, options) {
    // `name` is optional
    if (_.isObject(name)) {
      options = name;
      // Name defaults to a unique id.
      name = _.uniqueId();
    }

    if (baseOptions) {
      options = _.merge({}, baseOptions, options);
    }

    return orm.createModel(name, options);
  }
}

function setupOrm() {
  // Create test orm.
  this.orm = datastored.createOrm();
  this.createModel = createModel(this.orm, baseOptions);
  this.createNewModel = createModel(this.orm);
}

function setupTestModels() {
  // Define test models.
  this.BasicModel = this.createModel({
    staticMethods: {func: function() {return this;}},
    methods: {func: function() {return this;}}
  });

  /*
  this.MethodModel = this.createModel({
    staticMethods: {foo: function() {return this;}},
    methods: {foo: function() {return this;}}
  });

  this.ErrorModel = this.createModel({
    properties: {foo: {type: 'string'}},
    callbacks: {
      beforeInput: function(values, cb) {cb({foo: 'message'});}
    }
  });

  var callbacks = {
    beforeInput: function(values, cb) {
      cb(null, appendValue(values, 'beforeInput'));
    },
    afterInput: function(values, cb) {
      cb(null, appendValue(values, 'afterInput'));
    },
    beforeOutput: function(values) {
      return appendValue(values, 'beforeOutput');
    },
    afterOutput: function(values) {
      return appendValue(values, 'afterOutput');
    }
  };
  var mixins = [{callbacks: callbacks}];

  this.CallbackModel = this.createModel({
    callbacks: callbacks, mixins: mixins
  });
  */
}

function reloadInstance(instance, scope, cb) {
  var model = instance.model.get(instance.getId());
  model.fetch(scope, function(err) {
    if (err) {return cb(err);}
    cb(null, model);
  });
}

module.exports = {
  createModel: createModel,
  baseOptions: baseOptions,
  setupOrm: setupOrm,
  setupTestModels: setupTestModels,
  reloadInstance: reloadInstance
};
