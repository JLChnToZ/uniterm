import { BrowserWindow, remote } from 'electron';
import { configFile, loadConfig } from './config';

let vibrancy: any;

export async function checkVibrancy(browserWindow: BrowserWindow) {
  if(!configFile)
    await loadConfig();
  document.documentElement.classList.remove('vibrant');
  if(configFile.misc && configFile.misc.vibrancy) {
    if(!vibrancy)
      vibrancy = remote.require('electron-vibrancy');
    document.documentElement.classList.add('vibrant');
    vibrancy.SetVibrancy(browserWindow, 0);
  } else if(vibrancy)
    vibrancy.DisableVibrancy(browserWindow);
}
