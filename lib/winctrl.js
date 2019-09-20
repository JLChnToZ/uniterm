"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const electron_1 = require("electron");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const browserWindow = electron_1.remote.getCurrentWindow();
function doMaximize() {
    if (browserWindow.isFullScreenable()) {
        const isFullscreen = browserWindow.isFullScreen();
        browserWindow.setFullScreen(!isFullscreen);
        if (isFullscreen)
            browserWindow.unmaximize();
    }
    else if (browserWindow.isMaximized())
        browserWindow.unmaximize();
    else
        browserWindow.maximize();
}
function attach(parent) {
    browserWindow.on('maximize', updateMaximizeState);
    browserWindow.on('unmaximize', updateMaximizeState);
    browserWindow.on('restore', updateMaximizeState);
    browserWindow.on('enter-full-screen', updateMaximizeState);
    browserWindow.on('leave-full-screen', updateMaximizeState);
    parent.appendChild(hyperscript_1.default("a", { className: "icon item", onclick: () => browserWindow.minimize(), title: "Minimize" }, '\ufaaf'));
    const maximizeButton = parent.appendChild(hyperscript_1.default("a", { className: "icon item", onclick: doMaximize, title: "Maximize" }));
    parent.appendChild(hyperscript_1.default("a", { className: "icon item", onclick: () => browserWindow.close(), title: "Close" }, '\ufaac'));
    function updateMaximizeState() {
        const isFullScreen = browserWindow.isFullScreen();
        const isMaximized = browserWindow.isMaximized() || isFullScreen;
        maximizeButton.textContent = isMaximized ? '\ufab1' : '\ufaae';
        if (isMaximized)
            document.body.classList.add('maximized');
        else
            document.body.classList.remove('maximized');
        if (browserWindow.isFullScreenable() &&
            isMaximized && !isFullScreen)
            browserWindow.setFullScreen(true);
    }
    updateMaximizeState();
}
exports.attach = attach;
function registerDraggableDoubleClick() {
    document.body.addEventListener('dblclick', e => {
        if ((e.target instanceof Element) && e.target.matches('.drag')) {
            e.preventDefault();
            e.stopPropagation();
            doMaximize();
        }
    }, true);
}
exports.registerDraggableDoubleClick = registerDraggableDoubleClick;
//# sourceMappingURL=winctrl.js.map