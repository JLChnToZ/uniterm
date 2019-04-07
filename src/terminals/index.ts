import { Class } from 'lazy-initializer/lib/lazy-property';
import { requireLater } from '../require-later';
import { TerminalBase } from './base';
import { register, shiftPath } from './selector';

const lazyPty: { [type: string]: Class<TerminalBase<unknown>> } = {};
requireLater(require, './wslpty', lazyPty, 'WslPtyShell');
requireLater(require, './uacwrapper', lazyPty, 'UACClient');

register('wsl', o => {
  if(process.platform !== 'win32') return;
  return new lazyPty.WslPtyShell(shiftPath(o));
});
register('sudo', o => {
  if(process.platform !== 'win32') return;
  return new lazyPty.UACClient(shiftPath(o));
});

export { register, createBackend } from './selector';
