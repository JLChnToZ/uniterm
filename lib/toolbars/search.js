"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchBar = void 0;
const tslib_1 = require("tslib");
const hyperscript_1 = tslib_1.__importDefault(require("hyperscript"));
const xterm_addon_search_1 = require("xterm-addon-search");
const base_1 = require("./base");
const tab_1 = require("../tab");
class Search extends base_1.Toolbar {
    constructor() {
        super();
        this.searchHandlers = new WeakMap();
        this.searchOptions = {};
        window.addEventListener('newtab', (e) => this.attach(e.detail));
        window.addEventListener('tabswitched', (e) => {
            this.searchHandler = this.searchHandlers.get(e.detail);
        });
        if (tab_1.Tab.activeTab)
            this.attach(tab_1.Tab.activeTab);
    }
    render() {
        return [
            this.search = hyperscript_1.default("input", { type: "search", className: "search input", placeholder: "Search", spellcheck: false, oninput: () => this.doSearch(true), onkeydown: e => {
                    switch (e.which) {
                        default: return;
                        case 27: /* Escape */
                            this.hide();
                            break;
                        case 13: /* Enter */
                            this.doSearch(!e.shiftKey);
                            break;
                    }
                    e.preventDefault();
                } }),
            hyperscript_1.default("a", { className: "icon item", title: "Case Sensitive", onclick: e => this.searchOptions.caseSensitive = e.target.classList.toggle('active') }, '\uf612'),
            hyperscript_1.default("a", { className: "icon item", title: "Match Words", onclick: e => this.searchOptions.wholeWord = e.target.classList.toggle('active') }, '\uf9c5'),
            hyperscript_1.default("a", { className: "icon item", title: "Regular Expression", onclick: e => this.searchOptions.regex = e.target.classList.toggle('active') }, '\uf950'),
            hyperscript_1.default("a", { className: "icon item", title: "Find Previous", onclick: () => this.doSearch(false) }, '\uf55c'),
            hyperscript_1.default("a", { className: "icon item", title: "Find Next", onclick: () => this.doSearch(true) }, '\uf544'),
        ];
    }
    attach(tab) {
        const searchAddon = new xterm_addon_search_1.SearchAddon();
        tab.terminal.loadAddon(searchAddon);
        this.searchHandlers.set(tab, searchAddon);
        if (!this.searchHandler)
            this.searchHandler = searchAddon;
    }
    doSearch(forward) {
        if (!this.searchHandler)
            return;
        if (forward)
            this.searchHandler.findNext(this.search.value, this.searchOptions);
        else
            this.searchHandler.findPrevious(this.search.value, this.searchOptions);
    }
}
exports.searchBar = new Search();
//# sourceMappingURL=search.js.map