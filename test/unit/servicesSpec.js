/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, jasmine:false*/
describe('Service', function () {
  'use strict';
  beforeEach(module('app.services', 'app.shared', function ($provide) {
    $provide.value('couchdb', { db: 'db', designDoc: 'ddoc' });
  }));

  afterEach(inject(function ($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  }));

  describe('CdbView', function () {
    it('should query view ultimoNumero', inject(function ($httpBackend, CdbView) {
      $httpBackend.expectGET('/db/_design/ddoc/_view/contatori?descending=true&endkey=%5B%22010101%22,2012,%22D%22%5D&limit=1&startkey=%5B%22010101%22,2012,%22D%22,%7B%7D%5D').respond({});
      CdbView.ultimoNumero('010101', '2012', 'D');
      $httpBackend.flush();
    }));
  });

  describe('Document', function () {
    describe('get', function () {
      it('should query document by id', inject(function ($httpBackend, Document) {
        var scalarini, resp = { _id: 'Scalarini', data: 'abcd' };
        $httpBackend.expectGET('/db/Scalarini').respond(JSON.stringify(resp));
        scalarini = Document.get({ id: resp._id });
        expect(scalarini).toEqualData({});
        $httpBackend.flush();
        expect(scalarini).toEqualData(resp);
      }));
    });

    describe('clienti', function () {
      it('should query all docs of type Cliente of the given azienda', inject(function ($httpBackend, Document) {
        $httpBackend.expectGET('/db/_all_docs?endkey=%22Cliente_010101_%EF%BF%B0%22&include_docs=true&startkey=%22Cliente_010101_%22').respond({ rows: [] });
        var query = Document.clienti('Azienda_010101');
        expect(query).toEqualData({});
        $httpBackend.flush();
        expect(query).toEqualData({ rows: [] });
      }));
    });

    describe('save', function () {
      it('should PUT new documents', inject(function ($httpBackend, Document) {
        var data = { nome: 'Azienda 010101' },
          azienda = new Document(data),
          response = { ok: true, id: 'Azienda_010101', rev: '946B7D1C' };

        $httpBackend.expectPUT('/db/Azienda_010101', data).respond(JSON.stringify(response));
        azienda.$save({ id: 'Azienda_010101' }, function (resp) {
          expect(resp).toEqualData(response);
        });
        $httpBackend.flush();
      }));

      it('should PUT updated documents', inject(function ($httpBackend, Document) {
        var data = { _id: 'Azienda_010101', nome: 'Azienda 010101' },
          azienda = new Document(data),
          response = { ok: true, id: 'Azienda_010101', rev: '946B7D1C' };
        $httpBackend.expectPUT('/db/Azienda_010101', data).respond(JSON.stringify(response));
        azienda.$save(function (resp) {
          expect(resp).toEqualData(response);
        });
        $httpBackend.flush();
      }));
    });
  });

  describe('as400', function () {
    describe('bolla', function () {
      it('should query with the given parameters', inject(function ($httpBackend, As400) {
        var intestazioneBolla = {
            data: '110704',
            numero: '40241',
            enteNumerazione: 'Y',
            codiceNumerazione: '10'
          };
        $httpBackend.expectGET('../as400/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(intestazioneBolla));
        As400.bolla(intestazioneBolla, function (data) {
          expect(data).toEqual(intestazioneBolla);
        });
        $httpBackend.flush();
      }));
    });
  });

  describe('session', function () {
    var sessionData;

    beforeEach(inject(function ($httpBackend) {
      sessionData = { userCtx: { name: 'boutique' } };
      $httpBackend.expectGET('../_session').respond(sessionData);
    }));

    it('should promise session data', inject(function (session, $httpBackend) {
      var callback = jasmine.createSpy();
      expect(typeof session.then).toBe('function');
      session.then(callback);
      $httpBackend.flush();
      expect(callback).toHaveBeenCalledWith(sessionData);
    }));
  });

  describe('Azienda', function () {
    var aziende = { rows: [
      { id: 'Azienda_099999', key: '099999', value: '099999_Mag1', doc: { _id: 'Azienda_099999', nome: 'Mag1', tipo: 'MAGAZZINO' } },
      { id: 'Azienda_010101', key: '010101', value: '010101 Neg1', doc: { _id: 'Azienda_010101', nome: 'Neg1', tipo: 'NEGOZIO' } },
      { id: 'Azienda_020202', key: '020202', value: '020202 Neg2', doc: { _id: 'Azienda_020202', nome: 'Neg2', tipo: 'NEGOZIO' } }
    ] };

    beforeEach(function () {
      module(function ($provide) {
        $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['startLoading', 'doneLoading']));
      });
      inject(function ($httpBackend) {
        $httpBackend.expectGET('/db/_design/ddoc/_view/aziende?include_docs=true').respond(JSON.stringify(aziende));
      });
    });

    it('should notify loading status', inject(function ($httpBackend, SessionInfo) {
      expect(SessionInfo.startLoading).not.toHaveBeenCalled();
      inject(function (Azienda) {
        // dummy test that Azienda was instantiated
        expect(typeof Azienda).toBe('object');
        expect(SessionInfo.startLoading).toHaveBeenCalledWith();
        expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
        $httpBackend.flush();
        expect(SessionInfo.doneLoading).toHaveBeenCalled();
      });
    }));

    describe('all', function () {
      it('should promise a map of all aziende', inject(function ($httpBackend, Azienda) {
        var resp = Azienda.all(), callback = jasmine.createSpy();
        expect(typeof resp.then).toBe('function');
        resp.then(callback);
        $httpBackend.flush();
        expect(callback).toHaveBeenCalledWith({
          '099999': { id: 'Azienda_099999', key: '099999', value: '099999_Mag1', doc: { _id: 'Azienda_099999', nome: 'Mag1', tipo: 'MAGAZZINO' } },
          '010101': { id: 'Azienda_010101', key: '010101', value: '010101 Neg1', doc: { _id: 'Azienda_010101', nome: 'Neg1', tipo: 'NEGOZIO' } },
          '020202': { id: 'Azienda_020202', key: '020202', value: '020202 Neg2', doc: { _id: 'Azienda_020202', nome: 'Neg2', tipo: 'NEGOZIO' } }
        });
      }));
    });

    describe('nome', function () {
      it('should promise the name of azienda', inject(function ($httpBackend, Azienda) {
        var resp = Azienda.nome('010101'), callback = jasmine.createSpy();
        expect(typeof resp.then).toBe('function');
        resp.then(callback);
        $httpBackend.flush();
        expect(callback).toHaveBeenCalledWith('010101 Neg1');
      }));
    });
  });

  describe('Listino', function () {
    var listini = { rows: [
      { id: 'Listino_1', key: '1', value: null, doc: { _id: 'Listino_1', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } } },
      { id: 'Listino_010101', key: '010101', value: null, doc: { _id: 'Listino_010101', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' } }
    ] };

    beforeEach(function () {
      module(function ($provide) {
        $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['startLoading', 'doneLoading']));
      });
      inject(function ($httpBackend) {
        $httpBackend.expectGET('/db/_design/ddoc/_view/listini?include_docs=true').respond(JSON.stringify(listini));
      });
    });

    it('should notify loading status', inject(function ($httpBackend, SessionInfo) {
      expect(SessionInfo.startLoading).not.toHaveBeenCalled();
      inject(function (Listino) {
        expect(typeof Listino.all).toBe('function');
        expect(SessionInfo.startLoading).toHaveBeenCalledWith();
        expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
        $httpBackend.flush();
        expect(SessionInfo.doneLoading).toHaveBeenCalled();
      });
    }));

    describe('all', function () {
      it('should return map of all listini', inject(function ($httpBackend, Listino) {
        var keys, data, resp = Listino.all(), callback = jasmine.createSpy();
        expect(typeof resp.then).toBe('function');
        resp.success(callback);
        $httpBackend.flush();
        expect(callback).toHaveBeenCalled();
        data = callback.mostRecentCall.args[0];
        expect(typeof data).toBe('object');
        keys = Object.keys(data);
        expect(keys).toEqual(['1', '010101']);
        keys.forEach(function (versioneListino) {
          expect(data[versioneListino].doc).toBeUndefined();
          expect(data[versioneListino].col).toEqual({ costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3  });
        });
      }));
    });
  });

  describe('Doc', function () {
    var doc = { _id: 'docid', foo: 'bar' };

    describe('find', function () {
      it('should notify loading status', function () {
        module(function ($provide) {
          $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['startLoading', 'doneLoading']));
        });
        inject(function ($httpBackend, Doc, SessionInfo) {
          $httpBackend.expectGET('/db/' + doc._id).respond(JSON.stringify(doc));
          Doc.find(doc._id);
          expect(SessionInfo.startLoading).toHaveBeenCalledWith();
          expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(SessionInfo.doneLoading).toHaveBeenCalled();
        });
      });

      describe('when ok', function () {
        it('should return promise for document of given _id', inject(function ($httpBackend, Doc) {
          $httpBackend.expectGET('/db/' + doc._id).respond(JSON.stringify(doc));
          var resp = Doc.find(doc._id), callback = jasmine.createSpy('callback');
          resp.success(callback);
          $httpBackend.flush();
          expect(callback).toHaveBeenCalled();
          expect(callback.mostRecentCall.args[0]).toEqual(doc);
        }));
      });

      describe('when not found', function () {
        beforeEach(module(function ($provide) {
          $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['error', 'startLoading', 'doneLoading']));
        }));

        it('should display errors to user', inject(function ($httpBackend, Doc, SessionInfo) {
          $httpBackend.expectGET('/db/' + doc._id).respond(404, { error: 'not_found', reason: 'missing' });
          Doc.find(doc._id);
          expect(SessionInfo.startLoading).toHaveBeenCalledWith();
          expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(SessionInfo.doneLoading).toHaveBeenCalled();
          expect(SessionInfo.error).toHaveBeenCalledWith('Error 404 not_found on docid: missing');
        }));
      });
    });
  });
});
