import { FSWatcher, watch } from 'chokidar';
import { EventEmitter } from 'events';
import { load } from 'js-yaml';
import { resolve } from 'path';
import { ITerminalOptions } from 'xterm';
import { existsAsync, readFileAsync, writeFileAsync } from './pathutils';
import { electron } from './remote-wrapper';

export interface ConfigFile {
  terminal: ITerminalOptions;
  misc?: {
    initialCols?: number;
    initialRows?: number;
    vibrancy?: boolean;
    transparent?: boolean;
    webGL?: boolean;
  };
  mods?: string[];
}

export const events = new EventEmitter();
export let configFile: ConfigFile | undefined;
export let configFilePath = '';
let rawDefaultConfigFile: string | undefined;
let defaultConfigFile: ConfigFile | undefined;

let isReloading = false;
let reloadingPromise: Promise<ConfigFile> | undefined;

export function reloadConfigPath(reload: boolean = true) {
  if(configFilePath && !reload) return;
  configFilePath = resolve(electron.app.getPath('userData'), 'uniterm.yml');
}

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
    rawDefaultConfigFile = rawDefaultConfigFile.replace(/\$relative_path/g, electron.app.getPath('userData'));
    defaultConfigFile = load(rawDefaultConfigFile);
  }
  return defaultConfigFile;
}

async function reloadFile(reset: boolean) {
  reloadConfigPath();
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
  reloadConfigPath();
  if(watcher) return watcher;
  return watcher = watch(configFilePath, {
    ignoreInitial: true,
    awaitWriteFinish: true,
  }).on('all', () => loadConfig(true));
}
