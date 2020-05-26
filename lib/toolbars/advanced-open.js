"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchBar = void 0;
const tslib_1 = require("tslib");
const argv_split_1 = tslib_1.__importDefault(require("argv-split"));
const default_shell_1 = tslib_1.__importDefault(require("default-shell"));
const electron_1 = require("electron");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const js_yaml_1 = require("js-yaml");
const path_1 = require("path");
const shell_escape_1 = tslib_1.__importDefault(require("shell-escape"));
const dndtabs_1 = require("../dndtabs");
const domutils_1 = require("../domutils");
const pathutils_1 = require("../pathutils");
const tab_1 = require("../tab");
const base_1 = require("./base");
const decorators_1 = require("../decorators");
let AdvancedOpen = /** @class */ (() => {
    class AdvancedOpen extends base_1.Toolbar {
        constructor() {
            super();
            this.pause = false;
            this.cwd = electron_1.remote.app.getPath('home');
            this.envControl = document.body.appendChild(hyperscript_1.default("textarea", { className: "hidden prompt-field", onkeydown: e => {
                    switch (e.which) {
                        default: return;
                        case 27:
                            this.toggleEnvPrompt();
                            break;
                    }
                    e.preventDefault();
                } }));
        }
        render() {
            return [
                hyperscript_1.default("a", { className: "icon item", title: "Select Shell", onclick: this.selectShell }, '\uf68c'),
                this.launch = hyperscript_1.default("input", { type: "text", className: "open input", placeholder: default_shell_1.default, onkeydown: e => {
                        switch (e.which) {
                            default: return;
                            case 27: /* Escape */
                                this.hide();
                                break;
                            case 13: /* Enter */
                                this.doLaunch(e.shiftKey);
                                break;
                        }
                        e.preventDefault();
                    }, ondragenter: this.acceptDrop, ondragover: this.acceptDrop, ondrop: e => {
                        let intercept = false;
                        if (dndtabs_1.draggingTab) {
                            const tab = tab_1.Tab.find(dndtabs_1.draggingTab);
                            if (tab && tab.pty) {
                                const { pty } = tab;
                                const args = [];
                                if (pty.rawPath)
                                    args.push(pty.rawPath);
                                args.push(pty.path, ...pty.argv);
                                this.launch.value = shell_escape_1.default(args);
                                this.cwd = pty.cwd;
                                this.tempEnv = this.env = pty.env;
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
                                            this.checkAndDropFile(item);
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
                hyperscript_1.default("a", { className: "icon item", title: "Change Working Directory", onclick: this.selectCWD }, '\uf751'),
                hyperscript_1.default("a", { className: "icon item", title: "Environment Variables", onclick: this.toggleEnvPrompt }, '\ufb2d'),
                hyperscript_1.default("a", { className: "icon item", title: "Auto Pause", onclick: e => this.pause = e.target.classList.toggle('active') }, '\uf8e7'),
                hyperscript_1.default("a", { className: "icon item", title: "Launch in New Tab", onclick: () => this.doLaunch(false) }, '\ufc5a'),
                hyperscript_1.default("a", { className: "icon item", title: "Launch in New Window", onclick: () => this.doLaunch(true) }, '\ufab0'),
            ];
        }
        async selectCWD() {
            const result = await electron_1.remote.dialog.showOpenDialog(electron_1.remote.getCurrentWindow(), {
                title: 'Select Working Directory',
                properties: ['openDirectory'],
                defaultPath: this.cwd,
            });
            if (result.canceled)
                return;
            this.cwd = result.filePaths[0];
        }
        async selectShell() {
            const filters = [{
                    name: 'All Files',
                    extensions: ['*'],
                }];
            if (process.platform === 'win32')
                filters.unshift({
                    name: 'Executables',
                    extensions: process.env.PATHEXT.split(path_1.delimiter).map(ext => ext.replace(/[\*\.]/g, '')),
                });
            const pathInfo = await this.getPath();
            const result = await electron_1.remote.dialog.showOpenDialog(electron_1.remote.getCurrentWindow(), {
                title: 'Select Shell',
                properties: ['openFile'],
                filters,
                defaultPath: pathInfo && pathInfo.path || undefined,
            });
            if (result.canceled)
                return;
            this.launch.value = result.filePaths[0];
        }
        async checkAndDropFile(item) {
            const path = item.getAsFile().path;
            if (!await pathutils_1.existsAsync(path))
                return;
            if ((await pathutils_1.lstatAsync(path)).isDirectory()) {
                this.cwd = path;
                return;
            }
            if (await pathutils_1.isExeAsync(path))
                this.launch.value = path;
        }
        onShown() {
            super.onShown();
            this.cwd = electron_1.remote.app.getPath('home');
            this.tempEnv = this.env = undefined;
            this.launch.value = '';
            this.launch.focus();
        }
        acceptDrop(e) {
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
        toggleEnvPrompt() {
            if (this.envControl.classList.toggle('hidden'))
                try {
                    this.env = undefined;
                    this.tempEnv = js_yaml_1.load(this.envControl.value);
                    for (const key in this.tempEnv)
                        if (process.env[key] !== this.tempEnv[key]) {
                            if (!this.env)
                                this.env = {};
                            this.env[key] = this.tempEnv[key];
                        }
                }
                catch (_a) {
                }
            else
                try {
                    if (!this.tempEnv)
                        this.tempEnv = process.env;
                    this.envControl.value = `# Press <ESC> to quit edit mode.
# Only modified or new values will be passed to new session, others will remain as-is.

${js_yaml_1.dump(this.tempEnv, {
                        indent: 2,
                    })}`;
                }
                catch (_b) {
                }
                finally {
                    this.envControl.setSelectionRange(0, 0);
                    this.envControl.focus();
                }
        }
        async getPath(forgiveBackend) {
            let path = this.launch.value.trim() || this.launch.placeholder;
            let argv;
            if (await pathutils_1.existsAsync(path))
                return { path, argv: [] };
            argv = argv_split_1.default(path);
            path = argv.shift();
            if (!forgiveBackend && !await pathutils_1.existsAsync(path))
                return;
            return { path, argv };
        }
        async doLaunch(newWindow) {
            if (!this.createTab)
                return;
            this.hide();
            const pathInfo = await this.getPath(true);
            this.createTab({
                path: pathInfo && pathInfo.path || default_shell_1.default,
                argv: pathInfo && pathInfo.argv,
                cwd: this.cwd,
                pause: this.pause,
                env: this.env,
            }, newWindow);
        }
    }
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], AdvancedOpen.prototype, "selectCWD", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], AdvancedOpen.prototype, "selectShell", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], AdvancedOpen.prototype, "checkAndDropFile", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], AdvancedOpen.prototype, "toggleEnvPrompt", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], AdvancedOpen.prototype, "doLaunch", null);
    return AdvancedOpen;
})();
exports.launchBar = new AdvancedOpen();
//# sourceMappingURL=advanced-open.js.map