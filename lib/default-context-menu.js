"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_process_manager_1 = require("electron-process-manager");
const remote_wrapper_1 = require("./remote-wrapper");
exports.defaultContextMenuTemplateBase = [
    { role: 'zoomIn' },
    { role: 'zoomOut' },
    { role: 'resetZoom' },
    { type: 'separator' },
    { role: 'toggleDevTools' },
    { label: 'Open Process Manager', click: () => electron_process_manager_1.openProcessManager() },
];
exports.defaultReadonlyContextMenuTemplate = [
    { role: 'copy', editFlag: 'canCopy' },
    { type: 'separator' },
    { role: 'selectAll', editFlag: 'canSelectAll' },
];
exports.defaultEditableContextMenuTemplate = [
    { role: 'undo', editFlag: 'canUndo' },
    { role: 'redo', editFlag: 'canRedo' },
    { type: 'separator' },
    { role: 'cut', editFlag: 'canCut' },
    { role: 'copy', editFlag: 'canCopy' },
    { role: 'paste', editFlag: 'canPaste' },
    { role: 'delete', editFlag: 'canDelete' },
    { type: 'separator' },
    { role: 'selectAll', editFlag: 'canSelectAll' },
];
function showContextMenu(window, contextMenu, params) {
    let hasEnabledItems = false;
    for (const item of contextMenu.items) {
        if (params && item.editFlag)
            item.enabled = params.editFlags[item.editFlag];
        if (item.enabled && item.type !== 'separator')
            hasEnabledItems = true;
    }
    if (hasEnabledItems)
        contextMenu.popup({ window });
}
exports.showContextMenu = showContextMenu;
function register(window, webContents = window.webContents) {
    const readonlyContextMenu = remote_wrapper_1.electron.Menu.buildFromTemplate([
        ...exports.defaultReadonlyContextMenuTemplate,
        { type: 'separator' },
        ...exports.defaultContextMenuTemplateBase,
    ]);
    const editableContextMenu = remote_wrapper_1.electron.Menu.buildFromTemplate([
        ...exports.defaultEditableContextMenuTemplate,
        { type: 'separator' },
        ...exports.defaultContextMenuTemplateBase,
    ]);
    webContents.on('context-menu', (e, params) => {
        e.preventDefault();
        showContextMenu(window, params.isEditable ? editableContextMenu : readonlyContextMenu, params);
    });
}
exports.register = register;
//# sourceMappingURL=default-context-menu.js.map