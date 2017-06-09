'use strict';
const electron = require('electron');
const isRenderer = (typeof process === 'undefined') || !process || (process.type && (process.type === 'renderer'));
const remote = isRenderer ? electron.remote : electron;
const { Menu, MenuItem } = remote;

const contextMenuTemplate = [
  { role: 'undo', editFlag: 'canUndo', category: 'edit' },
  { role: 'redo', editFlag: 'canRedo', category: 'edit' },
  { type: 'separator', category: 'edit' },
  { role: 'cut', editFlag: 'canCut', category: 'edit' },
  { role: 'copy', editFlag: 'canCopy' },
  { role: 'paste', editFlag: 'canPaste', category: 'edit' },
  { role: 'delete', editFlag: 'canDelete', category: 'edit' },
  { type: 'separator' },
  { role: 'selectall', editFlag: 'canSelectAll' }
];

module.exports.register = function(window, webContents) {
  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
  webContents.on('context-menu', (e, params) => {
    e.preventDefault();
    let hasEnabledItems = false;
    for(const item of contextMenu.items) {
      switch(item.category) {
        case 'edit': item.visible = params.isEditable; break;
      }
      if(item.editFlag)
        item.enabled = params.editFlags[item.editFlag];
      if(item.enabled && item.type !== 'separator')
        hasEnabledItems = true;
    }
    if(hasEnabledItems)
      contextMenu.popup(isRenderer ? remote.getCurrentWindow() : window);
  });
};
