import h from 'hyperscript';

export function getAsStringAsync(d: DataTransferItem) {
  return new Promise<string>(resolve => d.getAsString(resolve));
}

export function loadScript(src: string, onload?: () => void) {
  const script = <script async={true} src={src} onload={onload} />;
  document.head.appendChild(script);
  document.head.removeChild(script);
  return script as HTMLScriptElement;
}

export function interceptEvent(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}

export function interceptDrop(e: DragEvent) {
  interceptEvent(e);
  e.dataTransfer.dropEffect = 'none';
}

export function acceptFileDrop(e: DragEvent) {
  interceptEvent(e);
  const { dataTransfer } = e;
  for(const type of dataTransfer.types)
    switch(type) {
      case 'Files':
        dataTransfer.dropEffect = 'link';
        return;
    }
  dataTransfer.dropEffect = 'none';
}

