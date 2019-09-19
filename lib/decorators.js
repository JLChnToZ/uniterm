"use strict";
// tslint:disable:variable-name
// tslint:disable:ban-types
// tslint:disable:no-shadowed-variable
Object.defineProperty(exports, "__esModule", { value: true });
function readonly(_, _k, descriptor) {
    if (descriptor.get || descriptor.set)
        delete descriptor.set;
    else
        descriptor.writable = false;
    return descriptor;
}
exports.readonly = readonly;
function writable(_, _k, descriptor) {
    if (!descriptor.get && !descriptor.set)
        descriptor.writable = true;
    return descriptor;
}
exports.writable = writable;
function seal(_, _k, descriptor) {
    descriptor.configurable = false;
    return descriptor;
}
exports.seal = seal;
function configurable(_, _k, descriptor) {
    descriptor.configurable = true;
    return descriptor;
}
exports.configurable = configurable;
function hide(_, _k, descriptor) {
    descriptor.enumerable = false;
    return descriptor;
}
exports.hide = hide;
function enumerable(_, _k, descriptor) {
    descriptor.enumerable = true;
    return descriptor;
}
exports.enumerable = enumerable;
const cacheConstructArgs = [
    2,
    Reflect.construct,
    [WeakMap, []],
];
function wrap(check, bake) {
    return (_, _k, descriptor) => {
        if (descriptor.get || descriptor.set) {
            const { get: srcGet, set: srcSet } = descriptor;
            const values = new WeakMap();
            if (srcGet)
                descriptor.get = function () {
                    const value = srcGet.call(this);
                    if (!check(value))
                        return value;
                    const map = getOrCreate(values, this, createFilledArray, cacheConstructArgs);
                    let baked = map[0].get(value);
                    if (!baked) {
                        baked = bake(value, this);
                        map[0].set(value, baked);
                        map[1].set(baked, value);
                    }
                    return baked;
                };
            if (srcSet)
                descriptor.set = function (value) {
                    if (check(value)) {
                        const map = getOrCreate(values, this, createFilledArray, cacheConstructArgs);
                        const raw = map[1].get(value);
                        if (raw)
                            value = raw;
                        else {
                            const baked = bake(value, this);
                            map[0].set(value, baked);
                            map[1].set(baked, value);
                        }
                    }
                    return srcSet.call(this, value);
                };
        }
        else if (check(descriptor.value)) {
            const baker = bake.bind(undefined, descriptor.value);
            const values = new WeakMap();
            descriptor.get = function () {
                return getOrCreate(values, this, baker);
            };
            if (descriptor.writable)
                descriptor.set = function (value) {
                    if (check(value) && values.get(this) !== value)
                        value = bake(value, this);
                    values.set(this, value);
                };
            delete descriptor.value;
            delete descriptor.writable;
        }
        return descriptor;
    };
}
exports.wrap = wrap;
function isFunction(fn) {
    return typeof fn === 'function';
}
exports.bind = wrap(isFunction, (fn, target) => fn.bind(target));
exports.bindNextTick = wrap(isFunction, ('process' in global) ?
    (fn, target) => process.nextTick.bind(process, fn.bind(target)) :
    ('setImmediate' in global) ?
        (fn, target) => setImmediate.bind(null, fn.bind(target)) :
        (fn, target) => setTimeout.bind(null, fn.bind(target), 0));
function getOrCreate(map, key, factory, args = []) {
    if (map.has(key))
        return map.get(key);
    const result = factory(key, ...args);
    map.set(key, result);
    return result;
}
function createFilledArray(_, count, factory, args = []) {
    const result = [];
    for (let i = 0; i < count; i++)
        result.push(factory(...args));
    return result;
}
function defaultValue(value, enumerable = false, writable = true, configurable = true) {
    return (target, key) => Object.defineProperty(target, key, {
        value,
        enumerable,
        configurable,
        writable,
    });
}
exports.defaultValue = defaultValue;
//# sourceMappingURL=decorators.js.map