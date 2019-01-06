import codeToSignal = require('code-to-signal');
import { remote, shell } from 'electron';
import * as h from 'hyperscript';
import { extname } from 'path';
import { IDisposable, Terminal } from 'xterm';
import { fit } from 'xterm/lib/addons/fit/fit';
import { webLinksInit } from 'xterm/lib/addons/webLinks/webLinks';
import { winptyCompatInit } from 'xterm/lib/addons/winptyCompat/winptyCompat';
import { configFile } from './config';
import { getAsStringAsync, interceptEvent } from './domutils';
import { ctrlKey } from './key-detector';
import { TerminalBase } from './terminals/base';

let tabContainer: HTMLElement;
let contentContainer: HTMLElement;

export function setContainers(newTabContainer: HTMLElement, newContentContainer: HTMLElement) {
  tabContainer = newTabContainer;
  contentContainer = newContentContainer;
}

export class Tab implements IDisposable {
  public static get tabCount() {
    return this.tabs.size;
  }
  public static activeTab: Tab;

  public static destroyAllTabs() {
    for(const tab of this.tabs)
      if(tab) tab.dispose();
  }
  public static allTabs() {
    return this.tabs[Symbol.iterator]();
  }
  private get processTitle() {
    const proc = this.pty && this.pty.process;
    return proc && proc.trim() || '';
  }
  private static tabs = new Set<Tab>();
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
    webLinksInit(this.terminal, (e, uri) => ctrlKey && shell.openExternal(uri), {
      tooltipCallback: () => ctrlKey,
      willLinkActivate: () => ctrlKey,
    });
    winptyCompatInit(this.terminal);
    this.disposables = [];
    this.active = true;
    tabContainer.appendChild(this.tabElement = <a className="item" onclick={e => {
      interceptEvent(e);
      this.onEnable();
    }}>
      <span className="icon">{'\uf120'}</span>
      {this.tabContentText = <span className="title-text" /> as HTMLElement}
      <a className="close icon" onclick={e => {
        interceptEvent(e);
        this.dispose();
      }} title="Close Tab">{'\uf655'}</a>
    </a> as HTMLElement);
    this.tabContent = <div
      ondragenter={this.handleDragOver.bind(this)}
      ondragover={this.handleDragOver.bind(this)}
      ondrop={this.handleDrop.bind(this)}
      className="pty-container"
    /> as HTMLElement;
    contentContainer.appendChild(this.tabContent);
    this.terminal.open(this.tabContent);
    this.onEnable();
    Tab.tabs.add(this);
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
      attachDisposable(pty, 'error', err =>
        this.printDisposableMessage(`Oops... error: ${err.message || err}`)),
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
      <img src={`fileicon://${this.pty.resolvedPath}:small.png`} /> :
      <span className="icon">{'\uf120'}</span>,
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
    this.tabElement.classList.add('active');
    this.tabContent.classList.remove('inactive');
    this.terminal.focus();
    this.active = true;
    Tab.activeTab = this;
    setTitle(this.title);
    for(const tab of Tab.tabs)
      if(tab && tab !== this)
        tab.handleDisable();
    fit(this.terminal);
  }

  public dispose() {
    window.dispatchEvent(new CustomEvent('tabdispose', { detail: this }));
    Tab.tabs.delete(this);
    if(Tab.activeTab === this) {
      Tab.activeTab = [...Tab.tabs][0];
      if(Tab.activeTab)
        Tab.activeTab.onEnable();
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
    if(!Tab.tabs.size) window.close();
  }

  private handleDisable() {
    if(this.tabElement) this.tabElement.classList.remove('active');
    if(this.tabContent) this.tabContent.classList.add('inactive');
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

window.addEventListener('close', Tab.destroyAllTabs);

window.addEventListener('resize', () => {
  if(Tab.activeTab && Tab.activeTab.terminal)
    fit(Tab.activeTab.terminal);
});
