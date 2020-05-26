import h from 'hyperscript';
import { readonly, bind } from '../decorators';

export abstract class Toolbar {
  private static all = new Set<Toolbar>();

  protected root: HTMLElement;
  protected shown: boolean;

  protected constructor() {
    this.shown = false;
    this.root = document.body.appendChild(
      <div className="toolbar hidden">
        <div className="inner">
          {...this.render()}
          <a className="icon item" title="Hide" onclick={this.hide}>{'\uf85f'}</a>
        </div>
      </div>
    ) as HTMLElement;
    Toolbar.all.add(this);
  }

  @readonly @bind
  public toggle() {
    const shown = !this.root.classList.toggle('hidden');
    if(this.shown !== shown) {
      if(this.shown = shown)
        this.onShown();
      else
        this.onHide();
    }
    return shown;
  }

  @readonly @bind
  public show() {
    const { classList } = this.root;
    if(!classList.contains('hidden')) return;
    classList.remove('hidden');
    this.shown = true;
    this.onShown();
  }

  @readonly @bind
  public hide() {
    const { classList } = this.root;
    if(classList.contains('hidden')) return;
    classList.add('hidden');
    this.shown = false;
    this.onHide();
  }

  protected abstract render(): Element[];

  protected onShown() {
    this.hideOthers();
  }

  protected onHide() {}

  private hideOthers() {
    for(const other of Toolbar.all)
      if(other !== this)
        other.hide();
  }
}