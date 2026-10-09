import { randomFillSync } from 'node:crypto'

let lastTimestamp = 0
let sequence = 0

/**
 * A UUID version 7 (RFC 9562): 48 bits of the time in milliseconds, then
 * random bits, so IDs sort by when they were made. IDs made within the
 * same millisecond in this process count up in the 12 bits after the
 * time, so they keep their order too.
 */
export function uuidv7(now = Date.now()) {
  if (now > lastTimestamp) {
    lastTimestamp = now
    sequence = 0
  } else {
    sequence += 1
    if (sequence > 0xfff) {
      lastTimestamp += 1
      sequence = 0
    }
  }

  const bytes = randomFillSync(new Uint8Array(16))
  const timestamp = BigInt(lastTimestamp)
  for (let index = 0; index < 6; index++) {
    bytes[index] = Number((timestamp >> BigInt(8 * (5 - index))) & 0xffn)
  }
  bytes[6] = 0x70 | (sequence >> 8)
  bytes[7] = sequence & 0xff
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Buffer.from(bytes).toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
