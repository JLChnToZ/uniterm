import { app, BrowserWindow, ipcMain, IpcMessageEvent, shell, WebContents } from 'electron';
import { dirname, relative as relativePath, resolve as resolvePath } from 'path';
import * as yargs from 'yargs';
import { configFilePath, loadConfig, reloadConfigPath } from './config';
import { register as registerContextMenu } from './default-context-menu';
import { TerminalLaunchOptions } from './interfaces';
import { ensureDirectory, tryResolvePath } from './pathutils';
import { register as registerProtocol } from './protocol';
import { packageJson, versionString } from './version';

const windows: { [id: number]: BrowserWindow } = {};
const readyWindowIds = new Set<number>();
let activeReadyWindowId: number | undefined;
const openingWindows: { [id: number]: Array<(value: WebContents) => void> } = {};

const args = yargs
  .scriptName(packageJson.name)
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
    'user-data': {
      string: true,
      hidden: true,
      describe: 'Tell Uniterm to use specified directory for storing user data and shared instance info. ' +
        'May be useful if you want to have a portable Uniterm.',
    },
    'disable-hardware-acceleration': {
      boolean: true,
      hidden: true,
      describe: 'Disables hadrware acceleration. ' +
        'This flag only have effect when the first Uniterm window launches.',
    },
    'disable-domain-blocking-for-3d-apis': {
      boolean: true,
      hidden: true,
      describe: 'Keep 3D API enable even GPU process crashes too frequently. ' +
        'This flag only have effect when the first Uniterm window launches.',
    },
  })
  .version(versionString)
  .help();

const argv = app.isPackaged ?
  args.parse(process.argv.slice(1)) :
  args.argv;

(async (userDataPath: string) => {
  if(!userDataPath) return;
  const original = app.getPath('userData');
  try {
    userDataPath = resolvePath(process.cwd(), userDataPath);
    if(original === userDataPath) return;
    app.setPath('userData', userDataPath);
    await ensureDirectory(userDataPath);
  } catch {
    app.setPath('userData', original);
    reloadConfigPath(true);
  }
})(argv['user-data'] || process.env.UNITERM_USER_DATA);

if(argv.config || argv['reset-config'])
  loadConfig(false, argv['reset-config']).then(() => {
    if(argv.config)
      shell.openItem(configFilePath);
    app.quit();
  }, reason => {
    console.error(reason.message || reason);
    app.quit();
  });
else if(!app.requestSingleInstanceLock()) {
  printFlagNoEffectWarning(argv, 'disable-hardware-acceleration');
  printFlagNoEffectWarning(argv, 'disable-domain-blocking-for-3d-apis');
  app.quit();
} else {
  if(argv['disable-hardware-acceleration'])
    app.disableHardwareAcceleration();
  if(argv['disable-domain-blocking-for-3d-apis'])
    app.disableDomainBlockingFor3DAPIs();
  loadConfig();
  args.exitProcess(false);
  const workingDir = process.cwd();
  process.chdir(dirname(app.getPath('exe')));
  app.on('ready', () => {
    registerProtocol();
    openShell(argv, workingDir);
  });
  app.on('window-all-closed', () => {
    if(process.platform !== 'darwin')
      app.quit();
  });
  app.on('activate', () => {
    if(!Object.keys(windows).length)
      createWindow();
  });
  app.on('second-instance', (e, lArgv, cwd) => openShell(
    args.parse(app.isPackaged ? lArgv.slice(1) : lArgv),
    cwd,
  ));
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

function printFlagNoEffectWarning(lArgv: yargs.Arguments, key: string) {
  if(lArgv[key])
    console.warn('Warning: `%s` currently has no effect ' +
      'because there is already an instance of Uniterm is running.', key);
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
  window.loadURL('uniterm://app/');
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
  env.UNITERM_USER_DATA = app.getPath('userData');
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
