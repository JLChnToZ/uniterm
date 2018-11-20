"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const h = require("hyperscript");
const path_1 = require("path");
const xterm_1 = require("xterm");
const fit_1 = require("xterm/lib/addons/fit/fit");
const webLinks_1 = require("xterm/lib/addons/webLinks/webLinks");
const winptyCompat_1 = require("xterm/lib/addons/winptyCompat/winptyCompat");
const config_1 = require("./config");
const pty_1 = require("./terminals/pty");
const wslpty_1 = require("./terminals/wslpty");
let rootContainer;
let tabContainer;
let addButton;
let maximizeIcon;
rootContainer = document.body.appendChild(h("div", { className: "pty-tabs" },
    h("div", { className: "ts top attached mini tabbed menu" },
        process.platform === 'darwin' ?
            h("div", { className: "window-control-mac" }) : null,
        tabContainer = h("div", { className: "flex" }, addButton = h("a", { className: "item", onclick: async () => {
                await config_1.loadConfig();
                new Tab().attach(createBackend({}));
            } },
            h("i", { className: "ts plus icon" }))),
        h("div", { className: "drag" }),
        process.platform !== 'darwin' ? (browserWindow => {
            browserWindow.on('maximize', changeMaximizeIcon);
            browserWindow.on('unmaximize', changeMaximizeIcon);
            browserWindow.on('restore', changeMaximizeIcon);
            return [
                h("a", { className: "item", onclick: () => browserWindow.minimize() },
                    h("i", { className: "ts window minimize icon" })),
                h("a", { className: "item", onclick: () => {
                        if (browserWindow.isMaximized())
                            browserWindow.unmaximize();
                        else
                            browserWindow.maximize();
                    } }, maximizeIcon = h("i", { className: "ts window maximize icon" })),
                h("a", { className: "negative item", onclick: () => browserWindow.close() },
                    h("i", { className: "ts close icon" })),
            ];
        })(electron_1.remote.getCurrentWindow()) : null)));
function changeMaximizeIcon() {
    if (maximizeIcon)
        maximizeIcon.className =
            `ts window ${electron_1.remote.getCurrentWindow().isMaximized() ? 'restore' : 'maximize'} icon`;
}
changeMaximizeIcon();
const tabs = new Set();
let activeTab;
config_1.events.on('config', () => {
    if (config_1.configFile && config_1.configFile.terminal)
        for (const tab of tabs)
            if (tab.terminal) {
                // tslint:disable-next-line:prefer-const
                for (let key in config_1.configFile.terminal)
                    if (key in config_1.configFile.terminal)
                        tab.terminal.setOption(key, config_1.configFile.terminal[key]);
                fit_1.fit(tab.terminal);
            }
});
class Tab {
    constructor() {
        this.defaultTitle = 'Shell';
        this.terminal = new xterm_1.Terminal(config_1.configFile && config_1.configFile.terminal || {
            fontFamily: 'powerlinesymbols, monospace',
            cursorBlink: true,
        });
        webLinks_1.webLinksInit(this.terminal, (e, uri) => electron_1.shell.openExternal(uri));
        winptyCompat_1.winptyCompatInit(this.terminal);
        this.disposables = [];
        this.active = true;
        tabContainer.insertBefore(this.tabElement = h("a", { className: "item", onclick: e => {
                e.preventDefault();
                e.stopPropagation();
                this.onEnable();
            } },
            '',
            h("a", { className: "ts small negative close button", onclick: e => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.dispose();
                } })), addButton);
        this.tabContent = h("div", { ondrop: async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const result = [];
                const stringData = [];
                const { items } = e.dataTransfer;
                if (items) {
                    // tslint:disable-next-line:prefer-for-of
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        switch (item.kind) {
                            case 'file':
                                result.push(item.getAsFile().path);
                                break;
                            case 'string':
                                if (item.type === 'text/plain')
                                    stringData.push(item);
                                break;
                        }
                    }
                    if (stringData.length)
                        this.pty.write((await Promise.all(stringData.map(getAsStringAsync))).join(''));
                    items.clear();
                }
                else {
                    const { files } = e.dataTransfer;
                    // tslint:disable-next-line:prefer-for-of
                    for (let i = 0; i < files.length; i++)
                        result.push(files[i].path);
                    e.dataTransfer.clearData();
                }
                this.pty.dropFiles(result);
            } });
        rootContainer.appendChild(this.tabContent);
        this.terminal.open(this.tabContent.appendChild(h("div", { className: "pty-container" })));
        this.onEnable();
        tabs.add(this);
    }
    async attach(pty) {
        if (this.pty || !this.terminal)
            return;
        if (pty.path)
            this.defaultTitle = path_1.extname(pty.path);
        this.pty = pty;
        this.disposables.push(this.terminal.addDisposableListener('data', this.onDataInput.bind(this)), this.terminal.addDisposableListener('resize', ({ cols, rows }) => this.pty.resize(cols, rows)), this.terminal.addDisposableListener('title', this.onTitle.bind(this)), attachDisposable(pty, 'data', this.onDataOutput.bind(this)), attachDisposable(pty, 'end', this.dispose.bind(this)));
        this.pty.resize(this.terminal.cols, this.terminal.rows);
        try {
            await this.pty.spawn();
        }
        catch (err) {
            this.throwError(`Oops... error while launching "${this.pty.path}": ${err.message || err}`);
        }
        this.onTitle(this.title);
    }
    throwError(message) {
        if (!this.terminal) {
            electron_1.remote.dialog.showErrorBox('Error', message);
            return;
        }
        this.terminal.writeln(message);
        this.terminal.writeln('Press any key to exit.');
        this.disposables.push(this.terminal.addDisposableListener('key', this.dispose.bind(this)));
    }
    onEnable() {
        this.tabElement.className = 'active item';
        this.tabContent.className = 'ts active bottom attached inverted tab segment';
        fit_1.fit(this.terminal);
        this.terminal.focus();
        this.active = true;
        activeTab = this;
        setTitle(this.title);
        for (const tab of tabs)
            if (tab && tab !== this)
                tab.onDisable();
    }
    onDisable() {
        if (this.tabElement)
            this.tabElement.className = 'item';
        if (this.tabContent)
            this.tabContent.className = 'ts bottom attached inverted tab segment';
        this.active = false;
    }
    onDataInput(text) {
        if (this.pty)
            this.pty.write(text, 'utf8');
    }
    onDataOutput(data) {
        if (this.terminal)
            this.terminal.write(Buffer.isBuffer(data) ? data.toString('utf8') : data);
    }
    onTitle(title) {
        this.title = title && title.trim() || this.pty && this.pty.process && this.pty.process.trim() || this.defaultTitle;
        if (this.tabElement)
            this.tabElement.firstChild.textContent = this.title;
        if (this.active)
            setTitle(this.title);
    }
    dispose() {
        tabs.delete(this);
        if (activeTab === this) {
            activeTab = [...tabs][0];
            if (activeTab)
                activeTab.onEnable();
        }
        if (this.pty) {
            this.pty.destroy();
            delete this.pty;
        }
        if (this.disposables) {
            for (const disposable of this.disposables)
                if (disposable)
                    disposable.dispose();
            this.disposables.length = 0;
        }
        if (this.tabContent) {
            this.tabContent.remove();
            delete this.tabContent;
        }
        if (this.tabElement) {
            this.tabElement.remove();
            delete this.tabElement;
        }
        if (!tabs.size)
            window.close();
    }
}
const originalTitle = document.title;
function setTitle(title) {
    if (title)
        document.title = `${title} - ${originalTitle}`;
    else
        document.title = originalTitle;
}
function attachDisposable(listener, key, callback) {
    listener.on(key, callback);
    return { dispose() {
            listener.removeListener(key, callback);
            callback = null;
        } };
}
function createBackend(options) {
    if (process.platform === 'win32' && options && options.path === 'wsl') {
        if (options.argv) {
            options.path = options.argv[0];
            options.argv = options.argv.slice(1);
        }
        else
            delete options.path;
        return new wslpty_1.WslPtyShell(options);
    }
    return new pty_1.PtyShell(options);
}
function destroyAllTabs() {
    for (const tab of tabs)
        if (tab)
            tab.dispose();
}
function getAsStringAsync(d) {
    return new Promise(resolve => d.getAsString(resolve));
}
electron_1.ipcRenderer.on('create-terminal', async (e, options) => {
    await config_1.loadConfig();
    const tab = new Tab();
    tab.attach(createBackend(options));
    if (tab.pty && (tab.pty instanceof wslpty_1.WslPtyShell))
        tab.title = 'WSL Shell';
    electron_1.remote.getCurrentWindow().focus();
});
window.addEventListener('beforeunload', e => {
    if (tabs.size > 1) {
        e.returnValue = false;
        electron_1.remote.dialog.showMessageBox(electron_1.remote.getCurrentWindow(), {
            type: 'question',
            title: 'Exit?',
            message: `There are still ${tabs.size} sessions are opened, do you really want to close?`,
            buttons: ['Yes', 'No'],
        }, response => {
            if (response === 0) {
                destroyAllTabs();
                window.close();
            }
        });
    }
});
window.addEventListener('close', destroyAllTabs);
window.addEventListener('resize', () => {
    if (activeTab && activeTab.terminal)
        fit_1.fit(activeTab.terminal);
});
document.body.addEventListener('dragover', e => e.preventDefault());
if (document.readyState !== 'complete')
    document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete')
            electron_1.ipcRenderer.send('ready');
    });
else
    electron_1.ipcRenderer.send('ready');
config_1.startWatch();
//# sourceMappingURL=renderer.js.map