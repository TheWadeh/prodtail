import * as fs from 'fs';
import * as path from 'path';

// Interfaces for findings
export interface Finding {
  category: 'Security' | 'Dependency' | 'Code Quality' | 'Performance' | 'SEO & AI' | 'Design';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  file: string;
  line?: number;
  message: string;
  recommendation: string;
}

export interface ScanResult {
  findings: Finding[];
  readinessScore: number;
  filesScanned: number;
}

// Recursively find all files in the project
export function getFiles(dir: string, fileList: string[] = []): string[] {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch {
        continue; // skip broken symlinks or unreadable files
      }

      if (stat.isDirectory()) {
        // Ignore common directories
        if (
          file === 'node_modules' ||
          file === '.git' ||
          file === '.prodtail' ||
          file === '.next' ||
          file === 'dist' ||
          file === 'build' ||
          file === 'out' ||
          file === '.yarn' ||
          file === 'coverage' ||
          file === '.tmp'
        ) {
          continue;
        }
        getFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    }
  } catch (err) {
    // Silently ignore or report
  }
  return fileList;
}

// Helper to check if a file is a frontend source file
function isFrontendFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  const isSrc = filePath.includes('/src/') || filePath.includes('/apps/web/') || filePath.includes('/components/') || filePath.includes('/pages/');
  return isSrc && ['.tsx', '.jsx', '.html', '.ts', '.js'].includes(ext);
}

// Main scan implementation
export function performScan(targetDir: string): ScanResult {
  const allFiles = getFiles(targetDir);
  const findings: Finding[] = [];

  // 1. Scan for Committed .env Files
  for (const file of allFiles) {
    const basename = path.basename(file);
    if (
      (basename === '.env' || basename === '.env.local' || basename === '.env.production' || basename === '.env.development') &&
      !basename.includes('.example')
    ) {
      const relPath = path.relative(targetDir, file);
      findings.push({
        category: 'Security',
        severity: 'CRITICAL',
        file: relPath,
        message: `Committed environment file found: "${basename}"`,
        recommendation: 'Remove from git tracking and add to .gitignore. Use .env.example instead.'
      });
    }
  }

  // Read package.json for Dependency Scan
  let packageJson: any = null;
  const packageJsonPath = path.join(targetDir, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    try {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch {
      findings.push({
        category: 'Dependency',
        severity: 'WARNING',
        file: 'package.json',
        message: 'Invalid package.json file (could not parse as JSON).',
        recommendation: 'Verify package.json format.'
      });
    }
  }

  const importsMap = new Set<string>();

  // Perform content-level checks
  for (const file of allFiles) {
    const ext = path.extname(file);
    const relPath = path.relative(targetDir, file);

    // Only scan readable text files for content analysis
    if (!['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md'].includes(ext)) {
      continue;
    }

    let content = '';
    try {
      content = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');

    // Perform line-by-line checks
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // A. Security: Hardcoded Secrets / Keys Heuristics
      const genericKeyRegex = /(?:api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*['"`]([a-zA-Z0-9_\-+=/]{16,})['"`]/gi;
      let match;
      while ((match = genericKeyRegex.exec(line)) !== null) {
        const potentialSecret = match[1];
        // Basic entropy heuristic (check if not a standard UI word or path)
        if (potentialSecret.length > 16 && !potentialSecret.includes('/') && !potentialSecret.startsWith('http')) {
          findings.push({
            category: 'Security',
            severity: 'CRITICAL',
            file: relPath,
            line: lineNum,
            message: `Potential hardcoded secret or API key detected.`,
            recommendation: 'Move the sensitive token/secret to environment variables.'
          });
        }
      }

      // Security: Frontend environment leakage
      if (isFrontendFile(file)) {
        const envLeakRegex = /process\.env\.([A-Z0-9_]+)/g;
        let envMatch;
        while ((envMatch = envLeakRegex.exec(line)) !== null) {
          const varName = envMatch[1];
          // Common frontend safe prefixes
          const isSafe = varName.startsWith('NEXT_PUBLIC_') || varName.startsWith('VITE_') || varName.startsWith('PUBLIC_') || ['NODE_ENV'].includes(varName);
          if (!isSafe) {
            findings.push({
              category: 'Security',
              severity: 'WARNING',
              file: relPath,
              line: lineNum,
              message: `Possible client-side environment variable leak: process.env.${varName}`,
              recommendation: 'Ensure frontend variables are prefixed correctly (e.g., NEXT_PUBLIC_ or VITE_) or handled server-side.'
            });
          }
        }
      }

      // B. Performance: Synchronous FS calls
      if (line.includes('fs.readFileSync') || line.includes('fs.writeFileSync') || line.includes('fs.existsSync')) {
        // Only warn in source files (exclude scripts and tests)
        if (relPath.includes('/src/') && !relPath.includes('.test.') && !relPath.includes('.spec.')) {
          findings.push({
            category: 'Performance',
            severity: 'WARNING',
            file: relPath,
            line: lineNum,
            message: `Synchronous file system method call detected: "${line.trim()}"`,
            recommendation: 'Use asynchronous fs methods (e.g. fs.promises) to avoid blocking the event loop.'
          });
        }
      }

      // Performance: Nested loops heuristic (O(N^2) operations)
      const nestedLoopsRegex = /\.(?:map|forEach|filter|find)\(.*?(?:=>|function).*?\.(?:find|filter|map|forEach|some|every)\(/g;
      if (nestedLoopsRegex.test(line)) {
        findings.push({
          category: 'Performance',
          severity: 'WARNING',
          file: relPath,
          line: lineNum,
          message: `Nested iteration detected: potential O(N^2) complexity bottleneck.`,
          recommendation: 'Flatten the logic, or map array items to a key-value hash lookup object first.'
        });
      }

      // C. Design: Inline styles
      if (isFrontendFile(file) && (line.includes('style={{') || line.includes('style="'))) {
        // Exclude dynamic styles if they are justified, warn about layout inline styling
        if (!line.includes('display:') && !line.includes('opacity:')) {
          findings.push({
            category: 'Design',
            severity: 'INFO',
            file: relPath,
            line: lineNum,
            message: `Inline styling detected: "${line.trim()}"`,
            recommendation: 'Extract inline styles to CSS modules or global stylesheet variables.'
          });
        }
      }

      // Design: Hardcoded colors
      const hexColorRegex = /#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\b/g;
      if (isFrontendFile(file)) {
        const lineWithoutComments = line.split('//')[0].split('/*')[0];
        if (hexColorRegex.test(lineWithoutComments)) {
          if (!lineWithoutComments.includes('*')) {
            findings.push({
              category: 'Design',
              severity: 'WARNING',
              file: relPath,
              line: lineNum,
              message: `Hardcoded hex color detected in component file: "${line.trim()}"`,
              recommendation: 'Use standard theme system colors or CSS custom variables instead.'
            });
          }
        }
      }
    }

    // Capture ESM / CJS import packages for Dependency Scan
    const importRegex = /(?:import\s+.*\s+from\s+|require\()['"]([^'"]+)['"]/g;
    let importMatch;
    while ((importMatch = importRegex.exec(content)) !== null) {
      const depName = importMatch[1];
      // Only record non-relative packages
      if (depName && !depName.startsWith('.') && !depName.startsWith('/') && !depName.startsWith('@/')) {
        // Handle scoped packages like @babel/core
        const parts = depName.split('/');
        const pkgName = depName.startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
        importsMap.add(pkgName);
      }
    }

    // D. Performance: Large resource files (> 150KB)
    try {
      const stats = fs.statSync(file);
      if (stats.size > 150 * 1024 && (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx')) {
        findings.push({
          category: 'Performance',
          severity: 'WARNING',
          file: relPath,
          message: `Source file size is large (${(stats.size / 1024).toFixed(1)} KB).`,
          recommendation: 'Split code into smaller modules or load components dynamically.'
        });
      }
    } catch {
      // Ignored
    }

    // E. SEO + AI: Page/layout metadata checks
    const filename = path.basename(file);
    if (ext === '.html' || (isFrontendFile(file) && (filename.startsWith('page.') || filename.startsWith('layout.') || filename === 'index.tsx'))) {
      const hasTitle = content.includes('<title>') || content.includes('title:') || content.includes('metadata =');
      const hasDesc = content.includes('description') || content.includes('metadata =');
      if (!hasTitle && !hasDesc) {
        findings.push({
          category: 'SEO & AI',
          severity: 'WARNING',
          file: relPath,
          message: `Missing SEO title and description metadata on page/layout file.`,
          recommendation: 'Add standard page titles, meta descriptions, or layout metadata structures.'
        });
      }

      // Check headings structure hierarchy
      const h1Count = (content.match(/<h1\b/g) || []).length;
      if (h1Count > 1) {
        findings.push({
          category: 'SEO & AI',
          severity: 'WARNING',
          file: relPath,
          message: `Multiple <h1> tags detected on the same page.`,
          recommendation: 'Use exactly one <h1> per page. Convert secondary headers to <h2> or <h3>.'
        });
      }
    }
  }

  // E. Dependency Scan: check package.json vs importsMap
  if (packageJson) {
    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    };

    // Flag deprecated/abandoned packages
    const deprecatedPackages = ['moment', 'request', 'node-sass', 'uuidv3', 'request-promise', 'express-graphql'];
    for (const dep of Object.keys(allDeps)) {
      if (deprecatedPackages.includes(dep)) {
        findings.push({
          category: 'Dependency',
          severity: 'WARNING',
          file: 'package.json',
          message: `Deprecated/abandoned package dependency declared: "${dep}"`,
          recommendation: `Migrate away from "${dep}" to modern native alternatives (e.g. native fetch for request, date-fns/Temporal for moment).`
        });
      }
    }

    // Flag unused packages (declared in dependencies, but never imported)
    // Ignore typings, tooling configs, and scripts
    const ignoreList = [
      'typescript', '@types/', 'eslint', 'prettier', 'jest', 'vitest', 
      'nodemon', 'ts-node', 'tsx', 'webpack', 'vite', 'next', 'react', 
      'react-dom', 'postcss', 'tailwindcss', 'autoprefixer'
    ];
    
    if (packageJson.dependencies) {
      for (const dep of Object.keys(packageJson.dependencies)) {
        if (ignoreList.some(item => dep.startsWith(item))) continue;
        if (!importsMap.has(dep)) {
          findings.push({
            category: 'Dependency',
            severity: 'INFO',
            file: 'package.json',
            message: `Possibly unused package dependency declared: "${dep}"`,
            recommendation: 'Remove from package.json if it is not used at runtime, or double-check dynamic/external runtime loads.'
          });
        }
      }
    }
  }

  // F. Code Quality: Duplicate files
  const fileSizeMap = new Map<number, string[]>();
  for (const file of allFiles) {
    const ext = path.extname(file);
    if (!['.ts', '.tsx', '.js', '.jsx', '.css', '.html'].includes(ext)) {
      continue;
    }
    try {
      const stats = fs.statSync(file);
      if (stats.size > 100) { // Only inspect non-trivial files
        const list = fileSizeMap.get(stats.size) || [];
        list.push(file);
        fileSizeMap.set(stats.size, list);
      }
    } catch {
      // Ignored
    }
  }

  for (const [size, files] of fileSizeMap.entries()) {
    if (files.length > 1) {
      // Compare file contents
      const contentMap = new Map<string, string>();
      for (const f of files) {
        try {
          const content = fs.readFileSync(f, 'utf8');
          if (contentMap.has(content)) {
            const originalFile = contentMap.get(content)!;
            findings.push({
              category: 'Code Quality',
              severity: 'WARNING',
              file: path.relative(targetDir, f),
              message: `Duplicate file detected. Content matches "${path.relative(targetDir, originalFile)}" perfectly (${size} bytes).`,
              recommendation: 'Deduplicate file. Re-use the existing file or extract common utilities.'
            });
          } else {
            contentMap.set(content, f);
          }
        } catch {
          // Ignored
        }
      }
    }
  }

  // Calculate score
  let score = 100;
  for (const finding of findings) {
    if (finding.severity === 'CRITICAL') {
      score -= 15;
    } else if (finding.severity === 'WARNING') {
      score -= 5;
    } else if (finding.severity === 'INFO') {
      score -= 1;
    }
  }
  score = Math.max(0, Math.min(100, score));

  return {
    findings,
    readinessScore: score,
    filesScanned: allFiles.length
  };
}

// Log a nice report for scan
export function logScanReport(result: ScanResult, verbose = false) {
  console.log(`\n\x1b[36;1mScan Complete. Scanned ${result.filesScanned} files.\x1b[0m`);
  
  if (result.findings.length === 0) {
    console.log(`\x1b[32;1m✔ No issues found! Codebase matches production standards perfectly.\x1b[0m\n`);
    return;
  }

  console.log(`\x1b[33;1mFound ${result.findings.length} findings:\x1b[0m\n`);

  const categoryGroups = groupBy(result.findings, 'category');

  for (const category of Object.keys(categoryGroups)) {
    console.log(`\x1b[35;1m[${category}]\x1b[0m`);
    for (const f of categoryGroups[category]) {
      const sevColor = f.severity === 'CRITICAL' ? '\x1b[31;1m' : f.severity === 'WARNING' ? '\x1b[33;1m' : '\x1b[36m';
      const lineStr = f.line ? `:${f.line}` : '';
      console.log(`  ${sevColor}${f.severity}\x1b[0m - \x1b[4m${f.file}${lineStr}\x1b[0m`);
      console.log(`    Message: ${f.message}`);
      if (verbose) {
        console.log(`    Recommendation: ${f.recommendation}`);
      }
    }
    console.log();
  }
}

// Helper to group by key
function groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
  return array.reduce((result: any, currentValue: T) => {
    const val = currentValue[key] as any;
    (result[val] = result[val] || []).push(currentValue);
    return result;
  }, {});
}
