/*global angular:false*/
var HeaderCtrl;
angular.module('app', ['app.filters', 'app.services', 'app.widgets', 'app.validators', 'app.shared', 'app.config', 'app.controllers']).run(['$route', '$window', '$rootScope', 'controllers', function ($route, $window, $rootScope, controllers) {
  'use strict';
  //TODO declared here to make it visible in index.html
  HeaderCtrl = controllers.Header;
  $route.when('/Azienda_:codice', { template: 'partials/azienda.html', controller: controllers.Azienda });
  $route.when('/Azienda', { template: 'partials/azienda.html', controller: controllers.Azienda });
  $route.when('/BollaAs400_:codice', { template: 'partials/ricerca-bolla-as400.html', controller: controllers.RicercaBollaAs400 });
  $route.when('/BollaAs400', { template: 'partials/ricerca-bolla-as400.html', controller: controllers.RicercaBollaAs400 });
  $route.when('/ricerca-giacenza', { template: 'partials/ricerca-giacenza.html', controller: controllers.RicercaArticoli });
  $route.when('/MovimentoMagazzino', { template: 'partials/movimento-magazzino.html', controller: controllers.MovimentoMagazzino });
  $route.when('/MovimentoMagazzino_', { template: 'partials/new-movimento-magazzino.html', controller: controllers.NewMovimentoMagazzino });
  $route.when('/MovimentoMagazzino_:codice', { template: 'partials/edit-movimento-magazzino.html', controller: controllers.EditMovimentoMagazzino });
  $route.when('/Listino', { template: 'partials/listino.html', controller: controllers.Listino });
  $route.when('/Listino_:codice', { template: 'partials/edit-listino.html', controller: controllers.Listino });
  $route.otherwise({ redirectTo: '/' });

  $rootScope.$on('$afterRouteChange', function () {
    $window.scrollTo(0, 0);
  });
}]);
