var _ = require('lodash');
var async = require('async');

var utils = require('./utils');
var marshallers = require('./marshallers');

var Core = {
  input: function(data, applyUserTransforms) {
    var self = this;
    return _.reduce(data, function(result, value, name) {
      var attribute = self._getAttribute(name);
      if (!(applyUserTransforms && (attribute.guarded || attribute.virtual))) {
        result[name] = value;
      }
      return result;
    }, {});
  },
  output: function(data, options, applyUserTransforms) {
    var self = this;
    return _.reduce(data, function(result, value, name) {
      var attribute = self._getAttribute(name);
      if (!(applyUserTransforms && attribute.hidden)) {
        result[name] = value;
      }
      return result;
    }, {});
  },
  save: function(data, cb) {
    // Only check for required variables on initial save.
    if (!this.saved) {
      var attributes = this.model._attributes;
      var invalid = _.find(this.model._attributeNames, function(name) {
        var attribute = attributes[name];
        return (attribute.required && _.isUndefined(data[name]))
      });
      if (invalid) {
        var err = {};
        err[invalid] = 'attribute "' + invalid + '" is required'
        return cb(err);
      }
    }
    cb(null, data);
  }
};

var marshaller = marshallers.JSONMarshaller;

var Serialize = {
  input: function(data, applyUserTransforms) {
    if (applyUserTransforms) {
      var result = marshallers.unserializeData(marshaller,
        this.model._attributeTypes, data);
      // Store errors that should be thrown.
      this._errors = result.errors;
      data = result.data;
    }
    return data;
  },
  output: function(data, options, applyUserTransforms) {
    if (applyUserTransforms) {
      data = marshallers
        .serializeData(marshaller, this.model._attributeTypes, data);
    }
    return data;
  },
  save: function(data, cb) {
    // Fail if there were errors when unserializing.
    cb(this._errors, data);
  }
}

var AttributeTransforms = {
  input: function(data, applyUserTransforms) {
    var self = this;
    return _.mapValues(data, function(value, name) {
      var attribute = self._getAttribute(name);
      if (attribute.input) {
        value = attribute.input.call(self, value, applyUserTransforms);
      }
      return value;
    });
  },
  output: function(data, options, applyUserTransforms) {
    var self = this;
    return _.mapValues(data, function(value, name) {
      var attribute = self._getAttribute(name);
      if (attribute.output) {
        value = attribute.output.call(self, value, options,
          applyUserTransforms);
      }
      return value;
    });
  },
  outputAsync: function(data, options, applyUserTransforms, cb) {
    var self = this;
    utils.mapValues(data, function(value, name, cb) {
      var attribute = self._getAttribute(name);
      if (attribute.outputAsync) {
        attribute.outputAsync.call(self, data[name], options,
          applyUserTransforms, cb);
      } else {
        cb(null, value);
      }
    }, cb);
  },
  fetch: function(data, cb) {
    var self = this;
    utils.mapValues(data, function(value, name, cb) {
      var attribute = self._getAttribute(name);
      if (attribute.fetch) {
        attribute.fetch.call(self, data[name], cb);
      } else {
        cb(null, value);
      }
    }, cb);
  },
  save: function(data, cb) {
    var self = this;
    utils.mapValues(data, function(value, name, cb) {
      var attribute = self._getAttribute(name);
      if (attribute.save) {
        attribute.save.call(self, data[name], cb);
      } else {
        cb(null, value);
      }
    }, cb);
  }
};

module.exports = {
  Core: Core,
  Serialize: Serialize,
  AttributeTransforms: AttributeTransforms
};