const fs = require('fs');

const manifestPath = 'app/webapp/manifest.json';

if (!fs.existsSync(manifestPath)) {
  console.log('ℹ️  No manifest.json encontrado, se omite');
  process.exit(0);
}

const pkg = require('../package.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

manifest['sap.app'] = manifest['sap.app'] || {};
manifest['sap.app'].applicationVersion = {
  version: pkg.version
};

fs.writeFileSync(
  manifestPath,
  JSON.stringify(manifest, null, 2)
);

console.log(`✅ manifest.json actualizado a versión ${pkg.version}`);
