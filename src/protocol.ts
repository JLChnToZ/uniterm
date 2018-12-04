import { app, protocol } from 'electron';
import { resolve as resolvePath } from 'path';
import { parse } from 'url';

const rootPath = resolvePath(__dirname, '..');
const staticPath = resolvePath(rootPath, 'static');

protocol.registerStandardSchemes(['uniterm'], { secure: true });

export function register() {
  protocol.registerFileProtocol('uniterm', (request, callback) => {
    if(!request.url.startsWith('uniterm://app/'))
      return callback();
    let url: string = parse(request.url).pathname;
    if(url.startsWith('/userdata/'))
      url = resolvePath(app.getPath('userData'), url.substr(10));
    else if(url.startsWith('/node_modules/'))
      url = resolvePath(rootPath, url.substr(1));
    else
      url = resolvePath(staticPath, url.substr(1) || 'index.html');
    callback(url);
  });
}
