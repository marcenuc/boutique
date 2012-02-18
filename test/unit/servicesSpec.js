/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, jasmine:false, spyOn:false, angular:false*/
describe('Service', function () {
  'use strict';
  beforeEach(module('app.config', 'app.services', 'app.shared'));

  afterEach(inject(function ($httpBackend) {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  }));

  describe('as400', function () {
    describe('bolla', function () {
      it('should query with the given parameters', inject(function ($httpBackend, As400) {
        var intestazioneBolla = {
            data: '110704',
            numero: '40241',
            enteNumerazione: 'Y',
            codiceNumerazione: '10'
          },
          callSpy = jasmine.createSpy('callSpy');
        $httpBackend.expectGET('../as400/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(intestazioneBolla));
        As400.bolla(intestazioneBolla).success(function (data) {
          callSpy();
          expect(data).toEqual(intestazioneBolla);
        });
        $httpBackend.flush();
        expect(callSpy.argsForCall.length).toBe(1);
      }));

      it('should notify errors to user', inject(function ($httpBackend, As400, SessionInfo) {
        var intestazioneBolla = {
            data: '110704',
            numero: '40241',
            enteNumerazione: 'Y',
            codiceNumerazione: '10'
          };
        $httpBackend.expectGET('../as400/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10').respond(500, 'error');
        spyOn(SessionInfo, 'error');
        As400.bolla(intestazioneBolla);
        $httpBackend.flush();
        expect(SessionInfo.error).toHaveBeenCalledWith('ERRORE 500: error');
      }));
    });
  });

  describe('session', function () {
    var sessionData = { userCtx: { name: 'boutique' } };

    beforeEach(inject(function ($httpBackend) {
      $httpBackend.expectGET('../_session').respond(JSON.stringify(sessionData));
    }));

    it('should promise session data', inject(function (session, $httpBackend) {
      var callback = jasmine.createSpy();
      session.then(callback);
      $httpBackend.flush();
      expect(callback).toHaveBeenCalledWith(sessionData);
    }));
  });

  describe('Azienda', function () {
    var aziendeView = 'aziende?include_docs=true',
      aziende = { rows: [
        { id: 'Azienda_099999', key: '099999', value: '099999_Mag1', doc: { _id: 'Azienda_099999', nome: 'Mag1', tipo: 'MAGAZZINO' } },
        { id: 'Azienda_010101', key: '010101', value: '010101 Neg1', doc: { _id: 'Azienda_010101', nome: 'Neg1', tipo: 'NEGOZIO' } },
        { id: 'Azienda_020202', key: '020202', value: '020202 Neg2', doc: { _id: 'Azienda_020202', nome: 'Neg2', tipo: 'NEGOZIO' } }
      ] };

    describe('all', function () {
      it('should notify loading status', function () {
        module(function ($provide) {
          $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['startLoading', 'doneLoading']));
        });
        inject(function ($httpBackend, Azienda, SessionInfo, couchdb) {
          $httpBackend.expectGET(couchdb.viewPath(aziendeView)).respond(JSON.stringify(aziende));
          expect(SessionInfo.startLoading).not.toHaveBeenCalledWith();
          Azienda.all();
          expect(SessionInfo.startLoading).toHaveBeenCalledWith();
          expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(SessionInfo.doneLoading).toHaveBeenCalled();
        });
      });

      it('should return map of all aziende', inject(function ($httpBackend, Azienda, couchdb) {
        $httpBackend.expectGET(couchdb.viewPath(aziendeView)).respond(JSON.stringify(aziende));
        var resp = Azienda.all(), callback = jasmine.createSpy();
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
      it('should promise the name of azienda', inject(function ($httpBackend, Azienda, couchdb) {
        $httpBackend.expectGET(couchdb.viewPath(aziendeView)).respond(JSON.stringify(aziende));
        var resp = Azienda.nome('010101'), callback = jasmine.createSpy();
        resp.then(callback);
        $httpBackend.flush();
        expect(callback).toHaveBeenCalledWith('010101 Neg1');
      }));
    });

    describe('nomi', function () {
      it('should promise map of codiceAzienda to nome of azienda', inject(function ($httpBackend, Azienda, couchdb) {
        $httpBackend.expectGET(couchdb.viewPath(aziendeView)).respond(JSON.stringify(aziende));
        var resp = Azienda.nomi(), callback = jasmine.createSpy();
        resp.then(callback);
        $httpBackend.flush();
        expect(callback).toHaveBeenCalledWith({ '099999': '099999_Mag1', '010101': '010101 Neg1', '020202': '020202 Neg2' });
      }));
    });
  });

  describe('Listino', function () {
    var listiniView = 'listini?include_docs=true',
      listini = { rows: [
        { id: 'Listino_1', key: '1', value: null, doc: { _id: 'Listino_1', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } } },
        { id: 'Listino_010101', key: '010101', value: null, doc: { _id: 'Listino_010101', columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' } }
      ] };

    describe('load', function () {
      it('should return map of all listini', inject(function ($httpBackend, Listino, couchdb) {
        $httpBackend.expectGET(couchdb.viewPath(listiniView)).respond(JSON.stringify(listini));
        var resp = Listino.load(), callback = jasmine.createSpy();
        resp.then(callback);
        $httpBackend.flush();
        expect(callback).toHaveBeenCalledWith({
          '1': { _id: 'Listino_1', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3 }, columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } },
          '010101': { _id: 'Listino_010101', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3 }, columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' }
        });
      }));
    });

    describe('all', function () {
      it('should notify loading status', function () {
        module(function ($provide) {
          $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['startLoading', 'doneLoading']));
        });
        inject(function ($httpBackend, Listino, SessionInfo, couchdb) {
          $httpBackend.expectGET(couchdb.viewPath(listiniView)).respond(JSON.stringify(listini));
          expect(SessionInfo.startLoading).not.toHaveBeenCalledWith();
          Listino.all();
          expect(SessionInfo.startLoading).toHaveBeenCalledWith();
          expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(SessionInfo.doneLoading).toHaveBeenCalled();
        });
      });

      it('should return map of all listini', inject(function ($httpBackend, Listino, couchdb) {
        $httpBackend.expectGET(couchdb.viewPath(listiniView)).respond(JSON.stringify(listini));
        var resp = Listino.all(), callback = jasmine.createSpy();
        resp.then(callback);
        $httpBackend.flush();
        expect(callback).toHaveBeenCalledWith({
          '1': { _id: 'Listino_1', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3 }, columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: { '112': { '60456': { '5000': [100, 300, 200, '*'] } } } },
          '010101': { _id: 'Listino_010101', col: { costo: 0, prezzo1: 1, prezzo2: 2, offerta: 3 }, columnNames: ['costo', 'prezzo1', 'prezzo2', 'offerta'], prezzi: {}, versioneBase: '1' }
        });
      }));
    });
  });

  describe('cache', function () {
    describe('info', function () {
      it('should return cache.info()', inject(function (cache) {
        expect(cache.info()).toEqual({ id: 'docs', size: 0 });
      }));
    });
    describe('put, get and remove', function () {
      it('should add entries via put and retrieve via get', inject(function (cache) {
        var id = 'anid', obj = { foo: 'bar' };
        expect(cache.info().size).toBe(0);
        expect(cache.get(id)).toBeUndefined();
        cache.put(id, obj);
        expect(cache.get(id)).toBe(obj);
        expect(cache.info().size).toBe(1);
      }));

      it('should remove entries via remove', inject(function (cache) {
        var id = 'anid', obj = { foo: 'bar' };
        cache.put(id, obj);
        expect(cache.get(id)).toBe(obj);
        cache.remove(id);
        expect(cache.get(id)).toBeUndefined();
      }));
    });

    describe('removeAll', function () {
      it('should blow away all data', inject(function (cache) {
        cache.put('id1', 1);
        cache.put('id2', 2);
        cache.put('id3', 3);
        expect(cache.info().size).toBe(3);

        cache.removeAll();

        expect(cache.info().size).toBe(0);
        expect(cache.get('id1')).toBeUndefined();
        expect(cache.get('id2')).toBeUndefined();
        expect(cache.get('id3')).toBeUndefined();
      }));
    });

    describe('put', function () {
      it('should remove AZIENDE when key is "/db/Azienda_[0-9]{6}$"', inject(function (cache, couchdb) {
        var az1 = { _id: 'Azienda_010101', nome: 'Az1', tipo: 'NEGOZIO' },
          AZIENDE = couchdb.viewPath('aziende?include_docs=true');
        cache.put(AZIENDE, { foo: 'bar' });
        cache.put(couchdb.docPath('Azienda_010101'), az1);
        expect(cache.get(AZIENDE)).toBeUndefined();
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
        inject(function ($httpBackend, Doc, SessionInfo, couchdb) {
          $httpBackend.expectGET(couchdb.docPath(doc._id)).respond(JSON.stringify(doc));
          expect(SessionInfo.startLoading).not.toHaveBeenCalledWith();
          Doc.find(doc._id);
          expect(SessionInfo.startLoading).toHaveBeenCalledWith();
          expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(SessionInfo.doneLoading).toHaveBeenCalled();
        });
      });

      it('should use cache', inject(function ($httpBackend, Doc, cache, couchdb) {
        $httpBackend.expectGET(couchdb.docPath(doc._id)).respond(JSON.stringify(doc));
        expect(cache.info().size).toBe(0);
        Doc.find(doc._id);
        expect(cache.info().size).toBe(1);
        $httpBackend.flush();
      }));

      describe('when ok', function () {
        it('should promise document with given _id', inject(function ($httpBackend, Doc, couchdb) {
          $httpBackend.expectGET(couchdb.docPath(doc._id)).respond(JSON.stringify(doc));
          var resp = Doc.find(doc._id), callback = jasmine.createSpy('callback');
          resp.then(callback);
          $httpBackend.flush();
          expect(callback).toHaveBeenCalled();
          expect(callback.mostRecentCall.args[0]).toEqual(doc);
        }));

        it('should promise query with given path if given', inject(function ($httpBackend, Doc) {
          $httpBackend.expectGET('/db/somequery').respond(JSON.stringify(doc));
          var resp = Doc.find(doc._id, '/db/somequery'), callback = jasmine.createSpy('callback');
          resp.then(callback);
          $httpBackend.flush();
          expect(callback).toHaveBeenCalled();
          expect(callback.mostRecentCall.args[0]).toEqual(doc);
        }));

        it('should apply transformation to response when given', inject(function ($httpBackend, Doc, couchdb) {
          function transformer(json) {
            var doc = JSON.parse(json);
            doc.zzz = 'ZZZ';
            return doc;
          }
          $httpBackend.expectGET(couchdb.docPath(doc._id)).respond(JSON.stringify(doc));
          var resp = Doc.find(doc._id, null, transformer),
            callback = jasmine.createSpy('callback'),
            respDoc = angular.extend({}, doc, { zzz: 'ZZZ' });
          resp.then(callback);
          $httpBackend.flush();
          expect(callback).toHaveBeenCalled();
          expect(callback.mostRecentCall.args[0]).toEqual(respDoc);
        }));
      });

      describe('when not found', function () {
        beforeEach(module(function ($provide) {
          $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['error', 'startLoading', 'doneLoading']));
        }));

        it('should display errors to user', inject(function ($httpBackend, Doc, SessionInfo, couchdb) {
          $httpBackend.expectGET(couchdb.docPath(doc._id)).respond(404, { error: 'not_found', reason: 'missing' });
          Doc.find(doc._id);
          expect(SessionInfo.startLoading).toHaveBeenCalledWith();
          expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(SessionInfo.doneLoading).toHaveBeenCalled();
          expect(SessionInfo.error).toHaveBeenCalledWith('Error 404 not_found on docid: missing');
        }));
      });
    });

    describe('load', function () {
      var docs = {
          'id1': { _id: 'id1', foo: 'bar' },
          'id2': { _id: 'id2', _rev: '1', baz: 8 }
        },
        docIds = Object.keys(docs),
        docPaths = [null, '/altpath'];

      beforeEach(inject(function ($httpBackend, couchdb) {
        docIds.forEach(function (docId, i) {
          var url = docPaths[i] || couchdb.docPath(docId);
          $httpBackend.expectGET(url).respond(JSON.stringify(docs[docId]));
        });
      }));

      it('should load documents with given ids into cache', inject(function (Doc, $httpBackend, cache) {
        expect(cache.info().size).toBe(0);
        Doc.load(docIds, docPaths);
        expect(cache.info().size).toBe(docIds.length);
        $httpBackend.flush();
      }));

      it('should return array of promises of requested docs', inject(function (Doc, $httpBackend) {
        var promises = Doc.load(docIds, docPaths);
        expect(promises.length).toBe(docIds.length);
        promises.forEach(function (promise) {
          expect(typeof promise.then).toBe('function');
        });
        $httpBackend.flush();
      }));
    });

    describe('save', function () {
      var doc, okResp;

      beforeEach(function () {
        doc = { _id: 'someid', foo: 'bar' };
        okResp = { id: doc._id, rev: 'arev' };
      });

      it('should notify loading status', function () {
        module(function ($provide) {
          $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['startLoading', 'doneLoading']));
        });
        inject(function ($httpBackend, Doc, SessionInfo, couchdb) {
          $httpBackend.expectPUT(couchdb.docPath(doc._id)).respond(JSON.stringify(okResp));
          Doc.save(doc);
          expect(SessionInfo.startLoading).toHaveBeenCalledWith();
          expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(SessionInfo.doneLoading).toHaveBeenCalled();
        });
      });

      it('should update cache', inject(function ($httpBackend, Doc, cache, couchdb) {
        var url = couchdb.docPath(doc._id);
        $httpBackend.expectPUT(url).respond(okResp);
        expect(cache.get(url)).toBeUndefined();
        expect(doc._rev).not.toEqual(okResp.rev);
        Doc.save(doc);
        $httpBackend.flush();
        expect(cache.get(url)).toBe(doc);
        expect(doc._rev).toBe(okResp.rev);
      }));

      describe('when ok', function () {
        it('should promise saved document with updated _rev', inject(function ($httpBackend, Doc, couchdb) {
          var callback = jasmine.createSpy('callback'),
            savedDoc = { _id: 'someid', foo: 'bar', _rev: okResp.rev };
          $httpBackend.expectPUT(couchdb.docPath(doc._id)).respond(JSON.stringify(okResp));
          Doc.save(doc).then(callback);
          expect(callback).not.toHaveBeenCalled();
          $httpBackend.flush();
          expect(callback).toHaveBeenCalledWith(savedDoc);
        }));
      });
    });
  });

  describe('MovimentoMagazzino', function () {
    var cntView = 'contatori?limit=1&descending=true&startkey=["010101",2012,"A",{}]&endkey=["010101",2012,"A"]';

    beforeEach(module(function ($provide) {
      $provide.value('SessionInfo', jasmine.createSpyObj('SessionInfo', ['startLoading', 'doneLoading']));
    }));

    describe('pendenti', function () {
      var pendenti = { rows: [] };

      it('should promise all movimenti magazzino pendenti', inject(function ($httpBackend, MovimentoMagazzino, couchdb) {
        $httpBackend.expectGET(couchdb.viewPath('movimentoMagazzinoPendente')).respond(JSON.stringify(pendenti));
        var resp = MovimentoMagazzino.pendenti(), cb = jasmine.createSpy();
        resp.then(cb);
        $httpBackend.flush();
        expect(cb).toHaveBeenCalledWith(pendenti);
      }));
    });

    describe('findByRiferimento', function () {
      var movimento = { rows: [] };

      it('should promise movimento magazzino with given riferimento', inject(function ($httpBackend, MovimentoMagazzino, SessionInfo, couchdb) {
        expect(SessionInfo.startLoading).not.toHaveBeenCalled();
        $httpBackend.expectGET(couchdb.viewPath('riferimentiMovimentiMagazzino?key="RIF"')).respond(JSON.stringify(movimento));
        var resp = MovimentoMagazzino.findByRiferimento('RIF'), cb = jasmine.createSpy();
        resp.then(cb);
        expect(SessionInfo.startLoading).toHaveBeenCalledWith();
        expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
        $httpBackend.flush();
        expect(SessionInfo.doneLoading).toHaveBeenCalled();
        expect(cb).toHaveBeenCalled();
        expect(cb.mostRecentCall.args[0]).toEqual(movimento);
      }));
    });

    describe('nextId', function () {
      var movimento = { _id: 'MovimentoMagazzino_010101_2012_A_3' },
        contatori = { rows: [{ key: ['010101', 2012, 'A', 2] }] };

      it('should promise new idMovimentoMagazzino', inject(function ($httpBackend, MovimentoMagazzino, SessionInfo, couchdb) {
        expect(SessionInfo.startLoading).not.toHaveBeenCalled();
        $httpBackend.expectGET(couchdb.viewPath(cntView)).respond(JSON.stringify(contatori));
        var resp = MovimentoMagazzino.nextId('010101', '2012', 'A'), cb = jasmine.createSpy();
        resp.then(cb);
        expect(SessionInfo.startLoading).toHaveBeenCalledWith();
        expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
        $httpBackend.flush();
        expect(SessionInfo.doneLoading).toHaveBeenCalled();
        expect(cb).toHaveBeenCalled();
        expect(cb.mostRecentCall.args[0]).toBe(movimento._id);
      }));
    });

    describe('build', function () {
      var idMovimento = 'MovimentoMagazzino_010101_2012_A_3',
        magazzino1 = { _id: 'Azienda_010101', tipo: 'MAGAZZINO', nome: 'Mag1' },
        magazzino2 = { _id: 'Azienda_020202', tipo: 'NEGOZIO', nome: 'Neg2' },
        contatori = { rows: [{ key: ['010101', 2012, 'A', 2] }] };

      it('should promise new unsaved MovimentoMagazzino', inject(function ($httpBackend, MovimentoMagazzino, SessionInfo, codici, couchdb) {
        expect(SessionInfo.startLoading).not.toHaveBeenCalled();
        $httpBackend.expectGET(couchdb.viewPath(cntView)).respond(JSON.stringify(contatori));
        var causale = codici.findCausaleMovimentoMagazzino('VENDITA'),
          rows = [],
          resp = MovimentoMagazzino.build(magazzino1, '20120101', causale, rows, magazzino2, 'RIF'),
          cb = jasmine.createSpy();
        expect(typeof resp.then).toBe('function');
        resp.then(cb);
        expect(SessionInfo.startLoading).toHaveBeenCalledWith();
        expect(SessionInfo.doneLoading).not.toHaveBeenCalled();
        $httpBackend.flush();
        expect(SessionInfo.doneLoading).toHaveBeenCalled();
        expect(cb).toHaveBeenCalled();
        expect(cb.mostRecentCall.args[0]).toEqual({
          _id: idMovimento,
          rows: rows,
          columnNames: codici.COLUMN_NAMES.MovimentoMagazzino,
          esterno1: 1,
          magazzino2: '020202',
          data: '20120101',
          riferimento: 'RIF',
          causale1: ['VENDITA', -1],
          causale2: ['ACQUISTO', 1]
        });
      }));
    });
  });
});
