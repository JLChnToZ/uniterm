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
exports.configFilePath = path_1.resolve(remote_wrapper_1.getElectron('app').getPath('userData'), 'uniterm.yml');
const defaultConfigFilePath = path_1.resolve(__dirname, '../static/config.default.yml');
let resolved = true;
let resolveTime = Date.now();
let isReloading = false;
let reloadingPromise;
function loadConfig(forceReload = false, reset = false) {
    if (isReloading)
        return reloadingPromise;
    if (exports.configFile && !forceReload)
        return Promise.resolve(exports.configFile);
    return reloadingPromise = reloadFile(reset);
}
exports.loadConfig = loadConfig;
async function reloadFile(reset) {
    isReloading = true;
    let configFileRaw;
    if (reset || !await existsAsync(exports.configFilePath)) {
        configFileRaw = await readFileAsync(defaultConfigFilePath, 'utf-8');
        await writeFileAsync(exports.configFilePath, configFileRaw, 'utf-8');
    }
    else
        configFileRaw = await readFileAsync(exports.configFilePath, 'utf-8');
    try {
        exports.configFile = js_yaml_1.load(configFileRaw);
    }
    catch (_a) {
        if (!exports.configFile)
            exports.configFile = js_yaml_1.load(await readFileAsync(defaultConfigFilePath, 'utf-8'));
        console.warn('Failed to load config file, will load default config instead');
    }
    isReloading = false;
    return exports.configFile;
}
let watcher;
function startWatch() {
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
            exports.events.emit('config', exports.configFile);
        }
        finally {
            resolved = true;
        }
    });
}
exports.startWatch = startWatch;
//# sourceMappingURL=config.js.map