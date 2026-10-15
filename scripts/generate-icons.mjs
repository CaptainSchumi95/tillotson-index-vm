// Pripraví ikony PWA a orezané logá z podkladov v tillotson-index-logos/.
// Spustenie: npm run icons
import sharp from 'sharp'

const SRC = 'tillotson-index-logos'
const icon = `${SRC}/tillotson index icon.png`

// Ikony PWA – štvorcové, zaoblenie robí systém.
for (const [size, out] of [
  [192, 'pwa-192.png'],
  [512, 'pwa-512.png'],
  [512, 'pwa-maskable-512.png'],
  [180, 'apple-touch-icon.png'],
  [64, 'favicon-64.png'],
]) {
  await sharp(icon).resize(size, size).png().toFile(`public/${out}`)
}
// Malá ikona upozornení (stavový riadok Androidu) – systém z nej berie iba priehľadnosť,
// preto biele „IDX“ na priehľadnom pozadí. Maska = svetlé písmená z modrej ikony.
const glyph = await sharp(icon).extract({ left: 160, top: 160, width: 760, height: 760 }).resize(96, 96)
const alpha = await glyph.clone().extractChannel('red').linear(255 / 60, (-80 * 255) / 60).toBuffer()
await sharp({ create: { width: 96, height: 96, channels: 3, background: '#ffffff' } })
  .joinChannel(alpha)
  .png()
  .toFile('public/badge-96.png')
await sharp(`${SRC}/tillotson index icon - rounded.png`).resize(48, 48).png().toFile('public/favicon.png')

// Logá do aplikácie – orezané o prázdny okraj.
const logos = [
  ['tillotson index text logo.png', 'ti-wordmark.png', 900],
  ['tillotson index short.png', 'ti-idx.png', 400],
]
for (const [src, out, width] of logos) {
  await sharp(`${SRC}/${src}`).trim().resize({ width, withoutEnlargement: true }).png().toFile(`src/assets/brand/${out}`)
}

// Hero na prihlasovaciu obrazovku – WebP je výrazne menší.
await sharp(`${SRC}/tillotson index herologo.png`).trim().resize({ width: 1000 }).webp({ quality: 88 }).toFile('src/assets/brand/ti-hero.webp')

console.log('Ikony a logá pripravené.')
