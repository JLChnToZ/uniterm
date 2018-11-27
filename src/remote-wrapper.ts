import * as electron from 'electron';
import { MainInterface, remote } from 'electron';

// Convenient way to access Electron APIs in both main and renderer process,
// simplify on writing shared code make use of Electron APIs.
export function getElectron<K extends keyof MainInterface>(type: K): MainInterface[K] {
  if(type in electron)
    return electron[type];
  if(type in remote)
    return remote[type];
  throw new TypeError(`Type ${type} does not exists in Electron namespace.`);
}
