const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const {discoverCouplePhotos}=require('../scripts/generate-couple-photos.cjs');
test('only local couple photos are used, naturally sorted, capped at six',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'couple-test-'));
 try{
  assert.deepEqual(discoverCouplePhotos(root),[]);const folder=path.join(root,'public','couple');fs.mkdirSync(folder,{recursive:true});
  for(const name of ['10.jpg','2.webp','1.jpg','3.png','4.avif','5.jpeg','6.jpg','README.md','voice.webm'])fs.writeFileSync(path.join(folder,name),'fixture');
  fs.mkdirSync(path.join(folder,'nested.jpg'));
  const photos=discoverCouplePhotos(root);assert.equal(photos.length,6);assert.ok(photos[0].startsWith('/couple/1.jpg?'));assert.ok(photos[1].startsWith('/couple/2.webp?'));
  assert.ok(photos.every(p=>!p.includes('README')&&!p.includes('voice')&&!p.includes('nested')));
 }finally{const resolved=path.resolve(root);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('couple-test-'));fs.rmSync(resolved,{recursive:true,force:true});}
});
