const https = require('https');
const fs = require('fs');
const path = require('path');

const zoom = 17;
const centerX = 38430;
const centerY = 63737;
const outDir = 'C:/Users/aleja/.gemini/antigravity/scratch/HACIENDA-NAMAY/assets/textures/sat_tiles';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const download = (x, y) => new Promise((resolve) => {
  const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${y}/${x}`;
  const dest = path.join(outDir, `tile_${x}_${y}.jpg`);
  https.get(url, (res) => {
    if (res.statusCode === 200) {
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => resolve(true));
    } else {
      resolve(false);
    }
  }).on('error', () => resolve(false));
});

async function run() {
  console.log('Downloading 3x3 satellite grid around Hacienda Namay...');
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      await download(centerX + dx, centerY + dy);
    }
  }
  console.log('All tiles downloaded.');
}
run();
