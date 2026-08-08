export type CloseableImage = { width: number; height: number; close?: () => void };

type TextureBitmapFactory = (source: Blob, options: ImageBitmapOptions) => Promise<ImageBitmap>;

type TextureBitmapOptions = {
  contentType?: string;
  factory?: TextureBitmapFactory;
  maxDimension?: number;
};

type EncodedImageDimensions = {
  width: number;
  height: number;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);
const MAX_DIMENSION_HEADER_BYTES = 1024 * 1024;
const MAX_DIMENSION_HEADER_SEGMENTS = 256;

function invalidTextureDimensions(): TypeError {
  return new TypeError("Texture dimensions could not be read from the encoded image.");
}

async function readBlobBytes(source: Blob, offset: number, length: number): Promise<Uint8Array> {
  const end = offset + length;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || !Number.isSafeInteger(end)
    || offset < 0 || length < 1 || end > source.size) {
    throw invalidTextureDimensions();
  }
  return new Uint8Array(await source.slice(offset, end).arrayBuffer());
}

function bytesEqual(bytes: Uint8Array, expected: readonly number[], offset = 0): boolean {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + length));
}

function checkedDimensions(width: number, height: number): EncodedImageDimensions {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1) {
    throw invalidTextureDimensions();
  }
  return { width, height };
}

async function readPngDimensions(source: Blob): Promise<EncodedImageDimensions> {
  const header = await readBlobBytes(source, 0, 24);
  if (!bytesEqual(header, PNG_SIGNATURE) || ascii(header, 12, 4) !== "IHDR") {
    throw invalidTextureDimensions();
  }
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  return checkedDimensions(view.getUint32(16), view.getUint32(20));
}

async function readJpegDimensions(source: Blob): Promise<EncodedImageDimensions> {
  const signature = await readBlobBytes(source, 0, 2);
  if (signature[0] !== 0xff || signature[1] !== 0xd8) throw invalidTextureDimensions();

  let offset = 2;
  let segmentCount = 0;
  while (offset < source.size && offset < MAX_DIMENSION_HEADER_BYTES) {
    segmentCount += 1;
    if (segmentCount > MAX_DIMENSION_HEADER_SEGMENTS) throw invalidTextureDimensions();
    const prefix = await readBlobBytes(source, offset, 1);
    if (prefix[0] !== 0xff) throw invalidTextureDimensions();

    let marker = 0xff;
    while (marker === 0xff) {
      offset += 1;
      if (offset >= MAX_DIMENSION_HEADER_BYTES) throw invalidTextureDimensions();
      marker = (await readBlobBytes(source, offset, 1))[0] ?? 0;
    }
    offset += 1;

    if (marker === 0x00 || marker === 0xd9 || marker === 0xda) throw invalidTextureDimensions();
    if (marker === 0x01 || marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) continue;

    const segmentHeader = await readBlobBytes(source, offset, 2);
    const segmentLength = (segmentHeader[0] << 8) | segmentHeader[1];
    if (segmentLength < 2 || offset + segmentLength > source.size) throw invalidTextureDimensions();

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) throw invalidTextureDimensions();
      const frameHeader = await readBlobBytes(source, offset, 7);
      const height = (frameHeader[3] << 8) | frameHeader[4];
      const width = (frameHeader[5] << 8) | frameHeader[6];
      return checkedDimensions(width, height);
    }
    offset += segmentLength;
  }
  throw invalidTextureDimensions();
}

function uint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

async function readWebpDimensions(source: Blob): Promise<EncodedImageDimensions> {
  const header = await readBlobBytes(source, 0, 12);
  if (ascii(header, 0, 4) !== "RIFF" || ascii(header, 8, 4) !== "WEBP") {
    throw invalidTextureDimensions();
  }

  let offset = 12;
  let chunkCount = 0;
  while (offset + 8 <= source.size && offset < MAX_DIMENSION_HEADER_BYTES) {
    chunkCount += 1;
    if (chunkCount > MAX_DIMENSION_HEADER_SEGMENTS) throw invalidTextureDimensions();
    const chunkHeader = await readBlobBytes(source, offset, 8);
    const chunkType = ascii(chunkHeader, 0, 4);
    const chunkSize = new DataView(chunkHeader.buffer, chunkHeader.byteOffset, chunkHeader.byteLength).getUint32(4, true);
    const dataOffset = offset + 8;
    const dataEnd = dataOffset + chunkSize;
    if (!Number.isSafeInteger(dataEnd) || dataEnd > source.size) throw invalidTextureDimensions();

    if (chunkType === "VP8X") {
      if (chunkSize < 10) throw invalidTextureDimensions();
      const data = await readBlobBytes(source, dataOffset, 10);
      return checkedDimensions(uint24LittleEndian(data, 4) + 1, uint24LittleEndian(data, 7) + 1);
    }
    if (chunkType === "VP8L") {
      if (chunkSize < 5) throw invalidTextureDimensions();
      const data = await readBlobBytes(source, dataOffset, 5);
      if (data[0] !== 0x2f) throw invalidTextureDimensions();
      const width = 1 + data[1] + ((data[2] & 0x3f) << 8);
      const height = 1 + ((data[2] & 0xc0) >>> 6) + (data[3] << 2) + ((data[4] & 0x0f) << 10);
      return checkedDimensions(width, height);
    }
    if (chunkType === "VP8 ") {
      if (chunkSize < 10) throw invalidTextureDimensions();
      const data = await readBlobBytes(source, dataOffset, 10);
      if (!bytesEqual(data, [0x9d, 0x01, 0x2a], 3)) throw invalidTextureDimensions();
      const width = (data[6] | (data[7] << 8)) & 0x3fff;
      const height = (data[8] | (data[9] << 8)) & 0x3fff;
      return checkedDimensions(width, height);
    }

    const paddedChunkSize = chunkSize + (chunkSize & 1);
    const nextOffset = dataOffset + paddedChunkSize;
    if (!Number.isSafeInteger(nextOffset) || paddedChunkSize < chunkSize || nextOffset <= offset) {
      throw invalidTextureDimensions();
    }
    offset = nextOffset;
  }
  throw invalidTextureDimensions();
}

async function readEncodedImageDimensions(source: Blob, suppliedContentType?: string): Promise<EncodedImageDimensions> {
  const contentType = (suppliedContentType || source.type).split(";", 1)[0]?.trim().toLowerCase();
  if (contentType === "image/png") return readPngDimensions(source);
  if (contentType === "image/jpeg") return readJpegDimensions(source);
  if (contentType === "image/webp") return readWebpDimensions(source);
  throw invalidTextureDimensions();
}

export async function createTextureBitmap(
  source: Blob,
  options: TextureBitmapOptions = {},
): Promise<ImageBitmap> {
  const factory = options.factory ?? createImageBitmap;
  const bitmapOptions: ImageBitmapOptions = { imageOrientation: "flipY" };
  if (options.maxDimension === undefined) return factory(source, bitmapOptions);

  const maxDimension = Math.floor(options.maxDimension);
  if (!Number.isFinite(maxDimension) || maxDimension < 1) {
    throw new RangeError("Texture bitmap maxDimension must be a positive finite number.");
  }

  const { width, height } = await readEncodedImageDimensions(source, options.contentType);
  const sourceMaxDimension = Math.max(width, height);
  if (sourceMaxDimension <= maxDimension) return factory(source, bitmapOptions);

  const scale = maxDimension / sourceMaxDimension;
  return factory(source, {
    ...bitmapOptions,
    resizeWidth: Math.max(1, Math.round(width * scale)),
    resizeHeight: Math.max(1, Math.round(height * scale)),
    resizeQuality: "high",
  });
}
