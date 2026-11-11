const https = require('https');
const fs = require('fs');

const lat = 4.932819869193663;
const lon = -74.44640638465661;

// Grid of 9x9 points around coordinates (+/- 0.004 degrees, ~450m radius)
const size = 9;
const span = 0.005;
const lats = [];
const lons = [];

for (let i = 0; i < size; i++) {
  const curLat = lat - span / 2 + (i / (size - 1)) * span;
  for (let j = 0; j < size; j++) {
    const curLon = lon - span / 2 + (j / (size - 1)) * span;
    lats.push(curLat.toFixed(6));
    lons.push(curLon.toFixed(6));
  }
}

const url = `https://api.open-meteo.com/v1/elevation?latitude=${lats.join(',')}&longitude=${lons.join(',')}`;

console.log('Querying Open-Meteo elevation for', lats.length, 'points around Albán...');
https.get(url, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      if (data.elevation) {
        console.log('Base elevation center:', data.elevation[Math.floor(data.elevation.length / 2)], 'msnm');
        console.log('Min elevation:', Math.min(...data.elevation), 'Max elevation:', Math.max(...data.elevation));
        fs.writeFileSync('C:/Users/aleja/.gemini/antigravity/scratch/HACIENDA-NAMAY/assets/terrain_elevation.json', JSON.stringify({
          lat, lon, size, span, elevations: data.elevation
        }, null, 2));
        console.log('Saved terrain_elevation.json successfully!');
      } else {
        console.log('No elevation array:', data);
      }
    } catch (e) {
      console.error('Error parsing:', e);
    }
  });
}).on('error', err => console.error('Request error:', err));
