/*global require:false, process:false, console:false*/
var requirejs = require('requirejs');
requirejs.config({ baseUrl: process.cwd(), nodeRequire: require });

requirejs(['underscore', 'util', 'nano', 'lib/couchutil', 'lib/servers', 'dbconfig', 'views/lib/codici'], function (_, util, nano, couchutil, servers, dbconfig, codici) {
  'use strict';
  var d, dd, baseId,
    source = nano(process.argv[2]).use(process.argv[3]),
    currentYear = parseInt(process.argv[4], 10),
    target = nano(servers.couchdb.authUrl()).use(dbconfig.db),
    baseIds = [
      'Azienda_',
      'Listino_',
      'CausaliAs400',
      'Giacenze',
      'ModelliEScalarini',
      'CausaliAs400',
      'TaglieScalarini'
    ],
    mappaMagazzini = {
      MovimentoMagazzino_099997_2012_54: '019998'
    };
  if (isNaN(currentYear) || currentYear > (new Date().getFullYear())) {
    throw new Error('Invalid year');
  }

  function parseIdMovimentoMagazzino(id) {
    var m = /^MovimentoMagazzino_(\d{6})_(\d{4})_(\d+)$/.exec(id);
    if (m) {
      return { origine: m[1], anno: m[2], numero: m[3] };
    }
  }

  function getInfoMovimentoMagazzino(movimento) {
    var info = parseIdMovimentoMagazzino(movimento._id);
    info.daArchiviare = (!!movimento.accodato) && (parseInt(info.anno, 10) < currentYear);
    return info;
  }

  function getGiacenzeFromInventarioAndMovimentiMagazzino(warns, inventario, movimenti) {
    console.log(inventario._id);
    var bc, giacenze = {}, movs = {}, PRONTO = 0,
      ids = codici.parseIdInventario(inventario._id),
      col = codici.colNamesToColIndexes(inventario.columnNames);

    function parseBarcode(barcode, inProduzione) {
      var c = codici.parseBarcodeAs400(barcode),
        macts = c.modello + c.articolo + c.colore + c.taglia + c.stagione;
      c.mactsAzStTm = macts + ids.codiceAzienda + inProduzione + ids.tipoMagazzino;
      return c;
    }

    function addQta(barcode, qta, inProduzione) {
      var codes = parseBarcode(barcode, inProduzione),
        row = giacenze[codes.mactsAzStTm];
      if (row) {
        row.qta += qta;
      } else {
        giacenze[codes.mactsAzStTm] = {
          stagione: codes.stagione,
          modello: codes.modello,
          articolo: codes.articolo,
          colore: codes.colore,
          taglia: codes.taglia,
          codiceAzienda: ids.codiceAzienda,
          inProduzione: inProduzione,
          tipoMagazzino: ids.tipoMagazzino,
          qta: qta
        };
      }
    }

    if (movimenti) {
      movimenti.rows.forEach(function (row) {
        var mm = row.doc,
          infoMm = getInfoMovimentoMagazzino(mm),
          causale = mm.causale;
        if (!infoMm.daArchiviare) {
          return;
        }
        // FIXME i movimenti su più magazzini non sono completamente supportati perché
        // bisogna capire come ordinarli per il magazzino destinazione.
        // L'ordinamento è necessario per stabilire da quale movimento cominciare
        // per il calcolo delle giacenze a partire dall'inventario: registro
        // nell'inventario l'ultimo movimento processato così al prossimo aggiornamento
        // si parte dal successivo.
        if (infoMm.origine === mm.destinazione) {
          warns.push('Origine = Destinazione = ' + infoMm.origine + ' in ' + mm._id);
        }
        if (infoMm.origine === ids.codiceAzienda) {
          mm.rows.forEach(function (m) {
            var q = causale[1] * m[1];
            movs[m[0]] = movs.hasOwnProperty(m[0]) ? movs[m[0]] + q : q;
          });
        }
        if (mm.destinazione === ids.codiceAzienda && causale[2]) {
          // FIXME write some tests
          mm.rows.forEach(function (m) {
            var q = causale[2] * m[1];
            movs[m[0]] = movs.hasOwnProperty(m[0]) ? movs[m[0]] + q : q;
          });
        }
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
        } else if (movs[bc] > 0) {
          // Se l'ho movimentato è PRONTO (deve essere stato prodotto per essere movimentato).
          addQta(bc, movs[bc], PRONTO);
        }
      }
    }
    return giacenze;
  }

  function findCausale(descrizione) {
    var c, i, ii, causali = codici.CAUSALI_MOVIMENTO_MAGAZZINO;
    for (i = 0, ii = causali.length; i < ii; i += 1) {
      c = causali[i];
      if (c.descrizione === descrizione) {
        return c;
      }
    }
    throw new Error('Causale non valida: ' + descrizione);
  }

  function mappaCausali(oldCausale) {
    if (_.isEqual(oldCausale, ['VENDITA', -1, 0])) {
      return findCausale('VENDITA A CLIENTI');
    } else if (_.isEqual(oldCausale, ['RETTIFICA INVENTARIO -', -1, 0])) {
      return findCausale('RETTIFICA INVENTARIO -');
    } else if (_.isEqual(oldCausale, ['RETTIFICA INVENTARIO +', 1, 0])) {
      return findCausale('RETTIFICA INVENTARIO +');
    } else if (_.isEqual(oldCausale, ['C/VENDITA', 1, 0])) {
      return findCausale('CARICO PER CAMBIO MAGAZZINO');
    } else if (_.isEqual(oldCausale, ['TRASFERIMENTO', -1, 1])) {
      return findCausale('SCARICO PER CAMBIO MAGAZZINO');
    }
    throw new Error('Causale sconosciuta: ' + util.inspect(oldCausale));
  }

  function updateGiacenze() {
    source.get('_all_docs', {
      startkey: 'Azienda_',
      endkey: 'Azienda_\ufff0',
      include_docs: true
    }, function (err, allAziende) {
      if (err) {
        throw new Error(util.inspect(err));
      }
      source.get('TaglieScalarini', function (err, taglieScalarini) {
        if (err) {
          throw new Error(util.inspect(err));
        }
        source.get('ModelliEScalarini', function (err, modelliEScalarini) {
          if (err) {
            throw new Error(util.inspect(err));
          }
          source.get('_all_docs', {
            startkey: 'MovimentoMagazzino_',
            endkey: 'MovimentoMagazzino_\ufff0',
            include_docs: true
          }, function (err, movimenti) {
            if (err) {
              throw new Error(util.inspect(err));
            }
            var aziende = allAziende.rows, i, ii, allWarns = [],
              col = codici.colNamesToColIndexes(codici.COLUMN_NAMES.MovimentoMagazzino);

            function buildRow(g) {
              var newRow = [],
                descs = codici.descrizioniModello(g.stagione, g.modello, g.taglia, taglieScalarini.descrizioniTaglie, modelliEScalarini.lista);
              if (descs[0]) {
                throw new Error(descs[0]);
              }
              newRow[col.barcode] = codici.codiceAs400(g.stagione, g.modello, g.articolo, g.colore, g.taglia);
              newRow[col.scalarino] = descs[1].scalarino;
              newRow[col.descrizioneTaglia] = descs[1].descrizioneTaglia;
              newRow[col.descrizione] = descs[1].descrizione;
              newRow[col.costo] = g.costo || 0;
              newRow[col.qta] = g.qta;
              return newRow;
            }

            function saveMovimentiNonArchiviati(codiceAzienda) {
              var seriali = { D: 1, A: 0, B: 0, C: 0 };
              movimenti.rows.forEach(function (row) {
                var doc, causale, mm = row.doc,
                  infoMm = getInfoMovimentoMagazzino(mm);
                if (infoMm.daArchiviare || infoMm.origine !== codiceAzienda) {
                  return;
                }
                causale = mappaCausali(mm.causale);
                seriali[causale.gruppo] += 1;
                doc = codici.newMovimentoMagazzino(codiceAzienda, mm.data, seriali[causale.gruppo], causale, mm.destinazione);
                doc.riferimento = mm._id + (mm.riferimento ? ' ' + mm.riferimento : '');
                doc.rows = mm.rows.map(function (m) {
                  var g = codici.parseBarcodeAs400(m[0]);
                  g.qta = m[1];
                  return buildRow(g);
                });
                if (mappaMagazzini.hasOwnProperty(mm._id)) {
                  doc.a = mappaMagazzini[mm._id];
                }
                if (mm.accodato) {
                  doc.accodato = 1;
                }
                couchutil.saveIfChanged2(target, doc, function (err, resp) {
                  if (err) {
                    throw new Error(util.inspect(err));
                  }
                  if (resp) {
                    console.dir(resp);
                  }
                });
              });
            }

            function saveMovimentoIniziale(codiceAzienda, rows) {
              var doc = codici.newMovimentoMagazzino(codiceAzienda, currentYear + '0101', 1, findCausale('RETTIFICA INVENTARIO +'));
              doc.rows = rows;
              doc.accodato = 1;
              couchutil.saveIfChanged2(target, doc, function (err, resp) {
                if (err) {
                  throw new Error(util.inspect(err));
                }
                if (resp) {
                  console.dir(resp);
                }
                saveMovimentiNonArchiviati(codiceAzienda);
              });
            }


            function updateGiacenzeAzienda() {
              i += 1;
              if (i >= ii) {
                return console.dir(allWarns);
              }
              var idInventario, codiceAzienda,
                azienda = aziende[i].doc;
              if (codici.hasExternalWarehouse(azienda)) {
                return updateGiacenzeAzienda();
              }
              codiceAzienda = codici.parseIdAzienda(azienda._id).codice;
              idInventario = ['Inventario', codiceAzienda, codici.TIPO_MAGAZZINO_NEGOZIO].join('_');
              source.get(idInventario, function (err, respInventario) {
                var inventario, giacenze;
                if (err) {
                  if (err['status-code'] !== 404) {
                    throw new Error(util.inspect(err));
                  }
                  console.log('Non trovato ' + idInventario);
                  inventario = { _id: idInventario, columnNames: codici.COLUMN_NAMES.Inventario, rows: [] };
                } else {
                  inventario = respInventario;
                }

                giacenze = getGiacenzeFromInventarioAndMovimentiMagazzino(allWarns, inventario, movimenti);
                saveMovimentoIniziale(codiceAzienda, Object.keys(giacenze).sort().map(function (mactsAzStTm) {
                  return buildRow(giacenze[mactsAzStTm]);
                }));
                updateGiacenzeAzienda();
              });
            }

            i = -1;
            ii = aziende.length;
            updateGiacenzeAzienda();
          });
        });
      });
    });
  }

  function copyDocs() {
    d += 1;
    if (d >= dd) {
      return updateGiacenze();
    }
    baseId = baseIds[d];

    source.get('_all_docs', {
      startkey: baseId,
      endkey: baseId + '\ufff0',
      include_docs: true
    }, function (err, docs) {
      if (err) {
        throw new Error(util.inspect(err));
      }
      var i, ii, doc, rows = docs.rows;

      function saveDoc() {
        i += 1;
        if (i >= ii) {
          return copyDocs();
        }
        doc = rows[i].doc;
        couchutil.saveIfChanged2(target, doc, function (err, resp) {
          if (err) {
            throw new Error(util.inspect(err));
          }
          if (resp) {
            console.dir(resp);
          }
          saveDoc();
        });
      }

      i = -1;
      ii = rows.length;
      saveDoc();
    });
  }

  d = -1;
  dd = baseIds.length;
  copyDocs();
});
