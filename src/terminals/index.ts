import { Class, lazyProperty } from '../lazy-decorator';
import { TerminalBase } from './base';
import { register, shiftPath } from './selector';

const lazyPty: { [type: string]: Class<TerminalBase<unknown>> } = {};
lazyProperty.require(require, './wslpty', 'WslPtyShell', lazyPty);
lazyProperty.require(require, './uacwrapper', 'UACClient', lazyPty);

register('wsl', o => {
  if(process.platform !== 'win32') return;
  return new lazyPty.WslPtyShell(shiftPath(o));
});
register('sudo', o => {
  if(process.platform !== 'win32') return;
  return new lazyPty.UACClient(shiftPath(o));
});

export { register, createBackend } from './selector';
