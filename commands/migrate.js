/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['q', 'nano', 'lib/servers', 'views/lib/codici', 'dbconfig'], function (Q, nano, servers, codici, dbconfig) {
  'use strict';
  var target = nano(servers.couchdb.authUrl()).use(dbconfig.db),
    get = Q.node(target.get, target),
    save = Q.node(target.insert, target);

  function viewPath(viewName) {
    return ['_design', dbconfig.designDoc, '_view', viewName].join('/');
  }

  function fixFlag(doc, field) {
    if (doc.hasOwnProperty(field)) {
      doc[field] = !!doc[field];
    }
  }

  function migrateDoc(docId, listini) {
    return get(viewPath('oldDoc'), { key: docId, include_docs: true }).then(function (bh) {
      if (bh[0].rows.length === 0) {
        return docId + ' (already done)';
      }
      var doc = bh[0].rows[0].doc,
        col = codici.colNamesToColIndexes(doc.columnNames),
        codiceAzienda = codici.parseIdMovimentoMagazzino(doc._id).magazzino1;
      doc.rows.forEach(function (r) {
        var codes = codici.parseBarcodeAs400(r[col.barcode]),
          prezzi = codici.readListino(listini, codiceAzienda, codes.stagione, codes.modello, codes.articolo);
        if (prezzi) {
          r[col.costo] = prezzi[1][prezzi[0].costo];
        }
      });
      fixFlag(doc, 'accodato');
      fixFlag(doc, 'esterno1');
      fixFlag(doc, 'esterno2');
      fixFlag(doc, 'inProduzione');
      return save(doc, doc._id);
    });
  }

  function migrateMovimenti(listini) {
    return get('_all_docs', {
      startkey: 'MovimentoMagazzino_',
      endkey: 'MovimentoMagazzino_\ufff0'
    }).then(function (bh) {
      function goOn(rowsI) {
        var rows = rowsI[0], i = rowsI[1];
        if (i < rows.length) {
          return migrateDoc(rows[i].id, listini).then(function (v) {
            console.log(v);
            return Q.when([rows, i + 1], goOn);
          });
        }
        return 'Done';
      }
      return Q.when([bh[0].rows, 0], goOn);
    });
  }

  function viewToMapByKey(view) {
    var map = {};
    view.rows.forEach(function (row) {
      map[row.key] = row.value === null ? row.doc : row;
    });
    return map;
  }

  function setCol(docs) {
    Object.keys(docs).forEach(function (docKey) {
      var doc = docs[docKey];
      doc.col = codici.colNamesToColIndexes(doc.columnNames);
    });
    return docs;
  }

  get(viewPath('listini'), { include_docs: true }).then(function (bh) {
    return setCol(viewToMapByKey(bh[0]));
  }).then(function (listini) {
    return migrateMovimenti(listini);
  })
    .then(console.log)
    .end();
});
