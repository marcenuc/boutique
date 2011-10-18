/*global define: false */

define(['config/server-configs'], function (configs) {
  'use strict';
  var couchdb = configs.couchdb;

  /*
   * Sanity checks on configuration
   */
  function checkType(option, type) {
    if (typeof option !== type) {
      throw 'Invalid configuration in config/server-configs.js. Option couchdb.db is: ' + JSON.stringify(option);
    }
  }
  checkType(couchdb.protocol, 'string');
  checkType(couchdb.host, 'string');
  checkType(couchdb.port, 'number');
  checkType(couchdb.db, 'string');
  checkType(couchdb.admin, 'object');
  checkType(couchdb.admin.username, 'string');
  checkType(couchdb.admin.password, 'string');
  checkType(couchdb.webserver.host, 'string');
  checkType(couchdb.webserver.port, 'number');
  checkType(couchdb.webserver.route, 'string');

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
