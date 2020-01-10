export const electronEnabled = process.env.ELECTRON_RUN_AS_NODE !== '1';

export const electron: Electron.MainInterface = {} as any;

if(electronEnabled) {
  // tslint:disable-next-line: no-var-requires
  const common = require('electron');
  // Clone electron namespace
  if(common.remote)
    assignProperties(electron, common.remote);
  assignProperties(electron, common);
}


function assignProperties(src: any, target: any) {
  const props = Object.getOwnPropertyDescriptors(target);
  Object.values(props).forEach(assignTo, { configurable: true });
  Object.defineProperties(src, props);
}

function assignTo(this: any, value: any) {
  Object.assign(value, this);
}
