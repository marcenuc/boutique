/*global define: false */

define(['config/server-configs'], function (configs) {
  'use strict';
  var couchdb = configs.couchdb;

  couchdb.url = function () {
    return couchdb.protocol + '://' + couchdb.host + ':' + couchdb.port;
  };

  couchdb.authUrl = function () {
    return couchdb.protocol + '://' + couchdb.admin.username + ':' + couchdb.admin.password + '@' + couchdb.host + ':' + couchdb.port;
  };

  couchdb.webRouteUrl = function () {
    return couchdb.url() + '/' + couchdb.webserver.route;
  };

  couchdb.webserverUrl = function () {
    return 'http://' + couchdb.webserver.host + ':' + couchdb.webserver.port;
  };

  return { couchdb: couchdb };
});
