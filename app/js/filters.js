/*global angular: false, CODICI: false */

(function () {
  'use strict';

  angular.filter('linkById', function (input) {
    var typeAndCode = CODICI.typeAndCodeFromId(input);
    if (typeAndCode && typeAndCode[2]) {
      return angular.element('<a href="#/' + input + '">' + typeAndCode[2] + '</a>');
    }
    return '--';
  });

  angular.filter('linkListino', function (input) {
    var typeAndCode = CODICI.typeAndCodeFromId(input);
    if (typeAndCode && typeAndCode[2]) {
      return angular.element('<a href="#/' + CODICI.idListino(typeAndCode[2]) + '">Listino</a>');
    }
    return '--';
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
      this.$viewValue = CODICI.formatMoney(this.$modelValue);
    };
  });
}());
