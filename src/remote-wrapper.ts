import Electron, { MainInterface, remote } from 'electron';

export const electron: MainInterface = {} as any;

// Clone electron namespace
if(remote)
  assignProperties(electron, remote);
assignProperties(electron, Electron);

function assignProperties(src: any, target: any) {
  const props = Object.getOwnPropertyDescriptors(target);
  Object.values(props).forEach(assignTo, { configurable: true });
  Object.defineProperties(src, props);
}

function assignTo(this: any, value: any) {
  Object.assign(value, this);
}
