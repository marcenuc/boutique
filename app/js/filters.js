/*global angular: false, CODICI: false */

(function () {
  'use strict';

  angular.filter('linkById', function (input) {
    //TODO rexp cut & pasted from validate_doc_update: DRY
    var ids = input.match(/^([A-Z][a-zA-Z0-9]+)(?:_([0-9A-Z_]+))?$/);
    return angular.element('<a href="#/' + input + '">' + ids[2] + '</a>');
  });

  angular.formatter('codiceAzienda', {
    // TODO DRY usare CODICI.
    parse: function (value) {
      return 'Azienda_' + value;
    },
    format: function (value) {
      return value.slice(8);
    }
  });

  angular.formatter('money', {
    parse: function (value) {
      return CODICI.parseMoney(value.replace(',', '.'))[1];
    },
    format: function (value) {
      return String(value / 100).replace('.', ',');
    }
  });
}());
