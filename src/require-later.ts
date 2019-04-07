import { LazyProperty, LazyProxy } from 'lazy-initializer';
import Module from 'module';
import { resolve as resolvePath } from 'path';

const requireCache = new Map<string, NodeRequireFunction>();

export function requireLater(
  requireBase: NodeRequireFunction | string, path: string,
): any;
export function requireLater<T>(
  requireBase: NodeRequireFunction | string, path: string,
  target: T, key: PropertyKey, alias?: PropertyKey,
): T;
export function requireLater(
  requireBase: NodeRequireFunction | string, path: string,
  target?: any, key?: PropertyKey, alias = key,
) {
  let requireFn: NodeRequireFunction;
  if(typeof requireBase === 'string') {
    requireBase = resolvePath(requireBase);
    requireFn = requireCache.get(requireBase);
    if(!requireFn) {
      requireFn = Module.createRequireFromPath(requireBase);
      requireCache.set(requireBase, requireFn);
    }
  } else
    requireFn = requireBase;
  if(target && (typeof target === 'object' || typeof target === 'function'))
    return LazyProperty.define(target, key!, () => requireFn(path)[alias]);
  else
    return LazyProxy.create(() => requireFn(path));
}
