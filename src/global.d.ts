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
