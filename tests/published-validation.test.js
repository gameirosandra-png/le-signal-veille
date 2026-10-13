const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const n=require('../lib/newsletter');
const root=path.join(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'editions/index.json'),'utf8'));
const registry=JSON.parse(fs.readFileSync(path.join(root,'data/sujets.json'),'utf8'));

for(const edition of catalog.editions.filter(e=>e.status==='validee'&&e.verifiedNews===true)){
 test(`published edition ${edition.id} matches its approved content and page`,()=>{
  const articles=registry.items.filter(a=>a.edition===edition.id);
  assert.ok(n.eligible(edition,articles));
  assert.equal(n.contentHash(edition,articles),edition.validatedContentHash,
   'The newsletter title or articles differ from the editorial approval.');
  // Git may convert LF to CRLF on Windows; deployed Git blobs use LF.
  const html=fs.readFileSync(path.join(root,edition.url),'utf8').replace(/\r\n/g,'\n');
  assert.equal(n.hash(html),edition.validatedHtmlHash,
   'The published page differs from its approved revision.');
  assert.ok(Number.isFinite(Date.parse(edition.validatedAt)));
 });
}
