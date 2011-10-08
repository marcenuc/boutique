function validate_doc_update(doc, oldDoc, userCtx, secObj) {
  'use strict';
  var es = [], i, n, rows, r,
    typeAndCode = /^([A-Z][a-zA-Z0-9]+)(?:_([0-9A-Z_]+))?$/.exec(doc._id || '');

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

  function validDate(year, month, day) {
    var y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10);
    return m > 0 && m < 13 && y > 0 && y < 32768 && d > 0 && d <= (new Date(y, m, 0)).getDate();
  }

  function isValidAziendaCode(code) {
    return (/^\d{6}$/).test(code);
  }

  function hasValidAziendaCode() {
    if (!isValidAziendaCode(typeAndCode[2])) {
      error('Invalid azienda code');
    }
  }

  function hasValidBollaAs400Code() {
    var m = /^(\d\d)(\d\d)(\d\d)_([1-9]\d*)_([A-Z])_(\d+)$/.exec(typeAndCode[2]);
    if (!m || !validDate(m[1], m[2], m[3])) {
      error('Invalid code');
    }
  }

  function hasValidListinoCode() {
    var m = /^(\d)_(\d{4})(\d{2})(\d{2})$/.exec(typeAndCode[2]);
    if (!m || !validDate(m[2], m[3], m[4])) {
      error('Invalid code');
    }
  }

  function checkListino(prezzi) {
    var count = 0, codice;
    for (codice in prezzi) {
      if (prezzi.hasOwnProperty(codice)) {
        if (/^\d{12}$/.test(codice)) {
          r = prezzi[codice];
          if (typeof r !== 'number') {
            error('Invalid price for "' + codice + '"');
          } else {
            count += 1;
          }
        } else {
          error('Invalid code: "' + codice + '"');
        }
      }
    }
    return count;
  }

  function hasInventario(inventario) {
    if (!inventario || !inventario.length) {
      error('Inventario vuoto');
      return;
    }
    inventario.forEach(function (row, idx) {
      if (typeOf(row) !== 'array' || row.length < 5) {
        return error('Invalid row: ' + JSON.stringify(row));
      }
      var barcode = row[0];
      if (!/^\d{18}$/.test(barcode)) {
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

  if (!userCtx.name) {
    error('Non autorizzato');
  }
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
            if (!r[0] || !/^\d{18}$/.test(r[0])) {
              error('Invalid barcode at row ' + i + ': ' + JSON.stringify(r));
            }
            if (typeof r[1] !== 'number') {
              error('Invalid qta at row ' + i + ': ' + JSON.stringify(r));
            }
          }
        }
        break;
      case 'Azienda':
        hasValidAziendaCode();
        mustHave('nome');
        break;
      case 'Cliente':
        mustHave('nome');
        break;
      case 'Scalarini':
        mustHave('descrizioni');
        mustHave('posizioniCodici');
        mustHave('posizioneCodici');
        break;
      case 'TaglieScalarini':
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
        mustHave('lista');
        break;
      case 'Inventari':
        mustHave('data');
        mustHave('inventario');
        break;
      case 'Giacenze':
        //TODO richiedere l'utente 'magazzino'
        //if (userCtx.name !== 'magazzino') {
        //  error('Utente non autorizzato');
        //}
        if (!doc.columnNames) {
          error('Required field: columnNames');
        } else {
          if (['barcode', 'giacenza', 'azienda', 'stato', 'tipoMagazzino'].some(function (column, idx) {
              return column !== doc.columnNames[idx];
            })) {
            error('Invalid columnNames');
          }
        }
        hasInventario(doc.rows);
        break;
      case 'Inventario':
        hasValidAziendaCode();
        break;
      case 'CausaliAs400':
        mustHave('1');
        mustHave('2');
        break;
      case 'Listino':
        hasValidListinoCode();
        if (!doc.negozio) {
          error('Listino vuoto');
        } else if (checkListino(doc.negozio) === 0) {
          error('Listino senza righe valide');
        }
        checkListino(doc.outlet);
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
