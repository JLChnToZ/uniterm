"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const remote_wrapper_1 = require("./remote-wrapper");
const contextMenuTemplate = [
    { role: 'undo', editFlag: 'canUndo', category: 'edit' },
    { role: 'redo', editFlag: 'canRedo', category: 'edit' },
    { type: 'separator', category: 'edit' },
    { role: 'cut', editFlag: 'canCut', category: 'edit' },
    { role: 'copy', editFlag: 'canCopy' },
    { role: 'paste', editFlag: 'canPaste', category: 'edit' },
    { role: 'delete', editFlag: 'canDelete', category: 'edit' },
    { type: 'separator' },
    { role: 'selectall', editFlag: 'canSelectAll' },
    { type: 'separator' },
    { role: 'toggleDevTools' },
];
function register(window, webContents) {
    const contextMenu = remote_wrapper_1.getElectron('Menu').buildFromTemplate(contextMenuTemplate);
    (webContents || window.webContents).on('context-menu', (e, params) => {
        e.preventDefault();
        let hasEnabledItems = false;
        for (const item of contextMenu.items) {
            switch (item.category) {
                case 'edit':
                    item.visible = params.isEditable;
                    break;
            }
            if (item.editFlag)
                item.enabled = params.editFlags[item.editFlag];
            if (item.enabled && item.type !== 'separator')
                hasEnabledItems = true;
        }
        if (hasEnabledItems)
            contextMenu.popup({ window });
    });
}
exports.register = register;
//# sourceMappingURL=default-context-menu.js.map