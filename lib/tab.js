"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Tab = void 0;
const tslib_1 = require("tslib");
const code_to_signal_1 = tslib_1.__importDefault(require("code-to-signal"));
const electron_1 = require("electron");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const xterm_1 = require("xterm");
const xterm_addon_fit_1 = require("xterm-addon-fit");
const xterm_addon_ligatures_1 = require("xterm-addon-ligatures");
const xterm_addon_web_links_1 = require("xterm-addon-web-links");
const xterm_addon_webgl_1 = require("xterm-addon-webgl");
const config_1 = require("./config");
const decorators_1 = require("./decorators");
const domutils_1 = require("./domutils");
let Tab = /** @class */ (() => {
    class Tab {
        constructor(tabContainer, contentContainer, pause) {
            this.defaultTitle = 'Shell';
            this.pause = pause;
            this.terminal = new xterm_1.Terminal(config_1.configFile && config_1.configFile.terminal || {
                fontFamily: 'mononoki, monospace',
                cursorBlink: true,
            });
            this.terminal.loadAddon(new xterm_addon_web_links_1.WebLinksAddon((e, uri) => e.ctrlKey && electron_1.shell.openExternal(uri), {
                willLinkActivate: isCtrlKeyOn,
            }));
            this.terminal.loadAddon(this.autoFit = new xterm_addon_fit_1.FitAddon());
            this.disposables = [];
            this.active = true;
            tabContainer.appendChild(this.tabElement = hyperscript_1.default("a", { className: "item", onclick: Tab.handleTabClick, onauxclick: Tab.handleTabMouseUp, draggable: true },
                hyperscript_1.default("span", { className: "icon" }, '\ufbab'),
                this.tabContentText = hyperscript_1.default("span", { className: "title-text" }),
                hyperscript_1.default("a", { className: "close icon", onclick: e => {
                        e.preventDefault();
                        this.dispose();
                    }, title: "Close Tab" }, '\uf655')));
            this.tabContent = hyperscript_1.default("div", { ondragenter: this.handleDragOver, ondragover: this.handleDragOver, ondrop: this.handleDrop, className: "pty-container" });
            contentContainer.appendChild(this.tabContent);
            this.terminal.open(this.tabContent);
            if (config_1.configFile && config_1.configFile.misc && config_1.configFile.misc.webGL)
                this.terminal.loadAddon(new xterm_addon_webgl_1.WebglAddon());
            this.terminal.loadAddon(new xterm_addon_ligatures_1.LigaturesAddon());
            this.terminal.element.addEventListener('mouseup', e => {
                if (e.button !== 1 || !this.terminal.hasSelection())
                    return;
                domutils_1.interceptEvent(e);
                electron_1.clipboard.writeText(this.terminal.getSelection());
                this.terminal.clearSelection();
            }, true);
            this.onEnable();
            Tab.tabs.set(this.tabElement, this);
            if (Tab.tabCount === 1)
                onFirstTabCreated(this.terminal);
            window.dispatchEvent(new CustomEvent('newtab', { detail: this }));
        }
        static get tabCount() {
            return this.tabs.size;
        }
        get processTitle() {
            const proc = this.pty && this.pty.process;
            return proc && proc.trim() || '';
        }
        static destroyAllTabs() {
            for (const tab of this.tabs.values())
                if (tab)
                    tab.dispose();
        }
        static allTabs() {
            return this.tabs.values();
        }
        static find(tabHeader) {
            return this.tabs.get(tabHeader);
        }
        static handleTabClick(e) {
            const tab = Tab.tabs.get(this);
            if (!tab)
                return;
            e.preventDefault();
            tab.onEnable();
        }
        static handleTabMouseUp(e) {
            const tab = Tab.tabs.get(this);
            if (!tab || e.button !== 1)
                return;
            e.preventDefault();
            tab.dispose();
        }
        get titlePrefix() { return this._titlePrefix || ''; }
        set titlePrefix(value) {
            this._titlePrefix = value;
            this.handleTitleChange(this.title);
        }
        async attach(pty) {
            if (this.pty || !this.terminal)
                return;
            if (pty.path)
                this.defaultTitle = path_1.basename(pty.path);
            this.pty = pty;
            this.disposables.push(this.terminal.onData(this.handleDataInput), this.terminal.onResize(({ cols, rows }) => this.pty.resize(cols, rows)), this.terminal.onTitleChange(title => {
                this.explicitTitle = !!title;
                this.handleTitleChange(title);
            }), attachDisposable(pty, 'data', this.handleDataOutput), attachDisposable(pty, 'error', err => this.printDisposableMessage(`Oops... error: ${err.message || err}`)), attachDisposable(pty, 'end', (code, signal) => {
                if (this.pause)
                    this.printDisposableMessage(`Program exits with ${code} ${code_to_signal_1.default(signal) || ''}`, false);
                else
                    this.dispose();
            }));
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
                hyperscript_1.default("img", { src: `fileicon://${this.pty.resolvedPath}:small.png` }) :
                hyperscript_1.default("span", { className: "icon" }, '\uf68c'), this.tabElement.firstChild);
        }
        printDisposableMessage(message, isError = true) {
            if (!this.terminal) {
                if (isError)
                    electron_1.remote.dialog.showErrorBox('Error', message);
                return;
            }
            let icon = this.tabElement.firstChild;
            if (!icon.classList.contains('icon')) {
                icon.remove();
                icon = this.tabElement.insertBefore(hyperscript_1.default("span", { className: "icon" }), this.tabElement.firstChild);
            }
            icon.textContent = isError ? '\ufb99' : '\uf705';
            this.terminal.writeln(`\r\n\r\nUniterm: ${message}\r\nPress any key to close this tab.`);
            this.disposables.push(this.terminal.onKey(this.dispose));
        }
        onEnable() {
            this.tabElement.classList.add('active');
            this.tabContent.classList.remove('inactive');
            this.terminal.focus();
            this.active = true;
            Tab.activeTab = this;
            setTitle(this.title);
            if (this.pendingUpdateOptions) {
                this.updateSettings(this.pendingUpdateOptions);
                delete this.pendingUpdateOptions;
            }
            const { parentElement } = this.tabElement;
            if (parentElement) {
                const { children } = parentElement;
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < children.length; i++) {
                    if (children[i] === this.tabElement)
                        continue;
                    const tab = Tab.tabs.get(children[i]);
                    if (tab)
                        tab.handleDisable();
                }
            }
            this.autoFit.fit();
            // Workaround for https://github.com/xtermjs/xterm.js/issues/291
            this.terminal._onScroll.fire(this.terminal.buffer.viewportY);
            window.dispatchEvent(new CustomEvent('tabswitched', { detail: this }));
        }
        dispose() {
            window.dispatchEvent(new CustomEvent('tabdispose', { detail: this }));
            Tab.tabs.delete(this.tabElement);
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
            let tabElementParent;
            if (this.tabElement) {
                tabElementParent = this.tabElement.parentElement;
                this.tabElement.remove();
                delete this.tabElement;
            }
            if (!Tab.tabs.size) {
                window.close();
                return;
            }
            if (!this.active)
                return;
            if (tabElementParent) {
                const { children } = tabElementParent;
                // tslint:disable-next-line:prefer-for-of
                for (let i = 0; i < children.length; i++) {
                    const tab = Tab.tabs.get(children[i]);
                    if (tab) {
                        Tab.activeTab = tab;
                        tab.onEnable();
                        return;
                    }
                }
            }
            Tab.activeTab = Tab.tabs.values().next().value;
            if (Tab.activeTab)
                Tab.activeTab.onEnable();
        }
        fit() {
            this.autoFit.fit();
        }
        updateSettings(options) {
            if (!this.active) {
                this.pendingUpdateOptions = options;
                return;
            }
            if (!this.terminal)
                return;
            Object.entries(options).forEach(updateTerminalOptions, this.terminal);
        }
        handleDisable() {
            if (this.tabElement)
                this.tabElement.classList.remove('active');
            if (this.tabContent)
                this.tabContent.classList.add('inactive');
            this.active = false;
        }
        handleTitleChange(title) {
            this.title = title && title.trim() || this.processTitle || this.defaultTitle;
            const fixedTitle = this._titlePrefix ? `${this._titlePrefix} - [${this.title}]` : this.title;
            if (this.tabContentText) {
                this.tabContentText.textContent = fixedTitle;
                this.tabContentText.title = fixedTitle;
            }
            if (this.active)
                setTitle(fixedTitle);
        }
        handleDataInput(text) {
            if (this.pty)
                this.pty.write(text, 'utf8');
            if (!this.explicitTitle)
                this.handleTitleChange();
        }
        handleDataOutput(data) {
            if (!this.terminal)
                return;
            if (Buffer.isBuffer(data))
                this.terminal.writeUtf8(data);
            else
                this.terminal.write(data);
        }
        handleDragOver(e) {
            domutils_1.interceptEvent(e);
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
            domutils_1.interceptEvent(e);
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
                    this.pty.write((await Promise.all(stringData.map(domutils_1.getAsStringAsync))).join(''));
                items.clear();
            }
            e.dataTransfer.clearData();
            this.pty.dropFiles(result);
        }
    }
    Tab.tabs = new Map();
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], Tab.prototype, "dispose", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], Tab.prototype, "handleTitleChange", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], Tab.prototype, "handleDataInput", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], Tab.prototype, "handleDataOutput", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], Tab.prototype, "handleDragOver", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], Tab.prototype, "handleDrop", null);
    return Tab;
})();
exports.Tab = Tab;
function onFirstTabCreated(terminal) {
    try {
        let cols = 80;
        let rows = 25;
        if (config_1.configFile.misc) {
            const { initialCols, initialRows } = config_1.configFile.misc;
            if (initialCols > 0)
                cols = initialCols;
            if (initialRows > 0)
                rows = initialRows;
        }
        const { actualCellWidth, actualCellHeight } = terminal._core._renderService.dimensions;
        const { width, height } = window.getComputedStyle(terminal.element.querySelector('.xterm-screen'));
        const browserWindow = electron_1.remote.getCurrentWindow();
        browserWindow.setSize(window.outerWidth - parseInt(width, 10) + actualCellWidth * cols, window.outerHeight - parseInt(height, 10) + actualCellHeight * rows);
        browserWindow.center();
    }
    catch (e) {
        console.error(e);
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
function isCtrlKeyOn(e) {
    return e.ctrlKey;
}
function updateTerminalOptions([key, value]) {
    try {
        if (this.getOption(key) !== value)
            this.setOption(key, value);
    }
    catch (e) {
        console.warn(e);
    }
}
window.addEventListener('close', Tab.destroyAllTabs);
rxjs_1.fromEvent(window, 'resize').pipe(operators_1.debounceTime(250)).subscribe(() => {
    if (Tab.activeTab && Tab.activeTab.terminal)
        Tab.activeTab.fit();
});
//# sourceMappingURL=tab.js.map