declare module "@toast-ui/react-image-editor" {
  import { Component } from "react";

  interface ImageEditorProps {
    includeUI?: {
      loadImage?: { path: string; name: string };
      theme?: Record<string, string>;
      menu?: string[];
      initMenu?: string;
      uiSize?: { width: string; height: string };
      menuBarPosition?: string;
    };
    cssMaxHeight?: number;
    cssMaxWidth?: number;
    usageStatistics?: boolean;
    ref?: React.Ref<ImageEditor>;
  }

  interface ImageEditorInstance {
    loadImageFromURL(url: string, name: string): void;
    toDataURL(options?: { format?: string; quality?: number }): string;
    undo(): void;
    redo(): void;
    reset(): void;
  }

  export default class ImageEditor extends Component<ImageEditorProps> {
    getInstance(): ImageEditorInstance;
  }
}
