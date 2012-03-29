/*global angular:false, Ctrl:false*/
angular.module('app',
  ['app.directives', 'app.services', 'app.widgets', 'app.validators', 'app.shared', 'app.config', 'app.controllers'],
  ['$routeProvider', function($routeProvider) {
    'use strict';
    $routeProvider.when('/Azienda_:codice', { template: 'partials/azienda.html', controller: 'Azienda' });
    $routeProvider.when('/Azienda', { template: 'partials/azienda.html', controller: 'Azienda' });
    $routeProvider.when('/BollaAs400_:codice', { template: 'partials/ricerca-bolla-as400.html', controller: 'RicercaBollaAs400' });
    $routeProvider.when('/BollaAs400', { template: 'partials/ricerca-bolla-as400.html', controller: 'RicercaBollaAs400' });
    $routeProvider.when('/ricerca-giacenza', { template: 'partials/ricerca-giacenza.html', controller: 'RicercaArticoli' });
    $routeProvider.when('/MovimentoMagazzino', { template: 'partials/movimento-magazzino.html', controller: 'MovimentoMagazzino' });
    $routeProvider.when('/MovimentoMagazzino_', { template: 'partials/new-movimento-magazzino.html', controller: 'NewMovimentoMagazzino' });
    $routeProvider.when('/MovimentoMagazzino_:codice', { template: 'partials/edit-movimento-magazzino.html', controller: 'EditMovimentoMagazzino' });
    $routeProvider.when('/Listino', { template: 'partials/listino.html', controller: 'Listino' });
    $routeProvider.when('/Listino_:codice', { template: 'partials/edit-listino.html', controller: 'Listino' });
    $routeProvider.when('/Foto:id', { template: 'partials/foto.html', controller: 'Foto' });
    $routeProvider.otherwise({ redirectTo: '/' });
  }])
  .run(['$window', '$rootScope', function($window, $rootScope) {
    'use strict';
    $rootScope.$on('$afterRouteChange', function() {
      $window.scrollTo(0, 0);
    });
  }]);
