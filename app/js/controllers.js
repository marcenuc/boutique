/*global angular: false, CODICI: false */

var Ctrl = {};

(function () {
  'use strict';

  function dotPad(str, len) {
    var s = str || '', l = len || 2;
    return s + new Array(l + 1 - s.length).join('.');
  }

  //TODO DRY copied in codici.js
  function padLeft(str, len, padder) {
    var s = str.toString(), l = len || 2, p = padder || ' ';
    return new Array(l + 1 - s.length).join(p) + s;
  }
  //TODO exported for testing... better options?
  Ctrl.utils = {
    dotPad: dotPad,
    padLeft: padLeft
  };

  // Capitalized because designed for use with angular.bind().
  function SetAziende(xhrResp) {
    this.aziende = {};
    xhrResp.rows.forEach(function (r) {
      var codice = r.id.split('_', 2)[1];
      this.aziende[codice] = codice + ' ' + r.doc.nome;
    }, this);
  }


  Ctrl.ScaricoMagazzino = function (Document) {
    this.Document = Document;

    Document.aziende(angular.bind(this, SetAziende));
    this.taglieScalarini = Document.get({ id: 'TaglieScalarini' });
    this.modelliEScalarini = Document.get({ id: 'ModelliEScalarini' });

    this.scarico = {
      rows: [{ qta: 1 }]
    };
  };
  Ctrl.ScaricoMagazzino.$inject = ['Document'];

  Ctrl.ScaricoMagazzino.prototype = {
    buildBolla: function () {
      return {
        _id: CODICI.idScaricoMagazzino(this.scarico.azienda),
        columnNames: ['barcode', 'qta'],
        causale: this.scarico.causale,
        rows: this.scarico.rows.map(function (r) {
          return [r.barcode, r.qta];
        })
      };
    },

    save: function () {
      var self, r, codes, descs, i = 0, rows = this.scarico.rows, n = rows.length, newRows = {}, qta;
      for (; i < n; i += 1) {
        r = rows[i];
        codes = CODICI.parseBarcodeAs400(r.barcode);
        if (codes) {
          qta = CODICI.parseQta(r.qta);
          if (qta[0]) {
            this.flash = { errors: [{ message: 'Quantità non valida: "' + r.qta + '"' }] };
          } else if (newRows.hasOwnProperty(r.barcode)) {
            newRows[r.barcode].qta += qta[1];
          } else {
            descs = CODICI.barcodeDescs(codes, this.taglieScalarini.descrizioniTaglie, this.modelliEScalarini.lista);
            if (descs[0]) {
              this.flash = { errors: [{ message: descs[0] + ': "' + r.barcode + '"' }] };
            } else {
              r.descrizione = descs[1].descrizione;
              r.descrizioneTaglia = descs[1].descrizioneTaglia;
              r.qta = qta[1];
              newRows[r.barcode] = r;
            }
          }
        } else {
          this.flash = { errors: [{ message: 'Codice non valido: "' + r.barcode + '"' }] };
        }
      }
      this.scarico.rows = Object.keys(newRows).sort().map(function (barcode) {
        return newRows[barcode];
      });
      if (this.doSave) {
        self = this;
        this.Document.save(this.buildBolla(), function (res) {
          self.flash = { notice: [{ message: 'Salvato ' + JSON.stringify(res) }] };
        });
      } else {
        angular.Array.add(this.scarico.rows, { qta: 1 });
      }
    }
  };

  Ctrl.RicercaBollaAs400 = function (As400, Document, userCtx) {
    this.As400 = As400;
    this.Document = Document;
    this.userCtx = userCtx;
    this.taglieScalarini = Document.get({ id: 'TaglieScalarini' });
    this.causaliAs400 = Document.get({ id: 'CausaliAs400' });
    this.intestazione = {};
    this.bollaAs400 = null;

    this.flash = userCtx.flash;
    userCtx.flash = {};
  };
  Ctrl.RicercaBollaAs400.$inject = ['As400', 'Document', 'userCtx'];

  Ctrl.RicercaBollaAs400.prototype = {
    fetch: function () {
      var self = this;
      /*
       * Save id here to be sure that the data in `bolla`
       * does match the data in `intestazione`.
       * TODO write some test for this...
       */
      this.id = this.buildId();
      this.caricata = true;

      this.Document.get({ id: this.id }, function (bolla) {
        //TODO trovare un modo di usare un widget o filtro nel template
        self.bollaCDB = bolla;
        self.bolla = {
          codiceCliente: bolla.codiceCliente,
          tipoMagazzino: bolla.tipoMagazzino,
          codiceMagazzino: bolla.codiceMagazzino,
          causale: bolla.causale,

          rows: bolla.rows.map(function (r) {
            var v = [].slice.call(CODICI.rexpBarcodeAs400.exec(r[0]), 1);
            v.push(r[1]);
            return v;
          })
        };
      }, function (status, resp) {
        if (status === 404) {
          self.caricata = false;
          self.As400.bolla(self.intestazione, function (code, dati) {
            if (code === 200) {
              self.bollaAs400 = dati;
            } else {
              self.flash = { errors: [{ message: 'Errore ' + code }] };
            }
          });
        } else {
          self.flash = { errors: [{ message: 'Errore ' + status + ': ' + JSON.stringify(resp) }] };
        }
      });
    },

    buildId: function () {
      return 'BollaAs400_' + ['data', 'numero', 'enteNumerazione', 'codiceNumerazione'].map(function (field) {
        return this.intestazione[field];
      }, this).join('_');
    },

    buildBolla: function () {
      var r0 = this.bollaAs400.rows[0],
        col = CODICI.colNamesToColIndexes(this.bollaAs400.columnNames),
        codiceCliente = r0[col.codiceCliente],
        tipoMagazzino = r0[col.tipoMagazzino],
        codiceMagazzino = r0[col.codiceMagazzino],
        causale = r0[col.causale],
        taglie = this.taglieScalarini.taglie,
        listeDescrizioni = this.taglieScalarini.listeDescrizioni,
        rows = [],
        ok = this.bollaAs400.rows.every(function (row) {
          var qta, i, barcode,
            scalarino = parseInt(row[col.scalarino], 10),
            ld = listeDescrizioni[scalarino],
            ts = taglie[scalarino];
          for (i = 0; i < 12; i += 1) {
            qta = parseInt(row[col['qta' + (i + 1)]], 10);
            if (qta > 0) {
              barcode = CODICI.codiceAs400(row[col.stagione], row[col.modello], row[col.articolo], row[col.colore], ts[ld[i]]);
              rows.push([barcode, qta]);
            }
          }
          return row[col.codiceCliente] === codiceCliente &&
            row[col.tipoMagazzino] === tipoMagazzino &&
            row[col.codiceMagazzino] === codiceMagazzino &&
            row[col.causale] === causale;
        }, this);

      return ok ? {
        _id: this.id,
        codiceCliente: codiceCliente,
        tipoMagazzino: tipoMagazzino,
        codiceMagazzino: codiceMagazzino,
        causale: [causale].concat(this.causaliAs400[tipoMagazzino][causale]),
        rows: rows
      } : null;
    },

    save: function () {
      var self = this;
      this.Document.save(this.buildBolla(), function (res) {
        self.flash = { notice: [{ message: 'Salvato ' + JSON.stringify(res) }] };
        self.fetch();
      });
    }
  };

  Ctrl.RicercaArticoli = function (Document) {
    Document.aziende(angular.bind(this, SetAziende));
    this.aziendeSelezionate = [];

    this.taglieScalarini = Document.get({ id: 'TaglieScalarini' });
    this.modelliEScalarini = Document.get({ id: 'ModelliEScalarini' });
    this.giacenze = Document.get({ id: 'Giacenze' });

    this.filtrate = [];
    this.limiteRisultati = 50;
  };
  Ctrl.RicercaArticoli.$inject = ['Document'];

  Ctrl.RicercaArticoli.prototype = {
    getFiltro: function (dontFilterTaglia) {
      var toks = [
        dotPad(this.stagione, CODICI.LEN_STAGIONE),
        dotPad(this.modello, CODICI.LEN_MODELLO),
        dotPad(this.articolo, CODICI.LEN_ARTICOLO),
        dotPad(this.colore, CODICI.LEN_COLORE),
        dotPad(dontFilterTaglia ? '' : this.taglia, CODICI.LEN_TAGLIA)
      ];
      return new RegExp('^(' + toks.join(')(') + ')$');
    },

    filtraArticoli: function () {
      var i, r, k,
        filtro = this.getFiltro(false),
        desscal, ms = this.modelliEScalarini.lista,
        nodesscal = ['-- senza descrizione --', 'X'],
        descrizioniTaglia, descrizioniTaglie = this.taglieScalarini.descrizioniTaglie,
        taglia, rows = this.giacenze.rows,
        n = rows.length, filtrate = [], count = filtrate.length, maxCount = this.limiteRisultati;

      for (i = 0; i < n && count < maxCount; i += 1) {
        r = rows[i];
        k = filtro.exec(r[0]);
        if (k && (!this.aziendeSelezionate.length || this.aziendeSelezionate.indexOf(r[2]) >= 0)) {
          desscal = ms[k[1] + k[2]] || nodesscal;
          descrizioniTaglia = descrizioniTaglie[desscal[1]];
          taglia = descrizioniTaglia ? descrizioniTaglia[k[5]] : '--';

          count = filtrate.push([
            k[1], k[2], k[3], k[4], k[5], taglia, r[1], desscal[0], this.aziende[r[2]], r[4], (r[3] ? 'PRONTO' : 'IN_PRODUZIONE')
          ]);
        }
      }

      this.filtrate = filtrate;
    },

    filtraGiacenza: function () {
      var TAGLIE_PER_SCALARINO = 12,
        withTaglia = !!this.taglia,
        colonnaTagliaFiltrata = -1,
        filtro = this.getFiltro(true),
        filtroTaglia = new RegExp('^' + dotPad(this.taglia, CODICI.LEN_TAGLIA) + '$'),
        desscal,
        ms = this.modelliEScalarini.lista,
        nn = '--',
        nodesscal = ['-- senza descrizione --', 0],
        scalarino,
        taglie = [],
        colonnaTaglia,
        colonnaTaglie = {},
        colonneTaglie = this.taglieScalarini.colonneTaglie,
        rows = this.giacenze.rows,
        i = 0,
        n = rows.length,
        filtrate = [],
        count = filtrate.length,
        maxCount = this.limiteRisultati,
        r,
        k,
        qtas,
        totals,
        macazsttm,
        currentMacazsttm,
        currentLines = {};

      function addRows() {
        if (currentMacazsttm) {
          currentMacazsttm = undefined;
          if (!withTaglia || colonnaTagliaFiltrata >= 0) {
            Object.keys(currentLines).sort().forEach(function (stagione) {
              count = filtrate.push(currentLines[stagione].concat(qtas[stagione], totals[stagione]));
            });
          }
          colonnaTagliaFiltrata = -1;
        }
      }

      function newRow(azienda) {
        qtas[k[1]] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        totals[k[1]] = qtas[k[1]][colonnaTaglia] = r[1];
        currentLines[k[1]] = [azienda, desscal[0], k[1], k[2], k[3], k[4], r[4], (r[3] ? 'PRONTO' : 'IN_PRODUZIONE'), scalarino];
      }

      for (; i < n && count < maxCount; i += 1) {
        r = rows[i];
        k = filtro.exec(r[0]);
        if (k && (!this.aziendeSelezionate.length || this.aziendeSelezionate.indexOf(r[2]) >= 0)) {
          macazsttm = r[0].slice(3, -2) + r[2] + r[3] + r[4];
          if (macazsttm === currentMacazsttm) {
            colonnaTaglia = colonnaTaglie[k[5]];
            if (withTaglia && colonnaTagliaFiltrata < 0 && filtroTaglia.test(k[5])) {
              colonnaTagliaFiltrata = colonnaTaglia;
            }
            if (!qtas[k[1]]) {
              newRow(this.aziende[r[2]]);
            } else {
              qtas[k[1]][colonnaTaglia] = r[1];
              totals[k[1]] += r[1];
            }
          } else {
            addRows();
            desscal = ms[k[1] + k[2]] || nodesscal;
            scalarino = desscal[1];
            colonnaTaglie = colonneTaglie[scalarino];

            colonnaTaglia = colonnaTaglie[k[5]];
            if (withTaglia && colonnaTagliaFiltrata < 0 && filtroTaglia.test(k[5])) {
              colonnaTagliaFiltrata = colonnaTaglia;
            }
            //TODO qtas.length === TAGLIE_PER_SCALARINO
            qtas = {};
            totals = {};
            currentMacazsttm = macazsttm;
            currentLines = {};
            newRow(this.aziende[r[2]]);
          }
        } else {
          addRows();
        }
      }
      addRows();

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

      this.filtrate = filtrate;
      this.scalarino = scalarino;
      this.taglie = taglie;
    }
  };

  Ctrl.Azienda = function ($routeParams, Document, Validator, userCtx, $location) {
    this.$routeParams = $routeParams;
    this.Document = Document;
    this.Validator = Validator;
    this.userCtx = userCtx;
    this.$location = $location;

    this.aziende = Document.aziende(this.cbAziendeLoaded);
    //FIXME i contatti non vengono salvati.
    this.azienda = { _id: Document.toAziendaId($routeParams.codice) };

    this.flash = userCtx.flash;
    userCtx.flash = {};
  };
  Ctrl.Azienda.$inject = ['$routeParams', 'Document', 'Validator', 'userCtx', '$location'];

  Ctrl.Azienda.prototype = {

    cbAziendeLoaded: function () {
      this.selectCodice(this.$routeParams.codice);
    },

    getAziendaAtIdx: function () {
      if (angular.isDefined(this.aziendaIdx)) {
        return this.aziende.rows[this.aziendaIdx].doc;
      }
    },

    isIdChanged: function () {
      var selectedAzienda = this.getAziendaAtIdx();
      return selectedAzienda && selectedAzienda._id !== this.azienda._id;
    },

    validate: function () {
      this.flash = this.Validator.check(this.azienda, this.getAziendaAtIdx());
      return this.flash.errors.length === 0;
    },

    save: function () {
      var self = this;
      if (this.isIdChanged()) {
        delete this.azienda._rev;
        delete this.aziendaIdx;
      }
      if (this.validate()) {
        this.Document.save(this.azienda, function (res) {
          var isNew = !self.azienda._rev,
            notice = { notice: [{ message: 'Salvato' }] };
          self.azienda._rev = res.rev;
          if (isNew) {
            self.userCtx.flash = notice;
            self.aziende.rows.push({ doc: angular.copy(self.azienda) });
            self.$location.path('/Azienda_' + self.Document.toCodice(self.azienda._id)).replace();
          } else {
            self.flash = notice;
            angular.copy(self.azienda, self.aziende.rows[self.aziendaIdx].doc);
          }
        });
      }
    },

    select: function (idx) {
      this.azienda = angular.copy(this.aziende.rows[idx].doc);
      this.aziendaIdx = idx;
    },

    selectCodice: function (codice) {
      var id = this.Document.toAziendaId(codice);
      return this.aziende.rows.some(function (row, idx) {
        if (row.id === id) {
          this.select(idx);
          return true;
        }
      }, this);
    }
  };
}());