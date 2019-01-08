"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const h = require("hyperscript");
const url_1 = require("url");
const fit_1 = require("xterm/lib/addons/fit/fit");
const config_1 = require("./config");
const domutils_1 = require("./domutils");
const pathutils_1 = require("./pathutils");
const remote_wrapper_1 = require("./remote-wrapper");
const tab_1 = require("./tab");
const selector_1 = require("./terminals/selector");
const winctrl_1 = require("./winctrl");
const homePath = electron_1.remote.app.getPath('home');
const tabContainer = h("div", { className: "flex" });
const layoutContainer = document.body.appendChild(h("div", { className: "layout-container" }));
const header = layoutContainer.appendChild(h("div", { className: "header pty-tabs" },
    tabContainer,
    h("a", { className: "icon item", onclick: async () => {
            await config_1.loadConfig();
            new tab_1.Tab(tabContainer, layoutContainer).attach(selector_1.createBackend({
                cwd: homePath,
            }));
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
                                backend = selector_1.createBackend({
                                    cwd: path,
                                });
                                break;
                            }
                            if (await pathutils_1.isExeAsync(path))
                                backend = selector_1.createBackend({
                                    path,
                                    cwd: homePath,
                                });
                            break;
                        }
                    }
                    if (backend)
                        new tab_1.Tab(tabContainer, layoutContainer).attach(backend);
                }
                items.clear();
            }
            e.dataTransfer.clearData();
        }, title: "Add Tab" }, '\uf914'),
    h("div", { className: "drag" }),
    h("a", { className: "icon item", onclick: () => electron_1.ipcRenderer.send('show-config'), title: "Config" }, '\uf085')));
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
    header.insertBefore(h("div", { className: "window-control-mac" }), header.firstElementChild);
else
    winctrl_1.attach(header);
config_1.events.on('config', () => {
    window.dispatchEvent(new CustomEvent('configreload', {}));
    if (!config_1.configFile)
        return;
    if (config_1.configFile.terminal) {
        const { terminal: options } = config_1.configFile;
        if (tab_1.Tab.tabCount) {
            const keys = Object.keys(options);
            for (const tab of tab_1.Tab.allTabs()) {
                if (!tab.terminal)
                    continue;
                const { terminal } = tab;
                for (const key of keys) {
                    const value = options[key];
                    if (terminal.getOption(key) !== value)
                        terminal.setOption(key, value);
                }
                fit_1.fit(terminal);
            }
        }
        const { style } = document.body;
        if (options.theme) {
            const { theme } = options;
            style.backgroundColor = theme.background || 'inherit';
            style.color = theme.foreground || 'inherit';
        }
        else {
            style.backgroundColor = 'inherit';
            style.color = 'inherit';
        }
    }
    if (config_1.configFile.mods && config_1.configFile.mods.length)
        for (const mod of config_1.configFile.mods)
            domutils_1.loadScript(url_1.resolve('userdata/', mod));
});
electron_1.ipcRenderer.on('create-terminal', async (e, options) => {
    await config_1.loadConfig();
    const tab = new tab_1.Tab(tabContainer, layoutContainer, options.pause);
    tab.attach(selector_1.createBackend(options));
    electron_1.remote.getCurrentWindow().focus();
});
window.addEventListener('beforeunload', e => {
    if (tab_1.Tab.tabCount > 1 && electron_1.remote.dialog.showMessageBox(electron_1.remote.getCurrentWindow(), {
        type: 'question',
        title: 'Exit?',
        message: `There are still ${tab_1.Tab.tabCount} sessions are opened, do you really want to close?`,
        buttons: ['Yes', 'No'],
    }))
        e.returnValue = false;
});
document.body.addEventListener('dragenter', domutils_1.interceptDrop);
document.body.addEventListener('dragover', domutils_1.interceptDrop);
if (document.readyState !== 'complete')
    document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete')
            electron_1.ipcRenderer.send('ready');
    });
else
    electron_1.ipcRenderer.send('ready');
config_1.startWatch();
// Expose everything for mods, except for requirable stuffs
Object.assign(window, { Tab: tab_1.Tab, electron: remote_wrapper_1.electron });
Object.defineProperty(window, 'activeTab', {
    get() { return tab_1.Tab.activeTab; },
    set(value) {
        if (!(value instanceof tab_1.Tab))
            return;
        tab_1.Tab.activeTab = value;
        tab_1.Tab.activeTab.onEnable();
    },
});
//# sourceMappingURL=renderer.js.map