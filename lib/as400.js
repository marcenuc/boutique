/*jslint node: true */
/*jshint node: true */

(function () {
  'use strict';
  var _ = require('underscore'),
    execBuffered = require('./taskutil').execBuffered;

  function buildCausaliAs400(causaliCliente, causaliDisponibile) {
    var c1 = {}, c2 = {},
      rexpV = /^([A-Z. \/0-9]{16})([AK])[\d ]{4}[AK]?/,
      rexpK1 = /^MC(\d\d)$/, rexpK2 = /^MD(\d\d)$/;

    function parse(c, rexpK, dest) {
      var mk = rexpK.exec(c[0]), mv = rexpV.exec(c[1]);
      if (mk && mv) {
        dest[mk[1]] = [ mv[1].trim(), mv[2] === 'A' ? -1 : 1 ];
      }
    }

    causaliCliente.rows.forEach(function (c) {
      parse(c, rexpK1, c1);
    });
    causaliDisponibile.rows.forEach(function (c) {
      parse(c, rexpK2, c2);
    });
    return { '1': c1, '2': c2 };
  }
  //TODO export for unit test. Better options?
  exports.buildCausaliAs400 = buildCausaliAs400;

  function fetchCausaliAs400(callback) {
    function get(selector, callbackGet) {
      execBuffered('java', ['-jar', 'as400-querier.jar', 'codifiche', 'selector=' + selector], callbackGet);
    }

    get('MC', function (errC, causaliCliente) {
      if (errC) {
        return callback(errC);
      }

      try {
        var cC = JSON.parse(causaliCliente);
      } catch (err) {
        return callback(err);
      }
      get('MD', function (errD, causaliDisponibile) {
        if (errD) {
          return callback(errD);
        }
        try {
          var cD = JSON.parse(causaliDisponibile);
        } catch (err) {
          return callback(err);
        }
        callback(null, buildCausaliAs400(cC, cD));
      });
    });
  }

  exports.updateCausaliAs400 = function (couchdb, callback) {
    fetchCausaliAs400(function (errAs400, causaliAs400) {
      if (errAs400) {
        return callback(errAs400);
      }
      causaliAs400._id = 'CausaliAs400';
      couchdb.get(causaliAs400._id, function (errCouchDB, doc) {
        if (errCouchDB) {
          if (errCouchDB.error !== 'not_found') {
            return callback(errCouchDB);
          }
        } else {
          causaliAs400._rev = doc._rev;
        }

        if (errCouchDB || !_.isEqual(causaliAs400, doc)) {
          console.log('Aggiorno causali...');
          couchdb.save(causaliAs400._id, causaliAs400, callback);
        } else {
          console.log('Causali già aggiornate.');
        }
      });
    });
  };
}());