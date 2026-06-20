import * as fs from 'fs';
import * as path from 'path';

// Rule templates
const MINIMALISM_RULE = `# Minimalism Rules (Ponytail-inspired)

- Prefer existing solutions over writing new code.
- Does the standard library already do this? Use it.
- Does a native platform feature cover it? Use it (e.g. native HTML date picker over custom wrapper).
- Does an already-installed dependency solve it? Use it.
- Can this be one line? Make it one line.
- Write the absolute minimum code that works.
- Avoid abstractions that weren't explicitly requested.
- Avoid introducing new dependencies unless absolutely necessary.
- Deletion over addition. Boring over clever. Fewest files possible.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size.
- Mark intentional simplifications with a \`ponytail:\` comment specifying the limitation and upgrade path.
`;

const PRODUCTION_RULE = `# Production Hardening Rules

- Never break existing functionality. Preserve current behavior as the absolute baseline.
- Work incrementally and perform changes in small, testable batches.
- Never attempt speculative refactors or full-project rewrites unless explicitly requested.
- Always verify internal and external dependencies before modifying import or library setups.
- Prefer the smallest, safest fix over structural overhauls.
- Before committing a change, analyze the regression risk to adjacent modules, routes, or configurations.
`;

const SECURITY_RULE = `# Security Rules

- Never expose secrets, credentials, API keys, private tokens, or credentials in client-side code.
- Ensure all sensitive data processing remains server-side.
- Protect against common web vulnerabilities:
  - Input validation: Validate all inputs at trust boundaries.
  - Sanitization: Sanitize inputs to prevent XSS and SQL/NoSQL Injection.
  - Authentication & Authorization: Enforce secure defaults, session security, secure cookies, and strict CORS.
  - Secure Headers: Ensure CSP (Content Security Policy) and other security headers are in place.
- Do not commit environment file (.env) overrides or secrets to Git.
`;

const PERFORMANCE_RULE = `# Performance Rules

- Avoid unnecessary re-renders in frontend components and excessive client-side calculations.
- Scan for oversized resource bundles, large assets, and unoptimized/large images.
- Avoid duplicated API requests and optimize backend query patterns (e.g., prevent N+1 query problems).
- Ensure critical database queries are indexed and constraints are properly configured.
- Avoid premature optimizations: only optimize when there is a measurable bottleneck.
- Prioritize: Initial Load Speed, Core Web Vitals, Time To Interactive, and API Response Times.
`;

const DESIGN_RULE = `# Design Rules (Open Design inspired)

- Preserve visual design consistency across all UI components and layouts.
- Do not introduce new font-sizes, styling themes, color tokens, or spacings without strong justification.
- Rely on defined CSS variables, HSL-tailored systems, or Tailwind configurations instead of hardcoded hex values.
- Avoid layout fragmentation. Ensure headers, sidebars, cards, and modal components share spacing and rounded corners.
- Do not redesign or overhaul existing user interfaces unless explicitly requested.
`;

const SEO_RULE = `# SEO & AI Readability Rules

- Title Tags & Meta Descriptions: Every page must have unique, descriptive title tags and compelling meta descriptions.
- Heading Structure: Use exactly one <h1> per page and maintain a logical, sequential heading hierarchy (h2, h3, h4).
- Semantic HTML: Use standard semantic HTML5 elements (<header>, <nav>, <main>, <section>, <article>, <footer>) over generic <div> wrappers.
- Structured Data: Implement JSON-LD structured data and Open Graph/Twitter Meta cards where applicable.
- AI & LLM Crawlability: Keep content structured with entity-rich and machine-readable text to aid semantic retrieval engines.
`;

const RELIABILITY_RULE = `# Reliability Rules

- Always handle errors gracefully. Avoid uncaught exceptions or unhandled promise rejections that crash the runtime.
- Implement clear loading and empty states for asynchronous operations.
- Handle timeout conditions and network failures defensive-programming style.
- Set safe default values to prevent "undefined" or "null" pointer crashes on the frontend or backend.
- Ensure proper recovery mechanisms are built around external API and microservice calls.
`;

const DELETION_RULE = `# Safe Deletion Rule

- Never delete any codebase file automatically without explicit user approval.
- Before suggesting deletion, trace all dynamic imports, routes, assets, dynamic names, and compile-time references.
- Classify files suggested for deletion as:
  - **SAFE TO DELETE**: 0 detected references or usage.
  - **UNCERTAIN**: Reference found in configuration templates or potential dynamic resolves.
  - **HIGH RISK**: Direct imports, shared modules, or database/routing boundaries.
- Present a clear rationale showing: File path, Reason for deletion, and Risk Level.
`;

// Combine all rules for agent configurations
const ALL_RULES_TEXT = `# PRODTAIL SYSTEM INSTRUCTIONS

This project enforces **Prodtail** guidelines combining minimalism, security, design quality, and safe deletion.

---

${MINIMALISM_RULE}

---

${PRODUCTION_RULE}

---

${SECURITY_RULE}

---

${PERFORMANCE_RULE}

---

${DESIGN_RULE}

---

${SEO_RULE}

---

${RELIABILITY_RULE}

---

${DELETION_RULE}
`;

// Agent-specific prompts
const CURSOR_MDC = `---
description: Enforce prodtail minimalism, security, design quality, and safe deletion rules on this project
globs: *
alwaysApply: true
---
${ALL_RULES_TEXT}
`;

const CLAUDE_MD = `# Claude Code Rules
${ALL_RULES_TEXT}
`;

const CLINERULES = `# Cline Rules
${ALL_RULES_TEXT}
`;

const ROORULES = `# Roo Cline Rules
${ALL_RULES_TEXT}
`;

const OPENCODE_MD = `# OpenCode Rules
${ALL_RULES_TEXT}
`;

const ANTIGRAVITY_MD = `# Antigravity Rules
${ALL_RULES_TEXT}
`;

const GENERIC_MD = `# Generic Agent Rules
${ALL_RULES_TEXT}
`;

export async function runInit(targetDir: string) {
  console.log(`\x1b[36mInitializing prodtail in: ${targetDir}\x1b[0m`);
  
  const prodtailDir = path.join(targetDir, '.prodtail');
  const rulesDir = path.join(prodtailDir, 'rules');
  const agentsDir = path.join(prodtailDir, 'agents');

  // Create directories
  fs.mkdirSync(prodtailDir, { recursive: true });
  fs.mkdirSync(rulesDir, { recursive: true });
  fs.mkdirSync(agentsDir, { recursive: true });

  // Write rule files
  fs.writeFileSync(path.join(rulesDir, 'minimalism.md'), MINIMALISM_RULE);
  fs.writeFileSync(path.join(rulesDir, 'production.md'), PRODUCTION_RULE);
  fs.writeFileSync(path.join(rulesDir, 'security.md'), SECURITY_RULE);
  fs.writeFileSync(path.join(rulesDir, 'performance.md'), PERFORMANCE_RULE);
  fs.writeFileSync(path.join(rulesDir, 'design.md'), DESIGN_RULE);
  fs.writeFileSync(path.join(rulesDir, 'seo.md'), SEO_RULE);
  fs.writeFileSync(path.join(rulesDir, 'reliability.md'), RELIABILITY_RULE);
  fs.writeFileSync(path.join(rulesDir, 'deletion.md'), DELETION_RULE);

  // Write agent templates
  fs.writeFileSync(path.join(agentsDir, 'cursor.mdc'), CURSOR_MDC);
  fs.writeFileSync(path.join(agentsDir, 'claude.md'), CLAUDE_MD);
  fs.writeFileSync(path.join(agentsDir, 'cline.md'), CLINERULES);
  fs.writeFileSync(path.join(agentsDir, 'roo.md'), ROORULES);
  fs.writeFileSync(path.join(agentsDir, 'opencode.md'), OPENCODE_MD);
  fs.writeFileSync(path.join(agentsDir, 'antigravity.md'), ANTIGRAVITY_MD);
  fs.writeFileSync(path.join(agentsDir, 'generic.md'), GENERIC_MD);

  // Write config.json
  const config = {
    version: "1.0.0",
    project: path.basename(path.resolve(targetDir)),
    rules: {
      minimalism: true,
      production: true,
      security: true,
      performance: true,
      design: true,
      seo: true,
      reliability: true,
      deletion: true
    },
    agents: {
      cursor: true,
      claude: true,
      cline: true,
      roo: true,
      opencode: true,
      antigravity: true
    }
  };
  fs.writeFileSync(path.join(prodtailDir, 'config.json'), JSON.stringify(config, null, 2));
  console.log(`\x1b[32m✔ Created .prodtail/ configuration and rule assets\x1b[0m`);

  // Inject rules into target IDEs/Agents
  injectAgentConfigs(targetDir);
  updateGitignore(targetDir);
}

function injectAgentConfigs(targetDir: string) {
  // 1. Cursor MDC Rules
  const cursorDir = path.join(targetDir, '.cursor', 'rules');
  fs.mkdirSync(cursorDir, { recursive: true });
  fs.writeFileSync(path.join(cursorDir, 'prodtail.mdc'), CURSOR_MDC);
  console.log(`\x1b[32m✔ Injected Cursor rule into .cursor/rules/prodtail.mdc\x1b[0m`);

  // 2. Claude Code (CLAUDE.md)
  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), CLAUDE_MD);
  console.log(`\x1b[32m✔ Injected Claude Code rule into CLAUDE.md\x1b[0m`);

  // 3. OpenCode / Antigravity / Generic fallback (AGENTS.md)
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), ALL_RULES_TEXT);
  console.log(`\x1b[32m✔ Injected general agent rules into AGENTS.md\x1b[0m`);

  // Helper to write to file or directory
  const writeRule = (targetPath: string, fileName: string, content: string, label: string) => {
    try {
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        fs.writeFileSync(path.join(targetPath, fileName), content);
      } else {
        fs.writeFileSync(targetPath, content);
      }
      console.log(`\x1b[32m✔ Injected ${label} rules into ${path.basename(targetPath)}\x1b[0m`);
    } catch (err: any) {
      console.warn(`\x1b[33m⚠ Failed to write ${label} rules at ${targetPath}: ${err.message}\x1b[0m`);
    }
  };

  // 4. Cline rules (.clinerules)
  writeRule(path.join(targetDir, '.clinerules'), 'prodtail.md', CLINERULES, 'Cline');

  // 5. Roo rules (.roorules)
  writeRule(path.join(targetDir, '.roorules'), 'prodtail.md', ROORULES, 'Roo');

  // 6. Windsurf (.windsurf/rules)
  const windsurfDir = path.join(targetDir, '.windsurf', 'rules');
  fs.mkdirSync(windsurfDir, { recursive: true });
  fs.writeFileSync(path.join(windsurfDir, 'prodtail.md'), ALL_RULES_TEXT);
  console.log(`\x1b[32m✔ Injected Windsurf rules into .windsurf/rules/prodtail.md\x1b[0m`);

  // 7. Antigravity (.agents/rules)
  const agentsRulesDir = path.join(targetDir, '.agents', 'rules');
  fs.mkdirSync(agentsRulesDir, { recursive: true });
  fs.writeFileSync(path.join(agentsRulesDir, 'prodtail.md'), ALL_RULES_TEXT);
  console.log(`\x1b[32m✔ Injected Antigravity rules into .agents/rules/prodtail.md\x1b[0m`);

  console.log(`\x1b[36;1mProdtail configuration initialization complete!\x1b[0m`);
}

function updateGitignore(targetDir: string) {
  const gitignorePath = path.join(targetDir, '.gitignore');
  const rulesToIgnore = [
    '# Prodtail CLI rulesets & configs',
    '.prodtail/',
    'CLAUDE.md',
    'AGENTS.md',
    '.clinerules',
    '.roorules',
    '.cursor/rules/prodtail.mdc',
    '.windsurf/rules/prodtail.md',
    '.agents/rules/prodtail.md'
  ];

  try {
    let currentContent = '';
    if (fs.existsSync(gitignorePath)) {
      currentContent = fs.readFileSync(gitignorePath, 'utf8');
    }

    const lines = currentContent.split('\n').map(l => l.trim());
    const toAppend: string[] = [];

    for (const rule of rulesToIgnore) {
      if (rule.startsWith('#')) {
        if (!currentContent.includes(rule)) {
          toAppend.push('');
          toAppend.push(rule);
        }
      } else {
        if (!lines.includes(rule)) {
          toAppend.push(rule);
        }
      }
    }

    if (toAppend.length > 0) {
      const separator = currentContent.endsWith('\n') || currentContent === '' ? '' : '\n';
      fs.appendFileSync(gitignorePath, separator + toAppend.join('\n') + '\n');
      console.log(`\x1b[32m✔ Added injected files to .gitignore to prevent pushing to GitHub\x1b[0m`);
    } else {
      console.log(`\x1b[32m✔ Injected files are already ignored in .gitignore\x1b[0m`);
    }
  } catch (err: any) {
    console.warn(`\x1b[33m⚠ Failed to update .gitignore: ${err.message}\x1b[0m`);
  }
}
