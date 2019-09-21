import { BrowserWindow, remote } from 'electron';
import { NSVisualEffectMaterial } from 'electron-vibrancy';
import { configFile, loadConfig } from './config';

let vibrancy: typeof import('electron-vibrancy') | undefined;
let wasEnabled: boolean | undefined;

export async function checkVibrancy(browserWindow: BrowserWindow) {
  if(!configFile)
    await loadConfig();
  document.documentElement.classList.remove('vibrant');
  const enabled = configFile.misc && configFile.misc.vibrancy;
  if(wasEnabled !== undefined && wasEnabled !== enabled) {
    remote.dialog.showMessageBox(browserWindow, {
      message: 'Vibrancy option changes only affects newly opened windows.',
      detail: 'You may need to reopen all currently opened terminal windows in order to apply this changes.',
      title: 'Vibrancy Mode Changes',
      type: 'info',
    });
    return;
  }
  wasEnabled = enabled;
  if(enabled) {
    if(!vibrancy)
      vibrancy = remote.require('electron-vibrancy');
    document.documentElement.classList.add('vibrant');
    vibrancy.SetVibrancy(browserWindow, NSVisualEffectMaterial.AppearanceBased);
  } else if(vibrancy)
    vibrancy.DisableVibrancy(browserWindow);
}
