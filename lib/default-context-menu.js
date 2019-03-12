"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_process_manager_1 = require("electron-process-manager");
const remote_wrapper_1 = require("./remote-wrapper");
exports.defaultContextMenuTemplate = [
    { role: 'undo', editFlag: 'canUndo', accelerator: 'CmdOrCtrl+Z', hideIfReadOnly: true },
    { role: 'redo', editFlag: 'canRedo', accelerator: 'CmdOrCtrl+Y', hideIfReadOnly: true },
    { type: 'separator', hideIfReadOnly: true },
    { role: 'cut', editFlag: 'canCut', accelerator: 'CmdOrCtrl+X', hideIfReadOnly: true },
    { role: 'copy', editFlag: 'canCopy', accelerator: 'CmdOrCtrl+Insert' },
    { role: 'paste', editFlag: 'canPaste', accelerator: 'Shift+Insert', hideIfReadOnly: true },
    { role: 'delete', editFlag: 'canDelete', hideIfReadOnly: true },
    { type: 'separator' },
    { role: 'selectall', editFlag: 'canSelectAll', accelerator: 'CmdOrCtrl+A' },
    { type: 'separator' },
    { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
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
function register(window, webContents) {
    const contextMenu = remote_wrapper_1.electron.Menu.buildFromTemplate(exports.defaultContextMenuTemplate);
    if (!webContents)
        webContents = window.webContents;
    webContents.on('context-menu', (e, params) => {
        e.preventDefault();
        showContextMenu(window, contextMenu, params);
    }).on('before-input-event', (e, input) => {
        if (input.control && input.shift && input.code === 'KeyI') {
            e.preventDefault();
            webContents.toggleDevTools();
        }
        if (input.shift && input.code === 'Escape') {
            e.preventDefault();
            electron_process_manager_1.openProcessManager();
        }
    });
}
exports.register = register;
//# sourceMappingURL=default-context-menu.js.map