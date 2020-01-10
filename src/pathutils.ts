import { spawn } from 'child_process';
import { exists, lstat, mkdir, readFile, writeFile } from 'fs';
import isExe from 'isexe';
import { delimiter, dirname, resolve as resolvePath, sep } from 'path';
import { promisify } from 'util';
import which from 'which';
import { electron, electronEnabled } from './remote-wrapper';

export const readFileAsync = promisify(readFile);
export const writeFileAsync = promisify(writeFile);
export const existsAsync = promisify(exists);
export const mkdirAsync = promisify(mkdir);
export const lstatAsync = promisify(lstat);
export const isExeAsync = promisify(isExe);
export const whichAsync = promisify(which);

export const exePath = (() => {
  if(electronEnabled)
    return electron.app.getPath('exe');
  return which.sync(process.argv[0]);
})();

// Function borrowed from wslpty
export async function resolveWslPath(originalPath: string): Promise<string> {
  if(process.platform !== 'win32')
    throw new Error('This utility is Windows specific.');
  if(!await existsAsync(originalPath))
    throw new Error('Path does not exists');
  return await new Promise<string>((resolve, reject) => {
    const finder = spawn('wsl.exe', ['wslpath', originalPath.replace(/\\/g, '\\\\')]);
    let output = '';
    finder.stdout.on('data', data => output += data);
    finder.on('error', err => reject(err));
    finder.on('close', code => {
      if(code === 0) resolve(output.trim());
      else reject(new Error(`Failed to resolve WSL path: ${code}`));
    });
  });
}

export function tryResolvePath(cwd: string, target?: string) {
  try {
    if(!target)
      return cwd;
    if(process.platform === 'win32' && /^[\/\~]/.test(target))
      return target;
    return resolvePath(cwd, target);
  } catch {
    return cwd;
  }
}

export function fixPath(env: { [key: string]: string }) {
  for (const key of Object.keys(process.env)) {
    if(!/^path$/i.test(key)) continue;
    if(env[key])
      env[key] += delimiter + dirname(exePath);
    else
      env[key] = process.env[key] + delimiter + dirname(exePath);
  }
  return env;
}

export function fileUrl(path: string) {
  let pathName = resolvePath(path).replace(/\\/g, '/');
  if(pathName[0] !== '/')
    pathName = '/' + pathName;
  return encodeURI('file://' + pathName);
}

export async function ensureDirectory(dir: string) {
  dir = resolvePath(dir);
  const fragments = dir.split(sep);
  let joint = fragments[0];
  for(let i = 1; i < fragments.length; i++) {
    joint = resolvePath(joint, fragments[i]);
    if(!await existsAsync(joint))
      await mkdirAsync(joint);
  }
}

export const isPackaged = (() => {
  if(process.mainModule && process.mainModule.filename.indexOf('app.asar') >= 0)
    return true;
  else if(process.argv.filter(a => a.indexOf('app.asar') !== -1).length > 0)
    return true;
  return false;
})();

export const appPathResolver = (() => {
  if(electronEnabled)
    return electron.app.getAppPath();
  return resolvePath(__dirname, '..');
})();
