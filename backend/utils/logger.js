const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), 'storage/logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const appLogPath = path.join(logDir, 'app.log');
const errorLogPath = path.join(logDir, 'error.log');

function writeLog(filePath, level, message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  
  fs.appendFile(filePath, logMessage, (err) => {
    if (err) {
      console.error('Gagal menulis log ke file:', err);
    }
  });
  
  if (level === 'ERROR') {
    console.error(logMessage.trim());
  } else {
    console.log(logMessage.trim());
  }
}

module.exports = {
  info: (message) => writeLog(appLogPath, 'INFO', message),
  error: (message) => writeLog(errorLogPath, 'ERROR', message),
  warn: (message) => writeLog(appLogPath, 'WARN', message)
};
