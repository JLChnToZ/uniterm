import { EventEmitter } from 'events';
import { exists, FSWatcher, readFile, watch, writeFile } from 'fs';
import { load } from 'js-yaml';
import { resolve } from 'path';
import { setTimeout } from 'timers';
import { promisify } from 'util';
import { ITerminalOptions } from 'xterm';
import { electron } from './remote-wrapper';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);
const existsAsync = promisify(exists);
const delay = promisify(setTimeout);

export interface ConfigFile {
  terminal: ITerminalOptions;
  mods?: string[];
}

export const events = new EventEmitter();
export let configFile: ConfigFile | undefined;
const userData = electron.app.getPath('userData');
export const configFilePath = resolve(userData, 'uniterm.yml');
let rawDefaultConfigFile: string | undefined;
let defaultConfigFile: ConfigFile | undefined;

let resolved = true;
let resolveTime = Date.now();
let isReloading = false;
let reloadingPromise: Promise<ConfigFile> | undefined;

export function loadConfig(forceReload: boolean = false, reset: boolean = false) {
  if(isReloading)
    return reloadingPromise!;
  if(configFile && !forceReload)
    return Promise.resolve(configFile);
  return reloadingPromise = reloadFile(reset);
}

async function loadDefaultFile() {
  if(!rawDefaultConfigFile) {
    rawDefaultConfigFile =
      await readFileAsync(resolve(__dirname, '../static/config.default.yml'), 'utf-8');
    rawDefaultConfigFile = rawDefaultConfigFile.replace(/\$relative_path/g, userData);
    defaultConfigFile = load(rawDefaultConfigFile);
  }
  return defaultConfigFile;
}

async function reloadFile(reset: boolean) {
  isReloading = true;
  let configFileRaw: string;
  if(reset || !await existsAsync(configFilePath)) {
    await loadDefaultFile();
    configFileRaw = rawDefaultConfigFile;
    await writeFileAsync(configFilePath, configFileRaw, 'utf-8');
  } else
    configFileRaw = await readFileAsync(configFilePath, 'utf-8');
  try {
    configFile = Object.assign({}, await loadDefaultFile(), load(configFileRaw));
  } catch {
    if(!configFile)
      configFile = await loadDefaultFile();
    console.warn('Failed to load config file, will load default config instead');
  }
  isReloading = false;
  events.emit('config', configFile);
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
    } finally {
      resolved = true;
    }
  });
}
