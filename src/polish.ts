import * as fs from 'fs';
import * as path from 'path';

const IGNORE_DIRS = ['node_modules', '.git', '.prodtail', 'dist', 'build', 'bin', 'assets'];
const TEXT_EXTENSIONS = ['.md', '.txt', '.html', '.css', '.js', '.ts', '.tsx', '.jsx', '.json'];

export async function runPolish(targetDir: string) {
  console.log(`\n\x1b[36mSearching for AI-generated styling artifacts (decorative separators, triple dashes)...\x1b[0m`);
  
  let filesPolished = 0;
  let replacementsCount = 0;

  function scan(dir: string) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!IGNORE_DIRS.includes(item)) {
            scan(fullPath);
          }
        } else if (stat.isFile()) {
          const ext = path.extname(fullPath).toLowerCase();
          if (TEXT_EXTENSIONS.includes(ext)) {
            polishFile(fullPath);
          }
        }
      }
    } catch (err) {
      // Ignore directory read errors
    }
  }

  function polishFile(filePath: string) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      let lines = content.split(/\r?\n/);
      let modified = false;
      let localReplacements = 0;

      let inFrontmatter = false;
      let frontmatterCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Track YAML frontmatter delimiters
        if (trimmed === '---') {
          if (i === 0) {
            inFrontmatter = true;
            frontmatterCount++;
            continue;
          } else if (inFrontmatter && frontmatterCount === 1) {
            inFrontmatter = false;
            frontmatterCount++;
            continue;
          }
        }

        if (inFrontmatter) {
          continue;
        }

        // 1. Remove standalone triple dash dividers "---" or "***"
        if (trimmed === '---' || trimmed === '***') {
          lines[i] = '';
          modified = true;
          localReplacements++;
          continue;
        }

        // 2. Replace decorative EM dash / long dash sequences (e.g. " — " or " --- ") within text
        if (lines[i].includes(' — ')) {
          lines[i] = lines[i].replace(/ — /g, ' - ');
          modified = true;
          localReplacements++;
        }
        if (lines[i].includes(' --- ')) {
          lines[i] = lines[i].replace(/ --- /g, ' - ');
          modified = true;
          localReplacements++;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        filesPolished++;
        replacementsCount += localReplacements;
        console.log(`  \x1b[32m✔ Polished:\x1b[0m ${path.relative(targetDir, filePath)} (${localReplacements} artifacts removed)`);
      }
    } catch (err) {
      // Ignore file read/write errors
    }
  }

  scan(targetDir);

  console.log(`\n\x1b[32;1mPolish complete! Polished ${filesPolished} files and removed ${replacementsCount} AI-style artifacts.\x1b[0m\n`);
}
