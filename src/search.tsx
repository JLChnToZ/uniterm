import h from 'hyperscript';
import { ISearchOptions, SearchAddon } from 'xterm-addon-search';
import { Tab } from './tab';

const searchHandlers = new WeakMap<Tab, SearchAddon>();
let searchHandler: SearchAddon | undefined;
const searchOptions: ISearchOptions = {};

let search: HTMLInputElement;
const searchBar = document.body.appendChild(
  <div className="toolbar hidden">
    {search = <input type="search" className="search" placeholder="Search" oninput={() => {
      doSearch(true);
    }} onkeydown={e => {
      switch(e.which) {
        default: return;
        case 27: /* Escape */ toggleSearch(); break;
        case 13: /* Enter */ doSearch(!e.shiftKey); break;
      }
      e.preventDefault();
    }} /> as HTMLInputElement}
    <a className="icon item" title="Case Sensitive" onclick={e =>
      searchOptions.caseSensitive = (e.target as HTMLElement).classList.toggle('active')
    }>{'\uf612'}</a>
    <a className="icon item" title="Match Words" onclick={e =>
      searchOptions.wholeWord = (e.target as HTMLElement).classList.toggle('active')
    }>{'\uf9c5'}</a>
    <a className="icon item" title="Regular Expression" onclick={e =>
      searchOptions.regex = (e.target as HTMLElement).classList.toggle('active')
    }>{'\uf950'}</a>
    <a className="icon item" title="Find Previous" onclick={() => doSearch(false)}>{'\uf55c'}</a>
    <a className="icon item" title="Find Next" onclick={() => doSearch(true)}>{'\uf544'}</a>
    <a className="icon item" title="Hide" onclick={toggleSearch}>{'\uf85c'}</a>
  </div> as HTMLDivElement,
);

if(Tab.activeTab)
  attach(Tab.activeTab);

window.addEventListener('newtab', (e: CustomEvent<Tab>) => attach(e.detail));

window.addEventListener('tabswitched', (e: CustomEvent<Tab>) => {
  searchHandler = searchHandlers.get(e.detail);
});

export function toggleSearch() {
  if(!searchBar.classList.toggle('hidden')) {
    search.focus();
    try {
      const selection = Tab.activeTab.terminal.getSelection();
      if(selection) search.value = selection;
    } catch {}
  }
}

function attach(tab: Tab) {
  const searchAddon = new SearchAddon();
  tab.terminal.loadAddon(searchAddon);
  searchHandlers.set(tab, searchAddon);
  if(!searchHandler)
    searchHandler = searchAddon;
}

function doSearch(forward: boolean) {
  if(!searchHandler) return;
  if(forward)
    searchHandler.findNext(search.value, searchOptions);
  else
    searchHandler.findPrevious(search.value, searchOptions);
}
