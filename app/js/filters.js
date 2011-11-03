/*global angular: false, CODICI: false */

(function () {
  'use strict';

  angular.filter('linkById', function (input) {
    //TODO rexp cut & pasted from validate_doc_update: DRY
    var ids = input.match(/^([A-Z][a-zA-Z0-9]+)(?:_([0-9A-Z_]+))?$/);
    return angular.element('<a href="#/' + input + '">' + ids[2] + '</a>');
  });

  angular.inputType('codiceAzienda', function () {
    // TODO DRY usare CODICI.
    this.$parseView = function () {
      this.$modelValue = 'Azienda_' + this.$viewValue;
    };
    this.$parseModel = function () {
      var v = this.$modelValue;
      this.$viewValue = typeof v === 'undefined' ? '' : v.slice(8);
    };
  });

  angular.inputType('money', function () {
    this.$parseView = function () {
      this.$modelValue = CODICI.parseMoney(this.$viewValue.replace(',', '.'))[1];
    };
    this.$parseModel = function () {
      var v = this.$modelValue;
      this.$viewValue = typeof v === 'undefined' ? '' : String(v / 100).replace('.', ',');
    };
  });
}());
