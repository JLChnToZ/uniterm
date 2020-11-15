"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Toolbar = void 0;
const tslib_1 = require("tslib");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const decorators_1 = require("../decorators");
class Toolbar {
    constructor() {
        this.shown = false;
        this.root = document.body.appendChild(hyperscript_1.default("div", { className: "toolbar hidden" },
            hyperscript_1.default("div", { className: "inner" },
                this.render(),
                hyperscript_1.default("a", { className: "icon item", title: "Hide", onclick: this.hide }, '\uf85f'))));
        Toolbar.all.add(this);
    }
    toggle() {
        const shown = !this.root.classList.toggle('hidden');
        if (this.shown !== shown) {
            if (this.shown = shown)
                this.onShown();
            else
                this.onHide();
        }
        return shown;
    }
    show() {
        const { classList } = this.root;
        if (!classList.contains('hidden'))
            return;
        classList.remove('hidden');
        this.shown = true;
        this.onShown();
    }
    hide() {
        const { classList } = this.root;
        if (classList.contains('hidden'))
            return;
        classList.add('hidden');
        this.shown = false;
        this.onHide();
    }
    onShown() {
        this.hideOthers();
    }
    onHide() { }
    hideOthers() {
        for (const other of Toolbar.all)
            if (other !== this)
                other.hide();
    }
}
Toolbar.all = new Set();
tslib_1.__decorate([
    decorators_1.readonly,
    decorators_1.bind
], Toolbar.prototype, "toggle", null);
tslib_1.__decorate([
    decorators_1.readonly,
    decorators_1.bind
], Toolbar.prototype, "show", null);
tslib_1.__decorate([
    decorators_1.readonly,
    decorators_1.bind
], Toolbar.prototype, "hide", null);
exports.Toolbar = Toolbar;
//# sourceMappingURL=base.js.map