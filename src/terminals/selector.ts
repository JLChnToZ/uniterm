import { TerminalBase, TerminalOptions } from './base';
import { PtyShell } from './pty';

export type CreateBackendHandler = (options: TerminalOptions) => TerminalBase<unknown> | undefined;

const registered = new Map<string, CreateBackendHandler>();

export function register(path: string, handler: CreateBackendHandler) {
  registered.set(path, handler);
}

export function createBackend(options: TerminalOptions): TerminalBase<unknown> {
  if(options) {
    const handler = registered.get(options.path);
    if(handler) {
      const result = handler(options);
      if(result)
        return result;
    }
  }
  return new PtyShell(options);
}

export function shiftPath(options: TerminalOptions) {
  options._rawPath = options.path;
  if(options.argv) {
    options.path = options.argv[0];
    options.argv = options.argv.slice(1);
  } else
    delete options.path;
  return options;
}

export function hasBackend(name: string) {
  return registered.has(name);
}
