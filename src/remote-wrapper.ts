import * as main from 'electron';
import { MainInterface, remote } from 'electron';

const props: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(main);
if(remote) Object.assign(props, Object.getOwnPropertyDescriptors(remote));

// Clone electron namespace
export const electron: MainInterface = Object.defineProperties({}, props);
