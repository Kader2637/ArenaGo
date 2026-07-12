const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const assets = [
  // Categories
  { url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/soccer.jpg' },
  { url: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/futsal.jpg' },
  { url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/badminton.jpg' },
  { url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/basketball.jpg' },
  { url: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/tennis.jpg' },
  { url: 'https://images.unsplash.com/photo-1592656094267-764a45160876?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/volleyball.jpg' },
  { url: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/baseball.jpg' },
  { url: 'https://images.unsplash.com/photo-1521295081895-39f94b233023?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/hockey.jpg' },
  // Courts
  { url: 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/lapangan/futsal_field.jpg' },
  { url: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/lapangan/badminton_field.jpg' },
  { url: 'https://images.unsplash.com/photo-1518063319789-7217e6706b04?auto=format&fit=crop&q=80&w=600', dest: 'backend/uploads/lapangan/futsal_batu.jpg' }
];

// Determine the base path for uploads. In Vercel, this should be /tmp.
const isVercel = process.env.VERCEL === '1';

function ensureDirExists(filePath) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function downloadFile(fileUrl, dest) {
  return new Promise((resolve, reject) => {
    const protocol = fileUrl.startsWith('https') ? https : http;
    protocol.get(fileUrl, (response) => {
      // Follow Redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else if (response.statusCode === 200) {
        ensureDirExists(dest);
        const fileStream = fs.createWriteStream(dest);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          console.log(`Successfully downloaded asset to: ${dest}`);
          resolve();
        });
      } else {
        reject(new Error(`Server returned status code ${response.statusCode} for url ${fileUrl}`));
      }
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  console.log('Downloading category and court assets...');

  const downloadPromises = assets.map(asset => {
    return new Promise(async (resolve) => {
      let fullPath;

      // Adjust destination for Vercel environment
      if (isVercel) {
        // Recreate the 'backend/uploads' structure inside '/tmp'
        fullPath = path.join('/tmp', asset.dest);
      } else {
        fullPath = path.join(__dirname, '..', asset.dest);
      }

      try {
        await downloadFile(asset.url, fullPath);
      } catch (err) {
        console.warn(`Failed to download ${asset.dest}: ${err.message}. Writing mock fallback...`);
        ensureDirExists(fullPath);
        fs.writeFileSync(fullPath, Buffer.from('RIFF....WEBPVP8 ', 'binary'));
      }
      resolve();
    });
  });

  await Promise.all(downloadPromises);
  console.log('Assets download done.');
}

run();
