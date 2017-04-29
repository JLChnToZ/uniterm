(function(root, factory) {
  if(typeof define === 'function' && define.amd) {
    define(['exports', '../walkthroughtree'], function(exports, walkThroughTree) {
    factory((root.constructDom = exports), walkThroughTree);
    });
  } else if(typeof exports === 'object' && typeof exports.nodeName !== 'string') {
    factory(exports, require('../walkthroughtree'));
  } else {
    factory((root.constructDom = {}), root.walkThroughTree);
  }
}(this, function(exports, walkthroughtree) {
  'use strict';
  const { walkThroughTree } = walkthroughtree;

  const options = { horizontal: true, firstResult: true };
  const eventKeyPattern = /^on(.+)$/;

  const attrHandlers = [
    function(element, key, value) {
      return (key in staticAttrHandlers) &&
        staticAttrHandlers[key].call(this, element, value);
    },
    function(element, key, value) {
      if(!(key in element))
        return false;
      element[key] = value;
      return true;
    },
    function(element, key, evt) {
      const eventKey = eventKeyPattern.exec(key);
      switch(eventKey && typeof evt) {
        case 'object': {
          if(typeof evt.fn !== 'function')
            return false;
          element.addEventListener(eventKey[1], evt.fn, evt);
          return true;
        }
        case 'function': {
          element.addEventListener(eventKey[1], evt);
          return true;
        }
      }
      return false;
    },
    function(element, key, value) {
      element.setAttribute(key, value);
      return true;
    }
  ];

  const staticAttrHandlers = {
    tagName() { return true; },
    style(element, style) {
      const declaration = element.style;
      if(typeof style === 'object') {
        for(let name in style) {
          const value = style[name];
          if(typeof style[name] === 'object')
            declaration.setProperty(name, value.value, value.priority);
          else
            declaration.setProperty(name, value);
        }
        return true;
      }
      if(style) declaration.cssText = style;
      return true;
    },
    classes(element, classes) {
      if(Array.isArray(classes))
        DOMTokenList.prototype.add.apply(element.classList, classes);
      else
        element.className = classes;
      return true;
    },
    data(element, data) {
      if(typeof data !== 'object')
        return false;
      Object.assign(element.dataset, data);
      return true;
    },
    children(element, children) {
      (Array.isArray(children) ? children : [children])
      .forEach(child => this.next(child, element));
      return true;
    }
  };

  function append(node, child) {
    if(node) node.appendChild(child);
    return child;
  }

  function handler(attr, node) {
    if(!attr) return;

    if(attr instanceof Node)
      return append(node, attr);

    if(typeof attr === 'string')
      return append(node, document.createTextNode(attr));

    const element = document.createElement(attr.tagName);
    Object.entries(attr)
    .forEach(([key, value]) =>
      attrHandlers.findIndex(fn =>
        fn.call(this, element, key, value)
      )
    );
    return append(node, element);
  }

  exports.constructDom = function constructDom(tagName, attr) {
    if(typeof attr !== 'object')
      attr = (typeof tagName === 'object') ? tagName : { tagName };
    else if(!('tagName' in attr))
      attr.tagName = tagName;
    return walkThroughTree(handler, options, attr);
  };
}));
