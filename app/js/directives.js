/*global angular:false*/
angular.module('app.directives', [], ['$compileProvider', '$filterProvider', function($compileProvider, $filterProvider) {
  'use strict';

  var $injector = angular.injector(['app.shared']),
    codici = $injector.get('codici');

  function formatBarcodeAs400(barcode) {
    var codes = codici.parseBarcodeAs400(barcode);
    return !codes ? barcode : [codes.stagione, codes.modello, codes.articolo, codes.colore, codes.taglia].join(' ');
  }

  $filterProvider.register('money', function() {
    return codici.formatMoney;
  });

  $filterProvider.register('barcodeAs400', function() {
    return formatBarcodeAs400;
  });

  $compileProvider.directive('bqBarcodeAs400', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$formatters.push(formatBarcodeAs400);

        ctrl.$parsers.unshift(function(viewValue) {
          var cleanedValue = viewValue && viewValue.replace(/\s/g, ''),
            isValid = cleanedValue === '' || codici.isBarcodeAs400(cleanedValue);
          ctrl.$setValidity('barcodeAs400', isValid);
          if (isValid) return cleanedValue;
        });
      }
    };
  });

  $compileProvider.directive('bqCodiceAzienda', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$formatters.push(function(modelValue) {
          var parsedId = codici.parseIdAzienda(modelValue);
          if (parsedId) return parsedId.codice;
        });
        ctrl.$parsers.push(function(viewValue) {
          var id = codici.idAzienda(viewValue),
            isValid = !!id;
          ctrl.$setValidity('codiceAzienda', isValid);
          if (isValid) return id;
        });
      }
    };
  });

  $compileProvider.directive('bqIdFoto', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$formatters.push(function(modelValue) {
          var codice = codici.parseIdFoto(modelValue);
          if (codice) return codice;
        });
        ctrl.$parsers.push(function(viewValue) {
          var parsedVal = viewValue && viewValue.replace(/ +/g, '_'),
            isValid = parsedVal.length > 0;
          ctrl.$setValidity('codiceAzienda', isValid);
          if (isValid) return 'Foto_' + parsedVal;
        });
      }
    };
  });

  $compileProvider.directive('bqMoney', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$formatters.push(function(modelValue) {
          var euro = codici.formatMoney(modelValue);
          if (euro) return euro;
        });
        ctrl.$parsers.push(function(viewValue) {
          var cents = codici.parseMoney(viewValue),
            isValid = typeof cents === 'number';
          ctrl.$setValidity('money', isValid);
          if (isValid) return cents;
        });
      }
    };
  });

  $compileProvider.directive('bqIncompleteSmact', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$formatters.push(function(modelValue) {
          var euro = codici.formatMoney(modelValue);
          if (euro) return euro;
        });
        ctrl.$parsers.push(function(viewValue) {
          //TODO DRY find a better solution
          function pad(str, len) {
            return str + new Array(len + 1 - str.length).join('1');
          }
          var cleanedValue = viewValue && viewValue.replace(/\s/g, ''),
            isValid = codici.isBarcodeAs400(pad(cleanedValue, 18));
          ctrl.$setValidity('smact', isValid);
          if (isValid) return cleanedValue;
        });
      }
    };
  });

  $compileProvider.directive('bqData', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$parsers.push(function(viewValue) {
          var cleanedValue = viewValue && viewValue.replace(/\s/g, ''),
            isValid = codici.isYyyyMmDdDate(cleanedValue);
          ctrl.$setValidity('data', isValid);
          if (isValid) return cleanedValue;
        });
      }
    };
  });

  $compileProvider.directive('bqVersioneListino', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attr, ctrl) {
        ctrl.$parsers.push(function(viewValue) {
          var isValid = typeof codici.idListino(viewValue) === 'string';
          ctrl.$setValidity('versioneListino', isValid);
          if (isValid) return viewValue;
        });
      }
    };
  });
}]);
