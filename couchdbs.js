//TODO eliminare `emit` e fare minify delle view.
/*global define: false, emit: false*/

define(['fs', 'uglify-js', 'lib/servers', 'views', 'app/js/validate_doc_update'], function (fs, uglifyJs, servers, views, validate_doc_update) {
  'use strict';
  function minify(src) {
    var pro = uglifyJs.uglify;
    return pro.gen_code(pro.ast_squeeze(pro.ast_mangle(uglifyJs.parser.parse(src))));
  }
  function minifyFunction(src) {
    // UglifyJS requires functions to have a name: we remove it after minification.
    return minify(src).replace(/^function \w+\(/, 'function(');
  }
  function minifyFile(fileName) {
    return minify(fs.readFileSync(fileName, 'utf8'));
  }

  var couchdbs = {},
    parsedViews = { lib: { codici: minifyFile('app/js/codici.js') } };

  Object.keys(views).forEach(function (viewName) {
    if (viewName[0] !== '_') {
      var src = views[viewName], obj = {};
      if (typeof src === 'function') {
        obj.map = minifyFunction(src.toString());
      } else if (Object.prototype.toString.apply(src) === '[object Object]'
              && typeof src.map === 'function'
              && typeof src.reduce === 'function') {
        obj.map = minifyFunction(src.map.toString());
        obj.reduce = minifyFunction(src.reduce.toString());
      } else {
        throw new Error('Invalid views');
      }
      parsedViews[viewName] = obj;
    }
  });

  couchdbs[servers.couchdb.db] = {
    _security: {
      // TODO DRY 'boutique' and 'azienda' are repeated in validate_doc_update.js
      admins: { names: ['boutique'], roles: [] },
      readers: { names: [], roles: ['azienda', 'boutique'] }
    },
    '_design/boutique_db': {
      validate_doc_update: minifyFunction(validate_doc_update.toString()),
      views: parsedViews
    }
  };

  return couchdbs;
});
