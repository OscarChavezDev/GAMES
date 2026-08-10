/**
 * Minimal, dependency-free image sniffer.
 *
 * We intentionally do NOT use a general-purpose image metadata library here:
 * most of them (image-size included) support dozens of formats via parsers
 * that walk attacker-controlled byte streams, and several have shipped
 * unpatched infinite-loop DoS advisories. We only ever need to accept
 * JPEG/PNG/WEBP uploads, so we detect and measure exactly those three
 * formats by hand, with every loop bounded by the buffer length.
 */

export type ImageFormat = "jpeg" | "png" | "webp";

export type SniffedImage = {
  format: ImageFormat;
  width: number;
  height: number;
};

export function sniffImage(buffer: Buffer): SniffedImage | null {
  return readPng(buffer) ?? readJpeg(buffer) ?? readWebp(buffer);
}

function readPng(buf: Buffer): SniffedImage | null {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length < 24) return null;
  for (let i = 0; i < sig.length; i++) {
    if (buf[i] !== sig[i]) return null;
  }
  // IHDR is always the first chunk, immediately after the signature.
  if (buf.toString("ascii", 12, 16) !== "IHDR") return null;
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  if (width <= 0 || height <= 0) return null;
  return { format: "png", width, height };
}

function readJpeg(buf: Buffer): SniffedImage | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;

  let offset = 2;
  const maxIterations = buf.length; // hard cap: offset must strictly advance each loop
  for (let i = 0; i < maxIterations; i++) {
    if (offset + 4 > buf.length) return null;
    if (buf[offset] !== 0xff) return null;

    const marker = buf[offset + 1];
    // Standalone markers with no payload length.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }

    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) return null; // malformed; refuse to spin

    const isSofMarker =
      (marker >= 0xc0 && marker <= 0xcf) &&
      marker !== 0xc4 && // DHT
      marker !== 0xc8 && // JPG (reserved)
      marker !== 0xcc; // DAC

    if (isSofMarker) {
      if (offset + 9 > buf.length) return null;
      const height = buf.readUInt16BE(offset + 5);
      const width = buf.readUInt16BE(offset + 7);
      if (width <= 0 || height <= 0) return null;
      return { format: "jpeg", width, height };
    }

    offset += 2 + segmentLength;
  }
  return null;
}

function readWebp(buf: Buffer): SniffedImage | null {
  if (buf.length < 30) return null;
  if (buf.toString("ascii", 0, 4) !== "RIFF") return null;
  if (buf.toString("ascii", 8, 12) !== "WEBP") return null;

  const chunkId = buf.toString("ascii", 12, 16);
  const data = 20; // offset of the chunk payload (after 8-byte "id"+"size" sub-header)

  if (chunkId === "VP8X") {
    const width = 1 + (buf[data + 4] | (buf[data + 5] << 8) | (buf[data + 6] << 16));
    const height = 1 + (buf[data + 7] | (buf[data + 8] << 8) | (buf[data + 9] << 16));
    if (width <= 0 || height <= 0) return null;
    return { format: "webp", width, height };
  }

  if (chunkId === "VP8L") {
    if (buf[data] !== 0x2f) return null; // VP8L signature byte
    const bits = buf.readUInt32LE(data + 1);
    const width = (bits & 0x3fff) + 1;
    const height = ((bits >> 14) & 0x3fff) + 1;
    return { format: "webp", width, height };
  }

  if (chunkId === "VP8 ") {
    if (buf[data + 3] !== 0x9d || buf[data + 4] !== 0x01 || buf[data + 5] !== 0x2a) {
      return null;
    }
    const width = buf.readUInt16LE(data + 6) & 0x3fff;
    const height = buf.readUInt16LE(data + 8) & 0x3fff;
    if (width <= 0 || height <= 0) return null;
    return { format: "webp", width, height };
  }

  return null;
}
