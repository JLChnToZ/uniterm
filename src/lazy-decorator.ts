// Type Definitions
/** Generic class constructor interface. */
export interface Class<T extends object> extends Function {
  prototype: T;
  new(...args: any[]): T;
}

export type Defined<T extends object, K extends keyof T> = T & {
  [I in K]-?: T[I];
};

export type DefineDescriptors<T extends object, K extends keyof T> = {
  [I in K]: DefineDescriptor<T, K>;
};

export type DefineDescriptor<T extends object, K extends keyof T> = {
  /** The init function, which will returns the value once initialized. */
  init: LazyInit<T, K>;
  /** Writable flag for the property. */
  writable?: boolean;
  /** Configurable flag for the property after initialized. */
  configurable?: boolean;
  /** Enumerable flag for the property. */
  enumerable?: boolean;
} | LazyInit<T, K>;

export type LazyInit<T extends object, K extends keyof T> = (this: T, key: K) => T[K];

type TypeGetter<T extends object, K extends keyof T> = (this: T) => T[K];

type TypeSetter<T extends object, K extends keyof T> = (this: T, value: T[K]) => void;

const $getter = Symbol('getter');

// Handler
class LazyHandler<T extends object, K extends keyof T> {
  private static allCache = new WeakMap<object, any>();
  public readonly key: K;
  public readonly init: LazyInit<T, K>;
  public readonly write?: boolean | TypeSetter<T, K>;
  public readonly configurable?: boolean;
  private getter?: TypeGetter<T, K>;
  private setter?: TypeSetter<T, K>;

  constructor(
    key: K, init: LazyInit<T, K>,
    write?: boolean | TypeSetter<T, K>,
    configurable?: boolean,
  ) {
    this.key = key;
    this.init = init;
    this.write = write;
    this.configurable = configurable;
  }

  public getAttr(enumerable?: boolean): TypedPropertyDescriptor<T[K]> {
    const handler = this;
    if(!this.getter)
      this.getter = function() {
        return handler.setValue(this);
      };
    if(!this.setter && this.write)
      this.setter = function(value) {
        return handler.setValue(this, value);
      };
    return {
      configurable: true,
      enumerable,
      get: this.getter,
      set: this.setter,
    };
  }

  private setValue(instance: T, newValue?: T[K]): T[K];
  private setValue(instance: T, newValue: T[K] | typeof $getter = $getter) {
    const attr = findPropertyDescriptor(instance, this.key);
    let hasValue: boolean | undefined;
    let value: T[K];
    if(attr.configurable) { // Normal flow
      if(newValue === $getter)
        value = this.init.call(instance, this.key);
      else
        value = newValue;
      Object.defineProperty(instance, this.key, {
        value,
        configurable: this.configurable,
        writable: !!this.write,
        enumerable: attr.enumerable,
      });
    } else { // Edge flow
      let cache = LazyHandler.allCache.get(instance);
      if(cache)
        hasValue = this.key in cache;
      else
        LazyHandler.allCache.set(instance, cache = Object.create(null));
      if(newValue !== $getter)
        value = newValue;
      else if(attr.get && attr.get !== this.getter)
        value = attr.get.call(instance);
      else if(!hasValue)
        value = this.init.call(instance, this.key);
      else if(cache[this.key] === $getter)
        value = attr.value!;
      else
        value = cache[this.key];
      if((attr.set && attr.set !== this.setter) || attr.writable) {
        cache[this.key] = $getter;
        instance[this.key] = value;
      } else
        cache[this.key] = value;
    }
    if(!hasValue && typeof this.write === 'function')
      this.write.call(instance, value);
    return value;
  }
}

// Helpers
const emptyProperty = Object.freeze<PropertyDescriptor>({
  configurable: true,
  writable: true,
  value: undefined,
});

const emptySealedProperty = Object.freeze<PropertyDescriptor>({
  configurable: false,
  writable: false,
  value: undefined,
});

function findPropertyDescriptor<T extends object, K extends keyof T>(
  o: T, key: K,
): TypedPropertyDescriptor<T[K]> {
  for(let p = o; p; p = Object.getPrototypeOf(p)) {
    const descriptor = Object.getOwnPropertyDescriptor(p, key);
    if(descriptor) return descriptor;
  }
  return Object.isExtensible(o) ? emptyProperty : emptySealedProperty;
}

function isPropertyKey(target: unknown): target is PropertyKey {
  const type = typeof target;
  return type === 'string' || type === 'number' || type === 'symbol';
}

function internalDefine<T extends object, K extends keyof T>(
  target: T, key: K, init: LazyInit<T, K>,
  writable?: boolean, configurable?: boolean, enumerable?: boolean,
) {
  const attr = findPropertyDescriptor(target, key);
  if(!attr.configurable)
    throw new TypeError('The property cannot reconfigure.');
  if(attr.get)
    throw new TypeError('The property already has a getter.');
  if(attr.value !== undefined)
    throw new TypeError('The property already has a default value.');
  if(enumerable === undefined)
    enumerable = attr.enumerable;
  return Object.defineProperty(
    target, key,
    new LazyHandler(
      key, init,
      writable === undefined ? true : writable,
      configurable === undefined ? true : configurable,
    ).getAttr(enumerable),
  );
}

// Exports
/**
 * Decorator to transform applied property getter to lazy initializer.
 * Lazy properties are undefined until the first interaction,
 * then it will become static.
 *
 * ### Example
 * ```javascript
 * class Schrodinger {
 *   @lazyProperty
 *   get cat() { return Math.random() > 0.5; }
 *   // Setter will be called when the value has been assigned first time.
 *   // If the setter is not defined, the property will be read-only.
 *   set cat(value) {
 *     console.log(`It is ${value ? 'alive' : 'dead'} now!`);
 *     assert.strictEqual(value, this.cat);
 *   }
 * }
 * ```
 */
export function lazyProperty<T extends object, K extends keyof T>(
  target: T, key: K, attr: TypedPropertyDescriptor<T[K]>,
): TypedPropertyDescriptor<T[K]>;
export function lazyProperty<T>( // Private field fallback
  target: object, key: PropertyKey, attr: TypedPropertyDescriptor<T>,
): TypedPropertyDescriptor<T>;
export function lazyProperty<T extends object, K extends keyof T>(
  target: T, key: K, attr: TypedPropertyDescriptor<T[K]>,
) {
  if(Object.isSealed(target))
    throw new TypeError('This object is sealed.');
  if(!attr || !attr.get)
    throw new TypeError('This property does not have a getter.');
  if(attr.value !== undefined)
    throw new TypeError('This property already has a default value.');
  return new LazyHandler(
    key, attr.get, attr.set, attr.configurable,
  ).getAttr(attr.enumerable);
}

// tslint:disable-next-line:no-namespace
export namespace lazyProperty {
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
  export function transform<T extends object, C extends Class<T>>(
    target: C, ...keys: Array<keyof T>
  ) {
    const { prototype } = target;
    for(const key of keys)
      Object.defineProperty(prototype, key,
        lazyProperty(prototype, key,
          findPropertyDescriptor(prototype, key)!,
        ),
      );
    return target;
  }

  /**
   * Explicit define a lazy initializer property for an object or class prototype.
   * @param target The prototype or object contains the property.
   * @param key The key of the property.
   * @param init The init function, which will returns the value once initialized.
   * @param writable Writable flag for the property.
   * @param configurable Configurable flag for the property after initialized.
   * @param enumerable Enumerable flag for the property.
   */
  export function define<T extends object, K extends keyof T>(
    target: T, key: K, init: LazyInit<T, K>,
    writable?: boolean, configurable?: boolean, enumerable?: boolean,
  ): Defined<T, K>;
  /**
   * Explicit define lazy initializer properties for an object or class prototype.
   * @param target The prototype or object contains the property.
   * @param defines Key hash for all descriptors would like to define.
   */
  export function define<T extends object, K extends keyof T>(
    target: T, defines: DefineDescriptors<T, K>,
  ): Defined<T, K>;
  export function define<T extends object, K extends keyof T>(
    target: T, keyOrDefs: K | DefineDescriptors<T, K>,
    sInit?: LazyInit<T, K>,
    sWri?: boolean, sCfg?: boolean, sEnum?: boolean,
  ) {
    if(Object.isSealed(target))
      throw new TypeError('The object is sealed.');
    if(isPropertyKey(keyOrDefs))
      return internalDefine(target, keyOrDefs, sInit!, sWri, sCfg, sEnum);
    for(const [key, defOrInit] of
      Object.entries(keyOrDefs) as Array<[K, DefineDescriptor<T, K>]>
    ) {
      if(typeof defOrInit === 'function') {
        internalDefine(target, key, defOrInit);
        continue;
      }
      const { init, writable, configurable, enumerable } = defOrInit;
      internalDefine(
        target, key, init, writable, configurable, enumerable,
      );
    }
    return target;
  }

  export function require(
    requireFn: NodeRequire, path: string,
    key: PropertyKey, container: object,
    alias = key,
  ) {
    return define<any, PropertyKey>(container, alias, _ => requireFn(path)[key]);
  }
}
