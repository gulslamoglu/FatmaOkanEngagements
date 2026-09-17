const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const sandbox = { exports: {}, Set, Error }; vm.runInNewContext(code, sandbox); return sandbox.exports;
}
const { checkAllowance, remainingFor } = load('lib/guest-limits.ts');
const { expandMemories } = load('lib/gallery-items.ts');
test('last available photo, video and voice slots are accepted; excess is rejected', () => {
  for (const [kind, max] of [['image',20],['video',5],['audio',2]]) {
    const usage = { image:0, video:0, audio:0, ids:[], [kind]:max-1 };
    assert.doesNotThrow(() => checkAllowance(usage, [{id:'new',kind}]));
    assert.throws(() => checkAllowance(usage, [{id:'one',kind},{id:'two',kind}]), /Kalan/);
    usage[kind] = max;
    assert.throws(() => checkAllowance(usage, [{id:'new',kind}]), /Kalan/);
    assert.equal(remainingFor(usage,kind),0);
  }
});
test('saved IDs and repeated selected IDs are not counted twice on retry', () => {
  const usage = { image:20, video:0, audio:0, ids:['saved'] };
  assert.doesNotThrow(() => checkAllowance(usage,[{id:'saved',kind:'image'}]));
  assert.throws(() => checkAllowance(usage,[{id:'saved',kind:'image'},{id:'new',kind:'image'}]));
  usage.image=19;
  assert.doesNotThrow(() => checkAllowance(usage,[{id:'new',kind:'image'},{id:'new',kind:'image'}]));
});
test('legacy over-limit guests have no negative remaining quota', () => {
  assert.equal(remainingFor({image:30,video:0,audio:0,ids:[]},'image'),0);
});
test('a legacy batch becomes five unique cards that open the matching photo', () => {
  const media = Array.from({length:5},(_,i)=>({id:'photo-'+i,media_type:'image',storage_path:'photo-'+i+'.webp'}));
  const cards = expandMemories([{id:'old-batch',type:'photo',memory_media:media}]);
  assert.equal(cards.length,5); assert.equal(new Set(cards.map(c=>c.cardId)).size,5);
  cards.forEach((card,i)=>{ assert.equal(card.id,'old-batch'); assert.equal(card.memory_media.length,1); assert.equal(card.memory_media[0].storage_path,'photo-'+i+'.webp'); });
});
test('text remains one card; incomplete uploads stay hidden; mixed legacy media retain types', () => {
  const cards = expandMemories([{id:'text',type:'text',story:'Hello'}, {id:'empty',type:'photo',memory_media:[]}, {id:'mixed',type:'video',memory_media:[{id:'i',media_type:'image'},{id:'v',media_type:'video'},{id:'a',media_type:'audio'}]}]);
  assert.equal(cards.map(c=>c.type).join(','),'text,photo,video,voice');
});
