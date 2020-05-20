"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDraggableDoubleClick = exports.attach = void 0;
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
    else if (browserWindow.isMaximizable())
        browserWindow.maximize();
}
function attach(parent) {
    browserWindow.on('maximize', updateMaximizeState);
    browserWindow.on('unmaximize', updateMaximizeState);
    browserWindow.on('restore', updateMaximizeState);
    browserWindow.on('enter-full-screen', updateMaximizeState);
    browserWindow.on('leave-full-screen', updateMaximizeState);
    parent.appendChild(hyperscript_1.default("a", { className: "icon minimize item", onclick: () => browserWindow.minimize(), title: "Minimize" }, '\ufaaf'));
    const maximizeButton = parent.appendChild(hyperscript_1.default("a", { className: "icon maximize item", onclick: doMaximize, title: "Maximize" }));
    parent.appendChild(hyperscript_1.default("a", { className: "icon close item", onclick: () => browserWindow.close(), title: "Close" }, '\ufaac'));
    function updateMaximizeState() {
        const isFullScreen = browserWindow.isFullScreen();
        const isMaximized = browserWindow.isMaximized() || isFullScreen;
        maximizeButton.textContent = isMaximized ? '\ufab1' : '\ufaae';
        if (isMaximized)
            document.documentElement.classList.add('maximized');
        else
            document.documentElement.classList.remove('maximized');
        if (browserWindow.isFullScreenable() &&
            isMaximized && !isFullScreen)
            browserWindow.setFullScreen(true);
        maximizeButton.classList.remove('disabled');
        if (!browserWindow.isMaximizable())
            maximizeButton.classList.add('disabled');
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