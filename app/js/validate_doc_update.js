/*global define: false, exports: false, require: false, CODICI: false*/
function validate_doc_update(doc, oldDoc, userCtx, secObj) {
  'use strict';
  var es = [], i, n, rows, r,
    codici = secObj ? require('views/lib/codici') : CODICI,
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

  function hasValidListino(prezzi, versioneBase) {
    if (!prezzi) {
      return error('Listino vuoto');
    }
    var stagione, modello, modelli, articolo, articoli, r, j, l, vuoto = true;
    for (stagione in prezzi) {
      if (prezzi.hasOwnProperty(stagione)) {
        if (!codici.isCode(stagione, codici.LEN_STAGIONE)) {
          return error('Invalid stagione: "' + stagione + '"');
        }
        modelli = prezzi[stagione];
        for (modello in modelli) {
          if (modelli.hasOwnProperty(modello)) {
            if (!codici.isCode(modello, codici.LEN_MODELLO)) {
              return error('Invalid modello: "' + [stagione, modello].join('", "') + '"');
            }
            articoli = modelli[modello];
            for (articolo in articoli) {
              if (articoli.hasOwnProperty(articolo)) {
                if (!codici.isCode(articolo, codici.LEN_ARTICOLO)) {
                  return error('Invalid articolo: "' + [stagione, modello, articolo].join('", "') + '"');
                }
                vuoto = false;
                r = articoli[articolo];
                if (typeOf(r) !== 'array' || (r.length !== 3 && r.length !== 4)) {
                  error('Invalid row for ' + [stagione, modello, articolo].join(' ') + ': ' + JSON.stringify(r));
                } else {
                  for (j = 0, l = 3; j < l; j += 1) {
                    if (!codici.isInt(r[j]) || r[j] < 0) {
                      error('Invalid row for ' + [stagione, modello, articolo].join(' ') + ': ' + JSON.stringify(r));
                    }
                  }
                  if (typeof r[4] !== 'undefined' && typeof r[4] !== 'string') {
                    error('Invalid row for ' + [stagione, modello, articolo].join(' ') + ': ' + JSON.stringify(r));
                  }
                }
              }
            }
          }
        }
      }
    }
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
      if (typeOf(row) !== 'array' || row.length < 8) {
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
      if (row[5] !== 0 && row[5] !== 1) {
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
    if (typeOf(rows) !== 'array') {
      return error('Invalid rows');
    }
    // TODO verificare anche l'ordinamento
    rows.forEach(function (row, idx) {
      if (typeOf(row) !== 'array') {
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

  function hasInventario(rows) {
    if (typeOf(rows) !== 'array' || !rows.length) {
      return error('Invalid rows');
    }
    var columnNames = codici.COLUMN_NAMES.Inventario,
      rowLength = columnNames.length,
      col = codici.colNamesToColIndexes(columnNames);
    rows.forEach(function (row, idx) {
      if (typeOf(row) !== 'array' || row.length !== rowLength) {
        return error('Invalid row[' + idx + ']');
      }
      var modello = row[col.modello], articolo = row[col.articolo], colore = row[col.colore], stagione = row[col.stagione],
        da = row[col.da], inProduzione = row[col.inProduzione], tipoMagazzino = row[col.tipoMagazzino],
        scalarino = row[col.scalarino], taglia = row[col.taglia], descrizioneTaglia = row[col.descrizioneTaglia],
        descrizione = row[col.descrizione], qta = row[col.qta];

      if (!codici.isCode(stagione, codici.LEN_STAGIONE)) {
        return error('Invalid stagione[' + idx + ']: "' + stagione + '"');
      }
      if (!codici.isCode(modello, codici.LEN_MODELLO)) {
        return error('Invalid modello[' + idx + ']: "' + modello + '"');
      }
      if (!codici.isCode(articolo, codici.LEN_ARTICOLO)) {
        return error('Invalid articolo[' + idx + ']: "' + articolo + '"');
      }
      if (!codici.isCode(colore, codici.LEN_COLORE)) {
        return error('Invalid colore[' + idx + ']: "' + colore + '"');
      }
      if (!codici.isCode(taglia, codici.LEN_TAGLIA)) {
        return error('Invalid taglia[' + idx + ']: "' + taglia + '"');
      }
      if (!codici.isCodiceAzienda(da)) {
        error('Invalid da[' + idx + ']: "' + da + '"');
      }
      if (inProduzione !== 0 && inProduzione !== 1) {
        error('Invalid inProduzione[' + idx + ']: "' + inProduzione + '"');
      }
      if (!codici.isTipoMagazzino(tipoMagazzino)) {
        error('Invalid tipoMagazzino[' + idx + ']: "' + tipoMagazzino + '"');
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
      if (!codici.isInt(qta) || qta === 0) {
        error('Invalid qta[' + idx + ']: "' + qta + '"');
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

  function hasCausale(desc) {
    return typeOf(doc.causale) === 'array' && doc.causale[0] === desc;
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
        hasColumnNames(codici.COLUMN_NAMES.Giacenze);
        hasGiacenze(doc.rows);
        break;
      //TODO rimuovere? finora uso solo "Giacenze"...
      case 'Inventario':
        mustBeAdmin();
        hasColumnNames(codici.COLUMN_NAMES.Inventario);
        hasInventario(doc.rows);
        break;
      case 'MovimentoMagazzino':
        if ((oldDoc && oldDoc.hasOwnProperty('accodato')) ||
            doc.hasOwnProperty('verificato') ||
            (doc.hasOwnProperty('accodato') && !hasCausale('VENDITA A CLIENTI'))) {
          mustBeAdmin();
        } else {
          mustBeOwner();
        }
        if ((doc.hasOwnProperty('accodato') && doc.accodato !== 1) ||
            (oldDoc && !doc.accodato && oldDoc.accodato && doc.verificato !== 1)) {
          error('Invalid accodato');
        }
        if ((oldDoc && oldDoc.verificato && doc.verificato !== oldDoc.verificato) ||
            (!(doc.verificato && hasCausale('RETTIFICA INVENTARIO +') && !doc.hasOwnProperty('daEsterno')) &&
             (doc.verificato && (doc.accodato || !oldDoc || !oldDoc.accodato)))) {
          error('Invalid verificato');
        }
        hasValidAziendaCode();
        // TODO l'utente negozio può scaricare solo dal suo magazzino di tipo 3.
        if (codes.length !== 4) {
          error('Invalid code');
        } else if (!codici.isYear(codes[1])) {
          error('Invalid year');
        } else if (!codici.isGruppoNumerazione(codes[2])) {
          error('Invalid gruppo');
        } else if (!codici.isNumero(codes[3])) {
          error('Invalid numero');
        }
        if ((doc.hasOwnProperty('daEsterno') && doc.daEsterno !== 1) ||
            (doc.hasOwnProperty('aEsterno') && doc.aEsterno !== 1) ||
            ((doc.daEsterno || doc.aEsterno) && doc.verificato !== 1)) {
          error('Invalid da/aEsterno');
        }
        if (!codici.isYyyyMmDdDate(doc.data, codes[1])) {
          error('Invalid data');
        }
        hasColumnNames(['barcode', 'scalarino', 'descrizioneTaglia', 'descrizione', 'costo', 'qta']);
        // TODO questo codice è illeggibile
        if (typeOf(doc.causale) !== 'array' || doc.causale.length !== 2 ||
            !codici.CAUSALI_MOVIMENTO_MAGAZZINO.some(function (causale) {
              if (causale.descrizione === doc.causale[0] && causale.segno === doc.causale[1]) {
                if (!causale.hasOwnProperty('causaleA')) {
                  return true;
                }
                if (!codici.isCodiceAzienda(doc.a)) {
                  error('Invalid a');
                  return false;
                }
                var causaleA = codici.CAUSALI_MOVIMENTO_MAGAZZINO[causale.causaleA];
                return typeOf(doc.causaleA) === 'array' && doc.causaleA.length === 2 &&
                  causaleA.descrizione === doc.causaleA[0] && causaleA.segno === doc.causaleA[1];
              }
            })) {
          error('Invalid causale');
        }
        // TODO usare CODICI
        if (doc.hasOwnProperty('tipoMagazzino') && !codici.isTipoMagazzino(doc.tipoMagazzino)) {
          error('Invalid tipoMagazzino');
        }
        if (doc.hasOwnProperty('tipoMagazzinoA') && !codici.isTipoMagazzino(doc.tipoMagazzinoA)) {
          error('Invalid tipoMagazzinoA');
        }
        if (doc.hasOwnProperty('inProduzione') && doc.inProduzione !== 1) {
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
        if (!codici.idListino(codes[0])) {
          error('Invalid code');
        }
        if (doc.hasOwnProperty('versioneBase') && (codici.idListino(doc.versioneBase) === doc._id || !codici.isNumero(doc.versioneBase))) {
          error('Invalid versioneBase');
        }
        hasColumnNames(['costo', 'prezzo1', 'prezzo2', 'offerta']);
        hasValidListino(doc.prezzi, doc.versioneBase);
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
