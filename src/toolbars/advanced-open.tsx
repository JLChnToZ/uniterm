import argvSplit from 'argv-split';
import defaultShell from 'default-shell';
import { remote } from 'electron';
import h from 'hyperscript';
import { dump as dumpYaml, load as loadYaml } from 'js-yaml';
import { delimiter } from 'path';
import escape from 'shell-escape';
import { draggingTab } from '../dndtabs';
import { interceptEvent } from '../domutils';
import { TerminalLaunchOptions } from '../interfaces';
import { existsAsync, isExeAsync, lstatAsync } from '../pathutils';
import { Tab } from '../tab';
import { Toolbar } from './base';
import { readonly, bind } from '../decorators';

class AdvancedOpen extends Toolbar {
  public createTab?: ((options: TerminalLaunchOptions, newWindow?: boolean) => void);
  private launch?: HTMLInputElement;
  private envControl: HTMLTextAreaElement;
  private pause = false;
  private cwd = remote.app.getPath('home');
  private env: any;
  private tempEnv: any;

  constructor() {
    super();
    this.envControl = document.body.appendChild(
      <textarea className="hidden prompt-field" onkeydown={e => {
        switch(e.which) {
          default: return;
          case 27: this.toggleEnvPrompt(); break;
        }
        e.preventDefault();
      }}
      />,
    ) as HTMLTextAreaElement;
  }

  protected render() {
    return [
      <a className="icon item" title="Select Shell" onclick={this.selectShell}>{'\uf68c'}</a>,
      this.launch = <input type="text" className="open input" placeholder={defaultShell} onkeydown={e => {
        switch(e.which) {
          default: return;
          case 27: /* Escape */ this.hide(); break;
          case 13: /* Enter */ this.doLaunch(e.shiftKey); break;
        }
        e.preventDefault();
      }} ondragenter={this.acceptDrop} ondragover={this.acceptDrop} ondrop={e => {
        let intercept = false;
        if(draggingTab) {
          const tab = Tab.find(draggingTab);
          if(tab && tab.pty) {
            const { pty } = tab;
            const args: string[] = [];
            if(pty.rawPath) args.push(pty.rawPath);
            args.push(pty.path, ...pty.argv);
            this.launch.value = escape(args);
            this.cwd = pty.cwd;
            this.tempEnv = this.env = pty.env;
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
                  this.checkAndDropFile(item);
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
      }} /> as HTMLInputElement,
      <a className="icon item" title="Change Working Directory" onclick={this.selectCWD}>{'\uf751'}</a>,
      <a className="icon item" title="Environment Variables" onclick={this.toggleEnvPrompt}>{'\ufb2d'}</a>,
      <a className="icon item" title="Auto Pause" onclick={e =>
        this.pause = (e.target as HTMLElement).classList.toggle('active')
      }>{'\uf8e7'}</a>,
      <a className="icon item" title="Launch in New Tab" onclick={() => this.doLaunch(false)}>{'\ufc5a'}</a>,
      <a className="icon item" title="Launch in New Window" onclick={() => this.doLaunch(true)}>{'\ufab0'}</a>,
    ];
  }

  @readonly @bind
  private async selectCWD() {
    const result = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: 'Select Working Directory',
      properties: ['openDirectory'],
      defaultPath: this.cwd,
    });
    if(result.canceled) return;
    this.cwd = result.filePaths[0];
  }

  @readonly @bind
  private async selectShell() {
    const filters: Electron.FileFilter[] = [{
      name: 'All Files',
      extensions: ['*'],
    }];
    if(process.platform === 'win32')
      filters.unshift({
        name: 'Executables',
        extensions: process.env.PATHEXT.split(delimiter).map(ext => ext.replace(/[\*\.]/g, '')),
      });
    const pathInfo = await this.getPath();
    const result = await remote.dialog.showOpenDialog(remote.getCurrentWindow(), {
      title: 'Select Shell',
      properties: ['openFile'],
      filters,
      defaultPath: pathInfo && pathInfo.path || undefined,
    });
    if(result.canceled) return;
    this.launch.value = result.filePaths[0];
  }

  @readonly @bind
  private async checkAndDropFile(item: DataTransferItem) {
    const path = item.getAsFile().path;
    if(!await existsAsync(path))
      return;
    if((await lstatAsync(path)).isDirectory()) {
      this.cwd = path;
      return;
    }
    if(await isExeAsync(path))
      this.launch.value = path;
  }

  protected onShown() {
    super.onShown();
    this.cwd = remote.app.getPath('home');
    this.tempEnv = this.env = undefined;
    this.launch.value = '';
    this.launch.focus();
  }
  
  private acceptDrop(e: DragEvent) {
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

  @readonly @bind
  private toggleEnvPrompt() {
    if(this.envControl.classList.toggle('hidden'))
      try {
        this.env = undefined;
        this.tempEnv = loadYaml(this.envControl.value);
        for(const key in this.tempEnv)
          if(process.env[key] !== this.tempEnv[key]) {
            if(!this.env) this.env = {};
            this.env[key] = this.tempEnv[key];
          }
      } catch {
      }
    else
      try {
        if(!this.tempEnv) this.tempEnv = process.env;
        this.envControl.value = `# Press <ESC> to quit edit mode.
# Only modified or new values will be passed to new session, others will remain as-is.

${dumpYaml(this.tempEnv, {
  indent: 2,
})}`;
      } catch {
      } finally {
        this.envControl.setSelectionRange(0, 0);
        this.envControl.focus();
      }
  }

  private async getPath(forgiveBackend?: boolean): Promise<TerminalLaunchOptions | undefined> {
    let path = this.launch.value.trim() || this.launch.placeholder;
    let argv: string[] | undefined;
    if(await existsAsync(path))
      return { path, argv: [] };
    argv = argvSplit(path);
    path = argv.shift();
    if(!forgiveBackend && !await existsAsync(path))
      return;
    return { path, argv };
  }
  
  @readonly @bind
  private async doLaunch(newWindow: boolean) {
    if(!this.createTab) return;
    this.hide();
    const pathInfo = await this.getPath(true);
    this.createTab({
      path: pathInfo && pathInfo.path || defaultShell,
      argv: pathInfo && pathInfo.argv,
      cwd: this.cwd,
      pause: this.pause,
      env: this.env,
    }, newWindow);
  }
}

export const launchBar = new AdvancedOpen();
