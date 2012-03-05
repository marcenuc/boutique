/*global angular:false*/
angular.module('app.widgets', [], ['$compileProvider', function ($compileProvider) {
  'use strict';

  $compileProvider.directive('myFocus', function () {
    return function (scope, element) {
      element[0].focus();
    };
  });

  $compileProvider.directive('myGrow', ['$document', '$window', function ($document, $window) {
    return function (scope, element) {
      var el = element[0];
      function resize() {
        var rect = el.getBoundingClientRect();
        //TODO DRY 25 is height of header in .fixed-table-container
        el.style.height = ($document[0].documentElement.clientHeight - rect.top - $window.pageYOffset - 25) + 'px';
      }
      $window.onresize = resize;
      resize();
    };
  }]);

  $compileProvider.directive('myLinkById', ['codici', function (codici) {
    return function (scope, element) {
      var id = scope.row.id,
        typeAndCode = codici.typeAndCodeFromId(id);
      if (typeAndCode && typeAndCode[2]) {
        element.attr('href', '#/' + id);
        element.text(typeAndCode[2]);
      } else {
        element.text(id);
      }
    };
  }]);

  $compileProvider.directive('myLinkListino', ['codici', function (codici) {
    return function (scope, element) {
      var id = scope.row.id,
        typeAndCode = codici.typeAndCodeFromId(id);
      if (typeAndCode && typeAndCode[2]) {
        element.attr('href', '#/' + codici.idListino(typeAndCode[2]));
        element.text('Listino');
      } else {
        element.text('###');
      }
    };
  }]);
}]);
