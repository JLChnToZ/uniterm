import h from 'hyperscript';
import { constants } from 'os';
type Tab = import('./tab').Tab;

let tab: Tab | undefined;

const sliderMarks = document.body.appendChild(<datalist id="priorityMarks" />) as HTMLDataListElement;
let maxPriority = Number.NEGATIVE_INFINITY;
let minPriority = Number.POSITIVE_INFINITY;
for(const priorityLevel of Object.values(constants.priority)) {
  sliderMarks.appendChild(<option value={priorityLevel.toString()} />);
  maxPriority = Math.max(maxPriority, priorityLevel);
  minPriority = Math.min(minPriority, priorityLevel);
}

const customTitle = <input
  className="title input"
  type="text"
  placeholder="Prefix"
  oninput={e => {
    if(tab)
      tab.titlePrefix = (e.target as HTMLInputElement).value;
  }}
/> as HTMLInputElement;
const slider = <input
  className="priority input"
  type="range"
  step="1"
  max={maxPriority.toString()}
  min={minPriority.toString()}
/> as HTMLInputElement;
slider.setAttribute('list', sliderMarks.id);
let isShown = false;
const priorityBar = document.body.appendChild(
  <div className="toolbar hidden"><div className="inner">
    {customTitle}
    <a className="icon item disabled" title="High Priority">{'\ufb02'}</a>
    {slider}
    <a className="icon item disabled" title="Low Priority">{'\ufb03'}</a>
    <a className="icon item" title="Apply" onclick={_ => {
      if(!tab) {
        slider.value = '0';
        return;
      }
      const { pty } = tab;
      if(!pty) {
        slider.value = '0';
        return;
      }
      try {
        pty.priority = slider.valueAsNumber;
      } catch {
      } finally {
        slider.value = pty.priority.toString();
      }
      togglePriority();
    }}>{'\uf62b'}</a>
    <a className="icon item" title="Hide" onclick={togglePriority}>{'\uf85f'}</a>
  </div></div> as HTMLDivElement,
);

window.addEventListener('tabswitched', (e: CustomEvent<Tab>) => {
  tab = e.detail;
  if(isShown) updateValues();
});

function updateValues() {
  slider.value = tab?.pty?.priority.toString() || '0';
  customTitle.value = tab?.titlePrefix;
}

export function togglePriority() {
  if(isShown = !priorityBar.classList.toggle('hidden')) {
    slider.focus();
    updateValues();
  }
}
