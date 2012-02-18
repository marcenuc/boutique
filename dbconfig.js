/*global define:false*/
define(function (require) {
  'use strict';
  var angular = {};

  /*jslint unparam:true*/
  // Mock angular.module() implementation.
  angular.module = function () {
    return {
      factory: function (name, factory) {
        return factory();
      }
    };
  };
  /*jslint unparam:false*/

  /*jslint evil:true*/
  return eval(require('fs').readFileSync('app/js/config.js', 'utf8'));
});
