import { Jimp } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE_IMAGE = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\c143aa8b-08eb-430c-8d0e-0b1729949d18\\expense_tracker_pwa_icon_1776483092062.png';
const TARGET_DIR = path.join(__dirname, '../public/icons');

async function generateIcons() {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  try {
    const image = await Jimp.read(SOURCE_IMAGE);

    // Generate 192x192
    const icon192 = image.clone().resize({ w: 192, h: 192 });
    await icon192.write(path.join(TARGET_DIR, 'pwa-192x192.png'));
    console.log('Generated pwa-192x192.png');

    // Generate 512x512
    const icon512 = image.clone().resize({ w: 512, h: 512 });
    await icon512.write(path.join(TARGET_DIR, 'pwa-512x512.png'));
    console.log('Generated pwa-512x512.png');

    // Generate apple-touch-icon (180x180)
    const appleIcon = image.clone().resize({ w: 180, h: 180 });
    await appleIcon.write(path.join(TARGET_DIR, 'apple-touch-icon.png'));
    console.log('Generated apple-touch-icon.png');

  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons();
