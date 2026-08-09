type ExportRequest = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  mime: string;
  quality?: number;
};

self.onmessage = async (event: MessageEvent<ExportRequest>) => {
  const { bitmap, width, height, mime, quality } = event.data;
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("2D worker canvas unavailable");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: mime, quality });
  self.postMessage({ blob });
};
