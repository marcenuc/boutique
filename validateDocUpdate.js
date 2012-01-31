/*global define:false*/
define(function (require) {
  'use strict';
  /*jslint unparam:true*/
  var angular = {},
    config = {},
    $provideMock = {
      value: function (name, value) {
        config[name] = value;
      },
      factory: function () {
        // NOOP
      }
    };

  // Mock angular.module() implementation.
  angular.module = function (name, deps, conf) {
    var configFn = conf[conf.length - 1];
    configFn($provideMock);
    return config;
  };
  /*jslint unparam:false*/

  /*jslint evil:true*/
  return eval(require('fs').readFileSync('app/js/validators.js', 'utf8')).validateDocUpdate;
});
