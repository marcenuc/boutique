/*global angular: false, CODICI: false*/

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

  function formatBarcodeAs400(barcode) {
    var codes = CODICI.parseBarcodeAs400(barcode);
    return !codes ? barcode : [codes.stagione, codes.modello, codes.articolo, codes.colore, codes.taglia].join(' ');
  }

  angular.filter('barcodeAs400', formatBarcodeAs400);

  angular.inputType('barcodeAs400', function () {
    this.$parseView = function () {
      this.$modelValue = this.$viewValue.split(' ').join('');
    };
    this.$parseModel = function () {
      this.$viewValue = formatBarcodeAs400(this.$modelValue);
    };
    this.$on('$validate', function (event) {
      var widget = event.currentScope, value = widget.$viewValue;
      // TODO use CODICI
      widget.$emit(!value || /^\d{3}\s*\d{5}\s*\d{4}\s*\d{4}\s*\d{2}$/.test(value) ? '$valid' : '$invalid', 'BARCODE');
    });
  });

  angular.inputType('codiceAzienda', function () {
    this.$parseView = function () {
      this.$modelValue = CODICI.idAzienda(this.$viewValue);
    };
    this.$parseModel = function () {
      var v = this.$modelValue;
      // TODO DRY usare CODICI.
      this.$viewValue = typeof v === 'undefined' ? '' : v.slice(8);
    };
    this.$on('$validate', function (event) {
      var widget = event.currentScope, value = widget.$viewValue;
      widget.$emit(!value || CODICI.isCodiceAzienda(value) ? '$valid' : '$invalid', 'CODICE_AZIENDA');
    });
  });

  angular.inputType('money', function () {
    this.$parseView = function () {
      this.$modelValue = CODICI.parseMoney(this.$viewValue.replace(',', '.'))[1];
    };
    this.$parseModel = function () {
      this.$viewValue = CODICI.formatMoney(this.$modelValue);
    };
    this.$on('$validate', function (event) {
      var widget = event.currentScope, value = widget.$viewValue;
      // TODO DRY usare CODICI.
      widget.$emit(!value || /^[0-9]+(?:,[0-9]{1,2})?$/.test(value) ? '$valid' : '$invalid', 'MONEY');
    });
  });

  angular.inputType('data', function () {
    this.$on('$validate', function (event) {
      var widget = event.currentScope, value = widget.$viewValue;
      widget.$emit(!value || CODICI.isYyyyMmDdDate(value) ? '$valid' : '$invalid', 'DATA');
    });
  });

  angular.inputType('versioneListino', function () {
    this.$on('$validate', function (event) {
      var widget = event.currentScope, value = widget.$viewValue;
      widget.$emit(!value || CODICI.isCodiceAzienda(value) || /^\d$/.test(value) ? '$valid' : '$invalid', 'VERSIONE_LISTINO');
    });
  });
}());