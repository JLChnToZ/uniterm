(function(root, factory) {
  if(typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      factory(root.walkThroughTree = exports);
    });
  } else if (typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports);
  } else {
    factory(root.walkThroughTree = {});
  }
}(this, function(exports) {
  'use strict';
  function walkThroughTree(fn, options, ...args) {
    options = options || {};
    let first = true, result;
    for(const current of walkThroughTreeGen(fn, options, ...args))
      if(first || !options.firstResult) {
        result = current;
        first = false;
      }
    return result;
  }

  function* walkThroughTreeGen(fn, options, ...args) {
    options = options || {};
    const pushFn = Array.prototype[options.horizontal ? 'unshift' : 'push'];
    const tokens = [args], nextTokens = [];
    const scope = {
      next(...args) { nextTokens.push(args); }
    };
    while(tokens.length) {
      nextTokens.length = 0;
      yield fn.apply(scope, tokens.shift());
      pushFn.apply(tokens, nextTokens);
    }
  }

  Object.assign(exports, { walkThroughTree, walkThroughTreeGen });
}));
