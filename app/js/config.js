/*global angular:false*/
angular.module('app.config', []).factory('couchdb', function () {
  'use strict';
  var db = 'boutique_db',
    designDoc = 'boutique_db';

  function viewPath(viewNameWithParams) {
    return '/' + db + '/_design/' + designDoc + '/_view/' + viewNameWithParams;
  }

  function docPath(docId) {
    return '/' + db + '/' + docId;
  }

  return {
    db: db,
    designDoc: designDoc,
    viewPath: viewPath,
    docPath: docPath
  };
});
