/*jslint node: true */
/*jshint node: true */
/*global emit: false */

(function () {
  'use strict';
  var fs = require('fs'),
    validate_src_file = './app/js/validate_doc_update.js',
    validate_orig_src = fs.readFileSync(validate_src_file, 'utf8'),
    jsp = require('uglify-js').parser,
    pro = require('uglify-js').uglify,
    ast = pro.ast_squeeze(pro.ast_mangle(jsp.parse(validate_orig_src))),
    validate_src = pro.gen_code(ast),
    regexp_head = /^function validate_doc_update\(/;

  if (!validate_orig_src.match(regexp_head) || !validate_src.match(regexp_head)) {
    throw 'Invalid contents in ' + validate_src_file;
  }

  exports.boutique_db = {
    _security: {
      admins: { names: ['boutique'], roles: [] },
      readers: { names: [], roles: ['azienda'] }
    },
    '_design/boutique_db': {
      validate_doc_update: validate_src.replace(regexp_head, 'function('),
      views: {}
    }
  };

  ['019998', '019999', '099990', '099991', '099997'].forEach(function (codAzienda) {
    var id = 'Azienda_' + codAzienda;
    exports.boutique_db[id] = JSON.parse(fs.readFileSync('test/fixtures/' + id + '.json', 'utf8'));
  });
  ['Scalarini', 'ModelliEScalarini', 'Inventari'].forEach(function (id) {
    exports.boutique_db[id] = JSON.parse(fs.readFileSync('test/fixtures/' + id + '.json', 'utf8'));
  });
}());
