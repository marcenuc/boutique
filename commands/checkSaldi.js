/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['q', 'nano', 'lib/servers', 'views/lib/codici', 'dbconfig'], function (Q, nano, servers, codici, dbconfig) {
  'use strict';
  var db = nano(servers.couchdb.authUrl()).use(dbconfig.db),
    get = Q.node(db.get, db);

  function viewPath(viewName) {
    return ['_design', dbconfig.designDoc, '_view', viewName].join('/');
  }

  function viewToMapByKey(view) {
    var map = {};
    view.rows.forEach(function (row) {
      map[row.key] = row.value === null ? row.doc : row;
    });
    return map;
  }

  get(viewPath('giacenze2011'), { group: true }).then(function (bh) {
    var giacenze2011 = bh[0].rows.filter(function (row) {
      return row.value !== 0;
    });
    console.log(giacenze2011.length);
    return get(viewPath('aziende'), { include_docs: true }).then(function (bh) {
      return viewToMapByKey(bh[0]);
    }).then(function (aziende) {
      Object.keys(aziende).forEach(function (codiceAzienda) {
        var azienda = aziende[codiceAzienda].doc;
        if (codici.hasExternalWarehouse(azienda)) {
          return codiceAzienda + ' (esterno)';
        }
        console.log(codiceAzienda);
        get('MovimentoMagazzino_' + codiceAzienda + '_2012_D_1').then(function (bh) {
          var mm = bh[0], col = codici.colNamesToColIndexes(mm.columnNames);
          mm.rows.forEach(function (mmRow) {
            var i, ii, g;
            for (i = 0, ii = giacenze2011.length; i < ii; i += 1) {
              g = giacenze2011[i];
              if (g.key[0] === codiceAzienda && g.key[1] === mmRow[col.barcode] && g.value === mmRow[col.qta]) {
                return giacenze2011.splice(i, 1);
              }
            }
            console.dir([codiceAzienda, mmRow]);
          });
          console.log(codiceAzienda, giacenze2011.length);
        }).end();
      });
    });
  }).end();
});
