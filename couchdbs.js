//TODO eliminare `emit` e fare minify delle view.
/*global define: false, emit: false*/

define(['fs', 'uglify-js', 'app/js/validate_doc_update', 'lib/servers'], function (fs, uglifyJs, validate, servers) {
  'use strict';
  var minify = function (src) {
      var pro = uglifyJs.uglify;
      return pro.gen_code(pro.ast_squeeze(pro.ast_mangle(uglifyJs.parser.parse(src))));
    },
    anonymizeFunction = function (src) {
      return src.replace(/^function \w+\(/, 'function(');
    },
    validate_doc_update = anonymizeFunction(minify(validate.toString())),
    codici = minify(fs.readFileSync('app/js/codici.js', 'utf8')),
    couchdbs = {};

  couchdbs[servers.couchdb.db] = {
    _security: {
      // TODO DRY 'boutique' and 'azienda' are repeated in validate_doc_update.js
      admins: { names: ['boutique'], roles: [] },
      readers: { names: [], roles: ['azienda'] }
    },
    '_design/boutique_db': {
      codici: codici,
      validate_doc_update: validate_doc_update,
      views: {
        movimenti: {
          map: function (doc) {
            var ids = doc._id.split('_');
            if (ids[0] === 'MovimentoMagazzino' && doc.accodato) {
              emit([ids[1], parseInt(ids[2], 10), parseInt(ids[3], 10)], 1);
            }
          }
        }
      }
    }
  };

  return couchdbs;
});