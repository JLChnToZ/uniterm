"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_process_manager_1 = require("electron-process-manager");
const keyboardevent_from_electron_accelerator_1 = require("keyboardevent-from-electron-accelerator");
const remote_wrapper_1 = require("./remote-wrapper");
exports.defaultContextMenuTemplate = [
    { role: 'undo', editFlag: 'canUndo', hideIfReadOnly: true },
    { role: 'redo', editFlag: 'canRedo', hideIfReadOnly: true },
    { type: 'separator', hideIfReadOnly: true },
    { role: 'cut', editFlag: 'canCut', hideIfReadOnly: true },
    { role: 'copy', editFlag: 'canCopy', accelerator: 'CmdOrCtrl+Insert' },
    { role: 'paste', editFlag: 'canPaste', accelerator: 'Shift+Insert', hideIfReadOnly: true },
    { role: 'delete', editFlag: 'canDelete', hideIfReadOnly: true },
    { type: 'separator' },
    { role: 'selectall', editFlag: 'canSelectAll' },
    { type: 'separator' },
    { role: 'zoomin', accelerator: 'CmdOrCtrl+=' },
    { role: 'zoomout', accelerator: 'CmdOrCtrl+-' },
    { role: 'resetzoom', accelerator: 'CmdOrCtrl+0' },
    { type: 'separator' },
    { role: 'toggledevtools', accelerator: 'CmdOrCtrl+Shift+I' },
    { label: 'Open Process Manager', accelerator: 'Shift+Esc', click: () => electron_process_manager_1.openProcessManager() },
];
function showContextMenu(window, contextMenu, params) {
    let hasEnabledItems = false;
    for (const item of contextMenu.items) {
        if (params) {
            if (item.hideIfReadOnly)
                item.visible = params.isEditable;
            if (item.editFlag)
                item.enabled = params.editFlags[item.editFlag];
        }
        if (item.enabled && item.type !== 'separator')
            hasEnabledItems = true;
    }
    if (hasEnabledItems)
        contextMenu.popup({ window });
}
exports.showContextMenu = showContextMenu;
function register(window, webContents = window.webContents) {
    const contextMenu = remote_wrapper_1.electron.Menu.buildFromTemplate(exports.defaultContextMenuTemplate);
    webContents.on('context-menu', (e, params) => {
        e.preventDefault();
        showContextMenu(window, contextMenu, params);
    }).on('before-input-event', (e, input) => {
        for (const item of contextMenu.items) {
            if (!item.accelerator)
                continue;
            if (!item.modifier)
                item.modifier = keyboardevent_from_electron_accelerator_1.toKeyEvent(item.accelerator);
            if (input.code !== item.modifier.code ||
                input.control === !item.modifier.ctrlKey ||
                input.shift === !item.modifier.shiftKey ||
                input.alt === !item.modifier.altKey)
                continue;
            e.preventDefault();
            item.click(e, window, webContents);
            break;
        }
    });
}
exports.register = register;
//# sourceMappingURL=default-context-menu.js.map