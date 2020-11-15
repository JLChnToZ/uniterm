"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showCredits = exports.showAbout = exports.versionString = exports.packageJson = exports.rootPath = void 0;
const tslib_1 = require("tslib");
const about_window_1 = tslib_1.__importDefault(require("about-window"));
const fs_1 = require("fs");
const path_1 = require("path");
const default_context_menu_1 = require("./default-context-menu");
const remote_wrapper_1 = require("./remote-wrapper");
exports.rootPath = path_1.resolve(__dirname, '..');
exports.packageJson = JSON.parse(fs_1.readFileSync(path_1.resolve(exports.rootPath, 'package.json'), 'utf-8'));
exports.versionString = `${exports.packageJson.name} v${exports.packageJson.version}\n` +
    Object.keys(process.versions)
        .map(compoment => `${compoment} v${process.versions[compoment]}`)
        .join('\n');
function showAbout(_menu, browserWindow) {
    about_window_1.default({
        icon_path: path_1.resolve(__dirname, '../icons/uniterm.png'),
        package_json_dir: exports.rootPath,
        adjust_window_size: false,
        use_version_info: true,
        win_options: {
            resizable: false,
            maximizable: false,
            minimizable: false,
            modal: true,
            parent: browserWindow,
        },
    });
}
exports.showAbout = showAbout;
let creditsWindow;
function showCredits() {
    if (creditsWindow) {
        creditsWindow.focus();
        return;
    }
    creditsWindow = new remote_wrapper_1.electron.BrowserWindow();
    creditsWindow.loadFile(path_1.resolve(path_1.dirname(remote_wrapper_1.electron.app.getPath('exe')), 'LICENSES.chromium.html'));
    creditsWindow.on('close', () => creditsWindow = undefined);
    creditsWindow.webContents
        .on('will-navigate', preventNavigate)
        .on('new-window', preventNavigate);
    default_context_menu_1.register(creditsWindow);
}
exports.showCredits = showCredits;
function preventNavigate(e, url) {
    e.preventDefault();
    remote_wrapper_1.electron.shell.openExternal(url);
}
default_context_menu_1.defaultContextMenuTemplateBase.push({ type: 'separator' }, { label: `About ${exports.packageJson.name}`, click: showAbout });
//# sourceMappingURL=version.js.map