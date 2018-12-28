"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const codeToSignal = require("code-to-signal");
const electron_1 = require("electron");
const h = require("hyperscript");
const path_1 = require("path");
const url_1 = require("url");
const xterm_1 = require("xterm");
const fit_1 = require("xterm/lib/addons/fit/fit");
const webLinks_1 = require("xterm/lib/addons/webLinks/webLinks");
const winptyCompat_1 = require("xterm/lib/addons/winptyCompat/winptyCompat");
const config_1 = require("./config");
const remote_wrapper_1 = require("./remote-wrapper");
const selector_1 = require("./terminals/selector");
const addButton = h("a", { className: "item", onclick: async () => {
        await config_1.loadConfig();
        new Tab().attach(selector_1.createBackend({
            cwd: remote_wrapper_1.electron.app.getPath('home'),
        }));
    }, title: "Add Tab" },
    h("i", { className: "ts plus icon" }));
const tabContainer = h("div", { className: "flex" }, addButton);
let maximizeIcon;
const rootContainer = document.body.appendChild(h("div", { className: "pty-tabs" },
    h("div", { className: "ts top attached mini tabbed menu" },
        process.platform === 'darwin' ?
            h("div", { className: "window-control-mac" }) : null,
        tabContainer,
        h("div", { className: "drag" }),
        h("a", { className: "item", onclick: () => electron_1.ipcRenderer.send('show-config'), title: "Config" },
            h("i", { className: "ts setting icon" })),
        process.platform !== 'darwin' ? (browserWindow => {
            browserWindow.on('maximize', changeMaximizeIcon);
            browserWindow.on('unmaximize', changeMaximizeIcon);
            browserWindow.on('restore', changeMaximizeIcon);
            return [
                h("a", { className: "item", onclick: () => browserWindow.minimize(), title: "Minimize" },
                    h("i", { className: "ts window minimize icon" })),
                h("a", { className: "item", onclick: () => {
                        if (browserWindow.isMaximized())
                            browserWindow.unmaximize();
                        else
                            browserWindow.maximize();
                    }, title: "Maximize" }, maximizeIcon = h("i", { className: "ts window maximize icon" })),
                h("a", { className: "negative item", onclick: () => browserWindow.close(), title: "Close" },
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
let ctrlKeyDown = false;
config_1.events.on('config', () => {
    window.dispatchEvent(new CustomEvent('configreload', {}));
    if (!config_1.configFile)
        return;
    if (config_1.configFile.terminal) {
        const { terminal: options } = config_1.configFile;
        if (tabs.size) {
            const keys = Object.keys(options);
            for (const tab of tabs) {
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
            loadScript(url_1.resolve('userdata/', mod));
});
class Tab {
    constructor(pause) {
        this.defaultTitle = 'Shell';
        this.pause = pause;
        this.terminal = new xterm_1.Terminal(config_1.configFile && config_1.configFile.terminal || {
            fontFamily: 'powerlinesymbols, monospace',
            cursorBlink: true,
        });
        webLinks_1.webLinksInit(this.terminal, (e, uri) => ctrlKeyDown && electron_1.shell.openExternal(uri), {
            tooltipCallback: () => ctrlKeyDown,
            willLinkActivate: () => ctrlKeyDown,
        });
        winptyCompat_1.winptyCompatInit(this.terminal);
        this.disposables = [];
        this.active = true;
        tabContainer.insertBefore(this.tabElement = h("a", { className: "item", onclick: e => {
                interceptEvent(e);
                this.onEnable();
            } },
            h("i", { className: "ts terminal icon" }),
            this.tabContentText = h("span", { className: "title-text" }),
            h("a", { className: "ts small negative close button", onclick: e => {
                    interceptEvent(e);
                    this.dispose();
                }, title: "Close Tab" })), addButton);
        this.tabContent = h("div", { ondragenter: this.handleDragOver.bind(this), ondragover: this.handleDragOver.bind(this), ondrop: this.handleDrop.bind(this) });
        rootContainer.appendChild(this.tabContent);
        this.terminal.open(this.tabContent.appendChild(h("div", { className: "pty-container" })));
        this.onEnable();
        tabs.add(this);
        window.dispatchEvent(new CustomEvent('newtab', { detail: this }));
    }
    async attach(pty) {
        if (this.pty || !this.terminal)
            return;
        if (pty.path)
            this.defaultTitle = path_1.extname(pty.path);
        this.pty = pty;
        this.disposables.push(this.terminal.addDisposableListener('data', this.handleDataInput.bind(this)), this.terminal.addDisposableListener('resize', ({ cols, rows }) => this.pty.resize(cols, rows)), this.terminal.addDisposableListener('title', title => {
            this.explicitTitle = !!title;
            this.handleTitleChange(title);
        }), attachDisposable(pty, 'data', this.handleDataOutput.bind(this)), attachDisposable(pty, 'error', err => this.printDisposableMessage(`Oops... error: ${err.message || err}`)), attachDisposable(pty, 'end', this.pause ?
            ((code, signal) => this.printDisposableMessage(`\n\nProgram exits with ${code} ${codeToSignal(signal) || ''}`)) :
            this.dispose.bind(this)));
        this.pty.resize(this.terminal.cols, this.terminal.rows);
        try {
            await this.pty.spawn();
        }
        catch (err) {
            this.printDisposableMessage(`Oops... error while launching "${this.pty.path}": ${err.message || err}`);
        }
        window.dispatchEvent(new CustomEvent('tabattached', { detail: this }));
        this.handleTitleChange(this.title);
        this.tabElement.firstChild.remove();
        this.tabElement.insertBefore((this.pty && this.pty.resolvedPath) ?
            h("img", { src: `fileicon://${this.pty.resolvedPath}:small.png` }) :
            h("i", { className: "ts terminal icon" }), this.tabElement.firstChild);
    }
    printDisposableMessage(message, isError = true) {
        if (!this.terminal && isError) {
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
                tab.handleDisable();
    }
    dispose() {
        window.dispatchEvent(new CustomEvent('tabdispose', { detail: this }));
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
    handleDisable() {
        if (this.tabElement)
            this.tabElement.className = 'item';
        if (this.tabContent)
            this.tabContent.className = 'ts bottom attached inverted tab segment';
        this.active = false;
    }
    handleTitleChange(title) {
        this.title = title && title.trim() || this.processTitle || this.defaultTitle;
        if (this.tabContentText) {
            this.tabContentText.textContent = this.title;
            this.tabContentText.title = this.title;
        }
        if (this.active)
            setTitle(this.title);
    }
    get processTitle() {
        const proc = this.pty && this.pty.process;
        return proc && proc.trim() || '';
    }
    handleDataInput(text) {
        if (this.pty)
            this.pty.write(text, 'utf8');
        if (!this.explicitTitle)
            this.handleTitleChange();
    }
    handleDataOutput(data) {
        if (this.terminal)
            this.terminal.write(Buffer.isBuffer(data) ? data.toString('utf8') : data);
    }
    handleDragOver(e) {
        interceptEvent(e);
        const { dataTransfer } = e;
        for (const type of dataTransfer.types)
            switch (type) {
                case 'text':
                case 'text/plain':
                    dataTransfer.dropEffect = 'copy';
                    return;
                case 'Files':
                    dataTransfer.dropEffect = 'link';
                    return;
            }
        dataTransfer.dropEffect = 'none';
    }
    async handleDrop(e) {
        interceptEvent(e);
        const result = [];
        const stringData = [];
        const { items } = e.dataTransfer;
        if (items && items.length) {
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
        e.dataTransfer.clearData();
        this.pty.dropFiles(result);
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
function destroyAllTabs() {
    for (const tab of tabs)
        if (tab)
            tab.dispose();
}
function getAsStringAsync(d) {
    return new Promise(resolve => d.getAsString(resolve));
}
function loadScript(src) {
    const script = h("script", { async: true, src: src });
    document.head.appendChild(script);
    document.head.removeChild(script);
    return script;
}
function interceptEvent(e) {
    e.preventDefault();
    e.stopPropagation();
}
function interceptDrop(e) {
    interceptEvent(e);
    e.dataTransfer.dropEffect = 'none';
}
electron_1.ipcRenderer.on('create-terminal', async (e, options) => {
    await config_1.loadConfig();
    const tab = new Tab(options.pause);
    tab.attach(selector_1.createBackend(options));
    electron_1.remote.getCurrentWindow().focus();
});
window.addEventListener('beforeunload', e => {
    if (tabs.size > 1 && electron_1.remote.dialog.showMessageBox(electron_1.remote.getCurrentWindow(), {
        type: 'question',
        title: 'Exit?',
        message: `There are still ${tabs.size} sessions are opened, do you really want to close?`,
        buttons: ['Yes', 'No'],
    }))
        e.returnValue = false;
});
window.addEventListener('close', destroyAllTabs);
window.addEventListener('resize', () => {
    if (activeTab && activeTab.terminal)
        fit_1.fit(activeTab.terminal);
});
document.body.addEventListener('dragenter', interceptDrop);
document.body.addEventListener('dragover', interceptDrop);
function detectCtrlKey(e) {
    ctrlKeyDown = e.ctrlKey;
}
document.body.addEventListener('keydown', detectCtrlKey, true);
document.body.addEventListener('keyup', detectCtrlKey, true);
if (document.readyState !== 'complete')
    document.addEventListener('readystatechange', () => {
        if (document.readyState === 'complete')
            electron_1.ipcRenderer.send('ready');
    });
else
    electron_1.ipcRenderer.send('ready');
config_1.startWatch();
// Expose everything for mods, except for requirable stuffs
Object.assign(window, { tabs, Tab, electron: remote_wrapper_1.electron });
Object.defineProperty(window, 'activeTab', {
    get() { return activeTab; },
    set(value) {
        if (!(value instanceof Tab))
            return;
        activeTab = value;
        activeTab.onEnable();
    },
});
//# sourceMappingURL=renderer.js.map