/*global define:false*/
define(function (require) {
  'use strict';
  var angular = {};

  // Mock angular.module() implementation.
  /*jslint unparam:true*/
  angular.module = function () {
    return {
      factory: function (name, getter) {
        return getter();
      }
    };
  };
  /*jslint unparam:false*/

  /*jslint evil:true*/
  return eval(require('fs').readFileSync('app/js/codici.js', 'utf8'));
});
