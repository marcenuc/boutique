/*global define: false */

define(['config/server-configs'], function (configs) {
  'use strict';
  var couchdb = configs.couchdb;

  /*
   * Sanity check configuration
   */
  function checkType(option, type) {
    if (typeof option !== type) {
      throw new Error('Invalid configuration in config/server-configs.js. Option couchdb is: ' + JSON.stringify(option));
    }
  }
  checkType(couchdb.protocol, 'string');
  checkType(couchdb.host, 'string');
  checkType(couchdb.port, 'number');
  checkType(couchdb.admin, 'object');
  checkType(couchdb.admin.username, 'string');
  checkType(couchdb.admin.password, 'string');
  checkType(couchdb.webserver.port, 'number');

  couchdb.url = function () {
    return couchdb.protocol + '://' + couchdb.host + ':' + couchdb.port;
  };

  couchdb.authUrl = function () {
    return couchdb.protocol + '://' + couchdb.admin.username + ':' + couchdb.admin.password + '@' + couchdb.host + ':' + couchdb.port;
  };

  return { couchdb: couchdb };
});
