import { resolve as resolvePath } from 'path';

(window as any).init = () => {
  // For compatiblity
  Object.assign(window, {
    require,
    __dirname,
    __filename: resolvePath(__dirname, '~hidden.html'),
    init: undefined,
  });
  require('./renderer');
};
