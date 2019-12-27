"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const argv_split_1 = tslib_1.__importDefault(require("argv-split"));
const default_shell_1 = tslib_1.__importDefault(require("default-shell"));
const electron_1 = require("electron");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const path_1 = require("path");
const domutils_1 = require("./domutils");
const pathutils_1 = require("./pathutils");
let launch;
let pause = false;
let createTab;
let cwd = electron_1.remote.app.getPath('home');
const launchBar = document.body.appendChild(hyperscript_1.default("div", { className: "toolbar hidden" },
    hyperscript_1.default("a", { className: "icon item", title: "Select Shell", onclick: selectShell }, '\uf68c'),
    launch = hyperscript_1.default("input", { type: "text", className: "search", placeholder: default_shell_1.default, onkeydown: e => {
            switch (e.which) {
                default: return;
                case 27: /* Escape */
                    toggleOpen();
                    break;
                case 13: /* Enter */
                    doLaunch(e.shiftKey);
                    break;
            }
            e.preventDefault();
        }, ondragenter: domutils_1.acceptFileDrop, ondragover: domutils_1.acceptFileDrop, ondrop: async (e) => {
            domutils_1.interceptEvent(e);
            const { items } = e.dataTransfer;
            if (items && items.length) {
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    switch (item.kind) {
                        case 'file': {
                            const path = item.getAsFile().path;
                            if (!await pathutils_1.existsAsync(path))
                                break;
                            if ((await pathutils_1.lstatAsync(path)).isDirectory()) {
                                cwd = path;
                                break;
                            }
                            if (await pathutils_1.isExeAsync(path))
                                launch.value = path;
                            break;
                        }
                    }
                }
                items.clear();
            }
            e.dataTransfer.clearData();
        } }),
    hyperscript_1.default("a", { className: "icon item", title: "Change Working Directory", onclick: selectCWD }, '\uf751'),
    hyperscript_1.default("a", { className: "icon item", title: "Auto Pause", onclick: e => pause = e.target.classList.toggle('active') }, '\uf8e7'),
    hyperscript_1.default("a", { className: "icon item", title: "Launch", onclick: () => doLaunch(false) }, '\ufc5a'),
    hyperscript_1.default("a", { className: "icon item", title: "Launch in New Window", onclick: () => doLaunch(true) }, '\ufab0'),
    hyperscript_1.default("a", { className: "icon item", title: "Hide", onclick: toggleOpen }, '\uf85f')));
async function selectShell() {
    const filters = [{
            name: 'All Files',
            extensions: ['*'],
        }];
    if (process.platform === 'win32')
        filters.unshift({
            name: 'Executables',
            extensions: process.env.PATHEXT.split(path_1.delimiter).map(ext => ext.replace(/[\*\.]/g, '')),
        });
    const pathInfo = await getPath();
    const result = await electron_1.remote.dialog.showOpenDialog(electron_1.remote.getCurrentWindow(), {
        title: 'Select Shell',
        properties: ['openFile'],
        filters,
        defaultPath: pathInfo && pathInfo.path || undefined,
    });
    if (result.canceled)
        return;
    launch.value = result.filePaths[0];
}
async function selectCWD() {
    const result = await electron_1.remote.dialog.showOpenDialog(electron_1.remote.getCurrentWindow(), {
        title: 'Select Working Directory',
        properties: ['openDirectory'],
        defaultPath: cwd,
    });
    if (result.canceled)
        return;
    cwd = result.filePaths[0];
}
function toggleOpen() {
    if (!launchBar.classList.toggle('hidden')) {
        cwd = electron_1.remote.app.getPath('home');
        launch.value = '';
        launch.focus();
    }
}
exports.toggleOpen = toggleOpen;
function init(fn) {
    createTab = fn;
}
exports.init = init;
async function getPath(forgiveBackend) {
    let path = launch.value.trim() || launch.placeholder;
    let argv;
    if (await pathutils_1.existsAsync(path))
        return { path, argv: [] };
    argv = argv_split_1.default(path);
    path = argv.shift();
    if (!forgiveBackend && !await pathutils_1.existsAsync(path))
        return;
    return { path, argv };
}
async function doLaunch(newWindow) {
    if (!createTab)
        return;
    toggleOpen();
    const pathInfo = await getPath(true);
    createTab({
        path: pathInfo && pathInfo.path || default_shell_1.default,
        argv: pathInfo && pathInfo.argv,
        cwd,
        pause,
    }, newWindow);
}
//# sourceMappingURL=advanced-open.js.map