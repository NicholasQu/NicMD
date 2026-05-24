const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const sizes = [256, 128, 64, 48, 32, 16]
const svgPath = path.join(__dirname, '..', 'public', 'icon-orange.svg')
const icoPath = path.join(__dirname, '..', 'public', 'icon.ico')

async function generateIco() {
  const pngBuffers = []

  for (const size of sizes) {
    const pngBuf = await sharp(svgPath)
      .resize(size, size, { kernel: 'lanczos3' })
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer()
    pngBuffers.push({ size, pngBuf })
  }

  const numImages = pngBuffers.length

  const headerBuf = Buffer.alloc(6)
  headerBuf.writeUInt16LE(0, 0)
  headerBuf.writeUInt16LE(1, 2)
  headerBuf.writeUInt16LE(numImages, 4)

  let offset = 6 + numImages * 16
  const dirEntries = []

  for (const { size, pngBuf } of pngBuffers) {
    const entryBuf = Buffer.alloc(16)
    const w = size >= 256 ? 0 : size
    entryBuf.writeUInt8(w, 0)
    entryBuf.writeUInt8(w, 1)
    entryBuf.writeUInt8(0, 2)
    entryBuf.writeUInt8(0, 3)
    entryBuf.writeUInt16LE(0, 4)
    entryBuf.writeUInt16LE(32, 6)
    entryBuf.writeUInt32LE(pngBuf.length, 8)
    entryBuf.writeUInt32LE(offset, 12)
    dirEntries.push(entryBuf)
    offset += pngBuf.length
  }

  const icoData = Buffer.concat([headerBuf, ...dirEntries, ...pngBuffers.map(b => b.pngBuf)])
  fs.writeFileSync(icoPath, icoData)
  console.log(`icon.ico generated: ${icoData.length} bytes, ${numImages} sizes:`, sizes)
}

generateIco().catch(console.error)