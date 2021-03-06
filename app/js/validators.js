/*global angular:false, require:false*/
angular.module('app.validators', [], ['$provide', function ($provide) {
  'use strict';
  function validateDocUpdate(doc, oldDoc, userCtx, secObj, CODICI) {
    var errors = [],
      codici = CODICI || require('views/lib/codici'),
      typeOf = codici.typeOf,
      typeAndCode = codici.typeAndCodeFromId(doc._id),
      codes = typeAndCode && typeAndCode[2] ? typeAndCode[2].split('_') : null;

    function authorizedIf(condition) {
      if (condition === true) {
        return;
      }
      var msg = 'Not authorized';
      if (secObj) {
        throw { unauthorized: msg };
      }
      errors.push({ message: msg });
    }

    function isAdmin() {
      // TODO DRY 'boutique' is repeated in couchdbs.js
      return userCtx.name === 'boutique' ||
        (userCtx.roles && (userCtx.roles.indexOf('boutique') >= 0 || userCtx.roles.indexOf('_admin') >= 0));
    }

    function isDocOwner() {
      // TODO DRY 'azienda' is repeated in couchdbs.js
      return codes && userCtx.name === codes[0] && userCtx.roles.indexOf('azienda') >= 0;
    }

    function mustBeAdmin() {
      authorizedIf(isAdmin());
    }

    authorizedIf(isDocOwner() || isAdmin());

    /*
     * secObj is used to know the context of execution:
     * if "undefined", it's running in a browser, otherwise on CouchDB.
     */
    function error(message) {
      if (secObj) {
        throw { forbidden: message };
      }
      errors.push({ message: message });
      //return undefined;
    }

    function mustHave(field, fieldValues) {
      var v = doc[field], tfv = typeOf(fieldValues), tv = typeOf(v);
      if ((tfv === 'Array' && fieldValues.indexOf(v) < 0) ||
          tv === 'Undefined' ||
          tv === 'Null' ||
          (tfv === 'String' && tv !== fieldValues) ||
          (tv === 'String' && !v.trim())) {
        error('Required: ' + field);
      }
    }

    function hasValidAziendaCode() {
      if (!(codes && codici.isCodiceAzienda(codes[0]))) {
        error('Invalid azienda code');
      }
    }

    function hasValidListino(prezzi, versioneBase) {
      if (!prezzi) {
        return error('Listino vuoto');
      }
      var vuoto = true;
      Object.keys(prezzi).every(function (stagione) {
        if (!codici.isCode(stagione, codici.LEN_STAGIONE)) {
          return error('Invalid stagione: "' + stagione + '"');
        }
        var modelli = prezzi[stagione];
        return Object.keys(modelli).every(function (modello) {
          if (!codici.isCode(modello, codici.LEN_MODELLO)) {
            return error('Invalid modello: "' + [stagione, modello].join(' ') + '"');
          }
          var articoli = modelli[modello];
          return Object.keys(articoli).every(function (articolo) {
            if (!codici.isCode(articolo, codici.LEN_ARTICOLO)) {
              return error('Invalid articolo: "' + [stagione, modello, articolo].join(' ') + '"');
            }
            var note, amount, i, ii, r = articoli[articolo];
            if (typeOf(r) !== 'Array' || (r.length !== 3 && r.length !== 4)) {
              return error('Invalid row for ' + [stagione, modello, articolo].join(' ') + ': ' + JSON.stringify(r));
            }
            for (i = 0, ii = 3; i < ii; i += 1) {
              amount = r[i];
              if (!codici.isInt(amount) || amount < 0) {
                return error('Invalid row for ' + [stagione, modello, articolo].join(' ') + ': ' + JSON.stringify(r));
              }
            }
            note = r[ii];
            if (typeof note !== 'undefined' && typeof note !== 'string') {
              return error('Invalid row for ' + [stagione, modello, articolo].join(' ') + ': ' + JSON.stringify(r));
            }
            vuoto = false;
          });
        });
      });
      if (vuoto && !versioneBase) {
        error('Listino vuoto');
      }
    }

    function hasGiacenze(inventario) {
      if (!inventario || !inventario.length) {
        return error('Inventario vuoto');
      }
      // TODO verificare anche l'ordinamento
      inventario.forEach(function (row, idx) {
        if (typeOf(row) !== 'Array' || row.length < 8) {
          return error('Invalid row: ' + JSON.stringify(row));
        }
        if (!codici.isCode(row[0], codici.LEN_STAGIONE)) {
          error('Invalid stagione[' + idx + ']: "' + row[0] + '"');
        }
        if (!codici.isCode(row[1], codici.LEN_MODELLO)) {
          error('Invalid modello[' + idx + ']: "' + row[1] + '"');
        }
        if (!codici.isCode(row[2], codici.LEN_ARTICOLO)) {
          error('Invalid articolo[' + idx + ']: "' + row[2] + '"');
        }
        if (!codici.isCode(row[3], codici.LEN_COLORE)) {
          error('Invalid colore[' + idx + ']: "' + row[3] + '"');
        }
        if (!codici.isCodiceAzienda(row[4])) {
          error('Invalid codiceAzienda[' + idx + ']: "' + row[4] + '"');
        }
        if (row[5] !== false && row[5] !== true) {
          error('Invalid inProduzione[' + idx + ']: "' + row[5] + '"');
        }
        if (!codici.isTipoMagazzino(row[6])) {
          error('Invalid tipoMagazzino[' + idx + ']: "' + row[6] + '"');
        }
        var taglia, giacenze = row[7];
        for (taglia in giacenze) {
          if (giacenze.hasOwnProperty(taglia)) {
            if (!codici.isCode(taglia, codici.LEN_TAGLIA)) {
              error('Invalid taglia[' + idx + ']: "' + taglia + '"');
            } else if (!codici.isInt(giacenze[taglia]) || giacenze[taglia] === 0) {
              error('Invalid qta[' + idx + ']: "' + giacenze[taglia] + '"');
            }
          }
        }
      });
    }

    function hasMovimenti(rows) {
      if (typeOf(rows) !== 'Array') {
        return error('Invalid rows');
      }
      rows.forEach(function (row, idx) {
        if (typeOf(row) !== 'Array') {
          return error('Invalid row[' + idx + ']');
        }
        var barcode = row[0], scalarino = row[1], descrizioneTaglia = row[2], descrizione = row[3], costo = row[4], qta = row[5];
        if (!codici.isBarcodeAs400(barcode)) {
          return error('Invalid barcode[' + idx + ']: "' + barcode + '"');
        }
        if (!codici.isScalarino(scalarino)) {
          error('Invalid scalarino[' + idx + ']: "' + scalarino + '"');
        }
        if (!codici.isDescrizioneTaglia(descrizioneTaglia)) {
          error('Invalid descrizioneTaglia[' + idx + ']: "' + descrizioneTaglia + '"');
        }
        if (!codici.isDescrizioneArticolo(descrizione)) {
          error('Invalid descrizione[' + idx + ']: "' + descrizione + '"');
        }
        if (!codici.isInt(costo) || costo < 0) {
          error('Invalid costo[' + idx + ']: "' + costo + '"');
        }
        if (!codici.isQta(qta) || qta <= 0) {
          error('Invalid qta[' + idx + ']: "' + qta + '"');
        }
      });
    }

    function hasEquivalentData(fieldA, fieldB) {
      var valsA = doc[fieldA], valsB = doc[fieldB];
      if (!valsA || !valsB || valsA.length !== valsB.length ||
          !valsA.every(function (objA, idx) {
            var keysA, objB = valsB[idx];
            if (objA === null && objB === null) {
              return true;
            }
            keysA = Object.keys(objA);
            return Object.keys(objB).length === keysA.length && keysA.every(function (keyA) {
              return objB[objA[keyA]] === keyA;
            });
          })) {
        error(fieldA + ' and '  + fieldB + ' should be equivalent');
      }
    }

    function hasValidCausaliTipo(tipoMagazzino) {
      var causali = doc[tipoMagazzino], cod, causale, isEmpty = true;
      if (typeOf(causali) !== 'Object') {
        return error('Invalid causali tipo ' + tipoMagazzino);
      }
      for (cod in causali) {
        if (causali.hasOwnProperty(cod)) {
          isEmpty = false;
          causale = causali[cod];
          if (typeOf(causale) !== 'Array' || causale.length !== 2 ||
              typeof causale[0] !== 'string' ||
              (causale[1] !== -1 && causale[1] !== 1)) {
            return error('Invalid causale: ' + JSON.stringify(causale));
          }
        }
      }
      if (isEmpty) {
        error('Invalid causali tipo ' + tipoMagazzino);
      }
    }

    function hasValidCausaliMovimentoMagazzino(causali, causaliAs400) {
      if (typeOf(causali) !== 'Array' || !causali.length) {
        return error('Invalid causali');
      }
      causali.forEach(function (causale) {
        if (typeOf(causale) !== 'Array' || causale.length !== 3 ||
            typeof causale[0] !== 'string' ||
            (causale[1] !== -1 && causale[1] !== 1) ||
            (causale[2] !== -1 && causale[2] !== 0 && causale[2] !== 1)) {
          return error('Invalid causale: ' + JSON.stringify(causale));
        }
      });

      if (typeOf(causaliAs400) !== 'Object') {
        return error('Invalid causaliAs400');
      }
      var codAs400, causaleBoutique, i, n = causali.length, found;
      for (codAs400 in causaliAs400) {
        if (causaliAs400.hasOwnProperty(codAs400)) {
          if (!/^[12]-\d\d$/.test(codAs400)) {
            return error('Invalid codice causale As400: ' + codAs400);
          }
          causaleBoutique = causaliAs400[codAs400];
          if (typeof causaleBoutique !== 'string') {
            return error('Invalid causale for ' + codAs400 + ': ' + JSON.stringify(causaleBoutique));
          }
          for (i = 0, found = false; i < n && !found; i += 1) {
            found = causali[i][0] === causaleBoutique;
          }
          if (!found) {
            return error('Invalid causale for ' + codAs400 + ': ' + causaleBoutique);
          }
        }
      }
    }

    function hasValidCosti(costi) {
      if (typeOf(costi) !== 'Object') {
        return error('Invalid costi');
      }
      Object.keys(costi).forEach(function (modello) {
        if (!/^\d{5}$/.test(modello)) {
          return error('Invalid modello: ' + modello);
        }
        var costiModello = costi[modello];
        Object.keys(costiModello).forEach(function (articolo) {
          if (!/^\d{4}$/.test(articolo)) {
            return error('Invalid articolo: ' + articolo);
          }
          var costo = costiModello[articolo];
          if (!codici.isInt(costo) || costo <= 0) {
            error('Invalid costo for ' + [modello, articolo].join(' ') + ': ' + costo);
          }
        });
      });
    }

    function hasValidArticoli(articoli) {
      var msg = 'Invalid articoli';
      if (typeOf(articoli) !== 'Array' || !articoli.length) return error(msg);
      articoli.forEach(function (a) {
        var k = Object.keys(a).sort();
        if (k.length !== 4 || k[0] !== 'articolo' || k[1] !== 'colore' || k[2] !== 'modello' || k[3] !== 'stagione' ||
            !codici.codiceAs400(a.stagione, a.modello, a.articolo, a.colore, '01'))
          error(msg);
      });
    }

    function hasColumnNames(columnNames) {
      if (!doc.columnNames ||
          columnNames.length !== doc.columnNames.length ||
          columnNames.some(function (column, i) {
            return column !== doc.columnNames[i];
          })) {
        error('Required: columnNames');
      }
    }

    function hasCausale1(desc) {
      return typeOf(doc.causale1) === 'Array' && doc.causale1[0] === desc;
    }

    function isFlag(field) {
      return !doc.hasOwnProperty(field) || [true, false].indexOf(doc[field]) >= 0;
    }

    if (oldDoc && oldDoc._id !== doc._id) {
      error('Cannot change _id');
    }
    if (doc._deleted) {
      mustBeAdmin();
      // don't validate on deletion
      return secObj ? undefined : { errors: errors };
    }

    switch ((typeAndCode || [])[1]) {
    case 'Azienda':
      hasValidAziendaCode();
      mustBeAdmin();
      mustHave('nome', 'String');
      mustHave('tipo', ['NEGOZIO', 'MAGAZZINO']);
      break;
    case 'Cliente':
      hasValidAziendaCode();
      mustHave('nome', 'String');
      break;
    case 'TaglieScalarini':
      mustBeAdmin();
      mustHave('descrizioniTaglie', 'Array');
      mustHave('taglie', 'Array');
      mustHave('listeDescrizioni', 'Array');
      mustHave('colonneTaglie', 'Array');
      if (!errors.length) {
        hasEquivalentData('descrizioniTaglie', 'taglie');
        hasEquivalentData('taglie', 'descrizioniTaglie');
        if (doc.listeDescrizioni.some(function (listaDescrizioni, scalarino) {
            if (scalarino === 0) {
              return !!listaDescrizioni;
            }
            var ts = doc.taglie[scalarino];
            return !ts || typeOf(listaDescrizioni) !== 'Array' || listaDescrizioni.some(function (descrizioneTaglia) {
              return !ts.hasOwnProperty(descrizioneTaglia);
            });
          })) {
          error('listeDescrizioni not valid');
        }
        if (doc.colonneTaglie.some(function (colonnaTaglie, scalarino) {
            if (scalarino === 0) {
              return !!colonnaTaglie;
            }
            var ds = doc.descrizioniTaglie[scalarino];
            return !ds || typeOf(colonnaTaglie) !== 'Object' || Object.keys(colonnaTaglie).some(function (taglia) {
              return !ds.hasOwnProperty(taglia);
            });
          })) {
          error('colonneTaglie not valid');
        }
      }
      break;
    case 'ModelliEScalarini':
      mustBeAdmin();
      mustHave('lista', 'Object');
      break;
    case 'Giacenze':
      mustBeAdmin();
      hasColumnNames(codici.COLUMN_NAMES.Giacenze);
      hasGiacenze(doc.rows);
      break;
    case 'MovimentoMagazzino':
      hasValidAziendaCode();
      if ((oldDoc && oldDoc.accodato) || !doc.causale1 || (doc.accodato && !hasCausale1('VENDITA A CLIENTI'))) {
        mustBeAdmin();
      }
      if (!isFlag('accodato') || (oldDoc && oldDoc.accodato && !doc.accodato)) {
        error('Invalid accodato');
      }
      // TODO l'utente negozio può scaricare solo dal suo magazzino di tipo 3.
      if (!(codes && codes.length === 4)) {
        return error('Invalid code');
      }
      if (!codici.isYear(codes[1])) {
        error('Invalid year');
      } else if (!codici.isGruppoNumerazione(codes[2])) {
        error('Invalid gruppo');
      } else if (!codici.isNumero(codes[3])) {
        error('Invalid numero');
      }
      if (!isFlag('esterno1') || !isFlag('esterno2')) {
        error('Invalid esterno1/2');
      }
      if (!codici.isYyyyMmDdDate(doc.data, codes[1])) {
        error('Invalid data');
      }
      hasColumnNames(['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta']);
      // TODO questo codice è illeggibile
      if (typeOf(doc.causale1) !== 'Array' || doc.causale1.length !== 2 ||
          !codici.CAUSALI_MOVIMENTO_MAGAZZINO.some(function (causale) {
            if (causale.descrizione === doc.causale1[0] &&
                causale.segno === doc.causale1[1] &&
                causale.gruppo === codes[2] &&
                causale.hasOwnProperty('causale2') === doc.hasOwnProperty('causale2')) {
              if (!doc.hasOwnProperty('causale2')) {
                return true;
              }
              var causale2 = codici.CAUSALI_MOVIMENTO_MAGAZZINO[causale.causale2];
              return typeOf(doc.causale2) === 'Array' && doc.causale2.length === 2 &&
                causale2.descrizione === doc.causale2[0] && causale2.segno === doc.causale2[1];
            }
            return false;
          })) {
        error('Invalid causale');
      }
      if ((doc.hasOwnProperty('causale2') !== doc.hasOwnProperty('magazzino2')) ||
          (doc.hasOwnProperty('causale2') && !codici.isCodiceAzienda(doc.magazzino2))) {
        error('Invalid magazzino2');
      }
      if (doc.hasOwnProperty('tipoMagazzino') && !codici.isTipoMagazzino(doc.tipoMagazzino)) {
        error('Invalid tipoMagazzino');
      }
      if (doc.hasOwnProperty('tipoMagazzinoA') && !codici.isTipoMagazzino(doc.tipoMagazzinoA)) {
        error('Invalid tipoMagazzinoA');
      }
      if (!isFlag('inProduzione')) {
        error('Invalid inProduzione');
      }
      hasMovimenti(doc.rows);
      break;
    case 'CausaliAs400':
      mustBeAdmin();
      hasValidCausaliTipo('1');
      hasValidCausaliTipo('2');
      break;
    case 'CausaliMovimentoMagazzino':
      mustBeAdmin();
      hasValidCausaliMovimentoMagazzino(doc.causali, doc.causaliAs400);
      break;
    case 'Listino':
      mustBeAdmin();
      if (!(codes && codici.idListino(codes[0]))) {
        return error('Invalid code');
      }
      if (doc.hasOwnProperty('versioneBase') && (codici.idListino(doc.versioneBase) === doc._id || !codici.isNumero(doc.versioneBase))) {
        error('Invalid versioneBase');
      }
      hasColumnNames(['costo', 'prezzo1', 'prezzo2', 'offerta']);
      hasValidListino(doc.prezzi, doc.versioneBase);
      break;
    case 'CostoArticoli':
      mustBeAdmin();
      if (!codes || !codici.isCode(codes[0], codici.LEN_STAGIONE)) {
        error('Invalid stagione');
      } else {
        hasValidCosti(doc.costi);
      }
      break;
    case 'Foto':
      mustBeAdmin();
      if (!codes) {
        error('Invalid idFoto');
      } else {
        hasValidArticoli(doc.articoli);
      }
      break;
    default:
      mustBeAdmin();
      break;
    }

    if (!secObj) {
      return { errors: errors };
    }
  }

  $provide.value('validateDocUpdate', validateDocUpdate);

  $provide.factory('validate', ['session', 'codici', function (session, codici) {
    var userCtx = { name: 'boutique' };
    session.then(function (sessionData) {
      userCtx = sessionData.userCtx;
    });
    return function (doc, oldDoc) {
      return validateDocUpdate(doc, oldDoc, userCtx, undefined, codici);
    };
  }]);
}]);
