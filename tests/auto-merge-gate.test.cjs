const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync('.github/workflows/auto-pr.yml','utf8').replace(/\r\n/g,'\n');
test('workflow embedded scripts parse and every merge pins the checked SHA',()=>{
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const scripts=[...source.matchAll(/          script: \|\n([\s\S]*?)(?=\n[^ ]|\n  [^ ]|$)/g)];assert.equal(scripts.length,3);
 for(const [,body] of scripts)new AsyncFunction(body.split('\n').map(l=>l.startsWith('            ')?l.slice(12):l).join('\n'));
 const merges=[...source.matchAll(/input: JSON.stringify\(\{ merge_method: 'squash'([^}]*)\}\)/g)];assert.equal(merges.length,5);for(const m of merges)assert.ok(m[1].includes('sha:'));
 assert.ok(source.includes("relevant[0].status === 'modified' && primary.kind === 'sponsor' && allOk"));
});
test('actual comment gate terminates all failed backlink cases despite stale success labels',async()=>{
 const start=source.indexOf('            // Every friend entry');const end=source.indexOf('            // ── Merge',start);assert.ok(start>=0&&end>start);
 const gate=source.slice(start,end);
 for(const scenario of ['missingConfig','missing','invalid','protocol','host','fetch','notFound','valid','sponsor']){
  let merged=false;const labels=[];
  const context={...require('../.github/scripts/pr-helpers.js'),URL,primary:{kind:scenario==='sponsor'?'sponsor':'friend',data:{backlink:scenario==='missing'?'':scenario==='invalid'?'invalid':scenario==='protocol'?'file:///tmp/x':scenario==='host'?'https://other.example/':'https://friend.example/links'}},siteBase:scenario==='missingConfig'?'':'https://www.acofork.com',siteUrl:'https://friend.example',isNonEmptyString:v=>typeof v==='string'&&v.trim().length>0,MSG:new Proxy({BIDIR_INSTRUCTIONS:()=>''},{get:(o,k)=>o[k]||''}),LABELS:{BIDIR:'needs',BIDIR_OK:'passed'},setLabels:async v=>labels.push(v),createComment:async()=>{},checkUrlReachability:async()=>({ok:scenario!=='fetch',body:'fake',status:200}),verifyBacklink:()=>({found:scenario!=='notFound',links:[]}),formatBacklinkDebug:()=>'',extractTitle:()=>'',bidirNotFoundMsg:()=>'',markMerge:()=>{merged=true;}};
  await vm.runInNewContext('(async()=>{'+gate+'markMerge();})()',context);
  assert.equal(merged,scenario==='valid'||scenario==='sponsor',scenario);
 }
});
