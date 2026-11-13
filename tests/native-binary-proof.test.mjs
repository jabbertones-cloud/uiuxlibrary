import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {nativeBinaryProof} from '../src/native-binary-proof.mjs';

test('local binary bytes are verified without trusting caller-declared hashes',()=>{
  const dir=mkdtempSync(join(tmpdir(),'uiux-bin-'));
  try {
    const bytes=Buffer.from('signed-debug-library-test-binary');
    writeFileSync(join(dir,'code.dylib'),bytes);
    const result=nativeBinaryProof('code.dylib',dir);
    assert.deepEqual(result,{sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length});
    assert.throws(()=>nativeBinaryProof('/etc/passwd',dir),/Absolute evidence paths/);
    writeFileSync(join(dir,'empty.dylib'),'');
    assert.throws(()=>nativeBinaryProof('empty.dylib',dir),/bounded regular file/);
    symlinkSync('/etc/passwd',join(dir,'escape.dylib'));
    assert.throws(()=>nativeBinaryProof('escape.dylib',dir),/escapes workspace/);
    assert.throws(()=>nativeBinaryProof('missing.dylib',dir));
  }finally{rmSync(dir,{recursive:true,force:true});}
});
