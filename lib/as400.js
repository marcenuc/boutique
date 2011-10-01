/*jslint node: true */
/*jshint node: true */

(function () {
  'use strict';
  var _ = require('underscore'),
    execBuffered = require('./taskutil').execBuffered,
    codeNames = ['stagione', 'modello', 'articolo', 'colore', 'taglia'],
    lengthCodice = { stagione: 3, modello: 5, articolo: 4, colore: 4, taglia: 2 },
    rexp = {};

  lengthCodice.barcode = _.reduce(codeNames, function (sum, cod) {
    return sum + lengthCodice[cod];
  }, 0);

  //TODO DRY use it instead of patterns.js
  rexp.barcode = new RegExp('^(' + _.map(codeNames, function (cod) {
    var len = lengthCodice[cod],
      t = '\\d{' + len + '}';
    rexp[cod] = new RegExp('^' + t + '$');
    return t;
  }).join(')(') + ')$');

  //TODO DRY copied from controllers.js
  function colNamesToColIndexes(columnNames) {
    var col = {}, i = 0, n = columnNames.length;
    for (; i < n; i += 1) {
      col[columnNames[i]] = i;
    }
    return col;
  }

  function buildModelliEScalariniAs400(modelliEScalarini) {
    var r, stagione, modello, descrizione, scalarino,
      col = colNamesToColIndexes(modelliEScalarini.columnNames),
      rows = modelliEScalarini.rows, i = 0, n = rows.length,
      warns = [], lista = {};
    for (; i < n; i += 1) {
      r = rows[i];
      stagione = r[col.stagione];
      modello = r[col.modello];
      descrizione = (r[col.descrizione] || '').trim();
      scalarino = (r[col.scalarino] || '').trim();
      if (!rexp.stagione.test(stagione || '')) {
        warns.push('Stagione non valida: stagione="' + stagione + '"');
      } else if (!rexp.modello.test(modello || '')) {
        warns.push('Modello non valido: stagione="' + stagione + '", modello="' + modello + '"');
      } else if (!descrizione) {
        warns.push('Manca descrizione: stagione="' + stagione + '", modello="' + modello + '", descrizione="' + descrizione + '"');
      } else if (!/^\d+$/.test(scalarino || '')) {
        warns.push('Manca scalarino: stagione="' + stagione + '", modello="' + modello + '", descrizione="' + descrizione + '", scalarino="' + scalarino + '"');
      } else {
        lista[stagione + modello] = [descrizione, parseInt(scalarino, 10)];
      }
    }

    return [warns, { _id: 'ModelliEScalarini', lista: lista }];
  }

  function buildCausaliAs400(causaliCliente, causaliDisponibile) {
    var c1 = {}, c2 = {}, warns = [],
      rexpV = /^([\-+*A-Za-z. \/0-9]{16})([AK])[\d ]{4}[AK]?/,
      rexpK1 = /^MC(\d\d)$/, rexpK2 = /^MD(\d\d)$/;

    function parse(c, rexpK, dest) {
      var mk = rexpK.exec(c[0]), mv = rexpV.exec(c[1]);
      if (!mk) {
        if (c[0] !== 'MC?') {
          warns.push('Chiave non valida: chiave="' + c[0] + '"');
        }
      } else if (!mv) {
        warns.push('Valore non valido: chiave="' + c[0] + '", valore="' + c[1] + '"');
      } else {
        dest[mk[1]] = [ mv[1].trim(), mv[2] === 'A' ? -1 : 1 ];
      }
    }

    causaliCliente.rows.forEach(function (c) {
      parse(c, rexpK1, c1);
    });
    causaliDisponibile.rows.forEach(function (c) {
      parse(c, rexpK2, c2);
    });
    return [warns, { _id: 'CausaliAs400', '1': c1, '2': c2 }];
  }

  //TODO exports for unit test. Better options?
  exports.buildModelliEScalariniAs400 = buildModelliEScalariniAs400;
  exports.buildCausaliAs400 = buildCausaliAs400;


  function fetchModelliEScalariniAs400(callback) {
    execBuffered('java', ['-jar', 'as400-querier.jar', 'modelli'], function (err, docAs400) {
      if (err) {
        return callback(err);
      }
      try {
        callback(err, buildModelliEScalariniAs400(JSON.parse(docAs400)));
      } catch (errJ) {
        return callback(errJ);
      }
    });
  }

  function fetchCausaliAs400(callback) {
    function get(selector, callbackGet) {
      execBuffered('java', ['-jar', 'as400-querier.jar', 'codifiche', 'selector=' + selector], callbackGet);
    }

    get('MC', function (errC, causaliCliente) {
      if (errC) {
        return callback(errC);
      }
      var cC;
      try {
        cC = JSON.parse(causaliCliente);
      } catch (err) {
        return callback(err);
      }
      get('MD', function (errD, causaliDisponibile) {
        if (errD) {
          return callback(errD);
        }
        try {
          callback(null, buildCausaliAs400(cC, JSON.parse(causaliDisponibile)));
        } catch (err) {
          return callback(err);
        }
      });
    });
  }

  function saveIfChanged(err, couchdb, warnsAndDoc, callback) {
    if (err) {
      return callback(err);
    }
    var doc = warnsAndDoc[1];
    couchdb.get(doc._id, function (errGet, oldDoc) {
      if (errGet) {
        if (errGet.error !== 'not_found') {
          return callback(errGet);
        }
      } else {
        doc._rev = oldDoc._rev;
      }

      if (errGet || !_.isEqual(doc, oldDoc)) {
        couchdb.save(doc._id, doc, function (errSave, res) {
          callback(errSave, warnsAndDoc[0], res);
        });
      } else {
        callback(null, warnsAndDoc[0]);
      }
    });
  }

  exports.updateModelliEScalariniAs400 = function (couchdb, callback) {
    fetchModelliEScalariniAs400(function (err, warnsAndDoc) {
      saveIfChanged(err, couchdb, warnsAndDoc, callback);
    });
  };

  exports.updateCausaliAs400 = function (couchdb, callback) {
    fetchCausaliAs400(function (err, warnsAndDoc) {
      saveIfChanged(err, couchdb, warnsAndDoc, callback);
    });
  };
}());