import { app, BrowserWindow, ipcMain, IpcMessageEvent, shell, WebContents } from 'electron';
import { dirname, relative as relativePath, resolve as resolvePath } from 'path';
import * as yargs from 'yargs';
import { configFilePath, loadConfig, reloadConfigPath } from './config';
import { register as registerContextMenu } from './default-context-menu';
import { TerminalLaunchOptions } from './interfaces';
import { ensureDirectory, existsAsync, isExeAsync, lstatAsync, tryResolvePath } from './pathutils';
import { register as registerProtocol } from './protocol';
import { PtyTerminalOptions } from './terminals/pty';
import { connectToClient } from './terminals/uachost';
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
    'isolated': {
      boolean: true,
      describe: 'Create an isolated process (Useful for running multiple Uniterm in different privages)',
      alias: 'i',
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
    'force-winpty': {
      boolean: true,
      hidden: true,
      describe: 'Enforce to use WinPTY instead of ConPTY on Windows. ' +
        'This flag only effects Windows system.',
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
    'pipe': { hidden: true, string: true },
  })
  .version(versionString)
  .help();

interface Arguments {
  /** Working directory to start shell. */
  cwd?: string; c?: string;
  /** Add/modify environment variable passed into the shell. */
  env?: string[]; e?: string[];
  /** Open the shell in a new window */
  'new-window'?: boolean; n?: boolean;
  /** Create an isolated process */
  isolated?: boolean; i?: boolean;
  /** Pauses after shell/program exits */
  pause?: boolean; p?: boolean;
  /** Opens the config file */
  config?: boolean;
  /** Resets the config file */
  'reset-config'?: boolean;
  /**
   * Tell Uniterm to use specified directory for storing user data and shared instance info.
   * May be useful if you want to have a portable Uniterm.
   */
  'user-data'?: string;
  /**
   * Enforce to use WinPTY instead of ConPTY on Windows.
   * This flag only effects Windows system.
   */
  'force-winpty'?: boolean;
  /**
   * Disables hadrware acceleration.
   * This flag only have effect when the first Uniterm window launches.
   */
  'disable-hardware-acceleration'?: boolean;
  /**
   * Keep 3D API enable even GPU process crashes too frequently.
   * This flag only have effect when the first Uniterm window launches.
   */
  'disable-domain-blocking-for-3d-apis'?: boolean;
  /** IPC pipe path, for launching the shell with privaged permissions. */
  pipe?: string;
}

const argv: yargs.Arguments<Arguments> = app.isPackaged ?
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

if(argv.pipe) {
  app.disableHardwareAcceleration();
  connectToClient(argv.pipe);
} else if(argv.config || argv['reset-config'])
  (async (resetConfig: boolean) => {
    try {
      await loadConfig(false, resetConfig);
      if(argv.config)
        shell.openItem(configFilePath);
    } catch(e) {
      console.error(e.message || e);
    }
    app.quit();
  })(argv['reset-config']);
else if(!argv.isolated && !app.requestSingleInstanceLock()) {
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
  }).on('window-all-closed', () => {
    if(process.platform !== 'darwin')
      app.quit();
  }).on('activate', () => {
    if(!Object.keys(windows).length)
      createWindow();
  });
  if(!argv.isolated)
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
  }).on('show-config', () =>
    shell.openItem(configFilePath),
  ).on('create-terminal-request', async (e: IpcMessageEvent, options: TerminalLaunchOptions) =>
    (await getWindow(true)).send('create-terminal', options),
  );
}

function printFlagNoEffectWarning(lArgv: Arguments, key: keyof Arguments) {
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
    webPreferences: {
      experimentalFeatures: true,
    },
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

async function openShell(lArgv: yargs.Arguments<Arguments>, cwd: string) {
  // Join env values
  const env: { [key: string]: string } = {};
  if(Array.isArray(lArgv.env) && lArgv.env.length)
    for(let i = 0; i < lArgv.env.length; i += 2)
      env[lArgv.env[i]] = lArgv.env[i + 1];
  env.UNITERM_USER_DATA = app.getPath('userData');
  // Resolve working directory
  try {
    if(lArgv.cwd)
      cwd = tryResolvePath(cwd, lArgv.cwd);
    else {
      let cdPath = false;
      if(lArgv._.length === 1 && !await isExeAsync(lArgv._[0], { ignoreErrors: true })) {
        // Hidden usage: if the *only* parameter is a valid directory path,
        // treat it as working directory.
        const tryPath = resolvePath(cwd, lArgv._[0]);
        if(await existsAsync(tryPath) && (await lstatAsync(tryPath)).isDirectory()) {
          cwd = tryPath;
          lArgv._.length = 0;
          cdPath = true;
        }
      }
      if(!cdPath && !relativePath(cwd, dirname(app.getPath('exe'))))
        // Resolve cwd to users's home if not set and launched directly at the executable path.
        cwd = process.platform === 'win32' && lArgv._[0] === 'wsl' ? '~' : app.getPath('home');
    }
  } catch {}
  const options: TerminalLaunchOptions & PtyTerminalOptions = {
    path: lArgv._[0],
    argv: lArgv._.slice(1),
    cwd,
    env,
    pause: lArgv.pause,
    experimentalUseConpty: !lArgv['force-winpty'],
  };
  (await getWindow(lArgv['new-window'])).send('create-terminal', options);
}
