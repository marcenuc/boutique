/*global define: false, exports: false, require: false, CODICI: false*/
function validate_doc_update(doc, oldDoc, userCtx, secObj) {
  'use strict';
  var es = [], i, n, rows, r,
    codici = typeof require === 'function' ? require('codici') : CODICI,
    typeAndCode = codici.typeAndCodeFromId(doc._id),
    codes = typeAndCode && typeAndCode[2] ? typeAndCode[2].split('_') : null;

  // TODO CouchDB has isArray() function: use it.
  function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
      if (value) {
        if (typeof value.length === 'number' &&
            !value.propertyIsEnumerable('length') &&
            typeof value.splice === 'function') {
          return 'array';
        }
      } else {
        return 'null';
      }
    }
    return s;
  }

  function authorizedIf(condition) {
    if (condition === true) {
      return;
    }
    var msg = 'Not authorized';
    if (secObj) {
      throw { unauthorized: msg };
    }
    es.push({ message: msg });
  }

  function isAdmin() {
    // TODO DRY 'boutique' is repeated in couchdbs.js
    return userCtx.name === 'boutique' ||
      userCtx.roles.indexOf('boutique') >= 0 ||
      userCtx.roles.indexOf('_admin') >= 0;
  }

  function isDocOwner() {
    // TODO DRY 'azienda' is repeated in couchdbs.js
    return userCtx.name === codes[0] && userCtx.roles.indexOf('azienda') >= 0;
  }

  function mustBeAdmin() {
    authorizedIf(isAdmin());
  }

  function mustBeOwner() {
    authorizedIf(isDocOwner() || isAdmin());
  }

  /*
   * secObj is used to know the context of execution:
   * if "undefined", it's running in a browser, otherwise on CouchDB.
   */
  function error(message) {
    if (secObj) {
      throw { forbidden: message };
    }
    es.push({ message: message });
  }

  function mustHave(field, fieldType) {
    var v = doc[field];
    if (!v || (typeof v === 'string' && !v.trim())) {
      error('Required: ' + field);
    }
    if (fieldType && typeOf(v) !== fieldType) {
      error(field + ' must be of type ' + fieldType);
    }
  }

  function hasValidAziendaCode() {
    if (!codici.isCodiceAzienda(codes[0])) {
      error('Invalid azienda code');
    }
  }

  function hasValidBollaAs400Code() {
    var m = /^(\d\d)(\d\d)(\d\d)_([1-9]\d*)_([A-Z])_(\d+)$/.exec(typeAndCode[2]);
    if (!m || !codici.isDate(m[1], m[2], m[3])) {
      error('Invalid code');
    }
  }

  function hasValidListino(prezzi) {
    if (!prezzi) {
      return error('Listino vuoto');
    }
    var stagione, modello, modelli, articolo, articoli, r, j, l, vuoto = true;
    for (stagione in prezzi) {
      if (prezzi.hasOwnProperty(stagione)) {
        if (!codici.isCode(stagione, codici.LEN_STAGIONE)) {
          return error('Invalid stagione "' + stagione + '"');
        }
        modelli = prezzi[stagione];
        for (modello in modelli) {
          if (modelli.hasOwnProperty(modello)) {
            if (!codici.isCode(modello, codici.LEN_MODELLO)) {
              return error('Invalid modello "' + modello + '" in stagione "' + stagione + '"');
            }
            articoli = modelli[modello];
            for (articolo in articoli) {
              if (articoli.hasOwnProperty(articolo)) {
                if (!codici.isCode(articolo, codici.LEN_ARTICOLO)) {
                  return error('Invalid articolo "' + articolo + '" in modello "' + modello + '", stagione "' + stagione + '"');
                }
                vuoto = false;
                r = articoli[articolo];
                if (typeOf(r) !== 'array' || (r.length !== 3 && r.length !== 4)) {
                  error('Invalid row for articolo "' + articolo + '" in modello "' + modello + '", stagione "' + stagione + '": ' + JSON.stringify(r));
                } else {
                  for (j = 0, l = 3; j < l; j += 1) {
                    if (!codici.isInt(r[j]) || r[j] < 0) {
                      error('Invalid row for articolo "' + articolo + '" in modello "' + modello + '", stagione "' + stagione + '": ' + JSON.stringify(r));
                    }
                  }
                  if (typeof r[4] !== 'undefined' && typeof r[4] !== 'string') {
                    error('Invalid row for articolo "' + articolo + '" in modello "' + modello + '", stagione "' + stagione + '": ' + JSON.stringify(r));
                  }
                }
              }
            }
          }
        }
      }
    }
    if (vuoto) {
      error('Listino vuoto');
    }
  }

  function hasGiacenze(inventario) {
    if (!inventario || !inventario.length) {
      return error('Inventario vuoto');
    }
    // TODO verificare anche l'ordinamento
    inventario.forEach(function (row, idx) {
      if (typeOf(row) !== 'array' || row.length < 8) {
        return error('Invalid row: ' + JSON.stringify(row));
      }
      if (!codici.isCode(row[0], codici.LEN_STAGIONE)) {
        error('Invalid stagione at row ' + idx + ': ' + JSON.stringify(row));
      }
      if (!codici.isCode(row[1], codici.LEN_MODELLO)) {
        error('Invalid modello at row ' + idx + ': ' + JSON.stringify(row));
      }
      if (!codici.isCode(row[2], codici.LEN_ARTICOLO)) {
        error('Invalid articolo at row ' + idx + ': ' + JSON.stringify(row));
      }
      var taglia, giacenze = row[7];
      for (taglia in giacenze) {
        if (giacenze.hasOwnProperty(taglia)) {
          if (!codici.codiceAs400(row[0], row[1], row[2], row[3], taglia)) {
            error('Invalid barcode at row ' + idx + ': ' + JSON.stringify(row));
          } else if (typeof giacenze[taglia] !== 'number' || giacenze[taglia] <= 0) {
            error('Invalid quantity at row ' + idx + ': ' + JSON.stringify(row));
          }
        }
      }
      if (!codici.isCodiceAzienda(row[4])) {
        error('Invalid codiceAzienda at row ' + idx + ': ' + JSON.stringify(row));
      }
      if (row[5] !== 0 && row[5] !== 1) {
        error('Invalid inProduzione at row ' + idx + ': ' + JSON.stringify(row));
      }
      if (row[6] !== 1 && row[6] !== 2 && row[6] !== 3) {
        error('Invalid tipoMagazzino at row ' + idx + ': ' + JSON.stringify(row));
      }
    });
  }

  function hasMovimenti(elenco) {
    if (!elenco || !elenco.length) {
      return error('Elenco vuoto');
    }
    elenco.forEach(function (row, idx) {
      if (typeOf(row) !== 'array' || row.length < 2) {
        return error('Invalid row: ' + JSON.stringify(row));
      }
      var barcode = row[0];
      if (!codici.isBarcodeAs400(barcode)) {
        error('Invalid barcode at row ' + idx + ': "' + barcode + '"');
      }
      if (typeof row[1] !== 'number' || row[1] <= 0) {
        error('Invalid quantity at row ' + idx + ': "' + barcode + '"');
      }
    });
  }

  function hasInventario(inventario) {
    if (!inventario || !inventario.length) {
      error('Inventario vuoto');
      return;
    }
    // TODO verificare anche l'ordinamento
    inventario.forEach(function (row, idx) {
      if (typeOf(row) !== 'array' || row.length < 3) {
        return error('Invalid row: ' + JSON.stringify(row));
      }
      var barcode = row[0];
      if (!codici.isBarcodeAs400(barcode)) {
        error('Invalid barcode at row ' + idx + ': "' + barcode + '"');
      }
      if (!codici.isInt(row[1]) || row[1] <= 0) {
        error('Invalid quantity at row ' + idx + ': "' + barcode + '"');
      }
      // FIXME stiamo consentendo costo==0 solo temporaneamente per andare avanti col lavoro.
      if (!codici.isInt(row[2]) || row[2] < 0) {
        error('Invalid costo at row ' + idx + ': "' + barcode + '"');
      }
      // inProduzione should be set only when... set.
      if (typeof row[3] !== 'undefined' && row[3] !== 1) {
        error('Invalid inProduzione at row ' + idx + ': "' + barcode + '"');
      }
    });
  }

  function hasEquivalentData(fieldA, fieldB) {
    var valsA = doc[fieldA], valsB = doc[fieldB];
    if (valsA && valsB && valsA.some(function (objA, idx) {
        var keyA;
        for (keyA in objA) {
          if (objA.hasOwnProperty(keyA)) {
            return valsB[idx][objA[keyA]] !== keyA;
          }
        }
      })) {
      error(fieldA + ' and '  + fieldB + ' should be equivalent');
    }
  }

  function hasValidCausaliTipo(tipoMagazzino) {
    var causali = doc[tipoMagazzino], cod, causale, isEmpty = true;
    if (typeOf(causali) !== 'object') {
      return error('Invalid causali tipo ' + tipoMagazzino);
    }
    for (cod in causali) {
      if (causali.hasOwnProperty(cod)) {
        isEmpty = false;
        causale = causali[cod];
        if (typeOf(causale) !== 'array' || causale.length !== 2 ||
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
    if (typeOf(causali) !== 'array' || !causali.length) {
      return error('Invalid causali');
    }
    causali.forEach(function (causale) {
      if (typeOf(causale) !== 'array' || causale.length !== 3 ||
          typeof causale[0] !== 'string' ||
          (causale[1] !== -1 && causale[1] !== 1) ||
          (causale[2] !== -1 && causale[2] !== 0 && causale[2] !== 1)) {
        return error('Invalid causale: ' + JSON.stringify(causale));
      }
    });

    if (typeOf(causaliAs400) !== 'object') {
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

  function hasColumnNames(columnNames) {
    if (!doc.columnNames) {
      error('Required field: columnNames');
    } else {
      if (columnNames.length !== doc.columnNames.length ||
          columnNames.some(function (column, idx) {
            return column !== doc.columnNames[idx];
          })) {
        error('Invalid columnNames');
      }
    }
  }

  authorizedIf(typeof userCtx.name === 'string');
  if (oldDoc && oldDoc._id !== doc._id) {
    error('Invalid _id');
  }
  if (!doc._deleted) {
    if (!typeAndCode) {
      error('Invalid type');
    } else {
      switch (typeAndCode[1]) {
      case 'BollaAs400':
        hasValidBollaAs400Code();
        mustHave('codiceCliente');
        mustHave('tipoMagazzino');
        mustHave('codiceMagazzino');
        mustHave('causale');
        rows = doc.rows;
        if (!rows || !rows.length) {
          error('Give a row!');
        } else {
          rows = doc.rows;
          for (i = 0, n = rows.length; i < n; i += 1) {
            r = rows[i];
            if (r.length !== 2) {
              error('Invalid row ' + i + ': ' + JSON.stringify(r));
            }
            if (!codici.isBarcodeAs400(r[0])) {
              error('Invalid barcode at row ' + i + ': ' + JSON.stringify(r));
            }
            if (typeof r[1] !== 'number') {
              error('Invalid qta at row ' + i + ': ' + JSON.stringify(r));
            }
          }
        }
        break;
      case 'Azienda':
        mustBeAdmin();
        hasValidAziendaCode();
        mustHave('nome');
        mustHave('tipo');
        if (doc.tipo && (doc.tipo !== 'NEGOZIO' && doc.tipo !== 'MAGAZZINO')) {
          error('Invalid tipo: ' + doc.tipo);
        }
        break;
      case 'Cliente':
        mustBeOwner();
        mustHave('nome');
        break;
      case 'TaglieScalarini':
        mustBeAdmin();
        mustHave('descrizioniTaglie', 'array');
        mustHave('taglie', 'array');
        mustHave('listeDescrizioni', 'array');
        mustHave('colonneTaglie', 'array');
        hasEquivalentData('descrizioniTaglie', 'taglie');
        hasEquivalentData('taglie', 'descrizioniTaglie');
        // TODO added `!doc.listeDescrizioni` here for testability, but we should not need it
        // since we already checked it with mustHave().
        if (!doc.listeDescrizioni || doc.listeDescrizioni.some(function (listaDescrizioni, scalarino) {
            if (scalarino === 0) {
              return !!listaDescrizioni;
            }
            var ts = doc.taglie[scalarino];
            return !ts || typeOf(listaDescrizioni) !== 'array' || listaDescrizioni.some(function (descrizioneTaglia) {
              return !ts.hasOwnProperty(descrizioneTaglia);
            });
          })) {
          error('listeDescrizioni not valid');
        }
        // TODO added `!doc.colonneTaglie` here for testability, but we should not need it
        // since we already checked it with mustHave().
        if (!doc.colonneTaglie || doc.colonneTaglie.some(function (colonnaTaglie, scalarino) {
            if (scalarino === 0) {
              return !!colonnaTaglie;
            }
            var ds = doc.descrizioniTaglie[scalarino];
            return !ds || typeOf(colonnaTaglie) !== 'object' || Object.keys(colonnaTaglie).some(function (taglia) {
              return !ds.hasOwnProperty(taglia);
            });
          })) {
          error('colonneTaglie not valid');
        }
        break;
      case 'ModelliEScalarini':
        mustBeAdmin();
        mustHave('lista');
        break;
      case 'Giacenze':
        mustBeAdmin();
        hasColumnNames(['stagione', 'modello', 'articolo', 'colore', 'codiceAzienda', 'inProduzione', 'tipoMagazzino', 'giacenze']);
        hasGiacenze(doc.rows);
        break;
      case 'Inventario':
        mustBeOwner();
        hasValidAziendaCode();
        if (!codici.isTipoMagazzino(codes[1])) {
          error('Invalid tipo magazzino in _id');
        }
        hasColumnNames(['barcode', 'giacenza', 'costo', 'inProduzione']);
        hasInventario(doc.rows);
        break;
      case 'MovimentoMagazzino':
        if ((oldDoc && oldDoc.accodato) ||
            (doc.accodato && (typeOf(doc.causale) !== 'array' || doc.causale[0] !== 'VENDITA'))) {
          mustBeAdmin();
        } else {
          mustBeOwner();
        }
        hasValidAziendaCode();
        // TODO l'utente negozio può scaricare solo dal suo magazzino di tipo 3.
        if (codes.length !== 3) {
          error('Invalid code');
        } else if (!codici.isYear(codes[1])) {
          error('Invalid year');
        } else if (!codici.isNumero(codes[2])) {
          error('Invalid numero');
        }
        if (!codici.isYyyyMmDdDate(doc.data, codes[1])) {
          error('Invalid data');
        }
        hasColumnNames(['barcode', 'qta']);
        // TODO questo codice è illeggibile
        if (typeOf(doc.causale) !== 'array' ||
            !codici.CAUSALI_MOVIMENTO_MAGAZZINO.some(function (causale) {
              var ret = doc.causale.length === causale.length && causale.every(function (v, k) {
                return doc.causale[k] === v;
              });
              if (ret) {
                r = causale;
              }
              return ret;
            })) {
          error('Invalid causale');
        } else if (r[2] && !codici.isCodiceAzienda(doc.destinazione)) {
          error('Invalid destinazione');
        }
        hasMovimenti(doc.rows);
        if (doc.riferimento) {
          if (!codici.parseIdBollaAs400(doc.riferimento)) {
            error('Invalid riferimento');
          }
        }
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
        if (!codici.idListino(codes[0], codes[1])) {
          error('Invalid code');
        }
        hasColumnNames(['costo', 'prezzo1', 'prezzo2', 'offerta']);
        hasValidListino(doc.prezzi);
        break;
      default:
        error('Unknown type');
        break;
      }
    }
  }

  if (!secObj) {
    return { errors: es };
  }
}

if (typeof define === 'function') {
  define(function () {
    'use strict';
    return validate_doc_update;
  });
} else if (typeof exports === 'object') {
  exports.validate_doc_update = validate_doc_update;
}
