/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, jasmine:false, spyOn:false*/
describe('Controller', function () {
  'use strict';
  var AZIENDE = Object.freeze({
    '010101': {
      value: '010101 Negozio1',
      key: '010101',
      doc: { _id: 'Azienda_010101', nome: 'Negozio1', tipo: 'NEGOZIO', comune: 'Tricase', provincia: 'LE', nazione: 'IT' }
    },
    '020202': {
      value: '020202_Magazzino2',
      key: '020202',
      doc: { _id: 'Azienda_020202', nome: 'Magazzino2', tipo: 'MAGAZZINO', comune: 'Bari', provincia: 'BA', nazione: 'IT' }
    },
    '030303': {
      value: '030303 Negozio3',
      key: '030303',
      doc: { _id: 'Azienda_030303', nome: 'Negozio3', tipo: 'NEGOZIO', comune: 'Madrid', nazione: 'ES' }
    }
  }),
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
      doc.lista = { '11260456': ['SMOKING', 2] };
      break;
    case 'MovimentoMagazzino_010101_2012_A_1':
      doc.columnNames = ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'];
      doc.rows = [['112604565000500066', 2, 'SM', 'SMOKING', 100, 2]];
      doc.magazzino2 = '020202';
      break;
    case 'CausaliAs400':
      doc['2'] = { '73': ['C/VENDITA', -1] };
      break;
    case 'Giacenze':
      doc.rows = [['112', '60456', '5000', '5000', '010101', 0, 3, { '66': 3 }]];
      break;
    }
    return doc;
  }

  function getPromise($q, doc) {
    var deferred = $q.defer();
    deferred.resolve(doc);
    return deferred.promise;
  }

  beforeEach(module('app.services', 'app.shared', 'app.validators', 'app.controllers', function ($provide) {
    $provide.value('couchdb', { db: 'db', designDoc: 'ddoc' });
    var session = jasmine.createSpyObj('session', ['success']),
      Doc = jasmine.createSpyObj('Doc', ['find']),
      Azienda = jasmine.createSpyObj('Azienda', ['all', 'nome']),
      Listino = jasmine.createSpyObj('Listino', ['all']),
      listini = jasmine.createSpyObj('listini', ['success']),
      Downloads = jasmine.createSpyObj('Downloads', ['prepare']),
      SessionInfo = jasmine.createSpyObj('SessionInfo',
        ['resetFlash', 'aziende', 'listini', 'prossimoNumero', 'save', 'getResource', 'getDocument', 'error', 'notice', 'movimentoMagazzinoPendente', 'startLoading', 'doneLoading']),
      $location = jasmine.createSpyObj('$location', ['path']);
    $provide.value('Doc', Doc);
    $provide.value('Azienda', Azienda);
    $provide.value('Listino', Listino);
    $provide.value('Downloads', Downloads);
    $provide.value('SessionInfo', SessionInfo);
    $provide.value('$location', $location);
    $provide.value('session', session);

    Listino.all.andReturn(listini);
    SessionInfo.aziende.andReturn(AZIENDE);
    SessionInfo.listini.andReturn(LISTINI);
    SessionInfo.getDocument.andCallFake(getDocument);
  }));

  afterEach(inject(function (SessionInfo) {
    expect(SessionInfo.resetFlash).toHaveBeenCalledWith();
  }));

  describe('Header', function () {
    it('should initialize $scope', inject(function ($rootScope, $controller, controllers, session, SessionInfo) {
      var $scope = $rootScope;
      // FAKE CALL for afterEach: this is the only exception...
      SessionInfo.resetFlash();
      // ensure $scope is properly initialized
      $controller(controllers.Header, $scope);
      // it should put SessionInfo in $scope
      expect($scope.SessionInfo).toBe(SessionInfo);
      // it should put session in $scope
      expect($scope.session).toBe(session);
    }));
  });

  describe('NewMovimentoMagazzino', function () {
    it('should initialize $scope', inject(function ($q, $rootScope, $controller, controllers, SessionInfo, $location, codici, Azienda) {
      var form, $scope = $rootScope, aziende = getPromise($q, AZIENDE), causale = codici.findCausaleMovimentoMagazzino('VENDITA');
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      Azienda.all.andReturn(aziende);
      // ensure $scope is properly initialized
      $controller(controllers.NewMovimentoMagazzino, $scope);
      // it should put aziende in $scope
      expect($scope.aziende).toBe(aziende);
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);

      form = $scope.form;
      // it should set today as default date in form
      expect(form.data).toBe('20111231');

      // compile the form
      form.magazzino1 = '010101';
      form.magazzino2 = '020202';
      form.causale1 = causale;

      $scope.create();
      $scope.$digest();
      // it should lookup prossimoNumero
      expect(SessionInfo.prossimoNumero).toHaveBeenCalled();
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[0]).toBe('010101');
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[1]).toBe('2011');
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[2]).toBe('A');
      // it should save document built with form's data
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
      // it should redirect to saved document _id on success
      SessionInfo.save.mostRecentCall.args[1]({ id: 'fakeid' });
      expect($location.path).toHaveBeenCalledWith('fakeid');
    }));
  });

  describe('EditMovimentoMagazzino', function () {
    beforeEach(module(function ($provide) {
      $provide.value('$routeParams', { codice: '010101_2012_A_1' });
    }));

    it('should initialize $scope', inject(function ($controller, controllers, SessionInfo, $routeParams, Downloads, codici, Azienda, Listino, Doc) {
      var saveCb, $scope = {}, listini = Listino.all(),
        id = 'MovimentoMagazzino_' + $routeParams.codice,
        label = {
          descrizione: 'SMOKING',
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
        },
        find = {
          TaglieScalarini: jasmine.createSpyObj('findTaglieScalarini', ['success']),
          ModelliEScalarini: jasmine.createSpyObj('findModelliEScalarini', ['success'])
        };
      find[id] = jasmine.createSpyObj('find', ['success']);
      Doc.find.andCallFake(function (docId) {
        return find[docId];
      });
      Azienda.nome.andReturn('PIPPO');
      // ensure $scope is properly initialized
      $controller(controllers.EditMovimentoMagazzino, $scope);
      // it should put barcode pattern in $scope
      expect($scope.rexpBarcode.toString()).toBe('/^\\d{3} ?\\d{5} ?\\d{4} ?\\d{4} ?\\d{2}$/');
      // it should parse $routeParams.codice
      //TODO test what happens if $routeParams.codice is not valid.
      expect($scope.codes).toEqual({ magazzino1: '010101', anno: '2012', gruppo: 'A', numero: 1 });
      // it should put column indexes in $scope
      expect($scope.col).toEqual(codici.colNamesToColIndexes(codici.COLUMN_NAMES.MovimentoMagazzino));
      // it should default qta for new row to 1
      expect($scope.newQta).toBe(1);

      // it should put nomeMagazzino1 in $scope
      expect(Azienda.nome).toHaveBeenCalledWith('010101');
      expect($scope.nomeMagazzino1).toBe('PIPPO');

      expect(Doc.find).toHaveBeenCalledWith(id);
      expect(find[id].success).toHaveBeenCalled();
      expect($scope.model).toBeUndefined();
      find[id].success.mostRecentCall.args[0](getDocument(id));
      // it should put doc requested by $routeParams.codice in $scope.model
      expect($scope.model).toEqual(getDocument(id));
      // it should put nomeMagazzino2 in $scope
      expect(Azienda.nome).toHaveBeenCalledWith('020202');
      expect($scope.nomeMagazzino2).toBe('PIPPO');

      $scope.prepareDownloads();
      // it should prepare download with correct labels and doc._id as filename.
      expect(listini.success).toHaveBeenCalled();
      listini.success.mostRecentCall.args[0](LISTINI);
      expect(Downloads.prepare).toHaveBeenCalledWith([label, label], id);

      // compile form
      $scope.newBarcode = '112604565000800066';
      $scope.newQta = 3;

      $scope.save();
      // it shouldn't show errors
      expect(SessionInfo.error).not.toHaveBeenCalled();
      // it should fetch TaglieScalarini
      expect(find.TaglieScalarini.success).toHaveBeenCalled();
      find.TaglieScalarini.success.mostRecentCall.args[0](getDocument('TaglieScalarini'));
      // it should fetch ModelliEScalarini
      expect(find.ModelliEScalarini.success).toHaveBeenCalled();
      find.ModelliEScalarini.success.mostRecentCall.args[0](getDocument('ModelliEScalarini'));
      // it should save the document in $scope.model
      expect(SessionInfo.save).toHaveBeenCalled();
      expect(SessionInfo.save.mostRecentCall.args[0]).toBe($scope.model);
      saveCb = SessionInfo.save.mostRecentCall.args[1];
      // it should reset form to default values
      expect($scope.newBarcode).toBe('');
      expect($scope.newQta).toBe(1);
      // it should append row with form's data to model.rows
      expect($scope.model.rows).toEqual([
        ['112604565000500066', 2, 'SM', 'SMOKING', 100, 2],
        ['112604565000800066', 2, 'SM', 'SMOKING', 0, 3]
      ]);
      saveCb({ rev: 'arev', id: $scope.model._id });
      // it should update $scope.model._rev with saved rev
      expect($scope.model._rev).toBe('arev');
      // it should display a notice
      expect(SessionInfo.notice).toHaveBeenCalledWith('Salvato ' + $scope.model._id);

      // it should sum qta from each row
      expect($scope.qtaTotale()).toBe(5);
    }));
  });

  describe('MovimentoMagazzino', function () {
    it('should initialize $scope', inject(function ($q, $rootScope, $controller, controllers, SessionInfo, $location, codici, Azienda) {
      var form, $scope = $rootScope, aziende = getPromise($q, AZIENDE), pendenti = { rows: [] };

      Azienda.all.andReturn(aziende);
      SessionInfo.movimentoMagazzinoPendente.andReturn(pendenti);
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      // ensure $scope is properly initialized
      $controller(controllers.MovimentoMagazzino, $scope);
      // it should put movimenti pendenti in $scope.pendenti
      expect($scope.pendenti).toBe(pendenti);
      // it should put aziende in $scope
      expect($scope.aziende).toBe(aziende);
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);
      form = $scope.form;
      // it should set current year as default value in $scope.form
      expect(form.anno).toBe('2011');

      // fill the form
      form.magazzino1 = '010101';
      form.causale1 = codici.findCausaleMovimentoMagazzino('VENDITA');
      form.numero = 1;

      $scope.find();
      // it should redirect to selected MovimentoMagazzino
      expect($location.path).toHaveBeenCalledWith('MovimentoMagazzino_010101_2011_A_1');

      // it should promise Azienda.nome
      expect($scope.nomeAzienda).toBe(Azienda.nome);
    }));
  });

  describe('RicercaBollaAs400', function () {
    beforeEach(module(function ($provide) {
      var CdbView = jasmine.createSpyObj('CdbView', ['riferimentoMovimentoMagazzino']),
        As400 = jasmine.createSpyObj('As400', ['bolla']);
      $provide.value('CdbView', CdbView);
      $provide.value('As400', As400);
    }));

    it('should initialize $scope', inject(function ($controller, controllers, As400, SessionInfo, CdbView, $location, codici) {
      var intestazione, dati, riferimento, $scope = {};
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      // ensure $scope is properly initialized
      $controller(controllers.RicercaBollaAs400, $scope);
      // it should put aziende in $scope
      expect($scope.aziende).toBe(AZIENDE);
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);

      // fill form
      intestazione = $scope.intestazione = {
        data: '20111231',
        numero: 10,
        enteNumerazione: 'A',
        codiceNumerazione: '20'
      };

      $scope.fetch();
      // it should build id from form's data
      expect($scope.id).toBe('BollaAs400_20111231_10_A_20');

      // it should check if BollaAs400 was already loaded
      expect(CdbView.riferimentoMovimentoMagazzino).toHaveBeenCalled();
      expect(CdbView.riferimentoMovimentoMagazzino.mostRecentCall.args[0]).toBe('BollaAs400_20111231_10_A_20');

      riferimento = CdbView.riferimentoMovimentoMagazzino.mostRecentCall.args[1];

      // when riferimentoMovimentoMagazzino is found
      riferimento({ rows: [{ id: 'MovimentoMagazzino_010101_2011_A_1' }] });
      // it should send notice to the user
      expect(SessionInfo.notice).toHaveBeenCalledWith('Bolla già caricata su Boutique');
      // it should redirect to found MovimentoMagazzino keeping notice
      expect(SessionInfo.keepFlash).toBe(true);
      expect($location.path).toHaveBeenCalledWith('MovimentoMagazzino_010101_2011_A_1');

      // when riferimentoMovimentoMagazzino not found
      riferimento({ rows: [] });
      // it should query as400 for with form's data
      expect(As400.bolla).toHaveBeenCalled();
      expect(As400.bolla.mostRecentCall.args[0]).toBe(intestazione);

      // when bolla is found on as400
      dati = {
        columnNames: ['codiceCliente', 'tipoMagazzino', 'causale', 'codiceMagazzino', 'scalarino', 'stagione', 'modello', 'articolo', 'colore', 'qta1', 'qta2', 'qta3', 'qta4', 'qta5', 'qta6', 'qta7', 'qta8', 'qta9', 'qta10', 'qta11', 'qta12'],
        rows: [['010101', '2', '73', 'K', '2', '112', '60456', '5000', '5000', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']]
      };
      As400.bolla.mostRecentCall.args[1](dati);
      // it should put bolla in $scope
      expect($scope.bollaAs400).toBe(dati);
      // it should fill form MovimentoMagazzino with data from BollaAs400
      expect($scope.movimentoMagazzino).toEqual({
        magazzino1: '010101',
        causale1: codici.findCausaleMovimentoMagazzino('C/VENDITA'),
        data: '20111231'
      });

      // fill form
      $scope.movimentoMagazzino.magazzino2 = '020202';

      $scope.save();
      // it should lookup prossimoNumero
      expect(SessionInfo.prossimoNumero).toHaveBeenCalled();
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[0]).toBe('010101');
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[1]).toBe('2011');
      expect(SessionInfo.prossimoNumero.mostRecentCall.args[2]).toBe('A');
      // it should save document built with form's data
      SessionInfo.prossimoNumero.mostRecentCall.args[3](1);
      expect(SessionInfo.save).toHaveBeenCalled();
      expect(SessionInfo.save.mostRecentCall.args[0]).toEqual({
        _id: 'MovimentoMagazzino_010101_2011_A_1',
        riferimento: 'BollaAs400_20111231_10_A_20',
        columnNames: codici.COLUMN_NAMES.MovimentoMagazzino,
        data: '20111231',
        causale1: ['C/VENDITA', -1],
        magazzino2: '020202',
        esterno2: 1,
        causale2: ['C/ACQUISTO', 1],
        rows: [['112604565000500066', 2, 'SM', 'SMOKING', 0, 1]]
      });
      // it should redirect to saved document _id on success
      SessionInfo.save.mostRecentCall.args[1]({ id: 'fakeid' });
      expect($location.path).toHaveBeenCalledWith('fakeid');
    }));
  });

  describe('RicercaArticoli', function () {
    it('should default to current user\'s azienda if it exists', inject(function ($controller, controllers, Azienda, session) {
      var $scope = {}, aziende = Azienda.all();
      $controller(controllers.RicercaArticoli, $scope);
      expect(session.success).toHaveBeenCalled();
      expect(typeof session.success.mostRecentCall.args[0]).toBe('function');
      session.success.mostRecentCall.args[0]({ userCtx: { name: '010101' } });
      expect(aziende.success).toHaveBeenCalled();
      expect($scope.aziende).toBeUndefined();
      expect($scope.aziendeSelezionate).toEqual([]);
      $scope.$watch = jasmine.createSpy();
      aziende.success.mostRecentCall.args[0](AZIENDE);
      expect($scope.$watch).toHaveBeenCalled();
      expect($scope.$watch.mostRecentCall.args[0]).toBe('quickSearch');
      expect(typeof $scope.$watch.mostRecentCall.args[1]).toBe('function');
      $scope.$watch.mostRecentCall.args[1]();
      // it should put aziende in $scope
      expect($scope.aziende).toBe(AZIENDE);
      expect($scope.aziendeSelezionate).toEqual(['010101']);
    }));

    it('should initialize $scope', inject(function ($controller, controllers, SessionInfo, Downloads, codici, Azienda, session) {
      var form, $scope = {}, aziende = Azienda.all();
      // ensure $scope is properly initialized
      $controller(controllers.RicercaArticoli, $scope);
      session.success.mostRecentCall.args[0]({ userCtx: { name: 'boutique' } });
      $scope.$watch = jasmine.createSpy();
      aziende.success.mostRecentCall.args[0](AZIENDE);
      expect($scope.$watch).toHaveBeenCalled();
      expect($scope.$watch.mostRecentCall.args[0]).toBe('quickSearch');
      expect(typeof $scope.$watch.mostRecentCall.args[1]).toBe('function');
      $scope.$watch.mostRecentCall.args[1]();
      // it should show 'foto' by default
      expect($scope.photoType).toBe('foto');
      // it should put aziende in $scope
      expect($scope.aziende).toBe(AZIENDE);
      // it should default to current user's azienda or none
      expect($scope.aziendeSelezionate).toEqual(['010101', '020202', '030303']);
      // it should put tipiAzienda in $scope
      expect($scope.tipiAzienda).toEqual(['MAGAZZINO', 'NEGOZIO']);
      // it should put comuni in $scope
      expect($scope.comuni).toEqual(['Bari', 'Madrid', 'Tricase']);
      // it should put province in $scope
      expect($scope.province).toEqual(['BA', 'LE']);
      // it should put nazioni in $scope
      expect($scope.nazioni).toEqual(['ES', 'IT']);
      // it should default to no results
      expect($scope.filtrate).toEqual([]);
      // it should default limiteRisultati to 50
      expect($scope.limiteRisultati).toEqual(50);

      // when no row is displayed
      $scope.showPhoto(0);
      // it should not show any photo
      expect($scope.photo).toBeUndefined();
      expect($scope.isSelectedRow(0)).toBe('');
      // when a row is displayed
      $scope.filtrate = [['010101', 'SMOKING', '112', '60456', '5000', '5000']];
      $scope.showPhoto(0);
      // it should show foto for first row
      expect($scope.photo).toEqual({
        descrizione: 'SMOKING',
        stagione: '112',
        modello: '60456',
        articolo: '5000',
        colore: '5000',
        img: ['../foto/1126045650005000.jpg', 'spinner.gif'],
        show: [true, false]
      });
      expect($scope.isSelectedRow(0)).toBe('selected');

      $scope.hidePhoto();
      // it should remove photo from $scope
      expect($scope.photo).toBeUndefined();

      $scope.showPhoto(0);
      $scope.prevPhoto();
      // it should swap photo
      expect($scope.photo).toEqual({
        descrizione: 'SMOKING',
        stagione: '112',
        modello: '60456',
        articolo: '5000',
        colore: '5000',
        img: ['spinner.gif', '../foto/1126045650005000.jpg'],
        show: [false, true]
      });
      $scope.nextPhoto();
      // it should swap photo
      expect($scope.photo).toEqual({
        descrizione: 'SMOKING',
        stagione: '112',
        modello: '60456',
        articolo: '5000',
        colore: '5000',
        img: ['../foto/1126045650005000.jpg', 'spinner.gif'],
        show: [true, false]
      });
      $scope.hidePhoto();

      // when no filter is given
      $scope.filtraGiacenza();
      // it should find up to limiteRisultati rows
      expect($scope.filtrate).toEqual([
        ['010101 Negozio1', 'SMOKING', '112', '60456', '5000', '5000', 3, 'PRONTO', 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, '1', '2*']
      ]);
      // it should put first scalarino in $scope
      expect($scope.scalarino).toBe(2);
      // it should put first descrizioniTaglie in $scope
      expect($scope.taglie).toEqual(['SM', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--']);
      // it should put totaliColonna in $scope
      expect($scope.totaliColonna).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3]);
    }));
  });

  //FIXME test all other controllers.
});
