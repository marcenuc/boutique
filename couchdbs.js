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
      views: {
        all: {
          map: function (doc) {
            emit(doc._id, 1);
          }
        }
      }
    },
    azienda_000001: {
      tipo: 'MAGAZZINO',
      nome: 'Magazzino Disponibile-Tailor S.r.l.',
      indirizzo: 'S.S. 275 km. 21,4 Lucugnano',
      comune: 'Tricase (LE) ITALY',
      provincia: 'LE',
      cap: '73030',
      contatti: ['0833/706311', '0833/706322 (fax)']
    },
    azienda_000002: {
      tipo: 'NEGOZIO',
      contatti: ['0832 332401'],
      nome: 'Negozio Lecce - Tailor S.r.l.',
      indirizzo: 'Via Liborio Romano 73',
      comune: 'Lecce',
      provincia: 'LE',
      cap: '73100'
    }
  };
}());
