/*global define:false*/
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
          anno: m[1],
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
      if (req.method !== 'GET') {
        return next();
      }

      var codes = parseSMACJpg(req.url);
      if (!codes) {
        return next();
      }

      function passToStatic(name) {
        staticSend(req, res, next, { path: name });
      }

      function findFile(anno) {
        var exactFile, genericFile, draftFile, genericDraftFile;

        exactFile = path.join(fotoFolder, [anno, codes.linea, codes.modello, codes.articoloColore, codes.estensione].join(''));
        fs.stat(exactFile, function (errExact) {
          if (!errExact) {
            return passToStatic(exactFile);
          }
          if (!isNotFound(errExact)) {
            return next(errExact);
          }
          genericFile = path.join(fotoFolder, [anno, '0', codes.modello, codes.articoloColore, codes.estensione].join(''));
          fs.stat(genericFile, function (errGeneric) {
            if (!errGeneric) {
              return passToStatic(genericFile);
            }
            if (!isNotFound(errGeneric)) {
              return next(errGeneric);
            }
            draftFile = path.join(fotoFolder, [anno, codes.linea, codes.modello, codes.estensione].join(''));
            fs.stat(draftFile, function (errDraft) {
              if (!errDraft) {
                return passToStatic(draftFile);
              }
              if (!isNotFound(errDraft)) {
                return next(errDraft);
              }
              genericDraftFile = path.join(fotoFolder, [anno, '0', codes.modello, codes.estensione].join(''));
              fs.stat(genericDraftFile, function (errGenericDraft) {
                if (!errGenericDraft) {
                  return passToStatic(genericDraftFile);
                }
                if (!isNotFound(errGenericDraft)) {
                  return next(errGenericDraft);
                }
                if (yearMapper[anno] && anno !== yearMapper[anno]) {
                  return findFile(yearMapper[anno]);
                }

                // TODO ha senso settarlo qui?
                res.statusCode = 404;

                var notFoundFile = 'lib/notFound.jpg';
                fs.stat(notFoundFile, function (errNotFound) {
                  if (!errNotFound) {
                    res.setHeader('Content-Type', 'image/jpeg');
                    if ('HEAD' === req.method) {
                      return res.end();
                    }
                    var stream = fs.createReadStream(notFoundFile);
                    req.emit('static', stream);
                    return stream.pipe(res);
                  }
                  next(errNotFound);
                });
              });
            });
          });
        });
      }
      findFile(codes.anno);
    };
  };
});
