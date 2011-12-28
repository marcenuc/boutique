/*global define: false*/

define(['fs', 'uglify-js', 'views', 'app/js/validate_doc_update', 'dbconfig'], function (fs, uglifyJs, views, validate_doc_update, dbconfig) {
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
      var src = views[viewName], view = {};
      if (typeof src === 'function') {
        view.map = minifyFunction(src.toString());
      } else if (Object.prototype.toString.apply(src) === '[object Object]' &&
                 typeof src.map === 'function' &&
                 (typeof src.reduce === 'function' || typeof src.reduce === 'string')) {
        view.map = minifyFunction(src.map.toString());
        view.reduce = typeof src.reduce === 'string' ? src.reduce : minifyFunction(src.reduce.toString());
      } else {
        throw new Error('Invalid views');
      }
      parsedViews[viewName] = view;
    }
  });

  couchdbs[dbconfig.db] = {
    _security: {
      // TODO DRY 'boutique' and 'azienda' are repeated in validate_doc_update.js
      admins: { names: ['boutique'], roles: [] },
      readers: { names: [], roles: ['azienda', 'boutique'] }
    }
  };
  couchdbs[dbconfig.db]['_design/' + dbconfig.designDoc] = {
    validate_doc_update: minifyFunction(validate_doc_update.toString()),
    views: parsedViews
  };
  return couchdbs;
});
