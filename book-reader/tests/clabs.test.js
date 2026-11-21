// Every C lab: the reference solution passes all cases (with heap checking
// and leak detection) and the starter does not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { C_LABS, _djb2 } from '../src/data/cLabs.js';
import { gradeCLab } from '../src/lib/cGrader.js';

for (const lab of C_LABS) {
  test(`C lab ${lab.id}`, () => {
    for (const seed of [1, 77]) {
      const good = gradeCLab(lab, lab.solution, { seed });
      assert.equal(good.compileError, undefined, `solution does not compile:\n${good.compileError}`);
      for (const c of good.cases) {
        assert.ok(c.passed, `solution fails "${c.name}": ${c.message || JSON.stringify(c.tests.filter(t => !t.passed))}\nstdout: ${c.stdout}\nstderr: ${c.stderr}`);
      }
      assert.equal(good.warnings.length, 0, `solution has warnings: ${JSON.stringify(good.warnings)}`);
    }
    const starter = gradeCLab(lab, lab.files, { seed: 5 });
    assert.equal(starter.passed, false, 'starter already passes');
  });
}

test('kv delete lab: documented collisions are real', () => {
  for (const k of ['a', 'i', 'q', 'y']) assert.equal(_djb2(k) % 8n, 6n);
});
