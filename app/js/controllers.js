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
  function SetAziende(callback, xhrResp) {
    this.aziende = {};
    xhrResp.rows.forEach(function (r) {
      var codice = r.id.split('_', 2)[1];
      this.aziende[codice] = codice + ' ' + r.doc.nome;
    }, this);
    if (callback) {
      callback();
    }
  }


  Ctrl.MovimentoMagazzino = function ($routeParams, userCtx, $location, Document) {
    var self = this, codes = ($routeParams.codice || '').split('_'), docCount = 3;
    // TODO DRY usare CODICI per estrarre i dati dal codice
    this.origine = codes[0];
    this.data = codes[1];
    this.numero = codes[2];
    this.$location = $location;
    this.Document = Document;

    this.causali = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO;

    // TODO Trovare un modo migliore di chiamare una funzione quando il modello è pronto.
    function doFind() {
      docCount -= 1;
      if (docCount === 0 && $routeParams.codice) {
        self.find();
      }
    }

    Document.aziende(angular.bind(this, SetAziende, doFind));
    this.taglieScalarini = Document.get({ id: 'TaglieScalarini' }, doFind);
    this.modelliEScalarini = Document.get({ id: 'ModelliEScalarini' }, doFind);

    this.causale = 0;
    this.rows = [{ qta: 1 }];

    this.flash = userCtx.flash;
    userCtx.flash = {};
  };
  Ctrl.MovimentoMagazzino.$inject = ['$routeParams', 'userCtx', '$location', 'Document'];

  Ctrl.MovimentoMagazzino.prototype = {
    //TODO DRY condividere questa funzione tra i controller
    error: function (message, level) {
      this.flash = {};
      this.flash[level || 'errors'] = [{ message: message }];
    },

    submit: function () {
      this[this.action]();
    },

    getYear: function () {
      return this.data ? this.data.substring(0, 4) : null;
    },

    buildBolla: function () {
      var doc = {
        _id: CODICI.idMovimentoMagazzino(this.origine, this.getYear(), this.numero),
        data: this.data,
        columnNames: ['barcode', 'qta'],
        causale: this.causali[this.causale],
        rows: this.rows.map(function (r) {
          return [r.barcode, r.qta];
        })
      };
      if (this.accodato) {
        doc.accodato = this.accodato;
      }
      if (this.destinazione) {
        doc.destinazione = this.destinazione;
      }
      if (this.riferimento) {
        doc.riferimento = this.riferimento;
      }
      if (this.id === doc._id && this.rev) {
        doc._rev = this.rev;
      } else {
        delete this.rev;
      }
      return doc;
    },

    findCausale: function (causale) {
      var i = 0, n = this.causali.length;
      for (; i < n; i += 1) {
        if (causale[0] === this.causali[i][0]) {
          return i;
        }
      }
    },

    buildModel: function (bolla) {
      // TODO questo non dovrebbe servire perché i dati nell'id sono quelli della ricerca.
      // Per ora lo lascio.
      var parsedId = CODICI.parseIdMovimentoMagazzino(bolla._id),
        qtaTotale = 0;
      if (!parsedId) {
        return this.error('Id documento non valido');
      }
      this.origine = parsedId.origine;
      this.numero = parsedId.numero;
      this.data = bolla.data;
      this.destinazione = bolla.destinazione;
      this.riferimento = bolla.riferimento;
      this.causale = this.findCausale(bolla.causale);
      //TODO DRY questo codice è duplicato in save()
      this.rows = bolla.rows.map(function (row) {
        var descs,
          r = { barcode: row[0] },
          codes = CODICI.parseBarcodeAs400(r.barcode),
          msg;
        if (!codes) {
          msg = 'Codice non valido: "' + r.barcode + '"';
          this.error(msg);
          return msg;
        }
        descs = CODICI.descrizioniModello(codes.stagione, codes.modello, codes.taglia, this.taglieScalarini.descrizioniTaglie, this.modelliEScalarini.lista);
        if (descs[0]) {
          msg = descs[0] + ': "' + r.barcode + '"';
          this.error(msg);
          return msg;
        }
        r.descrizione = descs[1].descrizione;
        r.descrizioneTaglia = descs[1].descrizioneTaglia;
        r.qta = row[1];
        qtaTotale += r.qta;
        r.codes = codes;
        return r;
      }, this);
      this.qtaTotale = qtaTotale;
      this.rows.push({ qta: 1 });
      this.accodato = bolla.accodato;
      this.id = bolla._id;
      this.rev = bolla._rev;
    },

    find: function () {
      var self = this;
      // Avoid unexpected writes on search.
      delete this.rev;
      delete this.destinazione;
      delete this.accodato;
      this.rows = [{ qta: 1 }];
      this.Document.get({ id: CODICI.idMovimentoMagazzino(this.origine, this.getYear(), this.numero) }, function (bolla) {
        self.buildModel(bolla);
        self.$location.path(self.id).replace();
      }, function (status, resp) {
        if (status === 404) {
          return self.error('Non trovato');
        }
        self.error(status + JSON.stringify(resp));
      });
    },

    save: function () {
      var self, r, codes, descs, i = 0, rows = this.rows, n = rows.length, newRows = [], qta, qtaTotale = 0;
      for (; i < n; i += 1) {
        r = rows[i];
        if (r.barcode) {
          qta = CODICI.parseQta(r.qta);
          if (qta[0]) {
            return this.error('Quantità non valida: "' + r.qta + '"');
          }
          //TODO DRY questo codice è duplicato in buildModel()
          codes = CODICI.parseBarcodeAs400(r.barcode);
          if (!codes) {
            return this.error('Codice non valido: "' + r.barcode + '"');
          }
          descs = CODICI.descrizioniModello(codes.stagione, codes.modello, codes.taglia, this.taglieScalarini.descrizioniTaglie, this.modelliEScalarini.lista);
          if (descs[0]) {
            return this.error(descs[0] + ': "' + r.barcode + '"');
          }
          r.descrizione = descs[1].descrizione;
          r.descrizioneTaglia = descs[1].descrizioneTaglia;
          r.qta = qta[1];
          qtaTotale += r.qta;
          r.codes = codes;
          newRows.push(r);
        }
      }
      this.rows = newRows;
      this.qtaTotale = qtaTotale;
      self = this;
      this.Document.save(this.buildBolla(), function (res) {
        if (!self.rev) {
          self.$location.path(res.id).replace();
        }
        self.rev = res.rev;
        self.error('Salvato ' + res.id, 'notices');
      });
      angular.Array.add(this.rows, { qta: 1 });
    }
  };

  Ctrl.RicercaBollaAs400 = function (As400, Document, CdbView, userCtx, $location) {
    this.As400 = As400;
    this.Document = Document;
    this.CdbView = CdbView;
    this.userCtx = userCtx;
    this.$location = $location;

    Document.aziende(angular.bind(this, SetAziende, null));
    this.taglieScalarini = Document.get({ id: 'TaglieScalarini' });
    this.causaliAs400 = Document.get({ id: 'CausaliAs400' });
    // TODO probabilmente questi non servono perché impliciti per AngularJS
    //this.intestazione = {};
    //this.movimentoMagazzino = {};
    //this.bollaAs400 = null;
    this.causali = CODICI.CAUSALI_MOVIMENTO_MAGAZZINO;

    this.flash = userCtx.flash;
    userCtx.flash = {};
  };
  Ctrl.RicercaBollaAs400.$inject = ['As400', 'Document', 'CdbView', 'userCtx', '$location'];

  Ctrl.RicercaBollaAs400.prototype = {

    // TODO DRY copiata da MovimentoMagazzino
    getYear: function (data) {
      return data ? data.substring(0, 4) : null;
    },

    fetch: function () {
      var self = this;
      /*
       * Save id here to be sure that the data in `bolla`
       * does match the data in `intestazione`.
       * TODO write some test for this...
       */
      this.id = this.buildId();

      function cercaBollaAs400() {
        self.As400.bolla(self.intestazione, function (code, dati) {
          if (code === 200) {
            self.bollaAs400 = dati;
            self.setMovimentoMagazzino();
          } else {
            self.flash = { errors: [{ message: 'Errore ' + code }] };
          }
        });
      }

      this.CdbView.riferimentoMovimentoMagazzino(this.id, function (resp) {
        var riferimento = resp.rows[0];
        if (!riferimento) {
          return cercaBollaAs400();
        }
        self.userCtx.flash = { notices: [{ message: 'Bolla già caricata su Boutique' }] };
        self.$location.path(riferimento.id).replace();
      }, function (status, resp) {
        self.flash = { errors: [{ message: 'Errore ' + status + ': ' + JSON.stringify(resp) }] };
      });
    },

    buildId: function () {
      var d = this.intestazione;
      return CODICI.idBollaAs400(d.data, d.numero, d.enteNumerazione, d.codiceNumerazione);
    },

    findCausale: function (causaleAs400) {
      var i = 0, n = this.causali.length, c;
      for (; i < n; i += 1) {
        c = this.causali[i];
        if (c[0] === causaleAs400) {
          return i;
        }
      }
      return 0;
    },

    setMovimentoMagazzino: function () {
      var r0 = this.bollaAs400.rows[0],
        col = CODICI.colNamesToColIndexes(this.bollaAs400.columnNames),
        codiceCliente = r0[col.codiceCliente],
        tipoMagazzino = r0[col.tipoMagazzino],
        causale = r0[col.causale];

      this.movimentoMagazzino = {
        origine: codiceCliente,
        causale: this.findCausale(this.causaliAs400[tipoMagazzino][causale]),
        data: CODICI.newYyyyMmDdDate()
      };
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
        }, this),
        mm = this.movimentoMagazzino,
        doc = {
          _id: CODICI.idMovimentoMagazzino(mm.origine, this.getYear(mm.data), mm.numero),
          riferimento: this.id,
          data: mm.data,
          columnNames: ['barcode', 'qta'],
          causale: this.causali[mm.causale],
          rows: rows
        };
      if (mm.destinazione) {
        doc.destinazione = mm.destinazione;
      }

      return (ok && doc._id && doc.riferimento) ? doc : null;
    },

    save: function () {
      var self = this;
      this.Document.save(this.buildBolla(), function (res) {
        self.flash = { notices: [{ message: 'Salvato ' + res.id }] };
        self.$location.path(res.id).replace();
      });
    }
  };

  Ctrl.RicercaArticoli = function (Document) {
    Document.aziende(angular.bind(this, SetAziende, null));
    this.aziendeSelezionate = [];

    this.taglieScalarini = Document.get({ id: 'TaglieScalarini' });
    this.modelliEScalarini = Document.get({ id: 'ModelliEScalarini' });
    this.giacenze = Document.get({ id: 'Giacenze' });

    this.filtrate = [];
    this.limiteRisultati = 50;
  };
  Ctrl.RicercaArticoli.$inject = ['Document'];

  Ctrl.RicercaArticoli.prototype = {
    getFiltroSmacAz: function () {
      var toks = ['^',
        dotPad(this.stagione, CODICI.LEN_STAGIONE),
        dotPad(this.modello, CODICI.LEN_MODELLO),
        dotPad(this.articolo, CODICI.LEN_ARTICOLO),
        dotPad(this.colore, CODICI.LEN_COLORE),
        this.aziendeSelezionate.length ? '(?:' + this.aziendeSelezionate.join('|') + ')' : '\\d{6}',
        '$'];
      return new RegExp(toks.join(''));
    },

    getFiltroTaglia: function () {
      return new RegExp('^' + (this.descrizioneTaglia || '.{1,' + CODICI.LEN_DESCRIZIONE_TAGLIA + '}') + '$', 'i');
    },

    filtraGiacenza: function () {
      var giacenze, taglia, qta, r, riga,
        scalarino, taglie = [], nn = '--', TAGLIE_PER_SCALARINO = 12,
        rows = this.giacenze.rows, i = 0, n = rows.length,
        count = 0, filtrate = [], maxCount = this.limiteRisultati,
        desscal, ms = this.modelliEScalarini.lista,
        nodesscal = ['-- senza descrizione --', 0],
        colonnaTaglia, colonneTaglie = this.taglieScalarini.colonneTaglie,
        descrizioniTaglia, descrizioniTaglie = this.taglieScalarini.descrizioniTaglie,
        accoda, filtroSmacAz = this.getFiltroSmacAz(), filtroTaglia = this.getFiltroTaglia(),
        totaleRiga, totaleRighe = 0, totaliColonna = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

      for (; i < n && count < maxCount; i += 1) {
        r = rows[i];
        if (filtroSmacAz.test(r.slice(0, 5).join(''))) {
          accoda = false;
          totaleRiga = 0;
          desscal = ms[r[0] + r[1]] || nodesscal;
          scalarino = desscal[1];
          descrizioniTaglia = descrizioniTaglie[scalarino];
          giacenze = r[7];
          riga = [r[4], desscal[0], r[0], r[1], r[2], r[3], r[6], (r[5] ? 'IN PRODUZIONE' : 'PRONTO'), scalarino, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          for (taglia in giacenze) {
            if (giacenze.hasOwnProperty(taglia)) {
              if (filtroTaglia.test(descrizioniTaglia[taglia])) {
                accoda = true;
                qta = giacenze[taglia];
                totaleRiga += qta;
                colonnaTaglia = colonneTaglie[scalarino][taglia];
                //TODO '9' è un numero magico
                riga[9 + colonnaTaglia] = qta;
                totaliColonna[colonnaTaglia] += qta;
              }
            }
          }
          if (accoda) {
            riga.push(totaleRiga);
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
    this.azienda = { _id: CODICI.idAzienda($routeParams.codice) };

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
            notices = { notices: [{ message: 'Salvato' }] };
          self.azienda._rev = res.rev;
          if (isNew) {
            self.userCtx.flash = notices;
            self.aziende.rows.push({ doc: angular.copy(self.azienda) });
            self.$location.path('/' + self.azienda._id).replace();
          } else {
            self.flash = notices;
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
      var id = CODICI.idAzienda(codice);
      return this.aziende.rows.some(function (row, idx) {
        if (row.id === id) {
          this.select(idx);
          return true;
        }
      }, this);
    }
  };

  Ctrl.Listino = function ($routeParams, Document, Validator, userCtx, $location) {
    this.$routeParams = $routeParams;
    this.Document = Document;
    this.Validator = Validator;
    this.userCtx = userCtx;
    this.$location = $location;

    this.prezzi = [];
    if ($routeParams.codice) {
      this.fetch($routeParams.codice);
    }
    this.flash = userCtx.flash;
    userCtx.flash = {};
  };
  Ctrl.Listino.$inject = ['$routeParams', 'Document', 'Validator', 'userCtx', '$location'];

  Ctrl.Listino.prototype = {
    //TODO DRY condividere questa funzione tra i controller
    error: function (message, level) {
      this.flash = {};
      this.flash[level || 'errors'] = [{ message: message }];
    },

    fetch: function (codice) {
      var self = this,
        // TODO DRY usare CODICI.idListino o altro.
        id = codice ? 'Listino_' + codice : CODICI.idListino(this.versione, this.dataUso);
      this.Document.get({ id: id }, function (listino) {
        if (codice) {
          self.listino = listino;
        } else {
          self.$location.path(listino._id).replace();
        }
      }, function (status, resp) {
        if (status === 404) {
          return self.error('Non trovato');
        }
        self.error(status + JSON.stringify(resp));
      });
    },

    getFiltro: function (val, len) {
      return new RegExp('^' + dotPad(val, len) + '$');
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
        this.Document.save(this.listino, function (res) {
          if (!self.rev) {
            self.$location.path(res.id).replace();
          }
          self.listino._rev = res.rev;
          self.error('Salvato ' + res.id, 'notices');
        });
      } else {
        this.error('Valori non validi', 'errors');
      }
    }
  };
}());