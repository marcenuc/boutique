/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, jasmine:false, spyOn:false*/
describe('Controller', function () {
  'use strict';
  var AZIENDE = Object.freeze({ '010101': { value: '010101 Negozio1' }, '020202': { value: '020202_Magazzino Esterno 2' } }),
    LISTINI = Object.freeze({
      '1': { _id: 'Listino_1', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3  }, prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } },
      '010101': { _id: 'Listino_010101', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3  }, prezzi: {}, versioneBase: '1' }
    });

  function getDocument(id) {
    var doc = { _id: id };
    switch (id) {
    case 'TaglieScalarini':
      doc.taglie = [null, { '37': '37', '38': '38' }, { 'SM': '66' }, { 'TU': '01' }];
      doc.descrizioniTaglie = [null, { '37': '37', '38': '38' }, { '66': 'SM' }, { '01': 'TU' }];
      doc.listeDescrizioni = [null, ['37', '38'], ['SM'], ['TU']];
      doc.colonneTaglie = [null, { '37': 0, '38': 1 }, { '66': 0 }, { '01': 0 }];
      break;
    case 'ModelliEScalarini':
      doc.lista = { '11260456': ['SMOKING INS/RASO', 2] };
      break;
    case 'MovimentoMagazzino_010101_2012_A_1':
      doc.columnNames = ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'];
      doc.rows = [['112604565000500066', 2, 'SM', 'SMOKING INS/RASO', 100, 2]];
      break;
    }
    return doc;
  }

  beforeEach(module('app.services', 'app.shared', 'app.validators', 'app.controllers', function ($provide) {
    $provide.value('couchdb', { db: 'db', designDoc: 'ddoc' });
    var Downloads = jasmine.createSpyObj('Downloads', ['prepare']),
      SessionInfo = jasmine.createSpyObj('SessionInfo', ['resetFlash', 'aziende', 'listini', 'prossimoNumero', 'save', 'getDocument', 'error', 'notice']),
      $location = jasmine.createSpyObj('$location', ['path']);
    $provide.value('Downloads', Downloads);
    $provide.value('SessionInfo', SessionInfo);
    $provide.value('$location', $location);

    SessionInfo.aziende.andReturn(AZIENDE);
    SessionInfo.listini.andReturn(LISTINI);
    SessionInfo.getDocument.andCallFake(getDocument);
  }));

  afterEach(inject(function (SessionInfo) {
    expect(SessionInfo.resetFlash).toHaveBeenCalledWith();
  }));

  describe('NewMovimentoMagazzino', function () {
    it('should initialize $scope', inject(function ($controller, controllers, SessionInfo, $location, codici) {
      var form, $scope = {}, causale = codici.findCausaleMovimentoMagazzino('VENDITA');
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      // ensure $scope is properly initialized
      $controller(controllers.NewMovimentoMagazzino, $scope);
      expect($scope.aziende).toBe(AZIENDE);
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);
      form = $scope.form;
      // ensure default data is today
      expect(form.data).toBe('20111231');

      // compile the form
      form.magazzino1 = '010101';
      form.magazzino2 = '020202';
      form.causale1 = causale;

      $scope.create();
      // ensure we asked for next number
      expect(SessionInfo.prossimoNumero).toHaveBeenCalled();
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[0]).toBe('010101');
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[1]).toBe('2011');
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[2]).toBe('A');
      // ensure callaback of prossimoNumero() does save(doc)
      SessionInfo.prossimoNumero.mostRecentCall.args[3](1);
      expect(SessionInfo.save).toHaveBeenCalled();
      expect(SessionInfo.save.mostRecentCall.args[0]).toEqual({
        _id: 'MovimentoMagazzino_010101_2011_A_1',
        columnNames: codici.COLUMN_NAMES.MovimentoMagazzino,
        data: '20111231',
        causale1: ['VENDITA', -1],
        magazzino2: '020202',
        esterno2: 1,
        causale2: ['ACQUISTO', 1],
        rows: []
      });
      // ensure callback of save() redirects to the saved id.
      SessionInfo.save.mostRecentCall.args[1]({ id: 'fakeid' });
      expect($location.path).toHaveBeenCalledWith('fakeid');
    }));
  });

  describe('EditMovimentoMagazzino', function () {
    beforeEach(module(function ($provide) {
      $provide.value('$routeParams', { codice: '010101_2012_A_1' });
    }));

    it('should initialize $scope', inject(function ($controller, controllers, SessionInfo, $routeParams, Downloads, codici) {
      var saveCb, $scope = {}, id = 'MovimentoMagazzino_' + $routeParams.codice,
        label = {
          descrizione: 'SMOKING INS/RASO',
          barcode: '112604565000500066',
          stagione: '112',
          modello: '60456',
          articolo: '5000',
          colore: '5000',
          taglia: '66',
          descrizioneTaglia: 'SM',
          prezzo1: '3,00',
          prezzo2: '2,00',
          offerta: '*'
        };
      // ensure $scope is properly initialized
      $controller(controllers.EditMovimentoMagazzino, $scope);
      expect($scope.rexpBarcode.toString()).toBe('/^\\d{3} ?\\d{5} ?\\d{4} ?\\d{4} ?\\d{2}$/');
      //TODO test what happens if $routeParams.codice is not valid.
      expect($scope.codes).toEqual({ magazzino1: '010101', anno: '2012', gruppo: 'A', numero: 1 });
      expect($scope.model).toEqual(getDocument(id));
      expect($scope.col).toEqual(codici.colNamesToColIndexes(codici.COLUMN_NAMES.MovimentoMagazzino));
      expect($scope.newQta).toBe(1);

      $scope.prepareDownloads();
      expect(Downloads.prepare).toHaveBeenCalledWith([label, label], id);

      // compile form
      $scope.newBarcode = '112604565000800066';
      $scope.newQta = 3;

      $scope.save();
      expect(SessionInfo.error).not.toHaveBeenCalled();
      expect(SessionInfo.save).toHaveBeenCalled();
      expect(SessionInfo.save.mostRecentCall.args[0]).toBe($scope.model);
      saveCb = SessionInfo.save.mostRecentCall.args[1];
      // ensure form was reset
      expect($scope.newBarcode).toBe('');
      expect($scope.newQta).toBe(1);
      // ensure doc was updated
      expect($scope.model.rows).toEqual([
        ['112604565000500066', 2, 'SM', 'SMOKING INS/RASO', 100, 2],
        ['112604565000800066', 2, 'SM', 'SMOKING INS/RASO', 0, 3]
      ]);
      saveCb({ rev: 'arev', id: $scope.model._id });
      // ensure _rev is updated
      expect($scope.model._rev).toBe('arev');
      // ensure a notice is displayed
      expect(SessionInfo.notice).toHaveBeenCalledWith('Salvato ' + $scope.model._id);

      expect($scope.qtaTotale()).toBe(5);

      expect($scope.nomeAzienda('010101')).toBe('010101 Negozio1');
    }));
  });
  //FIXME test all other controllers.
});
