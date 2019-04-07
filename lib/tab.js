"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const codeToSignal = require("code-to-signal");
const electron_1 = require("electron");
const hyperscript_1 = __importDefault(require("hyperscript"));
const path_1 = require("path");
const xterm_1 = require("xterm");
const fit_1 = require("xterm/lib/addons/fit/fit");
const webLinks_1 = require("xterm/lib/addons/webLinks/webLinks");
const winptyCompat_1 = require("xterm/lib/addons/winptyCompat/winptyCompat");
const config_1 = require("./config");
const domutils_1 = require("./domutils");
class Tab {
    constructor(tabContainer, contentContainer, pause) {
        this.defaultTitle = 'Shell';
        this.pause = pause;
        this.terminal = new xterm_1.Terminal(config_1.configFile && config_1.configFile.terminal || {
            fontFamily: 'mononoki, monospace',
            cursorBlink: true,
        });
        webLinks_1.webLinksInit(this.terminal, (e, uri) => e.ctrlKey && electron_1.shell.openExternal(uri), {
            willLinkActivate: isCtrlKeyOn,
        });
        winptyCompat_1.winptyCompatInit(this.terminal);
        this.disposables = [];
        this.active = true;
        tabContainer.appendChild(this.tabElement = hyperscript_1.default("a", { className: "item", onclick: Tab.handleTabClick, onmouseup: Tab.handleTabMouseUp },
            hyperscript_1.default("span", { className: "icon" }, '\uf120'),
            this.tabContentText = hyperscript_1.default("span", { className: "title-text" }),
            hyperscript_1.default("a", { className: "close icon", onclick: e => {
                    e.preventDefault();
                    this.dispose();
                }, title: "Close Tab" }, '\uf655')));
        this.tabContent = hyperscript_1.default("div", { ondragenter: this.handleDragOver.bind(this), ondragover: this.handleDragOver.bind(this), ondrop: this.handleDrop.bind(this), className: "pty-container" });
        contentContainer.appendChild(this.tabContent);
        this.terminal.open(this.tabContent);
        this.terminal.element.addEventListener('mouseup', e => {
            if (e.button !== 1 || !this.terminal.hasSelection())
                return;
            domutils_1.interceptEvent(e);
            electron_1.clipboard.writeText(this.terminal.getSelection());
            this.terminal.clearSelection();
        }, true);
        this.onEnable();
        Tab.tabs.set(this.tabElement, this);
        window.dispatchEvent(new CustomEvent('newtab', { detail: this }));
    }
    static get tabCount() {
        return this.tabs.size;
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
    get processTitle() {
        const proc = this.pty && this.pty.process;
        return proc && proc.trim() || '';
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
            hyperscript_1.default("img", { src: `fileicon://${this.pty.resolvedPath}:small.png` }) :
            hyperscript_1.default("span", { className: "icon" }, '\uf120'), this.tabElement.firstChild);
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
        this.tabElement.classList.add('active');
        this.tabContent.classList.remove('inactive');
        this.terminal.focus();
        this.active = true;
        Tab.activeTab = this;
        setTitle(this.title);
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
        fit_1.fit(this.terminal);
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
    handleDisable() {
        if (this.tabElement)
            this.tabElement.classList.remove('active');
        if (this.tabContent)
            this.tabContent.classList.add('inactive');
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
exports.Tab = Tab;
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
window.addEventListener('close', Tab.destroyAllTabs);
window.addEventListener('resize', () => {
    if (Tab.activeTab && Tab.activeTab.terminal)
        fit_1.fit(Tab.activeTab.terminal);
});
//# sourceMappingURL=tab.js.map