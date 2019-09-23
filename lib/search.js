"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const xterm_addon_search_1 = require("xterm-addon-search");
const tab_1 = require("./tab");
const searchHandlers = new WeakMap();
let searchHandler;
const searchOptions = {};
let search;
const searchBar = document.body.appendChild(hyperscript_1.default("div", { className: "toolbar hidden" },
    search = hyperscript_1.default("input", { type: "search", className: "search", placeholder: "Search", oninput: () => {
            doSearch(true);
        }, onkeydown: e => {
            switch (e.which) {
                default: return;
                case 27: /* Escape */
                    toggleSearch();
                    break;
                case 13: /* Enter */
                    doSearch(!e.shiftKey);
                    break;
            }
            e.preventDefault();
        } }),
    hyperscript_1.default("a", { className: "icon item", title: "Case Sensitive", onclick: e => searchOptions.caseSensitive = e.target.classList.toggle('active') }, '\uf612'),
    hyperscript_1.default("a", { className: "icon item", title: "Match Words", onclick: e => searchOptions.wholeWord = e.target.classList.toggle('active') }, '\uf9c5'),
    hyperscript_1.default("a", { className: "icon item", title: "Regular Expression", onclick: e => searchOptions.regex = e.target.classList.toggle('active') }, '\uf950'),
    hyperscript_1.default("a", { className: "icon item", title: "Find Previous", onclick: () => doSearch(false) }, '\uf55c'),
    hyperscript_1.default("a", { className: "icon item", title: "Find Next", onclick: () => doSearch(true) }, '\uf544'),
    hyperscript_1.default("a", { className: "icon item", title: "Close", onclick: toggleSearch }, '\uf655')));
if (tab_1.Tab.activeTab)
    attach(tab_1.Tab.activeTab);
window.addEventListener('newtab', (e) => attach(e.detail));
window.addEventListener('tabswitched', (e) => {
    searchHandler = searchHandlers.get(e.detail);
});
function toggleSearch() {
    if (!searchBar.classList.toggle('hidden')) {
        search.focus();
        try {
            const selection = tab_1.Tab.activeTab.terminal.getSelection();
            if (selection)
                search.value = selection;
        }
        catch (_a) { }
    }
}
exports.toggleSearch = toggleSearch;
function attach(tab) {
    const searchAddon = new xterm_addon_search_1.SearchAddon();
    tab.terminal.loadAddon(searchAddon);
    searchHandlers.set(tab, searchAddon);
    if (!searchHandler)
        searchHandler = searchAddon;
}
function doSearch(forward) {
    if (!searchHandler)
        return;
    if (forward)
        searchHandler.findNext(search.value, searchOptions);
    else
        searchHandler.findPrevious(search.value, searchOptions);
}
//# sourceMappingURL=search.js.map