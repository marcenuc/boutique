/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false*/
describe('Service', function () {
  'use strict';
  beforeEach(module('app.services', function ($provide) {
    $provide.value('couchdb', { db: 'db', designDoc: 'ddoc' });
  }));

  var $hb;

  beforeEach(inject(function ($httpBackend) {
    $hb = $httpBackend;
  }));

  afterEach(function () {
    $hb.verifyNoOutstandingExpectation();
    $hb.verifyNoOutstandingRequest();
  });

  describe('CdbView', function () {
    it('should query view ultimoNumero', inject(function (CdbView) {
      $hb.expectGET('/db/_design/ddoc/_view/contatori?descending=true&endkey=%5B%22010101%22,2012,%22D%22%5D&limit=1&startkey=%5B%22010101%22,2012,%22D%22,%7B%7D%5D').respond({});
      CdbView.ultimoNumero('010101', '2012', 'D');
      $hb.flush();
    }));
  });

  describe('Document', function () {
    describe('get', function () {
      it('should query document by id', inject(function (Document) {
        var scalarini, resp = { _id: 'Scalarini', data: 'abcd' };
        $hb.expectGET('/db/Scalarini').respond(JSON.stringify(resp));
        scalarini = Document.get({ id: resp._id });
        expect(scalarini).toEqualData({});
        $hb.flush();
        expect(scalarini).toEqualData(resp);
      }));
    });

    describe('clienti', function () {
      it('should query all docs of type Cliente of the given azienda', inject(function (Document) {
        $hb.expectGET('/db/_all_docs?endkey=%22Cliente_010101_%EF%BF%B0%22&include_docs=true&startkey=%22Cliente_010101_%22').respond({ rows: [] });
        var query = Document.clienti('Azienda_010101');
        expect(query).toEqualData({});
        $hb.flush();
        expect(query).toEqualData({ rows: [] });
      }));
    });

    describe('save', function () {
      it('should PUT new documents', inject(function (Document) {
        var data = { nome: 'Azienda 010101' },
          azienda = new Document(data),
          response = { ok: true, id: 'Azienda_010101', rev: '946B7D1C' };

        $hb.expectPUT('/db/Azienda_010101', data).respond(JSON.stringify(response));
        azienda.$save({ id: 'Azienda_010101' }, function (resp) {
          expect(resp).toEqualData(response);
        });
        $hb.flush();
      }));

      it('should PUT updated documents', inject(function (Document) {
        var data = { _id: 'Azienda_010101', nome: 'Azienda 010101' },
          azienda = new Document(data),
          response = { ok: true, id: 'Azienda_010101', rev: '946B7D1C' };
        $hb.expectPUT('/db/Azienda_010101', data).respond(JSON.stringify(response));
        azienda.$save(function (resp) {
          expect(resp).toEqualData(response);
        });
        $hb.flush();
      }));
    });
  });

  describe('as400', function () {
    describe('bolla', function () {
      it('should query with the given parameters', inject(function (As400) {
        var intestazioneBolla = {
            data: '110704',
            numero: '40241',
            enteNumerazione: 'Y',
            codiceNumerazione: '10'
          };
        $hb.expectGET('../as400/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(intestazioneBolla));
        As400.bolla(intestazioneBolla, function (data) {
          expect(data).toEqual(intestazioneBolla);
        });
        $hb.flush();
      }));
    });
  });

  describe('userCtx', function () {
    it('should have "roles" === ["boutique"]', inject(['userCtx', function (userCtx) {
      expect(userCtx.roles).toEqual(['boutique']);
    }]));
  });
});
