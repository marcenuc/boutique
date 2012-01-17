/*global angular: false, CODICI: false*/

var Ctrl = {};

(function () {
  'use strict';

  Ctrl.Header = function (SessionInfo) {
    this.SessionInfo = SessionInfo;
    this.session = SessionInfo.getResource('../_session');
  };
  Ctrl.Header.$inject = ['SessionInfo'];

  Ctrl.NewMovimentoMagazzino = function (SessionInfo, $location) {
    this.SessionInfo = SessionInfo;
    this.$location = $location;
    SessionInfo.resetFlash();

    this.aziende = SessionInfo.aziende();
    this.causali = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO;
  };
  Ctrl.NewMovimentoMagazzino.$inject = ['SessionInfo', '$location'];

  Ctrl.NewMovimentoMagazzino.prototype = {
    getYear: function () {
      return this.form.data ? this.form.data.substring(0, 4) : null;
    },

    create: function () {
      var self = this,
        mm = this.form;
      this.SessionInfo.prossimoNumero(mm.da, mm.data.substring(0, 4), mm.causale.gruppo, function (numero) {
        var doc = CODICI.newMovimentoMagazzino(self.aziende[mm.da].value, mm.data, numero, mm.causale, self.aziende[mm.a].value);
        self.SessionInfo.save(doc, function (res) {
          self.$location.path(res.id);
        });
      });
    }
  };

  Ctrl.EditMovimentoMagazzino = function (SessionInfo, $routeParams, Downloads) {
    this.SessionInfo = SessionInfo;
    this.Downloads = Downloads;
    SessionInfo.resetFlash();
    // TODO use CODICI
    this.rexpBarcode = /^\d{3} ?\d{5} ?\d{4} ?\d{4} ?\d{2}$/;

    // TODO put _id in $routeParams.codice
    var id = 'MovimentoMagazzino_' + $routeParams.codice;

    this.codes = CODICI.parseIdMovimentoMagazzino(id);
    if (!this.codes) {
      return SessionInfo.error('Codice non valido: ' + $routeParams.codice);
    }
    this.model = SessionInfo.getDocument(id);
    this.aziende = SessionInfo.aziende();
    this.listini = SessionInfo.listini();
    this.taglieScalarini = SessionInfo.getDocument('TaglieScalarini');
    this.modelliEScalarini = SessionInfo.getDocument('ModelliEScalarini');
    this.col = CODICI.colNamesToColIndexes(CODICI.COLUMN_NAMES.MovimentoMagazzino);
    this.newQta = 1;
  };
  Ctrl.EditMovimentoMagazzino.$inject = ['SessionInfo', '$routeParams', 'Downloads'];

  function nomeAzienda(aziende, codiceAzienda) {
    var azienda = aziende[codiceAzienda];
    return azienda ? azienda.value : codiceAzienda;
  }

  //TODO DRY use CODICI.formatMoney()
  function formatPrezzo(prezzo) {
    var s = String(prezzo);
    return prezzo ? s.slice(0, -2) + ',' + s.slice(-2) : '0';
  }

  Ctrl.EditMovimentoMagazzino.prototype = {
    toLabels: function () {
      var prezziArticolo, label, labels = [], colListino, col = this.col,
        codiceAzienda = CODICI.parseIdMovimentoMagazzino(this.model._id).da,
        rows = this.model.rows, r, i, ii, j, jj;
      for (i = 0, ii = rows.length; i < ii; i += 1) {
        r = rows[i];
        label = CODICI.parseBarcodeAs400(r[col.barcode]);
        if (!label) {
          this.SessionInfo.error('Codice non valido: ' + r[col.barcode]);
          return [];
        }
        prezziArticolo = CODICI.readListino(this.listini, codiceAzienda, label.stagione, label.modello, label.articolo);
        if (!prezziArticolo) {
          this.SessionInfo.error('Articolo non a listino: ' + r[col.barcode]);
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
    },

    prepareDownloads: function () {
      this.Downloads.prepare(this.toLabels(), this.model._id);
    },

    save: function () {
      var newRow, codes, descs, self = this, col = this.col;
      if (this.newBarcode) {
        codes = CODICI.parseBarcodeAs400(this.newBarcode);
        if (!codes) {
          return this.SessionInfo.error('Codice non valido: "' + this.newBarcode + '"');
        }
        descs = CODICI.descrizioniModello(codes.stagione, codes.modello, codes.taglia, this.taglieScalarini.descrizioniTaglie, this.modelliEScalarini.lista);
        if (descs[0]) {
          return this.SessionInfo.error(descs[0] + ': "' + this.newBarcode + '"');
        }
        newRow = [];
        newRow[col.barcode] = this.newBarcode;
        newRow[col.scalarino] = descs[1].scalarino;
        newRow[col.descrizioneTaglia] = descs[1].descrizioneTaglia;
        newRow[col.descrizione] = descs[1].descrizione;
        newRow[col.costo] = 0;
        newRow[col.qta] = this.newQta;
        this.model.rows.push(newRow);
        this.newBarcode = '';
        this.newQta = 1;
      }
      this.SessionInfo.save(this.model, function (res) {
        self.model._rev = res.rev;
        self.SessionInfo.notice('Salvato ' + res.id);
      });
    },

    qtaTotale: function () {
      var colQta = this.col.qta;
      return this.model.rows.reduce(function (a, b) {
        return a + b[colQta];
      }, 0);
    },

    //TODO DRY copiata in Ctrl.MovimentoMagazzino
    nomeAzienda: function (codiceAzienda) {
      return nomeAzienda(this.aziende, codiceAzienda);
    }
  };

  Ctrl.MovimentoMagazzino = function (SessionInfo, $location) {
    this.$location = $location;
    SessionInfo.resetFlash();

    this.pendenti = SessionInfo.movimentoMagazzinoPendente();
    this.aziende = SessionInfo.aziende();
    this.causali = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO;
  };
  Ctrl.MovimentoMagazzino.$inject = ['SessionInfo', '$location'];

  Ctrl.MovimentoMagazzino.prototype = {
    find: function () {
      var f = this.form;
      this.$location.path(CODICI.idMovimentoMagazzino(f.da, f.anno, f.causale.gruppo, f.numero));
    },

    //TODO DRY copiata in Ctrl.EditMovimentoMagazzino
    nomeAzienda: function (codiceAzienda) {
      return nomeAzienda(this.aziende, codiceAzienda);
    }
  };

  Ctrl.RicercaBollaAs400 = function (As400, SessionInfo, CdbView, $location) {
    SessionInfo.resetFlash();
    this.As400 = As400;
    this.SessionInfo = SessionInfo;
    this.CdbView = CdbView;
    this.$location = $location;

    this.aziende = SessionInfo.aziende();
    this.taglieScalarini = SessionInfo.getDocument('TaglieScalarini');
    this.modelliEScalarini = SessionInfo.getDocument('ModelliEScalarini');
    this.causaliAs400 = SessionInfo.getDocument('CausaliAs400');
    this.causali = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO;
  };
  Ctrl.RicercaBollaAs400.$inject = ['As400', 'SessionInfo', 'CdbView', '$location'];

  Ctrl.RicercaBollaAs400.prototype = {
    cercaBollaAs400: function () {
      var self = this;
      this.As400.bolla(this.intestazione, function (code, dati) {
        if (code !== 200) {
          return self.SessionInfo.error('Errore ' + code);
        }
        self.bollaAs400 = dati;
        self.setMovimentoMagazzino();
      });
    },

    fetch: function () {
      var self = this;
      /*
       * Save id here to be sure that the data in `bolla`
       * does match the data in `intestazione`.
       * TODO write some test for this...
       */
      this.id = this.buildId();

      this.CdbView.riferimentoMovimentoMagazzino(this.id, function (resp) {
        var riferimento = resp.rows[0];
        if (!riferimento) {
          return self.cercaBollaAs400();
        }
        self.SessionInfo.notice('Bolla già caricata su Boutique');
        self.SessionInfo.keepFlash = true;
        self.$location.path(riferimento.id);
      });
    },

    buildId: function () {
      var d = this.intestazione;
      return CODICI.idBollaAs400(d.data, d.numero, d.enteNumerazione, d.codiceNumerazione);
    },

    findCausale: function (causaleAs400) {
      var c, i, ii;
      for (i = 0, ii = this.causali.length; i < ii; i += 1) {
        c = this.causali[i];
        if (c.descrizione === causaleAs400) {
          return c;
        }
      }
      return this.causali[0];
    },

    setMovimentoMagazzino: function () {
      var r0 = this.bollaAs400.rows[0],
        col = CODICI.colNamesToColIndexes(this.bollaAs400.columnNames),
        codiceCliente = r0[col.codiceCliente],
        tipoMagazzino = r0[col.tipoMagazzino],
        codiceCausaleAs400 = r0[col.causale];

      this.movimentoMagazzino = {
        da: codiceCliente,
        causale: this.findCausale(this.causaliAs400[tipoMagazzino][codiceCausaleAs400]),
        data: CODICI.newYyyyMmDdDate()
      };
    },

    buildRows: function () {
      var r0 = this.bollaAs400.rows[0],
        col = CODICI.colNamesToColIndexes(this.bollaAs400.columnNames),
        codiceCliente = r0[col.codiceCliente],
        tipoMagazzino = r0[col.tipoMagazzino],
        codiceMagazzino = r0[col.codiceMagazzino],
        codiceCausaleAs400 = r0[col.causale],
        taglie = this.taglieScalarini.taglie,
        listeDescrizioni = this.taglieScalarini.listeDescrizioni,
        rows = [],
        ok = this.bollaAs400.rows.every(function (row) {
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
              descrizione = CODICI.descrizioneModello(stagione, modello, this.modelliEScalarini.lista);
              barcode = CODICI.codiceAs400(stagione, modello, row[col.articolo], row[col.colore], ts[descrizioneTaglia]);
              // FIXME inserire costo.
              rows.push([barcode, scalarino, descrizioneTaglia, descrizione, 0, qta]);
            }
          }
          return row[col.codiceCliente] === codiceCliente &&
            row[col.tipoMagazzino] === tipoMagazzino &&
            row[col.codiceMagazzino] === codiceMagazzino &&
            row[col.causale] === codiceCausaleAs400;
        }, this);

      if (ok) {
        return rows;
      }
    },

    save: function () {
      var self = this, mm = this.movimentoMagazzino,
        rows = self.buildRows();
      if (!rows) {
        return self.SessionInfo.error('Righe non valide');
      }
      this.SessionInfo.prossimoNumero(mm.da, mm.data.substring(0, 4), mm.causale.gruppo, function (numero) {
        var doc = CODICI.newMovimentoMagazzino(mm.da, mm.data, numero, mm.causale, mm.a);
        doc.riferimento = self.id;
        doc.rows = rows;
        self.SessionInfo.save(doc, function (res) {
          self.$location.path(res.id);
        });
      });
    }
  };

  Ctrl.RicercaArticoli = function (SessionInfo, Downloads) {
    this.SessionInfo = SessionInfo;
    this.Downloads = Downloads;
    SessionInfo.resetFlash();
    this.aziendeSelezionate = [];

    this.aziende = SessionInfo.aziende();
    this.listini = SessionInfo.listini();
    this.taglieScalarini = SessionInfo.getDocument('TaglieScalarini');
    this.modelliEScalarini = SessionInfo.getDocument('ModelliEScalarini');
    this.giacenze = SessionInfo.getDocument('Giacenze');

    this.filtrate = [];
    this.limiteRisultati = 50;
  };
  Ctrl.RicercaArticoli.$inject = ['SessionInfo', 'Downloads'];

  Ctrl.RicercaArticoli.prototype = {
    showPhoto: function (index) {
      var row = this.filtrate[index],
        photo = {
          descrizione: row[1],
          stagione: row[2],
          modello: row[3],
          articolo: row[4],
          colore: row[5]
        },
        img = ['../img/', photo.stagione, photo.modello, photo.articolo, photo.colore, '.jpg'].join('');

      if (this.photo && this.photo.show[0]) {
        photo.img = ['spinner.gif', img];
        photo.show = [false, true];
      } else {
        photo.img = [img, 'spinner.gif'];
        photo.show = [true, false];
      }
      this.selectedRow = index;
      this.photo = photo;
    },

    isSelectedRow: function (index) {
      return this.selectedRow === index ? 'selected' : '';
    },

    hidePhoto: function () {
      delete this.selectedRow;
      delete this.photo;
    },

    prevPhoto: function () {
      var newIndex = (this.selectedRow || 0) - 1;
      this.showPhoto(newIndex < 0 ? this.filtrate.length - 1 : newIndex);
    },

    nextPhoto: function () {
      var newIndex = (this.selectedRow || 0) + 1;
      this.showPhoto(newIndex % this.filtrate.length);
    },

    getFiltroSmacAz: function () {
      var toks = ['^',
        CODICI.dotPad(this.stagione, CODICI.LEN_STAGIONE),
        CODICI.dotPad(this.modello, CODICI.LEN_MODELLO),
        CODICI.dotPad(this.articolo, CODICI.LEN_ARTICOLO),
        CODICI.dotPad(this.colore, CODICI.LEN_COLORE),
        this.aziendeSelezionate.length ? '(?:' + this.aziendeSelezionate.join('|') + ')' : '\\d{6}',
        '$'];
      return new RegExp(toks.join(''));
    },

    getFiltroTaglia: function () {
      return new RegExp('^' + (this.descrizioneTaglia || '.{1,' + CODICI.LEN_DESCRIZIONE_TAGLIA + '}') + '$', 'i');
    },

    filtraGiacenza: function () {
      var giacenze, taglia, qta, riga, versioneListino, prezzi, colPrezzi,
        scalarino, taglie = [], nn = '--', TAGLIE_PER_SCALARINO = 12,
        rows = this.giacenze.rows, r, i, ii,
        count = 0, filtrate = [], maxCount = this.limiteRisultati,
        desscal, ms = this.modelliEScalarini.lista,
        colonnaTaglia, colonneTaglie = this.taglieScalarini.colonneTaglie,
        descrizioniTaglia, descrizioniTaglie = this.taglieScalarini.descrizioniTaglie,
        accoda, filtroSmacAz = this.getFiltroSmacAz(), filtroTaglia = this.getFiltroTaglia(),
        totaleRiga, totaleRighe = 0, totaliColonna = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      for (i = 0, ii = rows.length; i < ii && count < maxCount; i += 1) {
        r = rows[i];
        if (filtroSmacAz.test(r.slice(0, 5).join(''))) {
          accoda = false;
          totaleRiga = 0;
          desscal = ms[r[0] + r[1]];
          if (!desscal) {
            accoda = true;
            riga = [nomeAzienda(this.aziende, r[4]), '## NON IN ANAGRAFE ##', r[0], r[1], r[2], r[3], r[6], (r[5] ? 'IN PRODUZIONE' : 'PRONTO'), '##', -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
            totaleRiga = 0;
          } else {
            scalarino = desscal[1];
            descrizioniTaglia = descrizioniTaglie[scalarino];
            riga = [nomeAzienda(this.aziende, r[4]), desscal[0], r[0], r[1], r[2], r[3], r[6], (r[5] ? 'IN PRODUZIONE' : 'PRONTO'), scalarino, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            giacenze = r[7];
            for (taglia in giacenze) {
              if (giacenze.hasOwnProperty(taglia)) {
                if (filtroTaglia.test(descrizioniTaglia[taglia])) {
                  accoda = true;
                  qta = giacenze[taglia];
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
            prezzi = CODICI.readListino(this.listini, r[4], r[0], r[1], r[2]);
            if (prezzi) {
              versioneListino = prezzi[2];
              colPrezzi = prezzi[0];
              riga.push(versioneListino, CODICI.formatMoney(prezzi[1][colPrezzi.prezzo2]) + (prezzi[1][colPrezzi.offerta] || ''));
            } else {
              versioneListino = this.listini[r[4]].versioneBase || r[4];
              riga.push(versioneListino, '## N.D. ##');
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
          taglie = this.taglieScalarini.listeDescrizioni[scalarino];
          for (i = taglie.length; i < TAGLIE_PER_SCALARINO; i += 1) {
            taglie[i] = nn;
          }
        }
      }
      totaliColonna.push(totaleRighe);

      this.filtrate = filtrate;
      this.scalarino = scalarino;
      this.taglie = taglie;
      this.totaliColonna = totaliColonna;
    },

    toLabels: function () {
      var giacenze, taglia, prezziArticolo, label, colListino,
        col = CODICI.colNamesToColIndexes(this.giacenze.columnNames),
        count = 0, labels = [], maxCount = this.limiteRisultati,
        desscal, ms = this.modelliEScalarini.lista,
        descrizioniTaglia, descrizioniTaglie = this.taglieScalarini.descrizioniTaglie,
        accoda, filtroSmacAz = this.getFiltroSmacAz(), filtroTaglia = this.getFiltroTaglia(),
        rows = this.giacenze.rows, r, i, ii, j, jj;
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
            this.SessionInfo.error('Modello non in anagrafe: ' + [label.stagione, label.modello].join(' '));
            return [];
          }
          descrizioniTaglia = descrizioniTaglie[desscal[1]];
          giacenze = r[col.giacenze];

          for (taglia in giacenze) {
            if (giacenze.hasOwnProperty(taglia)) {
              if (filtroTaglia.test(descrizioniTaglia[taglia])) {
                if (!accoda) {
                  accoda = true;
                  count += 1;
                  prezziArticolo = CODICI.readListino(this.listini, r[col.codiceAzienda], label.stagione, label.modello, label.articolo);
                  if (!prezziArticolo) {
                    this.SessionInfo.error('Articolo non a listino: ' + [label.stagione, label.modello, label.articolo].join(' '));
                    return [];
                  }
                  colListino = prezziArticolo[0];
                  label.prezzo1 = formatPrezzo(prezziArticolo[1][colListino.prezzo1]);
                  label.prezzo2 = formatPrezzo(prezziArticolo[1][colListino.prezzo2]);
                  label.offerta = prezziArticolo[1][colListino.offerta] || '';
                  label.descrizione = desscal[0].substring(0, 19);
                }
                label.barcode = CODICI.codiceAs400(label.stagione, label.modello, label.articolo, label.colore, taglia);
                label.descrizioneTaglia = descrizioniTaglia[taglia];
                if (giacenze[taglia] <= 0) {
                  this.SessionInfo.notice('Giacenza negativa o nulla per: ' + [label.stagione, label.modello, label.articolo, label.colore, taglia].join(' '));
                } else {
                  for (j = 0, jj = giacenze[taglia]; j < jj; j += 1) {
                    labels.push(label);
                  }
                }
              }
            }
          }
        }
      }
      return labels;
    },

    prepareDownloads: function () {
      this.Downloads.prepare(this.toLabels(), 'etichette');
    }
  };

  Ctrl.Azienda = function ($routeParams, SessionInfo, Validator) {
    SessionInfo.resetFlash();
    this.$routeParams = $routeParams;
    this.SessionInfo = SessionInfo;
    this.Validator = Validator;
    this.tipiAzienda = CODICI.TIPI_AZIENDA;

    if ($routeParams.codice) {
      this.id = CODICI.idAzienda($routeParams.codice);
      this.azienda = SessionInfo.getDocument(this.id);
    }
    this.aziende = SessionInfo.aziende({ include_docs: 'true' });
  };
  Ctrl.Azienda.$inject = ['$routeParams', 'SessionInfo', 'Validator'];

  Ctrl.Azienda.prototype = {
    getOldAziendaDocument: function () {
      var codes = CODICI.parseIdAzienda(this.azienda._id), azienda;
      if (codes) {
        azienda = this.aziende[codes.codice];
        if (azienda) {
          return azienda.doc;
        }
      }
    },

    aggiornaAzienda: function () {
      angular.copy(this.azienda, this.getOldAziendaDocument());
    },

    isIdChanged: function () {
      return this.id !== this.azienda._id;
    },

    validate: function () {
      return !this.SessionInfo.setFlash(this.Validator.check(this.azienda, this.getOldAziendaDocument()));
    },

    //FIXME i contatti non vengono salvati.
    save: function () {
      var self = this;
      if (this.isIdChanged()) {
        delete this.azienda._rev;
      }
      // TODO use $validate event
      if (this.validate()) {
        this.SessionInfo.save(this.azienda, function (res) {
          var isNew = !self.azienda._rev;
          self.azienda._rev = res.rev;
          self.SessionInfo.notice('Salvato');
          if (isNew) {
            self.createListinoAzienda();
          } else {
            self.aggiornaAzienda();
          }
        });
      }
    },

    createListinoAzienda: function () {
      var self = this,
        codes = CODICI.parseIdAzienda(this.azienda._id),
        listino = {
          _id: CODICI.idListino(codes.codice),
          columnNames: CODICI.COLUMN_NAMES.Listino,
          prezzi: {},
          versioneBase: '1'
        };
      this.SessionInfo.save(listino, function () {
        self.SessionInfo.goTo('/' + self.azienda._id);
      });
    }
  };

  Ctrl.Listino = function ($routeParams, SessionInfo, $location) {
    SessionInfo.resetFlash();
    this.SessionInfo = SessionInfo;
    this.$location = $location;

    if ($routeParams.codice) {
      this.prezzi = [];
      this.listino = this.SessionInfo.getDocument(CODICI.idListino($routeParams.codice));
    }
  };
  Ctrl.Listino.$inject = ['$routeParams', 'SessionInfo', '$location'];

  Ctrl.Listino.prototype = {
    fetch: function () {
      this.$location.path(CODICI.idListino(this.versione));
    },

    getFiltro: function (val, len) {
      return new RegExp('^' + CODICI.dotPad(val, len) + '$');
    },

    findRows: function () {
      if (this.stagione || this.modello || this.articolo) {
        var filtroStagione = this.getFiltro(this.stagione, CODICI.LEN_STAGIONE),
          filtroModello = this.getFiltro(this.modello, CODICI.LEN_MODELLO),
          filtroArticolo = this.getFiltro(this.articolo, CODICI.LEN_ARTICOLO);
        this.prezzi = CODICI.findProperties(this.listino.prezzi, filtroStagione, filtroModello, filtroArticolo);
      }
    },

    save: function () {
      var self = this,
        ps = this.listino.prezzi,
        ok = this.prezzi.every(function (r) {
          var stagione = r[0], modello = r[1], articolo = r[2], vals = r[3];
          return (CODICI.isCode(stagione, CODICI.LEN_STAGIONE) &&
              CODICI.isCode(modello, CODICI.LEN_MODELLO) &&
              CODICI.isCode(articolo, CODICI.LEN_ARTICOLO) &&
              CODICI.isNumero(vals[0]) &&
              CODICI.isNumero(vals[1]) &&
              CODICI.isNumero(vals[2]));
        });
      if (ok) {
        this.prezzi.forEach(function (r) {
          var stagione = r[0], modello = r[1], articolo = r[2], vals = r[3],
            v = vals[4] ? vals : vals.slice(0, 4);
          CODICI.setProperty(ps, stagione, modello, articolo, v);
        });
        // TODO trovare un modo generale di non trasmettere campi vuoti o null.
        if (!this.listino.versioneBase) {
          delete this.listino.versioneBase;
        }
        this.SessionInfo.save(this.listino, function (res) {
          if (!self.rev) {
            self.$location.path(res.id);
          }
          self.listino._rev = res.rev;
          self.SessionInfo.notice('Salvato ' + res.id);
        });
      } else {
        this.SessionInfo.error('Valori non validi');
      }
    }
  };
}());
