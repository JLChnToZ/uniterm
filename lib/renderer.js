"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
var h = require("hyperscript");
var xterm_1 = require("xterm");
var pty_1 = require("./terminals/pty");
var wslpty_1 = require("./terminals/wslpty");
xterm_1.Terminal.applyAddon(require('xterm/lib/addons/fit/fit'));
xterm_1.Terminal.applyAddon(require('xterm/lib/addons/fullscreen/fullscreen'));
xterm_1.Terminal.applyAddon(require('xterm/lib/addons/search/search'));
xterm_1.Terminal.applyAddon(require('xterm/lib/addons/webLinks/webLinks'));
xterm_1.Terminal.applyAddon(require('xterm/lib/addons/winptyCompat/winptyCompat'));
var rootContainer = document.body.appendChild(h("div", { className: "pty-tabs" }));
var tabContainer = rootContainer.appendChild(h("div", { className: "ts top attached mini tabbed menu" }));
var addButton = tabContainer.appendChild(h("a", { className: "item", onclick: function () { return new Tab().attach(createBackend({})); } },
    h("i", { className: "ts plus icon" })));
var tabs = new Set();
var activeTab;
var Tab = /** @class */ (function () {
    function Tab() {
        var _this = this;
        this.terminal = new xterm_1.Terminal({
            fontFamily: 'powerlinesymbols, monospace'
        });
        this.disposables = [];
        this.active = true;
        tabContainer.insertBefore(this.tabElement = h("a", { className: "item", onclick: this.onEnable.bind(this) },
            '',
            h("a", { className: "ts small negative close button", onclick: this.dispose.bind(this) })), addButton);
        this.tabContent = h("div", { ondrop: function (e) { return __awaiter(_this, void 0, void 0, function () {
                var result, stringData, items, i, item, _a, _b, files, i;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            e.preventDefault();
                            e.stopPropagation();
                            result = [];
                            stringData = [];
                            items = e.dataTransfer.items;
                            if (!items) return [3 /*break*/, 3];
                            for (i = 0; i < items.length; i++) {
                                item = items[i];
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
                            if (!stringData.length) return [3 /*break*/, 2];
                            _b = (_a = this.pty).write;
                            return [4 /*yield*/, Promise.all(stringData.map(getAsStringAsync))];
                        case 1:
                            _b.apply(_a, [(_c.sent()).join('')]);
                            _c.label = 2;
                        case 2:
                            items.clear();
                            return [3 /*break*/, 4];
                        case 3:
                            files = e.dataTransfer.files;
                            for (i = 0; i < files.length; i++)
                                result.push(files[i].path);
                            e.dataTransfer.clearData();
                            _c.label = 4;
                        case 4:
                            this.pty.dropFiles(result);
                            return [2 /*return*/];
                    }
                });
            }); } });
        rootContainer.appendChild(this.tabContent);
        this.terminal.open(this.tabContent.appendChild(h("div", { className: "pty-container" })));
        this.onEnable();
        tabs.add(this);
    }
    Tab.prototype.attach = function (pty) {
        var _this = this;
        if (this.pty || !this.terminal)
            return;
        this.pty = pty;
        this.disposables.push(this.terminal.addDisposableListener('data', this.onDataInput.bind(this)), this.terminal.addDisposableListener('resize', function (_a) {
            var cols = _a.cols, rows = _a.rows;
            return _this.pty.resize(cols, rows);
        }), this.terminal.addDisposableListener('title', this.onTitle.bind(this)), attachDisposable(pty, 'data', this.onDataOutput.bind(this)), attachDisposable(pty, 'end', this.dispose.bind(this)));
        this.pty.resize(this.terminal.cols, this.terminal.rows);
        this.pty.spawn();
        this.onTitle(pty.process);
    };
    Tab.prototype.onEnable = function () {
        var e_1, _a;
        this.tabElement.className = 'active item';
        this.tabContent.className = 'ts active bottom attached inverted tab segment';
        this.terminal.fit();
        this.terminal.focus();
        this.active = true;
        activeTab = this;
        setTitle(this.title);
        try {
            for (var tabs_1 = __values(tabs), tabs_1_1 = tabs_1.next(); !tabs_1_1.done; tabs_1_1 = tabs_1.next()) {
                var tab = tabs_1_1.value;
                if (tab && tab !== this)
                    tab.onDisable();
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (tabs_1_1 && !tabs_1_1.done && (_a = tabs_1.return)) _a.call(tabs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    Tab.prototype.onDisable = function () {
        this.tabElement.className = 'item';
        this.tabContent.className = 'ts bottom attached inverted tab segment';
        this.active = false;
    };
    Tab.prototype.onDataInput = function (text) {
        this.pty && this.pty.write(text, 'utf8');
    };
    Tab.prototype.onDataOutput = function (data) {
        this.terminal && this.terminal.write(Buffer.isBuffer(data) ? data.toString('utf8') : data);
    };
    Tab.prototype.onTitle = function (title) {
        this.title = title.trim() || this.pty && this.pty.process && this.pty.process.trim() || 'Shell';
        this.tabElement && (this.tabElement.firstChild.textContent = this.title);
        if (this.active)
            setTitle(this.title);
    };
    Tab.prototype.dispose = function () {
        var e_2, _a;
        tabs.delete(this);
        if (activeTab == this) {
            activeTab = __spread(tabs)[0];
            if (activeTab)
                activeTab.onEnable();
        }
        if (this.pty) {
            this.pty.destroy();
            delete this.pty;
        }
        if (this.disposables) {
            try {
                for (var _b = __values(this.disposables), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var disposable = _c.value;
                    disposable && disposable.dispose();
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
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
    };
    return Tab;
}());
var originalTitle = document.title;
function setTitle(title) {
    if (title)
        document.title = title + " - " + originalTitle;
    else
        document.title = originalTitle;
}
function attachDisposable(listener, key, callback) {
    listener.on(key, callback);
    return { dispose: function () {
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
    var e_3, _a;
    try {
        for (var tabs_2 = __values(tabs), tabs_2_1 = tabs_2.next(); !tabs_2_1.done; tabs_2_1 = tabs_2.next()) {
            var tab = tabs_2_1.value;
            if (tab)
                tab.dispose();
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (tabs_2_1 && !tabs_2_1.done && (_a = tabs_2.return)) _a.call(tabs_2);
        }
        finally { if (e_3) throw e_3.error; }
    }
}
function getAsStringAsync(d) {
    return new Promise(function (resolve) { return d.getAsString(resolve); });
}
electron_1.ipcRenderer.on('create-terminal', function (e, options) {
    new Tab().attach(createBackend(options));
    electron_1.remote.getCurrentWindow().focus();
});
window.addEventListener('beforeunload', function (e) {
    if (tabs.size > 1) {
        e.returnValue = false;
        electron_1.remote.dialog.showMessageBox(electron_1.remote.getCurrentWindow(), {
            type: 'question',
            title: 'Exit?',
            message: "There are still " + tabs.size + " sessions are opened, do you really want to close?",
            buttons: ['Yes', 'No'],
        }, function (response) {
            if (response === 0) {
                destroyAllTabs();
                window.close();
            }
        });
    }
});
window.addEventListener('close', destroyAllTabs);
window.addEventListener('resize', function () {
    if (activeTab && activeTab.terminal)
        activeTab.terminal.fit();
});
document.body.addEventListener('dragover', function (e) { return e.preventDefault(); });
if (document.readyState !== 'complete')
    document.addEventListener('readystatechange', function () {
        if (document.readyState === 'complete')
            electron_1.ipcRenderer.send('ready');
    });
else
    electron_1.ipcRenderer.send('ready');
//# sourceMappingURL=renderer.js.map