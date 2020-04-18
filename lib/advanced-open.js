"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const argv_split_1 = tslib_1.__importDefault(require("argv-split"));
const default_shell_1 = tslib_1.__importDefault(require("default-shell"));
const electron_1 = require("electron");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const js_yaml_1 = require("js-yaml");
const path_1 = require("path");
const shell_escape_1 = tslib_1.__importDefault(require("shell-escape"));
const dndtabs_1 = require("./dndtabs");
const domutils_1 = require("./domutils");
const pathutils_1 = require("./pathutils");
const tab_1 = require("./tab");
let launch;
let pause = false;
let createTab;
let cwd = electron_1.remote.app.getPath('home');
let env;
let tempEnv;
const launchBar = document.body.appendChild(hyperscript_1.default("div", { className: "toolbar hidden" },
    hyperscript_1.default("div", { className: "inner" },
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
            }, ondragenter: acceptDrop, ondragover: acceptDrop, ondrop: e => {
                let intercept = false;
                if (dndtabs_1.draggingTab) {
                    const tab = tab_1.Tab.find(dndtabs_1.draggingTab);
                    if (tab && tab.pty) {
                        const { pty } = tab;
                        const args = [];
                        if (pty.rawPath)
                            args.push(pty.rawPath);
                        args.push(pty.path, ...pty.argv);
                        launch.value = shell_escape_1.default(args);
                        cwd = pty.cwd;
                        tempEnv = env = pty.env;
                        intercept = true;
                    }
                }
                else {
                    const { items } = e.dataTransfer;
                    if (items && items.length) {
                        // tslint:disable-next-line:prefer-for-of
                        for (let i = 0; i < items.length; i++) {
                            const item = items[i];
                            switch (item.kind) {
                                case 'file': {
                                    checkAndDropFile(item);
                                    intercept = true;
                                    break;
                                }
                            }
                        }
                        items.clear();
                    }
                }
                if (intercept)
                    domutils_1.interceptEvent(e);
                e.dataTransfer.clearData();
            } }),
        hyperscript_1.default("a", { className: "icon item", title: "Change Working Directory", onclick: selectCWD }, '\uf751'),
        hyperscript_1.default("a", { className: "icon item", title: "Environment Variables", onclick: toggleEnvPrompt }, '\ufb2d'),
        hyperscript_1.default("a", { className: "icon item", title: "Auto Pause", onclick: e => pause = e.target.classList.toggle('active') }, '\uf8e7'),
        hyperscript_1.default("a", { className: "icon item", title: "Launch in New Tab", onclick: () => doLaunch(false) }, '\ufc5a'),
        hyperscript_1.default("a", { className: "icon item", title: "Launch in New Window", onclick: () => doLaunch(true) }, '\ufab0'),
        hyperscript_1.default("a", { className: "icon item", title: "Hide", onclick: toggleOpen }, '\uf85f'))));
const envControl = document.body.appendChild(hyperscript_1.default("textarea", { className: "hidden prompt-field", onkeydown: e => {
        switch (e.which) {
            default: return;
            case 27: /* Escape */
                toggleEnvPrompt();
                break;
        }
        e.preventDefault();
    } }));
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
async function checkAndDropFile(item) {
    const path = item.getAsFile().path;
    if (!await pathutils_1.existsAsync(path))
        return;
    if ((await pathutils_1.lstatAsync(path)).isDirectory()) {
        cwd = path;
        return;
    }
    if (await pathutils_1.isExeAsync(path))
        launch.value = path;
}
function toggleOpen() {
    if (!launchBar.classList.toggle('hidden')) {
        cwd = electron_1.remote.app.getPath('home');
        tempEnv = env = undefined;
        launch.value = '';
        launch.focus();
    }
}
exports.toggleOpen = toggleOpen;
function acceptDrop(e) {
    domutils_1.interceptEvent(e);
    const { dataTransfer } = e;
    if (dndtabs_1.draggingTab) {
        dataTransfer.dropEffect = 'copy';
        return;
    }
    for (const type of dataTransfer.types)
        switch (type) {
            case 'Files':
                dataTransfer.dropEffect = 'link';
                return;
            case 'text':
                dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
                return;
        }
    dataTransfer.dropEffect = 'none';
}
function toggleEnvPrompt() {
    if (envControl.classList.toggle('hidden'))
        try {
            env = undefined;
            tempEnv = js_yaml_1.load(envControl.value);
            for (const key in tempEnv)
                if (process.env[key] !== tempEnv[key]) {
                    if (!env)
                        env = {};
                    env[key] = tempEnv[key];
                }
        }
        catch (_a) {
        }
    else
        try {
            if (!tempEnv)
                tempEnv = process.env;
            envControl.value = `# Press <ESC> to quit edit mode.\n# Only modified or new values will be passed to new session, others will remain as-is.\n\n${js_yaml_1.dump(tempEnv, {
                indent: 2,
            })}`;
        }
        catch (_b) {
        }
        finally {
            envControl.setSelectionRange(0, 0);
            envControl.focus();
        }
}
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
        env,
    }, newWindow);
}
//# sourceMappingURL=advanced-open.js.map