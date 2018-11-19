import * as electron from 'electron';
import { MainInterface, remote } from 'electron';

export function getElectron<K extends keyof MainInterface>(type: K): MainInterface[K] {
  switch(process.type) {
    case 'renderer':
      return remote[type];
    default:
      return electron[type];
  }
}
