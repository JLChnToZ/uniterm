import { ipcRenderer, remote } from 'electron';
import h from 'hyperscript';
import Module from 'module';
import { dirname } from 'path';
import TinyColor from 'tinycolor2';
import { resolve as resolvePath } from 'url';
import { ITerminalOptions } from 'xterm';
import { configFile, events, loadConfig, startWatch } from './config';
import { init as initDraggable } from './dndtabs';
import { acceptFileDrop, interceptDrop, interceptEvent, loadScript } from './domutils';
import { TerminalLaunchOptions } from './interfaces';
import { existsAsync, isExeAsync, lstatAsync } from './pathutils';
import { requireLater } from './require-later';
import { Tab } from './tab';
import { createBackend, register } from './terminals';
import { checkVibrancy } from './vibrant';
import { attach as attachWinCtrl, registerDraggableDoubleClick } from './winctrl';
import { launchBar } from './toolbars/advanced-open';
import { searchBar } from './toolbars/search';
import './toolbars/pty-options';

const homePath = remote.app.getPath('home');
const browserWindow = remote.getCurrentWindow();

const dynamicStyle = document.head.appendChild(<style type="text/css" /> as HTMLStyleElement).sheet as CSSStyleSheet;
const tabContainer = <div className="flex" /> as HTMLDivElement;
const layoutContainer = document.body.appendChild(<div className="layout-container" /> as HTMLDivElement);
const header = layoutContainer.appendChild(<div className="header pty-tabs">
  <a className="icon item" onclick={e => {
    try {
      const state = !browserWindow.isAlwaysOnTop();
      browserWindow.setAlwaysOnTop(state);
      (e.target as Node).textContent = state ? '\uf902' : '\uf903';
    } catch {}
  }} title="Always on Top">{'\uf903'}</a>
  {tabContainer}
  <a className="icon item" onclick={e => createTab({ cwd: homePath }, e.ctrlKey)}
    onmouseup={e => {
      if(e.button !== 1) return;
      e.preventDefault();
      createTab({ cwd: homePath }, true);
    }}
    oncontextmenu={e => {
      if(e.ctrlKey) return;
      e.preventDefault();
      launchBar.show();
    }}
    ondragenter={acceptFileDrop} ondragover={acceptFileDrop} ondrop={async e => {
    interceptEvent(e);
    const { items } = e.dataTransfer;
    if(items && items.length) {
      // tslint:disable-next-line:prefer-for-of
      for(let i = 0; i < items.length; i++) {
        const item = items[i];
        let backend: TerminalLaunchOptions | undefined;
        switch(item.kind) {
          case 'file': {
            const path = item.getAsFile().path;
            if(!await existsAsync(path))
              break;
            if((await lstatAsync(path)).isDirectory()) {
              backend = { cwd: path };
              break;
            }
            if(await isExeAsync(path))
              backend = { path, cwd: homePath };
            break;
          }
        }
        if(backend) await createTab(backend, e.ctrlKey);
      }
      items.clear();
    }
    e.dataTransfer.clearData();
  }} title="Add Tab">{'\uf914'}</a>
  <div className="drag" />
  <a className="icon item" onclick={searchBar.show} title="Search">{'\uf848'}</a>
  <a className="icon item" onclick={() => ipcRenderer.send('show-config')} title="Config">{'\uf992'}</a>
</div> as HTMLDivElement);

async function createTab(options: TerminalLaunchOptions, newWindow?: boolean) {
  if(newWindow) {
    ipcRenderer.send('create-terminal-request', options);
    return;
  }
  await loadConfig();
  const tab = new Tab(tabContainer, layoutContainer, options.pause);
  try {
    tab.attach(createBackend(options));
  } catch(e) {
    tab.printDisposableMessage(`Error while creating backend: ${e.message || e}`);
  }
  browserWindow.focus();
}

if(process.platform === 'darwin')
  header.insertBefore(<div className="window-control-mac" />, header.firstElementChild);
else
  attachWinCtrl(header);
registerDraggableDoubleClick();

events.on('config', () => {
  window.dispatchEvent(new CustomEvent('configreload', {}));
  if(!configFile) return;
  if(configFile.terminal)
    reloadTerminalConfig(configFile.terminal);
  checkVibrancy(browserWindow);
  if(configFile.mods && configFile.mods.length)
    for(const mod of configFile.mods)
      loadScript(resolvePath('userdata/', mod));
});

const colorRuleNormal = (dynamicStyle.cssRules[
  dynamicStyle.insertRule('html, body, .vibrant:not(.maximized) .toolbar::before {}')
] as CSSStyleRule).style;
const colorRuleVibrant = (dynamicStyle.cssRules[
  dynamicStyle.insertRule('.vibrant:not(.maximized) body {}')
] as CSSStyleRule).style;

function replaceBodyColor(bgColor?: string, fgColor?: string) {
  colorRuleNormal.color = fgColor || 'inherit';
  colorRuleNormal.backgroundColor = bgColor ? TinyColor(bgColor).setAlpha(1).toString() : 'inherit';
  colorRuleVibrant.backgroundColor = bgColor || 'inherit';
}

function reloadTerminalConfig(options: ITerminalOptions) {
  if(options.theme) {
    const { theme } = options;
    replaceBodyColor(theme.background, theme.foreground);
    if(theme.background && options.allowTransparency)
      theme.background = TinyColor(theme.background).setAlpha(0).toString();
  } else
    replaceBodyColor();
  if(Tab.tabCount)
    for(const tab of Tab.allTabs()) {
      tab.updateSettings(options);
      if(tab.active) tab.fit();
    }
}

ipcRenderer.on('create-terminal', (e, options: TerminalLaunchOptions) =>
  createTab(options),
);

let closeComfirmed = false;
window.addEventListener('beforeunload', async e => {
  if(Tab.tabCount <= 1 || closeComfirmed) return;
  e.preventDefault();
  e.returnValue = false;
  if((await remote.dialog.showMessageBox(browserWindow, {
    type: 'question',
    title: 'Exit?',
    message: `There are still ${Tab.tabCount} sessions are opened, do you really want to close?`,
    buttons: ['Yes', 'No'],
  })).response === 0) {
    closeComfirmed = true;
    window.close();
  }
});

const { body } = document;

body.addEventListener('dragenter', interceptDrop);
body.addEventListener('dragover', interceptDrop);

if(document.readyState !== 'complete')
  document.addEventListener('readystatechange', () => {
    if(document.readyState === 'complete')
      ipcRenderer.send('ready');
  });
else
  ipcRenderer.send('ready');

startWatch();
launchBar.createTab = createTab;
initDraggable(tabContainer);

// Expose everything for mods, except for requirable stuffs
const fakePath = resolvePath(__dirname + '/', '../__renderer');
Object.assign(window, {
  Tab,
  registerTerminalHandler: register,
  require: Module.createRequireFromPath(fakePath),
  __dirname: dirname(fakePath),
});
Object.defineProperty(window, 'activeTab', {
  get() { return Tab.activeTab; },
  set(value: Tab) {
    if(!(value instanceof Tab))
      return;
    Tab.activeTab = value;
    Tab.activeTab.onEnable();
  },
});
// Lazy require to expose, they will not load if nobody is going to use them.
requireLater(require, './remote-wrapper', window, 'electron');
requireLater(require, './terminals/base', window, 'TerminalBase');
requireLater(require, './terminals/pty', window, 'PtyShell');
requireLater(require, './terminals/wslpty', window, 'WslPtyShell');
requireLater(require, './terminals/uacwrapper', window, 'UACClient');
