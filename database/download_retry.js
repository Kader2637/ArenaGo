const fs = require('fs');
const path = require('path');
const https = require('https');
const { URL } = require('url');

const assets = [
  { url: 'https://images.unsplash.com/photo-1540747737956-37872f7671f3?auto=format&fit=crop&q=80&w=1200', dest: 'backend/uploads/hero_bg.jpg' }
];

function downloadFile(fileUrl, dest) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(fileUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };

    https.get(options, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(dest);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Successfully downloaded hero asset to: ${dest}`);
          resolve();
        });
      } else {
        reject(new Error(`Server returned status code ${response.statusCode}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  for (const asset of assets) {
    const fullPath = path.join(__dirname, '..', asset.dest);
    try {
      await downloadFile(asset.url, fullPath);
    } catch (err) {
      console.warn(`Retry failed for ${asset.dest}: ${err.message}. Writing placeholder...`);
      fs.writeFileSync(fullPath, Buffer.from('RIFF....WEBPVP8 ', 'binary'));
    }
  }
}

run();
