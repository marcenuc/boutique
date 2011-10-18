/*global define: false, exports: false, require: false, CODICI: false*/
function validate_doc_update(doc, oldDoc, userCtx, secObj) {
  'use strict';
  var es = [], i, n, rows, r,
    typeAndCode = /^([A-Z][a-zA-Z0-9]+)(?:_([0-9A-Za-z_]+))?$/.exec(doc._id || ''),
    codes = typeAndCode && typeAndCode[2] ? typeAndCode[2].split('_') : null,
    codici = typeof require === 'function' ? require('codici') : CODICI;

  // TODO CouchDB has isArray() function: use it.
  function typeOf(value) {
    var s = typeof value;
    if (s === 'object') {
      if (value) {
        if (typeof value.length === 'number' &&
            !(value.propertyIsEnumerable('length')) &&
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

  function isValidYear(year) {
    return year && (/^\d{4}$/).test(year) && parseInt(year, 10) > 2010;
  }

  function isValidDate(year, month, day) {
    var y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
    return m > 0 && m < 13 && y > 0 && y < 32768 && d > 0 && d <= (new Date(y, m, 0)).getDate();
  }

  function isValidYyyyMmDdDate(yyyymmdd, validYear) {
    var m = /^(\d{4})(\d\d)(\d\d)$/.exec(yyyymmdd);
    return m && (!validYear || validYear === m[1]) && isValidDate(m[1], m[2], m[3]);
  }

  function isValidAziendaCode(c) {
    //TODO DRY taken from CODICI
    return c && (/^\d{6}$/).test(c);
  }

  function isValidBarcode(c) {
    return c && codici.rexpBarcodeAs400.test(c);
  }

  function hasValidAziendaCode() {
    if (!isValidAziendaCode(codes[0])) {
      error('Invalid azienda code');
    }
  }

  function hasValidBollaAs400Code() {
    var m = /^(\d\d)(\d\d)(\d\d)_([1-9]\d*)_([A-Z])_(\d+)$/.exec(typeAndCode[2]);
    if (!m || !isValidDate(m[1], m[2], m[3])) {
      error('Invalid code');
    }
  }

  function hasValidListinoCode() {
    // TODO DRY usare codes[] e isValidYyyyMmDdDate()
    var m = /^(\d)_(\d{4})(\d{2})(\d{2})$/.exec(typeAndCode[2]);
    if (!m || !isValidDate(m[2], m[3], m[4])) {
      error('Invalid code');
    }
  }

  function hasValidListino(prezzi) {
    if (!prezzi) {
      return error('Listino vuoto');
    }
    var codice, j, l, vuoto = true;
    for (codice in prezzi) {
      if (prezzi.hasOwnProperty(codice)) {
        vuoto = false;
        // TODO DRY '\d{12}' è codiceListino
        if (/^\d{12}$/.test(codice)) {
          r = prezzi[codice];
          if (typeOf(r) !== 'array') {
            error('Invalid row at: "' + codice + '"');
          } else {
            l = typeof r[r.length - 1] === 'string' ? r.length - 1 : r.length;
            if (l < 1) {
              error('Invalid row at: "' + codice + '"');
            } else {
              for (j = 0; j < l; j += 1) {
                if (typeof r[j] !== 'number') {
                  error('Invalid row at: "' + codice + '"');
                }
              }
            }
          }
        } else {
          error('Invalid code: "' + codice + '"');
        }
      }
    }
    if (vuoto) {
      return error('Listino vuoto');
    }
  }

  function hasInventario(inventario) {
    if (!inventario || !inventario.length) {
      error('Inventario vuoto');
      return;
    }
    // TODO verificare anche l'ordinamento
    inventario.forEach(function (row, idx) {
      if (typeOf(row) !== 'array' || row.length < 5) {
        return error('Invalid row: ' + JSON.stringify(row));
      }
      var barcode = row[0];
      if (!isValidBarcode(barcode)) {
        error('Invalid barcode at row ' + idx + ': "' + barcode + '"');
      }
      if (typeof row[1] !== 'number' || row[1] <= 0) {
        error('Invalid quantity at row ' + idx + ': "' + barcode + '"');
      }
      if (!isValidAziendaCode(row[2])) {
        error('Invalid azienda at row ' + idx + ': "' + barcode + '"');
      }
      if (row[3] !== 0 && row[3] !== 1) {
        error('Invalid status at row ' + idx + ': "' + barcode + '"');
      }
      if (row[4] !== 1 && row[4] !== 2 && row[4] !== 3) {
        error('Invalid store type at row ' + idx + ': "' + barcode + '"');
      }
    });
  }

  function hasElencoArticoli(elenco) {
    if (!elenco || !elenco.length) {
      error('Elenco vuoto');
      return;
    }
    elenco.forEach(function (row, idx) {
      if (typeOf(row) !== 'array' || row.length < 2) {
        return error('Invalid row: ' + JSON.stringify(row));
      }
      var barcode = row[0];
      if (!isValidBarcode(barcode)) {
        error('Invalid barcode at row ' + idx + ': "' + barcode + '"');
      }
      if (typeof row[1] !== 'number' || row[1] <= 0) {
        error('Invalid quantity at row ' + idx + ': "' + barcode + '"');
      }
    });
  }

  function hasInventarioNegozio(inventario) {
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
      if (!/^\d{18}$/.test(barcode)) {
        error('Invalid barcode at row ' + idx + ': "' + barcode + '"');
      }
      if (typeof row[1] !== 'number' || row[1] <= 0) {
        error('Invalid quantity at row ' + idx + ': "' + barcode + '"');
      }
      if (typeof row[2] !== 'number' || row[2] <= 0) {
        error('Invalid costo at row ' + idx + ': "' + barcode + '"');
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
            if (!isValidBarcode(r[0])) {
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
        hasColumnNames(['barcode', 'giacenza', 'azienda', 'stato', 'tipoMagazzino']);
        hasInventario(doc.rows);
        break;
      case 'Inventario':
        mustBeOwner();
        hasValidAziendaCode();
        hasColumnNames(['barcode', 'giacenza', 'costo']);
        hasInventarioNegozio(doc.rows);
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
        } else if (!isValidYear(codes[1])) {
          error('Invalid year');
        } else if (!/^\d+$/.test(codes[2])) {
          error('Invalid numero');
        }
        if (!isValidYyyyMmDdDate(doc.data, codes[1])) {
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
        } else if (r[2] && !isValidAziendaCode(doc.destinazione)) {
          error('Invalid destinazione');
        }
        hasElencoArticoli(doc.rows);
        break;
      case 'CausaliAs400':
        mustBeAdmin();
        mustHave('1');
        mustHave('2');
        break;
      case 'Listino':
        mustBeAdmin();
        hasValidListinoCode();
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
