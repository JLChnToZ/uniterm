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

declare module 'electron-vibrancy' {
  export const enum NSVisualEffectMaterial {
    AppearanceBased = 0,
    Light = 1,
    Dark = 2,
    Titlebar = 3,
    Selection = 4,
    Menu = 5,
    Popover = 6,
    Sidebar = 7,
    MediumLight = 8,
    UltraDark = 9,
  }
  export const enum ResizeMask {
    autoWidth = 0,
    autoHeight = 1,
    autoWidthHeight = 3,
    none = 4,
  }
  export interface ViewOptions {
    Material: NSVisualEffectMaterial;
    X: number;
    Y: number;
    Width: number;
    Height: number;
  }
  export interface AddViewOptions extends ViewOptions {
    ResizeMask?: ResizeMask;
  }
  export interface UpdateViewOptions extends ViewOptions {
    ViewId: number;
  }
  export function SetVibrancy(
    window: Electron.BrowserWindow,
    material: NSVisualEffectMaterial,
  ): number;
  export function DisableVibrancy(
    window: Electron.BrowserWindow,
  ): void;
  export function AddView(
    window: Electron.BrowserWindow,
    options: AddViewOptions,
  ): number;
  export function Updateview(
    window: Electron.BrowserWindow,
    options: UpdateViewOptions,
  ): void;
  export function RemoveView(
    window: Electron.BrowserWindow,
    viewId: number,
  ): void;
}

declare module 'keyboardevent-from-electron-accelerator' {
  interface IKeyboardEvent {
    code: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
  }
  interface IState {
    accelerator: string;
    event: IKeyboardEvent;
  }
  export function reduceModifier(state: IState, modifier: string): IState;
  export function reducePlus(state: IState): IState;
  export function reduceKey(state: IState, key: string): IState;
  export function reduceCode(state: IState, event: IKeyboardEvent): IState;
  export function toKeyEvent(accelerator: string): IKeyboardEvent;
}
