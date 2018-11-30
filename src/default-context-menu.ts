import {
  BrowserWindow,
  ContextMenuParams,
  EditFlags,
  MenuItem,
  MenuItemConstructorOptions,
  WebContents,
} from 'electron';
import { electron } from './remote-wrapper';

export interface CustomMenuExtention {
  editFlag?: keyof EditFlags;
  hideIfReadOnly?: boolean;
}

export interface CustomMenuOption extends MenuItemConstructorOptions, CustomMenuExtention {}

export interface CustomMenuItem extends MenuItem, CustomMenuExtention {}

export const defaultContextMenuTemplate: CustomMenuOption[] = [
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
];

export function showContextMenu(window: BrowserWindow, contextMenu: Electron.Menu, params?: ContextMenuParams) {
  let hasEnabledItems = false;
  for(const item of contextMenu.items as CustomMenuItem[]) {
    if(params) {
      if(item.hideIfReadOnly)
        item.visible = params.isEditable;
      if(item.editFlag)
        item.enabled = params.editFlags[item.editFlag];
    }
    if(item.enabled && (item as any).type !== 'separator')
      hasEnabledItems = true;
  }
  if(hasEnabledItems)
    contextMenu.popup({ window });
}

export function register(window: BrowserWindow, webContents?: WebContents) {
  const contextMenu = electron.Menu.buildFromTemplate(defaultContextMenuTemplate);
  if(!webContents) webContents = window.webContents;
  webContents.on('context-menu', (e, params) => {
    e.preventDefault();
    showContextMenu(window, contextMenu, params);
  }).on('before-input-event', (e, input) => {
    if(input.control && input.shift && input.code === 'KeyI') {
      e.preventDefault();
      webContents.toggleDevTools();
    }
  });
}
