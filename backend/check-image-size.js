import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bannerDir = path.join(__dirname, 'uploads', 'banners');

async function checkLatestImage() {
  try {
    const files = await fs.readdir(bannerDir);
    const imageFiles = files
      .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
      .map(f => ({
        name: f,
        path: path.join(bannerDir, f),
      }));

    if (imageFiles.length === 0) {
      console.log('No banner images found');
      return;
    }

    // Check the most recently modified file
    const fileStats = await Promise.all(
      imageFiles.map(async (f) => {
        const stats = await fs.stat(f.path);
        return { ...f, mtime: stats.mtime };
      })
    );

    const latest = fileStats.sort((a, b) => b.mtime - a.mtime)[0];
    const metadata = await sharp(latest.path).metadata();

    console.log('Latest Banner Image:');
    console.log('  File:', latest.name);
    console.log('  Width:', metadata.width, 'px');
    console.log('  Height:', metadata.height, 'px');
    console.log('  Aspect Ratio:', (metadata.width / metadata.height).toFixed(2), ': 1');
    console.log('  Format:', metadata.format);
    console.log('  Target Ratio: 4 : 1 (1200x300)');
    
    if (metadata.width === 1200 && metadata.height === 300) {
      console.log('  ✓ Image matches target dimensions exactly');
    } else {
      const targetRatio = 4 / 1;
      const actualRatio = metadata.width / metadata.height;
      console.log('  ⚠ Image does not match target dimensions');
      console.log('  Current ratio:', actualRatio.toFixed(2), ': 1');
      console.log('  Target ratio:', targetRatio.toFixed(2), ': 1');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkLatestImage();

