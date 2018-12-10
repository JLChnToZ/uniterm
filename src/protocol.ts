import { app, protocol } from 'electron';
import { resolve as resolvePath } from 'path';
import { parse } from 'url';
import { promisify } from 'util';

const rootPath = resolvePath(__dirname, '..');
const staticPath = resolvePath(rootPath, 'static');
const getFileIconAsync = promisify(app.getFileIcon.bind(app));

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
  protocol.registerBufferProtocol('fileicon', async (request, callback) => {
    let png: Buffer;
    try {
      console.log(request.url);
      if(request.url.startsWith('fileicon://'))
        png = (await getFileIconAsync(request.url.substr(11), { size: 'small' })).toPNG();
    } catch(e) { console.error(e.stack || e); }
    return callback(png);
  });
}
