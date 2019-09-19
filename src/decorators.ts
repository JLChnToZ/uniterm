// tslint:disable:variable-name
// tslint:disable:ban-types
// tslint:disable:no-shadowed-variable

type ArgumentsType<T extends CallableFunction> = T extends (...args: infer TArgs) => any ? TArgs : any[];

export function readonly<T>(
  target: any, key: PropertyKey,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function readonly(
  _: any, _k: PropertyKey,
  descriptor: PropertyDescriptor,
) {
  if(descriptor.get || descriptor.set)
    delete descriptor.set;
  else
    descriptor.writable = false;
  return descriptor;
}

export function writable<T>(
  target: any, key: PropertyKey,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function writable(
  _: any, _k: PropertyKey,
  descriptor: PropertyDescriptor,
) {
  if(!descriptor.get && !descriptor.set)
    descriptor.writable = true;
  return descriptor;
}

export function seal<T>(
  target: any, key: PropertyKey,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function seal(
  _: any, _k: PropertyKey,
  descriptor: PropertyDescriptor,
) {
  descriptor.configurable = false;
  return descriptor;
}

export function configurable<T>(
  target: any, key: PropertyKey,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function configurable(
  _: any, _k: PropertyKey,
  descriptor: PropertyDescriptor,
) {
  descriptor.configurable = true;
  return descriptor;
}

export function hide<T>(
  target: any, key: PropertyKey,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function hide(
  _: any, _k: PropertyKey,
  descriptor: PropertyDescriptor,
) {
  descriptor.enumerable = false;
  return descriptor;
}

export function enumerable<T>(
  target: any, key: PropertyKey,
  descriptor: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function enumerable(
  _: any, _k: PropertyKey,
  descriptor: PropertyDescriptor,
) {
  descriptor.enumerable = true;
  return descriptor;
}

type BiWeakMap<T extends object> = Array<WeakMap<T, T>>;

type CacheConstructArgs = [
  number,
  typeof Reflect.construct,
  ArgumentsType<typeof Reflect.construct>,
];
const cacheConstructArgs: CacheConstructArgs = [
  2,
  Reflect.construct,
  [WeakMap, []],
];

export function wrap<O extends object>(
  typeCheckFn: (prop: any) => boolean,
  wrapFn: (prop: O, target: any) => O,
): <T extends O>(
  target: any, key: PropertyKey,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T>;
export function wrap(
  check: (value: any) => boolean,
  bake: (value: object, target: any) => object,
): (
  _: any, _k: PropertyKey,
  descriptor: TypedPropertyDescriptor<object>,
) => TypedPropertyDescriptor<object> {
  return (_, _k, descriptor) => {
    if(descriptor.get || descriptor.set) {
      const { get: srcGet, set: srcSet } = descriptor;
      const values = new WeakMap<object, BiWeakMap<object>>();
      if(srcGet)
        descriptor.get = function(this: object) {
          const value = srcGet.call(this);
          if(!check(value))
            return value;
          const map = getOrCreate<object, BiWeakMap<object>, CacheConstructArgs>(
            values, this, createFilledArray, cacheConstructArgs,
          );
          let baked = map[0].get(value);
          if(!baked) {
            baked = bake(value, this);
            map[0].set(value, baked);
            map[1].set(baked, value);
          }
          return baked;
        };
      if(srcSet)
        descriptor.set = function(this: object, value) {
          if(check(value)) {
            const map = getOrCreate<object, BiWeakMap<object>, CacheConstructArgs>(
              values, this, createFilledArray, cacheConstructArgs,
            );
            const raw = map[1].get(value);
            if(raw) value = raw;
            else {
              const baked = bake(value, this);
              map[0].set(value, baked);
              map[1].set(baked, value);
            }
          }
          return srcSet.call(this, value);
        };
    } else if(check(descriptor.value)) {
      const baker = bake.bind(undefined, descriptor.value!);
      const values = new WeakMap<object, object>();
      descriptor.get = function(this: object) {
        return getOrCreate(values, this, baker);
      };
      if(descriptor.writable)
        descriptor.set = function(this: object, value) {
          if(check(value) && values.get(this) !== value)
            value = bake(value, this);
          values.set(this, value);
        };
      delete descriptor.value;
      delete descriptor.writable;
    }
    return descriptor;
  };
}

function isFunction(fn: any): fn is Function {
  return typeof fn === 'function';
}

export const bind = wrap<CallableFunction>(
  isFunction,
  (fn, target) => fn.bind(target),
);

export const bindNextTick = wrap<(...args: any[]) => void>(
  isFunction,
  ('process' in global) ?
    (fn, target) => process.nextTick.bind(process, fn.bind(target)) :
  ('setImmediate' in global) ?
    (fn, target) => setImmediate.bind(null, fn.bind(target)) :
  (fn, target) => setTimeout.bind(null, fn.bind(target), 0),
);

function getOrCreate<TKey, TValue>(
  map: Map<TKey, TValue>,
  key: TKey, factory: (key: TKey) => TValue,
): TValue;
function getOrCreate<TKey, TValue, TArgs extends any[]>(
  map: Map<TKey, TValue>,
  key: TKey, factory: (key: TKey, ...args: TArgs) => TValue,
  args: TArgs,
): TValue;
function getOrCreate<TKey extends object, TValue>(
  map: WeakMap<TKey, TValue>,
  key: TKey, factory: (key: TKey) => TValue,
): TValue;
function getOrCreate<TKey extends object, TValue, TArgs extends any[]>(
  map: WeakMap<TKey, TValue>,
  key: TKey, factory: (key: TKey, ...args: TArgs) => TValue,
  args: TArgs,
): TValue;
function getOrCreate(
  map: Map<any, any> | WeakMap<any, any>,
  key: any, factory: CallableFunction,
  args: any[] = [],
) {
  if(map.has(key))
    return map.get(key);
  const result = factory(key, ...args);
  map.set(key, result);
  return result;
}

function createFilledArray<TValue>(
  _: any, count: number,
  factory: () => TValue,
): TValue[];
function createFilledArray<TValue, TArgs extends any[]>(
  _: any, count: number,
  factory: (...args: TArgs) => TValue,
  args: TArgs,
): TValue[];
function createFilledArray(
  _: any, count: number,
  factory: CallableFunction,
  args: any[] = [],
) {
  const result: any[] = [];
  for(let i = 0; i < count; i++)
    result.push(factory(...args));
  return result;
}

export function defaultValue(
  value: any,
  enumerable = false,
  writable = true,
  configurable = true,
): (target: any, key: PropertyKey) => void {
  return (target, key) => Object.defineProperty(target, key, {
    value,
    enumerable,
    configurable,
    writable,
  });
}
