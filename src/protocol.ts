import { app, protocol } from 'electron';
import { resolve as resolvePath } from 'path';
import { parse } from 'url';
import { existsAsync } from './pathutils';

const rootPath = resolvePath(__dirname, '..');
const staticPath = resolvePath(rootPath, 'static');

protocol.registerSchemesAsPrivileged([{
  scheme: 'uniterm',
  privileges: {
    standard: true,
    secure: true,
  },
}, {
  scheme: 'fileicon',
  privileges: {
  },
}]);

export function register() {
  protocol.registerFileProtocol('uniterm', (request, callback) =>
    Promise.resolve(handleAppProtocol(request))
    .then(callback));

  protocol.registerBufferProtocol('fileicon', (request, callback) =>
    handleFileProtocol(request)
    .catch(resolveAndLogError)
    .then(callback));
}

function resolveAndLogError(e: any): undefined {
  console.error(e.stack || e);
  return undefined;
}

function handleAppProtocol(request: Electron.Request) {
  if(!request.url.startsWith('uniterm://app/'))
    return;
  const url = parse(request.url).pathname;
  if(url.startsWith('/userdata/'))
    return resolvePath(app.getPath('userData'), decodeURI(url.substr(10)));
  if(url.startsWith('/node_modules/'))
    return resolvePath(rootPath, decodeURI(url.substr(1)));
  return resolvePath(staticPath, decodeURI(url.substr(1)) || 'index.html');
}

/* File Icon URI Protocol Format:
  fileicon://C:/path/to/file.exe:small.png -> file.exe small icon
  fileicon://path/to/another/file.txt:large.jpg -> file.txt large icon
  Supported sizes: small / medium(default) / large
  Supported formats: png(default) / jpg
  If omitted extension or size indicators, will default to medium png format.
*/
async function handleFileProtocol(request: Electron.Request): Promise<Electron.MimeTypedBuffer> {
  const match = /^fileicon:\/\/(.+?)(?:[@_:\.-](small|medium|large))?(?:\.(png|jpe?g))?$/i
    .exec(request.url);
  if(!match) return;
  for(let i = 2; ; i++) {
    if(await existsAsync(match[1]))
      break;
    if(i >= match.length) return;
    match[1] += match[i];
    match[i] = '';
  }
  const size = match[2] &&
    match[2].toLowerCase() as Electron.FileIconOptions['size'];
  const image = await (size ?
    app.getFileIcon(match[1], { size }) :
    app.getFileIcon(match[1])
  );
  if(!image) return;
  switch(match[3] && match[3].toLowerCase()) {
    case 'jpg':
    case 'jpeg':
      return {
        mimeType: 'image/jpeg',
        data: image.toJPEG(80),
      };
    case 'png':
    default:
      return {
        mimeType: 'image/png',
        data: image.toPNG(),
      };
  }
}
