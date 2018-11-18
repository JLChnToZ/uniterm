import { ipcRenderer, IpcMessageEvent, remote } from 'electron';
import * as h from 'hyperscript';
import { Terminal, IDisposable } from 'xterm';
import { TerminalBase, TerminalOptions } from './terminals/base';
import { PtyShell } from './terminals/pty';
import { WslPtyShell } from './terminals/wslpty';

Terminal.applyAddon(require('xterm/lib/addons/fit/fit'));
Terminal.applyAddon(require('xterm/lib/addons/fullscreen/fullscreen'));
Terminal.applyAddon(require('xterm/lib/addons/search/search'));
Terminal.applyAddon(require('xterm/lib/addons/webLinks/webLinks'));
Terminal.applyAddon(require('xterm/lib/addons/winptyCompat/winptyCompat'));

const rootContainer = document.body.appendChild(<div className="pty-tabs" />) as HTMLElement;
const tabContainer = rootContainer.appendChild(<div className="ts top attached mini tabbed menu" />) as HTMLElement;
const addButton = tabContainer.appendChild(<a className="item" onclick={() => new Tab().attach(createBackend({}))}>
  <i className="ts plus icon" />
</a> as HTMLElement);
const tabs = new Set<Tab>();
let activeTab: Tab | undefined;

class Tab implements IDisposable {
  terminal: Terminal;
  pty: TerminalBase<unknown>;
  disposables: IDisposable[];
  title: string;
  tabElement: HTMLElement;
  tabContent: HTMLElement;
  active: boolean;

  constructor() {
    this.terminal = new Terminal({
      fontFamily: 'powerlinesymbols, monospace'
    });
    this.disposables = [];
    this.active = true;
    tabContainer.insertBefore(this.tabElement = <a className="item" onclick={this.onEnable.bind(this)}>
      {''}
      <a className="ts small negative close button" onclick={this.dispose.bind(this)} />
    </a> as HTMLElement, addButton);
    this.tabContent = <div ondrop={async e => {
      e.preventDefault();
      e.stopPropagation();
      const result: string[] = [];
      const stringData: DataTransferItem[] = [];
      const { items } = e.dataTransfer;
      if(items) {
        for(let i = 0; i < items.length; i++) {
          const item = items[i];
          switch(item.kind) {
            case 'file': result.push(item.getAsFile().path); break;
            case 'string': if(item.type === 'text/plain') stringData.push(item); break;
          }
        }
        if(stringData.length)
          this.pty.write((await Promise.all(stringData.map(getAsStringAsync))).join(''));
        items.clear();
      } else {
        const { files } = e.dataTransfer;
        for(let i = 0; i < files.length; i++)
          result.push(files[i].path);
        e.dataTransfer.clearData();
      }
      this.pty.dropFiles(result);
    }} /> as HTMLElement;
    rootContainer.appendChild(this.tabContent);
    this.terminal.open(this.tabContent.appendChild(<div className="pty-container" />) as HTMLDivElement);
    this.onEnable();
    tabs.add(this);
  }

  attach(pty: TerminalBase<unknown>) {
    if(this.pty || !this.terminal) return;
    this.pty = pty;
    this.disposables.push(
      this.terminal.addDisposableListener('data', this.onDataInput.bind(this)),
      this.terminal.addDisposableListener('resize', ({ cols, rows }) => this.pty.resize(cols, rows)),
      this.terminal.addDisposableListener('title', this.onTitle.bind(this)),
      attachDisposable(pty, 'data', this.onDataOutput.bind(this)),
      attachDisposable(pty, 'end', this.dispose.bind(this)),
    );
    this.pty.resize(this.terminal.cols, this.terminal.rows);
    this.pty.spawn();
    this.onTitle(pty.process);
  }

  onEnable() {
    this.tabElement.className = 'active item';
    this.tabContent.className = 'ts active bottom attached inverted tab segment';
    (this.terminal as any).fit();
    this.terminal.focus();
    this.active = true;
    activeTab = this;
    setTitle(this.title);
    for(const tab of tabs)
      if(tab && tab !== this)
        tab.onDisable();
  }

  onDisable() {
    this.tabElement.className = 'item';
    this.tabContent.className = 'ts bottom attached inverted tab segment';
    this.active = false;
  }

  onDataInput(text: string) {
    this.pty && this.pty.write(text, 'utf8');
  }

  onDataOutput(data: string | Buffer) {
    this.terminal && this.terminal.write(Buffer.isBuffer(data) ? data.toString('utf8') : data);
  }

  onTitle(title: string) {
    this.title = title || this.pty && this.pty.process || 'Shell';
    this.tabElement && (this.tabElement.firstChild.textContent = this.title);
    if(this.active) setTitle(this.title);
  }

  dispose() {
    tabs.delete(this);
    if(activeTab == this) {
      activeTab = [...tabs][0];
      if(activeTab)
        activeTab.onEnable();
    }
    if(this.pty) {
      this.pty.destroy();
      delete this.pty;
    }
    if(this.disposables) {
      for(const disposable of this.disposables)
        disposable && disposable.dispose();
      this.disposables.length = 0;
    }
    if(this.tabContent) {
      this.tabContent.remove();
      delete this.tabContent;
    }
    if(this.tabElement) {
      this.tabElement.remove();
      delete this.tabElement;
    }
    if(!tabs.size) window.close();
  }
}

const originalTitle = document.title;
function setTitle(title?: string) {
  if(title) document.title = `${title} - ${originalTitle}`;
  else document.title = originalTitle;
}

function attachDisposable(listener: NodeJS.EventEmitter, key: string, callback: (...args: any[]) => void): IDisposable {
  listener.on(key, callback);
  return { dispose() {
    listener.removeListener(key, callback);
    callback = null;
  } };
}

function createBackend(options: TerminalOptions): TerminalBase<unknown> {
  if(process.platform === 'win32' && options && options.path === 'wsl') {
    if(options.argv) {
      options.path = options.argv[0];
      options.argv = options.argv.slice(1);
    } else
      delete options.path;
    return new WslPtyShell(options);
  }
  return new PtyShell(options);
}

function destroyAllTabs() {
  for(const tab of tabs)
    if(tab) tab.dispose();
}

function getAsStringAsync(d: DataTransferItem) {
  return new Promise<string>(resolve => d.getAsString(resolve));
}

ipcRenderer.on('create-terminal', (e: IpcMessageEvent, options: TerminalOptions) => {
  new Tab().attach(createBackend(options));
});

window.addEventListener('beforeunload', e => {
  if(tabs.size > 1) {
    e.returnValue = false;
    remote.dialog.showMessageBox(remote.getCurrentWindow(), {
      type: 'question',
      title: 'Exit?',
      message: `There are still ${tabs.size} sessions are opened, do you really want to close?`,
      buttons: ['Yes', 'No'],
    }, response => {
      if(response === 0) {
        destroyAllTabs();
        window.close();
      }
    });
  }
});

window.addEventListener('close', destroyAllTabs);

window.addEventListener('resize', () => {
  if(activeTab && activeTab.terminal)
    (activeTab.terminal as any).fit();
});

document.body.addEventListener('dragover', e => e.preventDefault());

if(document.readyState !== 'complete')
  document.addEventListener('readystatechange', () => {
    if(document.readyState === 'complete')
      ipcRenderer.send('ready');
  });
else
  ipcRenderer.send('ready');
