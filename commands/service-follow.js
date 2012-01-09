/*global console: false, require: false, process: false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config', 'views/lib/codici': 'app/js/codici' } });

/*
 * Monitor CouchDB for MovimentoMagazzino to keep Inventario updated
 */
requirejs(['follow', 'lib/inventario', 'lib/servers', 'dbconfig'], function (follow, inventario, servers, dbconfig) {
  'use strict';
  var feed = new follow.Feed({
    db: servers.couchdb.authUrl() + '/' + dbconfig.db,
    include_docs: true,
    // TODO start from last processed change
    since: 'now',
    inactivity_ms: 86400 * 1000,
    filter: function (doc) {
      if (doc.accodato) {
        var ids = doc._id.split('_', 1);
        return ids[0] === 'MovimentoMagazzino';
      }
    }
  });

  feed.on('change', function (change) {
    var doc = change.doc;
    console.log('Verifica ' + doc._id + ' ' + doc._rev);
    inventario.verifica(doc, function (err) {
      if (err) {
        return console.dir(err);
      }
      console.log('Verificato ' + doc._id);
    });
  });

  feed.on('error', function (err) {
    console.error('Since Follow always retries on errors, this must be serious:');
    console.dir(err);
    throw new Error(err);
  });

  console.log('Following ' + servers.couchdb.url() + '/' + dbconfig.db);
  feed.follow();
});
