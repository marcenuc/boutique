/*global angular: false */

var Ctrl = {};

(function () {
  'use strict';

  Ctrl.Bolla = function (As400, userCtx) {
    var self = this;

    this.flash = userCtx.flash;
    userCtx.flash = {};
    this.intestazione = {};
    this.bolla = null;

    this.fetch = function () {
      As400.bolla(self.intestazione, function (code, dati) {
        if (code === 200) {
          self.bolla = dati;
        } else {
          self.flash = { errors: [{ message: 'Errore ' + code }] };
        }
      });
    };
  };
  Ctrl.Bolla.$inject = ['As400', 'userCtx'];


  function dotPad(str, len) {
    var s = str || '', l = len || 2;
    return s + new Array(l + 1 - s.length).join('.');
  }

  function padLeft(str, len, padder) {
    var s = str.toString(), l = len || 2, p = padder || '0';
    return new Array(l + 1 - s.length).join(p) + s;
  }
  //TODO exported for testing... better options?
  Ctrl.utils = {
    dotPad: dotPad,
    padLeft: padLeft
  };


  Ctrl.RicercaArticoli = function (Document) {
    Document.aziende(this.setAziende);
    this.aziendeSelezionate = [];

    this.scalarini = Document.get({ id: 'scalarini' });
    this.modelli_e_scalarini = Document.get({ id: 'modelli_e_scalarini' });
    this.inventari = Document.get({ id: 'inventari' });

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
      var i, n, r, k, count,
        filtro = this.getFiltro(),
        desscal, ms = this.modelli_e_scalarini.lista,
        nodesscal = ['-- senza descrizione --', 'X'],
        scal, scalarini = this.scalarini.codici,
        taglia, rows = this.inventari.inventario;

      this.filtrate = [];

      for (i = 0, n = rows.length, count = 0; i < n && count < this.limiteRisultati; i += 1) {
        r = rows[i];
        k = filtro.exec(r[0]);
        if (k && (!this.aziendeSelezionate.length || this.aziendeSelezionate.indexOf(r[2]) >= 0)) {
          desscal = ms[k[1] + k[2]] || nodesscal;
          scal = scalarini[desscal[1]];
          taglia = scal ? scal[k[5]] : '..';

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
        desscal, ms = this.modelli_e_scalarini.lista,
        nn = '--',
        nodesscal = ['-- senza descrizione --', 'X'],
        rows = this.inventari.inventario,
        n = rows.length, count = 0,
        colonneCodiciTaglie = this.scalarini.posizione_codici,
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
            k = this.scalarini.posizioni_codici[scalarino][i];
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
            self.$location.path('/azienda/' + self.Document.toCodice(self.azienda._id)).replace();
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