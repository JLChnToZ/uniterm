export let ctrlKey = false;
export let altKey = false;
export let shiftKey = false;
export let metaKey = false;

function detectKeys(e: KeyboardEvent) {
  altKey = e.altKey;
  ctrlKey = e.ctrlKey;
  shiftKey = e.shiftKey;
  metaKey = e.metaKey;
}

document.body.addEventListener('keydown', detectKeys, true);
document.body.addEventListener('keyup', detectKeys, true);
