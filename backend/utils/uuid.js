const crypto = require('crypto');

/**
 * Generates a time-ordered UUIDv7 string.
 * UUIDv7 format: 48-bit timestamp | 4-bit version (7) | 12-bit sequence/random | 2-bit variant (2) | 62-bit random
 * Format output: xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx
 */
function uuidv7() {
  const timestamp = Date.now();
  const buffer = crypto.randomBytes(16);

  // Write timestamp in first 48 bits (6 bytes)
  buffer.writeUIntBE(timestamp, 0, 6);

  // Set version 7 in high 4 bits of byte 6
  buffer[6] = (buffer[6] & 0x0f) | 0x70;

  // Set variant 2 in high 2 bits of byte 8 (binary 10xxxxxx)
  buffer[8] = (buffer[8] & 0x3f) | 0x80;

  const hex = buffer.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

module.exports = { uuidv7 };
