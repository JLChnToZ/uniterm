import { interceptEvent } from './domutils';

export let draggingTab: HTMLElement | undefined;
const childrenQuery = 'a.item';

function onDragStart(e: DragEvent) {
    if(!(e.target as HTMLElement).matches(childrenQuery)) return;
    const { dataTransfer, target } = e;
    dataTransfer.clearData();
    dataTransfer.setData('application/x-tab-data', (target as Element).outerHTML);
    dataTransfer.effectAllowed = 'copyMove';
    draggingTab = target as HTMLElement;
    draggingTab.style.opacity = '0.5';
}

function onDragEnter(this: HTMLElement, e: DragEvent) {
  if(!(e.target as HTMLElement).matches(childrenQuery)) return;
  interceptEvent(e);
  const { dataTransfer, target } = e;
  if(draggingTab && !(target as Node).isEqualNode(draggingTab)) {
    dataTransfer.dropEffect = 'move';
    const isNext = (target as Node).isEqualNode(draggingTab.nextSibling);
    this.removeChild(draggingTab);
    this.insertBefore(draggingTab, isNext ? (target as Node).nextSibling : (target as Node));
  } else
    dataTransfer.dropEffect = 'none';
}

function onDragOver(e: DragEvent) {
  if(!(e.target as HTMLElement).matches(childrenQuery)) return;
  interceptEvent(e);
  e.dataTransfer.dropEffect = draggingTab ? 'move' : 'none';
}

function onDragEnd(e: DragEvent) {
  interceptEvent(e);
  if(draggingTab) {
    draggingTab.style.opacity = '1';
    draggingTab = undefined;
  }
}

function onDrop(e: DragEvent) {
  interceptEvent(e);
  if(draggingTab) e.dataTransfer.clearData();
}

export function init(container: HTMLElement) {
  container.addEventListener('dragstart', onDragStart, true);
  container.addEventListener('dragenter', onDragEnter, true);
  container.addEventListener('dragover', onDragOver, true);
  container.addEventListener('dragend', onDragEnd, true);
  container.addEventListener('drop', onDrop, true);
}
