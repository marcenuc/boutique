/*global angular:false*/
angular.module('app.filters', [], ['$filterProvider', function ($filterProvider) {
  'use strict';

  var $injector = angular.injector(['app.shared']),
    codici = $injector.get('codici');

  function formatBarcodeAs400(barcode) {
    var codes = codici.parseBarcodeAs400(barcode);
    return !codes ? barcode : [codes.stagione, codes.modello, codes.articolo, codes.colore, codes.taglia].join(' ');
  }

  $filterProvider.register('barcodeAs400', function () {
    return formatBarcodeAs400;
  });

  $filterProvider.register('money', function () {
    return codici.formatMoney;
  });

  angular.inputType('barcodeAs400', function (element, widget) {
    widget.$parseView = function () {
      this.$modelValue = this.$viewValue.split(' ').join('');
    };
    widget.$parseModel = function () {
      this.$viewValue = formatBarcodeAs400(this.$modelValue);
    };
    widget.$on('$validate', function () {
      var value = widget.$viewValue;
      // TODO use codici
      widget.$emit(!value || /^\d{3}\s*\d{5}\s*\d{4}\s*\d{4}\s*\d{2}$/.test(value) ? '$valid' : '$invalid', 'BARCODE');
    });
  });

  angular.inputType('incompleteSmact', function (element, widget) {
    var rexp = /^\d(\d(\d ?(\d(\d(\d(\d(\d ?(\d(\d(\d(\d ?(\d(\d(\d(\d ?(\d\d?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?)?$/;
    widget.$parseView = function () {
      this.$modelValue = this.$viewValue.replace(' ', '', 'g');
    };
    widget.$parseModel = function () {
      this.$viewValue = this.$modelValue;
    };
    widget.$on('$validate', function () {
      var value = widget.$viewValue;
      // TODO use codici
      widget.$emit(!value || rexp.test(value) ? '$valid' : '$invalid', 'BARCODE');
    });
  });

  angular.inputType('codiceAzienda', function (element, widget) {
    widget.$parseView = function () {
      this.$modelValue = codici.idAzienda(this.$viewValue);
    };
    widget.$parseModel = function () {
      var v = this.$modelValue;
      // TODO DRY usare codici.
      this.$viewValue = typeof v === 'undefined' ? '' : v.slice(8);
    };
    widget.$on('$validate', function () {
      var value = widget.$viewValue;
      widget.$emit(!value || codici.isCodiceAzienda(value) ? '$valid' : '$invalid', 'CODICE_AZIENDA');
    });
  });

  angular.inputType('money', function (element, widget) {
    widget.$parseView = function () {
      this.$modelValue = codici.parseMoney(this.$viewValue.replace(',', '.'))[1];
    };
    widget.$parseModel = function () {
      this.$viewValue = codici.formatMoney(this.$modelValue);
    };
    widget.$on('$validate', function () {
      var value = widget.$viewValue;
      // TODO DRY usare codici.
      widget.$emit(!value || /^[0-9]+(?:,[0-9]{1,2})?$/.test(value) ? '$valid' : '$invalid', 'MONEY');
    });
  });

  angular.inputType('data', function (element, widget) {
    widget.$on('$validate', function () {
      var value = widget.$viewValue;
      widget.$emit(!value || codici.isYyyyMmDdDate(value) ? '$valid' : '$invalid', 'DATA');
    });
  });

  angular.inputType('versioneListino', function (element, widget) {
    widget.$on('$validate', function () {
      var value = widget.$viewValue;
      widget.$emit(!value || codici.isCodiceAzienda(value) || /^\d$/.test(value) ? '$valid' : '$invalid', 'VERSIONE_LISTINO');
    });
  });
}]);
