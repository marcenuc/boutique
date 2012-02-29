/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['q', 'nano', 'lib/servers', 'views/lib/codici', 'dbconfig'], function (Q, nano, servers, codici, dbconfig) {
  'use strict';
  var id1 = process.argv[2],
    id2 = process.argv[3],
    db = nano(servers.couchdb.authUrl()).use(dbconfig.db),
    get = Q.node(db.get, db);

  get(id1).then(function (bh) {
    var mm1 = bh[0],
      rows1 = mm1.rows,
      col1 = codici.colNamesToColIndexes(mm1.columnNames);
    return get(id2).then(function (bh) {
      var mm2 = bh[0],
        rows2 = mm2.rows,
        col2 = codici.colNamesToColIndexes(mm2.columnNames),
        i = null;
      console.log(rows1.length, rows2.length);
      function hasRow(row1) {
        return rows2.some(function (row2, i2) {
          i = i2;
          return row1[col1.barcode] === row2[col2.barcode] && row1[col1.qta] === row2[col2.qta];
        });
      }
      rows1.forEach(function (row1) {
        if (hasRow(row1)) {
          rows2.splice(i, 1);
        } else {
          console.dir(row1);
        }
      });
      console.log(rows1.length, rows2.length);
      rows2.forEach(function (row2) {
        console.dir(row2);
      });
    });
  }).end();
});
