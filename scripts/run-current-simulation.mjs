import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const packageVersion = JSON.parse(fs.readFileSync('package.json','utf8')).version;
const seedPrefix = `QA${packageVersion.replace(/\D/g,'')}`;
const target = path.resolve(process.argv[2] ?? `reports/v${packageVersion}-10000`);
const started = Date.now();
fs.mkdirSync(target,{recursive:true});
const jobs = [0,500,1000,1500].map((offset,i)=>new Promise((resolve,reject)=>{
  const out = path.join(target,`batch-${i+1}`);
  const child = spawn(process.execPath,['scripts/simulate-current-game.mjs','2500',out,String(offset),seedPrefix],{stdio:['ignore','pipe','pipe'],windowsHide:true});
  child.stdout.on('data',data=>process.stdout.write(`[batch ${i+1}] ${data}`));
  child.stderr.on('data',data=>process.stderr.write(`[batch ${i+1}] ${data}`));
  child.on('error',reject);
  child.on('exit',code=>code===0 ? resolve(out) : reject(new Error(`Batch ${i+1} exited ${code}`)));
}));
const outputs = await Promise.all(jobs);
const batches = outputs.map(out=>JSON.parse(fs.readFileSync(path.join(out,'results.json'),'utf8')));
assert(batches.every(b=>b.metadata.sourceSha256===batches[0].metadata.sourceSha256&&b.metadata.catalogSha256===batches[0].metadata.catalogSha256),'Source changed across batches');
const rows = batches.flatMap(b=>b.rows);
assert.equal(rows.length,10000);
assert.equal(new Set(rows.map(r=>`${r.seed}:${r.policy}`)).size,10000);
assert.equal(new Set(rows.map(r=>r.seed)).size,2000);
assert(batches.every(b=>b.metadata.networkAttempts===0&&b.failures.length===0));
const metadata = { ...batches[0].metadata, generatedAt:new Date().toISOString(), requested:10000,completed:10000,distinctSeeds:2000,
  seedPattern:`${seedPrefix}-000001..${seedPrefix}-002000`,elapsedSeconds:(Date.now()-started)/1000,deterministicReplayChecks:20,batches:4 };
fs.writeFileSync(path.join(target,'results.json'),JSON.stringify({metadata,failures:[],rows}));
console.log(`COMPLETE: 10000 games settled, no network calls. Results: ${target}`);
