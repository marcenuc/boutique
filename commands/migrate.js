/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['q', 'nano', 'lib/servers', 'views/lib/codici', 'dbconfig'], function (Q, nano, servers, codici, dbconfig) {
  'use strict';
  var source = nano(process.argv[2]).use(process.argv[3]),
    target = nano(servers.couchdb.authUrl()).use(dbconfig.db),
    getSrc = Q.node(source.get, source),
    getDst = Q.node(target.get, target),
    save = Q.node(target.insert, target);

  function viewPath(viewName) {
    return ['_design', dbconfig.designDoc, '_view', viewName].join('/');
  }

  function nextId(codiceAzienda, data, gruppo) {
    var anno = parseInt(data.substring(0, 4), 10);
    return getDst(viewPath('contatori'), {
      limit: 1,
      descending: true,
      startkey: [codiceAzienda, anno, gruppo, {}],
      endkey: [codiceAzienda, anno, gruppo]
    }).then(function (bh) {
      var rows = bh[0].rows,
        numero = rows.length ? rows[0].key[3] : 0;
      return codici.idMovimentoMagazzino(codiceAzienda, anno, gruppo, numero + 1);
    });
  }

  function build(magazzino1, data, causale1, rows, magazzino2, riferimento, oldId) {
    function newMovimentoMagazzino(id) {
      var infoCausale = codici.infoCausale(causale1),
        doc = {
          _id: id,
          old_id: oldId,
          data: data,
          causale1: infoCausale.causale1,
          columnNames: codici.COLUMN_NAMES.MovimentoMagazzino,
          rows: rows || [],
          accodato: 1
        };
      if (codici.hasExternalWarehouse(magazzino1)) {
        doc.esterno1 = 1;
      }
      if (infoCausale.causale2) {
        doc.causale2 = infoCausale.causale2;
        if (magazzino2) {
          if (codici.hasExternalWarehouse(magazzino2)) {
            doc.esterno2 = 1;
          }
          doc.magazzino2 = codici.parseIdAzienda(magazzino2._id).codice;
        }
      }
      if (riferimento) {
        doc.riferimento = riferimento;
      }
      return doc;
    }

    var codiceAzienda = codici.parseIdAzienda(magazzino1._id).codice;
    return nextId(codiceAzienda, data, causale1.gruppo).then(function (id) {
      return newMovimentoMagazzino(id);
    });
  }

  function createMovimentoMagazzino(aziende, mm, rows, riferimento, oldId) {
    var magazzino1 = aziende[mm.magazzino1].doc,
      magazzino2 = aziende.hasOwnProperty(mm.magazzino2) ? aziende[mm.magazzino2].doc : null;
    return build(magazzino1, mm.data, mm.causale1, rows, magazzino2, riferimento, oldId).then(function (newDoc) {
      return save(newDoc, newDoc._id).then(function (bh) {
        return bh[0].id;
      });
    });
  }

  function convertCausale(oldCausale) {
    var c = {
        "VENDITA": ['VENDITA A CLIENTI', -1, 0],
        "TRASFERIMENTO": ['SCARICO PER CAMBIO MAGAZZINO', -1, 1],
        "RETTIFICA INVENTARIO +": ['RETTIFICA INVENTARIO +', 1, 0],
        "RETTIFICA INVENTARIO -": ['RETTIFICA INVENTARIO -', -1, 0],
        "RESO SU ACQUISTO": ['RESO SU ACQUISTO', -1, 0],
        "CARICO": ['CARICO PER CAMBIO MAGAZZINO', 1, 0],
        "C/VENDITA": ['CARICO PER CAMBIO MAGAZZINO', 1, 0],
        "ACQUISTO": ['ACQUISTO', 1, 0]
      }[oldCausale[0]],
      causale = codici.findCausaleMovimentoMagazzino(c[0], c[1]);
    if (!causale) {
      throw new Error('Unknown causale: ' + oldCausale.join(' '));
    }
    return causale;
  }

  function migrateDoc(doc, aziende, descrizioniTaglie, listaModelli, codiceAzienda) {
    return getDst(viewPath('old_id'), { key: doc._id }).then(function (bh) {
      if (bh[0].rows.length > 0) {
        return doc._id + ' (already done)';
      }
      var colI = codici.colNamesToColIndexes(doc.columnNames),
        colM = codici.colNamesToColIndexes(codici.COLUMN_NAMES.MovimentoMagazzino),
        rows = doc.rows.map(function (r) {
          var row = [],
            codes = codici.parseBarcodeAs400(r[colI.barcode]),
            descrizioni = codici.descrizioniModello(codes.stagione, codes.modello, codes.taglia, descrizioniTaglie, listaModelli);
          if (descrizioni[0]) {
            throw new Error(descrizioni[0]);
          }
          row[colM.barcode] = r[colI.barcode];
          row[colM.scalarino] = descrizioni[1].scalarino;
          row[colM.descrizioneTaglia] = descrizioni[1].descrizioneTaglia;
          row[colM.descrizione] = descrizioni[1].descrizione;
          row[colM.costo] = 0;
          row[colM.qta] = r[colI.qta];
          return row;
        }),
        mm = { magazzino1: codiceAzienda, data: doc.data, causale1: convertCausale(doc.causale) };
      if (doc.destinazione) {
        mm.magazzino2 = doc.destinazione;
      } else if (mm.causale1.causale2 >= 0) {
        console.log('Default magazzino2 per ' + doc._id);
        mm.magazzino2 = '019998';
      }
      return createMovimentoMagazzino(aziende, mm, rows, doc.riferimento, doc._id);
    });
  }

  function migrateMovimenti(aziende, descrizioniTaglie, listaModelli, codiceAzienda) {
    return getSrc('_all_docs', {
      include_docs: true,
      startkey: 'MovimentoMagazzino_' + codiceAzienda + '_2011_',
      endkey: 'MovimentoMagazzino_' + codiceAzienda + '_2011_\ufff0'
    }).then(function (bh) {
      function goOn(rowsI) {
        var rows = rowsI[0], i = rowsI[1];
        if (i < rows.length) {
          return migrateDoc(rows[i].doc, aziende, descrizioniTaglie, listaModelli, codiceAzienda).then(function (v) {
            console.log(v);
            return Q.when([rows, i + 1], goOn);
          });
        }
        return 'Done ' + codiceAzienda;
      }
      return Q.when([bh[0].rows, 0], goOn);
    });
  }

  function migrateInventario(aziende, descrizioniTaglie, listaModelli, codiceAzienda) {
    var idInventario = 'Inventario_' + codiceAzienda + '_3';
    return getDst(viewPath('old_id'), { key: idInventario }).then(function (bh) {
      if (bh[0].rows.length > 0) {
        return idInventario + ' (already done)';
      }
      return getSrc(idInventario).then(function (bh) {
        var inventario = bh[0],
          colI = codici.colNamesToColIndexes(inventario.columnNames),
          colM = codici.colNamesToColIndexes(codici.COLUMN_NAMES.MovimentoMagazzino),
          rows = inventario.rows.map(function (r) {
            if (r[colI.inProduzione]) {
              throw new Error('Articolo in produzione in inventario ' + codiceAzienda);
            }
            var row = [],
              codes = codici.parseBarcodeAs400(r[colI.barcode]),
              descrizioni = codici.descrizioniModello(codes.stagione, codes.modello, codes.taglia, descrizioniTaglie, listaModelli);
            if (descrizioni[0]) {
              throw new Error(descrizioni[0]);
            }
            row[colM.barcode] = r[colI.barcode];
            row[colM.scalarino] = descrizioni[1].scalarino;
            row[colM.descrizioneTaglia] = descrizioni[1].descrizioneTaglia;
            row[colM.descrizione] = descrizioni[1].descrizione;
            row[colM.costo] = r[colI.costo];
            row[colM.qta] = r[colI.giacenza];
            return row;
          }),
          mm = { magazzino1: codiceAzienda, data: '20110601', causale1: codici.findCausaleMovimentoMagazzino('RETTIFICA INVENTARIO +', 1) };
        return createMovimentoMagazzino(aziende, mm, rows, undefined, idInventario);
      }, function (e) {
        if (e['status-code'] !== 404) {
          throw e;
        }
        return idInventario + ' (not found)';
      });
    });
  }

  function viewToMapByKey(view) {
    var map = {};
    view.rows.forEach(function (row) {
      map[row.key] = row.value === null ? row.doc : row;
    });
    return map;
  }

  getDst(viewPath('aziende'), { include_docs: true }).then(function (bh) {
    return viewToMapByKey(bh[0]);
  }).then(function (aziende) {
    return getDst('TaglieScalarini').then(function (bh) {
      var descrizioniTaglie = bh[0].descrizioniTaglie;
      return getDst('ModelliEScalarini').then(function (bh) {
        var listaModelli = bh[0].lista;
        Object.keys(aziende).forEach(function (codiceAzienda) {
          migrateInventario(aziende, descrizioniTaglie, listaModelli, codiceAzienda).then(function (v) {
            console.log(v);
            return migrateMovimenti(aziende, descrizioniTaglie, listaModelli, codiceAzienda);
          })
            .then(console.log)
            .end();
        });
      });
    });
  }).end();
});
