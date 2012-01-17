/*global require:false, process:false, console:false*/
process.env.LANG = 'C';
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require, paths: { 'dbconfig': 'app/js/config' } });

requirejs(['util', 'nano', 'lib/servers', 'dbconfig'], function (util, nano, servers, dbconfig) {
  'use strict';
  var target = nano(servers.couchdb.authUrl()).use(dbconfig.db);

  target.get('_all_docs', {
    startkey: 'MovimentoMagazzino_',
    endkey: 'MovimentoMagazzino_\ufff0',
    include_docs: true
  }, function (err, allMovimentoMagazzino) {
    if (err) {
      throw new Error(util.inspect(err));
    }
    var movimenti = allMovimentoMagazzino.rows, i = movimenti.length, m;

    function save(doc) {
      target.insert(doc, doc._id, function (err) {
        if (err) {
          throw new Error(util.inspect(err));
        }
        console.log(doc._id);
      });
    }

    while (i > 0) {
      i -= 1;
      m = movimenti[i].doc;
      if (m.verificato) {
        m.accodato = 1;
        delete m.verificato;
        save(m);
      }
    }
  });
});
