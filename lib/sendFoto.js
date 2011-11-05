/*global define: false */

define(['fs', 'path', 'url', 'connect'], function (fs, path, url, connect) {
  'use strict';
  /**
   * Find a photo (foto) for the given articolo.
   *
   * @param {String} fotoFolder Folder with the image files.
   * @return {Function} request handler
   */
  return function (fotoFolder) {
    if (!fotoFolder) {
      throw new Error('sendFoto fotoFolder must be set');
    }

    var urlParse = url.parse,
      staticSend = connect['static'].send;

    function parseSMACJpg(reqUrl) {
      // TODO DRY use codici
      return (/\/((\d\d)\d)((\d{5})\d{8}(\.jpg))$/).exec(urlParse(reqUrl).pathname);
    }

    function isNotFound(err) {
      return err && err.code === 'ENOENT';
    }

    return function (req, res, next) {
      var codes, exactFile, genericFile, draftFile, genericDraftFile;

      if (req.method !== 'GET') {
        return next();
      }

      codes = parseSMACJpg(req.url);
      if (!codes) {
        return next();
      }

      function passToStatic(name) {
        staticSend(req, res, next, { path: name });
      }

      exactFile = path.join(fotoFolder, codes[1] + codes[3]);
      fs.stat(exactFile, function (errExact) {
        if (!errExact) {
          return passToStatic(exactFile);
        }
        if (isNotFound(errExact)) {
          genericFile = path.join(fotoFolder, codes[2] + '0' + codes[3]);
          fs.stat(genericFile, function (errGeneric) {
            if (!errGeneric) {
              return passToStatic(genericFile);
            }
            if (isNotFound(errGeneric)) {
              draftFile = path.join(fotoFolder, codes[1] + codes[4] + codes[5]);
              fs.stat(draftFile, function (errDraft) {
                if (!errDraft) {
                  return passToStatic(draftFile);
                }
                genericDraftFile = path.join(fotoFolder, codes[2] + '0' + codes[4] + codes[5]);
                return passToStatic(genericDraftFile);
              });
            }
          });
        }
      });
    };
  };
});
