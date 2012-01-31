/*global describe:false, beforeEach:false, afterEach:false, it:false, expect:false, module:false, inject:false, angular:false*/
describe('Validation', function () {
  'use strict';
  beforeEach(module('app.validators'));
  beforeEach(module('app.shared'));

  function regExpEscape(str) {
    return str.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  beforeEach(function () {
    this.addMatchers({
      toHaveError: function (expected) {
        return this.actual.errors.some(function (e) {
          return e.message === expected;
        });
      },

      toMatchError: function (expected) {
        return this.actual.errors.some(function (e) {
          return new RegExp('^' + regExpEscape(expected)).test(e.message);
        });
      },

      toBeAuthorized: function () {
        return this.actual.errors.every(function (e) {
          return e.message !== 'Not authorized';
        });
      }
    });
  });

  var anonymous = Object.freeze({}),
    other = Object.freeze({ name: '011111', roles: ['azienda'] }),
    owner = Object.freeze({ name: '099999', roles: ['azienda'] }),
    admin = Object.freeze({ name: 'boutique', roles: ['boutique'] });

  describe('of update authorization', function () {
    describe('on Azienda', function () {
      var doc = { _id: 'Azienda_' + owner.name, nome: owner.name },
        docDeleted = { _id: 'Azienda_' + owner.name, _deleted: true };

      describe('for anonymous user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', anonymous);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for other user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', other);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for owner user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', owner);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for admin user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', admin);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).toBeAuthorized();
        }));
      });
    });

    describe('on Cliente', function () {
      var doc = { _id: 'Cliente_' + owner.name + '_1', nome: owner.name },
        docDeleted = { _id: 'Cliente_' + owner.name + '_1', _deleted: true };

      describe('for anonymous user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', anonymous);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for other user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', other);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for owner user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', owner);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for admin user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', admin);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).toBeAuthorized();
        }));
      });
    });

    describe('on TaglieScalarini', function () {
      var doc = { _id: 'TaglieScalarini' },
        docDeleted = { _id: 'TaglieScalarini', _deleted: true };

      describe('for anonymous user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', anonymous);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for other user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', other);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for owner user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', owner);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for admin user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', admin);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).toBeAuthorized();
        }));
      });
    });

    describe('on ModelliEScalarini', function () {
      var doc = { _id: 'ModelliEScalarini' },
        docDeleted = { _id: 'ModelliEScalarini', _deleted: true };

      describe('for anonymous user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', anonymous);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for other user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', other);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for owner user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', owner);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for admin user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', admin);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).toBeAuthorized();
        }));
      });
    });

    describe('on Giacenze', function () {
      var doc = { _id: 'ModelliEScalarini' },
        docDeleted = { _id: 'ModelliEScalarini', _deleted: true };

      describe('for anonymous user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', anonymous);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for other user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', other);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for owner user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', owner);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for admin user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', admin);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).toBeAuthorized();
        }));
      });
    });

    describe('on MovimentoMagazzino', function () {
      var id = 'MovimentoMagazzino_' + owner.name + '_2012_D_1',
        doc = { _id: id },
        docDeleted = { _id: id, _deleted: true };

      describe('for anonymous user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', anonymous);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for other user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', other);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for owner user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', owner);
        }));

        describe('when causale is "VENDITA A CLIENTI"', function () {
          it('should be authorized if not already accodato', inject(function (validate, codici) {
            var venditaAClienti = codici.newMovimentoMagazzino(owner.name, '20111231', 1,
              codici.findCausaleMovimentoMagazzino('VENDITA A CLIENTI'));
            expect(validate(venditaAClienti)).toBeAuthorized();
            venditaAClienti._deleted = true;
            expect(validate(venditaAClienti)).not.toBeAuthorized();
          }));

          it('should not be authorized if already accodato', inject(function (validate, codici) {
            var causale = codici.findCausaleMovimentoMagazzino('VENDITA A CLIENTI'),
              venditaAClienti = codici.newMovimentoMagazzino(owner.name, '20111231', 1, causale),
              venditaAClientiAccodata = angular.copy(venditaAClienti);
            venditaAClientiAccodata.accodato = true;
            expect(validate(venditaAClienti, venditaAClientiAccodata)).not.toBeAuthorized();
          }));
        });

        describe('when causale is not "VENDITA A CLIENTI"', function () {
          it('should not be authorized', inject(function (validate, codici) {
            var vendita = codici.newMovimentoMagazzino(owner.name, '20111231', 1,
              codici.findCausaleMovimentoMagazzino('VENDITA'));
            expect(validate(vendita)).not.toBeAuthorized();
            vendita._deleted = true;
            expect(validate(vendita)).not.toBeAuthorized();

            expect(validate(doc)).not.toBeAuthorized();
            expect(validate(docDeleted)).not.toBeAuthorized();
          }));
        });
      });

      describe('for admin user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', admin);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).toBeAuthorized();
        }));
      });
    });

    describe('on Listino', function () {
      var doc = { _id: 'Listino_' + owner.name },
        docDeleted = { _id: 'Listino_' + owner.name, _deleted: true };

      describe('for anonymous user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', anonymous);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for other user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', other);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for owner user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', owner);
        }));

        it('should not be authorized', inject(function (validate) {
          expect(validate(doc)).not.toBeAuthorized();
          expect(validate(docDeleted)).not.toBeAuthorized();
        }));
      });

      describe('for admin user', function () {
        beforeEach(module('app.services', function ($provide) {
          $provide.value('userCtx', admin);
        }));

        it('should be authorized', inject(function (validate) {
          expect(validate(doc)).toBeAuthorized();
          expect(validate(docDeleted)).toBeAuthorized();
        }));
      });
    });
  });

  describe('of type', function () {
    beforeEach(module('app.services', function ($provide) {
      $provide.value('userCtx', admin);
    }));

    function expectRequired(validate, doc, field, validValues, invalidValues) {
      var msg = 'Required: ' + field,
        invalids = ['', ' ', null].concat(invalidValues || []);
      delete doc[field];
      expect(validate(doc)).toHaveError(msg);
      (validValues || ['not empty value']).forEach(function (v) {
        doc[field] = v;
        expect(validate(doc)).not.toHaveError(msg);
      });
      invalids.forEach(function (v) {
        doc[field] = v;
        expect(validate(doc)).toHaveError(msg);
      });
    }

    describe('Azienda', function () {
      var doc = null;
      beforeEach(function () {
        doc = { _id: 'Azienda_' + owner.name };
      });

      it('should have valid owner', inject(function (validate) {
        expect(validate({ _id: 'Azienda_1' })).toHaveError('Invalid azienda code');
      }));

      it('should require nome', inject(function (validate) {
        expectRequired(validate, doc, 'nome', ['ciao', 'Azienda 1'], [1]);
      }));

      it('should require tipo NEGOZIO or MAGAZZINO', inject(function (validate) {
        expectRequired(validate, doc, 'tipo', ['NEGOZIO', 'MAGAZZINO'], ['altro']);
      }));
    });

    describe('Cliente', function () {
      var doc = null;
      beforeEach(function () {
        doc = { _id: 'Cliente_' + owner.name + '_1' };
      });

      it('should have valid owner', inject(function (validate) {
        expect(validate({ _id: 'Cliente_1_1' })).toHaveError('Invalid azienda code');
      }));

      it('should require nome', inject(function (validate) {
        expectRequired(validate, doc, 'nome', ['ciao', 'Azienda 1'], [1]);
      }));
    });

    describe('TaglieScalarini', function () {
      var doc = null;
      beforeEach(function () {
        doc = {
          _id: 'TaglieScalarini',
          taglie: [null, { '48': '48', '49': '49' }, { 'TU': '01' }],
          descrizioniTaglie: [null, { '48': '48', '49': '49' }, { '01': 'TU' }],
          listeDescrizioni: [null, ['48', '49'], ['TU']],
          colonneTaglie: [null, { '48': 0, '49': 1 }, { '01': 0 }]
        };
      });

      it('should require descrizioniTaglie', inject(function (validate) {
        expectRequired(validate, doc, 'descrizioniTaglie', [[null, { '48': '48', '49': '49' }, { '01': 'TU' }]], ['48', 48]);
      }));

      it('should require taglie', inject(function (validate) {
        expectRequired(validate, doc, 'taglie', [[null, { '48': '48', '49': '49' }, { 'TU': '01' }]], ['01', 1]);
      }));

      it('should require listeDescrizioni', inject(function (validate) {
        expectRequired(validate, doc, 'listeDescrizioni', [[null, ['48', '49'], ['TU']]], ['48', '49']);
      }));

      it('should require colonneTaglie', inject(function (validate) {
        expectRequired(validate, doc, 'colonneTaglie', [[null, { '48': 0, '49': 1 }, { '01': 0 }]], ['48']);
      }));

      it('should require descrizioneTaglie equivalent to taglie', inject(function (validate) {
        var msg1 = 'descrizioniTaglie and taglie should be equivalent',
          msg2 = 'taglie and descrizioniTaglie should be equivalent';
        expect(validate(doc)).not.toHaveError(msg1);
        expect(validate(doc)).not.toHaveError(msg2);
        doc.taglie = [null, { '48': '48', '50': '50' }, { 'TU': '01' }];
        expect(validate(doc)).toHaveError(msg1);
        expect(validate(doc)).toHaveError(msg2);
      }));
    });

    describe('ModelliEScalarini', function () {
      var doc = null;
      beforeEach(function () {
        doc = { _id: 'ModelliEScalarini' };
      });

      it('should require lista', inject(function (validate) {
        expectRequired(validate, doc, 'lista', [ { '10110102': ['CRAVATTA CM 8,5', 3], '10110103': ['CRAVATTA CM 9', 3] }], ['48', 48]);
      }));
    });

    describe('Giacenze', function () {
      var doc = null;
      beforeEach(function () {
        doc = { _id: 'Giacenze' };
      });

      it('should require columnNames', inject(function (validate, codici) {
        expectRequired(validate, doc, 'columnNames', [codici.COLUMN_NAMES.Giacenze], [codici.COLUMN_NAMES.MovimentoMagazzino]);
      }));

      it('should not be empty', inject(function (validate) {
        expect(validate(doc)).toHaveError('Inventario vuoto');
      }));

      describe('row', function () {
        beforeEach(function () {
          doc.rows = [['101', '60547', '8000', '5000', '099999', 0, 3, { '01': 1 }]];
        });

        describe('column 0', function () {
          var msg = 'Invalid stagione[0]: "';
          it('should be valid stagione', inject(function (validate) {
            expect(validate(doc)).not.toMatchError(msg);
            doc.rows[0][0] = '1234';
            expect(validate(doc)).toHaveError(msg + '1234"');
          }));
        });

        describe('column 1', function () {
          var msg = 'Invalid modello[0]: "';
          it('should be valid modello', inject(function (validate) {
            expect(validate(doc)).not.toMatchError(msg);
            doc.rows[0][1] = '123456';
            expect(validate(doc)).toHaveError(msg + '123456"');
          }));
        });

        describe('column 2', function () {
          var msg = 'Invalid articolo[0]: "';
          it('should be valid articolo', inject(function (validate) {
            expect(validate(doc)).not.toMatchError(msg);
            doc.rows[0][2] = '12345';
            expect(validate(doc)).toHaveError(msg + '12345"');
          }));
        });

        describe('column 3', function () {
          var msg = 'Invalid colore[0]: "';
          it('should be valid colore', inject(function (validate) {
            expect(validate(doc)).not.toMatchError(msg);
            doc.rows[0][3] = '12345';
            expect(validate(doc)).toHaveError(msg + '12345"');
          }));
        });

        describe('column 4', function () {
          var msg = 'Invalid codiceAzienda[0]: "';
          it('should be valid stagione', inject(function (validate) {
            expect(validate(doc)).not.toMatchError(msg);
            doc.rows[0][4] = '1234';
            expect(validate(doc)).toHaveError(msg + '1234"');
          }));
        });

        describe('column 5', function () {
          var msg = 'Invalid inProduzione[0]: "';
          it('should be valid stagione', inject(function (validate) {
            expect(validate(doc)).not.toMatchError(msg);
            doc.rows[0][5] = '2';
            expect(validate(doc)).toHaveError(msg + '2"');
          }));
        });

        describe('column 6', function () {
          var msg = 'Invalid tipoMagazzino[0]: "';
          it('should be valid tipoMagazzino', inject(function (validate) {
            expect(validate(doc)).not.toMatchError(msg);
            doc.rows[0][6] = '0';
            expect(validate(doc)).toHaveError(msg + '0"');
          }));
        });
      });
      //FIXME test rows validation.
    });

    describe('MovimentoMagazzino', function () {
      describe('_id', function () {
        it('should have valid owner', inject(function (validate) {
          var doc = { _id: 'MovimentoMagazzino_12345_2012_D_1' };
          expect(validate(doc)).toHaveError('Invalid azienda code');
        }));

        it('should have valid year as 2nd code', inject(function (validate) {
          var doc = { _id: 'MovimentoMagazzino_123456_201_D_1' };
          expect(validate(doc)).toHaveError('Invalid year');
        }));

        it('should have valid gruppo causale as 3rd code', inject(function (validate) {
          var doc = { _id: 'MovimentoMagazzino_123456_2012_1_1' };
          expect(validate(doc)).toHaveError('Invalid gruppo');
        }));

        it('should have valid numero as 4th code', inject(function (validate) {
          var doc = { _id: 'MovimentoMagazzino_123456_2012_D_A' };
          expect(validate(doc)).toHaveError('Invalid numero');
        }));
      });

      function newDoc(codici) {
        return codici.newMovimentoMagazzino(owner.name, '20111231', 1, codici.findCausaleMovimentoMagazzino('VENDITA'), other.name);
      }

      it('should require columnNames', inject(function (validate, codici) {
        expectRequired(validate, newDoc(codici), 'columnNames', [codici.COLUMN_NAMES.MovimentoMagazzino], [codici.COLUMN_NAMES.Giacenze]);
      }));

      it('should require accodato if oldDoc.accodato', inject(function (validate, codici) {
        var oldDoc = newDoc(codici), doc = angular.copy(oldDoc);
        oldDoc.accodato = true;
        expect(validate(doc, oldDoc)).toHaveError('Invalid accodato');
      }));

      it('should accept esterno1=1', inject(function (validate, codici) {
        var msg = 'Invalid esterno1/2', doc = newDoc(codici);
        expect(validate(doc)).not.toHaveError(msg);
        doc.esterno1 = 1;
        expect(validate(doc)).not.toHaveError(msg);
        doc.esterno1 = 0;
        expect(validate(doc)).toHaveError(msg);
      }));

      it('should accept esterno2=1', inject(function (validate, codici) {
        var msg = 'Invalid esterno1/2', doc = newDoc(codici);
        expect(validate(doc)).not.toHaveError(msg);
        doc.esterno2 = 1;
        expect(validate(doc)).not.toHaveError(msg);
        doc.esterno2 = 0;
        expect(validate(doc)).toHaveError(msg);
      }));

      describe('data', function () {
        var msg = 'Invalid data';
        it('should be valid', inject(function (validate, codici) {
          var doc = newDoc(codici);
          expect(validate(doc)).not.toHaveError(msg);
          doc.data = '20113112';
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should have same year as in _id', inject(function (validate, codici) {
          var doc = newDoc(codici);
          doc.data = '20120101';
          expect(validate(doc)).toHaveError(msg);
        }));
      });

      describe('causale', function () {
        var msg = 'Invalid causale';
        it('should be set', inject(function (validate, codici) {
          var doc = newDoc(codici);
          delete doc.causale1;
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should exist in codici.CAUSALI_MOVIMENTO_MAGAZZINO', inject(function (validate, codici) {
          var doc = newDoc(codici);
          doc.causale1[0] = 'DUMMY VALUE';
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should be in gruppo from _id', inject(function (validate, codici) {
          var causale = codici.findCausaleMovimentoMagazzino('VENDITA A CLIENTI'),
            doc = codici.newMovimentoMagazzino(owner.name, '20111231', 1, causale, other.name),
            otherCausale = codici.findCausaleMovimentoMagazzino('RETTIFICA INVENTARIO +');
          // sanity check
          expect(otherCausale.gruppo).not.toEqual(causale.gruppo);
          doc.causale1 = [otherCausale.descrizione, otherCausale.segno];
          expect(validate(doc)).toHaveError(msg);
        }));
      });

      describe('causale2', function () {
        var msg = 'Invalid causale';
        it('should be set if causale has causale2', inject(function (validate, codici) {
          var doc = newDoc(codici);
          // sanity check
          expect(Object.prototype.toString.call(doc.causale2)).toBe('[object Array]');
          delete doc.causale2;
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should not be set if causale has no causale2', inject(function (validate, codici) {
          var causale = codici.findCausaleMovimentoMagazzino('VENDITA A CLIENTI'),
            doc = codici.newMovimentoMagazzino(owner.name, '20111231', 1, causale, other.name);
          // sanity check
          expect(causale.causale2).toBeUndefined();
          doc.causale2 = doc.causale;
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should be set to the corresponding causale2', inject(function (validate, codici) {
          var causale = codici.findCausaleMovimentoMagazzino('VENDITA'),
            doc = codici.newMovimentoMagazzino(owner.name, '20111231', 1, causale, other.name);
          // sanity check
          expect(doc.causale2).toEqual(['ACQUISTO', 1]);
          doc.causale2[1] = -1;
          expect(validate(doc)).toHaveError(msg);
        }));
      });

      describe('magazzino2', function () {
        var msg = 'Invalid magazzino2';
        it('should not be set if causale has no causale2', inject(function (validate, codici) {
          var causale = codici.findCausaleMovimentoMagazzino('VENDITA A CLIENTI'),
            doc = codici.newMovimentoMagazzino(owner.name, '20111231', 1, causale, other.name);
          // sanity check
          expect(causale.causale2).toBeUndefined();
          doc.magazzino2 = '020202';
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should be set if causale has causale2', inject(function (validate, codici) {
          var doc = newDoc(codici);
          // sanity check
          expect(Object.prototype.toString.call(doc.causale2)).toBe('[object Array]');
          delete doc.magazzino2;
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should be a valid azienda codice', inject(function (validate, codici) {
          var doc = newDoc(codici);
          // sanity check
          expect(Object.prototype.toString.call(doc.causale2)).toBe('[object Array]');
          doc.magazzino2 = '12345';
          expect(validate(doc)).toHaveError(msg);
        }));
      });

      describe('tipoMagazzino', function () {
        function shouldAcceptTipoMagazzino(field, validate, codici) {
          var msg = 'Invalid ' + field, doc = newDoc(codici);
          expect(validate(doc)).not.toHaveError(msg);
          [1, 2, 3].forEach(function (t) {
            doc[field] = t;
            expect(validate(doc)).not.toHaveError(msg);
          });
          doc[field] = 0;
          expect(validate(doc)).toHaveError(msg);
        }

        it('should accept tipoMagazzino', inject(function (validate, codici) {
          shouldAcceptTipoMagazzino('tipoMagazzino', validate, codici);
        }));

        it('should accept tipoMagazzinoA', inject(function (validate, codici) {
          shouldAcceptTipoMagazzino('tipoMagazzinoA', validate, codici);
        }));
      });

      it('should accept inProduzione=1', inject(function (validate, codici) {
        var msg = 'Invalid inProduzione', doc = newDoc(codici);
        expect(validate(doc)).not.toHaveError(msg);
        doc.inProduzione = 1;
        expect(validate(doc)).not.toHaveError(msg);
        doc.inProduzione = 0;
        expect(validate(doc)).toHaveError(msg);
      }));

      describe('rows', function () {
        it('should be an array', inject(function (validate, codici) {
          var msg = 'Invalid rows', doc = newDoc(codici);
          expect(validate(doc)).not.toHaveError(msg);
          doc.rows = {};
          expect(validate(doc)).toHaveError(msg);
        }));

        it('should contain arrays', inject(function (validate, codici) {
          var msg = 'Invalid row[0]', doc = newDoc(codici);
          doc.rows[0] = [];
          expect(validate(doc)).not.toHaveError(msg);
          doc.rows[0] = {};
          expect(validate(doc)).toHaveError(msg);
        }));
      });

      describe('row', function () {
        describe('column 0', function () {
          var msg = 'Invalid barcode[0]: "';
          it('should be a valid barcodeAs400', inject(function (validate, codici) {
            var doc = newDoc(codici);
            doc.rows[0] = [''];
            expect(validate(doc)).toHaveError(msg + '"');
            doc.rows[0] = ['123 12345 1234 1234 01'];
            expect(validate(doc)).toHaveError(msg + '123 12345 1234 1234 01"');
            doc.rows[0] = ['123123451234123401'];
            expect(validate(doc)).not.toMatchError(msg);
          }));
        });

        describe('column 1', function () {
          var msg = 'Invalid scalarino[0]: "';
          it('should be a valid scalarino', inject(function (validate, codici) {
            var doc = newDoc(codici);
            doc.rows[0] = ['123123451234123401', 0];
            expect(validate(doc)).toHaveError(msg + '0"');
            doc.rows[0] = ['123123451234123401', 1];
            expect(validate(doc)).not.toMatchError(msg);
          }));
        });

        describe('column 2', function () {
          var msg = 'Invalid descrizioneTaglia[0]: "';
          it('should be a valid descrizioneTaglia', inject(function (validate, codici) {
            var doc = newDoc(codici);
            doc.rows[0] = ['123123451234123401', 1, 'SMXL'];
            expect(validate(doc)).toHaveError(msg + 'SMXL"');
            doc.rows[0] = ['123123451234123401', 1, 'MXL'];
            expect(validate(doc)).not.toMatchError(msg);
          }));
        });

        describe('column 3', function () {
          var msg = 'Invalid descrizione[0]: "';
          it('should be a valid descrizione', inject(function (validate, codici) {
            var doc = newDoc(codici);
            doc.rows[0] = ['123123451234123401', 1, 'MXL', ''];
            expect(validate(doc)).toHaveError(msg + '"');
            doc.rows[0] = ['123123451234123401', 1, 'MXL', 'DESCRIZIONE'];
            expect(validate(doc)).not.toMatchError(msg);
          }));
        });

        describe('column 4', function () {
          var msg = 'Invalid costo[0]: "';
          it('should be a valid costo', inject(function (validate, codici) {
            var doc = newDoc(codici);
            doc.rows[0] = ['123123451234123401', 1, 'MXL', 'DESC', '100'];
            expect(validate(doc)).toHaveError(msg + '100"');
            doc.rows[0] = ['123123451234123401', 1, 'MXL', 'DESC', 100];
            expect(validate(doc)).not.toMatchError(msg);
          }));
        });

        describe('column 5', function () {
          var msg = 'Invalid qta[0]: "';
          it('should be a valid qta', inject(function (validate, codici) {
            var doc = newDoc(codici);
            doc.rows[0] = ['123123451234123401', 1, 'MXL', 'DESC', 100, 1.1];
            expect(validate(doc)).toHaveError(msg + '1.1"');
            doc.rows[0] = ['123123451234123401', 1, 'MXL', 'DESC', 100, -1];
            expect(validate(doc)).toHaveError(msg + '-1"');
            doc.rows[0] = ['123123451234123401', 1, 'MXL', 'DESC', 100, 0];
            expect(validate(doc)).toHaveError(msg + '0"');
            doc.rows[0] = ['123123451234123401', 1, 'MXL', 'DESC', 100, 1];
            expect(validate(doc)).not.toMatchError(msg);
          }));
        });
      });
    });

    describe('Listino', function () {
      function newDoc(codici) {
        return {
          _id: 'Listino_' + owner.name,
          columnNames: codici.COLUMN_NAMES.Listino
        };
      }

      it('should require columnNames', inject(function (validate, codici) {
        var doc = newDoc(codici);
        expectRequired(validate, doc, 'columnNames', [codici.COLUMN_NAMES.Listino], [codici.COLUMN_NAMES.MovimentoMagazzino]);
      }));

      describe('versioneBase', function () {
        var msg = 'Invalid versioneBase';
        it('should be a valid versione listino', inject(function (validate, codici) {
          var doc = newDoc(codici);
          expect(validate(doc)).not.toHaveError(msg);
          doc.versioneBase = 1;
          expect(validate(doc)).not.toHaveError(msg);
          doc.versioneBase = 123456;
          expect(validate(doc)).not.toHaveError(msg);
          doc.versioneBase = 12345;
          expect(validate(doc)).not.toHaveError(msg);
        }));

        it('should be different from _id', inject(function (validate, codici) {
          var doc = newDoc(codici);
          doc.versioneBase = owner.name;
          expect(validate(doc)).toHaveError(msg);
        }));
      });

      describe('prezzi', function () {
        it('should be non-empty without versioneBase', inject(function (validate, codici) {
          var msg = 'Listino vuoto', doc = newDoc(codici);
          expect(validate(doc)).toHaveError(msg);
          doc.prezzi = { '123': { '12345': { '1234': [100, 100, 100] } } };
          expect(validate(doc)).not.toHaveError(msg);
        }));

        it('should be allowed to be empty with versioneBase', inject(function (validate, codici) {
          var msg = 'Listino vuoto', doc = newDoc(codici);
          doc.prezzi = {};
          expect(validate(doc)).toHaveError(msg);
          doc.versioneBase = '1';
          expect(validate(doc)).not.toHaveError(msg);
        }));

        it('should have values of stagione as keys', inject(function (validate, codici) {
          var msg = 'Invalid stagione: "', doc = newDoc(codici);
          doc.prezzi = { '1234': {} };
          expect(validate(doc)).toHaveError(msg + '1234"');
          doc.prezzi = { '123': {} };
          expect(validate(doc)).not.toMatchError(msg);
        }));

        it('should have values of modello as sub-keys', inject(function (validate, codici) {
          var msg = 'Invalid modello: "', doc = newDoc(codici);
          doc.prezzi = { '123': { '123456': {} } };
          expect(validate(doc)).toHaveError(msg + '123 123456"');
          doc.prezzi = { '123': { '12345': {} } };
          expect(validate(doc)).not.toMatchError(msg);
        }));

        it('should have values of articolo as sub-sub-keys', inject(function (validate, codici) {
          var msg = 'Invalid articolo: "', doc = newDoc(codici);
          doc.prezzi = { '123': { '12345': { '12345': [] } } };
          expect(validate(doc)).toHaveError(msg + '123 12345 12345"');
          doc.prezzi = { '123': { '12345': { '1234': [] } } };
          expect(validate(doc)).not.toMatchError(msg);
        }));

        describe('row', function () {
          it('should contain at least 3 amounts', inject(function (validate, codici) {
            var msg = 'Invalid row for 123 12345 1234: ', doc = newDoc(codici), row = [];
            doc.prezzi = { '123': { '12345': { '1234': row } } };
            expect(validate(doc)).toHaveError(msg + '[]');
            row[0] = -1;
            row[1] = 1;
            row[2] = 1;
            expect(validate(doc)).toMatchError(msg);
            row[0] = 1;
            row[1] = -1;
            expect(validate(doc)).toMatchError(msg);
            row[1] = 1;
            row[2] = -1;
            expect(validate(doc)).toMatchError(msg);
            row[2] = 1;
            expect(validate(doc)).not.toMatchError(msg);
          }));

          it('should allow a note as 4th value', inject(function (validate, codici) {
            var msg = 'Invalid row ', doc = newDoc(codici);
            doc.prezzi = { '123': { '12345': { '1234': [100, 100, 200, '*'] } } };
            expect(validate(doc)).not.toMatchError(msg);
          }));
        });
      });
    });
  });
});
