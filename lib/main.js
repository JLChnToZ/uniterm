"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const fs_1 = require("fs");
const path_1 = require("path");
const yargs = require("yargs");
const config_1 = require("./config");
const default_context_menu_1 = require("./default-context-menu");
const pathutils_1 = require("./pathutils");
const windows = {};
const readyWindowIds = new Set();
let activeReadyWindowId;
const openingWindows = {};
const { name: packageName, version } = JSON.parse(fs_1.readFileSync(path_1.resolve(__dirname, '../package.json'), 'utf-8'));
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
    .version(`${packageName} v${version}\n` +
    Object.keys(process.versions)
        .map(compoment => `${compoment} v${process.versions[compoment]}`)
        .join('\n'))
    .help();
const argv = args.parse(process.argv.slice(1));
if (argv.config || argv['reset-config'])
    config_1.loadConfig(false, argv['reset-config']).then(() => {
        if (argv.config)
            electron_1.shell.openItem(config_1.configFilePath);
        electron_1.app.quit();
    }, reason => {
        console.error(reason.message || reason);
        electron_1.app.quit();
    });
else if (!electron_1.app.requestSingleInstanceLock())
    electron_1.app.quit();
else {
    config_1.loadConfig();
    electron_1.app.on('ready', () => openShell(argv, process.cwd()));
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    });
    electron_1.app.on('activate', () => {
        if (!Object.keys(windows).length)
            createWindow();
    });
    electron_1.app.on('second-instance', (e, lArgv, cwd) => openShell(args.exitProcess(false).parse(lArgv.slice(1)), cwd));
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
    });
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
    window.loadFile(path_1.resolve(__dirname, '../static/index.html'));
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
    // Resolve working directory, resolve to users's home if not set and launched directly at the executable path.
    try {
        if (lArgv.cwd)
            cwd = pathutils_1.tryResolvePath(cwd, lArgv.cwd);
        else if (!path_1.relative(cwd, path_1.dirname(electron_1.app.getPath('exe'))))
            cwd = process.platform === 'win32' && lArgv._[0] === 'wsl' ? '~' : electron_1.app.getPath('home');
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