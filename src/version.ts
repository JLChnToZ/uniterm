import showAboutWindow from 'about-window';
import { readFileSync } from 'fs';
import { dirname, resolve as resolvePath } from 'path';
import { defaultContextMenuTemplate, register as registerMenu } from './default-context-menu';
import { electron } from './remote-wrapper';

const rootPath = resolvePath(__dirname, '..');
const packageJson = JSON.parse(readFileSync(resolvePath(rootPath, 'package.json'), 'utf-8'));

export const versionString = `${packageJson.name} v${packageJson.version}\n` +
  (Object.keys(process.versions) as Array<keyof NodeJS.ProcessVersions>)
  .map(compoment => `${compoment} v${process.versions[compoment]}`)
  .join('\n');

export function showAbout() {
  showAboutWindow({
    icon_path: resolvePath(__dirname, '../icons/uniterm.png'),
    package_json_dir: rootPath,
    adjust_window_size: false,
    use_version_info: true,
    win_options: {
      resizable: false,
    },
  });
}

let creditsWindow: Electron.BrowserWindow | undefined;

export function showCredits() {
  if(creditsWindow) {
    creditsWindow.focus();
    return;
  }
  creditsWindow = new electron.BrowserWindow();
  creditsWindow.loadFile(resolvePath(dirname(electron.app.getPath('exe')), 'LICENSES.chromium.html'));
  creditsWindow.on('close', () => creditsWindow = undefined);
  creditsWindow.webContents
    .on('will-navigate', preventNavigate)
    .on('new-window', preventNavigate);
  registerMenu(creditsWindow);
}

function preventNavigate(e: Electron.Event, url: string) {
  e.preventDefault();
  electron.shell.openExternal(url);
}

defaultContextMenuTemplate.push(
  { type: 'separator' },
  { role: 'about', click: showAbout },
);
