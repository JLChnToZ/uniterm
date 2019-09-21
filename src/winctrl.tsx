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
  else if(browserWindow.isMaximizable())
    browserWindow.maximize();
}

export function attach(parent: HTMLElement) {
  browserWindow.on('maximize', updateMaximizeState);
  browserWindow.on('unmaximize', updateMaximizeState);
  browserWindow.on('restore', updateMaximizeState);
  browserWindow.on('enter-full-screen', updateMaximizeState);
  browserWindow.on('leave-full-screen', updateMaximizeState);
  parent.appendChild(<a className="icon minimize item"
    onclick={() => browserWindow.minimize()}
    title="Minimize">{'\ufaaf'}</a>);
  const maximizeButton = parent.appendChild(<a className="icon maximize item"
    onclick={doMaximize} title="Maximize"
  />);
  parent.appendChild(<a className="icon close item"
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
    maximizeButton.classList.remove('disabled');
    if(!browserWindow.isMaximizable())
      maximizeButton.classList.add('disabled');
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
