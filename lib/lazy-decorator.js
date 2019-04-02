"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const $getter = Symbol('getter');
// Handler
class LazyHandler {
    constructor(key, init, write, configurable) {
        this.key = key;
        this.init = init;
        this.write = write;
        this.configurable = configurable;
    }
    getAttr(enumerable) {
        const handler = this;
        if (!this.getter)
            this.getter = function () {
                return handler.setValue(this);
            };
        if (!this.setter && this.write)
            this.setter = function (value) {
                return handler.setValue(this, value);
            };
        return {
            configurable: true,
            enumerable,
            get: this.getter,
            set: this.setter,
        };
    }
    setValue(instance, newValue = $getter) {
        const attr = findPropertyDescriptor(instance, this.key);
        let hasValue;
        let value;
        if (attr.configurable) { // Normal flow
            if (newValue === $getter)
                value = this.init.call(instance, this.key);
            else
                value = newValue;
            Object.defineProperty(instance, this.key, {
                value,
                configurable: this.configurable,
                writable: !!this.write,
                enumerable: attr.enumerable,
            });
        }
        else { // Edge flow
            let cache = LazyHandler.allCache.get(instance);
            if (cache)
                hasValue = this.key in cache;
            else
                LazyHandler.allCache.set(instance, cache = Object.create(null));
            if (newValue !== $getter)
                value = newValue;
            else if (attr.get && attr.get !== this.getter)
                value = attr.get.call(instance);
            else if (!hasValue)
                value = this.init.call(instance, this.key);
            else if (cache[this.key] === $getter)
                value = attr.value;
            else
                value = cache[this.key];
            if ((attr.set && attr.set !== this.setter) || attr.writable) {
                cache[this.key] = $getter;
                instance[this.key] = value;
            }
            else
                cache[this.key] = value;
        }
        if (!hasValue && typeof this.write === 'function')
            this.write.call(instance, value);
        return value;
    }
}
LazyHandler.allCache = new WeakMap();
// Helpers
const emptyProperty = Object.freeze({
    configurable: true,
    writable: true,
    value: undefined,
});
const emptySealedProperty = Object.freeze({
    configurable: false,
    writable: false,
    value: undefined,
});
function findPropertyDescriptor(o, key) {
    for (let p = o; p; p = Object.getPrototypeOf(p)) {
        const descriptor = Object.getOwnPropertyDescriptor(p, key);
        if (descriptor)
            return descriptor;
    }
    return Object.isExtensible(o) ? emptyProperty : emptySealedProperty;
}
function isPropertyKey(target) {
    const type = typeof target;
    return type === 'string' || type === 'number' || type === 'symbol';
}
function internalDefine(target, key, init, writable, configurable, enumerable) {
    const attr = findPropertyDescriptor(target, key);
    if (!attr.configurable)
        throw new TypeError('The property cannot reconfigure.');
    if (attr.get)
        throw new TypeError('The property already has a getter.');
    if (attr.value !== undefined)
        throw new TypeError('The property already has a default value.');
    if (enumerable === undefined)
        enumerable = attr.enumerable;
    return Object.defineProperty(target, key, new LazyHandler(key, init, writable === undefined ? true : writable, configurable === undefined ? true : configurable).getAttr(enumerable));
}
function lazyProperty(target, key, attr) {
    if (Object.isSealed(target))
        throw new TypeError('This object is sealed.');
    if (!attr || !attr.get)
        throw new TypeError('This property does not have a getter.');
    if (attr.value !== undefined)
        throw new TypeError('This property already has a default value.');
    return new LazyHandler(key, attr.get, attr.set, attr.configurable).getAttr(attr.enumerable);
}
exports.lazyProperty = lazyProperty;
// tslint:disable-next-line:no-namespace
(function (lazyProperty) {
    /**
     * Transform a dynamic property to lazy initializer.
     * Alternative method for those environment which does not support decorators.
     * @param target The target class to work with.
     * @param keys The key of the properties would like to transform.
     *
     * @example
     * class Schrodinger {
     *   get cat() { return Math.random() > 0.5; }
     *   // Setter will be called when the value has been assigned first time.
     *   // If the setter is not defined, the property will be read-only.
     *   set cat(value) {
     *     console.log(`It is ${value ? 'alive' : 'dead'} now!`);
     *     assert.strictEqual(value, this.cat);
     *   }
     * }
     * lazyProperty.transform(Schrodinger, 'cat');
     */
    function transform(target, ...keys) {
        const { prototype } = target;
        for (const key of keys)
            Object.defineProperty(prototype, key, lazyProperty(prototype, key, findPropertyDescriptor(prototype, key)));
        return target;
    }
    lazyProperty.transform = transform;
    function define(target, keyOrDefs, sInit, sWri, sCfg, sEnum) {
        if (Object.isSealed(target))
            throw new TypeError('The object is sealed.');
        if (isPropertyKey(keyOrDefs))
            return internalDefine(target, keyOrDefs, sInit, sWri, sCfg, sEnum);
        for (const [key, defOrInit] of Object.entries(keyOrDefs)) {
            if (typeof defOrInit === 'function') {
                internalDefine(target, key, defOrInit);
                continue;
            }
            const { init, writable, configurable, enumerable } = defOrInit;
            internalDefine(target, key, init, writable, configurable, enumerable);
        }
        return target;
    }
    lazyProperty.define = define;
    function require(requireFn, path, key, container, alias = key) {
        return define(container, alias, _ => requireFn(path)[key]);
    }
    lazyProperty.require = require;
})(lazyProperty = exports.lazyProperty || (exports.lazyProperty = {}));
//# sourceMappingURL=lazy-decorator.js.map