import { app, BrowserWindow, ipcMain, IpcMessageEvent, WebContents } from 'electron';
import * as path from 'path';
import * as yargs from 'yargs';
import { TerminalOptions } from './terminals/base';
import { register as registerContextMenu } from './default-context-menu';

const windows: { [id: number]: BrowserWindow } = {};
const readyWindowIds = new Set<number>();
let activeReadyWindowId: number | undefined;
const openingWindows: { [id: number]: ((value: WebContents) => void)[] } = {};

const args = yargs
  .usage('Usage: $0 [options] [shellargs..]')
  .options({
    'cwd': {
      string: true,
      describe: 'Working directory to start shell.',
      alias: 'c',
    },
    'env': {
      array: true,
      string: true,
      describe: 'Add/modify environment variable passed into the shell.',
      alias: 'e',
    },
    'new-window': {
      boolean: true,
      describe: 'Open the shell in a new window',
      alias: 'n',
    },
  })
  .version()
  .help();

const argv = args.parse(process.argv.slice(1));

if(!app.requestSingleInstanceLock())
  app.quit();
else {
  app.on('ready', createWindow);
  app.on('window-all-closed', () => {
    if(process.platform !== 'darwin')
      app.quit();
  });
  app.on('activate', () => {
    if(!Object.keys(windows).length)
      createWindow();
  });
  app.on('second-instance', (e, argv, cwd) => openShell(args.exitProcess(false).parse(argv.slice(1)), cwd));
  ipcMain.on('ready', (e: IpcMessageEvent) => {
    const { id } = e.sender;
    readyWindowIds.add(id);
    if(activeReadyWindowId === undefined)
      activeReadyWindowId = id;
    if(openingWindows[id]) {
      for(const resolve of openingWindows[id])
        resolve(e.sender);
      delete openingWindows[id];
    } else {
      e.sender.send('create-terminal', {});
    }
  });
  openShell(argv, process.cwd());
}

function createWindow() {
  const window = new BrowserWindow({
    height: 600,
    width: 800,
    icon: path.resolve(__dirname, `../icons/uniterm.${process.platform === 'win32' ? 'ico' : 'png'}`)
  });
  const { id } = window;
  window.loadFile(path.join(__dirname, '../static/index.html'));
  window.setMenu(null);
  registerContextMenu(window);
  windows[id] = window;
  window.on('closed', () => {
    readyWindowIds.delete(id);
    delete windows[id];
    if(activeReadyWindowId === id)
      activeReadyWindowId = [...readyWindowIds][0];
  });
  return id;
}

function getWindow(newWindow?: boolean) {
  if(!newWindow && activeReadyWindowId !== undefined)
    return Promise.resolve(windows[activeReadyWindowId].webContents);
  return new Promise<WebContents>(resolve => {
    const windowId = createWindow();
    if(openingWindows[windowId])
      openingWindows[windowId].push(resolve);
    else
      openingWindows[windowId] = [resolve];
  });
}

async function openShell(argv: yargs.Arguments, cwd: string) {
  const env: { [key: string]: string } = {};
  if(Array.isArray(argv.env) && argv.env.length)
    for(let i = 0; i < argv.env.length; i += 2)
      env[argv.env[i]] = argv.env[i + 1];
  const options: TerminalOptions = {
    path: argv._[0],
    argv: argv._.slice(1),
    cwd: argv.cwd || cwd,
    env
  };
  (await getWindow(argv['new-window'])).send('create-terminal', options);
}