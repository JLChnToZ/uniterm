import h from 'hyperscript';
import { ISearchOptions, SearchAddon } from 'xterm-addon-search';
import { Toolbar } from './base';
import { Tab } from '../tab';

class Search extends Toolbar {
  searchHandlers: WeakMap<Tab, SearchAddon>;
  searchHandler?: SearchAddon;
  searchOptions: ISearchOptions;
  search?: HTMLInputElement;

  constructor() {
    super();
    this.searchHandlers = new WeakMap();
    this.searchOptions = {};
    window.addEventListener('newtab', (e: CustomEvent<Tab>) => this.attach(e.detail));
    window.addEventListener('tabswitched', (e: CustomEvent<Tab>) => {
      this.searchHandler = this.searchHandlers.get(e.detail);
    });
    if(Tab.activeTab)
      this.attach(Tab.activeTab);
  }

  protected render() {
    return [
      this.search = <input
        type="search"
        className="search input"
        placeholder="Search"
        spellcheck={false}
        oninput={() => this.doSearch(true)}
        onkeydown={e => {
          switch(e.which) {
            default: return;
            case 27: /* Escape */ this.hide(); break;
            case 13: /* Enter */ this.doSearch(!e.shiftKey); break;
          }
          e.preventDefault();
        }}
      /> as HTMLInputElement,
      <a className="icon item" title="Case Sensitive" onclick={e =>
        this.searchOptions.caseSensitive = (e.target as HTMLElement).classList.toggle('active')
      }>{'\uf612'}</a>,
      <a className="icon item" title="Match Words" onclick={e =>
        this.searchOptions.wholeWord = (e.target as HTMLElement).classList.toggle('active')
      }>{'\uf9c5'}</a>,
      <a className="icon item" title="Regular Expression" onclick={e =>
        this.searchOptions.regex = (e.target as HTMLElement).classList.toggle('active')
      }>{'\uf950'}</a>,
      <a className="icon item" title="Find Previous" onclick={() => this.doSearch(false)}>{'\uf55c'}</a>,
      <a className="icon item" title="Find Next" onclick={() => this.doSearch(true)}>{'\uf544'}</a>,
    ]
  }

  private attach(tab: Tab) {
    const searchAddon = new SearchAddon();
    tab.terminal.loadAddon(searchAddon);
    this.searchHandlers.set(tab, searchAddon);
    if(!this.searchHandler)
      this.searchHandler = searchAddon;
  }
  
  private doSearch(forward: boolean) {
    if(!this.searchHandler) return;
    if(forward)
      this.searchHandler.findNext(this.search.value, this.searchOptions);
    else
      this.searchHandler.findPrevious(this.search.value, this.searchOptions);
  }
}

export const searchBar = new Search();
