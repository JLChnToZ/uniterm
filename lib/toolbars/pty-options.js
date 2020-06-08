"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ptyOptionsBar = void 0;
const tslib_1 = require("tslib");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const os_1 = require("os");
const base_1 = require("./base");
const decorators_1 = require("../decorators");
const electron_1 = require("electron");
const tab_1 = require("../tab");
const browserWindow = electron_1.remote.getCurrentWindow();
let PtyOptionsToolbar = /** @class */ (() => {
    class PtyOptionsToolbar extends base_1.Toolbar {
        constructor() {
            super();
            window.addEventListener('newtab', (e) => this.attach(e.detail));
            window.addEventListener('tabswitched', (e) => this.hide());
            if (tab_1.Tab.activeTab)
                this.attach(tab_1.Tab.activeTab);
        }
        render() {
            const sliderMarks = document.body.appendChild(hyperscript_1.default("datalist", { id: "priorityMarks" }));
            let maxPriority = Number.NEGATIVE_INFINITY;
            let minPriority = Number.POSITIVE_INFINITY;
            this.markers = Object.values(os_1.constants.priority).sort((a, b) => a > b ? 1 : a < b ? -1 : 0);
            for (const priorityLevel of this.markers) {
                sliderMarks.appendChild(hyperscript_1.default("option", { value: priorityLevel.toString() }));
                maxPriority = Math.max(maxPriority, priorityLevel);
                minPriority = Math.min(minPriority, priorityLevel);
            }
            this.customTitle = hyperscript_1.default("input", { className: "title input", type: "text", placeholder: "Prefix", oninput: e => {
                    const tab = tab_1.Tab.activeTab;
                    if (tab)
                        tab.titlePrefix = e.target.value;
                }, onkeydown: e => {
                    switch (e.which) {
                        default: return;
                        case 13:
                        case 27:
                            this.hide();
                            break;
                    }
                }, spellcheck: false });
            this.slider = hyperscript_1.default("input", { className: "priority input", type: "range", step: "1", max: maxPriority, min: minPriority, onchange: () => this.setPriority(this.slider.valueAsNumber) });
            this.slider.setAttribute('list', sliderMarks.id);
            this.pause = hyperscript_1.default("a", { className: "icon item", title: "Auto Pause", onclick: e => {
                    const tab = tab_1.Tab.activeTab;
                    if (tab && (tab.pause = !tab.pause))
                        this.pause.classList.add('active');
                    else
                        this.pause.classList.remove('active');
                } }, '\uf8e7');
            return [
                this.customTitle,
                hyperscript_1.default("a", { className: "icon item", title: "Higher Priority", onclick: () => this.movePriority(-1) }, '\ufb02'),
                this.slider,
                hyperscript_1.default("a", { className: "icon item", title: "Lower Priority", onclick: () => this.movePriority(1) }, '\ufb03'),
                this.pause,
            ];
        }
        onTabContextMenu(e) {
            e.preventDefault();
            if (tab_1.Tab.activeTab.tabElement === e.currentTarget)
                this.show();
        }
        movePriority(direction) {
            if (!this.markers || !this.slider)
                return;
            const value = this.slider.valueAsNumber;
            if (direction > 0)
                for (let i = 0; i < this.markers.length; i++) {
                    if (this.markers[i] > value)
                        return this.setPriority(this.markers[i]);
                }
            else if (direction < 0)
                for (let i = this.markers.length - 1; i >= 0; i--) {
                    if (this.markers[i] < value)
                        return this.setPriority(this.markers[i]);
                }
        }
        async setPriority(value) {
            const tab = tab_1.Tab.activeTab;
            if (!tab) {
                if (this.slider)
                    this.slider.value = '0';
                return;
            }
            const pty = tab.pty;
            if (!pty || pty.priority === value) {
                if (this.slider)
                    this.slider.value = '0';
                return;
            }
            if ((await electron_1.remote.dialog.showMessageBox(browserWindow, {
                type: 'warning',
                title: 'Process Execution Priority',
                message: 'Changing process execution priority may lead to system unstable. Continue?',
                buttons: ['Yes', 'No'],
            })).response === 0)
                pty.priority = value;
            if (this.slider)
                this.slider.value = pty.priority;
        }
        attach(tab) {
            tab.tabElement.addEventListener('contextmenu', this.onTabContextMenu);
        }
        onShown() {
            var _a;
            super.onShown();
            const tab = tab_1.Tab.activeTab;
            if (this.slider)
                this.slider.value = ((_a = tab === null || tab === void 0 ? void 0 : tab.pty) === null || _a === void 0 ? void 0 : _a.priority) || '0';
            if (this.customTitle)
                this.customTitle.value = tab === null || tab === void 0 ? void 0 : tab.titlePrefix;
            if (this.pause) {
                const { classList } = this.pause;
                if (tab === null || tab === void 0 ? void 0 : tab.pause)
                    classList.add('active');
                else
                    classList.remove('active');
            }
        }
    }
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], PtyOptionsToolbar.prototype, "onTabContextMenu", null);
    tslib_1.__decorate([
        decorators_1.readonly,
        decorators_1.bind
    ], PtyOptionsToolbar.prototype, "movePriority", null);
    return PtyOptionsToolbar;
})();
exports.ptyOptionsBar = new PtyOptionsToolbar();
//# sourceMappingURL=pty-options.js.map