const fs = require('fs');
const p = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const cats = ['dependencies','devDependencies','optionalDependencies','peerDependencies','overrides','resolutions'];
let bad = false;

for (const c of cats) {
  const obj = p[c];
  if (!obj) continue;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v !== 'string') {
      bad = true;
      console.log(`⚠️  ${c}.${k} =>`, v);
    }
  }
}

if (!bad) console.log('✅ 모든 spec이 문자열입니다');
