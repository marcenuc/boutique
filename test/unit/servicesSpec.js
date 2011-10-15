/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, jasmine: false,
         expect: false, angular: false, CODICI: false */

describe('Services', function () {
  'use strict';

  var scope = null;

  beforeEach(function () {
    scope = angular.scope();
  });

  describe('$xhr.error', function () {
    var xhrError = null, $route = null;

    beforeEach(function () {
      xhrError = scope.$service('$xhr.error');
      $route = scope.$service('$route');
    });

    it('should set flash in current scope', function () {
      $route.reload();
      scope.$digest();
      $route.current.scope = scope;
      xhrError({}, { status: 500, body: 'Ouch!' });
      expect(scope.flash).toEqual({ errors: [{ message: 'ERROR 500: Ouch!' }]});
    });
  });


  describe('with XHR', function () {
    var $browser = null;

    beforeEach(function () {
      $browser = scope.$service('$browser');
    });

    afterEach(function () {
      expect($browser.xhr.requests.length).toBe(0, 'You have not flushed the $browser.xhr requests.');
    });

    describe('Document', function () {
      var Document = null;

      beforeEach(function () {
        Document = scope.$service('Document');
      });

      describe('get', function () {
        it('should query couchdb for the document with the given id', function () {
          var scalarini, resp = { _id: 'scalarini', data: 'abcd' };
          $browser.xhr.expectGET('/boutique_db/scalarini').respond(JSON.stringify(resp));
          scalarini = Document.get({ id: resp._id });
          expect(scalarini).toEqualData({});
          $browser.xhr.flush();
          expect(scalarini).toEqualData(resp);
        });
      });

      describe('aziende', function () {
        it('should query couchdb for all docs of type azienda', function () {
          $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22Azienda_%EF%BF%B0%22&include_docs=true&startkey=%22Azienda_%22').respond({ rows: [] });
          var query = Document.aziende();
          expect(query).toEqualData({});
          $browser.xhr.flush();
          expect(query).toEqualData({ rows: [] });
        });
      });


      describe('clienti', function () {
        it('should query couchdb for all docs of type cliente', function () {
          $browser.xhr.expectGET('/boutique_db/_all_docs?endkey=%22Cliente_010101_%EF%BF%B0%22&include_docs=true&startkey=%22Cliente_010101_%22').respond({ rows: [] });
          var query = Document.clienti('Azienda_010101');
          expect(query).toEqualData({});
          $browser.xhr.flush();
          expect(query).toEqualData({ rows: [] });
        });
      });


      describe('save', function () {

        it('should PUT new documents', function () {
          var data = { nome: 'Azienda 010101' },
            azienda = new Document(data),
            response = { ok: true, id: 'Azienda_010101', rev: '946B7D1C' };

          $browser.xhr.expectPUT('/boutique_db/Azienda_010101', data).respond(JSON.stringify(response));
          azienda.$save({ id: 'Azienda_010101' }, function (resp) {
            expect(resp).toEqualData(response);
          });
          $browser.xhr.flush();
        });

        it('should PUT updated documents', function () {
          var data = { _id: 'Azienda_010101', nome: 'Azienda 010101' },
            azienda = new Document(data),
            response = { ok: true, id: 'Azienda_010101', rev: '946B7D1C' };
          $browser.xhr.expectPUT('/boutique_db/Azienda_010101', data).respond(JSON.stringify(response));
          azienda.$save(function (resp) {
            expect(resp).toEqualData(response);
          });
          $browser.xhr.flush();
        });
      });


      describe('toAziendaId', function () {

        it('should return "Azienda_010101" for codice "010101"', function () {
          expect(Document.toAziendaId('010101')).toBe('Azienda_010101');
        });

        it('should return undefined for undefined, null, or blank codice', function () {
          expect(Document.toAziendaId()).toBeUndefined();
          expect(Document.toAziendaId(null)).toBeUndefined();
          expect(Document.toAziendaId('')).toBeUndefined();
        });
      });


      describe('toCodice', function () {

        it('should return "010101" for id "Azienda_010101', function () {
          expect(Document.toCodice('Azienda_010101')).toBe('010101');
        });

        it('should return "010101_10" for id "cliente_010101_10', function () {
          expect(Document.toCodice('Cliente_010101_10')).toBe('010101_10');
        });

        it('should return undefined for undefined, null, or blank id', function () {
          expect(Document.toCodice()).toBeUndefined();
          expect(Document.toCodice(null)).toBeUndefined();
          expect(Document.toCodice('')).toBeUndefined();
        });
      });
    });

    describe('as400', function () {
      var As400 = null;

      beforeEach(function () {
        As400 = scope.$service('As400');
      });

      describe('bolla', function () {
        it('should query with the given parameters', function () {
          var intestazioneBolla = {
              data: '110704',
              numero: '40241',
              enteNumerazione: 'Y',
              codiceNumerazione: '10'
            };
          $browser.xhr.expectGET('/boutique_app/as400/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(intestazioneBolla));
          As400.bolla(intestazioneBolla, function (code, data) {
            expect(code).toBe(200);
            expect(data.numero).toBe(intestazioneBolla.numero);
          });
          $browser.xhr.flush();
        });
      });
    });
  });

  describe('userCtx', function () {
    it('should have "name" === "boutique"', function () {
      var userCtx = scope.$service('userCtx');
      expect(userCtx.name).toEqual('boutique');
    });
  });


  beforeEach(function () {
    this.addMatchers({
      toHaveError: function (expected) {
        return this.actual.errors.some(function (e) {
          return e.message === expected;
        });
      },

      toMatchError: function (expected) {
        return this.actual.errors.some(function (e) {
          return expected.test(e.message);
        });
      }
    });
  });

  describe('Validator', function () {
    var check = null, check099999 = null, ctx123456 = { name: '123456', roles: ['azienda'] };
    beforeEach(function () {
      check = scope.$service('Validator').check;
      check099999 = angular.service('Validator')({
        name: '099999',
        roles: ['azienda']
      }).check;
    });

    it('should require an authenticated user', function () {
      expect(angular.service('Validator')({}).check({})).toHaveError('Not authorized');
      expect(angular.service('Validator')({}).check({ _deleted: true })).toHaveError('Not authorized');
    });

    it('should forbid change of _id', function () {
      var msg = 'Invalid _id';
      expect(check({ _id: 'Azienda_1' }, { _id: 'Azienda_1' })).not.toHaveError(msg);
      expect(check({ _id: 'Azienda_1' }, { _id: 'Azienda_2' })).toHaveError(msg);
    });

    it('should not validate deleted documents', function () {
      expect(check({ _deleted: true }).errors.length).toBe(0);
    });

    it('should reject invalid types', function () {
      var msg = 'Invalid type';
      expect(check({})).toHaveError(msg);
      expect(check({ _id: 'nONVALIDTYPE_002' })).toHaveError(msg);
      expect(check({ _id: 'invalidid_' })).toHaveError(msg);
    });

    it('should reject unknown types', function () {
      var msg = 'Unknown type';
      expect(check({ _id: 'UnknownType_002' })).toHaveError(msg);
      expect(check({ _id: 'Unknownid' })).toHaveError(msg);
    });

    describe('Azienda', function () {
      it('should require six digits code', function () {
        var msg = 'Invalid azienda code';
        expect(check({ _id: 'Azienda_1' })).toHaveError(msg);
        expect(check({ _id: 'Azienda_000000' })).not.toHaveError(msg);
      });

      it('should require nome', function () {
        var msg = 'Required: nome';
        expect(check({ _id: 'Azienda_1' })).toHaveError(msg);
        expect(check({ _id: 'Azienda_1', nome: ' ' })).toHaveError(msg);
        expect(check({ _id: 'Azienda_1', nome: 'n' })).not.toHaveError(msg);
      });

      it('should require tipo', function () {
        var msg = 'Required: tipo';
        expect(check({ _id: 'Azienda_1' })).toHaveError(msg);
        expect(check({ _id: 'Azienda_1', tipo: ' ' })).toHaveError(msg);
        expect(check({ _id: 'Azienda_1', tipo: 'NEGOZIO' })).not.toHaveError(msg);
        expect(check({ _id: 'Azienda_1', tipo: 'MAGAZZINO' })).not.toHaveError(msg);
      });
    });

    describe('MovimentoMagazzino', function () {
      var validId = 'MovimentoMagazzino_099999_20111014_1234',
        check123456 = angular.service('Validator')(ctx123456).check;

      it('should require owner user for writes', function () {
        expect(check({ _id: validId })).not.toHaveError('Not authorized');
        expect(check099999({ _id: validId })).not.toHaveError('Not authorized');
        expect(check123456({ _id: validId })).toHaveError('Not authorized');
      });

      it('should require admin user for "accodato"', function () {
        var accodato = { _id: validId, accodato: true },
          nonAccodato = { _id: validId };
        expect(check(accodato)).not.toHaveError('Not authorized');
        expect(check(accodato, nonAccodato)).not.toHaveError('Not authorized');
        expect(check099999(accodato)).toHaveError('Not authorized');
        expect(check099999(nonAccodato, accodato)).toHaveError('Not authorized');
        expect(check099999(accodato, nonAccodato)).toHaveError('Not authorized');
        expect(check099999(accodato, accodato)).toHaveError('Not authorized');
        expect(check123456(accodato)).toHaveError('Not authorized');
      });

      it('should require _id with (codice, data, numero)', function () {
        expect(check({ _id: validId })).not.toHaveError('Invalid type');
        expect(check({ _id: validId })).not.toHaveError('Invalid azienda code');
        expect(check({ _id: validId })).not.toHaveError('Invalid data');
        expect(check({ _id: validId })).not.toHaveError('Invalid numero');
        expect(check({ _id: 'MovimentoMagazzino_12345_20111014_1234' })).toHaveError('Invalid azienda code');
        expect(check({ _id: 'MovimentoMagazzino_123456_20110229_1234' })).toHaveError('Invalid data');
        expect(check({ _id: 'MovimentoMagazzino_123456_20111014_1234A' })).toHaveError('Invalid numero');
      });

      it('should require columnNames to be barcode, and qta', function () {
        var msg = 'Invalid columnNames';
        expect(check({ _id: validId })).toHaveError('Required field: columnNames');
        expect(check({ _id: validId, columnNames: ['barcode', 'qta', 'other'] })).toHaveError(msg);
        expect(check({ _id: validId, columnNames: ['barcode', 'qta'] })).not.toHaveError(msg);
      });

      it('should require causale', function () {
        var xpct, causali = Object.keys(CODICI.CAUSALI_MOVIMENTO_MAGAZZINO);
        expect(check({ _id: validId })).toHaveError('Required: causale');
        causali.forEach(function (causale) {
          xpct = expect(check({ _id: validId, causale: causale }));
          xpct.not.toHaveError('Required: causale');
          xpct.not.toHaveError('Invalid causale');
        });
        expect(check({ _id: validId, causale: causali[0] + 'DUMMY' })).toHaveError('Invalid causale');
      });

      it('should require destinazione if required by causale', function () {
        var segni, xpct, causali = Object.keys(CODICI.CAUSALI_MOVIMENTO_MAGAZZINO);
        causali.forEach(function (causale) {
          segni = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO[causale];
          xpct = expect(check({ _id: validId, causale: causale }));
          if (segni.length === 2) {
            expect(check({ _id: validId, causale: causale, destinazione: '099999' })).not.toHaveError('Invalid destinazione');
            expect(check({ _id: validId, causale: causale, destinazione: '99999' })).toHaveError('Invalid destinazione');
          } else {
            xpct = xpct.not;
          }
          xpct.toHaveError('Required: destinazione');
        });
      });

      it('should require a valid list', function () {
        var msg = 'Elenco vuoto';
        expect(check({ _id: validId })).toHaveError(msg);
        expect(check({ _id: validId, rows: [] })).toHaveError(msg);
        expect(check({ _id: validId, rows: [['12345678901234567', 123]] })).toHaveError('Invalid barcode at row 0: "12345678901234567"');
        expect(check({ _id: validId, rows: [['123456789012345678', -123]] })).toHaveError('Invalid quantity at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', '123']] })).toHaveError('Invalid quantity at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123]] })).not.toHaveError(msg);
      });
    });

    describe('BollaAs400', function () {
      var validId = 'BollaAs400_110704_1234_Y_10';

      it('should require valid _id with (data, numero, ente, codice)', function () {
        var msg = 'Invalid code';
        expect(check({ _id: validId })).not.toHaveError('Invalid type');
        expect(check({ _id: 'BollaAs400_110731_1_G_10' })).not.toHaveError(msg);
        expect(check({ _id: 'BollaAs400_111131_1234_Y_10' })).toHaveError(msg);
      });

      it('should require a row', function () {
        var msg = 'Give a row!';
        expect(check({ _id: validId })).toHaveError(msg);
        expect(check({ _id: validId, rows: [] })).toHaveError(msg);
        expect(check({ _id: validId, rows: [["112708995017800046"]] })).toMatchError(/Invalid row 0/);
        expect(check({ _id: validId, rows: [["11270899501780004", 1]] })).toMatchError(/Invalid barcode at row 0/);
        expect(check({ _id: validId, rows: [["112708995017800046", '1']] })).toMatchError(/Invalid qta at row 0/);
        expect(check({ _id: validId, rows: [["112708995017800046", 1]] })).not.toMatchError(/Invalid[ \w]* row 0/);
      });
    });

    describe('Listino', function () {
      var validId = 'Listino_1_20111003';

      it('should require admin user for writes', function () {
        expect(check({ _id: validId })).not.toHaveError('Not authorized');
        expect(check099999({ _id: validId })).toHaveError('Not authorized');
      });

      it('should require valid _id with (versione, dataUso)', function () {
        var msg = 'Invalid code';
        expect(check({ _id: validId })).not.toHaveError('Invalid type');
        expect(check({ _id: 'Listino_1_20110229' })).toHaveError(msg);
      });

      it('should require an article', function () {
        var msg = 'Listino senza righe valide';
        expect(check({ _id: validId })).toHaveError('Listino vuoto');
        expect(check({ _id: validId, negozio: {} })).toHaveError(msg);
        expect(check({ _id: validId, negozio: { "112708995017": "100" } })).toHaveError(msg);
        expect(check({ _id: validId, negozio: { "112708995017": 100 } })).not.toHaveError(msg);
      });

      it('should check listino outlet when present', function () {
        var msg = 'Invalid price for "112708995017"';
        expect(check({ _id: validId, negozio: { "112708995017": 100 }, outlet: { "112708995017": "100" } })).toHaveError(msg);
        expect(check({ _id: validId, negozio: { "112708995017": 100 }, outlet: { "112708995017": 100 } })).not.toHaveError(msg);
      });
    });

    describe('Giacenze', function () {
      var validId = 'Giacenze';

      it('should require admin user for writes', function () {
        expect(check({ _id: validId })).not.toHaveError('Not authorized');
        expect(check099999({ _id: validId })).toHaveError('Not authorized');
      });

      it('should require columnNames to be barcode, giacenza, azienda, stato, and tipoMagazzino', function () {
        var msg = 'Invalid columnNames';
        expect(check({ _id: validId })).toHaveError('Required field: columnNames');
        expect(check({ _id: validId, columnNames: ['barcode', 'giacenza', 'azienda', 'tipoMagazzino', 'stato'] })).toHaveError(msg);
        expect(check({ _id: validId, columnNames: ['barcode', 'giacenza', 'azienda', 'stato', 'tipoMagazzino'] })).not.toHaveError(msg);
      });

      it('should require a valid inventory', function () {
        var msg = 'Inventario vuoto';
        expect(check({ _id: validId })).toHaveError(msg);
        expect(check({ _id: validId, rows: [] })).toHaveError(msg);
        expect(check({ _id: validId, rows: [['12345678901234567', 123, '123456', 1, 1]] })).toHaveError('Invalid barcode at row 0: "12345678901234567"');
        expect(check({ _id: validId, rows: [['123456789012345678', -123, '123456', 1, 1]] })).toHaveError('Invalid quantity at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', '123', '123456', 1, 1]] })).toHaveError('Invalid quantity at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123, '12345', 1, 1]] })).toHaveError('Invalid azienda at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123, '123456', 2, 1]] })).toHaveError('Invalid status at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123, '123456', 1, 0]] })).toHaveError('Invalid store type at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123, '123456', 1, 1]] })).not.toHaveError(msg);
      });
    });

    describe('Inventario', function () {
      var validId = 'Inventario_099999';

      it('should require columnNames to be barcode, giacenza, and costo', function () {
        var msg = 'Invalid columnNames';
        expect(check({ _id: validId })).toHaveError('Required field: columnNames');
        expect(check({ _id: validId, columnNames: ['barcode', 'costo', 'giacenza'] })).toHaveError(msg);
        expect(check({ _id: validId, columnNames: ['barcode', 'giacenza', 'costo'] })).not.toHaveError(msg);
      });

      it('should require a valid inventory', function () {
        var msg = 'Inventario vuoto';
        expect(check({ _id: validId })).toHaveError(msg);
        expect(check({ _id: validId, rows: [] })).toHaveError(msg);
        expect(check({ _id: validId, rows: [['12345678901234567', 123, 100]] })).toHaveError('Invalid barcode at row 0: "12345678901234567"');
        expect(check({ _id: validId, rows: [['123456789012345678', -123, 100]] })).toHaveError('Invalid quantity at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', '123', 100]] })).toHaveError('Invalid quantity at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123, '100']] })).toHaveError('Invalid costo at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123, -100]] })).toHaveError('Invalid costo at row 0: "123456789012345678"');
        expect(check({ _id: validId, rows: [['123456789012345678', 123, 100]] })).not.toHaveError(msg);
      });
    });


    describe('TaglieScalarini', function () {
      var id = 'TaglieScalarini',
        scalarini = [undefined, 1, 2, 3, 4, 5, 6, 7, 8, 9];

      function expectArrayOfScalarini(field) {
        //TODO this test is not complete
        var msg = field + ' must be of type array',
          doc = { _id: id };
        doc[field] = { '48': '2', '49': '3' };
        expect(check(doc)).toHaveError(msg);
        doc[field] = scalarini;
        expect(check(doc)).not.toHaveError(msg);
      }

      describe('descrizioniTaglie and taglie', function () {
        it('should be required', function () {
          var xpct = expect(check({ _id: id }));
          xpct.toHaveError('Required: descrizioniTaglie');
          xpct.toHaveError('Required: taglie');
        });

        it('should be an array of 10 elements, with the first one undefined (scalarino 0 is not used)', function () {
          expectArrayOfScalarini('descrizioniTaglie');
          expectArrayOfScalarini('taglie');
        });

        it('should have the same information', function () {
          var msg = 'taglie and descrizioniTaglie should be equivalent';
          expect(check({ _id: id, descrizioniTaglie: [{ '01': 'TU' }], taglie: [{ 'TU': '01' }]})).not.toHaveError(msg);
          expect(check({ _id: id, descrizioniTaglie: [{ '01': 'TU' }], taglie: [{ 'TU': '02' }]})).toHaveError(msg);
          expect(check({ _id: id, descrizioniTaglie: [{ '01': 'TU' }], taglie: [{ '01': 'TU' }]})).toHaveError(msg);
        });

      });

      describe('listeDescrizioni', function () {
        it('should be required', function () {
          expect(check({ _id: id })).toHaveError('Required: listeDescrizioni');
        });

        it('should contain the same sizes as in taglie', function () {
          var msg = 'listeDescrizioni not valid';
          expect(check({ _id: id, listeDescrizioni: [['42', '43']]})).toHaveError(msg);
          expect(check({ _id: id, listeDescrizioni: [[], ['42', '43']]})).toHaveError(msg);
          expect(check({
            _id: id,
            listeDescrizioni: [undefined, ['42', '43']],
            taglie: [undefined, { '42': '42', '43': '43' }]
          })).not.toHaveError(msg);
        });
      });

      describe('colonneTaglie', function () {
        it('should be required', function () {
          expect(check({ _id: id })).toHaveError('Required: colonneTaglie');
        });

        it('should contain the same sizes as in descrizioniTaglie', function () {
          var msg = 'colonneTaglie not valid';
          expect(check({ _id: id, colonneTaglie: [{ '42': 0, '43': 1 }]})).toHaveError(msg);
          expect(check({ _id: id, colonneTaglie: [{}, { '42': 0, '43': 1 }]})).toHaveError(msg);
          expect(check({
            _id: id,
            colonneTaglie: [undefined, { '42': 0, '43': 1 }],
            descrizioniTaglie: [undefined, { '42': '42', '43': '43' }]
          })).not.toHaveError(msg);
        });
      });
    });
  });
});
