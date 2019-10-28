import {
  BrowserWindow,
  ContextMenuParams,
  EditFlags,
  MenuItem,
  MenuItemConstructorOptions,
} from 'electron';
import { openProcessManager } from 'electron-process-manager';
import { IKeyboardEvent, toKeyEvent } from 'keyboardevent-from-electron-accelerator';
import { electron } from './remote-wrapper';

export interface CustomMenuExtention {
  editFlag?: keyof EditFlags;
  hideIfReadOnly?: boolean;
  modifier?: IKeyboardEvent;
}

export interface CustomMenuOption extends MenuItemConstructorOptions, CustomMenuExtention {}

export interface CustomMenuItem extends MenuItem, CustomMenuExtention {}

export const defaultContextMenuTemplate: CustomMenuOption[] = [
  { role: 'undo', editFlag: 'canUndo', hideIfReadOnly: true },
  { role: 'redo', editFlag: 'canRedo', hideIfReadOnly: true },
  { type: 'separator', hideIfReadOnly: true },
  { role: 'cut', editFlag: 'canCut', hideIfReadOnly: true },
  { role: 'copy', editFlag: 'canCopy', accelerator: 'CmdOrCtrl+Insert' },
  { role: 'paste', editFlag: 'canPaste', accelerator: 'Shift+Insert', hideIfReadOnly: true },
  { role: 'delete', editFlag: 'canDelete', hideIfReadOnly: true },
  { type: 'separator' },
  { role: 'selectAll', editFlag: 'canSelectAll' },
  { type: 'separator' },
  { role: 'zoomIn', accelerator: 'CmdOrCtrl+=' },
  { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
  { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
  { type: 'separator' },
  { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
  { label: 'Open Process Manager', accelerator: 'Shift+Esc', click: () => openProcessManager() },
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

export function register(window: BrowserWindow, webContents = window.webContents) {
  const contextMenu = electron.Menu.buildFromTemplate(defaultContextMenuTemplate);
  webContents.on('context-menu', (e, params) => {
    e.preventDefault();
    showContextMenu(window, contextMenu, params);
  }).on('before-input-event', (e, input) => {
    for(const item of contextMenu.items as CustomMenuItem[]) {
      if(!item.accelerator)
        continue;
      if(!item.modifier)
        item.modifier = toKeyEvent(item.accelerator as string);
      if(input.code !== item.modifier.code ||
        input.control === !item.modifier.ctrlKey ||
        input.shift === !item.modifier.shiftKey ||
        input.alt === !item.modifier.altKey
      ) continue;
      e.preventDefault();
      item.click(e, window, webContents);
      break;
    }
  });
}
