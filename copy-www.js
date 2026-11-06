const fs = require('fs');
const path = require('path');

function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const wwwDir = path.join(__dirname, 'www');
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

fs.copyFileSync(path.join(__dirname, 'index.html'), path.join(wwwDir, 'index.html'));
fs.copyFileSync(path.join(__dirname, 'styles.css'), path.join(wwwDir, 'styles.css'));
fs.copyFileSync(path.join(__dirname, 'renderer.js'), path.join(wwwDir, 'renderer.js'));

copyDir(path.join(__dirname, 'assets'), path.join(wwwDir, 'assets'));
