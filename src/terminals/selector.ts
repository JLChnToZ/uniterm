import { TerminalBase, TerminalOptions } from './base';
import { PtyShell } from './pty';
import { UACClient } from './uacwrapper';
import { WslPtyShell } from './wslpty';

export function createBackend(options: TerminalOptions): TerminalBase<unknown> {
  switch(process.platform === 'win32' && options && options.path) {
    case 'wsl':
      return new WslPtyShell(shiftPath(options));
    case 'sudo':
      return new UACClient(shiftPath(options));
    default:
      return new PtyShell(options);
  }
}

function shiftPath(options: TerminalOptions) {
  if(options.argv) {
    options.path = options.argv[0];
    options.argv = options.argv.slice(1);
  } else
    delete options.path;
  return options;
}
