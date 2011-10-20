/*global angular: false */

(function () {
  'use strict';

  angular.directive('my:focus', function () {
    return function (element) {
      element[0].focus();
    };
  });
}());
