declare module "tui-image-editor" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class ImageEditor {
    constructor(element: HTMLElement, options: any);
    loadImageFromURL(url: string, name: string): void;
    toDataURL(options?: { format?: string; quality?: number }): string;
    undo(): void;
    redo(): void;
    reset(): void;
    destroy(): void;
  }

  export default ImageEditor;
}
