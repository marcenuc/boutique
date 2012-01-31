/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['util', 'nano', 'lib/servers', 'views/lib/codici', 'dbconfig'], function (util, nano, servers, codici, dbconfig) {
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

    function save(doc) {
      target.insert(doc, doc._id, function (err) {
        if (err) {
          throw new Error(util.inspect(err));
        }
        console.log(doc._id);
      });
    }

    function renameField(doc, oldField, newField) {
      if (doc.hasOwnProperty(oldField)) {
        doc[newField] = doc[oldField];
        delete doc[oldField];
      }
    }

    function migrate(mm) {
      var codes;
      if (mm.causale) {
        codes = codici.parseIdMovimentoMagazzino(mm._id);
        if (codes) {
          renameField(mm, 'causale', 'causale1');
          renameField(mm, 'causaleA', 'causale2');
          renameField(mm, 'a', 'magazzino2');
          renameField(mm, 'daEsterno', 'esterno1');
          renameField(mm, 'aEsterno', 'esterno2');
          return mm;
        }
      }
    }

    allMovimentoMagazzino.rows.forEach(function (row) {
      var newDoc = migrate(row.doc);
      if (newDoc) {
        save(newDoc);
      }
    });
  });
});
