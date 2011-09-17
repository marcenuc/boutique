/*global beforeEach: false, angular: false */
beforeEach(function () {
  'use strict';
  this.addMatchers({
    toEqualData: function (expected) {
      return angular.equals(this.actual, expected);
    }
  });
});
