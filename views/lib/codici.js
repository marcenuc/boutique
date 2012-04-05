/*global define:false*/
define(['vm', 'fs'], function(vm, fs) {
  'use strict';
  var context = {
    angular: {
      module: function() {
        return {
          factory: function(name, getter) {
            return getter();
          }
        };
      }
    }
  };
  return vm.runInNewContext(fs.readFileSync('app/js/codici.js'), context);
});
