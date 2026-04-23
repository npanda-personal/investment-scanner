const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Read the TypeScript file
const tsFilePath = path.join(__dirname, 'src', 'index.ts');
const jsFilePath = path.join(__dirname, 'dist', 'index.js');

// Read the TypeScript source
const tsSource = fs.readFileSync(tsFilePath, 'utf8');

// Compile TypeScript to JavaScript
const result = ts.transpileModule(tsSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: true,
    skipLibCheck: true
  },
  fileName: 'index.ts'
});

// Write the compiled JavaScript
fs.writeFileSync(jsFilePath, result.outputText);

console.log('✅ Successfully compiled index.ts to index.js');
console.log(`Output: ${jsFilePath}`);