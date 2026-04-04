#!/usr/bin/env node

const { execSync } = require('child_process');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgBlue: '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
};

function header(text) {
  console.log(`\n${c.bgBlue}${c.white}${c.bold} ${text} ${c.reset}\n`);
}

function subheader(text) {
  console.log(`${c.cyan}━━━ ${text} ━━━${c.reset}`);
}

function code(label, content) {
  console.log(`\n${c.yellow}📝 ${label}:${c.reset}`);
  console.log(`${c.gray}┌${'─'.repeat(68)}┐${c.reset}`);
  content.split('\n').forEach(line => {
    console.log(`${c.gray}│${c.reset} ${line.padEnd(66)} ${c.gray}│${c.reset}`);
  });
  console.log(`${c.gray}└${'─'.repeat(68)}┘${c.reset}`);
}

function output(label, content) {
  console.log(`\n${c.green}📤 ${label}:${c.reset}`);
  console.log(`${c.green}┌${'─'.repeat(68)}┐${c.reset}`);
  content.split('\n').forEach(line => {
    console.log(`${c.green}│${c.reset} ${line.padEnd(66)} ${c.green}│${c.reset}`);
  });
  console.log(`${c.green}└${'─'.repeat(68)}┘${c.reset}`);
}

function explain(text) {
  console.log(`${c.magenta}💡 ${text}${c.reset}`);
}

function arrow() {
  console.log(`${c.yellow}          ⬇️${c.reset}`);
}

function runGit(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
  } catch (e) {
    return '';
  }
}

console.log(`
${c.cyan}╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   🔬 SMART COMMIT - LIVE CODE WALKTHROUGH                                ║
║   প্রতিটা Function কিভাবে কাজ করে দেখো Real Data দিয়ে                     ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝${c.reset}
`);

header('📦 SECTION 1: CONFIG Object - Script এর Brain');

explain('এটা হলো script এর configuration। এখানে সব rules define করা আছে।');

code('CONFIG.types - Commit Types', `
const CONFIG = {
  types: {
    feat:     { priority: 1, emoji: '✨', description: 'New feature' },
    fix:      { priority: 2, emoji: '🐛', description: 'Bug fix' },
    refactor: { priority: 3, emoji: '♻️', description: 'Refactoring' },
    perf:     { priority: 4, emoji: '⚡', description: 'Performance' },
    docs:     { priority: 5, emoji: '📚', description: 'Documentation' },
    test:     { priority: 7, emoji: '✅', description: 'Tests' },
    chore:    { priority: 10, emoji: '🔨', description: 'Maintenance' },
  }
}`);

explain('priority কম মানে বেশি গুরুত্বপূর্ণ। feat > fix > refactor...');

code('CONFIG.patterns - Keyword Detection Rules', `
patterns: {
  feat: [
    /export\\s+(class|function|const)/,  // নতুন export দেখলে = feat
    /implement/i,                         // "implement" শব্দ দেখলে = feat
  ],
  fix: [
    /fix(ed|es|ing)?/i,   // fix, fixed, fixing, fixes = bug fix
    /bug/i,               // "bug" শব্দ = bug fix
    /resolve/i,           // "resolve" = bug fix
  ],
  perf: [
    /optimi[zs]/i,        // optimize/optimise = performance
    /cach(e|ing)/i,       // cache/caching = performance
  ]
}`);

explain('এই regex patterns দিয়ে code এর diff scan করে বুঝি কী ধরনের change');

code('CONFIG.scopes - Path → Scope Mapping', `
scopes: {
  'src/app/modules/': (path) => path.split('/')[3],
  //  src/app/modules/auth/auth.ts → 'auth'
  //  src/app/modules/user/user.ts → 'user'

  'src/app/builder/': () => 'builder',
  //  src/app/builder/QueryBuilder.ts → 'builder'

  'src/app/logging/': () => 'logging',
  'scripts/': () => 'scripts',
  'tests/': () => 'test',
}`);

explain('File path দেখে scope বের করি। modules/ এর পরের folder টাই module name।');

header('🔧 SECTION 2: Git Operations - Data Collection');

subheader('Function: runGit(command)');

code('Code', `
function runGit(command) {
  try {
    // execSync দিয়ে git command run করি
    return execSync(\`git \${command}\`, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return '';  // error হলে empty string
  }
}`);

explain('এটা wrapper function। যেকোনো git command run করতে পারে।');

console.log(`\n${c.bgGreen}${c.white} 🔴 LIVE DEMO ${c.reset}`);

const gitStatus = runGit('status --short');
output('runGit("status --short") এর Output', gitStatus.split('\n').slice(0, 8).join('\n') + '\n...');

arrow();

subheader('Function: getChangedFiles()');

code('Code', `
function getChangedFiles(stagedOnly = false) {
  // staged files চাইলে --cached, না হলে HEAD এর সাথে compare
  const diffCommand = stagedOnly
    ? 'diff --cached --name-status'
    : 'diff --name-status HEAD';

  const output = runGit(diffCommand);
  if (!output) return [];

  // প্রতিটা line parse করো
  return output.split('\\n').map(line => {
    const [status, ...pathParts] = line.split('\\t');
    return {
      status: status[0],      // M, A, D, R
      path: pathParts.join('\\t'),
      isNew: status === 'A',
      isDeleted: status === 'D',
      isModified: status === 'M',
      isRenamed: status.startsWith('R'),
    };
  });
}`);

explain('git diff --name-status দেয়: "M\\tfile.ts" format এ output');
explain('আমরা split করে object বানাই যাতে isNew, isModified check করা সহজ হয়');

console.log(`\n${c.bgGreen}${c.white} 🔴 LIVE DEMO ${c.reset}`);

const rawDiff = runGit('diff --name-status HEAD');
output('Raw Git Output (git diff --name-status HEAD)', rawDiff.split('\n').slice(0, 5).join('\n') + '\n...');

arrow();

const files = rawDiff.split('\n').slice(0, 3).map(line => {
  const [status, ...pathParts] = line.split('\t');
  return {
    status: status ? status[0] : '?',
    path: pathParts.join('\t') || 'unknown',
    isNew: status === 'A',
    isModified: status === 'M',
    isDeleted: status === 'D',
  };
});

output('Parsed Objects', files.map(f => JSON.stringify(f, null, 2)).join('\n\n'));

header('🎯 SECTION 3: detectScope() - Path থেকে Scope বের করা');

code('Code', `
function detectScope(filePath) {
  const normalizedPath = filePath.replace(/\\\\/g, '/');
  //  Windows: src\\\\app\\\\modules → src/app/modules

  for (const [pattern, extractor] of Object.entries(CONFIG.scopes)) {
    if (normalizedPath.includes(pattern)) {
      return extractor(normalizedPath);
    }
  }

  return null;
}`);

explain('Path এ "modules/" থাকলে module name extract করি');
explain('Path এ "builder/" থাকলে scope = "builder"');

console.log(`\n${c.bgGreen}${c.white} 🔴 LIVE DEMO ${c.reset}`);

const testPaths = [
  'src/app/modules/auth/auth.service.ts',
  'src/app/modules/user/user.controller.ts',
  'src/app/builder/QueryBuilder.ts',
  'src/app/logging/opentelemetry.ts',
  'scripts/smart-commit.js',
  'doc/guide.md',
];

console.log(`\n${c.yellow}Path → Scope Mapping:${c.reset}`);
console.log(`${'─'.repeat(70)}`);

const CONFIG_scopes = {
  'src/app/modules/': (path) => path.split('/')[3],
  'src/app/builder/': () => 'builder',
  'src/app/logging/': () => 'logging',
  'scripts/': () => 'scripts',
  'doc/': () => 'docs',
};

testPaths.forEach(path => {
  let scope = null;
  for (const [pattern, extractor] of Object.entries(CONFIG_scopes)) {
    if (path.includes(pattern)) {
      scope = extractor(path);
      break;
    }
  }
  console.log(`  ${c.gray}${path}${c.reset}`);
  console.log(`  ${c.green}→ scope: "${scope}"${c.reset}\n`);
});

header('🔍 SECTION 4: analyzeDiff() - Code Content Analysis');

code('Code (Simplified)', `
function analyzeDiff(diff) {
  const result = {
    linesAdded: 0,
    linesRemoved: 0,
    types: new Map(),       // { feat: 2, fix: 1, ... }
  };

  const lines = diff.split('\\n');
  const addedLines = [];

  // Step 1: Count lines & collect added content
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.linesAdded++;
      addedLines.push(line.slice(1));  // '+' বাদ দিয়ে রাখো
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.linesRemoved++;
    }
  }

  // Step 2: Added content এ pattern খোঁজো
  const addedContent = addedLines.join('\\n');

  // নতুন export দেখলে = feat
  if (/export\\s+(class|function)/.test(addedContent)) {
    result.types.set('feat', (result.types.get('feat') || 0) + 1);
  }

  // "fix" keyword দেখলে = fix
  if (/fix/i.test(addedContent)) {
    result.types.set('fix', (result.types.get('fix') || 0) + 1);
  }

  return result;
}`);

explain('+ দিয়ে শুরু = নতুন line, - দিয়ে শুরু = deleted line');
explain('নতুন lines এ keyword খুঁজি → type detect করি');

console.log(`\n${c.bgGreen}${c.white} 🔴 LIVE DEMO ${c.reset}`);

const sampleDiff = `diff --git a/payment.ts b/payment.ts
--- a/payment.ts
+++ b/payment.ts
@@ -10,5 +10,12 @@
 export class PaymentService {
-  return payment.amount;
+  // Fix: handle null case
+  if (!payment) {
+    throw new ApiError(404, 'Not found');
+  }
+  return payment?.amount ?? 0;
 }`;

output('Sample Diff', sampleDiff);

arrow();

const diffLines = sampleDiff.split('\n');
let linesAdded = 0, linesRemoved = 0;
const addedContent = [];

diffLines.forEach(line => {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    linesAdded++;
    addedContent.push(line.slice(1));
  } else if (line.startsWith('-') && !line.startsWith('---')) {
    linesRemoved++;
  }
});

output('Analysis Result', `
linesAdded: ${linesAdded}
linesRemoved: ${linesRemoved}

Added Content:
${addedContent.map(l => '  ' + l).join('\n')}

Pattern Matching:
  /fix/i.test(content) = ${/fix/i.test(addedContent.join('\n'))} → ${/fix/i.test(addedContent.join('\n')) ? 'TYPE: fix 🐛' : ''}
  /export.*class/.test(content) = ${/export.*class/.test(addedContent.join('\n'))}
  /optimi[zs]/i.test(content) = ${/optimi[zs]/i.test(addedContent.join('\n'))}

Detected Type: fix 🐛 (কারণ "Fix:" keyword আছে)
`);

header('📊 SECTION 5: Score Calculation - Winner নির্বাচন');

code('Code', `
function generateCommitSuggestions(analysis) {
  // Step 1: সবচেয়ে বেশি score যার type সেটা primary
  let primaryType = 'chore';
  let highestScore = 0;

  for (const [type, score] of analysis.detectedTypes) {
    if (score > highestScore) {
      highestScore = score;
      primaryType = type;
    }
  }

  // Step 2: Special cases check
  // শুধু নতুন files → feat
  if (analysis.newFiles > 0 && analysis.modifiedFiles === 0) {
    primaryType = 'feat';
  }

  // শুধু .md files → docs
  if (analysis.categories.get('docs') === analysis.totalFiles) {
    primaryType = 'docs';
  }

  // শুধু config files → chore
  if (analysis.categories.get('config') === analysis.totalFiles) {
    primaryType = 'chore';
  }

  return primaryType;
}`);

console.log(`\n${c.bgGreen}${c.white} 🔴 LIVE DEMO ${c.reset}`);

const simulatedScores = new Map([
  ['feat', 5],
  ['fix', 3],
  ['refactor', 1],
]);

output('Simulated Scores', `
detectedTypes: {
  feat: 5      ← 5 টা feat pattern match করেছে
  fix: 3       ← 3 টা fix pattern match করেছে
  refactor: 1  ← 1 টা refactor pattern match করেছে
}

Total Score: 5 + 3 + 1 = 9

Winner Selection:
  feat: 5 (highest) ✅ WINNER
  fix: 3
  refactor: 1

Primary Type: feat ✨
`);

arrow();

output('Confidence Calculation', `
Formula: confidence = (typeScore / totalScore) + 0.3

feat confidence:
  = (5 / 9) + 0.3
  = 0.555 + 0.3
  = 0.855
  = 85% █████████░

fix confidence:
  = (3 / 9) + 0.3
  = 0.333 + 0.3
  = 0.633
  = 63% ███████░░░

refactor confidence:
  = (1 / 9) + 0.3
  = 0.111 + 0.3
  = 0.411
  = 41% █████░░░░░
`);

header('✏️ SECTION 6: generateSubject() - Smart Message তৈরি');

code('Code (Priority Order)', `
function generateSubject(analysis, type) {
  const fileGroups = groupFilesByPurpose(analysis.files);
  const action = type === 'feat' ? 'add' : type === 'fix' ? 'fix' : 'update';

  // Priority 1: Builder files আছে?
  if (fileGroups.builders.length > 0) {
    const names = extractBuilderNames(fileGroups.builders);
    if (names.length === 1) return \`\${action} \${names[0]}Builder functionality\`;
    return \`\${action} multiple builders (\${names.join(', ')})\`;
  }

  // Priority 2: Module files আছে?
  if (fileGroups.modules.length > 0) {
    const modules = extractModuleNames(fileGroups.modules);
    if (modules.length === 1) return \`\${action} \${modules[0]} module\`;
    return \`\${action} \${modules.join(', ')} modules\`;
  }

  // Priority 3: Logging files?
  if (fileGroups.logging.length > 0) {
    return \`\${action} logging and observability\`;
  }

  // Priority 4: Only tests?
  if (fileGroups.tests.length === analysis.files.length) {
    return \`\${action} tests\`;
  }

  // Priority 5: Only docs?
  if (fileGroups.docs.length === analysis.files.length) {
    return \`\${action} documentation\`;
  }

  // Fallback
  return \`\${action} codebase\`;
}`);

console.log(`\n${c.bgGreen}${c.white} 🔴 LIVE DEMO ${c.reset}`);

const scenarios = [
  {
    name: 'Scenario 1: Builder files',
    files: ['src/app/builder/QueryBuilder.ts', 'src/app/builder/PDFBuilder.ts'],
    expected: 'add multiple builders (Query, PDF)',
  },
  {
    name: 'Scenario 2: Single module',
    files: ['src/app/modules/auth/auth.service.ts', 'src/app/modules/auth/auth.controller.ts'],
    expected: 'add auth module',
  },
  {
    name: 'Scenario 3: Multiple modules',
    files: ['src/app/modules/auth/auth.ts', 'src/app/modules/user/user.ts'],
    expected: 'add auth, user modules',
  },
  {
    name: 'Scenario 4: Only docs',
    files: ['README.md', 'doc/guide.md'],
    expected: 'update documentation',
  },
];

scenarios.forEach(s => {
  console.log(`\n${c.yellow}${s.name}:${c.reset}`);
  console.log(`  Files: ${s.files.join(', ')}`);
  console.log(`  ${c.green}→ Subject: "${s.expected}"${c.reset}`);
});

header('🏗️ SECTION 7: Final Message Assembly');

code('Code', `
// Components:
const type = 'feat';
const scope = 'builder';
const subject = 'add multiple builders (Query, PDF)';

// Assembly:
const scopePart = scope ? \`(\${scope})\` : '';
const fullMessage = \`\${type}\${scopePart}: \${subject}\`;

// Result:
// "feat(builder): add multiple builders (Query, PDF)"
`);

console.log(`\n${c.bgGreen}${c.white} 🔴 LIVE ASSEMBLY ${c.reset}`);

const type = 'feat';
const scope = 'builder';
const subject = 'add multiple builders (Query, PDF)';

console.log(`
${c.yellow}Input Components:${c.reset}
  type    = "${type}"
  scope   = "${scope}"
  subject = "${subject}"

${c.yellow}Assembly Process:${c.reset}
  Step 1: scopePart = scope ? \`(\${scope})\` : ''
          scopePart = "(builder)"

  Step 2: fullMessage = \`\${type}\${scopePart}: \${subject}\`
          fullMessage = "feat" + "(builder)" + ": " + "add multiple..."

${c.green}Final Output:${c.reset}
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   ${c.bold}feat(builder): add multiple builders (Query, PDF)${c.reset}               │
│   ${c.gray}^^^^${c.reset}  ${c.cyan}^^^^^^^${c.reset}   ${c.yellow}^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^${c.reset}       │
│   ${c.gray}type${c.reset}  ${c.cyan}scope${c.reset}     ${c.yellow}subject${c.reset}                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
`);

header('🖥️ SECTION 8: CLI Output - User কে দেখানো');

code('printSuggestions() Code', `
function printSuggestions(suggestions) {
  console.log('💡 Suggested Commit Messages:');
  console.log('─'.repeat(50));

  suggestions.forEach((suggestion, index) => {
    // Confidence bar তৈরি
    const confidence = Math.round(suggestion.confidence * 100);
    const filled = Math.round(confidence / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

    console.log(\`\\n  \${index + 1}. \${suggestion.emoji} \${suggestion.fullMessage}\`);
    console.log(\`     Confidence: \${bar} \${confidence}%\`);
  });
}
`);

console.log(`\n${c.bgGreen}${c.white} 🔴 FINAL OUTPUT ${c.reset}`);

console.log(`
${c.cyan}╔════════════════════════════════════════════════════════════════╗
║          🧠 Smart Commit Message Generator                      ║
╚════════════════════════════════════════════════════════════════╝${c.reset}

${c.yellow}📊 Change Analysis:${c.reset}
──────────────────────────────────────────────────
   Total files:    8
   New:            2
   Modified:       6
   Deleted:        0
   Lines:          +450 / -120
   Scopes:         builder, auth

${c.yellow}💡 Suggested Commit Messages:${c.reset}
──────────────────────────────────────────────────

  1. ✨ feat(builder): add multiple builders (Query, PDF)
     Confidence: █████████░ 85%
     Type: New feature

  2. 🐛 fix(builder): fix multiple builders (Query, PDF)
     Confidence: ███████░░░ 63%
     Type: Bug fix

  3. ♻️ refactor(builder): refactor multiple builders (Query, PDF)
     Confidence: █████░░░░░ 41%
     Type: Code refactoring

${c.yellow}📋 Copy-paste commands:${c.reset}
──────────────────────────────────────────────────

1. git add -A && git commit -m "feat(builder): add multiple builders (Query, PDF)"

2. git add -A && git commit -m "fix(builder): fix multiple builders (Query, PDF)"
`);

header('🗺️ COMPLETE DATA FLOW');

console.log(`
${c.cyan}
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SMART COMMIT DATA FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

 User runs: npm run commit
            │
            ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ STEP 1: getChangedFiles()                                                │
 │ ────────────────────────                                                 │
 │ Input:  git diff --name-status HEAD                                      │
 │ Output: [{ status: 'M', path: 'QueryBuilder.ts', isModified: true }, ...]│
 └────────────────────────────────────────┬─────────────────────────────────┘
                                          │
                                          ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ STEP 2: analyzeChanges() - প্রতিটা file এর জন্য:                          │
 │ ────────────────────────────────────────────────                          │
 │                                                                          │
 │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
 │   │ detectScope()   │    │ getFileDiff()   │    │ analyzeDiff()   │      │
 │   │                 │    │                 │    │                 │      │
 │   │ path → scope    │    │ file → diff     │    │ diff → types    │      │
 │   │ "modules/auth/" │    │ +new line       │    │ { feat: 2,      │      │
 │   │ → "auth"        │    │ -old line       │    │   fix: 1 }      │      │
 │   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘      │
 │            │                      │                      │               │
 │            └──────────────────────┴──────────────────────┘               │
 │                                   │                                      │
 │                                   ▼                                      │
 │   Output: analysis = {                                                   │
 │     scopes: Set(['auth', 'builder']),                                    │
 │     detectedTypes: Map({ feat: 5, fix: 2 }),                             │
 │     linesAdded: 450,                                                     │
 │     linesRemoved: 120                                                    │
 │   }                                                                      │
 └────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ STEP 3: generateCommitSuggestions()                                      │
 │ ────────────────────────────────────                                     │
 │                                                                          │
 │   ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐      │
 │   │ Find Winner     │    │ Determine Scope │    │ Generate Subject│      │
 │   │                 │    │                 │    │                 │      │
 │   │ feat: 5 ✅      │    │ 1 scope → use   │    │ builders found  │      │
 │   │ fix: 2          │    │ 2-3 → join      │    │ → "add multiple │      │
 │   │ refactor: 1     │    │ >3 → skip       │    │    builders..." │      │
 │   └────────┬────────┘    └────────┬────────┘    └────────┬────────┘      │
 │            │                      │                      │               │
 │            └──────────────────────┴──────────────────────┘               │
 │                                   │                                      │
 │                                   ▼                                      │
 │   Assemble: type + scope + subject                                       │
 │   "feat" + "(builder)" + ": " + "add multiple builders..."               │
 │                                                                          │
 │   Output: "feat(builder): add multiple builders (Query, PDF)"            │
 └────────────────────────────────────┬─────────────────────────────────────┘
                                      │
                                      ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │ STEP 4: printSuggestions() - CLI তে দেখাও                                │
 │ ──────────────────────────────────────────                               │
 │                                                                          │
 │   💡 Suggested Commit Messages:                                          │
 │   ─────────────────────────────                                          │
 │                                                                          │
 │   1. ✨ feat(builder): add multiple builders (Query, PDF)                │
 │      Confidence: █████████░ 85%                                          │
 │                                                                          │
 │   📋 Copy-paste:                                                         │
 │   git add -A && git commit -m "feat(builder): add multiple builders..."  │
 │                                                                          │
 └──────────────────────────────────────────────────────────────────────────┘
${c.reset}
`);

console.log(`
${c.green}════════════════════════════════════════════════════════════════════════════
   ✅ Code Walkthrough Complete!

   এখন তুমি জানো:
   • CONFIG কিভাবে rules define করে
   • Git commands কিভাবে চালায়
   • Scope detection কিভাবে কাজ করে
   • Diff analysis কিভাবে type detect করে
   • Score calculation কিভাবে winner বাছে
   • Subject generation এর priority order
   • Final message কিভাবে assemble হয়
   • CLI output কিভাবে দেখায়
════════════════════════════════════════════════════════════════════════════${c.reset}
`);
