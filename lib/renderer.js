"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const electron_1 = require("electron");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const module_1 = tslib_1.__importDefault(require("module"));
const path_1 = require("path");
const tinycolor2_1 = tslib_1.__importDefault(require("tinycolor2"));
const url_1 = require("url");
const config_1 = require("./config");
const domutils_1 = require("./domutils");
const pathutils_1 = require("./pathutils");
const require_later_1 = require("./require-later");
const tab_1 = require("./tab");
const terminals_1 = require("./terminals");
const vibrant_1 = require("./vibrant");
const winctrl_1 = require("./winctrl");
const homePath = electron_1.remote.app.getPath('home');
const browserWindow = electron_1.remote.getCurrentWindow();
const tabContainer = hyperscript_1.default("div", { className: "flex" });
const layoutContainer = document.body.appendChild(hyperscript_1.default("div", { className: "layout-container" }));
const header = layoutContainer.appendChild(hyperscript_1.default("div", { className: "header pty-tabs" },
    tabContainer,
    hyperscript_1.default("a", { className: "icon item", onclick: e => createTab({ cwd: homePath }, e.ctrlKey), onmouseup: e => {
            if (e.button !== 1)
                return;
            e.preventDefault();
            createTab({ cwd: homePath }, true);
        }, ondragenter: acceptFileDrop, ondragover: acceptFileDrop, ondrop: async (e) => {
            domutils_1.interceptEvent(e);
            const { items } = e.dataTransfer;
            if (items && items.length) {
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    let backend;
                    switch (item.kind) {
                        case 'file': {
                            const path = item.getAsFile().path;
                            if (!await pathutils_1.existsAsync(path))
                                break;
                            if ((await pathutils_1.lstatAsync(path)).isDirectory()) {
                                backend = { cwd: path };
                                break;
                            }
                            if (await pathutils_1.isExeAsync(path))
                                backend = { path, cwd: homePath };
                            break;
                        }
                    }
                    if (backend)
                        await createTab(backend, e.ctrlKey);
                }
                items.clear();
            }
            e.dataTransfer.clearData();
        }, title: "Add Tab" }, '\uf914'),
    hyperscript_1.default("div", { className: "drag" }),
    hyperscript_1.default("a", { className: "icon item", onclick: () => electron_1.ipcRenderer.send('show-config'), title: "Config" }, '\uf085')));
async function createTab(options, newWindow) {
    if (newWindow) {
        electron_1.ipcRenderer.send('create-terminal-request', options);
        return;
    }
    await config_1.loadConfig();
    const tab = new tab_1.Tab(tabContainer, layoutContainer, options.pause);
    try {
        tab.attach(terminals_1.createBackend(options));
    }
    catch (e) {
        tab.printDisposableMessage(`Error while creating backend: ${e.message || e}`, true);
    }
    browserWindow.focus();
}
function acceptFileDrop(e) {
    domutils_1.interceptEvent(e);
    const { dataTransfer } = e;
    for (const type of dataTransfer.types)
        switch (type) {
            case 'Files':
                dataTransfer.dropEffect = 'link';
                return;
        }
    dataTransfer.dropEffect = 'none';
}
if (process.platform === 'darwin')
    header.insertBefore(hyperscript_1.default("div", { className: "window-control-mac" }), header.firstElementChild);
else
    winctrl_1.attach(header);
winctrl_1.registerDraggableDoubleClick();
config_1.events.on('config', () => {
    window.dispatchEvent(new CustomEvent('configreload', {}));
    if (!config_1.configFile)
        return;
    if (config_1.configFile.terminal)
        reloadTerminalConfig(config_1.configFile.terminal);
    vibrant_1.checkVibrancy(browserWindow);
    if (config_1.configFile.mods && config_1.configFile.mods.length)
        for (const mod of config_1.configFile.mods)
            domutils_1.loadScript(url_1.resolve('userdata/', mod));
});
function reloadTerminalConfig(options) {
    if (tab_1.Tab.tabCount)
        for (const tab of tab_1.Tab.allTabs()) {
            tab.updateSettings(options);
            if (tab.active)
                tab.fit();
        }
    const { style } = document.body;
    const vibrancy = config_1.configFile && config_1.configFile.misc && config_1.configFile.misc.vibrancy;
    if (options.theme) {
        const { theme } = options;
        let background = theme.background;
        if (background && !vibrancy)
            background = tinycolor2_1.default(background).setAlpha(1).toString();
        style.backgroundColor = background || 'inherit';
        style.color = theme.foreground || 'inherit';
    }
    else {
        style.backgroundColor = 'inherit';
        style.color = 'inherit';
    }
}
electron_1.ipcRenderer.on('create-terminal', (e, options) => createTab(options));
let closeComfirmed = false;
window.addEventListener('beforeunload', async (e) => {
    if (tab_1.Tab.tabCount <= 1 || closeComfirmed)
        return;
    e.preventDefault();
    e.returnValue = false;
    if ((await electron_1.remote.dialog.showMessageBox(browserWindow, {
        type: 'question',
        title: 'Exit?',
        message: `There are still ${tab_1.Tab.tabCount} sessions are opened, do you really want to close?`,
        buttons: ['Yes', 'No'],
    })).response === 0) {
        closeComfirmed = true;
        window.close();
    }
});
const { body } = document;
body.addEventListener('dragenter', domutils_1.interceptDrop);
body.addEventListener('dragover', domutils_1.interceptDrop);
if (document.readyState !== 'complete')
    document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete')
            electron_1.ipcRenderer.send('ready');
    });
else
    electron_1.ipcRenderer.send('ready');
config_1.startWatch();
// Expose everything for mods, except for requirable stuffs
const fakePath = url_1.resolve(__dirname + '/', '../__renderer');
Object.assign(window, {
    Tab: tab_1.Tab,
    registerTerminalHandler: terminals_1.register,
    require: module_1.default.createRequireFromPath(fakePath),
    __dirname: path_1.dirname(fakePath),
});
Object.defineProperty(window, 'activeTab', {
    get() { return tab_1.Tab.activeTab; },
    set(value) {
        if (!(value instanceof tab_1.Tab))
            return;
        tab_1.Tab.activeTab = value;
        tab_1.Tab.activeTab.onEnable();
    },
});
// Lazy require to expose, they will not load if nobody is going to use them.
require_later_1.requireLater(require, './remote-wrapper', window, 'electron');
require_later_1.requireLater(require, './terminals/base', window, 'TerminalBase');
require_later_1.requireLater(require, './terminals/pty', window, 'PtyShell');
require_later_1.requireLater(require, './terminals/wslpty', window, 'WslPtyShell');
require_later_1.requireLater(require, './terminals/uacwrapper', window, 'UACClient');
//# sourceMappingURL=renderer.js.map