/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, jasmine:false, spyOn:false*/
describe('Controller', function () {
  'use strict';
  beforeEach(module('app.services', 'app.shared', 'app.validators', 'app.controllers', function ($provide) {
    $provide.value('couchdb', { db: 'db', designDoc: 'ddoc' });
    var Downloads = jasmine.createSpyObj('Downloads', ['stampa']),
      SessionInfo = jasmine.createSpyObj('SessionInfo', ['resetFlash', 'aziende', 'prossimoNumero', 'save']),
      $location = jasmine.createSpyObj('$location', ['path']);
    $provide.value('Downloads', Downloads);
    $provide.value('SessionInfo', SessionInfo);
    $provide.value('$location', $location);
  }));

  afterEach(inject(function (SessionInfo) {
    expect(SessionInfo.resetFlash).toHaveBeenCalledWith();
  }));

  describe('NewMovimentoMagazzino', function () {

    it('should resetFlash and initialize $scope', inject(function ($controller, controllers, SessionInfo, codici) {
      var form,
        $scope = {},
        causale = codici.findCausaleMovimentoMagazzino('VENDITA'),
        aziende = { '010101': { value: '010101 Negozio1' }, '020202': { value: '020202_Magazzino Esterno 2' } };
      SessionInfo.aziende.andReturn(aziende);
      $controller(controllers.NewMovimentoMagazzino, $scope);
      expect($scope.aziende).toBe(aziende);
      expect(SessionInfo.aziende).toHaveBeenCalledWith();
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);
      form = $scope.form;
      expect(form.data).toBe(codici.newYyyyMmDdDate());
      form.magazzino1 = '010101';
      form.magazzino2 = '020202';
      form.causale1 = causale;
      $scope.create();
      expect(SessionInfo.prossimoNumero).toHaveBeenCalled();
      //TODO: expect(SessionInfo.save).toHaveBeenCalledWith(...);
      //TODO: expect($location.path).toHaveBeenCalledWith('MovimentoMagazzino_010101_...');
    }));
  });
  //FIXME test all other controllers.
});
