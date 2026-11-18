import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { storeCaptureEvidence } from '../cloudflare/capture-evidence.mjs';

const png = Buffer.from(Array.from({length:128},(_,i)=>i));
const sha256 = createHash('sha256').update(png).digest('hex');
const facts = {siteId:'aiscent',width:390,height:844,sha256,ariaStatus:'CAPTURED'};
const bucket = () => {
  const objects=new Map();
  return {objects,
    async put(key,data,opts={}) {
      if(opts.onlyIf?.etagDoesNotMatch==='*'&&objects.has(key))return null;
      const bytes=Buffer.from(data);
      if(opts.sha256) assert.equal(createHash('sha256').update(bytes).digest('hex'),
        Buffer.from(opts.sha256).toString('hex'));
      objects.set(key,{bytes,metadata:opts.customMetadata||{}});
      return {size:bytes.length,key};
    },
    async get(key) {
      const stored=objects.get(key);
      return stored?{body:true,arrayBuffer:async()=>stored.bytes}:null;
    },
    async head(key){return objects.get(key)?{key}:null},
    async delete(keys){for(const key of keys)objects.delete(key)}
  };
};

test('R2 evidence is private owner scope, checksum-bound, readback verified and immutable',async()=>{
  const r2=bucket();
  const saved=await storeCaptureEvidence({CAPTURE_EVIDENCE:r2},png,facts,'test-reservation-1');
  assert.equal(saved.verifiedReadback,true);
  assert.equal(saved.retentionDays,7);
  assert.equal(saved.sha256,sha256);
  assert.equal(r2.objects.size,2);
  const record=JSON.parse(r2.objects.get(saved.receiptKey).bytes.toString());
  assert.equal(record.imageKey,saved.imageKey);
  assert.equal(record.facts.ariaStatus,'CAPTURED');
  assert.equal(record.scope,'owner');
  assert.deepEqual(r2.objects.get(saved.imageKey).metadata,{sha256,scope:'owner'});
  await assert.rejects(storeCaptureEvidence({CAPTURE_EVIDENCE:r2},png,facts,'test-reservation-1'),
    /CAPTURE_EVIDENCE_FAILURE/);
  assert.equal(r2.objects.size,2,'collision must preserve original objects');
});
test('missing bucket, oversized image and mismatched SHA fail before storage',async()=>{
  const r2=bucket();
  await assert.rejects(storeCaptureEvidence({},png,facts,'test-2'),/CAPTURE_BINDING_MISSING/);
  await assert.rejects(storeCaptureEvidence({CAPTURE_EVIDENCE:r2},Buffer.alloc(3000001),facts,'test-2'),
    /CAPTURE_IMAGE_SIZE/);
  await assert.rejects(storeCaptureEvidence({CAPTURE_EVIDENCE:r2},png,{...facts,sha256:'f'.repeat(64)},'test-2'),
    /CAPTURE_EVIDENCE_FAILURE/);
  assert.equal(r2.objects.size,0);
});
test('R2 readback corruption or receipt write failure prevents a success receipt',async()=>{
  for(const fault of ['corrupt-read','receipt-failure']){
    const r2=bucket(),get=r2.get,put=r2.put;
    if(fault==='corrupt-read') r2.get=async key=>{
      const obj=await get.call(r2,key);
      return obj?{...obj,arrayBuffer:async()=>Buffer.alloc(128,0)}:null;
    };
    if(fault==='receipt-failure') r2.put=async(key,...args)=>{
      if(key.endsWith('.json'))throw Error('storage unavailable');
      return put.call(r2,key,...args);
    };
    await assert.rejects(storeCaptureEvidence({CAPTURE_EVIDENCE:r2},png,facts,fault),
      /CAPTURE_EVIDENCE_FAILURE/);
    assert.equal(r2.objects.size,0,'partial-write objects removed on '+fault);
  }
});

test('pre-existing receipt survives conditional write collision, only newly created image is removed',async()=>{
  const r2=bucket(),existingKey='owner/v1/record-collision.json';
  r2.objects.set(existingKey,{bytes:Buffer.from('PREEXISTING'),metadata:{scope:'owner'}});
  await assert.rejects(storeCaptureEvidence({CAPTURE_EVIDENCE:r2},png,facts,'record-collision'),
    /CAPTURE_EVIDENCE_FAILURE/);
  assert.deepEqual([...r2.objects.keys()],[existingKey]);
  assert.equal(r2.objects.get(existingKey).bytes.toString(),'PREEXISTING');
});
test('failed R2 size confirmation cleans up image written by the current attempt',async()=>{
  const r2=bucket(),put=r2.put;
  r2.put=async function(key,...args){const x=await put.call(this,key,...args);return {...x,size:x.size+1}};
  await assert.rejects(storeCaptureEvidence({CAPTURE_EVIDENCE:r2},png,facts,'bad-size'),
    /CAPTURE_EVIDENCE_FAILURE/);
  assert.equal(r2.objects.size,0);
});
