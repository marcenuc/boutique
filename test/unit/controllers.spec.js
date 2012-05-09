/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, jasmine:false, spyOn:false*/
describe('Controller', function() {
  'use strict';

  function get(id) {
    switch (id) {
    case 'TaglieScalarini':
      return { _id: 'TaglieScalarini',
        taglie: [null, { '37': '37', '38': '38' }, { 'SM': '66' }, { 'TU': '01' }],
        descrizioniTaglie: [null, { '37': '37', '38': '38' }, { '66': 'SM' }, { '01': 'TU' }],
        listeDescrizioni: [null, ['37', '38'], ['SM'], ['TU']],
        colonneTaglie: [null, { '37': 0, '38': 1 }, { '66': 0 }, { '01': 0 }]
      };
    case 'ModelliEScalarini':
      return { _id: 'ModelliEScalarini',
        lista: { '11260456': ['SMOKING', 2], '12598021': ['SCARPA CLASSICA FIBBIA', 4], '12540021': ['CAMICIA CLASSICA', 1] }
      };
    case 'MovimentoMagazzino_010101_2012_A_1':
      return { _id: 'MovimentoMagazzino_010101_2012_A_1',
        columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'],
        rows: [['112604565000500066', 2, 'SM', 'SMOKING', 100, 2]],
        magazzino2: '020202'
      };
    case 'CausaliAs400':
      return { _id: 'CausaliAs400',
        '2': { '73': ['C/VENDITA', -1] }
      };
    case 'Giacenze':
      return { _id: 'Giacenze',
        rows: [['112', '60456', '5000', '5000', '010101', 0, 3, { '66': 3 }]]
      };
    case 'Azienda_010101':
      return { _id: 'Azienda_010101', nome: 'Negozio1', tipo: 'NEGOZIO', comune: 'Tricase', provincia: 'LE', nazione: 'IT' };
    case 'Azienda_020202':
      return { _id: 'Azienda_020202', nome: 'Magazzino2', tipo: 'MAGAZZINO', comune: 'Bari', provincia: 'BA', nazione: 'IT' };
    case 'VIEW_AZIENDE':
      return { rows: [
        {
          value: '010101 Negozio1',
          key: '010101',
          doc: { _id: 'Azienda_010101', nome: 'Negozio1', tipo: 'NEGOZIO', comune: 'Tricase', provincia: 'LE', nazione: 'IT' }
        },
        {
          value: '020202_Magazzino2',
          key: '020202',
          doc: { _id: 'Azienda_020202', nome: 'Magazzino2', tipo: 'MAGAZZINO', comune: 'Bari', provincia: 'BA', nazione: 'IT' }
        },
        {
          value: '030303 Negozio3',
          key: '030303',
          doc: { _id: 'Azienda_030303', nome: 'Negozio3', tipo: 'NEGOZIO', comune: 'Madrid', nazione: 'ES' }
        }
      ] };
    case 'Listino_1':
      return { _id: 'Listino_1', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3  }, prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } };
    case 'VIEW_LISTINI':
      return { rows: [
        { key: '1', id: 'Listino_1', value: null, doc: { _id: 'Listino_1', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } } },
        { key: '010101', id: 'Listino_010101', value: null, doc: { _id: 'Listino_010101', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' } }
      ] };
    case 'Foto_1_0_1':
      return { _id: 'Foto_1_0_1', articoli: [
        { stagione: '125', modello: '98021', articolo: '1881', colore: '8000' },
        { stagione: '125', modello: '40021', articolo: '2109', colore: '5500' }
      ] };
    default:
      throw new Error('Unknown doc');
    }
  }

  beforeEach(module('app.config', 'app.services', 'app.shared', 'app.validators', 'app.controllers', function($provide) {
    function doSpy(name, methods) { $provide.value(name, jasmine.createSpyObj(name, methods)); }
    doSpy('MovimentoMagazzino', ['pendenti', 'build', 'findByRiferimento', 'search']);
    doSpy('Downloads', ['prepare']);
    doSpy('SessionInfo', ['setFlash', 'resetFlash', 'error', 'notice', 'startLoading', 'doneLoading', 'goTo']);
    doSpy('$location', ['path']);
  }));

  var $scope, $controller, MovimentoMagazzino, Downloads, SessionInfo, $location, $httpBackend, couchdb;
  beforeEach(inject(function($rootScope, _$controller_, _MovimentoMagazzino_, _Downloads_, _SessionInfo_, _$location_, _$httpBackend_, _couchdb_) {
    $scope = $rootScope;
    $controller = _$controller_;
    MovimentoMagazzino = _MovimentoMagazzino_;
    Downloads = _Downloads_;
    SessionInfo = _SessionInfo_;
    $location = _$location_;
    $httpBackend = _$httpBackend_;
    couchdb = _couchdb_;
  }));

  afterEach(function() {
    expect(SessionInfo.resetFlash).toHaveBeenCalledWith();
  });

  var views = ['aziende', 'listini'];
  var resps = { 404: { error: 'not_found', reason: 'missing' } };
  function expectGET(id, status, response) {
    var path;
    if (views.indexOf(id) >= 0) {
      path = couchdb.viewPath(id + '?include_docs=true');
      id = 'VIEW_' + id.toUpperCase();
    } else {
      path = couchdb.docPath(id);
    }
    var xpct = $httpBackend.expectGET(path);
    if (status) {
      xpct.respond(status, response || resps[status] || '');
    } else {
      xpct.respond(JSON.stringify(get(id)));
    }
  }

  function expectSession(username) {
    var u = username || '010101';
    $httpBackend.expectGET('../_session').respond({ userCtx: { name: u } });
  }

  describe('Header', function() {
    beforeEach(expectSession);

    it('should initialize $scope', inject(function(session) {
      // FAKE CALL for afterEach: this is the only exception...
      SessionInfo.resetFlash();
      // ensure $scope is properly initialized
      $controller('Header', { '$scope': $scope });
      // it should put SessionInfo in $scope
      expect($scope.SessionInfo).toBe(SessionInfo);
      // it should put session in $scope
      expect($scope.session).toBe(session);
    }));
  });

  describe('NewMovimentoMagazzino', function() {
    it('should initialize $scope', inject(function($q, codici) {
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      expectSession();
      expectGET('aziende');
      // describe $scope initialization
      $controller('NewMovimentoMagazzino', { '$scope': $scope });
      // it should put aziende in $scope
      expect(typeof $scope.aziende.then).toBe('function');
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);

      var form = $scope.form;
      // it should default form.data to today
      expect(form.data).toBe('20111231');

      // it should set magazzino1 and causale with _session data
      expect(form.magazzino1).toBeUndefined();
      expect(form.causale1).toBeUndefined();
      $httpBackend.flush();
      // it should default magazzino1 to user's magazzino
      expect(form.magazzino1).toBe('010101');
      // it should default causale1 to "VENDITA A CLIENTI" if user's name is codice azienda
      // TODO it should default causale1 to "VENDITA A CLIENTI" if user has *role* azienda
      expect(form.causale1).toEqual({ descrizione: 'VENDITA A CLIENTI', segno: -1, gruppo: 'C' });

      // describe fill form
      form.magazzino1 = '010101';
      form.magazzino2 = '020202';
      form.causale1 = codici.findCausaleMovimentoMagazzino('VENDITA');

      // describe create
      $scope.create();

      var newMM = { _id: 'MovimentoMagazzino_010101_2012_A_1' };
      // TODO is this needed?
      function promiseFor(doc) {
        var deferred = $q.defer();
        deferred.resolve(doc);
        return deferred.promise;
      }
      MovimentoMagazzino.build.andReturn(promiseFor(newMM));
      // it should save created doc
      $httpBackend.expectPUT(couchdb.docPath(newMM._id), newMM).respond({ id: newMM._id });

      $scope.$digest();
      // it should build new doc with data from form
      expect(MovimentoMagazzino.build).toHaveBeenCalledWith(
        get('Azienda_010101'),
        '20111231',
        form.causale1,
        undefined,
        get('Azienda_020202'),
        undefined
      );

      $httpBackend.flush();
      // it should redirect to saved document _id on success
      expect($location.path).toHaveBeenCalledWith(newMM._id);
    }));
  });

  describe('EditMovimentoMagazzino', function() {
    it('should initialize $scope', inject(function(codici, Azienda, Listino, Doc) {
      var $routeParams = { codice: '010101_2012_A_1' },
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
        };
      spyOn(Doc, 'load').andReturn();
      spyOn(Listino, 'load').andReturn();
      spyOn(Azienda, 'nome').andReturn('PIPPO');
      // describe scope initialization
      // it should fetch movimento magazzino
      expectGET(id);
      $controller('EditMovimentoMagazzino', { '$scope': $scope, '$routeParams': $routeParams });
      // it preloads dependencies
      expect(Doc.load).toHaveBeenCalledWith(['TaglieScalarini', 'ModelliEScalarini']);
      // it preloads listini
      expect(Listino.load).toHaveBeenCalledWith();
      // it should parse $routeParams.codice
      //TODO test what happens if $routeParams.codice is not valid.
      expect($scope.codes).toEqual({ magazzino1: '010101', anno: '2012', gruppo: 'A', numero: 1 });
      // it should put column indexes in $scope
      expect($scope.col).toEqual(codici.colNamesToColIndexes(codici.COLUMN_NAMES.MovimentoMagazzino));
      // it should default qta for new row to 1
      expect($scope.newQta).toBe(1);
      // it should default newBarcode to undefined
      expect($scope.newBarcode).toBeUndefined();

      // it should put nomeMagazzino1 in $scope
      expect(Azienda.nome).toHaveBeenCalledWith('010101');
      expect($scope.nomeMagazzino1).toBe('PIPPO');

      // it should initialize $scope.model only after response
      expect($scope.model).toBeUndefined();
      $httpBackend.flush();
      // it should put doc requested by $routeParams.codice in $scope.model
      expect($scope.model).toEqual(get(id));
      // it should put nomeMagazzino2 in $scope
      expect(Azienda.nome).toHaveBeenCalledWith('020202');
      expect($scope.nomeMagazzino2).toBe('PIPPO');

      expectGET('listini');
      $scope.prepareDownloads();
      $httpBackend.flush();
      // it should prepare download with correct labels and doc._id as filename.
      expect(Downloads.prepare).toHaveBeenCalledWith([label, label], id);

      // compile form
      $scope.newBarcode = '112604565000800066';
      $scope.newQta = 3;

      expectGET('TaglieScalarini');
      expectGET('ModelliEScalarini');
      // it should save the document in $scope.model
      $httpBackend.expectPUT(couchdb.docPath(id), $scope.model).respond(JSON.stringify({ id: id, rev: 'arev' }));
      $scope.save();
      $httpBackend.flush();
      // it shouldn't show errors
      expect(SessionInfo.error).not.toHaveBeenCalled();
      // it should reset form to default values
      expect($scope.newBarcode).toBe('');
      expect($scope.newQta).toBe(1);
      // it should append row with form's data to model.rows
      expect($scope.model.rows).toEqual([
        ['112604565000500066', 2, 'SM', 'SMOKING', 100, 2],
        ['112604565000800066', 2, 'SM', 'SMOKING', 100, 3]
      ]);
      // it should update $scope.model._rev with saved rev
      expect($scope.model._rev).toBe('arev');
      // it should display a notice
      expect(SessionInfo.notice).toHaveBeenCalledWith('Salvato ' + $scope.model._id);

      // it should sum qta from each row
      expect($scope.qtaTotale()).toBe(5);
    }));
  });

  describe('MovimentoMagazzino', function() {
    it('should initialize $scope', inject(function(codici, Azienda) {
      var form, results, nomi = {}, pendenti = { rows: [] };

      expectSession();
      expectGET('aziende');
      spyOn(Azienda, 'nomi').andReturn(nomi);
      MovimentoMagazzino.pendenti.andReturn(pendenti);
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      // ensure $scope is properly initialized
      $controller('MovimentoMagazzino', { '$scope': $scope });
      $httpBackend.flush();
      // it should put movimenti pendenti in $scope.pendenti
      expect($scope.pendenti).toBe(pendenti);
      // it should query for movimementi pendenti of the user.
      expect(MovimentoMagazzino.pendenti).toHaveBeenCalledWith('010101');
      // it should promise aziende in $scope
      expect(typeof $scope.aziende.then).toBe('function');
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);
      // it should put nomeAzienda in $scope
      expect($scope.nomeAzienda).toBe(nomi);

      // describe form defaults
      form = $scope.form;
      // it should default to current year
      expect(form.anno).toBe(2011);
      // it should default magazzino1 to current user's azienda
      expect(form.magazzino1).toBe('010101');

      // describe fill the form
      form.causale1 = codici.findCausaleMovimentoMagazzino('VENDITA');
      form.numero = 1;
      results = { some: 'results' };
      MovimentoMagazzino.search.andReturn(results);
      $scope.find();
      // it should search movimenti magazzino with given parameters
      expect(MovimentoMagazzino.search).toHaveBeenCalledWith(form);
      // it should put results in $scope
      expect($scope.results).toBe(results);
    }));
  });

  describe('RicercaBollaAs400', function() {
    it('should initialize $scope', inject(function(As400, codici, Doc) {
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      spyOn(Doc, 'load').andReturn();
      expectGET('aziende');
      // ensure $scope is properly initialized
      $controller('RicercaBollaAs400', { '$scope': $scope });
      // it should preload needed docs
      expect(Doc.load).toHaveBeenCalledWith(['TaglieScalarini', 'ModelliEScalarini']);
      // it should put aziende in $scope
      $httpBackend.flush();
      expect(typeof $scope.aziende.then).toBe('function');
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);

      // fill form
      var intestazione = $scope.intestazione = {
        data: '20111231',
        numero: 10,
        enteNumerazione: 'A',
        codiceNumerazione: '20'
      };

      var movimento = jasmine.createSpyObj('movimento', ['then']);
      MovimentoMagazzino.findByRiferimento.andReturn(movimento);
      $scope.fetch();
      // it should build id from form's data
      expect($scope.id).toBe('BollaAs400_20111231_10_A_20');
      // it should check if BollaAs400 was already loaded
      expect(MovimentoMagazzino.findByRiferimento).toHaveBeenCalledWith('BollaAs400_20111231_10_A_20');

      var cbFind = movimento.then.mostRecentCall.args[0];
      // when MovimentoMagazzino is found
      cbFind({ rows: [{ id: 'MovimentoMagazzino_010101_2011_A_1' }] });
      // it should send notice to the user
      expect(SessionInfo.notice).toHaveBeenCalledWith('Bolla già caricata su Boutique');
      // it should redirect to found MovimentoMagazzino keeping notice
      expect(SessionInfo.goTo).toHaveBeenCalledWith('MovimentoMagazzino_010101_2011_A_1');

      var promiseBolla = jasmine.createSpyObj('promiseBolla', ['success']);
      spyOn(As400, 'bolla').andReturn(promiseBolla);
      // when MovimentoMagazzino not found
      cbFind({ rows: [] });
      // it should query as400 with form's data
      expect(As400.bolla).toHaveBeenCalledWith(intestazione);

      // when bolla is found on as400
      var dati = {
        columnNames: ['codiceCliente', 'tipoMagazzino', 'causale', 'codiceMagazzino', 'scalarino', 'stagione', 'modello', 'articolo', 'colore', 'qta1', 'qta2', 'qta3', 'qta4', 'qta5', 'qta6', 'qta7', 'qta8', 'qta9', 'qta10', 'qta11', 'qta12'],
        rows: [['010101', '2', '73', 'K', '2', '112', '60456', '5000', '5000', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']]
      };
      expectGET('CausaliAs400');
      promiseBolla.success.mostRecentCall.args[0](dati);
      // it should put bolla in $scope
      expect($scope.bollaAs400).toBe(dati);

      $httpBackend.flush();
      // it should fill form MovimentoMagazzino with data from BollaAs400
      expect($scope.movimentoMagazzino).toEqual({
        magazzino1: '010101',
        causale1: codici.findCausaleMovimentoMagazzino('C/VENDITA'),
        data: '20111231'
      });

      // fill form
      $scope.movimentoMagazzino.magazzino2 = '020202';

      expectGET('TaglieScalarini');
      expectGET('ModelliEScalarini');
      var buildResp = jasmine.createSpyObj('buildMM', ['then']);
      MovimentoMagazzino.build.andReturn(buildResp);
      $scope.save();
      $httpBackend.flush();
      // it should create new doc
      expect(MovimentoMagazzino.build).toHaveBeenCalledWith(
        get('Azienda_010101'),
        '20111231',
        $scope.movimentoMagazzino.causale1,
        [['112604565000500066', 2, 'SM', 'SMOKING', 0, 1]],
        get('Azienda_020202'),
        'BollaAs400_20111231_10_A_20'
      );
      expect(buildResp.then).toHaveBeenCalled();
      // it should save created doc
      var newMM = { _id: 'MovimentoMagazzino_010101_2012_A_1' };
      $httpBackend.expectPUT(couchdb.docPath(newMM._id), newMM).respond(JSON.stringify({ ok: true }));
      buildResp.then.mostRecentCall.args[0](newMM);
      $httpBackend.flush();
      // it should redirect to saved document _id on success
      expect($location.path).toHaveBeenCalledWith(newMM._id);
    }));
  });

  describe('RicercaArticoli', function() {
    it('should initialize $scope', inject(function(Listino, Doc) {
      spyOn(Doc, 'load');
      spyOn(Listino, 'load');
      expectSession();
      expectGET('aziende');
      $controller('RicercaArticoli', { '$scope': $scope });
      // it preloads giacenze and related docs
      expect(Doc.load).toHaveBeenCalledWith(['TaglieScalarini', 'ModelliEScalarini', 'Giacenze']);
      // it preloads listini
      expect(Listino.load).toHaveBeenCalledWith();
      // it should not select any azienda by default
      expect($scope.aziendeSelezionate).toEqual([]);
      // it should default to no results
      expect($scope.filtrate).toEqual([]);
      // it should default limiteRisultati to 50
      expect($scope.limiteRisultati).toBe(50);
      // it should default to photoType 'foto'
      expect($scope.photoType).toBe('foto');

      // after session data arrives
      $httpBackend.flush();
      // it should put aziende in $scope
      expect($scope.aziende['010101']).toEqual(get('VIEW_AZIENDE').rows[0]);
      // it should select azienda of current user if found
      expect($scope.aziendeSelezionate).toEqual(['010101']);
      // it should put all tipiAzienda in $scope
      expect($scope.tipiAzienda).toEqual(['MAGAZZINO', 'NEGOZIO']);
      // it should put all comuni of azienda in $scope
      expect($scope.comuni).toEqual(['Bari', 'Madrid', 'Tricase']);
      // it should put all province of azienda in $scope
      expect($scope.province).toEqual(['BA', 'LE']);
      // it should put all nazioni of azienda in $scope
      expect($scope.nazioni).toEqual(['ES', 'IT']);
      // it should default to empty quickSearch
      expect($scope.quickSearch).toEqual({});

      $scope.togglePhotoType();
      // it should toggle from 'foto' to 'tessuto'
      expect($scope.photoType).toBe('tessuto');
      // it should toggle from 'tessuto' to 'foto'
      $scope.togglePhotoType();
      expect($scope.photoType).toBe('foto');

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

      expectGET('TaglieScalarini');
      expectGET('ModelliEScalarini');
      expectGET('Giacenze');
      expectGET('listini');
      // when no filter is given
      $scope.filtraGiacenza();
      $httpBackend.flush();
      // it should find up to limiteRisultati rows
      expect($scope.filtrate).toEqual([
        ['010101 Negozio1', 'SMOKING', '112', '60456', '5000', '5000', 3, 'PRONTO', 2, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, '1', '2*', '6']
      ]);
      // it should put first scalarino in $scope
      expect($scope.scalarino).toBe(2);
      // it should put first descrizioniTaglie in $scope
      expect($scope.taglie).toEqual(['SM', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--', '--']);
      // it should put totaliColonna in $scope
      expect($scope.totaliColonna).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, '', '', '6']);
    }));
  });

  describe('Azienda', function() {
    describe('without $routeParams.codice', function() {
      it('should initialize $scope', inject(function(codici) {
        expectSession('boutique');
        expectGET('aziende');
        $controller('Azienda', { '$scope': $scope });
        $httpBackend.flush();
        // it should not put azienda in $scope
        expect($scope.azienda).toEqual({});
        // it should put aziende in $scope
        expect($scope.aziende['010101']).toEqualData(get('VIEW_AZIENDE').rows[0]);
        // it should put tipiAzienda in $scope
        expect($scope.tipiAzienda).toEqual(codici.TIPI_AZIENDA);

        // fill form
        $scope.azienda._id = codici.idAzienda('111111');
        $scope.azienda.tipo = 'NEGOZIO';
        $scope.azienda.nome = 'Neg1';

        // it should create Azienda with given _id
        $httpBackend.expectPUT(couchdb.docPath('Azienda_111111'), $scope.azienda).respond({ id: 'Azienda_111111', rev: 'newrev' });
        // it should create Listino azienda
        $httpBackend.expectPUT(couchdb.docPath('Listino_111111')).respond({ id: 'Listino_111111', rev: '1' });
        $scope.save();
        $httpBackend.flush();
        // it should notify success to user
        expect(SessionInfo.notice).toHaveBeenCalledWith('Salvato');
        // it should update azienda
        expect($scope.azienda._rev).toBe('newrev');
        // it should go to newly created azienda's page
        expect(SessionInfo.goTo).toHaveBeenCalledWith('Azienda_111111');
      }));
    });

    describe('with $routeParams.codice', function() {
      it('should initialize $scope', inject(function(codici) {
        expectSession('boutique');
        expectGET('Azienda_010101');
        expectGET('aziende');
        $controller('Azienda', { '$scope': $scope, $routeParams: { codice: '010101' } });
        $httpBackend.flush();
        // it should put azienda in $scope
        expect($scope.azienda).toEqual(get('Azienda_010101'));
        // it should put aziende in $scope
        expect($scope.aziende['010101']).toEqual(get('VIEW_AZIENDE').rows[0]);
        // it should put tipiAzienda in $scope
        expect($scope.tipiAzienda).toEqual(codici.TIPI_AZIENDA);

        // fill form
        $scope.azienda.indirizzo = 'an address';

        // it should update Azienda
        $httpBackend.expectPUT(couchdb.docPath('Azienda_010101'), $scope.azienda).respond({ id: 'Azienda_010101', rev: 'newrev' });
        $scope.save();
        $httpBackend.flush();
        // it should notify success to user
        expect(SessionInfo.notice).toHaveBeenCalledWith('Salvato');
        // it should update azienda
        expect($scope.azienda._rev).toBe('newrev');
        // it should update aziende
        expect($scope.aziende['010101'].doc._rev).toBe('newrev');
      }));
    });
  });

  describe('Listino', function() {
    it('should initialize $scope', inject(function(Doc) {
      expectGET('Listino_1');
      spyOn(Doc, 'load');
      $controller('Listino', { '$scope': $scope, $routeParams: { codice: '1' } });
      // it should preload listino
      expect(Doc.load).toHaveBeenCalledWith(['Listino_1']);

      $scope.versione = '2';
      $scope.fetch();
      // it should redirect to requested listino
      expect($location.path).toHaveBeenCalledWith('Listino_2');

      $scope.stagione = '112';
      $scope.findRows();
      $httpBackend.flush();
      // it should put filtered rows in $scope.prezzi
      expect($scope.prezzi).toEqual([['112', '60456', '5000', [100, 300, 200, '*']]]);

      $scope.save();
      $httpBackend.expectPUT(couchdb.docPath('Listino_1')).respond({ ok: true, id: 'Listino_1', rev: '2' });
      $scope.$digest();
      $httpBackend.flush();
      expect(SessionInfo.notice).toHaveBeenCalledWith('Salvato Listino_1');
    }));
  });

  describe('Foto', function() {
    describe('without id', function() {
      it('should setup empty $scope', function() {
        $controller('Foto', { '$scope': $scope });

        // it should not set idFoto
        expect($scope.idFoto).toBeUndefined();
        // it should set empty results
        expect($scope.results).toEqual([]);
        // it should set empty costs
        expect($scope.costi).toEqual({});
        // it should set empty total
        expect($scope.total).toBe('');

        var idFoto = 'Foto_1_0_1';
        $scope.idFoto = idFoto;
        $scope.find();
        // it should go to foto's page
        expect(SessionInfo.goTo).toHaveBeenCalledWith(idFoto);
      });
    });

    describe('with id _9_9_9 (invalid id)', function() {
      it('should show error message', function() {
        expectGET('Foto_9_9_9', 404);
        $controller('Foto', { '$scope': $scope, $routeParams: { id: '_9_9_9' } });
        $httpBackend.flush();
        expect(SessionInfo.error).toHaveBeenCalledWith('Error 404 not_found on Foto_9_9_9: missing');
      });
    });

    describe('with id _1_0_1 (valid id)', function() {
      var idFoto;
      beforeEach(function() { idFoto = 'Foto_1_0_1'; });

      it('should initialize $scope with data from foto', function() {
        // it should fetch the foto
        expectGET(idFoto);
        $controller('Foto', { '$scope': $scope, $routeParams: { id: '_1_0_1' } });

        // it should set idFoto
        expect($scope.idFoto).toBe(idFoto);
        // it should set empty results
        expect($scope.results).toEqual([]);
        // it should set empty costs
        expect($scope.costi).toEqual({});
        // it should set empty total
        expect($scope.total).toBe('');

        // it should fetch descriptions
        expectGET('ModelliEScalarini');
        // it should fetch costs
        $httpBackend.expectGET(couchdb.viewPath('costo?key="125980211881"')).respond(JSON.stringify({ rows: [{ key: "125980211881", value: 12345 }] }));
        $httpBackend.expectGET(couchdb.viewPath('costo?key="125400212109"')).respond(JSON.stringify({ rows: [{ key: "125400212109", value: 3121 }] }));
        $httpBackend.flush();
        // it should put articoli in photo in results
        expect($scope.results).toEqual([
          { selected: true, stagione: '125', modello: '98021', articolo: '1881', colore: '8000', sma: '125980211881', descrizione: 'SCARPA CLASSICA FIBBIA' },
          { selected: true, stagione: '125', modello: '40021', articolo: '2109', colore: '5500', sma: '125400212109', descrizione: 'CAMICIA CLASSICA' }
        ]);
        // it should put image links in $scope
        expect($scope.image).toBe('../catalogo/1_0.jpg');
        expect($scope.imageOrig).toBe('../catalogo/1_0_orig.jpg');
      });
    });
  });
});
