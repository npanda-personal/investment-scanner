const fs = require('fs');
const path = require('path');
const ts = require('typescript');

// Read the TypeScript file
const tsFilePath = path.join(__dirname, 'src', 'scanners', 'scan-run.service.ts');
const jsFilePath = path.join(__dirname, 'dist', 'scanners', 'scan-run.service.js');

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
  fileName: 'scan-run.service.ts'
});

// Ensure the dist directory exists
const distDir = path.dirname(jsFilePath);
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Write the compiled JavaScript
fs.writeFileSync(jsFilePath, result.outputText);

console.log('✅ Successfully compiled scan-run.service.ts to scan-run.service.js');
console.log(`Output: ${jsFilePath}`);