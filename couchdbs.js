/*global define: false*/

define(['fs', 'uglify-js'], function (fs, uglifyJs) {
  'use strict';
  var validate_src_file = './app/js/validate_doc_update.js',
    validate_orig_src = fs.readFileSync(validate_src_file, 'utf8'),
    pro = uglifyJs.uglify,
    ast = pro.ast_squeeze(pro.ast_mangle(uglifyJs.parser.parse(validate_orig_src))),
    validate_src = pro.gen_code(ast),
    regexp_head = /^function validate_doc_update\(/,
    couchdbs = {};

  if (!validate_orig_src.match(regexp_head) || !validate_src.match(regexp_head)) {
    throw 'Invalid contents in ' + validate_src_file;
  }

  couchdbs.boutique_db = {
    _security: {
      admins: { names: ['boutique'], roles: [] },
      readers: { names: [], roles: ['azienda'] }
    },
    '_design/boutique_db': {
      validate_doc_update: validate_src.replace(regexp_head, 'function('),
      views: {}
    }
  };

  return couchdbs;
});
