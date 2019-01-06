"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const codeToSignal = require("code-to-signal");
const electron_1 = require("electron");
const h = require("hyperscript");
const path_1 = require("path");
const xterm_1 = require("xterm");
const fit_1 = require("xterm/lib/addons/fit/fit");
const webLinks_1 = require("xterm/lib/addons/webLinks/webLinks");
const winptyCompat_1 = require("xterm/lib/addons/winptyCompat/winptyCompat");
const config_1 = require("./config");
const domutils_1 = require("./domutils");
const key_detector_1 = require("./key-detector");
let tabContainer;
let contentContainer;
function setContainers(newTabContainer, newContentContainer) {
    tabContainer = newTabContainer;
    contentContainer = newContentContainer;
}
exports.setContainers = setContainers;
class Tab {
    constructor(pause) {
        this.defaultTitle = 'Shell';
        this.pause = pause;
        this.terminal = new xterm_1.Terminal(config_1.configFile && config_1.configFile.terminal || {
            fontFamily: 'powerlinesymbols, monospace',
            cursorBlink: true,
        });
        webLinks_1.webLinksInit(this.terminal, (e, uri) => key_detector_1.ctrlKey && electron_1.shell.openExternal(uri), {
            tooltipCallback: () => key_detector_1.ctrlKey,
            willLinkActivate: () => key_detector_1.ctrlKey,
        });
        winptyCompat_1.winptyCompatInit(this.terminal);
        this.disposables = [];
        this.active = true;
        tabContainer.appendChild(this.tabElement = h("a", { className: "item", onclick: e => {
                domutils_1.interceptEvent(e);
                this.onEnable();
            } },
            h("span", { className: "icon" }, '\uf120'),
            this.tabContentText = h("span", { className: "title-text" }),
            h("a", { className: "close icon", onclick: e => {
                    domutils_1.interceptEvent(e);
                    this.dispose();
                }, title: "Close Tab" }, '\uf655')));
        this.tabContent = h("div", { ondragenter: this.handleDragOver.bind(this), ondragover: this.handleDragOver.bind(this), ondrop: this.handleDrop.bind(this), className: "pty-container" });
        contentContainer.appendChild(this.tabContent);
        this.terminal.open(this.tabContent);
        this.onEnable();
        Tab.tabs.add(this);
        window.dispatchEvent(new CustomEvent('newtab', { detail: this }));
    }
    static get tabCount() {
        return this.tabs.size;
    }
    static destroyAllTabs() {
        for (const tab of this.tabs)
            if (tab)
                tab.dispose();
    }
    static allTabs() {
        return this.tabs[Symbol.iterator]();
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
            h("img", { src: `fileicon://${this.pty.resolvedPath}:small.png` }) :
            h("span", { className: "icon" }, '\uf120'), this.tabElement.firstChild);
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
        fit_1.fit(this.terminal);
        this.terminal.focus();
        this.active = true;
        Tab.activeTab = this;
        setTitle(this.title);
        for (const tab of Tab.tabs)
            if (tab && tab !== this)
                tab.handleDisable();
        setTimeout(fit_1.fit, 100, this.terminal);
    }
    dispose() {
        window.dispatchEvent(new CustomEvent('tabdispose', { detail: this }));
        Tab.tabs.delete(this);
        if (Tab.activeTab === this) {
            Tab.activeTab = [...Tab.tabs][0];
            if (Tab.activeTab)
                Tab.activeTab.onEnable();
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
        if (!Tab.tabs.size)
            window.close();
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
Tab.tabs = new Set();
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
window.addEventListener('close', Tab.destroyAllTabs);
window.addEventListener('resize', () => {
    if (Tab.activeTab && Tab.activeTab.terminal)
        fit_1.fit(Tab.activeTab.terminal);
});
//# sourceMappingURL=tab.js.map