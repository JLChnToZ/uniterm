import {
  BrowserWindow,
  ContextMenuParams,
  EditFlags,
  MenuItem,
  MenuItemConstructorOptions,
} from 'electron';
import { electron } from './remote-wrapper';

export interface CustomMenuExtention {
  editFlag?: keyof EditFlags;
}

export interface CustomMenuOption extends MenuItemConstructorOptions, CustomMenuExtention {}

export interface CustomMenuItem extends MenuItem, CustomMenuExtention {}

export const defaultContextMenuTemplateBase: CustomMenuOption[] = [
  { role: 'zoomIn' },
  { role: 'zoomOut' },
  { role: 'resetZoom' },
  { type: 'separator' },
  { role: 'toggleDevTools' },
];

export const defaultReadonlyContextMenuTemplate: CustomMenuOption[] = [
  { role: 'copy', editFlag: 'canCopy' },
  { type: 'separator' },
  { role: 'selectAll', editFlag: 'canSelectAll' },
];

export const defaultEditableContextMenuTemplate: CustomMenuOption[] = [
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

export function showContextMenu(window: BrowserWindow, contextMenu: Electron.Menu, params?: ContextMenuParams) {
  let hasEnabledItems = false;
  for(const item of contextMenu.items as CustomMenuItem[]) {
    if(params && item.editFlag)
      item.enabled = params.editFlags[item.editFlag];
    if(item.enabled && (item as any).type !== 'separator')
      hasEnabledItems = true;
  }
  if(hasEnabledItems)
    contextMenu.popup({ window });
}

export function register(window: BrowserWindow, webContents = window.webContents) {
  const readonlyContextMenu = electron.Menu.buildFromTemplate([
    ...defaultReadonlyContextMenuTemplate,
    { type: 'separator' },
    ...defaultContextMenuTemplateBase,
  ]);
  const editableContextMenu = electron.Menu.buildFromTemplate([
    ...defaultEditableContextMenuTemplate,
    { type: 'separator' },
    ...defaultContextMenuTemplateBase,
  ]);
  webContents.on('context-menu', (e, params) => {
    e.preventDefault();
    showContextMenu(window, params.isEditable ? editableContextMenu : readonlyContextMenu, params);
  });
}
