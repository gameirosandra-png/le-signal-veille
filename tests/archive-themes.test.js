const {test}=require('node:test');const assert=require('node:assert/strict');const a=require('../archives');
const edition={id:'2026-10-13',date:'2026-10-13',title:'Automatiser mieux',url:'/editions/2026-10-13.html'};
const items=[{id:'make',edition:edition.id,categorie:'No-Code',titre:'Un scénario',resume:'Notifications',source:'https://example.org/make'},{id:'report',edition:edition.id,categorie:'Sécurité',titre:'Opérations IA',resume:'Rapport',source:'https://example.org/report'}];
const markers={report:{themes:['IA','Sécurité'],source:items[1].source}};
test('theme and text filters find subjects while keeping original article anchors',()=>{
 const result=a.select(edition,items,'operations','IA',markers);assert.equal(result.articles.length,1);assert.equal(result.articles[0].index,1);assert.equal(result.articles[0].id,'report');
 assert.equal(a.select(edition,items,'scénario','Sécurité',markers),null);
 assert.equal(a.select(edition,items,'2026-10-13','No-Code',markers).articles[0].id,'make');
});
test('unindexed pilot remains visible in all archives without inventing a theme',()=>{
 const pilot={...edition,id:'2026-10-12',url:'/editions/2026-10-12.html'};assert.ok(a.select(pilot,items,'','all',markers));assert.equal(a.select(pilot,items,'','IA',markers),null);
 assert.equal(a.select({...edition,url:'https://evil.example'},items,'','all',markers),null);
});
test('markers do not classify a changed or unrelated source',()=>{assert.deepEqual(a.themes(items[1],{report:{themes:['IA'],source:'https://different.example'}}),['Sécurité']);});
