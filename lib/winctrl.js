"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const h = require("hyperscript");
const browserWindow = electron_1.remote.getCurrentWindow();
function attach(parent) {
    browserWindow.on('maximize', changeMaximizeIcon);
    browserWindow.on('unmaximize', changeMaximizeIcon);
    browserWindow.on('restore', changeMaximizeIcon);
    parent.appendChild(h("a", { className: "icon item", onclick: () => browserWindow.minimize(), title: "Minimize" }, '\ufaaf'));
    const maximizeButton = parent.appendChild(h("a", { className: "icon item", onclick: () => {
            if (browserWindow.isMaximized())
                browserWindow.unmaximize();
            else
                browserWindow.maximize();
        }, title: "Maximize" }));
    parent.appendChild(h("a", { className: "icon item", onclick: () => browserWindow.close(), title: "Close" }, '\ufaac'));
    function changeMaximizeIcon() {
        const maximized = browserWindow.isMaximized();
        maximizeButton.textContent = maximized ? '\ufab1' : '\ufaae';
        if (maximized)
            document.body.classList.add('maximized');
        else
            document.body.classList.remove('maximized');
    }
    changeMaximizeIcon();
}
exports.attach = attach;
//# sourceMappingURL=winctrl.js.map