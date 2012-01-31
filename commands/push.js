/*global console:false, require:false, process:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['util', 'path', 'fs', 'nano', 'couchdbs', 'lib/servers'], function (util, path, fs, nano, couchdbs, servers) {
  'use strict';
  var docsFolder = process.argv[2],
    dbServer = nano(servers.couchdb.authUrl());

  Object.keys(couchdbs).forEach(function (dbName) {
    dbServer.db.create(dbName, function (err) {
      if (err && err['status-code'] !== 412) {
        throw new Error('Error creating "' + dbName + '": ' + util.inspect(err));
      }
      var docs = couchdbs[dbName],
        db = dbServer.use(dbName);

      if (docsFolder) {
        fs.readdirSync(docsFolder).forEach(function (f) {
          var m = f.match(/^([A-Za-z0-9_]+)\.json$/);
          if (m) {
            docs[m[1]] = JSON.parse(fs.readFileSync(path.join(docsFolder, f), 'utf8'));
          }
        });
      }
      console.log('Pushing to "' + dbName + '":');
      Object.keys(docs).forEach(function (docId) {
        db.get(docId, function (err, oldDoc) {
          if (err && err['status-code'] !== 404) {
            throw new Error('Error getting "' + docId + '": ' + util.inspect(err));
          }
          var doc = docs[docId];
          if (oldDoc) {
            doc._rev = oldDoc._rev;
          }
          db.insert(doc, docId, function (err) {
            if (err) {
              throw new Error('Error creating "' + docId + '": ' + util.inspect(err));
            }
            console.log(' - ' + docId);
          });
        });
      });
    });
  });
});
