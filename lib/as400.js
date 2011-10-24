/*global define: false */

define(['underscore', 'lib/taskutil', 'lib/couchutil', 'app/js/codici'], function (_, taskutil, couchutil, codici) {
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
    var r, stagione, modello, descrizione, scalarino,
      col = codici.colNamesToColIndexes(modelliEScalarini[0].columnNames),
      rows = modelliEScalarini[0].rows, i = 0, n = rows.length,
      warns = [], lista = {};
    for (; i < n; i += 1) {
      r = rows[i];
      stagione = r[col.stagione];
      modello = r[col.modello];
      descrizione = (r[col.descrizione] || '').trim();
      scalarino = (r[col.scalarino] || '').trim();
      if (!rexp.stagione.test(stagione || '')) {
        warns.push('Stagione non valida: stagione="' + stagione + '"');
      } else if (!rexp.modello.test(modello || '')) {
        warns.push('Modello non valido: stagione="' + stagione + '", modello="' + modello + '"');
      } else if (!descrizione) {
        warns.push('Manca descrizione: stagione="' + stagione + '", modello="' + modello + '", descrizione="' + descrizione + '"');
      } else if (!/^\d+$/.test(scalarino || '')) {
        warns.push('Manca scalarino: stagione="' + stagione + '", modello="' + modello + '", descrizione="' + descrizione + '", scalarino="' + scalarino + '"');
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
            warns.push('Valore non valido: key="' + key + '", value="' + value + '"');
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
    azienda.nazione = az[col.nazione];
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

  function newInventario(codiceAzienda, tipoMagazzino, rows) {
    return {
      _id: codici.idInventario(codiceAzienda, tipoMagazzino),
      columnNames: ['barcode', 'giacenza', 'costo', 'inProduzione'],
      rows: rows
    };
  }

  function buildInventarioMagazzinoClientiAs400(codiceAzienda, taglieScalarini, modelliEScalarini, inventarioOrdet00fAs400) {
    var r, stagione, modello, articolo, colore, scalarino, inProduzione, taglie, colonneTaglie, j, l, taglia, qta, desscal,
      col = codici.colNamesToColIndexes(inventarioOrdet00fAs400[0].columnNames),
      rows = inventarioOrdet00fAs400[0].rows, i = 0, n = rows.length,
      warns = [], inventario = [],
      statoArticoloToInProduzione = { '1': true, '2': false },
      mes = modelliEScalarini.lista;

    for (; i < n; i += 1) {
      r = rows[i];
      stagione = codici.padZero(r[col.stagione], codici.LEN_STAGIONE);
      modello = codici.padZero(r[col.modello], codici.LEN_MODELLO);
      scalarino = parseInt(r[col.scalarino], 10);
      desscal = mes[stagione + modello];
      if (!desscal) {
        warns.push('ORDET00F MODELLO NON IN ANAGRAFE: stagione="' + stagione + '", modello="' + modello + '"');
      } else if (desscal[1] !== scalarino) {
        warns.push('ORDET00F SCALARINO IN ANAGRAFE DIVERSO: stagione="' + stagione + '", modello="' + modello + '", scalarino="' + scalarino + '". Scalarino in anagrafe="' + desscal[1] + '"');
      } else {
        articolo = codici.padZero(r[col.articolo], codici.LEN_ARTICOLO);
        colore = codici.padZero(r[col.colore], codici.LEN_COLORE);
        //TODO fare anche controllo listino As400.
        inProduzione = statoArticoloToInProduzione[r[col.statoArticolo]];
        taglie = Object.keys(taglieScalarini.descrizioniTaglie[scalarino]);
        colonneTaglie = taglieScalarini.colonneTaglie[scalarino];
        for (j = 0, l = taglie.length; j < l; j += 1) {
          taglia = taglie[j];
          qta = parseInt(r[col['qta' + colonneTaglie[taglia]]], 10);
          if (qta) {
            //FIXME sostituire '0' con il costo preso dal listino costi.
            if (inProduzione) {
              inventario.push([stagione + modello + articolo + colore + taglia, qta, COSTO_NULLO, 1]);
            } else {
              inventario.push([stagione + modello + articolo + colore + taglia, qta, COSTO_NULLO]);
            }
          }
        }
      }
    }
    return [warns, newInventario(codiceAzienda, codici.TIPO_MAGAZZINO_CLIENTI, inventario)];
  }

  function newBuilderInventarioMagazzinoClientiAs400(codiceAzienda, taglieScalarini, modelliEScalarini) {
    return function (inventarioOrdet00fAs400) {
      return buildInventarioMagazzinoClientiAs400(codiceAzienda, taglieScalarini, modelliEScalarini, inventarioOrdet00fAs400);
    };
  }

  function buildInventarioMagazzinoDisponibileAs400(codiceAzienda, taglieScalarini, modelliEScalarini, inventarioSalmodAs400) {
    var r, stagione, modello, articolo, colore, scalarino, taglia, qta, desscal,
      col = codici.colNamesToColIndexes(inventarioSalmodAs400[0].columnNames),
      rows = inventarioSalmodAs400[0].rows, i = 0, n = rows.length,
      warns = [], inventario = [],
      mes = modelliEScalarini.lista;

    for (; i < n; i += 1) {
      r = rows[i];
      stagione = codici.padZero(r[col.stagione], codici.LEN_STAGIONE);
      modello = codici.padZero(r[col.modello], codici.LEN_MODELLO);
      scalarino = parseInt(r[col.scalarino], 10);
      desscal = mes[stagione + modello];
      if (!desscal) {
        warns.push('ORDET00F MODELLO NON IN ANAGRAFE: stagione="' + stagione + '", modello="' + modello + '"');
      } else if (desscal[1] !== scalarino) {
        warns.push('ORDET00F SCALARINO IN ANAGRAFE DIVERSO: stagione="' + stagione + '", modello="' + modello + '", scalarino="' + scalarino + '". Scalarino in anagrafe="' + desscal[1] + '"');
      } else {
        articolo = codici.padZero(r[col.articolo], codici.LEN_ARTICOLO);
        colore = codici.padZero(r[col.colore], codici.LEN_COLORE);
        //TODO fare anche controllo listino As400.
        taglia = taglieScalarini.taglie[scalarino][r[col.descrizioneTaglia]];
        qta = parseInt(r[col.qta], 10);

        inventario.push([stagione + modello + articolo + colore + taglia, qta, COSTO_NULLO]);
      }
    }
    return [warns, newInventario(codiceAzienda, codici.TIPO_MAGAZZINO_DISPONIBILE, inventario)];
  }

  function newBuilderInventarioMagazzinoDisponibileAs400(codiceAzienda, taglieScalarini, modelliEScalarini) {
    return function (inventarioSalmodAs400) {
      return buildInventarioMagazzinoDisponibileAs400(codiceAzienda, taglieScalarini, modelliEScalarini, inventarioSalmodAs400);
    };
  }

  function updateGiacenzeWithInventarioAndMovimentiMagazzino(warns, giacenze, inventario, movimenti) {
    var bc, movs = {}, PRONTO = 0,
      ids = codici.parseIdInventario(inventario._id),
      col = codici.colNamesToColIndexes(inventario.columnNames);

    function parseBarcode(barcode, inProduzione) {
      var c = codici.parseBarcodeAs400(barcode),
        macs = c.modello + c.articolo + c.colore + c.stagione;
      c.macsAzStTm = macs + ids.codiceAzienda + inProduzione + ids.tipoMagazzino;
      return c;
    }

    function addQta(barcode, qta, inProduzione) {
      var qtas, codes = parseBarcode(barcode, inProduzione),
        row = giacenze[codes.macsAzStTm];
      if (row) {
        qtas = row[row.length - 1];
      } else {
        qtas = {};
        giacenze[codes.macsAzStTm] = [codes.stagione, codes.modello, codes.articolo, codes.colore, ids.codiceAzienda, inProduzione, ids.tipoMagazzino, qtas];
      }
      qtas[codes.taglia] = qta + (qtas[codes.taglia] || 0);
    }

    if (movimenti) {
      movimenti.rows.forEach(function (row) {
        var causale = row.doc.causale;
        //TODO i movimenti su più magazzini non sono supportati perché
        // bisogna capire come ordinarli per il magazzino destinazione.
        // L'ordinamento è necessario per stabilire da quale movimento cominciare
        // per il calcolo delle giacenze a partire dall'inventario: registro
        // nell'inventario l'ultimo movimento processato così al prossimo aggiornamento
        // si parte dal successivo.
        if (causale[2] !== 0) {
          throw 'CAUSALE "' + JSON.stringify(causale) + '" NON SUPPORTATA IN "' + row.doc._id + '".';
        }
        row.doc.rows.forEach(function (m) {
          var q = causale[1] * m[1];
          movs[m[0]] = movs.hasOwnProperty(m[0]) ? movs[m[0]] + q : q;
        });
      });
    }

    inventario.rows.forEach(function (row) {
      var barcode = row[col.barcode],
        giacenza = row[col.giacenza],
        inProduzione = row[col.inProduzione] || PRONTO,
        qta = giacenza + (movs[barcode] || 0);
      if (qta > 0) {
        addQta(barcode, qta, inProduzione);
        delete movs[barcode];
      } else if (qta === 0) {
        delete movs[barcode];
      } else if (qta < 0) {
        movs[barcode] = qta;
      }
    });

    for (bc in movs) {
      if (movs.hasOwnProperty(bc)) {
        if (movs[bc] < 0) {
          warns.push('Giacenza negativa (' + movs[bc] + ') per "' + bc + '" di "' + ids.codiceAzienda + '"');
        } else {
          // Se l'ho movimentato è PRONTO (deve essere stato prodotto per essere movimentato).
          addQta(bc, movs[bc], PRONTO);
        }
      }
    }
  }

  function as400Querier(params, callback) {
    taskutil.execBuffered('java', ['-jar', 'as400-querier.jar'].concat(params), callback);
  }

  function fetchFromAs400(querier, queries, docBuilder, callback) {
    var queryParameters = Array.isArray(queries) ? { 0: queries } : queries,
      queryNames = Object.keys(queryParameters),
      i = 0,
      n = queryNames.length,
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
        if (i < n) {
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

  return {
    //TODO exports for unit test. Better options?
    buildModelliEScalariniAs400: buildModelliEScalariniAs400,
    buildCausaliAs400: buildCausaliAs400,
    buildAziendaAs400: buildAziendaAs400,
    updateGiacenzeWithInventarioAndMovimentiMagazzino: updateGiacenzeWithInventarioAndMovimentiMagazzino,
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
      couchdb.all({
        startkey: '"Azienda_"',
        endkey: '"Azienda_\ufff0"',
        include_docs: true
      }, function (errQuery, aziende) {
        if (errQuery) {
          return callback(errQuery);
        }
        couchdb.get(['TaglieScalarini', 'ModelliEScalarini'], function (errGet, docs) {
          if (errGet) {
            return callback(errGet);
          }
          var taglieScalarini = docs.rows[0].doc, modelliEScalarini = docs.rows[1].doc,
            rows = aziende.rows, i = 0, n = rows.length, allWarns = [], giacenze = {}, updateGiacenzeAzienda;

          function save() {
            i += 1;
            if (i < n) {
              return updateGiacenzeAzienda();
            }
            couchutil.saveIfChanged(null, couchdb, [allWarns, {
              _id: 'Giacenze',
              columnNames: ['stagione', 'modello', 'articolo', 'colore', 'codiceAzienda', 'inProduzione', 'tipoMagazzino', 'giacenze'],
              rows: Object.keys(giacenze).sort().map(function (macsAzStTm) {
                return giacenze[macsAzStTm];
              })
            }], callback);
          }

          function appendGiacenzeAs400(err, warnsAndDoc) {
            if (err) {
              return callback(err);
            }
            allWarns.concat(warnsAndDoc[0]);
            updateGiacenzeWithInventarioAndMovimentiMagazzino(allWarns, giacenze, warnsAndDoc[1]);
            save();
          }

          updateGiacenzeAzienda = function () {
            var azienda = rows[i].doc,
              codiceAzienda = azienda._id.split('_')[1];
            if (azienda.tipo === 'NEGOZIO') {
              couchdb.get(codici.idInventario(codiceAzienda, codici.TIPO_MAGAZZINO_NEGOZIO), function (err, inventario) {
                if (err) {
                  // If not found, fail gracefully. We require inventario to exists even if empty.
                  if (err.headers && err.headers.status === 404) {
                    return save();
                  }
                  callback(err);
                }
                //TODO startkey should be latest processed MovimentoMagazzino for inventario
                couchdb.view('boutique_db/movimenti', { startkey: [codiceAzienda], endkey: [codiceAzienda, {}], include_docs: true }, function (errV, movimenti) {
                  if (errV) {
                    return callback(errV);
                  }
                  updateGiacenzeWithInventarioAndMovimentiMagazzino(allWarns, giacenze, inventario, movimenti);
                  save();
                });
              });
            } else if (azienda.tipo === 'MAGAZZINO' && !azienda.codiceMagazzino) {
              fetchFromAs400(as400Querier, ['ordet00f', 'codiceCliente=' + codiceAzienda],
                newBuilderInventarioMagazzinoClientiAs400(codiceAzienda, taglieScalarini, modelliEScalarini),
                appendGiacenzeAs400);
            } else if (azienda.tipo === 'MAGAZZINO' && azienda.codiceMagazzino) {
              fetchFromAs400(as400Querier, ['salmod', 'codiceMagazzino=' + azienda.codiceMagazzino],
                newBuilderInventarioMagazzinoDisponibileAs400(codiceAzienda, taglieScalarini, modelliEScalarini),
                appendGiacenzeAs400);
            } else {
              allWarns.concat('Azienda di tipo sconosciuto: "' + codiceAzienda + '"');
              save();
            }
          };

          updateGiacenzeAzienda();
        });
      });
    },

    // TODO DRY: tutta la logica per cercare tutte le aziende
    // e per estrarre il codice azienda, è duplicata in varie parti,
    // per esempio nei controller e service di Angular.
    updateAziendeAs400: function (couchdb, callback) {
      couchdb.all({
        startkey: '"Azienda_"',
        endkey: '"Azienda_\ufff0"',
        include_docs: true
      }, function (errQuery, aziende) {
        if (errQuery) {
          return callback(errQuery);
        }
        var rows = aziende.rows, i = 0, n = rows.length, row, allWarns = [], allResps = [];
        function doSave() {
          row = rows[i];
          var codice = row.id.split('_')[1];
          fetchFromAs400(as400Querier, ['clienti', 'codice=' + codice],
            newBuilderAziendaAs400(row.doc),
            function (err, warnsAndDoc) {
              couchutil.saveIfChanged(err, couchdb, warnsAndDoc, function (errSave, warnsAndSavedDoc, resp) {
                if (errSave) {
                  return callback(errSave);
                }
                allWarns.concat(warnsAndSavedDoc[0]);
                if (resp) {
                  allResps.push(resp);
                }
                i += 1;
                if (i < n) {
                  return doSave();
                }
                callback(null, [allWarns, warnsAndSavedDoc[1]], allResps.length ? allResps : null);
              });
            });
        }
        doSave();
      });
    }
  };
});