"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var remote_wrapper_1 = require("./remote-wrapper");
var contextMenuTemplate = [
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
    var contextMenu = remote_wrapper_1.getElectron('Menu').buildFromTemplate(contextMenuTemplate);
    (webContents || window.webContents).on('context-menu', function (e, params) {
        var e_1, _a;
        e.preventDefault();
        var hasEnabledItems = false;
        try {
            for (var _b = __values(contextMenu.items), _c = _b.next(); !_c.done; _c = _b.next()) {
                var item = _c.value;
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
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (hasEnabledItems)
            contextMenu.popup({ window: window });
    });
}
exports.register = register;
//# sourceMappingURL=default-context-menu.js.map