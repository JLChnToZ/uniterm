"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = require("path");
const yargs = require("yargs");
const config_1 = require("./config");
const default_context_menu_1 = require("./default-context-menu");
const pathutils_1 = require("./pathutils");
const protocol_1 = require("./protocol");
const uachost_1 = require("./terminals/uachost");
const version_1 = require("./version");
const windows = {};
const readyWindowIds = new Set();
let activeReadyWindowId;
const openingWindows = {};
const args = yargs
    .scriptName(version_1.packageJson.name)
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
    .version(version_1.versionString)
    .help();
const argv = electron_1.app.isPackaged ?
    args.parse(process.argv.slice(1)) :
    args.argv;
(async (userDataPath) => {
    if (!userDataPath)
        return;
    const original = electron_1.app.getPath('userData');
    try {
        userDataPath = path_1.resolve(process.cwd(), userDataPath);
        if (original === userDataPath)
            return;
        electron_1.app.setPath('userData', userDataPath);
        await pathutils_1.ensureDirectory(userDataPath);
    }
    catch (_a) {
        electron_1.app.setPath('userData', original);
        config_1.reloadConfigPath(true);
    }
})(argv['user-data'] || process.env.UNITERM_USER_DATA);
if (argv.pipe) {
    electron_1.app.disableHardwareAcceleration();
    uachost_1.connectToClient(argv.pipe);
}
else if (argv.config || argv['reset-config'])
    (async (resetConfig) => {
        try {
            await config_1.loadConfig(false, resetConfig);
            if (argv.config)
                electron_1.shell.openItem(config_1.configFilePath);
        }
        catch (e) {
            console.error(e.message || e);
        }
        electron_1.app.quit();
    })(argv['reset-config']);
else if (!argv.isolated && !electron_1.app.requestSingleInstanceLock()) {
    printFlagNoEffectWarning(argv, 'disable-hardware-acceleration');
    printFlagNoEffectWarning(argv, 'disable-domain-blocking-for-3d-apis');
    electron_1.app.quit();
}
else {
    if (argv['disable-hardware-acceleration'])
        electron_1.app.disableHardwareAcceleration();
    if (argv['disable-domain-blocking-for-3d-apis'])
        electron_1.app.disableDomainBlockingFor3DAPIs();
    config_1.loadConfig();
    args.exitProcess(false);
    const workingDir = process.cwd();
    process.chdir(path_1.dirname(electron_1.app.getPath('exe')));
    electron_1.app.on('ready', () => {
        protocol_1.register();
        openShell(argv, workingDir);
    }).on('window-all-closed', () => {
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    }).on('activate', () => {
        if (!Object.keys(windows).length)
            createWindow();
    });
    if (!argv.isolated)
        electron_1.app.on('second-instance', (e, lArgv, cwd) => openShell(args.parse(electron_1.app.isPackaged ? lArgv.slice(1) : lArgv), cwd));
    electron_1.ipcMain.on('ready', (e) => {
        const { id } = e.sender;
        readyWindowIds.add(id);
        if (activeReadyWindowId === undefined)
            activeReadyWindowId = id;
        if (openingWindows[id]) {
            for (const resolve of openingWindows[id])
                resolve(e.sender);
            delete openingWindows[id];
        }
        else
            e.sender.send('create-terminal', {});
    }).on('show-config', () => electron_1.shell.openItem(config_1.configFilePath));
}
function printFlagNoEffectWarning(lArgv, key) {
    if (lArgv[key])
        console.warn('Warning: `%s` currently has no effect ' +
            'because there is already an instance of Uniterm is running.', key);
}
function createWindow() {
    const window = new electron_1.BrowserWindow({
        height: 600,
        width: 800,
        icon: path_1.resolve(__dirname, `../icons/uniterm.${process.platform === 'win32' ? 'ico' : 'png'}`),
        frame: false,
        titleBarStyle: 'hiddenInset',
    });
    const { id } = window;
    window.loadURL('uniterm://app/');
    window.setMenu(null);
    default_context_menu_1.register(window);
    windows[id] = window;
    window.on('closed', () => {
        readyWindowIds.delete(id);
        delete windows[id];
        if (activeReadyWindowId === id)
            activeReadyWindowId = [...readyWindowIds][0];
    });
    window.on('focus', () => {
        if (readyWindowIds.has(id))
            activeReadyWindowId = id;
    });
    return id;
}
function getWindow(newWindow) {
    if (!newWindow && activeReadyWindowId !== undefined)
        return Promise.resolve(windows[activeReadyWindowId].webContents);
    return new Promise(resolve => {
        const windowId = createWindow();
        if (openingWindows[windowId])
            openingWindows[windowId].push(resolve);
        else
            openingWindows[windowId] = [resolve];
    });
}
async function openShell(lArgv, cwd) {
    // Join env values
    const env = {};
    if (Array.isArray(lArgv.env) && lArgv.env.length)
        for (let i = 0; i < lArgv.env.length; i += 2)
            env[lArgv.env[i]] = lArgv.env[i + 1];
    env.UNITERM_USER_DATA = electron_1.app.getPath('userData');
    // Resolve working directory
    try {
        if (lArgv.cwd)
            cwd = pathutils_1.tryResolvePath(cwd, lArgv.cwd);
        else {
            let cdPath = false;
            if (lArgv._.length === 1 && !await pathutils_1.isExeAsync(lArgv._[0], { ignoreErrors: true })) {
                // Hidden usage: if the *only* parameter is a valid directory path,
                // treat it as working directory.
                const tryPath = path_1.resolve(cwd, lArgv._[0]);
                if (await pathutils_1.existsAsync(tryPath) && (await pathutils_1.lstatAsync(tryPath)).isDirectory()) {
                    cwd = tryPath;
                    lArgv._.length = 0;
                    cdPath = true;
                }
            }
            if (!cdPath && !path_1.relative(cwd, path_1.dirname(electron_1.app.getPath('exe'))))
                // Resolve cwd to users's home if not set and launched directly at the executable path.
                cwd = process.platform === 'win32' && lArgv._[0] === 'wsl' ? '~' : electron_1.app.getPath('home');
        }
    }
    catch (_a) { }
    const options = {
        path: lArgv._[0],
        argv: lArgv._.slice(1),
        cwd,
        env,
        pause: lArgv.pause,
    };
    (await getWindow(lArgv['new-window'])).send('create-terminal', options);
}
//# sourceMappingURL=main.js.map