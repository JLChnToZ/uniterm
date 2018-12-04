import * as main from 'electron';
import { MainInterface, remote } from 'electron';

let props: PropertyDescriptorMap;
if(remote)
  props = Object.assign(
    Object.getOwnPropertyDescriptors(remote),
    Object.getOwnPropertyDescriptors(main),
  );
else
  props = Object.getOwnPropertyDescriptors(main);

// Clone electron namespace
export const electron: MainInterface = Object.defineProperties({}, props);
