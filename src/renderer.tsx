import { IpcMessageEvent, ipcRenderer, remote, shell } from 'electron';
import * as h from 'hyperscript';
import { extname } from 'path';
import { IDisposable, ITerminalOptions, Terminal } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';
import { webLinksInit } from 'xterm/lib/addons/webLinks/webLinks';
import { winptyCompatInit } from 'xterm/lib/addons/winptyCompat/winptyCompat';
import { configFile, events, loadConfig, startWatch } from './config';
import { TerminalBase, TerminalOptions } from './terminals/base';
import { PtyShell } from './terminals/pty';
import { WslPtyShell } from './terminals/wslpty';

let rootContainer: HTMLElement;
let tabContainer: HTMLElement;
let addButton: HTMLElement;
let maximizeIcon: HTMLElement;
rootContainer = document.body.appendChild(<div className="pty-tabs">
  <div className="ts top attached mini tabbed menu">
    {process.platform === 'darwin' ?
      <div className="window-control-mac" /> : null}
    {tabContainer = <div className="flex">{
      addButton = <a className="item" onclick={async () => {
        await loadConfig();
        new Tab().attach(createBackend({}));
      }}>
        <i className="ts plus icon" />
      </a> as HTMLElement
    }</div> as HTMLElement}
    <div className="drag" />
    {process.platform !== 'darwin' ? (browserWindow => {
      browserWindow.on('maximize', changeMaximizeIcon);
      browserWindow.on('unmaximize', changeMaximizeIcon);
      browserWindow.on('restore', changeMaximizeIcon);
      return [
        <a className="item"
          onclick={() => browserWindow.minimize()}>
            <i className="ts window minimize icon" />
        </a>,
        <a className="item"
          onclick={() => {
            if(browserWindow.isMaximized())
              browserWindow.unmaximize();
            else
              browserWindow.maximize();
          }}>
          {maximizeIcon = <i className="ts window maximize icon" /> as HTMLElement}
        </a>,
        <a className="negative item"
          onclick={() => browserWindow.close()}>
          <i className="ts close icon" />
        </a>,
      ];
    })(remote.getCurrentWindow()) : null}
  </div>
</div> as HTMLElement);

function changeMaximizeIcon() {
  if(maximizeIcon)
    maximizeIcon.className =
      `ts window ${remote.getCurrentWindow().isMaximized() ? 'restore' : 'maximize'} icon`;
}
changeMaximizeIcon();

const tabs = new Set<Tab>();
let activeTab: Tab | undefined;

events.on('config', () => {
  if(configFile && configFile.terminal) {
    if(!tabs.size) return;
    const keys = Object.keys(configFile.terminal) as Array<keyof ITerminalOptions>;
    for(const tab of tabs) {
      if(!tab.terminal) continue;
      for(const key of keys) {
        const value = configFile.terminal[key];
        if(tab.terminal.getOption(key) !== value)
          tab.terminal.setOption(key, value);
      }
      fit(tab.terminal);
    }
  }
});

class Tab implements IDisposable {
  public terminal: Terminal;
  public pty: TerminalBase<unknown>;
  public disposables: IDisposable[];
  public title: string;
  public defaultTitle: string;
  public tabElement: HTMLElement;
  public tabContent: HTMLElement;
  public active: boolean;

  constructor() {
    this.defaultTitle = 'Shell';
    this.terminal = new Terminal(configFile && configFile.terminal || {
      fontFamily: 'powerlinesymbols, monospace',
      cursorBlink: true,
    });
    webLinksInit(this.terminal, (e, uri) => shell.openExternal(uri));
    winptyCompatInit(this.terminal);
    this.disposables = [];
    this.active = true;
    tabContainer.insertBefore(this.tabElement = <a className="item" onclick={e => {
      e.preventDefault();
      e.stopPropagation();
      this.onEnable();
    }}>
      {''}
      <a className="ts small negative close button" onclick={e => {
        e.preventDefault();
        e.stopPropagation();
        this.dispose();
      }} />
    </a> as HTMLElement, addButton);
    this.tabContent = <div ondrop={async e => {
      e.preventDefault();
      e.stopPropagation();
      const result: string[] = [];
      const stringData: DataTransferItem[] = [];
      const { items } = e.dataTransfer;
      if(items) {
        // tslint:disable-next-line:prefer-for-of
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
        // tslint:disable-next-line:prefer-for-of
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

  public async attach(pty: TerminalBase<unknown>) {
    if(this.pty || !this.terminal) return;
    if(pty.path) this.defaultTitle = extname(pty.path);
    this.pty = pty;
    this.disposables.push(
      this.terminal.addDisposableListener('data', this.onDataInput.bind(this)),
      this.terminal.addDisposableListener('resize', ({ cols, rows }) => this.pty.resize(cols, rows)),
      this.terminal.addDisposableListener('title', this.onTitle.bind(this)),
      attachDisposable(pty, 'data', this.onDataOutput.bind(this)),
      attachDisposable(pty, 'end', this.dispose.bind(this)),
    );
    this.pty.resize(this.terminal.cols, this.terminal.rows);
    try {
      await this.pty.spawn();
    } catch(err) {
      this.throwError(`Oops... error while launching "${this.pty.path}": ${err.message || err}`);
    }
    this.onTitle(this.title);
  }

  public throwError(message: string) {
    if(!this.terminal) {
      remote.dialog.showErrorBox('Error', message);
      return;
    }
    this.terminal.writeln(message);
    this.terminal.writeln('Press any key to exit.');
    this.disposables.push(this.terminal.addDisposableListener('key', this.dispose.bind(this)));
  }

  public onEnable() {
    this.tabElement.className = 'active item';
    this.tabContent.className = 'ts active bottom attached inverted tab segment';
    fit(this.terminal);
    this.terminal.focus();
    this.active = true;
    activeTab = this;
    setTitle(this.title);
    for(const tab of tabs)
      if(tab && tab !== this)
        tab.onDisable();
  }

  public onDisable() {
    if(this.tabElement) this.tabElement.className = 'item';
    if(this.tabContent) this.tabContent.className = 'ts bottom attached inverted tab segment';
    this.active = false;
  }

  public onDataInput(text: string) {
    if(this.pty) this.pty.write(text, 'utf8');
  }

  public onDataOutput(data: string | Buffer) {
    if(this.terminal) this.terminal.write(Buffer.isBuffer(data) ? data.toString('utf8') : data);
  }

  public onTitle(title: string) {
    this.title = title && title.trim() || this.pty && this.pty.process && this.pty.process.trim() || this.defaultTitle;
    if(this.tabElement) this.tabElement.firstChild.textContent = this.title;
    if(this.active) setTitle(this.title);
  }

  public dispose() {
    tabs.delete(this);
    if(activeTab === this) {
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
        if(disposable) disposable.dispose();
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

ipcRenderer.on('create-terminal', async (e: IpcMessageEvent, options: TerminalOptions) => {
  await loadConfig();
  const tab = new Tab();
  tab.attach(createBackend(options));
  if(tab.pty && (tab.pty instanceof WslPtyShell))
    tab.title = 'WSL Shell';
  remote.getCurrentWindow().focus();
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
    fit(activeTab.terminal);
});

document.body.addEventListener('dragover', e => e.preventDefault());

if(document.readyState !== 'complete')
  document.addEventListener('readystatechange', () => {
    if(document.readyState === 'complete')
      ipcRenderer.send('ready');
  });
else
  ipcRenderer.send('ready');

startWatch();
