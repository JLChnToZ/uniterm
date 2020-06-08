import codeToSignal from 'code-to-signal';
import { clipboard, remote, shell } from 'electron';
import h from 'hyperscript';
import { basename } from 'path';
import { fromEvent } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { IDisposable, ITerminalOptions, Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { LigaturesAddon } from 'xterm-addon-ligatures';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { WebglAddon } from 'xterm-addon-webgl';
import { configFile } from './config';
import { bind, readonly } from './decorators';
import { getAsStringAsync, interceptEvent } from './domutils';
import { TerminalBase } from './terminals/base';

export class Tab implements IDisposable {
  public static get tabCount() {
    return this.tabs.size;
  }

  private get processTitle() {
    const proc = this.pty && this.pty.process;
    return proc && proc.trim() || '';
  }

  public static activeTab: Tab;

  public static destroyAllTabs() {
    for(const tab of this.tabs.values())
      if(tab) tab.dispose();
  }

  public static allTabs() {
    return this.tabs.values();
  }

  public static find(tabHeader: HTMLElement) {
    return this.tabs.get(tabHeader);
  }

  private static tabs = new Map<HTMLElement, Tab>();

  private static handleTabClick(this: HTMLElement, e: MouseEvent) {
    const tab = Tab.tabs.get(this);
    if(!tab) return;
    e.preventDefault();
    tab.onEnable();
  }

  private static handleTabMouseUp(this: HTMLElement, e: MouseEvent) {
    const tab = Tab.tabs.get(this);
    if(!tab || e.button !== 1) return;
    e.preventDefault();
    tab.dispose();
  }

  public terminal: Terminal;
  public pty: TerminalBase<unknown>;
  public disposables: IDisposable[];
  private _titlePrefix?: string;
  public title: string;
  public defaultTitle: string;
  public tabElement: HTMLElement;
  public tabContent: HTMLElement;
  public tabContentText: HTMLElement;
  public active: boolean;
  public pause?: boolean;
  private autoFit: FitAddon;
  private explicitTitle?: boolean;
  private pendingUpdateOptions?: ITerminalOptions;

  public get titlePrefix() { return this._titlePrefix || ''; }
  public set titlePrefix(value: string) {
    this._titlePrefix = value;
    this.handleTitleChange(this.title);
  }

  constructor(tabContainer: HTMLElement, contentContainer: HTMLElement, pause?: boolean) {
    this.defaultTitle = 'Shell';
    this.pause = pause;
    this.terminal = new Terminal(configFile && configFile.terminal || {
      fontFamily: 'mononoki, monospace',
      cursorBlink: true,
    });
    this.terminal.loadAddon(new WebLinksAddon((e, uri) => e.ctrlKey && shell.openExternal(uri), {
      willLinkActivate: isCtrlKeyOn,
    }));
    this.terminal.loadAddon(this.autoFit = new FitAddon());
    this.disposables = [];
    this.active = true;
    tabContainer.appendChild(this.tabElement = <a className="item"
      onclick={Tab.handleTabClick}
      onauxclick={Tab.handleTabMouseUp}
      draggable>
      <span className="icon">{'\ufbab'}</span>
      {this.tabContentText = <span className="title-text" /> as HTMLElement}
      <a className="close icon" onclick={e => {
        e.preventDefault();
        this.dispose();
      }} title="Close Tab">{'\uf655'}</a>
    </a> as HTMLElement);
    this.tabContent = <div
      ondragenter={this.handleDragOver}
      ondragover={this.handleDragOver}
      ondrop={this.handleDrop}
      className="pty-container"
    /> as HTMLElement;
    contentContainer.appendChild(this.tabContent);
    this.terminal.open(this.tabContent);
    if(configFile && configFile.misc && configFile.misc.webGL)
      this.terminal.loadAddon(new WebglAddon());
    this.terminal.loadAddon(new LigaturesAddon());
    this.terminal.element.addEventListener('mouseup', e => {
      if(e.button !== 1 || !this.terminal.hasSelection()) return;
      interceptEvent(e);
      clipboard.writeText(this.terminal.getSelection());
      this.terminal.clearSelection();
    }, true);
    this.onEnable();
    Tab.tabs.set(this.tabElement, this);
    if(Tab.tabCount === 1)
      onFirstTabCreated(this.terminal);
    window.dispatchEvent(new CustomEvent('newtab', { detail: this }));
  }

  public async attach(pty: TerminalBase<unknown>) {
    if(this.pty || !this.terminal) return;
    if(pty.path) this.defaultTitle = basename(pty.path);
    this.pty = pty;
    this.disposables.push(
      this.terminal.onData(this.handleDataInput),
      this.terminal.onResize(({ cols, rows }) => this.pty.resize(cols, rows)),
      this.terminal.onTitleChange(title => {
        this.explicitTitle = !!title;
        this.handleTitleChange(title);
      }),
      attachDisposable(pty, 'data', this.handleDataOutput),
      attachDisposable(pty, 'error', err =>
        this.printDisposableMessage(`Oops... error: ${err.message || err}`)),
      attachDisposable(pty, 'end', (code?: number, signal?: number) => {
        if(this.pause)
          this.printDisposableMessage(`Program exits with ${code} ${codeToSignal(signal) || ''}`, false);
        else
          this.dispose();
      }),
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
      <img src={`fileicon://${this.pty.resolvedPath}:small.png`} /> :
      <span className="icon">{'\uf68c'}</span>,
      this.tabElement.firstChild,
    );
  }

  public printDisposableMessage(message: string, isError: boolean = true) {
    if(!this.terminal) {
      if(isError)
        remote.dialog.showErrorBox('Error', message);
      return;
    }
    let icon = this.tabElement.firstChild as HTMLElement;
    if(!icon.classList.contains('icon')) {
      icon.remove();
      icon = this.tabElement.insertBefore(
        <span className="icon" /> as HTMLElement,
        this.tabElement.firstChild,
      );
    }
    icon.textContent = isError ? '\ufb99' : '\uf705';
    this.terminal.writeln(`\r\n\r\nUniterm: ${message}\r\nPress any key to close this tab.`);
    this.disposables.push(this.terminal.onKey(this.dispose));
  }

  public onEnable() {
    this.tabElement.classList.add('active');
    this.tabContent.classList.remove('inactive');
    this.terminal.focus();
    this.active = true;
    Tab.activeTab = this;
    setTitle(this.title);
    if(this.pendingUpdateOptions) {
      this.updateSettings(this.pendingUpdateOptions);
      delete this.pendingUpdateOptions;
    }
    const { parentElement } = this.tabElement;
    if(parentElement) {
      const { children } = parentElement;
      // tslint:disable-next-line:prefer-for-of
      for(let i = 0; i < children.length; i++) {
        if(children[i] === this.tabElement) continue;
        const tab = Tab.tabs.get(children[i] as HTMLElement);
        if(tab) tab.handleDisable();
      }
    }
    this.autoFit.fit();
    // Workaround for https://github.com/xtermjs/xterm.js/issues/291
    (this.terminal as any)._onScroll.fire((this.terminal.buffer as any).viewportY);
    window.dispatchEvent(new CustomEvent('tabswitched', { detail: this }));
  }

  @readonly @bind
  public dispose() {
    window.dispatchEvent(new CustomEvent('tabdispose', { detail: this }));
    Tab.tabs.delete(this.tabElement);
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
    let tabElementParent: HTMLElement | undefined;
    if(this.tabElement) {
      tabElementParent = this.tabElement.parentElement;
      this.tabElement.remove();
      delete this.tabElement;
    }
    if(!Tab.tabs.size) {
      window.close();
      return;
    }
    if(!this.active) return;
    if(tabElementParent) {
      const { children } = tabElementParent;
      // tslint:disable-next-line:prefer-for-of
      for(let i = 0; i < children.length; i++) {
        const tab = Tab.tabs.get(children[i] as HTMLElement);
        if(tab) {
          Tab.activeTab = tab;
          tab.onEnable();
          return;
        }
      }
    }
    Tab.activeTab = Tab.tabs.values().next().value;
    if(Tab.activeTab)
      Tab.activeTab.onEnable();
  }

  public fit() {
    this.autoFit.fit();
  }

  public updateSettings(options: ITerminalOptions) {
    if(!this.active) {
      this.pendingUpdateOptions = options;
      return;
    }
    if(!this.terminal) return;
    Object.entries(options).forEach(updateTerminalOptions, this.terminal);
  }

  private handleDisable() {
    if(this.tabElement) this.tabElement.classList.remove('active');
    if(this.tabContent) this.tabContent.classList.add('inactive');
    this.active = false;
  }

  @readonly @bind
  private handleTitleChange(title?: string) {
    this.title = title && title.trim() || this.processTitle || this.defaultTitle;
    const fixedTitle = this._titlePrefix ? `${this._titlePrefix} - [${this.title}]` : this.title;
    if(this.tabContentText) {
      this.tabContentText.textContent = fixedTitle;
      this.tabContentText.title = fixedTitle;
    }
    if(this.active) setTitle(fixedTitle);
  }

  @readonly @bind
  private handleDataInput(text: string) {
    if(this.pty) this.pty.write(text, 'utf8');
    if(!this.explicitTitle) this.handleTitleChange();
  }

  @readonly @bind
  private handleDataOutput(data: string | Buffer) {
    if(!this.terminal) return;
    if(Buffer.isBuffer(data))
      this.terminal.writeUtf8(data);
    else
      this.terminal.write(data);
  }

  @readonly @bind
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

  @readonly @bind
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

function onFirstTabCreated(terminal: Terminal) {
  try {
    let cols = 80;
    let rows = 25;
    if(configFile.misc) {
      const { initialCols, initialRows } = configFile.misc;
      if(initialCols! > 0) cols = initialCols;
      if(initialRows! > 0) rows = initialRows;
    }
    const { actualCellWidth, actualCellHeight } = (terminal as any)._core._renderService.dimensions;
    const { width, height } = window.getComputedStyle(terminal.element.querySelector('.xterm-screen'));
    const browserWindow = remote.getCurrentWindow();
    browserWindow.setSize(
      window.outerWidth - parseInt(width, 10) + actualCellWidth * cols,
      window.outerHeight - parseInt(height, 10) + actualCellHeight * rows,
    );
    browserWindow.center();
  } catch(e) {
    console.error(e);
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

function isCtrlKeyOn(e: MouseEvent) {
  return e.ctrlKey;
}

function updateTerminalOptions(this: Terminal, [key, value]: [keyof ITerminalOptions, any]) {
  try {
    if(this.getOption(key) !== value)
      this.setOption(key, value);
  } catch(e) {
    console.warn(e);
  }
}

window.addEventListener('close', Tab.destroyAllTabs);
fromEvent(window, 'resize').pipe(debounceTime(250)).subscribe(() => {
  if(Tab.activeTab && Tab.activeTab.terminal)
    Tab.activeTab.fit();
});
