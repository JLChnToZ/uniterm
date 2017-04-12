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

module.exports = { walkThroughTree, walkThroughTreeGen };
