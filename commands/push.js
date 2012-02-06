/*global console:false, require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['path', 'fs', 'nano', 'couchdbs', 'lib/servers', 'q'], function (path, fs, nano, couchdbs, servers, Q) {
  'use strict';
  var docsBaseFolder = process.argv[2],
    doReset = process.argv[3] === 'Yes, delete EVERYTHING! I am NOT joking!',
    readFile = Q.node(fs.readFile, fs),
    dbServer = nano(servers.couchdb.authUrl());

  function putDoc(db, doc, docId) {
    var deferred = Q.defer();
    db.get(docId, function (err, oldDoc) {
      if (err && err['status-code'] !== 404) {
        return deferred.reject(new Error(err));
      }
      if (oldDoc) {
        doc._rev = oldDoc._rev;
      }
      db.insert(doc, docId, function (err) {
        if (err) {
          return deferred.reject(new Error(err));
        }
        deferred.resolve(docId);
      });
    });
    return deferred.promise;
  }

  function loadDocs(db, dbName) {
    var deferred = Q.defer();
    Q.when(docsBaseFolder, function (docsBaseFolder) {
      if (!docsBaseFolder) {
        return deferred.resolve([]);
      }
      deferred.resolve(
        Q.ncall(fs.readdir, fs, path.join(docsBaseFolder, dbName))
          .then(function (files) {
            return Q.all(files.map(function (file) {
              var m = file.match(/^([A-Za-z0-9_]+)\.json$/);
              if (m) {
                return readFile(path.join(docsBaseFolder, dbName, file), 'utf8').then(function (jsonString) {
                  return putDoc(db, JSON.parse(jsonString), m[1]);
                });
              }
            }));
          })
      );
    });
    return deferred.promise;
  }

  function createDb(dbName) {
    var deferred = Q.defer();
    dbServer.db.create(dbName, function (err) {
      if (err && err['status-code'] !== 412) {
        return deferred.reject(new Error(err));
      }
      var db = dbServer.scope(dbName),
        systemDocs = couchdbs[dbName];
      deferred.resolve(
        Q.all(Object.keys(systemDocs).map(function (docId) {
          return putDoc(db, systemDocs[docId], docId);
        })).then(function (loadedSystemIds) {
          return loadDocs(db, dbName).then(function (loadedDocIds) {
            console.log('Pushed to "' + dbName + '":');
            console.log(loadedSystemIds);
            console.log(loadedDocIds);
          });
        })
      );
    });
    return deferred.promise;
  }

  Q.all(Object.keys(couchdbs).map(function (dbName) {
    var deferred = Q.defer();
    if (!doReset) {
      deferred.resolve(createDb(dbName));
    } else {
      dbServer.db.destroy(dbName, function (err) {
        if (err && err['status-code'] !== 404) {
          return deferred.reject(new Error(err));
        }
        deferred.resolve(createDb(dbName));
      });
    }
    return deferred.promise;
  }))
    .end();
});
