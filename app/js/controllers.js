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

  //TODO DRY copied in lib/as400.js
  function colNamesToColIndexes(columnNames) {
    var col = {}, i = 0, n = columnNames.length;
    for (; i < n; i += 1) {
      col[columnNames[i]] = i;
    }
    return col;
  }
  //TODO exported for testing... better options?
  Ctrl.utils = {
    dotPad: dotPad,
    padLeft: padLeft,
    colNamesToColIndexes: colNamesToColIndexes
  };


  Ctrl.RicercaBollaAs400 = function (As400, Document, userCtx) {
    this.As400 = As400;
    this.Document = Document;
    this.userCtx = userCtx;
    this.scalarini = Document.get({ id: 'Scalarini' });
    this.causaliAs400 = Document.get({ id: 'CausaliAs400' });
    this.intestazione = {};
    this.bollaAs400 = null;

    this.flash = userCtx.flash;
    userCtx.flash = {};
  };
  Ctrl.RicercaBollaAs400.$inject = ['As400', 'Document', 'userCtx'];

  Ctrl.RicercaBollaAs400.prototype = {
    fetch: function () {
      var self = this,
        rexpBarcodeAs400 = /^(\d{3})(\d{5})(\d{4})(\d{4})(\d{2})$/;
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
            var v = [].slice.call(rexpBarcodeAs400.exec(r[0]), 1);
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
        col = colNamesToColIndexes(this.bollaAs400.columnNames),
        codiceCliente = r0[col.codiceCliente],
        tipoMagazzino = r0[col.tipoMagazzino],
        codiceMagazzino = r0[col.codiceMagazzino],
        causale = r0[col.causale],
        posizioniCodiciScalarino = this.scalarini.posizioniCodici,
        rows = [],
        ok = this.bollaAs400.rows.every(function (row) {
          var qta, i, barcode, codiceTaglia,
            pcs = posizioniCodiciScalarino[parseInt(row[col.scalarino], 10)];
          for (i = 0; i < 12; i += 1) {
            qta = parseInt(row[col['qta' + (i + 1)]], 10);
            if (qta > 0) {
              codiceTaglia = padLeft(pcs[i], 2, '0');
              barcode = row[col.stagione] + row[col.modello] + row[col.articolo] + row[col.colore] + codiceTaglia;
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
    Document.aziende(this.setAziende);
    this.aziendeSelezionate = [];

    this.taglieScalarini = Document.get({ id: 'TaglieScalarini' });
    this.modelliEScalarini = Document.get({ id: 'ModelliEScalarini' });
    this.giacenze = Document.get({ id: 'Giacenze' });

    this.filtrate = [];
    this.limiteRisultati = 50;
  };
  Ctrl.RicercaArticoli.$inject = ['Document'];

  Ctrl.RicercaArticoli.prototype = {
    setAziende: function (xhrResp) {
      this.aziende = {};
      xhrResp.rows.forEach(function (r) {
        var codice = r.id.split('_', 2)[1];
        this.aziende[codice] = codice + ' ' + r.doc.nome;
      }, this);
    },

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
        total,
        smacazsttm,
        currentSmacazsttm,
        currentLine;

      for (; i < n && count < maxCount; i += 1) {
        r = rows[i];
        k = filtro.exec(r[0]);
        if (k && (!this.aziendeSelezionate.length || this.aziendeSelezionate.indexOf(r[2]) >= 0)) {
          smacazsttm = r[0].slice(0, -2) + r[2] + r[3] + r[4];
          if (smacazsttm === currentSmacazsttm) {
            colonnaTaglia = colonnaTaglie[k[5]];
            if (withTaglia && colonnaTagliaFiltrata < 0 && filtroTaglia.test(k[5])) {
              colonnaTagliaFiltrata = colonnaTaglia;
            }
            qtas[colonnaTaglia] = r[1];
            total += r[1];
          } else {
            if (currentSmacazsttm) {
              currentSmacazsttm = undefined;
              if (!withTaglia || colonnaTagliaFiltrata >= 0) {
                count = filtrate.push(currentLine.concat(qtas, total));
              }
              colonnaTagliaFiltrata = -1;
            }
            desscal = ms[k[1] + k[2]] || nodesscal;
            scalarino = desscal[1];
            colonnaTaglie = colonneTaglie[scalarino];

            colonnaTaglia = colonnaTaglie[k[5]];
            if (withTaglia && colonnaTagliaFiltrata < 0 && filtroTaglia.test(k[5])) {
              colonnaTagliaFiltrata = colonnaTaglia;
            }
            //TODO qtas.length === TAGLIE_PER_SCALARINO
            qtas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            total = qtas[colonnaTaglia] = r[1];
            currentSmacazsttm = smacazsttm;
            currentLine = [this.aziende[r[2]], desscal[0], k[1], k[2], k[3], k[4], r[4], (r[3] ? 'PRONTO' : 'IN_PRODUZIONE'), scalarino];
          }
        } else if (currentSmacazsttm) {
          currentSmacazsttm = undefined;
          if (!withTaglia || colonnaTagliaFiltrata >= 0) {
            count = filtrate.push(currentLine.concat(qtas, total));
          }
          colonnaTagliaFiltrata = -1;
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