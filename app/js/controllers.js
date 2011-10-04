/*global angular: false */

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

    this.scalarini = Document.get({ id: 'Scalarini' });
    this.modelliEScalarini = Document.get({ id: 'ModelliEScalarini' });
    this.inventari = Document.get({ id: 'Inventari' });

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

    getFiltro: function () {
      return new RegExp("^(" + dotPad(this.stagione, 3) + ')(' + dotPad(this.modello, 5) + ')(' + dotPad(this.articolo, 4) + ')(' + dotPad(this.colore, 4) + ')(' + dotPad(this.taglia, 2) + ')(' + ")$");
    },

    filtraArticoli: function () {
      var i, r, k,
        filtro = this.getFiltro(),
        desscal, ms = this.modelliEScalarini.lista,
        nodesscal = ['-- senza descrizione --', 'X'],
        scal, scalarini = this.scalarini.codici,
        taglia, rows = this.inventari.inventario,
        n = rows.length, count = 0;

      this.filtrate = [];

      for (i = 0; i < n && count < this.limiteRisultati; i += 1) {
        r = rows[i];
        k = filtro.exec(r[0]);
        if (k && (!this.aziendeSelezionate.length || this.aziendeSelezionate.indexOf(r[2]) >= 0)) {
          desscal = ms[k[1] + k[2]] || nodesscal;
          scal = scalarini[desscal[1]];
          taglia = scal ? scal[k[5]] : '--';

          this.filtrate.push([
            k[1], k[2], k[3], k[4], k[5], taglia, r[1], desscal[0], this.aziende[r[2]], (r[3] ? 'PRONTO' : 'IN_PRODUZIONE')
          ]);
          count += 1;
        }
      }
    },

    filtraGiacenza: function () {
      var riga, i, r, k, taglie = new Array(13), qtas, righe = {},
        filtro = this.getFiltro(),
        desscal, ms = this.modelliEScalarini.lista,
        nn = '--',
        nodesscal = ['-- senza descrizione --', 'X'],
        rows = this.inventari.inventario,
        n = rows.length, count = 0,
        colonneCodiciTaglie = this.scalarini.posizioneCodici,
        colonnaTaglia, smacazst, smacazstFiltrati = {},
        scalarino = nn;

      this.filtrate = [];

      for (i = 0; i < n; i += 1) {
        r = rows[i];
        k = filtro.exec(r[0]);
        if (k && (!this.aziendeSelezionate.length || this.aziendeSelezionate.indexOf(r[2]) >= 0)) {
          desscal = ms[k[1] + k[2]] || nodesscal;
          colonnaTaglia = colonneCodiciTaglie[desscal[1]][k[5]];
          if (typeof colonnaTaglia === 'undefined') {
            colonnaTaglia = 12;
          }
          smacazst = r[0].slice(0, -2) + r[2] + r[3];
          if (righe.hasOwnProperty(smacazst)) {
            riga = righe[smacazst];
            riga[8 + colonnaTaglia] += r[1];
            riga[riga.length - 1] += r[1];
          } else {
            qtas = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            qtas[colonnaTaglia] = r[1];
            righe[smacazst] = [this.aziende[r[2]], desscal[0], k[1], k[2], k[3], k[4], (r[3] ? 'PRONTO' : 'IN_PRODUZIONE'), desscal[1]].concat(qtas, r[1]);
          }
        }
      }
      for (i = 0; i < n && count < this.limiteRisultati; i += 1) {
        r = rows[i];
        k = filtro.exec(r[0]);
        if (k && (!this.aziendeSelezionate.length || this.aziendeSelezionate.indexOf(r[2]) >= 0)) {
          smacazst = r[0].slice(0, -2) + r[2] + r[3];
          if (!smacazstFiltrati.hasOwnProperty(smacazst)) {
            smacazstFiltrati[smacazst] = true;
            this.filtrate.push(righe[smacazst]);
            count += 1;
          }
        }
      }
      r = this.filtrate[0];
      if (r) {
        n = taglie.length;
        desscal = ms[r[2] + r[3]];
        if (desscal) {
          scalarino = desscal[1];
          for (i = 0; i < n; i += 1) {
            k = this.scalarini.posizioniCodici[scalarino][i];
            taglie[i] = typeof k === 'undefined' ? nn : this.scalarini.codici[scalarino][k];
          }
        } else {
          for (i = 0; i < n; i += 1) {
            taglie[i] = nn;
          }
        }
      }

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