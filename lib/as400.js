/*global define:false*/
define(['underscore', 'lib/taskutil', 'lib/couchutil', 'views/lib/codici', 'lib/inventario', 'dbconfig'], function (_, taskutil, couchutil, codici, inventario, dbconfig) {
  'use strict';
  var codeNames = ['stagione', 'modello', 'articolo', 'colore', 'taglia'],
    //TODO DRY already defined in codici.js
    lengthCodice = { stagione: 3, modello: 5, articolo: 4, colore: 4, taglia: 2 },
    rexp = {},
    COSTO_NULLO = 0;

  lengthCodice.barcode = _.reduce(codeNames, function (sum, cod) {
    return sum + lengthCodice[cod];
  }, 0);

  //TODO DRY already defined in codici.js
  rexp.barcode = new RegExp('^(' + _.map(codeNames, function (cod) {
    var len = lengthCodice[cod],
      t = '\\d{' + len + '}';
    rexp[cod] = new RegExp('^' + t + '$');
    return t;
  }).join(')(') + ')$');


  function buildModelliEScalariniAs400(modelliEScalarini) {
    var stagione, modello, descrizione, scalarino,
      col = codici.colNamesToColIndexes(modelliEScalarini[0].columnNames),
      rows = modelliEScalarini[0].rows, r, i, ii,
      warns = [], lista = {};
    for (i = 0, ii = rows.length; i < ii; i += 1) {
      r = rows[i];
      stagione = r[col.stagione];
      modello = r[col.modello];
      descrizione = (r[col.descrizione] || '').trim();
      scalarino = (r[col.scalarino] || '').trim();
      if (!rexp.stagione.test(stagione || '')) {
        warns.push('Stagione non valida: "' + stagione + '"');
      } else if (!rexp.modello.test(modello || '')) {
        warns.push('Modello non valido: "' + [stagione, modello].join('" "') + '"');
      } else if (!descrizione) {
        warns.push('Manca descrizione articolo: "' + [stagione, modello].join('" "') + '"');
      } else if (!/^\d+$/.test(scalarino || '')) {
        warns.push('Manca scalarino: "' + [stagione, modello, descrizione].join('" "') + '"');
      } else {
        lista[stagione + modello] = [descrizione, parseInt(scalarino, 10)];
      }
    }

    return [warns, { _id: 'ModelliEScalarini', lista: lista }];
  }

  function buildCausaliAs400(causaliAs400) {
    var csl = { _id: 'CausaliAs400', '1': {}, '2': {} },
      codiceTipo = { 'MC': '1', 'MD': '2' },
      warns = [],
      error = null,
      rexpV = /^([\-+*A-Za-z. \/0-9]{16})([AK])[\d ]{4}[AK]?/,
      rexpK = /^(M[CD])(\d\d)$/;

    _.each(causaliAs400, function (causali, tipoMagazzino) {
      var col = codici.colNamesToColIndexes(causali.columnNames);
      causali.rows.forEach(function (causale) {
        var key = causale[col.key], mk = rexpK.exec(key), value, mv, tm;
        if (!mk) {
          if (key !== 'MC?') {
            warns.push('Chiave non valida: key="' + key + '"');
          }
        } else {
          value = causale[col.values];
          mv = rexpV.exec(value);
          tm = mk[1];
          if (!mv) {
            // TODO verificare queste chiavi.
            if (key !== 'MC53' && key !== 'MD53') {
              warns.push('Valore non valido: key="' + key + '", value="' + value + '"');
            }
          } else if (tm !== tipoMagazzino) {
            error = 'TIPO MAGAZZINO ERRATO: "' + tm + '" invece di "' + tipoMagazzino + '"';
          } else {
            csl[codiceTipo[tm]][mk[2]] = [ mv[1].trim(), mv[2] === 'A' ? 1 : -1 ];
          }
        }
      });
    });
    return [warns, error || csl];
  }

  function token(tokens, tokenIndex, tokenLength) {
    var startIndex = tokenLength * tokenIndex;
    return tokens.substring(startIndex, startIndex + tokenLength);
  }

  function buildTaglieScalariniAs400(scalariniAs400) {
    var warns = [], col, listeDescrizioni = [null], descrizioniTaglie = [null], taglie = [null], colonneTaglie = [null];

    col = codici.colNamesToColIndexes(scalariniAs400.descrizioniTaglie.columnNames);
    scalariniAs400.descrizioniTaglie.rows.forEach(function (r) {
      var key = r[col.key], mk = key.match(/^SCB(\d)$/), scalarino, values, maxVals, i, descrizione, ds = [];
      if (!mk) {
        warns.push('Unknown key for scalarino: "' + key + '"');
      } else {
        scalarino = parseInt(mk[1], 10);
        values = (r[col.values] || '').trim();
        if (!values) {
          warns.push('Empty values for scalarino at "' + key + '"');
        } else {
          maxVals = values.length / codici.LEN_DESCRIZIONE_TAGLIA;
          i = 0;
          do {
            descrizione = token(values, i, codici.LEN_DESCRIZIONE_TAGLIA).trim();
            if (descrizione) {
              ds.push(descrizione);
            }
            i += 1;
          } while (i < maxVals && descrizione);
          listeDescrizioni[scalarino] = ds;
          descrizioniTaglie[scalarino] = {};
          taglie[scalarino] = {};
          colonneTaglie[scalarino] = {};
        }
      }
    });

    col = codici.colNamesToColIndexes(scalariniAs400.taglie.columnNames);
    scalariniAs400.taglie.rows.forEach(function (r) {
      var key = r[col.key], mk = key.match(/^SCA(\d)$/), scalarino, values, listaDescrizioni, i, n, taglia, descrizioneTaglia;
      if (!mk) {
        warns.push('Unknown key for scalarino: "' + key + '"');
      } else {
        scalarino = parseInt(mk[1], 10);
        values = (r[col.values] || '').trim();
        if (!values) {
          warns.push('Empty values for scalarino at "' + key + '"');
        } else {
          listaDescrizioni = listeDescrizioni[scalarino];
          n = listaDescrizioni.length;
          for (i = 0; i < n; i += 1) {
            taglia = token(values, i, codici.LEN_TAGLIA);
            descrizioneTaglia = listaDescrizioni[i];
            descrizioniTaglie[scalarino][taglia] = descrizioneTaglia;
            taglie[scalarino][descrizioneTaglia] = taglia;
            colonneTaglie[scalarino][taglia] = i;
          }
        }
      }
    });
    return [warns, { _id: 'TaglieScalarini', taglie: taglie, descrizioniTaglie: descrizioniTaglie, listeDescrizioni: listeDescrizioni, colonneTaglie: colonneTaglie }];
  }

  function buildAziendaAs400(azienda, aziendaAs400) {
    var col = codici.colNamesToColIndexes(aziendaAs400.columnNames),
      az = aziendaAs400.rows[0];
    azienda.nome = az[col.nome];
    azienda.indirizzo = az[col.indirizzo];
    azienda.comune = az[col.comune];
    azienda.provincia = az[col.provincia];
    azienda.cap = az[col.cap];
    azienda.note = az[col.note];
    azienda.nazione = az[col.nazione] || 'IT';
    if (!Array.isArray(azienda.contatti)) {
      azienda.contatti = [];
    }
    if (az[col.telefono]) {
      azienda.contatti[0] = { tipo: 'Telefono', valore: az[col.telefono] };
    }
    if (az[col.fax]) {
      azienda.contatti[1] = { tipo: 'Fax', valore: az[col.fax] };
    }
    return [[], azienda];
  }

  /*
   * Data from As400 must be merged with data in Boutique.
   * Then, we need the current data in Boutique to merge it
   * with the data from As400.
   */
  function newBuilderAziendaAs400(azienda) {
    return function (aziendeAs400) {
      return buildAziendaAs400(azienda, aziendeAs400[0]);
    };
  }

  function newInventario(codiceAzienda, numero, tipoMagazzino, inProduzione, rows) {
    var data = codici.newYyyyMmDdDate(),
      causale = codici.findCausaleMovimentoMagazzino('RETTIFICA INVENTARIO +'),
      movimentoMagazzino = codici.newMovimentoMagazzino(codiceAzienda, data, numero, causale);
    movimentoMagazzino.rows = rows;
    movimentoMagazzino.tipoMagazzino = tipoMagazzino;
    if (inProduzione) {
      movimentoMagazzino.inProduzione = inProduzione;
    }
    movimentoMagazzino.accodato = true;
    return movimentoMagazzino;
  }

  function buildInventariMagazzinoClientiAs400(codiceAzienda, listini, taglieScalarini, modelliEScalarini, inventarioOrdet00fAs400) {
    var stagione, modello, articolo, colore, scalarino, descrizioneTaglia, barcode, prezzi, costo,
      inProduzione, taglie, colonneTaglie, j, jj, taglia, qta, desscal,
      col = codici.colNamesToColIndexes(inventarioOrdet00fAs400[0].columnNames),
      rows = inventarioOrdet00fAs400[0].rows, r, i, ii, rigaInventario,
      warns = [], inventarioPronto = [], inventarioInProduzione = [],
      statoArticoloToInProduzione = { '1': true, '2': false },
      mes = modelliEScalarini.lista,
      errsAnagrafe = {}, errsScalarino = {}, errsListino = {};

    for (i = 0, ii = rows.length; i < ii; i += 1) {
      r = rows[i];
      stagione = codici.padZero(r[col.stagione], codici.LEN_STAGIONE);
      modello = codici.padZero(r[col.modello], codici.LEN_MODELLO);
      scalarino = parseInt(r[col.scalarino], 10);
      desscal = mes[stagione + modello];
      if (!desscal) {
        errsAnagrafe[[stagione, modello].join(' ')] = 1;
      } else if (desscal[1] !== scalarino) {
        errsScalarino[[stagione, modello, scalarino, desscal[1]].join(' ')] = 1;
      } else {
        articolo = codici.padZero(r[col.articolo], codici.LEN_ARTICOLO);
        colore = codici.padZero(r[col.colore], codici.LEN_COLORE);
        //TODO fare anche controllo listino As400.
        inProduzione = statoArticoloToInProduzione[r[col.statoArticolo]];
        taglie = Object.keys(taglieScalarini.descrizioniTaglie[scalarino]);
        colonneTaglie = taglieScalarini.colonneTaglie[scalarino];
        for (j = 0, jj = taglie.length; j < jj; j += 1) {
          taglia = taglie[j];
          qta = parseInt(r[col['qta' + colonneTaglie[taglia]]], 10);
          if (qta) {
            descrizioneTaglia = taglieScalarini.descrizioniTaglie[scalarino][taglia];
            barcode = codici.codiceAs400(stagione, modello, articolo, colore, taglia);
            prezzi = codici.readListino(listini, codiceAzienda, stagione, modello, articolo);
            if (!prezzi) {
              errsListino[[stagione, modello, articolo].join(' ')] = 1;
              costo = COSTO_NULLO;
            } else {
              costo = prezzi[1][prezzi[0].costo];
            }
            rigaInventario = [barcode, scalarino, descrizioneTaglia, desscal[0], costo, qta];

            if (inProduzione) {
              inventarioInProduzione.push(rigaInventario);
            } else {
              inventarioPronto.push(rigaInventario);
            }
          }
        }
      }
    }
    Object.keys(errsAnagrafe).sort().forEach(function (c) {
      warns.push('ORDET00F MODELLO NON IN ANAGRAFE: ' + c);
    });
    Object.keys(errsScalarino).sort().forEach(function (c) {
      warns.push('ORDET00F SCALARINO IN ANAGRAFE DIVERSO: ' + c);
    });
    Object.keys(errsListino).sort().forEach(function (c) {
      warns.push('ORDET00F ARTICOLO NON A LISTINO PER ' + codiceAzienda + ': ' + c);
    });
    return [warns, [
      newInventario(codiceAzienda, 1, codici.TIPO_MAGAZZINO_CLIENTI, false, inventarioPronto),
      newInventario(codiceAzienda, 2, codici.TIPO_MAGAZZINO_CLIENTI, true, inventarioInProduzione)
    ]];
  }

  function newBuilderInventariMagazzinoClientiAs400(codiceAzienda, listini, taglieScalarini, modelliEScalarini) {
    return function (inventarioOrdet00fAs400) {
      return buildInventariMagazzinoClientiAs400(codiceAzienda, listini, taglieScalarini, modelliEScalarini, inventarioOrdet00fAs400);
    };
  }

  function buildInventariMagazzinoDisponibileAs400(codiceAzienda, listini, taglieScalarini, modelliEScalarini, inventarioSalmodAs400) {
    var stagione, modello, articolo, colore, scalarino, descrizioneTaglia, barcode, prezzi, costo, taglia, qta, desscal,
      col = codici.colNamesToColIndexes(inventarioSalmodAs400[0].columnNames),
      rows = inventarioSalmodAs400[0].rows, r, i, ii, rigaInventario,
      warns = [], inventario = [],
      mes = modelliEScalarini.lista,
      errsAnagrafe = {}, errsScalarino = {}, errsListino = {};

    for (i = 0, ii = rows.length; i < ii; i += 1) {
      r = rows[i];
      stagione = codici.padZero(r[col.stagione], codici.LEN_STAGIONE);
      modello = codici.padZero(r[col.modello], codici.LEN_MODELLO);
      scalarino = parseInt(r[col.scalarino], 10);
      desscal = mes[stagione + modello];
      if (!desscal) {
        errsAnagrafe[[stagione, modello].join(' ')] = 1;
      } else if (desscal[1] !== scalarino) {
        errsScalarino[[stagione, modello, scalarino, desscal[1]].join(' ')] = 1;
      } else {
        articolo = codici.padZero(r[col.articolo], codici.LEN_ARTICOLO);
        colore = codici.padZero(r[col.colore], codici.LEN_COLORE);
        //TODO fare anche controllo listino As400.
        taglia = taglieScalarini.taglie[scalarino][r[col.descrizioneTaglia]];
        qta = parseInt(r[col.qta], 10);
        if (qta) {
          descrizioneTaglia = taglieScalarini.descrizioniTaglie[scalarino][taglia];
          barcode = codici.codiceAs400(stagione, modello, articolo, colore, taglia);
          prezzi = codici.readListino(listini, codiceAzienda, stagione, modello, articolo);
          if (!prezzi) {
            errsListino[[stagione, modello, articolo].join(' ')] = 1;
            costo = COSTO_NULLO;
          } else {
            costo = prezzi[1][prezzi[0].costo];
          }
          rigaInventario = [barcode, scalarino, descrizioneTaglia, desscal[0], costo, qta];
          inventario.push(rigaInventario);
        }
      }
    }
    Object.keys(errsAnagrafe).sort().forEach(function (c) {
      warns.push('SALMOD MODELLO NON IN ANAGRAFE: ' + c);
    });
    Object.keys(errsScalarino).sort().forEach(function (c) {
      warns.push('SALMOD SCALARINO IN ANAGRAFE DIVERSO: ' + c);
    });
    Object.keys(errsListino).sort().forEach(function (c) {
      warns.push('SALMOD ARTICOLO NON A LISTINO PER ' + codiceAzienda + ': ' + c);
    });
    return [warns, [newInventario(codiceAzienda, 1, codici.TIPO_MAGAZZINO_DISPONIBILE, 0, inventario)]];
  }

  function newBuilderInventariMagazzinoDisponibileAs400(codiceAzienda, listini, taglieScalarini, modelliEScalarini) {
    return function (inventarioSalmodAs400) {
      return buildInventariMagazzinoDisponibileAs400(codiceAzienda, listini, taglieScalarini, modelliEScalarini, inventarioSalmodAs400);
    };
  }

  function as400Querier(params, callback) {
    taskutil.execBuffered('java', ['-jar', 'as400-querier.jar'].concat(params), callback);
  }

  function fetchFromAs400(querier, queries, docBuilder, callback) {
    var queryParameters = Array.isArray(queries) ? { 0: queries } : queries,
      queryNames = Object.keys(queryParameters),
      i = 0,
      ii = queryNames.length,
      queryName,
      resps = {};

    function doQuery() {
      queryName = queryNames[i];
      querier(queryParameters[queryName], function (err, docAs400) {
        if (err) {
          return callback(err);
        }
        try {
          resps[queryName] = JSON.parse(docAs400);
        } catch (errJSONParse) {
          return callback(errJSONParse);
        }
        i += 1;
        if (i < ii) {
          return doQuery();
        }
        var warnsAndDoc = docBuilder.call(null, resps);
        if (typeof warnsAndDoc[1] === 'string') {
          return callback(warnsAndDoc[1]);
        }
        return callback(null, warnsAndDoc);
      });
    }
    doQuery();
  }

  function getListini(couchdb, callback) {
    //TODO DRY this same query is done in services.js
    couchdb.get('_all_docs', {
      startkey: 'Listino_',
      endkey: 'Listino_\ufff0',
      include_docs: true
    }, function (err, response) {
      if (err) {
        return callback(err);
      }
      var listini = codici.toSearchableListini(response);
      callback(null, listini);
    });
  }

  return {
    //TODO exports for unit test. Better options?
    buildModelliEScalariniAs400: buildModelliEScalariniAs400,
    buildCausaliAs400: buildCausaliAs400,
    buildAziendaAs400: buildAziendaAs400,
    fetchFromAs400: fetchFromAs400,

    updateModelliEScalariniAs400: function (couchdb, callback) {
      fetchFromAs400(as400Querier, ['modelli'], buildModelliEScalariniAs400, function (err, warnsAndDoc) {
        couchutil.saveIfChanged(err, couchdb, warnsAndDoc, callback);
      });
    },

    updateCausaliAs400: function (couchdb, callback) {
      fetchFromAs400(as400Querier, { MC: ['codifiche', 'selector=MC'], MD: ['codifiche', 'selector=MD'] },
        buildCausaliAs400,
        function (err, warnsAndDoc) {
          couchutil.saveIfChanged(err, couchdb, warnsAndDoc, callback);
        });
    },

    updateTaglieScalariniAs400: function (couchdb, callback) {
      fetchFromAs400(as400Querier, { taglie: ['codifiche', 'selector=SCA'], descrizioniTaglie: ['codifiche', 'selector=SCB'] },
        buildTaglieScalariniAs400,
        function (err, warnsAndDoc) {
          couchutil.saveIfChanged(err, couchdb, warnsAndDoc, callback);
        });
    },

    updateGiacenze: function (couchdb, callback) {
      couchdb.view(dbconfig.designDoc, 'aziende', { include_docs: true }, function (err, aziende) {
        if (err) {
          return callback(err);
        }
        getListini(couchdb, function (errListini, listini) {
          if (errListini) {
            return callback(errListini);
          }
          couchdb.get('TaglieScalarini', function (err, taglieScalarini) {
            if (err) {
              return callback(err);
            }
            couchdb.get('ModelliEScalarini', function (err, modelliEScalarini) {
              if (err) {
                return callback(err);
              }
              // TODO filtering should be done by CouchDB
              var rows = aziende.rows.filter(function (r) {
                  return r.doc.tipo === 'MAGAZZINO';
                }),
                i = -1,
                ii = rows.length,
                allWarns = [],
                allDocs = [],
                updateNext;

              function saveUpdates() {
                var j = -1, jj = allDocs.length, changedDocs = [];

                function saveChangedDocs() {
                  var k = -1, kk = changedDocs.length, doc;

                  function saveNextChangedDoc() {
                    k += 1;
                    if (k >= kk) {
                      return inventario.update(function (err) {
                        callback(err, [allWarns]);
                      });
                    }
                    doc = changedDocs[k];
                    couchdb.insert(doc, doc._id, function (err) {
                      if (err) {
                        return callback(err);
                      }
                      saveNextChangedDoc();
                    });
                  }
                  saveNextChangedDoc();
                }


                function setChangedDocs() {
                  j += 1;
                  if (j >= jj) {
                    return saveChangedDocs();
                  }
                  couchutil.setDocRev(couchdb, allDocs[j], function (err, revvedDoc) {
                    if (err) {
                      return callback(err);
                    }
                    if (revvedDoc) {
                      changedDocs.push(revvedDoc);
                    }
                    setChangedDocs();
                  });
                }
                setChangedDocs();
              }

              function queueDocs(err, warnsAndDoc) {
                if (err) {
                  return callback(err);
                }
                [].push.apply(allWarns, warnsAndDoc[0]);
                [].push.apply(allDocs, warnsAndDoc[1]);
                updateNext();
              }

              updateNext = function () {
                i += 1;
                if (i >= ii) {
                  return saveUpdates();
                }
                var azienda = rows[i].doc,
                  codes = codici.parseIdAzienda(azienda._id);
                if (azienda.hasOwnProperty('codiceMagazzino')) {
                  fetchFromAs400(as400Querier, ['salmod', 'codiceMagazzino=' + azienda.codiceMagazzino],
                    newBuilderInventariMagazzinoDisponibileAs400(codes.codice, listini, taglieScalarini, modelliEScalarini),
                    queueDocs);
                } else {
                  fetchFromAs400(as400Querier, ['ordet00f', 'codiceCliente=' + codes.codice],
                    newBuilderInventariMagazzinoClientiAs400(codes.codice, listini, taglieScalarini, modelliEScalarini),
                    queueDocs);
                }
              };

              updateNext();
            });
          });
        });
      });
    },

    updateAziendeAs400: function (couchdb, callback) {
      couchdb.view(dbconfig.designDoc, 'aziende', { include_docs: true }, function (err, aziende) {
        if (err) {
          return callback(err);
        }
        var rows = aziende.rows, i = -1, ii = rows.length, row, allWarns = [], allResps = [], updateNext;

        function save(err, warnsAndDoc) {
          if (err) {
            return callback(err);
          }
          [].push.apply(allWarns, warnsAndDoc[0]);
          couchutil.saveIfChanged2(couchdb, warnsAndDoc[1], function (err, resp) {
            if (err) {
              return callback(err);
            }
            if (resp) {
              allResps.push(resp);
            }
            updateNext();
          });
        }

        updateNext = function () {
          i += 1;
          if (i >= ii) {
            return callback(null, [allWarns], allResps.length ? allResps : null);
          }
          row = rows[i];
          var codes = codici.parseIdAzienda(row.id);
          fetchFromAs400(as400Querier, ['clienti', 'codice=' + codes.codice], newBuilderAziendaAs400(row.doc), save);
        };

        updateNext();
      });
    }
  };
});
