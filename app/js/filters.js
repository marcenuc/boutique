/*global angular: false */

(function () {
  'use strict';

  angular.filter('linkById', function (input) {
    var ids = input.match(/^([a-z]+)_([0-9_]+)$/);
    return angular.element('<a href="#/' + ids[1] + '/' + ids[2] + '">' + ids[2] + '</a>');
  });

  angular.formatter('codiceAzienda', {
    parse: function (value) {
      return 'azienda_' + value;
    },
    format: function (value) {
      return value.slice(8);
    }
  });
}());
