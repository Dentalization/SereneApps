/*
 * High-performance binary FormData polyfill for k6 (ESM)
 * Uses native Uint8Array buffer.set() memcpy for multi-megabyte payloads.
 */

function stringToAsciiBytes(str) {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export function FormData() {
  if (!(this instanceof FormData)) return new FormData();
  this.boundary = '----k6XCoreBoundary' + Math.random().toString(36).substring(2);
  this.parts = [];
}

FormData.prototype.append = function(fieldName, data) {
  this.parts.push({ field: fieldName, file: data });
};

FormData.prototype.body = function() {
  const boundary = this.boundary;
  const parts = this.parts;
  
  let totalBytes = 0;
  const encodedParts = [];

  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const filename = p.file.filename || `part_${i}`;
    const contentType = p.file.content_type || 'application/octet-stream';
    const headerStr = `--${boundary}\r\nContent-Disposition: form-data; name="${p.field}"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`;
    const headerBytes = stringToAsciiBytes(headerStr);
    const dataBytes = new Uint8Array(p.file.data);
    
    encodedParts.push({ headerBytes, dataBytes });
    totalBytes += headerBytes.length + dataBytes.length + 2; // + \r\n
  }

  const footerStr = `--${boundary}--\r\n`;
  const footerBytes = stringToAsciiBytes(footerStr);
  totalBytes += footerBytes.length;

  // Single fast contiguous allocation
  const buffer = new Uint8Array(totalBytes);
  let offset = 0;

  for (let i = 0; i < encodedParts.length; i++) {
    const ep = encodedParts[i];
    buffer.set(ep.headerBytes, offset);
    offset += ep.headerBytes.length;
    buffer.set(ep.dataBytes, offset);
    offset += ep.dataBytes.length;
    buffer[offset] = 13; // \r
    buffer[offset + 1] = 10; // \n
    offset += 2;
  }

  buffer.set(footerBytes, offset);
  return buffer.buffer;
};
