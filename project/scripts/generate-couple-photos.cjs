const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
function discoverCouplePhotos(root) {
  const folder = path.join(root, 'public', 'couple');
  if (!fs.existsSync(folder)) return [];
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(jpe?g|png|webp|avif)$/i.test(entry.name))
    .map(entry => entry.name).sort((a,b) => a.localeCompare(b, 'tr', { numeric:true })).slice(0,6)
    .map(name => '/couple/' + encodeURIComponent(name) + '?v=' + createHash('sha256').update(fs.readFileSync(path.join(folder,name))).digest('hex').slice(0,12));
}
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const photos = discoverCouplePhotos(root);
  fs.writeFileSync(path.join(root, 'lib', 'couple-photos.json'), JSON.stringify(photos, null, 2) + '\n');
  console.log('Çift fotoğrafları: ' + photos.length + ' (public/couple)');
}
module.exports = { discoverCouplePhotos };
