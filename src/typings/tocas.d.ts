declare interface Window {
  ts: Tocas;
}

declare interface Tocas {
  (selector: Tocas.SelectorArgument, context?: string): Tocas.Selector;

  fn: Tocas.ExtensionRegistary;
  helper: TocasHelper;
}

declare namespace Tocas {
  function isPlanObject(obj: object): boolean;
  function isTouchDevice(): boolean;
  function device(): { device: Device; };
  function fromPoint(x: number, y: number): Selector;
  function extend(deep: boolean, ...objects: any[]): any;
  function extend(...objects: any[]): any;
  function createElement(html: string): HTMLElement;
  function register(options: any): void;

  const enum Device {
    mobile = 'mobile',
    tablet = 'tablet',
    computer = 'computer',
    large = 'large',
  }

  interface SelectorBase extends Array<Node> {
    fn: ExtensionRegistary;
    isSelector: true;
  }

  type Selector = SelectorBase & Extensions;

  type SelectorArgument = string | NodeList | HTMLElement | HTMLElement[] | Selector;

  type ExtensionRegistary = {
    [name in keyof Extensions]: {
      value: Extensions[name];
    };
  };

  interface Extensions {
    [name: string]: (this: Selector, ...args: any[]) => any;
    get(index?: number): Node;
    toArray(): Node[];
    each(callback: (this: Node, element: Node, index: number) => void): Selector;
    collectSwap(callback: (this: Node, element: Node, index: number) => (NodeList | Node[] | null | undefined)): Selector;
    eq(index: number): Selector;
    parent(): Selector;
    parents(): Selector;
    closest(): Selector;
    find(selector: string): Selector;
    insertBefore(target: SelectorArgument): Selector;
    insertAfter(target: SelectorArgument): Selector;
    wrap(element: SelectorArgument): Selector;
    clone(): Selector;
    append(element: SelectorArgument): Selector;
    appendTo(element: SelectorArgument): Selector;
    prepend(element: SelectorArgument): Selector;
    prependTo(element: SelectorArgument): Selector;
    remove(): Selector;
    is(selector: SelectorArgument): boolean;
    contains(selector: SelectorArgument): boolean;
    exists(): boolean;
    not(selector: SelectorArgument): Selector;
    filter(selector: SelectorArgument): Selector;
    slice(from: number, to: number): Selector;
    children(selector: SelectorArgument): Selector;
    replaceWith(selector: SelectorArgument): Selector;
    last(): Selection;
    next(): Selection;
    prev(): Selection;
    nextAll(selector: SelectorArgument): Selection;
    prevAll(selector: SelectorArgument): Selection;
    addBack(): Selection;
    index(): number;
    attr(name: string): any;
    attr(hash: { [key: string]: any }): Selector;
    attr(name: string, value: any): Selector;
    removeAttr(name: string): Selector;
    addClass(...classNames: string[]): Selector;
    removeClass(...classNames: string[]): Selector;
    toggleClass(...classNames: string[]): Selector;
    hasClass(className: string): boolean;
    css(name: string): any;
    css(hash: { [key: string]: any }): Selector;
    css(name: string, value: any): Selector;
    rect(): ClientRect & { x: number; y: number; };
    on(events: string, handler: Function, options?: EventOptions): Selector;
    on(events: string, selector: string, handler: Function, options?: EventOptions): Selector;
    on(events: string, data: any, handler: Function): Selector;
    on(events: string, selector: string, data: any, handler: Function, options?: EventOptions): Selector;
    one(events: string, handler: Function): Selector;
    off(events?: string, handler?: Function): Selector;
    trigger(events?: string): Selector;
    emulate(events: string, duration: number): Selector;
    text(): string;
    text(text: string): Selector;
    val(): any;
    val(value: any): Selector;
    html(): string;
    html(html: string): Selector;
    empty(): Selector;
    prop(name: string): any;
    prop(hash: { [key: string]: any }): Selector;
    prop(name: string, value: any): Selector;
    data(name: string): any;
    data(hash: { [key: string]: any }): Selector;
    data(name: string, value: any): Selector;
    removeData(name: string): Selector;
    hasTimer(name: string | number): boolean;
    getTimer(name: string | number): number;
    setTimer(options: TimerOptions): number;
    pauseTimer(name: string | number): Selector;
    playTimer(name: string | number): Selector;
    removeTimer(name: string | number): Selector;
    repaint(): Selector;
    uniqueID(): number;
  }

  interface EventOptions {
    once?: boolean;
  }

  interface TimerOptions {
    name?: string;
    callback?: () => void;
    interval?: number;
    looping?: boolean;
    visible?: boolean;
  }

  interface ModuleOptions {
    NAME: string;
    MODULE_NAMESPACE: string;
  }
}

declare interface TocasHelper {
  eventAlias(event: string): string;
}
