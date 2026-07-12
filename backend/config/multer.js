const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'backend/uploads';
    if (file.fieldname === 'foto_user') {
      folder = 'backend/uploads/users';
    } else if (file.fieldname === 'logo_mitra' || file.fieldname === 'banner_mitra') {
      folder = 'backend/uploads/mitra';
    } else if (file.fieldname === 'foto_lapangan' || file.fieldname === 'foto') {
      folder = 'backend/uploads/lapangan';
    } else if (file.fieldname === 'foto_review') {
      folder = 'backend/uploads/review';
    } else if (file.fieldname === 'bukti_pembayaran') {
      folder = 'backend/uploads/payment';
    }
    
    const dir = path.join(process.cwd(), folder);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung! Hanya diperbolehkan format JPEG, PNG, JPG, dan WEBP.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;
