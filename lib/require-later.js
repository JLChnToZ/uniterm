"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireLater = void 0;
const tslib_1 = require("tslib");
const lazy_initializer_1 = require("lazy-initializer");
const module_1 = tslib_1.__importDefault(require("module"));
const path_1 = require("path");
const requireCache = new Map();
function requireLater(requireBase, path, target, key, alias = key) {
    let requireFn;
    if (typeof requireBase === 'string') {
        requireBase = path_1.resolve(requireBase);
        requireFn = requireCache.get(requireBase);
        if (!requireFn) {
            requireFn = module_1.default.createRequireFromPath(requireBase);
            requireCache.set(requireBase, requireFn);
        }
    }
    else
        requireFn = requireBase;
    if (target && (typeof target === 'object' || typeof target === 'function'))
        return lazy_initializer_1.LazyProperty.define(target, key, () => requireFn(path)[alias]);
    else
        return lazy_initializer_1.LazyProxy.create(() => requireFn(path));
}
exports.requireLater = requireLater;
//# sourceMappingURL=require-later.js.map