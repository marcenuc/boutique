/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, jasmine:false, spyOn:false*/
describe('Controller', function () {
  'use strict';
  // TODO remove AZIENDE and use VIEW_AZIENDE (or viceversa).
  // TODO remove LISTINI and use VIEW_LISTINI (or viceversa).
  var AZIENDE, VIEW_AZIENDE, LISTINI, VIEW_LISTINI, FOTO;
  beforeEach(function () {
    AZIENDE = {
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
    };
    VIEW_AZIENDE = { rows: [
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
    LISTINI = {
      '1': { _id: 'Listino_1', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3  }, prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } },
      '010101': { _id: 'Listino_010101', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3  }, prezzi: {}, versioneBase: '1' }
    };
    VIEW_LISTINI = { rows: [
      { key: '1', id: 'Listino_1', value: null, doc: { _id: 'Listino_1', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } } },
      { key: '010101', id: 'Listino_010101', value: null, doc: { _id: 'Listino_010101', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' } }
    ] };
    FOTO = { _id: 'Foto_1_0_1', articoli: [
      { stagione: '125', modello: '98021', articolo: '1881', colore: '8000' },
      { stagione: '125', modello: '40021', articolo: '2109', colore: '5500' }
    ] };
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

  beforeEach(module('app.config', 'app.services', 'app.shared', 'app.validators', 'app.controllers', function ($provide) {
    var MovimentoMagazzino = jasmine.createSpyObj('MovimentoMagazzino', ['pendenti', 'build', 'findByRiferimento', 'search']),
      Downloads = jasmine.createSpyObj('Downloads', ['prepare']),
      SessionInfo = jasmine.createSpyObj('SessionInfo', ['setFlash', 'resetFlash', 'error', 'notice', 'startLoading', 'doneLoading', 'goTo']),
      $location = jasmine.createSpyObj('$location', ['path']);
    $provide.value('MovimentoMagazzino', MovimentoMagazzino);
    $provide.value('Downloads', Downloads);
    $provide.value('SessionInfo', SessionInfo);
    $provide.value('$location', $location);
  }));

  afterEach(inject(function (SessionInfo) {
    expect(SessionInfo.resetFlash).toHaveBeenCalledWith();
  }));

  describe('Header', function () {
    beforeEach(inject(function ($httpBackend) {
      $httpBackend.expectGET('../_session').respond({ userCtx: { name: '010101' } });
    }));

    it('should initialize $scope', inject(function ($rootScope, $controller, controllers, session, SessionInfo) {
      var $scope = $rootScope;
      // FAKE CALL for afterEach: this is the only exception...
      SessionInfo.resetFlash();
      // ensure $scope is properly initialized
      $controller(controllers.Header, { '$scope': $scope });
      // it should put SessionInfo in $scope
      expect($scope.SessionInfo).toBe(SessionInfo);
      // it should put session in $scope
      expect($scope.session).toBe(session);
    }));
  });

  describe('NewMovimentoMagazzino', function () {
    beforeEach(function () {
      module(function ($provide) {
        $provide.value('Doc', jasmine.createSpyObj('Doc', ['find', 'save', 'load']));
        $provide.value('Azienda', jasmine.createSpyObj('Azienda', ['all', 'nome', 'nomi']));
      });
      inject(function ($httpBackend) {
        $httpBackend.expectGET('../_session').respond({ userCtx: { name: '010101', roles: ['azienda'] } });
      });
    });

    it('should initialize $scope', inject(function ($q, $rootScope, $controller, controllers, $location, codici, Azienda, MovimentoMagazzino, Doc, $httpBackend) {
      var form, $scope = $rootScope,
        aziende = getPromise($q, AZIENDE),
        buildResp = jasmine.createSpyObj('buildMM', ['then']),
        saveResp = jasmine.createSpyObj('save', ['then']),
        causale = codici.findCausaleMovimentoMagazzino('VENDITA'),
        newMM = { _id: 'MovimentoMagazzino_010101_2012_A_1' };
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      Azienda.all.andReturn(aziende);
      MovimentoMagazzino.build.andReturn(buildResp);
      Doc.save.andReturn(saveResp);
      // ensure $scope is properly initialized
      $controller(controllers.NewMovimentoMagazzino, { '$scope': $scope });
      // it should put aziende in $scope
      expect($scope.aziende).toBe(aziende);
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);
      $httpBackend.flush();

      form = $scope.form;
      // it should default form.data to today
      expect(form.data).toBe('20111231');
      // it should default magazzino1 to user's magazzino
      expect(form.magazzino1).toBe('010101');
      // it should default causale1 to "VENDITA A CLIENTI" if user's name is codice azienda
      // TODO it should default causale1 to "VENDITA A CLIENTI" if user has role azienda
      expect(form.causale1).toEqual({ descrizione: 'VENDITA A CLIENTI', segno: -1, gruppo: 'C' });

      // fill form
      form.magazzino1 = '010101';
      form.magazzino2 = '020202';
      form.causale1 = causale;

      $scope.create();
      $scope.$digest();
      // it should create new doc
      expect(MovimentoMagazzino.build).toHaveBeenCalledWith(
        AZIENDE['010101'].doc,
        '20111231',
        causale,
        undefined,
        AZIENDE['020202'].doc,
        undefined
      );
      expect(buildResp.then).toHaveBeenCalled();
      buildResp.then.mostRecentCall.args[0](newMM);
      // it should save created doc
      expect(saveResp.then).toHaveBeenCalled();
      // it should redirect to saved document _id on success
      saveResp.then.mostRecentCall.args[0](newMM);
      expect($location.path).toHaveBeenCalledWith(newMM._id);
    }));
  });

  describe('EditMovimentoMagazzino', function () {
    beforeEach(module(function ($provide) {
      var Listino = jasmine.createSpyObj('Listino', ['all', 'load']);
      $provide.value('Listino', Listino);
      Listino.all.andReturn(jasmine.createSpyObj('listini', ['then']));
      $provide.value('$routeParams', { codice: '010101_2012_A_1' });
      $provide.value('Doc', jasmine.createSpyObj('Doc', ['find', 'save', 'load']));
      $provide.value('Azienda', jasmine.createSpyObj('Azienda', ['all', 'nome', 'nomi']));
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
        savePromise = jasmine.createSpyObj('savePromise', ['then']),
        find = {
          TaglieScalarini: jasmine.createSpyObj('findTaglieScalarini', ['then']),
          ModelliEScalarini: jasmine.createSpyObj('findModelliEScalarini', ['then'])
        };
      find[id] = jasmine.createSpyObj('find', ['then']);
      Doc.find.andCallFake(function (docId) {
        return find[docId];
      });
      Azienda.nome.andReturn('PIPPO');
      Doc.save.andReturn(savePromise);
      $controller(controllers.EditMovimentoMagazzino, { '$scope': $scope });
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

      // it should put nomeMagazzino1 in $scope
      expect(Azienda.nome).toHaveBeenCalledWith('010101');
      expect($scope.nomeMagazzino1).toBe('PIPPO');

      expect(Doc.find).toHaveBeenCalledWith(id);
      expect(find[id].then).toHaveBeenCalled();
      expect($scope.model).toBeUndefined();
      find[id].then.mostRecentCall.args[0](getDocument(id));
      // it should put doc requested by $routeParams.codice in $scope.model
      expect($scope.model).toEqual(getDocument(id));
      // it should put nomeMagazzino2 in $scope
      expect(Azienda.nome).toHaveBeenCalledWith('020202');
      expect($scope.nomeMagazzino2).toBe('PIPPO');

      $scope.prepareDownloads();
      // it should prepare download with correct labels and doc._id as filename.
      expect(listini.then).toHaveBeenCalled();
      listini.then.mostRecentCall.args[0](LISTINI);
      expect(Downloads.prepare).toHaveBeenCalledWith([label, label], id);

      // compile form
      $scope.newBarcode = '112604565000800066';
      $scope.newQta = 3;

      $scope.save();
      // it shouldn't show errors
      expect(SessionInfo.error).not.toHaveBeenCalled();
      // it should fetch TaglieScalarini
      expect(find.TaglieScalarini.then).toHaveBeenCalled();
      find.TaglieScalarini.then.mostRecentCall.args[0](getDocument('TaglieScalarini'));
      // it should fetch ModelliEScalarini
      expect(find.ModelliEScalarini.then).toHaveBeenCalled();
      find.ModelliEScalarini.then.mostRecentCall.args[0](getDocument('ModelliEScalarini'));
      // it should fetch listini
      expect(listini.then).toHaveBeenCalled();
      listini.then.mostRecentCall.args[0](LISTINI);
      // it should save the document in $scope.model
      expect(Doc.save).toHaveBeenCalledWith($scope.model);
      expect(savePromise.then).toHaveBeenCalled();
      saveCb = savePromise.then.mostRecentCall.args[0];
      // it should reset form to default values
      expect($scope.newBarcode).toBe('');
      expect($scope.newQta).toBe(1);
      // it should append row with form's data to model.rows
      expect($scope.model.rows).toEqual([
        ['112604565000500066', 2, 'SM', 'SMOKING', 100, 2],
        ['112604565000800066', 2, 'SM', 'SMOKING', 100, 3]
      ]);
      // TODO this is brittle, how can be improved?
      saveCb({ _id: $scope.model._id, _rev: 'arev' });
      // it should update $scope.model._rev with saved rev
      expect($scope.model._rev).toBe('arev');
      // it should display a notice
      expect(SessionInfo.notice).toHaveBeenCalledWith('Salvato ' + $scope.model._id);

      // it should sum qta from each row
      expect($scope.qtaTotale()).toBe(5);
    }));
  });

  describe('MovimentoMagazzino', function () {
    beforeEach(function () {
      module(function ($provide) {
        $provide.value('Azienda', jasmine.createSpyObj('Azienda', ['all', 'nome', 'nomi']));
      });
      inject(function ($httpBackend) {
        $httpBackend.expectGET('../_session').respond({ userCtx: { name: '010101' } });
      });
    });

    it('should initialize $scope', inject(function ($q, $rootScope, $controller, controllers, codici, Azienda, MovimentoMagazzino, $httpBackend) {
      var form, results, $scope = $rootScope, aziende = getPromise($q, AZIENDE), nomi = {}, pendenti = { rows: [] };

      Azienda.all.andReturn(aziende);
      Azienda.nomi.andReturn(nomi);
      MovimentoMagazzino.pendenti.andReturn(pendenti);
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      // ensure $scope is properly initialized
      $controller(controllers.MovimentoMagazzino, { '$scope': $scope });
      $httpBackend.flush();
      // it should put movimenti pendenti in $scope.pendenti
      expect($scope.pendenti).toBe(pendenti);
      // it should query for movimementi pendenti of the user.
      expect(MovimentoMagazzino.pendenti).toHaveBeenCalledWith('010101');
      // it should put aziende in $scope
      expect($scope.aziende).toBe(aziende);
      // it should put causali in $scope
      expect($scope.causali).toBe(codici.CAUSALI_MOVIMENTO_MAGAZZINO);
      // it should put nomeAzienda in $scope
      expect($scope.nomeAzienda).toBe(nomi);

      form = $scope.form;
      // it should default to current year
      expect(form.anno).toBe(2011);
      // it should default magazzino1 to current user's azienda
      expect(form.magazzino1).toBe('010101');

      // fill the form
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

  describe('RicercaBollaAs400', function () {
    beforeEach(module(function ($provide) {
      $provide.value('Doc', jasmine.createSpyObj('Doc', ['find', 'save', 'load']));
      $provide.value('Azienda', jasmine.createSpyObj('Azienda', ['all', 'nome', 'nomi']));
    }));

    it('should initialize $scope', inject(function ($q, $rootScope, $controller, controllers, As400, SessionInfo, MovimentoMagazzino, $location, codici, Azienda, Doc) {
      var intestazione, dati, cbFind, promiseBolla, $scope = $rootScope, aziende = getPromise($q, AZIENDE),
        movimento = jasmine.createSpyObj('movimento', ['then']),
        buildResp = jasmine.createSpyObj('buildMM', ['then']),
        saveResp = jasmine.createSpyObj('save', ['then']),
        newMM = { _id: 'MovimentoMagazzino_010101_2012_A_1' },
        find = {
          TaglieScalarini: jasmine.createSpyObj('findTaglieScalarini', ['then']),
          ModelliEScalarini: jasmine.createSpyObj('findModelliEScalarini', ['then']),
          CausaliAs400: jasmine.createSpyObj('findCausaliAs400', ['then'])
        };
      Doc.find.andCallFake(function (docId) {
        return find[docId];
      });
      spyOn(codici, 'newYyyyMmDdDate').andReturn('20111231');
      Azienda.all.andReturn(aziende);
      MovimentoMagazzino.findByRiferimento.andReturn(movimento);
      MovimentoMagazzino.build.andReturn(buildResp);
      Doc.save.andReturn(saveResp);
      // ensure $scope is properly initialized
      $controller(controllers.RicercaBollaAs400, { '$scope': $scope });
      // it should preload needed docs
      expect(Doc.load).toHaveBeenCalledWith(['TaglieScalarini', 'ModelliEScalarini']);
      // it should put aziende in $scope
      expect($scope.aziende).toBe(aziende);
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
      expect(MovimentoMagazzino.findByRiferimento).toHaveBeenCalledWith('BollaAs400_20111231_10_A_20');

      cbFind = movimento.then.mostRecentCall.args[0];
      // when MovimentoMagazzino is found
      cbFind({ rows: [{ id: 'MovimentoMagazzino_010101_2011_A_1' }] });
      // it should send notice to the user
      expect(SessionInfo.notice).toHaveBeenCalledWith('Bolla già caricata su Boutique');
      // it should redirect to found MovimentoMagazzino keeping notice
      expect(SessionInfo.goTo).toHaveBeenCalledWith('MovimentoMagazzino_010101_2011_A_1');

      promiseBolla = jasmine.createSpyObj('promiseBolla', ['success']);
      spyOn(As400, 'bolla').andReturn(promiseBolla);
      // when MovimentoMagazzino not found
      cbFind({ rows: [] });
      // it should query as400 with form's data
      expect(As400.bolla).toHaveBeenCalledWith(intestazione);

      // when bolla is found on as400
      dati = {
        columnNames: ['codiceCliente', 'tipoMagazzino', 'causale', 'codiceMagazzino', 'scalarino', 'stagione', 'modello', 'articolo', 'colore', 'qta1', 'qta2', 'qta3', 'qta4', 'qta5', 'qta6', 'qta7', 'qta8', 'qta9', 'qta10', 'qta11', 'qta12'],
        rows: [['010101', '2', '73', 'K', '2', '112', '60456', '5000', '5000', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']]
      };
      promiseBolla.success.mostRecentCall.args[0](dati);
      // it should put bolla in $scope
      expect($scope.bollaAs400).toBe(dati);

      expect(find.CausaliAs400.then).toHaveBeenCalled();
      find.CausaliAs400.then.mostRecentCall.args[0](getDocument('CausaliAs400'));
      // it should fill form MovimentoMagazzino with data from BollaAs400
      expect($scope.movimentoMagazzino).toEqual({
        magazzino1: '010101',
        causale1: codici.findCausaleMovimentoMagazzino('C/VENDITA'),
        data: '20111231'
      });

      // fill form
      $scope.movimentoMagazzino.magazzino2 = '020202';

      $scope.save();
      $scope.$digest();
      // TODO use promises here to get job done by $digest();
      expect(find.TaglieScalarini.then).toHaveBeenCalled();
      find.TaglieScalarini.then.mostRecentCall.args[0](getDocument('TaglieScalarini'));
      expect(find.ModelliEScalarini.then).toHaveBeenCalled();
      find.ModelliEScalarini.then.mostRecentCall.args[0](getDocument('ModelliEScalarini'));
      $scope.$digest();
      // it should create new doc
      expect(MovimentoMagazzino.build).toHaveBeenCalledWith(
        AZIENDE['010101'].doc,
        '20111231',
        $scope.movimentoMagazzino.causale1,
        [['112604565000500066', 2, 'SM', 'SMOKING', 0, 1]],
        AZIENDE['020202'].doc,
        'BollaAs400_20111231_10_A_20'
      );
      expect(buildResp.then).toHaveBeenCalled();
      buildResp.then.mostRecentCall.args[0](newMM);
      // it should save created doc
      expect(saveResp.then).toHaveBeenCalled();
      // it should redirect to saved document _id on success
      saveResp.then.mostRecentCall.args[0](newMM);
      expect($location.path).toHaveBeenCalledWith(newMM._id);
    }));
  });

  describe('RicercaArticoli', function () {
    beforeEach(inject(function ($httpBackend, couchdb) {
      $httpBackend.expectGET('../_session').respond({ userCtx: { name: '010101' } });
      $httpBackend.expectGET(couchdb.viewPath('aziende?include_docs=true')).respond(JSON.stringify(VIEW_AZIENDE));
    }));

    it('should initialize $scope', inject(function ($rootScope, $controller, controllers, $httpBackend, Listino, Doc, couchdb) {
      var $scope = $rootScope;
      spyOn(Doc, 'load');
      spyOn(Listino, 'load');
      $controller(controllers.RicercaArticoli, { '$scope': $scope });
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
      expect($scope.aziende).toEqualData(AZIENDE);
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

      $httpBackend.expectGET(couchdb.docPath('TaglieScalarini')).respond(getDocument('TaglieScalarini'));
      $httpBackend.expectGET(couchdb.docPath('ModelliEScalarini')).respond(getDocument('ModelliEScalarini'));
      $httpBackend.expectGET(couchdb.docPath('Giacenze')).respond(getDocument('Giacenze'));
      $httpBackend.expectGET(couchdb.viewPath('listini?include_docs=true')).respond(JSON.stringify(VIEW_LISTINI));
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

  describe('Azienda', function () {
    describe('without $routeParams.codice', function () {
      beforeEach(inject(function ($httpBackend) {
        $httpBackend.expectGET('../_session').respond({ userCtx: { name: 'boutique', roles: [] } });
      }));

      it('should initialize $scope', inject(function ($rootScope, $controller, controllers, codici, $httpBackend, SessionInfo, couchdb) {
        var $scope = $rootScope;
        $httpBackend.expectGET(couchdb.viewPath('aziende?include_docs=true')).respond(JSON.stringify(VIEW_AZIENDE));
        $controller(controllers.Azienda, { '$scope': $scope });
        $httpBackend.flush();
        // it should not put azienda in $scope
        expect($scope.azienda).toEqual({});
        // it should put aziende in $scope
        expect($scope.aziende).toEqualData(AZIENDE);
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

    describe('with $routeParams.codice', function () {
      beforeEach(function () {
        module(function ($provide) {
          $provide.value('$routeParams', { codice: '010101' });
        });
        inject(function ($httpBackend) {
          $httpBackend.expectGET('../_session').respond({ userCtx: { name: 'boutique', roles: [] } });
        });
      });

      it('should initialize $scope', inject(function ($rootScope, $controller, controllers, codici, $httpBackend, SessionInfo, couchdb) {
        var $scope = $rootScope;
        $httpBackend.expectGET(couchdb.docPath('Azienda_010101')).respond(JSON.stringify(AZIENDE['010101'].doc));
        $httpBackend.expectGET(couchdb.viewPath('aziende?include_docs=true')).respond(JSON.stringify(VIEW_AZIENDE));
        $controller(controllers.Azienda, { '$scope': $scope });
        $httpBackend.flush();
        $scope.$digest();
        // it should put azienda in $scope
        expect($scope.azienda).toEqual(AZIENDE['010101'].doc);
        // it should put aziende in $scope
        expect($scope.aziende).toEqualData(AZIENDE);
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

  describe('Listino', function () {
    beforeEach(module(function ($provide) {
      $provide.value('$routeParams', { codice: '1' });
    }));

    it('should initialize $scope', inject(function ($rootScope, $controller, controllers, $httpBackend, $location, Doc, SessionInfo, couchdb) {
      var $scope = $rootScope;
      $httpBackend.expectGET(couchdb.docPath('Listino_1')).respond(JSON.stringify(LISTINI['1']));
      spyOn(Doc, 'load');
      $controller(controllers.Listino, { '$scope': $scope });
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

  describe('Catalogo', function() {
    it('should initialize $scope', inject(function($rootScope, $controller, controllers, $httpBackend, couchdb) {
      var $scope = $rootScope, idFoto = 'Foto_1_0_1';
      $controller(controllers.Catalogo, { '$scope': $scope });

      $scope.idFoto = idFoto;
      $httpBackend.expectGET(couchdb.docPath(idFoto)).respond(FOTO);
      $httpBackend.expectGET(couchdb.viewPath('costo?key="125980211881"')).respond(JSON.stringify({ rows: [{ key: "125980211881", value: 12345 }] }));
      $httpBackend.expectGET(couchdb.viewPath('costo?key="125400212109"')).respond(JSON.stringify({ rows: [{ key: "125400212109", value: 3121 }] }));
      $scope.find();
      $httpBackend.flush();
      // it should put articoli in photo in results
      expect($scope.results).toEqual(FOTO.articoli);
    }));
  });
});
