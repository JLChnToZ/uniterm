import argvSplit from 'argv-split';
import defaultShell from 'default-shell';
import { remote } from 'electron';
import h from 'hyperscript';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { delimiter } from 'path';
import escape from 'shell-escape';
import { draggingTab } from './dndtabs';
import { interceptEvent } from './domutils';
import { TerminalLaunchOptions } from './interfaces';
import { existsAsync, isExeAsync, lstatAsync } from './pathutils';
import { Tab } from './tab';

let launch: HTMLInputElement;
let pause = false;
let createTab: ((options: TerminalLaunchOptions, newWindow?: boolean) => void) | undefined;
let cwd = remote.app.getPath('home');
let env: any;
let tempEnv: any;
const launchBar = document.body.appendChild(
  <div className="toolbar hidden">
    <a className="icon item" title="Select Shell" onclick={selectShell}>{'\uf68c'}</a>
    {launch = <input type="text" className="search" placeholder={defaultShell} onkeydown={e => {
      switch(e.which) {
        default: return;
        case 27: /* Escape */ toggleOpen(); break;
        case 13: /* Enter */ doLaunch(e.shiftKey); break;
      }
      e.preventDefault();
    }} ondragenter={acceptDrop} ondragover={acceptDrop} ondrop={e => {
      let intercept = false;
      if(draggingTab) {
        const tab = Tab.find(draggingTab);
        if(tab && tab.pty) {
          const { pty } = tab;
          const args: string[] = [];
          if(pty.rawPath) args.push(pty.rawPath);
          args.push(pty.path, ...pty.argv);
          launch.value = escape(args);
          cwd = pty.cwd;
          tempEnv = env = pty.env;
          intercept = true;
        }
      } else {
        const { items } = e.dataTransfer;
        if(items && items.length) {
          // tslint:disable-next-line:prefer-for-of
          for(let i = 0; i < items.length; i++) {
            const item = items[i];
            switch(item.kind) {
              case 'file': {
                checkAndDropFile(item);
                intercept = true;
                break;
              }
            }
          }
          items.clear();
        }
      }
      if(intercept) interceptEvent(e);
      e.dataTransfer.clearData();
    }} /> as HTMLInputElement}
    <a className="icon item" title="Change Working Directory" onclick={selectCWD}>{'\uf751'}</a>
    <a className="icon item" title="Environment Variables" onclick={toggleEnvPrompt}>{'\ufb2d'}</a>
    <a className="icon item" title="Auto Pause" onclick={e =>
      pause = (e.target as HTMLElement).classList.toggle('active')
    }>{'\uf8e7'}</a>
    <a className="icon item" title="Launch in New Tab" onclick={() => doLaunch(false)}>{'\ufc5a'}</a>
    <a className="icon item" title="Launch in New Window" onclick={() => doLaunch(true)}>{'\ufab0'}</a>
    <a className="icon item" title="Hide" onclick={toggleOpen}>{'\uf85f'}</a>
  </div> as HTMLDivElement,
);
const envControl = document.body.appendChild(
  <textarea className="hidden prompt-field" onkeydown={e => {
    switch(e.which) {
      default: return;
      case 27: /* Escape */ toggleEnvPrompt(); break;
    }
    e.preventDefault();
  }}
  /> as HTMLTextAreaElement,
);

async function selectShell() {
  const filters: Electron.FileFilter[] = [{
    name: 'All Files',
    extensions: ['*'],
  }];
  if(process.platform === 'win32')
    filters.unshift({
      name: 'Executables',
      extensions: process.env.PATHEXT.split(delimiter).map(ext => ext.replace(/[\*\.]/g, '')),
    });
  const pathInfo = await getPath();
  const result = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: 'Select Shell',
    properties: ['openFile'],
    filters,
    defaultPath: pathInfo && pathInfo.path || undefined,
  });
  if(result.canceled) return;
  launch.value = result.filePaths[0];
}

async function selectCWD() {
  const result = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
    title: 'Select Working Directory',
    properties: ['openDirectory'],
    defaultPath: cwd,
  });
  if(result.canceled) return;
  cwd = result.filePaths[0];
}

async function checkAndDropFile(item: DataTransferItem) {
  const path = item.getAsFile().path;
  if(!await existsAsync(path))
    return;
  if((await lstatAsync(path)).isDirectory()) {
    cwd = path;
    return;
  }
  if(await isExeAsync(path))
    launch.value = path;
}

export function toggleOpen() {
  if(!launchBar.classList.toggle('hidden')) {
    cwd = remote.app.getPath('home');
    tempEnv = env = undefined;
    launch.value = '';
    launch.focus();
  }
}

function acceptDrop(e: DragEvent) {
  interceptEvent(e);
  const { dataTransfer } = e;
  if(draggingTab) {
    dataTransfer.dropEffect = 'copy';
    return;
  }
  for(const type of dataTransfer.types)
    switch(type) {
      case 'Files':
        dataTransfer.dropEffect = 'link';
        return;
      case 'text':
        dataTransfer.dropEffect = e.ctrlKey ? 'copy' : 'move';
        return;
    }
  dataTransfer.dropEffect = 'none';
}

function toggleEnvPrompt() {
  if(envControl.classList.toggle('hidden'))
    try {
      env = undefined;
      tempEnv = loadYaml(envControl.value);
      for(const key in tempEnv)
        if(process.env[key] !== tempEnv[key]) {
          if(!env) env = {};
          env[key] = tempEnv[key];
        }
    } catch {
    }
  else
    try {
      if(!tempEnv) tempEnv = process.env;
      envControl.value = `# Press Esc to Quit Edit Mode.\n\n${dumpYaml(tempEnv, {
        indent: 2,
      })}`;
    } catch {
    } finally {
      envControl.focus();
    }
}

export function init(fn: (options: TerminalLaunchOptions, newWindow?: boolean) => void) {
  createTab = fn;
}

async function getPath(forgiveBackend?: boolean): Promise<TerminalLaunchOptions | undefined> {
  let path = launch.value.trim() || launch.placeholder;
  let argv: string[] | undefined;
  if(await existsAsync(path))
    return { path, argv: [] };
  argv = argvSplit(path);
  path = argv.shift();
  if(!forgiveBackend && !await existsAsync(path))
    return;
  return { path, argv };
}

async function doLaunch(newWindow: boolean) {
  if(!createTab) return;
  toggleOpen();
  const pathInfo = await getPath(true);
  createTab({
    path: pathInfo && pathInfo.path || defaultShell,
    argv: pathInfo && pathInfo.argv,
    cwd,
    pause,
    env,
  }, newWindow);
}
