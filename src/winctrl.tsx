import { remote } from 'electron';
import h from 'hyperscript';

const browserWindow = remote.getCurrentWindow();

function doMaximize() {
  if(browserWindow.isFullScreenable()) {
    const isFullscreen = browserWindow.isFullScreen();
    browserWindow.setFullScreen(!isFullscreen);
    if(isFullscreen)
      browserWindow.unmaximize();
  } else if(browserWindow.isMaximized())
    browserWindow.unmaximize();
  else
    browserWindow.maximize();
}

export function attach(parent: HTMLElement) {
  browserWindow.on('maximize', updateMaximizeState);
  browserWindow.on('unmaximize', updateMaximizeState);
  browserWindow.on('restore', updateMaximizeState);
  browserWindow.on('enter-full-screen', updateMaximizeState);
  browserWindow.on('leave-full-screen', updateMaximizeState);
  parent.appendChild(<a className="icon item"
    onclick={() => browserWindow.minimize()}
    title="Minimize">{'\ufaaf'}</a>);
  const maximizeButton = parent.appendChild(<a className="icon item"
    onclick={doMaximize} title="Maximize"
  />);
  parent.appendChild(<a className="icon item"
    onclick={() => browserWindow.close()}
    title="Close">{'\ufaac'}</a>);
  function updateMaximizeState() {
    const isFullScreen = browserWindow.isFullScreen();
    const isMaximized = browserWindow.isMaximized() || isFullScreen;
    maximizeButton.textContent = isMaximized ? '\ufab1' : '\ufaae';
    if(isMaximized) document.body.classList.add('maximized');
    else document.body.classList.remove('maximized');
    if(browserWindow.isFullScreenable() &&
      isMaximized && !isFullScreen)
      browserWindow.setFullScreen(true);
  }
  updateMaximizeState();
}

export function registerDraggableDoubleClick() {
  document.body.addEventListener('dblclick', e => {
    if((e.target instanceof Element) && e.target.matches('.drag')) {
      e.preventDefault();
      e.stopPropagation();
      doMaximize();
    }
  }, true);
}
