import {
  BrowserWindow,
  EditFlags,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  remote,
  WebContents,
} from 'electron';

interface CustomMenuExtention {
  category?: string;
  editFlag?: keyof EditFlags;
}

interface CustomMenuOption extends MenuItemConstructorOptions, CustomMenuExtention {}

interface CustomMenuItem extends MenuItem, CustomMenuExtention {}

const contextMenuTemplate: CustomMenuOption[] = [
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

export function getMenuType() {
  if((typeof process === 'undefined') || !process || (process.type && (process.type === 'renderer')))
    return {
      Menu: remote.Menu,
    };
  else
    return {
      Menu,
    };
}

export function register(window: BrowserWindow, webContents?: WebContents) {
  // tslint:disable-next-line:no-shadowed-variable
  const { Menu } = getMenuType();
  const contextMenu = Menu.buildFromTemplate(contextMenuTemplate);
  (webContents || window.webContents).on('context-menu', (e, params) => {
    e.preventDefault();
    let hasEnabledItems = false;
    for(const item of contextMenu.items as CustomMenuItem[]) {
      switch(item.category) {
        case 'edit': item.visible = params.isEditable; break;
      }
      if(item.editFlag)
        item.enabled = params.editFlags[item.editFlag];
      if(item.enabled && (item as any).type !== 'separator')
        hasEnabledItems = true;
    }
    if(hasEnabledItems)
      contextMenu.popup({ window });
  });
}
