/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['assert', 'lib/servers', 'dbconfig', 'nano', 'path', 'q', 'csv'], function(assert, servers, dbconfig, nano, path, Q, csv) {
  'use strict';
  var inputName = process.argv[2];
  var dbServer = nano(servers.couchdb.authUrl());
  var db = dbServer.scope(dbconfig.db);

  function putDoc(db, doc, docId) {
    var deferred = Q.defer();
    db.get(docId, function(err, oldDoc) {
      if (err && err['status-code'] !== 404) {
        return deferred.reject(new Error(err));
      }
      if (oldDoc) {
        doc._rev = oldDoc._rev;
      }
      db.insert(doc, docId, function(err) {
        if (err) {
          return deferred.reject(new Error(err));
        }
        deferred.resolve(docId);
      });
    });
    return deferred.promise;
  }

  function readCsv(csvFileName) {
    var foto = {};
    var deferred = Q.defer();
    csv()
      .fromPath(path.join(process.cwd(), csvFileName), { columns: true })
      .on('data', function(data) {
        var idFoto = data.Pagina_Posizione_Foto;
        if (!foto[idFoto]) {
          var docId = 'Foto_' + idFoto.replace(/ +/g, '_');
          foto[idFoto] = { _id: docId, articoli: [] };
        }
        foto[idFoto].articoli.push({ stagione: data.Stagione, modello: data.Modello, articolo: data.Articolo, colore: data.Colore });
      })
      .on('end', function() {
        deferred.resolve(foto);
      })
      .on('error', function(error) {
        deferred.reject(new Error(error));
      });
    return deferred.promise;
  }

  readCsv(inputName).then(function(foto) {
    var docs = Object.keys(foto).map(function(id) {
      return putDoc(db, foto[id], foto[id]._id);
    });
    return Q.all(docs);
  })
  .then(function(ids) {
    console.dir(ids);
  })
  .end();
});
