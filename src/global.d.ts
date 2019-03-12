type DomElement = Element;
type DeepPartial<T> = {
  [K in keyof T]?: T[K] | DeepPartial<T[K]>;
};
type FreePartialProperties<T> = {
  [K in keyof T]: DeepPartial<T[K]>;
};

declare namespace JSX {
  interface Element extends DomElement {}
  interface IntrinsicElements extends
    FreePartialProperties<ElementTagNameMap> {
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
