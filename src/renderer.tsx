import * as codeToSignal from 'code-to-signal';
import { IpcMessageEvent, ipcRenderer, remote, shell } from 'electron';
import * as h from 'hyperscript';
import { extname } from 'path';
import { resolve as resolvePath } from 'url';
import { IDisposable, ITerminalOptions, Terminal } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';
import { webLinksInit } from 'xterm/lib/addons/webLinks/webLinks';
import { winptyCompatInit } from 'xterm/lib/addons/winptyCompat/winptyCompat';
import { configFile, events, loadConfig, startWatch } from './config';
import { TerminalLaunchOptions } from './interfaces';
import { electron } from './remote-wrapper';
import { TerminalBase, TerminalOptions } from './terminals/base';
import { PtyShell } from './terminals/pty';
import { WslPtyShell } from './terminals/wslpty';

const addButton = <a className="item" onclick={async () => {
  await loadConfig();
  new Tab().attach(createBackend({
    cwd: electron.app.getPath('home'),
  }));
}} title="Add Tab">
  <i className="ts plus icon" />
</a> as HTMLElement;
const tabContainer = <div className="flex">{addButton}</div> as HTMLElement;
let maximizeIcon: HTMLElement;
const rootContainer = document.body.appendChild(<div className="pty-tabs">
  <div className="ts top attached mini tabbed menu">
    {process.platform === 'darwin' ?
      <div className="window-control-mac" /> : null}
    {tabContainer}
    <div className="drag" />
    <a className="item" onclick={() =>
      ipcRenderer.send('show-config')
    } title="Config">
      <i className="ts setting icon" />
    </a>
    {process.platform !== 'darwin' ? (browserWindow => {
      browserWindow.on('maximize', changeMaximizeIcon);
      browserWindow.on('unmaximize', changeMaximizeIcon);
      browserWindow.on('restore', changeMaximizeIcon);
      return [
        <a className="item"
          onclick={() => browserWindow.minimize()}
          title="Minimize">
            <i className="ts window minimize icon" />
        </a>,
        <a className="item"
          onclick={() => {
            if(browserWindow.isMaximized())
              browserWindow.unmaximize();
            else
              browserWindow.maximize();
          }}
          title="Maximize">
          {maximizeIcon = <i className="ts window maximize icon" /> as HTMLElement}
        </a>,
        <a className="negative item"
          onclick={() => browserWindow.close()}
          title="Close">
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
let ctrlKeyDown: boolean = false;

events.on('config', () => {
  window.dispatchEvent(new CustomEvent('configreload', {}));
  if(!configFile) return;
  if(configFile.terminal) {
    const { terminal: options } = configFile;
    if(tabs.size) {
      const keys = Object.keys(options) as Array<keyof ITerminalOptions>;
      for(const tab of tabs) {
        if(!tab.terminal) continue;
        const { terminal } = tab;
        for(const key of keys) {
          const value = options[key];
          if(terminal.getOption(key) !== value)
            terminal.setOption(key, value);
        }
        fit(terminal);
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
  if(configFile.mods && configFile.mods.length)
    for(const mod of configFile.mods)
      loadScript(resolvePath('userdata/', mod));
});

class Tab implements IDisposable {
  public terminal: Terminal;
  public pty: TerminalBase<unknown>;
  public disposables: IDisposable[];
  public title: string;
  public defaultTitle: string;
  public tabElement: HTMLElement;
  public tabContent: HTMLElement;
  public tabContentText: HTMLElement;
  public active: boolean;
  public pause?: boolean;
  private explicitTitle?: boolean;

  constructor(pause?: boolean) {
    this.defaultTitle = 'Shell';
    this.pause = pause;
    this.terminal = new Terminal(configFile && configFile.terminal || {
      fontFamily: 'powerlinesymbols, monospace',
      cursorBlink: true,
    });
    webLinksInit(this.terminal, (e, uri) => ctrlKeyDown && shell.openExternal(uri), {
      tooltipCallback: () => ctrlKeyDown,
      willLinkActivate: () => ctrlKeyDown,
    });
    winptyCompatInit(this.terminal);
    this.disposables = [];
    this.active = true;
    tabContainer.insertBefore(this.tabElement = <a className="item" onclick={e => {
      interceptEvent(e);
      this.onEnable();
    }}>
      <i className="ts terminal icon" />
      {this.tabContentText = <span className="title-text" /> as HTMLElement}
      <a className="ts small negative close button" onclick={e => {
        interceptEvent(e);
        this.dispose();
      }} title="Close Tab" />
    </a> as HTMLElement, addButton);
    this.tabContent = <div
      ondragenter={this.handleDragOver.bind(this)}
      ondragover={this.handleDragOver.bind(this)}
      ondrop={this.handleDrop.bind(this)}
    /> as HTMLElement;
    rootContainer.appendChild(this.tabContent);
    this.terminal.open(this.tabContent.appendChild(<div className="pty-container" />) as HTMLDivElement);
    this.onEnable();
    tabs.add(this);
    window.dispatchEvent(new CustomEvent('newtab', { detail: this }));
  }

  public async attach(pty: TerminalBase<unknown>) {
    if(this.pty || !this.terminal) return;
    if(pty.path) this.defaultTitle = extname(pty.path);
    this.pty = pty;
    this.disposables.push(
      this.terminal.addDisposableListener('data', this.handleDataInput.bind(this)),
      this.terminal.addDisposableListener('resize', ({ cols, rows }) => this.pty.resize(cols, rows)),
      this.terminal.addDisposableListener('title', title => {
        this.explicitTitle = !!title;
        this.handleTitleChange(title);
      }),
      attachDisposable(pty, 'data', this.handleDataOutput.bind(this)),
      attachDisposable(pty, 'end', this.pause ?
        ((code?: number, signal?: number) =>
          this.printDisposableMessage(`\n\nProgram exits with ${code} ${codeToSignal(signal) || ''}`)) :
        this.dispose.bind(this)),
    );
    this.pty.resize(this.terminal.cols, this.terminal.rows);
    try {
      await this.pty.spawn();
    } catch(err) {
      this.printDisposableMessage(`Oops... error while launching "${this.pty.path}": ${err.message || err}`);
    }
    window.dispatchEvent(new CustomEvent('tabattached', { detail: this }));
    this.handleTitleChange(this.title);
    this.tabElement.firstChild.remove();
    this.tabElement.insertBefore(
      (this.pty && this.pty.resolvedPath) ?
      <img
        src={`fileicon://${this.pty.resolvedPath}`}
        draggable={false}
      /> :
      <i className="ts terminal icon" />,
      this.tabElement.firstChild,
    );
  }

  public printDisposableMessage(message: string, isError: boolean = true) {
    if(!this.terminal && isError) {
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
        tab.handleDisable();
  }

  public dispose() {
    window.dispatchEvent(new CustomEvent('tabdispose', { detail: this }));
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

  private handleDisable() {
    if(this.tabElement) this.tabElement.className = 'item';
    if(this.tabContent) this.tabContent.className = 'ts bottom attached inverted tab segment';
    this.active = false;
  }

  private handleTitleChange(title?: string) {
    this.title = title && title.trim() || this.processTitle || this.defaultTitle;
    if(this.tabContentText) {
      this.tabContentText.textContent = this.title;
      this.tabContentText.title = this.title;
    }
    if(this.active) setTitle(this.title);
  }

  private get processTitle() {
    const proc = this.pty && this.pty.process;
    return proc && proc.trim() || '';
  }

  private handleDataInput(text: string) {
    if(this.pty) this.pty.write(text, 'utf8');
    if(!this.explicitTitle) this.handleTitleChange();
  }

  private handleDataOutput(data: string | Buffer) {
    if(this.terminal) this.terminal.write(Buffer.isBuffer(data) ? data.toString('utf8') : data);
  }

  private handleDragOver(e: DragEvent) {
    interceptEvent(e);
    const { dataTransfer } = e;
    for(const type of dataTransfer.types)
      switch(type) {
        case 'text':
        case 'text/plain':
          dataTransfer.dropEffect = 'copy';
          return;
        case 'Files':
          dataTransfer.dropEffect = 'link';
          return;
      }
    dataTransfer.dropEffect = 'none';
  }

  private async handleDrop(e: DragEvent) {
    interceptEvent(e);
    const result: string[] = [];
    const stringData: DataTransferItem[] = [];
    const { items } = e.dataTransfer;
    if(items && items.length) {
      // tslint:disable-next-line:prefer-for-of
      for(let i = 0; i < items.length; i++) {
        const item = items[i];
        switch(item.kind) {
          case 'file':
            result.push(item.getAsFile().path);
            break;
          case 'string':
            if(item.type === 'text/plain')
              stringData.push(item);
            break;
        }
      }
      if(stringData.length)
        this.pty.write((await Promise.all(stringData.map(getAsStringAsync))).join(''));
      items.clear();
    }
    e.dataTransfer.clearData();
    this.pty.dropFiles(result);
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

function loadScript(src: string) {
  const script = <script async={true} src={src} />;
  document.head.appendChild(script);
  document.head.removeChild(script);
  return script as HTMLScriptElement;
}

function interceptEvent(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

function interceptDrop(e: DragEvent) {
  interceptEvent(e);
  e.dataTransfer.dropEffect = 'none';
}

ipcRenderer.on('create-terminal', async (e: IpcMessageEvent, options: TerminalLaunchOptions) => {
  await loadConfig();
  const tab = new Tab(options.pause);
  tab.attach(createBackend(options));
  remote.getCurrentWindow().focus();
});

window.addEventListener('beforeunload', e => {
  if(tabs.size > 1 && remote.dialog.showMessageBox(remote.getCurrentWindow(), {
    type: 'question',
    title: 'Exit?',
    message: `There are still ${tabs.size} sessions are opened, do you really want to close?`,
    buttons: ['Yes', 'No'],
  })) e.returnValue = false;
});

window.addEventListener('close', destroyAllTabs);

window.addEventListener('resize', () => {
  if(activeTab && activeTab.terminal)
    fit(activeTab.terminal);
});

document.body.addEventListener('dragenter', interceptDrop);
document.body.addEventListener('dragover', interceptDrop);

function detectCtrlKey(e: KeyboardEvent) {
  ctrlKeyDown = e.ctrlKey;
}

document.body.addEventListener('keydown', detectCtrlKey, true);
document.body.addEventListener('keyup', detectCtrlKey, true);

if(document.readyState !== 'complete')
  document.addEventListener('readystatechange', () => {
    if(document.readyState === 'complete')
      ipcRenderer.send('ready');
  });
else
  ipcRenderer.send('ready');

startWatch();

// Expose everything for mods, except for requirable stuffs
Object.assign(window, { tabs, Tab, electron });
Object.defineProperty(window, 'activeTab', {
  get() { return activeTab; },
  set(value: Tab) {
    if(!(value instanceof Tab))
      return;
    activeTab = value;
    activeTab.onEnable();
  },
});
