import { IpcMessageEvent, ipcRenderer, remote } from 'electron';
import * as h from 'hyperscript';
import { resolve as resolvePath } from 'url';
import { ITerminalOptions } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';
import { configFile, events, loadConfig, startWatch } from './config';
import { interceptDrop, interceptEvent, loadScript } from './domutils';
import { TerminalLaunchOptions } from './interfaces';
import { lazyProperty } from './lazy-decorator';
import { existsAsync, isExeAsync, lstatAsync } from './pathutils';
import { Tab } from './tab';
import { createBackend, register } from './terminals';
import { attach as attachWinCtrl } from './winctrl';
import { startDetect as detectZoomGesture } from './zoom-gesture-detector';

const homePath = remote.app.getPath('home');
const browserWindow = remote.getCurrentWindow();

const tabContainer = <div className="flex" /> as HTMLDivElement;
const layoutContainer = document.body.appendChild(<div className="layout-container" /> as HTMLDivElement);
const header = layoutContainer.appendChild(<div className="header pty-tabs">
  {tabContainer}
  <a className="icon item" onclick={e => createTab({ cwd: homePath }, e.ctrlKey)}
    onmouseup={e => {
      if(e.button !== 1) return;
      e.preventDefault();
      createTab({ cwd: homePath }, true);
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
  <a className="icon item" onclick={() => ipcRenderer.send('show-config')} title="Config">{'\uf085'}</a>
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
    tab.printDisposableMessage(`Error while creating backend: ${e.message || e}`, true);
  }
  browserWindow.focus();
}

function acceptFileDrop(e: DragEvent) {
  interceptEvent(e);
  const { dataTransfer } = e;
  for(const type of dataTransfer.types)
    switch(type) {
      case 'Files':
        dataTransfer.dropEffect = 'link';
        return;
    }
  dataTransfer.dropEffect = 'none';
}

if(process.platform === 'darwin')
  header.insertBefore(<div className="window-control-mac" />, header.firstElementChild);
else
  attachWinCtrl(header);

events.on('config', () => {
  window.dispatchEvent(new CustomEvent('configreload', {}));
  if(!configFile) return;
  if(configFile.terminal)
    reloadTerminalConfig(configFile.terminal);
  if(configFile.mods && configFile.mods.length)
    for(const mod of configFile.mods)
      loadScript(resolvePath('userdata/', mod));
});

function reloadTerminalConfig(options: ITerminalOptions) {
  if(Tab.tabCount) {
    const keys = Object.keys(options) as Array<keyof ITerminalOptions>;
    for(const tab of Tab.allTabs()) {
      if(!tab.terminal) continue;
      const { terminal } = tab;
      for(const key of keys) {
        const value = options[key];
        if(terminal.getOption(key) !== value)
          terminal.setOption(key, value);
      }
      if(tab.active) fit(terminal);
    }
  }
  const { style } = document.body;
  if(options.theme) {
    const { theme } = options;
    style.backgroundColor = theme.background || 'inherit';
    style.color = theme.foreground || 'inherit';
  } else {
    style.backgroundColor = 'inherit';
    style.color = 'inherit';
  }
}

ipcRenderer.on('create-terminal', (e: IpcMessageEvent, options: TerminalLaunchOptions) =>
  createTab(options),
);

window.addEventListener('beforeunload', e => {
  if(Tab.tabCount > 1 && remote.dialog.showMessageBox(browserWindow, {
    type: 'question',
    title: 'Exit?',
    message: `There are still ${Tab.tabCount} sessions are opened, do you really want to close?`,
    buttons: ['Yes', 'No'],
  })) e.returnValue = false;
});

const { body } = document;

body.addEventListener('dragenter', interceptDrop);
body.addEventListener('dragover', interceptDrop);
body.addEventListener('wheel', e => {
  if(!e.ctrlKey || !(e.target as Element).matches('.pty-container *'))
    return;
  interceptEvent(e);
  handleZoom(e.deltaZ || e.deltaY);
}, true);

let gestureZoom = 0;
const gestureZoomTheshold = 10;
detectZoomGesture(body, d => {
  gestureZoom -= d;
  while(gestureZoom > gestureZoomTheshold) {
    handleZoom(gestureZoom);
    gestureZoom -= gestureZoomTheshold;
  }
  while(gestureZoom < -gestureZoomTheshold) {
    handleZoom(gestureZoom);
    gestureZoom += gestureZoomTheshold;
  }
}, true);

function handleZoom(delta: number) {
  const options = configFile && configFile.terminal || {};
  if(!options.fontSize)
    options.fontSize = 12;
  else if(delta > 0 && options.fontSize > 1)
    options.fontSize--;
  else if(delta < 0)
    options.fontSize++;
  else return;
  reloadTerminalConfig(options);
}

if(document.readyState !== 'complete')
  document.addEventListener('readystatechange', () => {
    if(document.readyState === 'complete')
      ipcRenderer.send('ready');
  });
else
  ipcRenderer.send('ready');

startWatch();

// Expose everything for mods, except for requirable stuffs
Object.assign(window, { Tab, registerTerminalHandler: register });
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
lazyProperty.require(require, './remote-wrapper', 'electron', window);
lazyProperty.require(require, './terminals/base', 'TerminalBase', window);
lazyProperty.require(require, './terminals/pty', 'PtyShell', window);
lazyProperty.require(require, './terminals/wslpty', 'WslPtyShell', window);
lazyProperty.require(require, './terminals/uacwrapper', 'UACClient', window);
