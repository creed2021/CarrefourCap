const fs = require('fs');

const mtaPath = 'mta.yaml';

if (!fs.existsSync(mtaPath)) {
  console.log('ℹ️  No mta.yaml encontrado, se omite');
  process.exit(0);
}

const pkg = require('../package.json');
let mta = fs.readFileSync(mtaPath, 'utf8');

mta = mta.replace(
  /^version:\s*.*/m,
  `version: ${pkg.version}`
);

fs.writeFileSync(mtaPath, mta);
console.log(`✅ mta.yaml actualizado a versión ${pkg.version}`);
