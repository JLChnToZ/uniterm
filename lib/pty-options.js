"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.togglePriority = void 0;
const tslib_1 = require("tslib");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const os_1 = require("os");
let tab;
const sliderMarks = document.body.appendChild(hyperscript_1.default("datalist", { id: "priorityMarks" }));
let maxPriority = Number.NEGATIVE_INFINITY;
let minPriority = Number.POSITIVE_INFINITY;
for (const priorityLevel of Object.values(os_1.constants.priority)) {
    sliderMarks.appendChild(hyperscript_1.default("option", { value: priorityLevel.toString() }));
    maxPriority = Math.max(maxPriority, priorityLevel);
    minPriority = Math.min(minPriority, priorityLevel);
}
const customTitle = hyperscript_1.default("input", { className: "title input", type: "text", placeholder: "Prefix", oninput: e => {
        if (tab)
            tab.titlePrefix = e.target.value;
    } });
const slider = hyperscript_1.default("input", { className: "priority input", type: "range", step: "1", max: maxPriority.toString(), min: minPriority.toString() });
slider.setAttribute('list', sliderMarks.id);
let isShown = false;
const priorityBar = document.body.appendChild(hyperscript_1.default("div", { className: "toolbar hidden" },
    hyperscript_1.default("div", { className: "inner" },
        customTitle,
        hyperscript_1.default("a", { className: "icon item disabled", title: "Low Priority" }, '\ufb03'),
        slider,
        hyperscript_1.default("a", { className: "icon item disabled", title: "High Priority" }, '\ufb02'),
        hyperscript_1.default("a", { className: "icon item", title: "Apply", onclick: _ => {
                if (!tab) {
                    slider.value = '0';
                    return;
                }
                const { pty } = tab;
                if (!pty) {
                    slider.value = '0';
                    return;
                }
                try {
                    pty.priority = slider.valueAsNumber;
                }
                catch (_a) {
                }
                finally {
                    slider.value = pty.priority.toString();
                }
                togglePriority();
            } }, '\uf62b'),
        hyperscript_1.default("a", { className: "icon item", title: "Hide", onclick: togglePriority }, '\uf85f'))));
window.addEventListener('tabswitched', (e) => {
    tab = e.detail;
    if (isShown)
        updateValues();
});
function updateValues() {
    var _a;
    slider.value = ((_a = tab === null || tab === void 0 ? void 0 : tab.pty) === null || _a === void 0 ? void 0 : _a.priority.toString()) || '0';
    customTitle.value = tab === null || tab === void 0 ? void 0 : tab.titlePrefix;
}
function togglePriority() {
    if (isShown = !priorityBar.classList.toggle('hidden')) {
        slider.focus();
        updateValues();
    }
}
exports.togglePriority = togglePriority;
//# sourceMappingURL=pty-options.js.map