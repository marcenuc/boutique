/*global define:false*/
define(['vm', 'fs'], function(vm, fs) {
  'use strict';
  var $provideMock = {
    value: function(name, value) {
      config[name] = value;
    },
    factory: function() {
      // NOOP
    }
  };

  var config = {}, context = {
    angular: {
      module: function (name, deps, conf) {
        var configFn = conf[conf.length - 1];
        configFn($provideMock);
        return config;
      }
    }
  };

  return vm.runInNewContext(fs.readFileSync('app/js/validators.js'), context).validateDocUpdate;
});
