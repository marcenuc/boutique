/*global angular:false, document:false, window:false*/

(function () {
  'use strict';

  angular.directive('my:focus', function () {
    return function (element) {
      element[0].focus();
    };
  });

  angular.directive('my:grow', function () {
    return function (element) {
      var el = element[0];
      function resize() {
        //TODO DRY 25 is height of header in .fixed-table-container
        //FIXME document.documentElement.clientHeight is wrong in Chrome
        //TODO use $window and $document AngularJS services.
        var rect = el.getBoundingClientRect();
        el.style.height = (document.documentElement.clientHeight - rect.top - window.pageYOffset - 25) + "px";
      }
      window.onresize = resize;
      resize();
    };
  });
}());
