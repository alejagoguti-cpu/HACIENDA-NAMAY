const https = require('https');
const fs = require('fs');

const lat = 4.932819869193663;
const lon = -74.44640638465661;
const zoom = 17;

function lon2tile(lon, zoom) { return Math.floor((lon + 180) / 360 * Math.pow(2, zoom)); }
function lat2tile(lat, zoom) { return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)); }

const tileX = lon2tile(lon, zoom);
const tileY = lat2tile(lat, zoom);

console.log(`Center tile for zoom ${zoom}: x=${tileX}, y=${tileY}`);

// ESRI World Imagery Tile URL
const url = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`;

https.get(url, (res) => {
  if (res.statusCode === 200) {
    const file = fs.createWriteStream('C:/Users/aleja/.gemini/antigravity/scratch/HACIENDA-NAMAY/assets/textures/satellite_namay.jpg');
    res.pipe(file);
    file.on('finish', () => {
      console.log('Satellite tile saved successfully!');
    });
  } else {
    console.log('Failed to fetch tile, status:', res.statusCode);
  }
}).on('error', err => console.error(err));
