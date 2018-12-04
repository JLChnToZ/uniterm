"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const fs_1 = require("fs");
const js_yaml_1 = require("js-yaml");
const path_1 = require("path");
const timers_1 = require("timers");
const util_1 = require("util");
const remote_wrapper_1 = require("./remote-wrapper");
const readFileAsync = util_1.promisify(fs_1.readFile);
const writeFileAsync = util_1.promisify(fs_1.writeFile);
const existsAsync = util_1.promisify(fs_1.exists);
const delay = util_1.promisify(timers_1.setTimeout);
exports.events = new events_1.EventEmitter();
exports.configFilePath = '';
let rawDefaultConfigFile;
let defaultConfigFile;
let resolved = true;
let resolveTime = Date.now();
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
            await readFileAsync(path_1.resolve(__dirname, '../static/config.default.yml'), 'utf-8');
        rawDefaultConfigFile = rawDefaultConfigFile.replace(/\$relative_path/g, remote_wrapper_1.electron.app.getPath('userData'));
        defaultConfigFile = js_yaml_1.load(rawDefaultConfigFile);
    }
    return defaultConfigFile;
}
async function reloadFile(reset) {
    reloadConfigPath();
    isReloading = true;
    let configFileRaw;
    if (reset || !await existsAsync(exports.configFilePath)) {
        await loadDefaultFile();
        configFileRaw = rawDefaultConfigFile;
        await writeFileAsync(exports.configFilePath, configFileRaw, 'utf-8');
    }
    else
        configFileRaw = await readFileAsync(exports.configFilePath, 'utf-8');
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
    return watcher = fs_1.watch(exports.configFilePath, async () => {
        resolveTime = Date.now();
        if (!resolved)
            return;
        try {
            resolved = false;
            while (Date.now() - resolveTime < 100)
                await delay(100);
            await loadConfig(true);
        }
        finally {
            resolved = true;
        }
    });
}
exports.startWatch = startWatch;
//# sourceMappingURL=config.js.map