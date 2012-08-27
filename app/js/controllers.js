/*global angular:false*/
angular.module('app.controllers', [], ['$controllerProvider', function($controllerProvider) {
  'use strict';

  $controllerProvider.register('Header', ['$scope', 'session', 'SessionInfo', function($scope, session, SessionInfo) {
    $scope.session = session;
    $scope.SessionInfo = SessionInfo;
  }]);

  function createMovimentoMagazzino(Doc, MovimentoMagazzino, $location, promiseAziende, mm, rows, riferimento) {
    promiseAziende.then(function(aziende) {
      var magazzino1 = aziende[mm.magazzino1].doc,
        magazzino2 = aziende.hasOwnProperty(mm.magazzino2) ? aziende[mm.magazzino2].doc : null;
      MovimentoMagazzino.build(magazzino1, mm.data, mm.causale1, rows, magazzino2, riferimento).then(function(newDoc) {
        Doc.save(newDoc).then(function(savedDoc) {
          $location.path(savedDoc._id);
        });
      });
    });
  }

  function setDefaultMagazzino1($scope, session, codici) {
    session.then(function(session) {
      $scope.aziende.then(function(aziende) {
        var username = session.userCtx.name;
        if (aziende.hasOwnProperty(username)) {
          $scope.form.magazzino1 = username;
          $scope.form.causale1 = codici.findCausaleMovimentoMagazzino('VENDITA A CLIENTI', -1);
        }
      });
    });
  }

  $controllerProvider.register('NewMovimentoMagazzino', ['$scope', 'SessionInfo', '$location', 'codici', 'Doc', 'Azienda', 'MovimentoMagazzino', 'session', function($scope, SessionInfo, $location, codici, Doc, Azienda, MovimentoMagazzino, session) {
    SessionInfo.resetFlash();

    $scope.aziende = Azienda.all();
    $scope.causali = codici.CAUSALI_MOVIMENTO_MAGAZZINO;
    $scope.form = { data: codici.newYyyyMmDdDate() };
    setDefaultMagazzino1($scope, session, codici);

    $scope.create = function() {
      createMovimentoMagazzino(Doc, MovimentoMagazzino, $location, $scope.aziende, $scope.form);
    };
  }]);

  //TODO DRY use codici.formatMoney()
  function formatPrezzo(prezzo) {
    var s = String(prezzo);
    return prezzo ? s.slice(0, -2) + ',' + s.slice(-2) : '0';
  }

  $controllerProvider.register('EditMovimentoMagazzino', ['$scope', 'SessionInfo', '$routeParams', 'Downloads', 'codici', 'Azienda', 'Doc', 'Listino', function($scope, SessionInfo, $routeParams, Downloads, codici, Azienda, Doc, Listino) {
    SessionInfo.resetFlash();

    Doc.load(['TaglieScalarini', 'ModelliEScalarini']);
    Listino.load();

    // TODO put _id in $routeParams.codice
    var codiceAzienda, id = 'MovimentoMagazzino_' + $routeParams.codice;

    $scope.codes = codici.parseIdMovimentoMagazzino(id);
    if (!$scope.codes) {
      return SessionInfo.error('Codice non valido: ' + $routeParams.codice);
    }
    $scope.col = codici.colNamesToColIndexes(codici.COLUMN_NAMES.MovimentoMagazzino);
    $scope.newQta = 1;

    $scope.nomeMagazzino1 = Azienda.nome($scope.codes.magazzino1);

    Doc.find(id).then(function(model) {
      $scope.model = model;
      codiceAzienda = codici.parseIdMovimentoMagazzino($scope.model._id).magazzino1;
      if (model.magazzino2) {
        $scope.nomeMagazzino2 = Azienda.nome(model.magazzino2);
      }
    });

    function toLabels(listini) {
      //FIXME ensure model is loaded
      var prezziArticolo, label, labels = [], colListino, col = $scope.col,
        rows = $scope.model.rows, r, i, ii, j, jj;
      for (i = 0, ii = rows.length; i < ii; i += 1) {
        r = rows[i];
        label = codici.parseBarcodeAs400(r[col.barcode]);
        if (!label) {
          SessionInfo.error('Codice non valido: ' + r[col.barcode]);
          return [];
        }
        prezziArticolo = codici.readListino(listini, codiceAzienda, label.stagione, label.modello, label.articolo);
        if (!prezziArticolo) {
          SessionInfo.error('Articolo non a listino: ' + r[col.barcode]);
          return [];
        }
        colListino = prezziArticolo[0];

        label.descrizione = r[col.descrizione].substring(0, 19);
        label.barcode = r[col.barcode];
        label.descrizioneTaglia = r[col.descrizioneTaglia];
        label.prezzo1 = formatPrezzo(prezziArticolo[1][colListino.prezzo1]);
        label.prezzo2 = formatPrezzo(prezziArticolo[1][colListino.prezzo2]);
        label.offerta = prezziArticolo[1][colListino.offerta] || '';
        for (j = 0, jj = r[col.qta]; j < jj; j += 1) {
          labels.push(label);
        }
      }
      return labels;
    }

    $scope.prepareDownloads = function() {
      //FIXME ensure model is loaded
      Listino.all().then(function(listini) {
        Downloads.prepare(toLabels(listini), $scope.model._id);
      });
    };

    function save() {
      Doc.save($scope.model).then(function(savedDoc) {
        $scope.model._rev = savedDoc._rev;
        SessionInfo.notice('Salvato ' + savedDoc._id);
      });
    }

    $scope.save = function() {
      //FIXME ensure model is loaded
      if (!$scope.newBarcode) {
        return save();
      }
      var codes = codici.parseBarcodeAs400($scope.newBarcode);
      if (!codes) {
        return SessionInfo.error('Codice non valido: "' + $scope.newBarcode + '"');
      }
      Doc.find('TaglieScalarini').then(function(taglieScalarini) {
        Doc.find('ModelliEScalarini').then(function(modelliEScalarini) {
          Listino.all().then(function(listini) {
            var prezziArticolo, newRow, col = $scope.col,
              descrizioniTaglie = taglieScalarini.descrizioniTaglie,
              listaModelli = modelliEScalarini.lista,
              descs = codici.descrizioniModello(codes.stagione, codes.modello, codes.taglia, descrizioniTaglie, listaModelli);
            if (descs[0]) {
              return SessionInfo.error(descs[0] + ': "' + $scope.newBarcode + '"');
            }
            newRow = [];
            newRow[col.barcode] = $scope.newBarcode;
            newRow[col.scalarino] = descs[1].scalarino;
            newRow[col.descrizioneTaglia] = descs[1].descrizioneTaglia;
            newRow[col.descrizione] = descs[1].descrizione;
            prezziArticolo = codici.readListino(listini, codiceAzienda, codes.stagione, codes.modello, codes.articolo);
            if (prezziArticolo) {
              newRow[col.costo] = prezziArticolo[1][prezziArticolo[0].costo];
            } else {
              newRow[col.costo] = 0;
            }
            newRow[col.qta] = $scope.newQta;
            $scope.model.rows.push(newRow);
            save();

            $scope.newBarcode = '';
            $scope.newQta = 1;
          });
        });
      });
    };

    $scope.qtaTotale = function() {
      if (!($scope.model && $scope.model.rows)) {
        return 0;
      }
      var colQta = $scope.col.qta;
      return $scope.model.rows.reduce(function(a, b) {
        return a + b[colQta];
      }, 0);
    };
  }]);

  $controllerProvider.register('MovimentoMagazzino', ['$scope', 'SessionInfo', 'codici', 'Azienda', 'MovimentoMagazzino', 'session', function($scope, SessionInfo, codici, Azienda, MovimentoMagazzino, session) {
    SessionInfo.resetFlash();

    $scope.aziende = Azienda.all();
    session.then(function(session) {
      $scope.aziende.then(function(aziende) {
        var username = session.userCtx.name;
        if (aziende.hasOwnProperty(username)) {
          $scope.pendenti = MovimentoMagazzino.pendenti(username);
        } else {
          $scope.pendenti = MovimentoMagazzino.pendenti();
        }
      });
    });
    $scope.causali = codici.CAUSALI_MOVIMENTO_MAGAZZINO;
    $scope.form = { anno: parseInt(codici.newYyyyMmDdDate().substring(0, 4), 10) };
    setDefaultMagazzino1($scope, session, codici);

    $scope.find = function() {
      $scope.results = MovimentoMagazzino.search($scope.form);
    };

    $scope.nomeAzienda = Azienda.nomi();
  }]);

  $controllerProvider.register('RicercaBollaAs400', ['$scope', 'As400', 'SessionInfo', 'MovimentoMagazzino', '$location', 'codici', 'Azienda', 'Doc', function($scope, As400, SessionInfo, MovimentoMagazzino, $location, codici, Azienda, Doc) {
    SessionInfo.resetFlash();

    Doc.load(['TaglieScalarini', 'ModelliEScalarini']);

    $scope.aziende = Azienda.all();
    $scope.causali = codici.CAUSALI_MOVIMENTO_MAGAZZINO;

    function setMovimentoMagazzino() {
      var r0 = $scope.bollaAs400.rows[0],
        col = codici.colNamesToColIndexes($scope.bollaAs400.columnNames);

      $scope.movimentoMagazzino = {
        magazzino1: r0[col.codiceCliente],
        data: codici.newYyyyMmDdDate()
      };
      Doc.find('CausaliAs400').then(function(causaliAs400) {
        var causaleAs400 = causaliAs400[r0[col.tipoMagazzino]][r0[col.causale]],
          causale = codici.findCausaleMovimentoMagazzino(causaleAs400[0], causaleAs400[1]);
        $scope.movimentoMagazzino.causale1 = causale || $scope.causali[0];
      });
    }

    function cercaBollaAs400() {
      As400.bolla($scope.intestazione).success(function(dati) {
        $scope.bollaAs400 = dati;
        setMovimentoMagazzino();
      });
    }

    function buildId() {
      var d = $scope.intestazione;
      return codici.idBollaAs400(d.data, d.numero, d.enteNumerazione, d.codiceNumerazione);
    }

    $scope.fetch = function() {
      /*
       * Save id here to be sure that the data in `bolla`
       * does match the data in `intestazione`.
       * TODO write some test for this...
       */
      $scope.id = buildId();

      MovimentoMagazzino.findByRiferimento($scope.id).then(function(resp) {
        var movimento = resp.rows[0];
        if (!movimento) {
          return cercaBollaAs400();
        }
        SessionInfo.notice('Bolla già caricata su Boutique');
        SessionInfo.goTo(movimento.id);
      });
    };

    function buildRows(taglieScalarini, modelliEScalarini) {
      var r0 = $scope.bollaAs400.rows[0],
        col = codici.colNamesToColIndexes($scope.bollaAs400.columnNames),
        codiceCliente = r0[col.codiceCliente],
        tipoMagazzino = r0[col.tipoMagazzino],
        codiceMagazzino = r0[col.codiceMagazzino],
        codiceCausaleAs400 = r0[col.causale],
        taglie = taglieScalarini.taglie,
        listeDescrizioni = taglieScalarini.listeDescrizioni,
        rows = [],
        ok = $scope.bollaAs400.rows.every(function(row) {
          var descrizioneTaglia, stagione, modello, descrizione, qta, i, barcode,
            scalarino = parseInt(row[col.scalarino], 10),
            ld = listeDescrizioni[scalarino],
            ts = taglie[scalarino];
          for (i = 0; i < 12; i += 1) {
            qta = parseInt(row[col['qta' + (i + 1)]], 10);
            if (qta > 0) {
              descrizioneTaglia = ld[i];
              stagione = row[col.stagione];
              modello = row[col.modello];
              descrizione = codici.descrizioneModello(stagione, modello, modelliEScalarini.lista);
              barcode = codici.codiceAs400(stagione, modello, row[col.articolo], row[col.colore], ts[descrizioneTaglia]);
              // FIXME inserire costo.
              rows.push([barcode, scalarino, descrizioneTaglia, descrizione, 0, qta]);
            }
          }
          return row[col.codiceCliente] === codiceCliente &&
            row[col.tipoMagazzino] === tipoMagazzino &&
            row[col.codiceMagazzino] === codiceMagazzino &&
            row[col.causale] === codiceCausaleAs400;
        });

      if (ok) {
        return rows;
      }
    }

    $scope.save = function() {
      Doc.find('TaglieScalarini').then(function(taglieScalarini) {
        Doc.find('ModelliEScalarini').then(function(modelliEScalarini) {
          var rows = buildRows(taglieScalarini, modelliEScalarini);
          if (!rows) {
            return SessionInfo.error('Righe non valide');
          }
          createMovimentoMagazzino(Doc, MovimentoMagazzino, $location, $scope.aziende, $scope.movimentoMagazzino, rows, $scope.id);
        });
      });
    };
  }]);

  $controllerProvider.register('RicercaArticoli', ['$scope', 'SessionInfo', 'Downloads', 'codici', 'session', 'Azienda', 'Doc', 'Listino', function($scope, SessionInfo, Downloads, codici, session, Azienda, Doc, Listino) {
    SessionInfo.resetFlash();

    Doc.load(['TaglieScalarini', 'ModelliEScalarini', 'Giacenze']);
    Listino.load();

    var selectedRow = 0;

    $scope.aziendeSelezionate = [];
    session.then(function(session) {
      Azienda.all().then(function(aziende) {
        var tipiAzienda = {}, comuni = {}, province = {}, nazioni = {}, username = session.userCtx.name, codiciAzienda = Object.keys(aziende);
        $scope.aziende = aziende;
        if (aziende.hasOwnProperty(username)) {
          $scope.aziendeSelezionate = [username];
        }
        codiciAzienda.forEach(function(codiceAzienda) {
          var azienda = aziende[codiceAzienda].doc;
          tipiAzienda[azienda.tipo] = true;
          if (azienda.comune) {
            comuni[azienda.comune] = true;
          }
          if (azienda.provincia) {
            province[azienda.provincia] = true;
          }
          if (azienda.nazione) {
            nazioni[azienda.nazione] = true;
          }
        });
        $scope.tipiAzienda = Object.keys(tipiAzienda).sort();
        $scope.comuni = Object.keys(comuni).sort();
        $scope.province = Object.keys(province).sort();
        $scope.nazioni = Object.keys(nazioni).sort();
        $scope.quickSearch = {};
        $scope.$watch('quickSearch', function(qs) {
          var fields = Object.keys(qs),
            emptyQS = fields.every(function(field) {
              return !qs[field];
            });
          if (emptyQS) {
            $scope.aziendeSelezionate = aziende.hasOwnProperty(username) ? [username] : codiciAzienda;
          } else {
            $scope.aziendeSelezionate = codiciAzienda.filter(function(codiceAzienda) {
              var azienda = aziende[codiceAzienda].doc;
              return fields.every(function(field) {
                var qsf = qs[field];
                return !qsf || azienda[field] === qsf;
              });
            });
          }
        }, true);
      });
    });
    $scope.filtrate = [];
    $scope.limiteRisultati = 50;

    $scope.togglePhotoType = function() {
      $scope.photoType = $scope.photoType === 'foto' ? 'tessuto' : 'foto';
      $scope.showPhoto(selectedRow);
    };
    $scope.photoType = 'foto';

    $scope.showPhoto = function(index) {
      if (index >= $scope.filtrate.length || index < 0) {
        return $scope.hidePhoto();
      }
      var img,
        row = $scope.filtrate[index],
        photo = {
          descrizione: row[1],
          stagione: row[2],
          modello: row[3],
          articolo: row[4],
          colore: row[5]
        };
      if ($scope.photoType === 'tessuto') {
        img = ['../tessuto/', photo.articolo, photo.colore, '.jpg'].join('');
      } else {
        img = ['../foto/', photo.stagione, photo.modello, photo.articolo, photo.colore, '.jpg'].join('');
      }

      if ($scope.photo && $scope.photo.show[0]) {
        photo.img = ['spinner.gif', img];
        photo.show = [false, true];
      } else {
        photo.img = [img, 'spinner.gif'];
        photo.show = [true, false];
      }
      selectedRow = index;
      $scope.photo = photo;
    };

    $scope.isSelectedRow = function(index) {
      return $scope.photo && selectedRow === index ? 'selected' : '';
    };

    $scope.hidePhoto = function() {
      selectedRow = 0;
      delete $scope.photo;
    };

    $scope.prevPhoto = function() {
      $scope.showPhoto((selectedRow || $scope.filtrate.length) - 1);
    };

    $scope.nextPhoto = function() {
      $scope.showPhoto((selectedRow + 1) % ($scope.filtrate.length || 1));
    };

    function getFiltroSmacAz() {
      var toks = ['^',
        codici.dotPad($scope.stagione, codici.LEN_STAGIONE),
        codici.dotPad($scope.modello, codici.LEN_MODELLO),
        codici.dotPad($scope.articolo, codici.LEN_ARTICOLO),
        codici.dotPad($scope.colore, codici.LEN_COLORE),
        $scope.aziendeSelezionate.length ? '(?:' + $scope.aziendeSelezionate.join('|') + ')' : '\\d{6}',
        '$'];
      return new RegExp(toks.join(''));
    }

    function getFiltroTaglia() {
      return new RegExp('^' + ($scope.descrizioneTaglia || '.{1,' + codici.LEN_DESCRIZIONE_TAGLIA + '}') + '$', 'i');
    }

    function filtraGiacenza(taglieScalarini, modelliEScalarini, giacenze, listini) {
      Azienda.nomi().then(function(nomeAzienda) {
        var giacenzeRiga, taglia, qta, riga, versioneListino, prezzi, colPrezzi, azienda,
          scalarino, taglie = [], nn = '--', TAGLIE_PER_SCALARINO = 12,
          rows = giacenze.rows, r, i, ii,
          count = 0, filtrate = [], maxCount = $scope.limiteRisultati,
          desscal, ms = modelliEScalarini.lista,
          colonnaTaglia, colonneTaglie = taglieScalarini.colonneTaglie,
          descrizioniTaglia, descrizioniTaglie = taglieScalarini.descrizioniTaglie,
          accoda, filtroSmacAz = getFiltroSmacAz(), filtroTaglia = getFiltroTaglia(),
          totaleRiga, prezzoRiga, totaleRighe = 0, prezzoTotale = 0, totaliColonna = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        for (i = 0, ii = rows.length; i < ii && count < maxCount; i += 1) {
          r = rows[i];
          if (filtroSmacAz.test(r.slice(0, 5).join(''))) {
            accoda = false;
            totaleRiga = 0;
            azienda = nomeAzienda[r[4]] || r[4];
            desscal = ms[r[0] + r[1]];
            if (!desscal) {
              accoda = true;
              riga = [azienda, '## NON IN ANAGRAFE ##', r[0], r[1], r[2], r[3], r[6], (r[5] ? 'IN PROD.' : 'PRONTO'), '##', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
              totaleRiga = 0;
            } else {
              scalarino = desscal[1];
              descrizioniTaglia = descrizioniTaglie[scalarino];
              riga = [azienda, desscal[0], r[0], r[1], r[2], r[3], r[6], (r[5] ? 'IN PROD.' : 'PRONTO'), scalarino, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
              giacenzeRiga = r[7];
              for (taglia in giacenzeRiga) {
                if (giacenzeRiga.hasOwnProperty(taglia)) {
                  if (filtroTaglia.test(descrizioniTaglia[taglia])) {
                    accoda = true;
                    qta = giacenzeRiga[taglia];
                    totaleRiga += qta;
                    colonnaTaglia = colonneTaglie[scalarino][taglia];
                    //TODO DRY '9' is a magic number
                    riga[9 + colonnaTaglia] = qta;
                    totaliColonna[colonnaTaglia] += qta;
                  }
                }
              }
            }
            if (accoda) {
              riga.push(totaleRiga);
              prezzi = codici.readListino(listini, r[4], r[0], r[1], r[2]);
              if (prezzi) {
                versioneListino = prezzi[2];
                colPrezzi = prezzi[0];
                prezzoRiga = prezzi[1][colPrezzi.prezzo2] * totaleRiga;
                riga.push(versioneListino,
                    codici.formatMoney(prezzi[1][colPrezzi.prezzo2]) + (prezzi[1][colPrezzi.offerta] || ''),
                    codici.formatMoney(prezzoRiga));
              } else {
                versioneListino = listini[r[4]].versioneBase || r[4];
                prezzoRiga = '###';
                riga.push(versioneListino, '###', prezzoRiga);
              }
              if (typeof prezzoRiga === 'number' && typeof prezzoTotale === 'number') {
                prezzoTotale += prezzoRiga;
              } else {
                prezzoTotale = '###';
              }
              totaleRighe += totaleRiga;
              count = filtrate.push(riga);
            }
          }
        }
        scalarino = nn;
        r = filtrate[0];
        if (r) {
          desscal = ms[r[2] + r[3]];
          if (desscal) {
            scalarino = desscal[1];
            taglie = taglieScalarini.listeDescrizioni[scalarino];
            for (i = taglie.length; i < TAGLIE_PER_SCALARINO; i += 1) {
              taglie[i] = nn;
            }
          }
        }
        if (typeof prezzoTotale === 'number') {
          prezzoTotale = codici.formatMoney(prezzoTotale);
        }
        totaliColonna.push(totaleRighe, '', '', prezzoTotale);

        $scope.filtrate = filtrate;
        $scope.scalarino = scalarino;
        $scope.taglie = taglie;
        $scope.totaliColonna = totaliColonna;
      });
    }

    function withAllDocs(cb) {
      Doc.find('TaglieScalarini').then(function(taglieScalarini) {
        Doc.find('ModelliEScalarini').then(function(modelliEScalarini) {
          Doc.find('Giacenze').then(function(giacenze) {
            Listino.all().then(function(listini) {
              cb(taglieScalarini, modelliEScalarini, giacenze, listini);
            });
          });
        });
      });
    }

    $scope.filtraGiacenza = function() {
      withAllDocs(filtraGiacenza);
    };

    function toLabels(taglieScalarini, modelliEScalarini, giacenze, listini) {
      var giacenzeRiga, taglia, prezziArticolo, label, colListino,
        col = codici.colNamesToColIndexes(giacenze.columnNames),
        count = 0, labels = [], maxCount = $scope.limiteRisultati,
        desscal, ms = modelliEScalarini.lista,
        descrizioniTaglia, descrizioniTaglie = taglieScalarini.descrizioniTaglie,
        accoda, filtroSmacAz = getFiltroSmacAz(), filtroTaglia = getFiltroTaglia(),
        rows = giacenze.rows, r, i, ii, j, jj;
      for (i = 0, ii = rows.length; i < ii && count < maxCount; i += 1) {
        r = rows[i];
        if (filtroSmacAz.test(r.slice(0, 5).join(''))) {
          accoda = false;
          label = {
            stagione: r[col.stagione],
            modello: r[col.modello],
            articolo: r[col.articolo],
            colore: r[col.colore]
          };
          desscal = ms[label.stagione + label.modello];
          if (!desscal) {
            SessionInfo.error('Modello non in anagrafe: ' + [label.stagione, label.modello].join(' '));
            return [];
          }
          descrizioniTaglia = descrizioniTaglie[desscal[1]];
          giacenzeRiga = r[col.giacenze];

          for (taglia in giacenzeRiga) {
            if (giacenzeRiga.hasOwnProperty(taglia)) {
              if (filtroTaglia.test(descrizioniTaglia[taglia])) {
                if (!accoda) {
                  accoda = true;
                  count += 1;
                  prezziArticolo = codici.readListino(listini, r[col.codiceAzienda], label.stagione, label.modello, label.articolo);
                  if (!prezziArticolo) {
                    SessionInfo.error('Articolo non a listino: ' + [label.stagione, label.modello, label.articolo].join(' '));
                    return [];
                  }
                  colListino = prezziArticolo[0];
                  label.prezzo1 = formatPrezzo(prezziArticolo[1][colListino.prezzo1]);
                  label.prezzo2 = formatPrezzo(prezziArticolo[1][colListino.prezzo2]);
                  label.offerta = prezziArticolo[1][colListino.offerta] || '';
                  label.descrizione = desscal[0].substring(0, 19);
                }
                label.barcode = codici.codiceAs400(label.stagione, label.modello, label.articolo, label.colore, taglia);
                label.descrizioneTaglia = descrizioniTaglia[taglia];
                if (giacenzeRiga[taglia] <= 0) {
                  SessionInfo.notice('Giacenza negativa o nulla per: ' + [label.stagione, label.modello, label.articolo, label.colore, taglia].join(' '));
                } else {
                  for (j = 0, jj = giacenzeRiga[taglia]; j < jj; j += 1) {
                    labels.push(label);
                  }
                }
              }
            }
          }
        }
      }
      return labels;
    }

    $scope.prepareDownloads = function() {
      withAllDocs(function(taglieScalarini, modelliEScalarini, giacenze, listini) {
        Downloads.prepare(toLabels(taglieScalarini, modelliEScalarini, giacenze, listini), 'etichette');
      });
    };

    function toCsv(taglieScalarini, modelliEScalarini, giacenze, listini) {
      var giacenzeRiga, taglia, prezziArticolo, label, colListino, listinoAzienda,
        col = codici.colNamesToColIndexes(giacenze.columnNames),
        labels = [],
        desscal, ms = modelliEScalarini.lista,
        rows = giacenze.rows, r, i, ii, j, jj;
      for (i = 0, ii = rows.length; i < ii; i += 1) {
        r = rows[i];
        label = {
          codiceAzienda: r[col.codiceAzienda],
          stagione: r[col.stagione],
          modello: r[col.modello],
          articolo: r[col.articolo],
          colore: r[col.colore]
        };
        desscal = ms[label.stagione + label.modello];
        if (!desscal) {
          label.descrizione = 'Modello non in anagrafe';
        } else {
          label.descrizione = desscal[0];
        }
        prezziArticolo = codici.readListino(listini, r[col.codiceAzienda], label.stagione, label.modello, label.articolo);
        if (!prezziArticolo) {
          label.prezzo1 = '';
          label.prezzo2 = '';
          label.offerta = '';
          listinoAzienda = listini[r[col.codiceAzienda]];
          label.versioneListino = listinoAzienda.hasOwnProperty('versioneBase') ? listinoAzienda.versioneBase : r[col.codiceAzienda];
        } else {
          colListino = prezziArticolo[0];
          label.prezzo1 = formatPrezzo(prezziArticolo[1][colListino.prezzo1]);
          label.prezzo2 = formatPrezzo(prezziArticolo[1][colListino.prezzo2]);
          label.offerta = prezziArticolo[1][colListino.offerta] || '';
          label.versioneListino = prezziArticolo[2];
        }

        label.giacenza = 0;
        giacenzeRiga = r[col.giacenze];
        for (taglia in giacenzeRiga) {
          if (giacenzeRiga.hasOwnProperty(taglia)) {
            label.giacenza += giacenzeRiga[taglia];
          }
        }
        labels.push(label);
      }
      return labels;
    }

    $scope.prepareCsvDownloads = function() {
      withAllDocs(function(taglieScalarini, modelliEScalarini, giacenze, listini) {
        Downloads.prepareCsv(toCsv(taglieScalarini, modelliEScalarini, giacenze, listini), 'giacenze');
      });
    };
  }]);

  $controllerProvider.register('Azienda', ['$scope', '$routeParams', 'SessionInfo', 'codici', 'validate', 'Azienda', 'Doc', function($scope, $routeParams, SessionInfo, codici, validate, Azienda, Doc) {
    SessionInfo.resetFlash();

    if ($routeParams.codice) {
      Doc.find(codici.idAzienda($routeParams.codice)).then(function(azienda) {
        $scope.azienda = azienda;
      });
    }
    Azienda.all().then(function(aziende) {
      $scope.aziende = aziende;
    });
    $scope.azienda = {};
    $scope.tipiAzienda = codici.TIPI_AZIENDA;

    function getOldAziendaDocument(aziende, id) {
      var codes = codici.parseIdAzienda(id), oldAzienda;
      if (codes) {
        oldAzienda = aziende[codes.codice];
        if (oldAzienda) {
          return oldAzienda.doc;
        }
      }
    }

    function aggiornaAzienda(aziende, azienda) {
      angular.copy(azienda, getOldAziendaDocument(aziende, azienda._id));
    }

    function checkUpdate(aziende, azienda) {
      var msgs = validate(azienda, getOldAziendaDocument(aziende, azienda._id));
      SessionInfo.setFlash(msgs);
      return !msgs.errors.length;
    }

    function createListinoAzienda(azienda) {
      var codes = codici.parseIdAzienda(azienda._id),
        listino = {
          _id: codici.idListino(codes.codice),
          columnNames: codici.COLUMN_NAMES.Listino,
          prezzi: {},
          versioneBase: '1'
        };
      Doc.save(listino).then(function() {
        SessionInfo.goTo(azienda._id);
      });
    }

    //FIXME i contatti non vengono salvati.
    $scope.save = function() {
      // TODO use $validate event
      if (checkUpdate($scope.aziende, $scope.azienda)) {
        var isNew = !getOldAziendaDocument($scope.aziende, $scope.azienda._id);
        Doc.save($scope.azienda).then(function(azienda) {
          $scope.azienda = azienda;
          aggiornaAzienda($scope.aziende, azienda);
          SessionInfo.notice('Salvato');
          if (isNew) {
            createListinoAzienda(azienda);
          }
        });
      }
    };
  }]);

  $controllerProvider.register('Listino', ['$scope', '$routeParams', 'SessionInfo', '$location', 'codici', 'Doc', function($scope, $routeParams, SessionInfo, $location, codici, Doc) {
    SessionInfo.resetFlash();

    var id = $routeParams.codice ? codici.idListino($routeParams.codice) : null;
    if (id) {
      $scope.prezzi = [];
      Doc.load([id]);
    }

    $scope.fetch = function() {
      $location.path(codici.idListino($scope.versione));
    };

    function getFiltro(val, len) {
      return new RegExp('^' + codici.dotPad(val, len) + '$');
    }

    $scope.findRows = function() {
      Doc.find(id).then(function(listino) {
        if ($scope.stagione || $scope.modello || $scope.articolo) {
          var filtroStagione = getFiltro($scope.stagione, codici.LEN_STAGIONE),
            filtroModello = getFiltro($scope.modello, codici.LEN_MODELLO),
            filtroArticolo = getFiltro($scope.articolo, codici.LEN_ARTICOLO);
          $scope.prezzi = codici.findProperties(listino.prezzi, filtroStagione, filtroModello, filtroArticolo);
        }
      });
    };

    $scope.save = function() {
      Doc.find(id).then(function(listino) {
        var ps = listino.prezzi,
          ok = $scope.prezzi.every(function(r) {
            var stagione = r[0], modello = r[1], articolo = r[2], vals = r[3];
            return (codici.isCode(stagione, codici.LEN_STAGIONE) &&
                codici.isCode(modello, codici.LEN_MODELLO) &&
                codici.isCode(articolo, codici.LEN_ARTICOLO) &&
                codici.isNumero(vals[0]) &&
                codici.isNumero(vals[1]) &&
                codici.isNumero(vals[2]));
          });
        if (!ok) {
          return SessionInfo.error('Valori non validi');
        }
        $scope.prezzi.forEach(function(r) {
          var stagione = r[0], modello = r[1], articolo = r[2], vals = r[3],
            // FIXME write tests (I think it's broken): it removes offerta if empty.
            v = vals[4] ? vals : vals.slice(0, 4);
          codici.setProperty(ps, stagione, modello, articolo, v);
        });
        // TODO trovare un modo generale di non trasmettere campi vuoti o null.
        if (!listino.versioneBase) {
          delete listino.versioneBase;
        }
        Doc.save(listino).then(function(listino) {
          SessionInfo.notice('Salvato ' + listino._id);
        });
      });
    };
  }]);

  $controllerProvider.register('Foto', ['$scope', 'SessionInfo', 'couchdb', 'Doc', '$routeParams', function($scope, SessionInfo, couchdb, Doc, $routeParams) {
    SessionInfo.resetFlash();
    $scope.results = [];
    $scope.costi = {};
    $scope.total = '';

    $scope.find = function() {
      SessionInfo.goTo($scope.idFoto);
    };

    function reSum() {
      var costi = $scope.costi, results = $scope.results, t = 0;
      for (var i = 0, ii = results.length; i < ii; ++i) {
        if (results[i].selected) t += costi[results[i].sma];
      }
      $scope.total = t;
    }

    //TODO cleanup this mess!!!
    if ($routeParams.id) {
      $scope.idFoto = 'Foto' + $routeParams.id;
      Doc.find($scope.idFoto).then(function(foto) {
        Doc.find('ModelliEScalarini').then(function(modelliEScalarini) {
          var ms = modelliEScalarini.lista;
          $scope.results = foto.articoli.map(function(articolo) {
            var desscal = ms[articolo.stagione + articolo.modello];
            if (desscal) articolo.descrizione = desscal[0];
            return articolo;
          });
          var numCosti = 0;
          $scope.results.forEach(function(r) {
            r.selected = true;
            r.sma = [r.stagione, r.modello, r.articolo].join('');
            Doc.find('COSTO', couchdb.viewPath('costo?key="' + r.sma + '"')).then(function(costo) {
              var row = costo.rows[0];
              if (row) {
                $scope.costi[row.key] = row.value;
                numCosti += 1;
                if (numCosti === $scope.results.length) {
                  $scope.reSum = reSum;
                  reSum();
                }
              }
            });
          });
        });
      });
      var m = /^Foto_(\d+)_(\d+)_\d+$/.exec($scope.idFoto),
        base = m ? '../catalogo/' + m[1] + '_' + m[2] : null;
      $scope.image = base ? base + '.jpg' : null;
      $scope.imageOrig = base ? base + '_orig.jpg' : null;
    }
  }]);
}]);
