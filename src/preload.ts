(window as any).init = () => {
  delete (window as any).init;
  require('./renderer');
};
