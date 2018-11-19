import { app, remote } from 'electron';
import { EventEmitter } from 'events';
import { exists, FSWatcher, readFile, watch, writeFile } from 'fs';
import { load } from 'js-yaml';
import { resolve } from 'path';
import { setTimeout } from 'timers';
import { promisify } from 'util';
import { ITerminalOptions } from 'xterm';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const existsAsync = promisify(exists);
const delay = promisify(setTimeout);

export interface ConfigFile {
  terminal: ITerminalOptions;
}

export const events = new EventEmitter();
export let configFile: ConfigFile | undefined;
export const configFilePath = resolve(getApp().getPath('userData'), 'uniterm.yml');

function getApp(): Electron.App {
  switch(process.type) {
    case 'renderer':
      return remote.app;
    default:
      return app;
  }
}

let resolved = true;
let resolveTime = Date.now();
let isReloading = false;
let reloadingPromise: Promise<ConfigFile> | undefined;

export function loadConfig(forceReload: boolean = false) {
  if(isReloading)
    return reloadingPromise!;
  if(configFile && !forceReload)
    return Promise.resolve(configFile);
  return reloadingPromise = reloadFile();
}

async function reloadFile() {
  isReloading = true;
  let configFileRaw: string;
  if(!await existsAsync(configFilePath)) {
    configFileRaw = await readFileAsync(resolve(__dirname, '../static/config.default.yml'), 'utf-8');
    await writeFileAsync(configFilePath, configFileRaw, 'utf-8');
  } else
    configFileRaw = await readFileAsync(configFilePath, 'utf-8');
  configFile = load(configFileRaw);
  isReloading = false;
  return configFile;
}

let watcher: FSWatcher | undefined;

export function startWatch() {
  if(watcher) return watcher;
  return watcher = watch(configFilePath, async () => {
    resolveTime = Date.now();
    if(!resolved) return;
    try {
      resolved = false;
      while(Date.now() - resolveTime < 100)
        await delay(100);
      await loadConfig(true);
      events.emit('config', configFile);
    } finally {
      resolved = true;
    }
  });
}
