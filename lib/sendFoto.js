/*global define: false */

define(['fs', 'path', 'url', 'connect'], function (fs, path, url, connect) {
  'use strict';
  /**
   * Find a photo (foto) for the given articolo.
   *
   * @param {String} fotoFolder Folder with the image files.
   * @param {Object} yearMapper year-to-year map.
   * @return {Function} request handler
   */
  return function (fotoFolder, yearMapper) {
    if (!fotoFolder) {
      throw new Error('sendFoto fotoFolder must be set');
    }

    var urlParse = url.parse,
      staticSend = connect['static'].send;

    function parseSMACJpg(reqUrl) {
      // TODO DRY use codici
      var m = (/\/(\d\d)(\d)(\d{5})(\d{8})(\.jpg)$/).exec(urlParse(reqUrl).pathname);
      if (m) {
        return {
          anno: yearMapper[m[1]] || m[1],
          linea: m[2],
          modello: m[3],
          articoloColore: m[4],
          estensione: m[5]
        };
      }
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

      exactFile = path.join(fotoFolder, [codes.anno, codes.linea, codes.modello, codes.articoloColore, codes.estensione].join(''));
      fs.stat(exactFile, function (errExact) {
        if (!errExact) {
          return passToStatic(exactFile);
        }
        if (isNotFound(errExact)) {
          genericFile = path.join(fotoFolder, [codes.anno, '0', codes.modello, codes.articoloColore, codes.estensione].join(''));
          fs.stat(genericFile, function (errGeneric) {
            if (!errGeneric) {
              return passToStatic(genericFile);
            }
            if (isNotFound(errGeneric)) {
              draftFile = path.join(fotoFolder, [codes.anno, codes.linea, codes.modello, codes.estensione].join(''));
              fs.stat(draftFile, function (errDraft) {
                if (!errDraft) {
                  return passToStatic(draftFile);
                }
                genericDraftFile = path.join(fotoFolder, [codes.anno, '0', codes.modello, codes.estensione].join(''));
                return passToStatic(genericDraftFile);
              });
            }
          });
        }
      });
    };
  };
});
