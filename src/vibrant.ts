import { BrowserWindow, remote } from 'electron';
import { NSVisualEffectMaterial } from 'electron-vibrancy';
import { configFile, loadConfig } from './config';

let vibrancy: typeof import('electron-vibrancy') | undefined;

export async function checkVibrancy(browserWindow: BrowserWindow) {
  if(!configFile)
    await loadConfig();
  document.documentElement.classList.remove('vibrant');
  const enabled = configFile.misc && configFile.misc.vibrancy;
  if(enabled) {
    if(!vibrancy)
      vibrancy = remote.require('electron-vibrancy');
    document.documentElement.classList.add('vibrant');
    vibrancy.SetVibrancy(browserWindow, NSVisualEffectMaterial.AppearanceBased);
  } else if(vibrancy)
    vibrancy.DisableVibrancy(browserWindow);
}
