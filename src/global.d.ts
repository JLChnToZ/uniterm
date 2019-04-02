type DomElement = Element;
type AssignableProperty<T, K extends keyof T> =
  (<R>() => R extends { [I in K]: T[I] } ? true : false) extends
  (<R>() => R extends { -readonly [I in K]: T[I] } ? true : false) ?
    T[K] extends string | number | boolean | symbol | Function ?
      T[K] :
    AssignableObject<T[K]> :
  never;
type AssignableObject<T> = {
  [K in keyof T]?: AssignableProperty<T, K>;
};
type AssignableDomElement<T extends Element> = {
  [K in keyof T]?:
    // Bypass readonly check
    T[K] extends CSSStyleDeclaration | DOMStringMap ?
      AssignableObject<T[K]> :
    AssignableProperty<T, K>;
};

declare namespace JSX {
  type Element = DomElement;
  type IntrinsicElementMap = {
    [K in keyof ElementTagNameMap]:
      ElementTagNameMap[K] | AssignableDomElement<ElementTagNameMap[K]>;
  };
  interface IntrinsicElements extends IntrinsicElementMap {
    [tagName: string]: any;
  }
}

declare module 'default-shell' {
  const defaultShell: string;
  export = defaultShell;
}

declare module 'code-to-signal' {
  function CodeToSignal(code: number): string;
  namespace CodeToSignal {
    export function shimError<TError extends Error>(error: TError): TError;
  }
  export = CodeToSignal;
}

declare module 'isexe' {
  interface IsExeOptions {
    ignoreErrors?: boolean;
    uid?: number;
    gid?: number;
    pathExt?: string;
  }
  interface IsExe {
    (path: string, callback?: (err: Error, isExe: boolean) => void): void;
    (path: string, options: IsExeOptions, callback?: (err: Error, isExe: boolean) => void): void;
    sync(path: string, options?: IsExeOptions): boolean;
    // Promisify
    __promisify__: (path: string, options?: IsExeOptions) => Promise<boolean>;
  }
  const isExe: IsExe;
  export = isExe;
}

declare module 'electron-process-manager' {
  interface DefaultSorting {
    how?: 'ascending' | 'descending';
    path?: string;
  }

  export function openProcessManager(defaultSorting?: DefaultSorting): void;
}
