import { IpcMessageEvent, ipcRenderer, remote } from 'electron';
import * as h from 'hyperscript';
import { resolve as resolvePath } from 'url';
import { ITerminalOptions } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';
import { configFile, events, loadConfig, startWatch } from './config';
import { interceptDrop, interceptEvent, loadScript } from './domutils';
import { TerminalLaunchOptions } from './interfaces';
import { existsAsync, isExeAsync, lstatAsync } from './pathutils';
import { electron } from './remote-wrapper';
import { Tab } from './tab';
import { TerminalBase } from './terminals/base';
import { createBackend } from './terminals/selector';
import { attach as attachWinCtrl } from './winctrl';
import { startDetect as detectZoomGesture } from './zoom-gesture-detector';

const homePath = remote.app.getPath('home');

const tabContainer = <div className="flex" /> as HTMLDivElement;
const layoutContainer = document.body.appendChild(<div className="layout-container" /> as HTMLDivElement);
const header = layoutContainer.appendChild(<div className="header pty-tabs">
  {tabContainer}
  <a className="icon item" onclick={async () => {
    await loadConfig();
    new Tab(tabContainer, layoutContainer).attach(createBackend({
      cwd: homePath,
    }));
  }} ondragenter={acceptFileDrop} ondragover={acceptFileDrop} ondrop={async e => {
    interceptEvent(e);
    const { items } = e.dataTransfer;
    if(items && items.length) {
      // tslint:disable-next-line:prefer-for-of
      for(let i = 0; i < items.length; i++) {
        const item = items[i];
        let backend: TerminalBase<unknown> | undefined;
        switch(item.kind) {
          case 'file': {
            const path = item.getAsFile().path;
            if(!await existsAsync(path))
              break;
            if((await lstatAsync(path)).isDirectory()) {
              backend = createBackend({
                cwd: path,
              });
              break;
            }
            if(await isExeAsync(path))
              backend = createBackend({
                path,
                cwd: homePath,
              });
            break;
          }
        }
        if(backend)
          new Tab(tabContainer, layoutContainer).attach(backend);
      }
      items.clear();
    }
    e.dataTransfer.clearData();
  }} title="Add Tab">{'\uf914'}</a>
  <div className="drag" />
  <a className="icon item" onclick={() => ipcRenderer.send('show-config')} title="Config">{'\uf085'}</a>
</div> as HTMLDivElement);

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

ipcRenderer.on('create-terminal', async (e: IpcMessageEvent, options: TerminalLaunchOptions) => {
  await loadConfig();
  const tab = new Tab(tabContainer, layoutContainer, options.pause);
  tab.attach(createBackend(options));
  remote.getCurrentWindow().focus();
});

window.addEventListener('beforeunload', e => {
  if(Tab.tabCount > 1 && remote.dialog.showMessageBox(remote.getCurrentWindow(), {
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
Object.assign(window, { Tab, electron });
Object.defineProperty(window, 'activeTab', {
  get() { return Tab.activeTab; },
  set(value: Tab) {
    if(!(value instanceof Tab))
      return;
    Tab.activeTab = value;
    Tab.activeTab.onEnable();
  },
});
