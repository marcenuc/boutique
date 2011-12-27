/*global describe: false, beforeEach: false, afterEach: false, it: false, xit: false, jasmine: false,
         expect: false, angular: false, CODICI: false */

describe('Service', function () {
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
      scope.SessionInfo = scope.$service('SessionInfo');
      xhrError({}, { status: 500, body: 'Ouch!' });
      expect(scope.SessionInfo.flash).toEqual({ errors: [{ message: 'ERROR 500: Ouch!' }]});
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
          $browser.xhr.expectGET('../as400/bolla/data=110704/numero=40241/enteNumerazione=Y/codiceNumerazione=10').respond(JSON.stringify(intestazioneBolla));
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
    it('should have "roles" === ["boutique"]', function () {
      var userCtx = scope.$service('userCtx');
      expect(userCtx.roles).toEqual(['boutique']);
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
      },

      toBeAuthorized: function () {
        return this.actual.errors.some(function (e) {
          return e.message === 'Not authorized';
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
      expect(angular.service('Validator')({}).check({})).toBeAuthorized();
      expect(angular.service('Validator')({}).check({ _deleted: true })).toBeAuthorized();
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
      var validId = 'MovimentoMagazzino_099999_2011_A_1234',
        check123456 = angular.service('Validator')(ctx123456).check;

      it('should require owner user for writes', function () {
        expect(check({ _id: validId })).not.toBeAuthorized();
        expect(check099999({ _id: validId })).not.toBeAuthorized();
        expect(check123456({ _id: validId })).toBeAuthorized();
      });

      describe('accodato', function () {
        it('should allow setting by non owner only if is admin', function () {
          //TODO
        });

        describe('causale "VENDITA A CLIENTI"', function () {
          var vendita = ['VENDITA A CLIENTI', -1],
            accodatoTrue = { _id: validId, accodato: true, causale: vendita },
            accodatoFalse = { _id: validId, accodato: false, causale: vendita },
            accodatoUndefined = { _id: validId, causale: vendita };

          it('should allow setting it by owner if new document', function () {
            expect(check099999(accodatoTrue)).not.toBeAuthorized();
          });
          it('should allow setting it by owner if not already accodato', function () {
            expect(check099999(accodatoTrue, accodatoFalse)).not.toBeAuthorized();
            expect(check099999(accodatoTrue, accodatoUndefined)).not.toBeAuthorized();
          });
          it('should not allow any change by owner if aready accodato', function () {
            expect(check099999(accodatoFalse, accodatoTrue)).toBeAuthorized();
            expect(check099999(accodatoUndefined, accodatoTrue)).toBeAuthorized();
            expect(check099999(accodatoTrue, accodatoTrue)).toBeAuthorized();
          });
        });
        describe('causale NOT "VENDITA A CLIENTI"', function () {
          it('should require admin user', function () {
            var accodatoTrue = { _id: validId, accodato: true },
              accodatoUndefined = { _id: validId };
            expect(check(accodatoTrue)).not.toBeAuthorized();
            expect(check(accodatoTrue, accodatoUndefined)).not.toBeAuthorized();
            expect(check099999(accodatoTrue)).toBeAuthorized();
            expect(check099999(accodatoUndefined, accodatoTrue)).toBeAuthorized();
            expect(check099999(accodatoTrue, accodatoUndefined)).toBeAuthorized();
            expect(check099999(accodatoTrue, accodatoTrue)).toBeAuthorized();
            expect(check123456(accodatoTrue)).toBeAuthorized();
          });
        });
      });

      it('should require _id with (codice, anno, gruppo, numero)', function () {
        expect(check({ _id: validId })).not.toHaveError('Invalid type');
        expect(check({ _id: validId })).not.toHaveError('Invalid azienda code');
        expect(check({ _id: validId })).not.toHaveError('Invalid year');
        expect(check({ _id: validId })).not.toHaveError('Invalid gruppo');
        expect(check({ _id: validId })).not.toHaveError('Invalid numero');
        expect(check({ _id: 'MovimentoMagazzino_123456_2011_1234' })).toHaveError('Invalid code');
        expect(check({ _id: 'MovimentoMagazzino_12345_2011_A_1234' })).toHaveError('Invalid azienda code');
        expect(check({ _id: 'MovimentoMagazzino_123456_201I_A_1234' })).toHaveError('Invalid year');
        expect(check({ _id: 'MovimentoMagazzino_123456_2011_1_1234' })).toHaveError('Invalid gruppo');
        expect(check({ _id: 'MovimentoMagazzino_123456_2011_A_1234A' })).toHaveError('Invalid numero');
      });

      it('should require columnNames to be barcode, scalarino, descrizioneTaglia, descrizione, costo, and qta', function () {
        var msg = 'Invalid columnNames';
        expect(check({ _id: validId })).toHaveError('Required field: columnNames');
        expect(check({ _id: validId, columnNames: ['barcode', 'qta', 'other'] })).toHaveError(msg);
        expect(check({ _id: validId, columnNames: ['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta'] })).not.toHaveError(msg);
      });

      describe('data', function () {
        var msg = 'Invalid data';

        it('should require it to be valid', function () {
          expect(check({ _id: validId })).toHaveError(msg);
          expect(check({ _id: validId, data: '20111017' })).not.toHaveError(msg);
          expect(check({ _id: validId, data: '20110229' })).toHaveError(msg);
        });

        it('should have the same year as in _id', function () {
          expect(check({ _id: validId, data: '20111017' })).not.toHaveError(msg);
          expect(check({ _id: validId, data: '20101017' })).toHaveError(msg);
        });
      });

      describe('causale', function () {
        var msg = 'Invalid causale';
        it('should be required', function () {
          expect(check({ _id: validId })).toHaveError(msg);
        });

        it('should be coupled with causaleA only when needed', function () {
          var causali = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO;
          causali.forEach(function (causale) {
            var id = CODICI.idMovimentoMagazzino('010101', '2011', causale.gruppo, 1),
              causaleA = causali[causale.causaleA],
              doc = { _id: id, causale: [causale.descrizione, causale.segno] };
            if (causaleA) {
              expect(check(doc)).toHaveError(msg);
              doc.a = '020202';
              doc.causaleA = [causaleA.descrizione, causaleA.segno];
            }
            expect(check(doc)).not.toHaveError(msg);
          });
        });

        it('should be rejected when unknown', function () {
          expect(check({ _id: validId, causale: ['XXX', 1] })).toHaveError(msg);
        });
      });

      describe('causaleA', function () {
        var msg = 'Invalid causale';
        it('should be rejected when unknown', function () {
          var causale = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO[0],
            c = [causale.descrizione, causale.segno];
          expect(check({ _id: validId, causale: c, causaleA: c })).toHaveError(msg);
        });
      });

      it('should require a if required by causale', function () {
        var causali = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO,
          msg = 'Invalid a';
        causali.forEach(function (causale) {
          var c = [causale.descrizione, causale.segno];
          if (causale.hasOwnProperty('causaleA')) {
            expect(check({ _id: validId, causale: c, a: '099999' })).not.toHaveError(msg);
            expect(check({ _id: validId, causale: c, a: '99999' })).toHaveError(msg);
          } else {
            expect(check({ _id: validId, causale: c })).not.toHaveError(msg);
          }
        });
      });

      describe('tipoMagazzino and tipoMagazzinoA', function () {
        var msg = 'Invalid tipoMagazzino', msgA = 'Invalid tipoMagazzinoA';
        it('should be undefined, 1, 2, or 3', function () {
          expect(check({ _id: validId })).not.toHaveError(msg);
          expect(check({ _id: validId, tipoMagazzino: 1 })).not.toHaveError(msg);
          expect(check({ _id: validId, tipoMagazzino: 2 })).not.toHaveError(msg);
          expect(check({ _id: validId, tipoMagazzino: 3 })).not.toHaveError(msg);
          expect(check({ _id: validId, tipoMagazzino: 4 })).toHaveError(msg);
          expect(check({ _id: validId, tipoMagazzino: 0 })).toHaveError(msg);
          expect(check({ _id: validId })).not.toHaveError(msgA);
          expect(check({ _id: validId, tipoMagazzinoA: 1 })).not.toHaveError(msgA);
          expect(check({ _id: validId, tipoMagazzinoA: 2 })).not.toHaveError(msgA);
          expect(check({ _id: validId, tipoMagazzinoA: 3 })).not.toHaveError(msgA);
          expect(check({ _id: validId, tipoMagazzinoA: 4 })).toHaveError(msgA);
          expect(check({ _id: validId, tipoMagazzinoA: 0 })).toHaveError(msgA);
        });
      });

      describe('inProduzione', function () {
        var msg = 'Invalid inProduzione';
        it('should be undefined, or 1', function () {
          expect(check({ _id: validId })).not.toHaveError(msg);
          expect(check({ _id: validId, inProduzione: 1 })).not.toHaveError(msg);
          expect(check({ _id: validId, inProduzione: 0 })).toHaveError(msg);
          expect(check({ _id: validId, inProduzione: 2 })).toHaveError(msg);
        });
      });

      describe('rows', function () {
        it('should be required', function () {
          expect(check({ _id: validId })).toHaveError('Invalid rows');
        });

        describe('row', function () {
          it('should have valid barcode', function () {
            expect(check({ _id: validId, rows: [['12345678901234567']] })).toHaveError('Invalid barcode[0]: "12345678901234567"');
            expect(check({ _id: validId, rows: [['123456789012345678']] })).not.toMatchError(/^Invalid barcode\[0\]/);
          });

          it('should have valid scalarino', function () {
            expect(check({ _id: validId, rows: [['105984271346730001', 'a']] })).toHaveError('Invalid scalarino[0]: "a"');
            expect(check({ _id: validId, rows: [['105984271346730001', 1]] })).not.toMatchError(/^Invalid scalarino\[0\]/);
          });

          it('should have valid descrizioneTaglia', function () {
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 12]] })).toHaveError('Invalid descrizioneTaglia[0]: "12"');
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 'TU']] })).not.toMatchError(/^Invalid descrizioneTaglia\[0\]/);
          });

          it('should have valid descrizione', function () {
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 'TU', '']] })).toHaveError('Invalid descrizione[0]: ""');
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 'TU', 'Bretelle']] })).not.toMatchError(/^Invalid descrizione\[0\]/);
          });

          it('should have valid costo', function () {
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 'TU', 'Bretelle', 12.34]] })).toHaveError('Invalid costo[0]: "12.34"');
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 'TU', 'Bretelle', 1234]] })).not.toMatchError(/^Invalid costo\[0\]/);
          });

          it('should have valid qta', function () {
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 'TU', 'Bretelle', 1234, 1.2]] })).toHaveError('Invalid qta[0]: "1.2"');
            expect(check({ _id: validId, rows: [['105984271346730001', 1, 'TU', 'Bretelle', 1234, 10]] })).not.toMatchError(/^Invalid qta\[0\]/);
          });
        });
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
      var validId = 'Listino_1',
        columnNames = ['costo', 'prezzo1', 'prezzo2', 'offerta'];

      it('should require admin user for writes', function () {
        expect(check({ _id: validId })).not.toBeAuthorized();
        expect(check099999({ _id: validId })).toBeAuthorized();
      });

      it('should require valid _id with (versione)', function () {
        var msg = 'Invalid code';
        expect(check({ _id: validId })).not.toHaveError('Invalid type');
        expect(check({ _id: 'Listino_a' })).toHaveError(msg);
      });

      it('should not be empty if without versioneBase', function () {
        var msg = 'Listino vuoto';
        expect(check({ _id: validId })).toHaveError(msg);
        expect(check({ _id: validId, prezzi: {} })).toHaveError(msg);
        expect(check({ _id: validId, versioneBase: '2', prezzi: {} })).not.toHaveError(msg);
        expect(check({ _id: validId, prezzi: { '112708995017': [100] } })).not.toHaveError(msg);
      });

      it('should require columnNames to be costo, prezzo1, prezzo2, and offerta', function () {
        var msg = 'Invalid columnNames';
        expect(check({ _id: validId })).toHaveError('Required field: columnNames');
        expect(check({ _id: validId, columnNames: ['costo', 'prezzo1', 'prezzo2'] })).toHaveError(msg);
        expect(check({ _id: validId, columnNames: columnNames })).not.toHaveError(msg);
      });

      describe('field versioneBase', function () {
        it('should contain a valid versione listino', function () {
          var msg = 'Invalid versioneBase';
          expect(check({ _id: validId, versioneBase: 'abc' })).toHaveError(msg);
          expect(check({ _id: validId, versioneBase: '2' })).not.toHaveError(msg);
        });

        it('should NOT be equal to versione in _id', function () {
          var msg = 'Invalid versioneBase';
          expect(check({ _id: validId, versioneBase: '1' })).toHaveError(msg);
        });
      });

      describe('valid row', function () {
        it('should require valid stagione', function () {
          var msgp = /Invalid stagione/i;
          expect(check({ _id: validId, columnNames: columnNames, prezzi: { '1234': { '12345': { '1234': [] } } }})).toMatchError(msgp);
          expect(check({ _id: validId, columnNames: columnNames, prezzi: { '123': { '12345': { '1234': [] } } }})).not.toMatchError(msgp);
        });

        it('should require valid modello', function () {
          var msgp = /Invalid modello/i;
          expect(check({ _id: validId, columnNames: columnNames, prezzi: { '123': { '123456': { '1234': [] } } }})).toMatchError(msgp);
          expect(check({ _id: validId, columnNames: columnNames, prezzi: { '123': { '12345': { '1234': [] } } }})).not.toMatchError(msgp);
        });

        it('should require valid articolo', function () {
          var msgp = /Invalid articolo/i;
          expect(check({ _id: validId, columnNames: columnNames, prezzi: { '123': { '12345': { '12345': [] } } }})).toMatchError(msgp);
          expect(check({ _id: validId, columnNames: columnNames, prezzi: { '123': { '12345': { '1234': [] } } }})).not.toMatchError(msgp);
        });

        it('should be an array with [costo, prezzo1, prezzo2, offerta] (offerta is optional string)', function () {
          var msgp = /Invalid row/i;
          expect(check({ _id: validId, prezzi: { '112': { '70899': { '5017': ['100'] } } } })).toMatchError(msgp);
          expect(check({ _id: validId, prezzi: { '112': { '70899': { '5017': [100, '*'] } } } })).toMatchError(msgp);
          expect(check({ _id: validId, prezzi: { '112': { '70899': { '5017': [100, 200, '*'] } } } })).toMatchError(msgp);
          expect(check({ _id: validId, prezzi: { '112': { '70899': { '5017': [100, 190] } } } })).toMatchError(msgp);
          expect(check({ _id: validId, prezzi: { '112': { '70899': { '5017': [50, 100, 190, '*'] } } } })).not.toMatchError(msgp);
          expect(check({ _id: validId, prezzi: { '112': { '70899': { '5017': [50, 100, 90] } } } })).not.toMatchError(msgp);
        });
      });
    });

    describe('Giacenze', function () {
      var validId = 'Giacenze';

      it('should require admin user for writes', function () {
        expect(check({ _id: validId })).not.toBeAuthorized();
        expect(check099999({ _id: validId })).toBeAuthorized();
      });

      it('should require columnNames to be stagione, modello, articolo, colore, codiceAzienda, inProduzione, tipoMagazzino, giacenze', function () {
        var msg = 'Invalid columnNames';
        expect(check({ _id: validId })).toHaveError('Required field: columnNames');
        expect(check({ _id: validId, columnNames: ['barcode', 'giacenza', 'azienda', 'tipoMagazzino', 'stato'] })).toHaveError(msg);
        expect(check({ _id: validId, columnNames: ['stagione', 'modello', 'articolo', 'colore', 'codiceAzienda', 'inProduzione', 'tipoMagazzino', 'giacenze'] })).not.toHaveError(msg);
      });

      it('should require a valid inventory', function () {
        var msg = 'Inventario vuoto', msgp = /Invalid \w+\[0\]: /;
        expect(check({ _id: validId })).toHaveError(msg);
        expect(check({ _id: validId, rows: [] })).toHaveError(msg);
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 1, 2, { '01': 1 }]] })).not.toHaveError(msg);
        expect(check({ _id: validId, rows: [['', '45678', '9012', '3456', '123456', 1, 1, { '01': 1 }]] })).toHaveError('Invalid stagione[0]: ""');
        expect(check({ _id: validId, rows: [['123', '345678', '9012', '3456', '123456', 1, 1, { '01': 1 }]] })).toHaveError('Invalid modello[0]: "345678"');
        expect(check({ _id: validId, rows: [['123', '45678', '0a', '3456', '123456', 1, 1, { '01': 1 }]] })).toHaveError('Invalid articolo[0]: "0a"');
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '34567', '123456', 1, 1, { '01': 1 }]] })).toHaveError('Invalid colore[0]: "34567"');
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 1, 1, { '012': 1 }]] })).toHaveError('Invalid taglia[0]: "012"');
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 1, 1, { '01': -1 }]] })).not.toMatchError(msgp);
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 1, 1, { '01': 0 }]] })).toHaveError('Invalid qta[0]: "0"');
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 1, 1, { '01': 1 }]] })).not.toMatchError(msgp);
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '12345', 1, 1, { '01': 1 }]] })).toHaveError('Invalid codiceAzienda[0]: "12345"');
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 2, 1, { '01': 1 }]] })).toHaveError('Invalid inProduzione[0]: "2"');
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 0, 1, { '01': 1 }]] })).not.toMatchError(msgp);
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 1, 0, { '01': 1 }]] })).toHaveError('Invalid tipoMagazzino[0]: "0"');
        expect(check({ _id: validId, rows: [['123', '45678', '9012', '3456', '123456', 1, 2, { '01': 1 }]] })).not.toMatchError(msgp);
      });
    });

    describe('Inventario', function () {
      var validId = 'Inventario',
        columnNames = ['modello', 'articolo', 'colore', 'stagione', 'da', 'inProduzione', 'tipoMagazzino',
                       'scalarino', 'taglia', 'descrizioneTaglia', 'descrizione', 'qta'];

      it('should require admin user for writes', function () {
        expect(check({ _id: validId })).not.toBeAuthorized();
        expect(check099999({ _id: validId })).toBeAuthorized();
      });

      it('should require columnNames to be ' + columnNames.join(', '), function () {
        var msg = 'Invalid columnNames';
        expect(check({ _id: validId })).toHaveError('Required field: columnNames');
        expect(check({ _id: validId, columnNames: ['barcode', 'costo', 'giacenza', 'inProduzione'] })).toHaveError(msg);
        expect(check({ _id: validId, columnNames: columnNames })).not.toHaveError(msg);
      });

      it('should require a valid inventory', function () {
        var msg = 'Invalid rows', msgp = /Invalid \w+\[0\]: "[\-A-Z0-9]*"$/;
        expect(check({ _id: validId })).toHaveError(msg);
        expect(check({ _id: validId, rows: [] })).toHaveError(msg);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 2, 6, '01', 'TU', 'MUTANDA', 1]] })).not.toHaveError(msg);
        expect(check({ _id: validId, rows: [['456780', '9012', '3456', '123', '123456', 0, 2, 6, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '19012', '3456', '123', '123456', 0, 2, 6, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '34560', '123', '123456', 0, 2, 6, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '1234', '123456', 0, 2, 6, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '12345', 0, 2, 6, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 2, 2, 6, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 0, 6, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 2, 0, '01', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 2, 6, '012', 'TU', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 2, 6, '01', '', 'MUTANDA', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 2, 6, '01', 'TU', '', 1]] })).toMatchError(msgp);
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 2, 6, '01', 'TU', 'MUTANDA', 0]] })).toMatchError(msgp);
      });

      it('should allow negative values of qta', function () {
        expect(check({ _id: validId, rows: [['45678', '9012', '3456', '123', '123456', 0, 2, 6, '01', 'TU', 'MUTANDA', -1]] })).not.toHaveError('Invalid qta[0]: "-1"');
      });
    });

    describe('CausaliMovimentoMagazzino', function () {
      var id = 'CausaliMovimentoMagazzino';

      describe('causali', function () {
        var causali = [['VENDITA', -1, 0]];

        it('should be a non empty array', function () {
          var msg = 'Invalid causali';
          expect(check({ _id: id })).toHaveError(msg);
          expect(check({ _id: id, causali: [] })).toHaveError(msg);
          expect(check({ _id: id, causali: causali })).not.toHaveError(msg);
        });

        describe('causale', function () {
          it('should be an array of 3 elements: [name, {-1|1}, {-1|0|1}]', function () {
            var msg = 'Invalid causale: ', c;
            c = [['VENDITA', 0, 1]];
            expect(check({ _id: id, causali: c })).toHaveError(msg + JSON.stringify(c[0]));
            c = [['VENDITA', -1]];
            expect(check({ _id: id, causali: c })).toHaveError(msg + JSON.stringify(c[0]));
            c = causali;
            expect(check({ _id: id, causali: c })).not.toHaveError(msg + JSON.stringify(c[0]));
          });
        });

        describe('causaliAs400', function () {
          it('should be an hash', function () {
            var msg = 'Invalid causaliAs400';
            expect(check({ _id: id, causali: causali })).toHaveError(msg);
            expect(check({ _id: id, causali: causali, causaliAs400: {} })).not.toHaveError(msg);
          });

          it('should map codici causaleAs400 to causale in causali', function () {
            var msg = 'Invalid causale for 1-75: ';
            expect(check({ _id: id, causali: causali, causaliAs400: { '1-75': 'VENDITE' } })).toHaveError(msg + 'VENDITE');
            expect(check({ _id: id, causali: causali, causaliAs400: { '1-75': 'VENDITA' } })).not.toHaveError(msg + 'VENDITA');
          });

          it('should have keys in the format "tipoMagazzino-codiceCausaleAs400"', function () {
            var msg = 'Invalid codice causale As400: ';
            expect(check({ _id: id, causali: causali, causaliAs400: { '1-1': 'VENDITA' } })).toHaveError(msg + '1-1');
            expect(check({ _id: id, causali: causali, causaliAs400: { '2-12': 'VENDITA' } })).not.toHaveError(msg + '1-12');
          });
        });
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
