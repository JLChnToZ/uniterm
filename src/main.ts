import { app, BrowserWindow, ipcMain, IpcMessageEvent, shell, WebContents } from 'electron';
import { dirname, relative as relativePath, resolve as resolvePath } from 'path';
import * as yargs from 'yargs';
import { configFilePath, loadConfig } from './config';
import { register as registerContextMenu } from './default-context-menu';
import { TerminalLaunchOptions } from './interfaces';
import { tryResolvePath } from './pathutils';
import { versionString } from './version';

const windows: { [id: number]: BrowserWindow } = {};
const readyWindowIds = new Set<number>();
let activeReadyWindowId: number | undefined;
const openingWindows: { [id: number]: Array<(value: WebContents) => void> } = {};

const args = yargs
  .usage('Usage: $0 [options] [--] [shellargs..]')
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
    'pause': {
      boolean: true,
      describe: 'Pauses after shell/program exits',
      alias: 'p',
    },
    'config': {
      boolean: true,
      describe: 'Opens the config file',
    },
    'reset-config': {
      boolean: true,
      describe: 'Resets the config file',
    },
  })
  .version(versionString)
  .help();

const argv = args.parse(process.argv.slice(1));

if(argv.config || argv['reset-config'])
  loadConfig(false, argv['reset-config']).then(() => {
    if(argv.config)
      shell.openItem(configFilePath);
    app.quit();
  }, reason => {
    console.error(reason.message || reason);
    app.quit();
  });
else if(!app.requestSingleInstanceLock())
  app.quit();
else {
  loadConfig();
  const workingDir = process.cwd();
  process.chdir(dirname(app.getPath('exe')));
  app.on('ready', () => openShell(argv, workingDir));
  app.on('window-all-closed', () => {
    if(process.platform !== 'darwin')
      app.quit();
  });
  app.on('activate', () => {
    if(!Object.keys(windows).length)
      createWindow();
  });
  app.on('second-instance', (e, lArgv, cwd) => openShell(args.exitProcess(false).parse(lArgv.slice(1)), cwd));
  ipcMain.on('ready', (e: IpcMessageEvent) => {
    const { id } = e.sender;
    readyWindowIds.add(id);
    if(activeReadyWindowId === undefined)
      activeReadyWindowId = id;
    if(openingWindows[id]) {
      for(const resolve of openingWindows[id])
        resolve(e.sender);
      delete openingWindows[id];
    } else
      e.sender.send('create-terminal', {});
  });
}

function createWindow() {
  const window = new BrowserWindow({
    height: 600,
    width: 800,
    icon: resolvePath(__dirname, `../icons/uniterm.${process.platform === 'win32' ? 'ico' : 'png'}`),
    frame: false,
    titleBarStyle: 'hiddenInset',
  });
  const { id } = window;
  window.loadFile(resolvePath(__dirname, '../static/index.html'));
  window.setMenu(null);
  registerContextMenu(window);
  windows[id] = window;
  window.on('closed', () => {
    readyWindowIds.delete(id);
    delete windows[id];
    if(activeReadyWindowId === id)
      activeReadyWindowId = [...readyWindowIds][0];
  });
  window.on('focus', () => {
    if(readyWindowIds.has(id))
      activeReadyWindowId = id;
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

async function openShell(lArgv: yargs.Arguments, cwd: string) {
  // Join env values
  const env: { [key: string]: string } = {};
  if(Array.isArray(lArgv.env) && lArgv.env.length)
    for(let i = 0; i < lArgv.env.length; i += 2)
      env[lArgv.env[i]] = lArgv.env[i + 1];
  // Resolve working directory, resolve to users's home if not set and launched directly at the executable path.
  try {
    if(lArgv.cwd)
      cwd = tryResolvePath(cwd, lArgv.cwd);
    else if(!relativePath(cwd, dirname(app.getPath('exe'))))
      cwd = process.platform === 'win32' && lArgv._[0] === 'wsl' ? '~' : app.getPath('home');
  } catch {}
  const options: TerminalLaunchOptions = {
    path: lArgv._[0],
    argv: lArgv._.slice(1),
    cwd,
    env,
    pause: lArgv.pause,
  };
  (await getWindow(lArgv['new-window'])).send('create-terminal', options);
}
