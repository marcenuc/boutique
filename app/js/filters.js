/*global angular: false */

angular.filter('linkById', function (input) {
  'use strict';
  var ids = input.match(/^([a-z]+)_([0-9_]+)$/);
  return angular.element('<a href="#/' + ids[1] + '/' + ids[2] + '">' + ids[2] + '</a>');
});