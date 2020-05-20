"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = exports.draggingTab = void 0;
const domutils_1 = require("./domutils");
const childrenQuery = 'a.item';
function onDragStart(e) {
    if (!e.target.matches(childrenQuery))
        return;
    const { dataTransfer, target } = e;
    dataTransfer.clearData();
    dataTransfer.setData('application/x-tab-data', target.outerHTML);
    dataTransfer.effectAllowed = 'copyMove';
    exports.draggingTab = target;
    exports.draggingTab.style.opacity = '0.5';
}
function onDragEnter(e) {
    if (!e.target.matches(childrenQuery))
        return;
    domutils_1.interceptEvent(e);
    const { dataTransfer, target } = e;
    if (exports.draggingTab && !target.isEqualNode(exports.draggingTab)) {
        dataTransfer.dropEffect = 'move';
        const isNext = target.isEqualNode(exports.draggingTab.nextSibling);
        this.removeChild(exports.draggingTab);
        this.insertBefore(exports.draggingTab, isNext ? target.nextSibling : target);
    }
    else
        dataTransfer.dropEffect = 'none';
}
function onDragOver(e) {
    if (!e.target.matches(childrenQuery))
        return;
    domutils_1.interceptEvent(e);
    e.dataTransfer.dropEffect = exports.draggingTab ? 'move' : 'none';
}
function onDragEnd(e) {
    domutils_1.interceptEvent(e);
    if (exports.draggingTab) {
        exports.draggingTab.style.opacity = '1';
        exports.draggingTab = undefined;
    }
}
function onDrop(e) {
    domutils_1.interceptEvent(e);
    if (exports.draggingTab)
        e.dataTransfer.clearData();
}
function init(container) {
    container.addEventListener('dragstart', onDragStart, true);
    container.addEventListener('dragenter', onDragEnter, true);
    container.addEventListener('dragover', onDragOver, true);
    container.addEventListener('dragend', onDragEnd, true);
    container.addEventListener('drop', onDrop, true);
}
exports.init = init;
//# sourceMappingURL=dndtabs.js.map