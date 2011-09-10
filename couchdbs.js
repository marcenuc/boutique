exports.boutique_db = {
    '_security': {
        "admins": { "names": ["boutique"], "roles":[] },
        "readers": { "names": [], "roles": ["azienda"] }
    },
    '_design/boutique_db': {
        views: {
            all: {
                map: function (doc) {
                    emit(doc._id, 1);
                }
            }
        }
    },
    'azienda_000001': {
        "tipo" : "MAGAZZINO",
        "nome" : "Magazzino Disponibile-Tailor S.r.l.",
        "indirizzo" : "S.S. 275 km. 21,4 Lucugnano",
        "comune" : "Tricase (LE) ITALY",
        "provincia" : "LE",
        "cap" : "73030",
        "contatti" : [ "0833/706311", "0833/706322 (fax)" ]
    },
    'azienda_000002' : {
        "tipo" : "NEGOZIO",
        "contatti" : [ "0832 332401" ],
        "nome" : "Negozio Lecce - Tailor S.r.l.",
        "indirizzo" : "Via Liborio Romano 73",
        "comune" : "Lecce",
        "provincia" : "LE",
        "cap" : "73100"
    }
};