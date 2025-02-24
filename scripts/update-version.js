const fs = require('fs');
const path = require('path');

// Read package.json
const packagePath = path.join(__dirname, '..', 'package.json');
const package = require(packagePath);

// Split version into parts
const [major, minor, patch] = package.version.split('.').map(Number);

// Increment minor version
package.version = `${major}.${minor + 1}.${patch}`;

// Write back to package.json
fs.writeFileSync(packagePath, JSON.stringify(package, null, 2) + '\n');

// Update version in index.html
const indexPath = path.join(__dirname, '..', 'public', 'index.html');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace version in footer
indexContent = indexContent.replace(
    /<p class="version">v[\d.]+<\/p>/,
    `<p class="version">v${package.version}</p>`
);

fs.writeFileSync(indexPath, indexContent);

console.log(`Version updated to ${package.version}`);
