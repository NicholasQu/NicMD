import sharp from 'sharp'
import { join } from 'path'
import { writeFile } from 'fs/promises'

const svgPath = join(process.cwd(), 'public/icon-orange.svg')

async function generateIcon() {
  await sharp(svgPath)
    .resize(256, 256)
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(join(process.cwd(), 'public/icon.png'))
  
  console.log('icon.png generated successfully (256x256)')
  console.log('electron-builder will convert it to .ico during build')
}

generateIcon().catch(console.error)