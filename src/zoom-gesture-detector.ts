import { IDisposable } from 'xterm';

export function startDetect<T extends GlobalEventHandlers>(
  element: T,
  callback: (this: T, delta: number) => void,
  useCapture?: boolean,
): IDisposable {
  return new GestureDetector(element, callback, useCapture);
}

class GestureDetector<T extends GlobalEventHandlers> implements IDisposable {
  public callback: (this: T, delta: number) => void;
  private element: T;
  private options: AddEventListenerOptions;
  private touchCache = new Map<number, PointerEvent>();
  private lastDelta: number = -1;

  constructor(
    element: T,
    callback: (this: T, delta: number) => void,
    useCapture?: boolean,
  ) {
    this.element = element;
    this.callback = callback;
    this.options = {
      capture: useCapture,
      passive: true,
    };
    this.onDown = this.onDown.bind(this);
    this.onMove = this.onMove.bind(this);
    this.onUp = this.onUp.bind(this);
    this.register();
  }

  public dispose() {
    this.unregister();
    this.touchCache.clear();
  }

  private register() {
    this.element.addEventListener('pointerdown', this.onDown, this.options);
    this.element.addEventListener('pointermove', this.onMove, this.options);
    this.element.addEventListener('pointerup', this.onUp, this.options);
    this.element.addEventListener('pointercancel', this.onUp, this.options);
    this.element.addEventListener('pointerout', this.onUp, this.options);
    this.element.addEventListener('pointerleave', this.onUp, this.options);
  }

  private unregister() {
    this.element.removeEventListener('pointerdown', this.onDown, this.options);
    this.element.removeEventListener('pointermove', this.onMove, this.options);
    this.element.removeEventListener('pointerup', this.onUp, this.options);
    this.element.removeEventListener('pointercancel', this.onUp, this.options);
    this.element.removeEventListener('pointerout', this.onUp, this.options);
    this.element.removeEventListener('pointerleave', this.onUp, this.options);
  }

  private onDown(e: PointerEvent) {
    this.touchCache.set(e.pointerId, e);
  }

  private onMove(e: PointerEvent) {
    this.touchCache.set(e.pointerId, e);
    if(this.touchCache.size !== 2) return;
    const [
      { clientX: x1, clientY: y1 },
      { clientX: x2, clientY: y2 },
    ] = this.touchCache.values();
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    const delta = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    if(this.lastDelta > 0) this.callback.call(this.element, delta - this.lastDelta);
    this.lastDelta = delta;
  }

  private onUp(e: PointerEvent) {
    this.touchCache.delete(e.pointerId);
    if(this.touchCache.size < 2) this.lastDelta = -1;
  }
}
