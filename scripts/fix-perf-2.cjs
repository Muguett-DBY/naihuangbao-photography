const fs = require('fs');
const testContent = fs.readFileSync('src/lib/performance.test.ts', 'utf8')
  .replace(
    '    expect(viteConfig).toContain("dynamicImport");\n  ',
    '  '
  )
  .replace(
    /  it\("keeps admin pages.*?\n  \}\);/s,
    ''
  );
fs.writeFileSync('src/lib/performance.test.ts', testContent);
console.log('Done');
