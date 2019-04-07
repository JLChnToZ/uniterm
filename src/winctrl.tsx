import { remote } from 'electron';
import h from 'hyperscript';

const browserWindow = remote.getCurrentWindow();

export function attach(parent: HTMLElement) {
  browserWindow.on('maximize', changeMaximizeIcon);
  browserWindow.on('unmaximize', changeMaximizeIcon);
  browserWindow.on('restore', changeMaximizeIcon);
  parent.appendChild(<a className="icon item"
    onclick={() => browserWindow.minimize()}
    title="Minimize">{'\ufaaf'}</a>);
  const maximizeButton = parent.appendChild(<a className="icon item"
    onclick={() => {
      if(browserWindow.isMaximized())
        browserWindow.unmaximize();
      else
        browserWindow.maximize();
    }}
    title="Maximize"
  />);
  parent.appendChild(<a className="icon item"
    onclick={() => browserWindow.close()}
    title="Close">{'\ufaac'}</a>);
  function changeMaximizeIcon() {
    const maximized = browserWindow.isMaximized();
    maximizeButton.textContent = maximized ? '\ufab1' : '\ufaae';
    if(maximized) document.body.classList.add('maximized');
    else document.body.classList.remove('maximized');
  }
  changeMaximizeIcon();
}
