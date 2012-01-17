/*global define: false*/

define(['nano', 'lib/servers', 'dbconfig', 'app/js/codici', 'lib/couchutil'], function (nano, servers, dbconfig, codici, couchutil) {
  'use strict';
  function hasValues(hash) {
    return Object.keys(hash).length > 0;
  }

  function update(callback) {
    var db = nano(servers.couchdb.authUrl()).use(dbconfig.db);
    db.view(dbconfig.designDoc, 'giacenze', { group: true }, function (err, giacenze) {
      if (err) {
        return callback(err);
      }
      var macsAzIpTm, oldMacsAzIpTm = null, i, ii, ir, key, or = null, irows = giacenze.rows,
        col = codici.colNamesToColIndexes(codici.COLUMN_NAMES.Giacenze),
        inventario = {
          _id: 'Giacenze',
          columnNames: codici.COLUMN_NAMES.Giacenze,
          rows: []
        };
      for (i = 0, ii = irows.length; i < ii; i += 1) {
        ir = irows[i];
        key = ir.key;
        macsAzIpTm = key[0] + key[1] + key[2] + key[3] + key[4] + key[5] + key[6];
        if (macsAzIpTm !== oldMacsAzIpTm) {
          if (or && hasValues(or[col.giacenze])) {
            inventario.rows.push(or);
          }
          or = [];
          or[col.stagione] = key[3];
          or[col.modello] = key[0];
          or[col.articolo] = key[1];
          or[col.colore] = key[2];
          or[col.codiceAzienda] = key[4];
          or[col.inProduzione] = key[5];
          or[col.tipoMagazzino] = key[6];
          or[col.giacenze] = {};
          oldMacsAzIpTm = macsAzIpTm;
        }
        if (ir.value) {
          or[col.giacenze][key[8]] = ir.value;
        }
      }
      if (or && hasValues(or[col.giacenze])) {
        inventario.rows.push(or);
      }

      couchutil.saveIfChanged2(db, inventario, callback);
    });
  }

  return {
    update: update,

    verifica: function (callback) {
      var db = nano(servers.couchdb.authUrl()).use(dbconfig.db);
      db.view(dbconfig.designDoc, 'giacenzeNegative', {}, callback);
    }
  };
});
