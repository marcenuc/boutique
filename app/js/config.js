var CONFIG;
/*global define: false, exports: false*/
if (typeof define === 'function') {
  CONFIG = {};
  define(CONFIG);
} else if (typeof exports === 'object') {
  CONFIG = exports;
} else {
  CONFIG = {};
}
CONFIG.db = 'boutique_db';
CONFIG.designDoc = 'boutique_db';
