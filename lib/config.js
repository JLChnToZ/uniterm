"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startWatch = exports.loadConfig = exports.reloadConfigPath = exports.configFilePath = exports.configFile = exports.events = void 0;
const chokidar_1 = require("chokidar");
const events_1 = require("events");
const js_yaml_1 = require("js-yaml");
const path_1 = require("path");
const pathutils_1 = require("./pathutils");
const remote_wrapper_1 = require("./remote-wrapper");
exports.events = new events_1.EventEmitter();
exports.configFilePath = '';
let rawDefaultConfigFile;
let defaultConfigFile;
let isReloading = false;
let reloadingPromise;
function reloadConfigPath(reload = true) {
    if (exports.configFilePath && !reload)
        return;
    exports.configFilePath = path_1.resolve(remote_wrapper_1.electron.app.getPath('userData'), 'uniterm.yml');
}
exports.reloadConfigPath = reloadConfigPath;
function loadConfig(forceReload = false, reset = false) {
    if (isReloading)
        return reloadingPromise;
    if (exports.configFile && !forceReload)
        return Promise.resolve(exports.configFile);
    return reloadingPromise = reloadFile(reset);
}
exports.loadConfig = loadConfig;
async function loadDefaultFile() {
    if (!rawDefaultConfigFile) {
        rawDefaultConfigFile =
            await pathutils_1.readFileAsync(path_1.resolve(__dirname, '../static/config.default.yml'), 'utf-8');
        rawDefaultConfigFile = rawDefaultConfigFile.replace(/\$relative_path/g, remote_wrapper_1.electron.app.getPath('userData'));
        defaultConfigFile = js_yaml_1.load(rawDefaultConfigFile);
    }
    return defaultConfigFile;
}
async function reloadFile(reset) {
    reloadConfigPath();
    isReloading = true;
    let configFileRaw;
    if (reset || !await pathutils_1.existsAsync(exports.configFilePath)) {
        await loadDefaultFile();
        configFileRaw = rawDefaultConfigFile;
        await pathutils_1.writeFileAsync(exports.configFilePath, configFileRaw, 'utf-8');
    }
    else
        configFileRaw = await pathutils_1.readFileAsync(exports.configFilePath, 'utf-8');
    try {
        exports.configFile = Object.assign({}, await loadDefaultFile(), js_yaml_1.load(configFileRaw));
    }
    catch (_a) {
        if (!exports.configFile)
            exports.configFile = await loadDefaultFile();
        console.warn('Failed to load config file, will load default config instead');
    }
    isReloading = false;
    exports.events.emit('config', exports.configFile);
    return exports.configFile;
}
let watcher;
function startWatch() {
    reloadConfigPath();
    if (watcher)
        return watcher;
    return watcher = chokidar_1.watch(exports.configFilePath, {
        ignoreInitial: true,
        awaitWriteFinish: true,
    }).on('all', () => loadConfig(true));
}
exports.startWatch = startWatch;
//# sourceMappingURL=config.js.map