import h from 'hyperscript';
import { constants } from 'os';
import { Toolbar } from './base';
import { readonly, bind } from '../decorators';
import { remote } from 'electron';
import { Tab } from '../tab';

const browserWindow = remote.getCurrentWindow();

class PtyOptionsToolbar extends Toolbar {
  private markers?: number[];
  private customTitle?: HTMLInputElement;
  private slider?: HTMLInputElement;
  private pause?: HTMLAnchorElement;
  private acceptInput?: HTMLAnchorElement;

  constructor() {
    super();
    window.addEventListener('newtab', (e: CustomEvent<Tab>) => this.attach(e.detail));
    window.addEventListener('tabswitched', (e: CustomEvent<Tab>) => this.hide());
    if(Tab.activeTab) this.attach(Tab.activeTab);
  }

  protected render() {
    const sliderMarks = document.body.appendChild(<datalist id="priorityMarks" />) as HTMLDataListElement;
    let maxPriority = Number.NEGATIVE_INFINITY;
    let minPriority = Number.POSITIVE_INFINITY;
    this.markers = Object.values(constants.priority).sort((a, b) => a > b ? 1 : a < b ? -1 : 0);
    for(const priorityLevel of this.markers) {
      sliderMarks.appendChild(<option value={priorityLevel.toString()} />);
      maxPriority = Math.max(maxPriority, priorityLevel);
      minPriority = Math.min(minPriority, priorityLevel);
    }
    this.customTitle = <input
      className="title input"
      type="text"
      placeholder="Prefix"
      oninput={e => {
        const tab = Tab.activeTab;
        if(tab) tab.titlePrefix = (e.target as HTMLInputElement).value;
      }}
      onkeydown={e => {
        switch(e.which) {
          default: return;
          case 13: case 27: this.hide(); break;
        }
      }}
      spellcheck={false}
    /> as HTMLInputElement;
    this.slider = <input
      className="priority input"
      type="range"
      step="1"
      max={maxPriority as any}
      min={minPriority as any}
      onchange={() => this.setPriority(this.slider!.valueAsNumber)}
    /> as HTMLInputElement;
    this.slider.setAttribute('list', sliderMarks.id);
    this.pause = <a className="icon item" title="Pause on Exit" onclick={e => {
      const tab = Tab.activeTab;
      if(tab && (tab.pause = !tab.pause))
        (e.target as HTMLElement).classList.add('active');
      else
        (e.target as HTMLElement).classList.remove('active');
    }}>{'\uf8e7'}</a> as HTMLAnchorElement;
    return [
      this.customTitle,
      <a className="icon item" title="Higher Priority" onclick={() => this.movePriority(-1)}>{'\ufb02'}</a>,
      this.slider,
      <a className="icon item" title="Lower Priority" onclick={() => this.movePriority(1)}>{'\ufb03'}</a>,
      <a className="icon item" title="Clear Console" onclick={e => this.clear(e.shiftKey)}>{'\uf89e'}</a>,
      <a className="icon item" title="Disable Input" onclick={e => {
        const tab = Tab.activeTab;
        (e.target as Node).textContent = (!tab || !(tab.acceptInput = !tab.acceptInput)) ? '\uf80f' : '\uf80b';
      }}>{'\uf80b'}</a>,
      this.pause,
    ];
  }

  @readonly @bind
  private onTabContextMenu(e: MouseEvent) {
    if(e.ctrlKey) return;
    e.preventDefault();
    if(Tab.activeTab.tabElement === e.currentTarget)
      this.show();
  }

  @readonly @bind
  private movePriority(direction: number) {
    if(!this.markers || !this.slider) return;
    const value = this.slider.valueAsNumber;
    if(direction > 0)
      for(let i = 0; i < this.markers.length; i++) {
        if(this.markers[i] > value)
          return this.setPriority(this.markers[i]);
      }
    else if(direction < 0)
      for(let i = this.markers.length - 1; i >= 0; i--) {
        if(this.markers[i] < value)
          return this.setPriority(this.markers[i]);
      }
  }

  private async setPriority(value: number) {
    const tab = Tab.activeTab;
    if(!tab) {
      if(this.slider) this.slider.value = '0';
      return;
    }
    const pty = tab.pty;
    if(!pty || pty.priority === value) {
      if(this.slider) this.slider.value = '0';
      return;
    }
    if((await remote.dialog.showMessageBox(browserWindow, {
      type: 'warning',
      title: 'Process Execution Priority',
      message: 'Changing process execution priority may lead to system unstable. Continue?',
      buttons: ['Yes', 'No'],
    })).response === 0)
      pty.priority = value;
    if(this.slider)
      this.slider.value = pty.priority as any;
  }

  private clear(reset?: boolean) {
    const terminal = Tab.activeTab?.terminal;
    if(terminal) {
      if(reset) terminal.reset();
      else terminal.clear();
    }
    this.hide();
  }

  private attach(tab: Tab) {
    tab.tabElement.addEventListener('contextmenu', this.onTabContextMenu);
  }

  protected onShown() {
    super.onShown();
    const tab = Tab.activeTab;
    if(this.slider)
      this.slider.value = tab?.pty?.priority as any || '0';
    if(this.customTitle)
      this.customTitle.value = tab?.titlePrefix;
    if(this.pause) {
      const { classList } = this.pause;
      if(tab?.pause)
        classList.add('active');
      else
        classList.remove('active');
    }
  }
}

export const ptyOptionsBar = new PtyOptionsToolbar();
