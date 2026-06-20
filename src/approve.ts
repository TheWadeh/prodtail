import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getFiles } from './scan.ts';

// Prompt helper
export function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Find files referencing the target file
export function findReferences(targetFile: string, allFiles: string[], targetDir: string): string[] {
  const ext = path.extname(targetFile);
  const baseName = path.basename(targetFile, ext);
  const relTargetFile = path.relative(targetDir, targetFile);
  
  if (!baseName) return [];

  const references: string[] = [];

  // Match import statements or file names inside strings
  const patterns = [
    new RegExp(`['"]\\.[^'"]*\\b${baseName}\\b['"]`, 'g'),
    new RegExp(`['"][^'"]*\\b${baseName}\\b['"]`, 'g'),
    new RegExp(`from\\s+['"][^'"]*\\b${baseName}\\b['"]`, 'g')
  ];

  for (const file of allFiles) {
    if (path.resolve(file) === path.resolve(targetFile)) continue;
    
    const fileExt = path.extname(file);
    if (!['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md'].includes(fileExt)) {
      continue;
    }

    try {
      const content = fs.readFileSync(file, 'utf8');
      let matched = false;
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          matched = true;
          break;
        }
      }
      
      if (matched) {
        references.push(path.relative(targetDir, file));
      }
    } catch {
      // Ignored
    }
  }

  return references;
}

export interface DeletionCandidate {
  file: string;
  references: string[];
  risk: 'SAFE' | 'UNCERTAIN' | 'HIGH RISK';
  reason: string;
}

// Analyze risk level of a candidate file
export function analyzeRisk(file: string, references: string[], targetDir: string): DeletionCandidate {
  const relPath = path.relative(targetDir, file);
  const ext = path.extname(file);
  
  if (references.length === 0) {
    // Check if it is a configuration file, migration, entrypoint, or router
    const isConfig = ['tsconfig.json', 'package.json', 'vite.config.ts', 'next.config.js', 'postcss.config.js', 'tailwind.config.js'].includes(path.basename(file)) || file.includes('/config/') || file.includes('/migrations/');
    const isEntrypoint = ['index.ts', 'index.js', 'main.ts', 'main.js', 'server.ts', 'server.js', 'app.ts', 'app.js'].includes(path.basename(file)) || file.includes('/pages/');

    if (isConfig) {
      return {
        file: relPath,
        references,
        risk: 'UNCERTAIN',
        reason: 'Configuration/migration file with 0 references, but critical to build/runtime config.'
      };
    }
    if (isEntrypoint) {
      return {
        file: relPath,
        references,
        risk: 'UNCERTAIN',
        reason: 'Entrypoint or routing file. May be auto-discovered by the framework runner.'
      };
    }
    return {
      file: relPath,
      references,
      risk: 'SAFE',
      reason: 'No references or imports found anywhere in the workspace codebase.'
    };
  }

  // If references are only in test files
  const onlyTests = references.every(ref => ref.includes('.test.') || ref.includes('.spec.') || ref.includes('/tests/') || ref.includes('/__tests__/'));
  if (onlyTests) {
    return {
      file: relPath,
      references,
      risk: 'UNCERTAIN',
      reason: `Only referenced in test files: [${references.join(', ')}].`
    };
  }

  // Active imports found
  return {
    file: relPath,
    references,
    risk: 'HIGH RISK',
    reason: `Actively referenced or imported in source files: [${references.join(', ')}].`
  };
}

export async function runApprove(targetDir: string, specificFile?: string) {
  const allFiles = getFiles(targetDir);
  const candidates: DeletionCandidate[] = [];

  if (specificFile) {
    const fullPath = path.resolve(targetDir, specificFile);
    if (!fs.existsSync(fullPath)) {
      console.error(`\x1b[31mError: File "${specificFile}" does not exist.\x1b[0m`);
      return;
    }
    const refs = findReferences(fullPath, allFiles, targetDir);
    candidates.push(analyzeRisk(fullPath, refs, targetDir));
  } else {
    console.log(`\x1b[36mScanning codebase for potential unused files to delete...\x1b[0m`);
    
    // Propose files with 0 imports (excluding configs, node_modules, etc.)
    const sourceFiles = allFiles.filter(file => {
      const ext = path.extname(file);
      const isSource = ['.ts', '.tsx', '.js', '.jsx', '.css', '.html'].includes(ext);
      const isIgnored = file.includes('/config/') || file.includes('/tests/') || file.includes('/bin/') || file.includes('/dist/') || file.includes('/.cursor/') || file.includes('/.prodtail/');
      return isSource && !isIgnored;
    });

    for (const file of sourceFiles) {
      const refs = findReferences(file, allFiles, targetDir);
      const cand = analyzeRisk(file, refs, targetDir);
      if (cand.risk === 'SAFE' || cand.risk === 'UNCERTAIN') {
        candidates.push(cand);
      }
    }
  }

  if (candidates.length === 0) {
    console.log(`\x1b[32m✔ No deletion candidates found.\x1b[0m`);
    return;
  }

  console.log(`\n\x1b[33;1mPending Deletion Approval List:\x1b[0m\n`);
  
  // Group candidates
  const safeList = candidates.filter(c => c.risk === 'SAFE');
  const uncertainList = candidates.filter(c => c.risk === 'UNCERTAIN');
  const riskList = candidates.filter(c => c.risk === 'HIGH RISK');

  if (safeList.length > 0) {
    console.log(`\x1b[32;1m[SAFE TO DELETE]\x1b[0m`);
    for (const c of safeList) {
      console.log(`  🟢 \x1b[4m${c.file}\x1b[0m - ${c.reason}`);
    }
  }
  
  if (uncertainList.length > 0) {
    console.log(`\n\x1b[33;1m[UNCERTAIN]\x1b[0m`);
    for (const c of uncertainList) {
      console.log(`  🟡 \x1b[4m${c.file}\x1b[0m - ${c.reason}`);
    }
  }

  if (riskList.length > 0) {
    console.log(`\n\x1b[31;1m[HIGH RISK]\x1b[0m`);
    for (const c of riskList) {
      console.log(`  🔴 \x1b[4m${c.file}\x1b[0m - ${c.reason}`);
    }
  }

  console.log(`\n--------------------------------------------------`);
  
  for (const c of candidates) {
    const riskColor = c.risk === 'SAFE' ? '\x1b[32m' : c.risk === 'UNCERTAIN' ? '\x1b[33m' : '\x1b[31;1m';
    const query = `Confirm deletion of file: \x1b[4m${c.file}\x1b[0m (Risk: ${riskColor}${c.risk}\x1b[0m) [y/N]: `;
    const answer = await askQuestion(query);
    
    if (answer.toLowerCase() === 'y') {
      try {
        const fullPath = path.resolve(targetDir, c.file);
        fs.unlinkSync(fullPath);
        console.log(`  \x1b[32m✔ Deleted file: ${c.file}\x1b[0m`);
      } catch (err: any) {
        console.error(`  \x1b[31m✖ Failed to delete file: ${c.file} - ${err.message}\x1b[0m`);
      }
    } else {
      console.log(`  \x1b[30mSkipped file: ${c.file}\x1b[0m`);
    }
  }

  console.log(`\n\x1b[32;1mApproval workflow complete.\x1b[0m\n`);
}
