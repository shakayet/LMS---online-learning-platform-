#!/usr/bin/env node

const { execSync } = require('child_process');

console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║     🎓 SMART COMMIT - BEHIND THE SCENES (কিভাবে কাজ করে)                  ║
╚══════════════════════════════════════════════════════════════════════════╝
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 1: Git থেকে Changed Files সংগ্রহ                                │
└──────────────────────────────────────────────────────────────────────────┘

🔧 Command: git diff --name-status HEAD

এই command দিয়ে আমরা পাই:
- M = Modified (পরিবর্তিত)
- A = Added (নতুন)
- D = Deleted (মুছে ফেলা)
- R = Renamed (নাম বদল)
`);

try {
  const diffOutput = execSync('git diff --name-status HEAD', { encoding: 'utf-8' }).trim();
  const lines = diffOutput.split('\n').slice(0, 10);

  console.log('📂 Raw Git Output (প্রথম ১০টা):');
  console.log('─'.repeat(50));
  lines.forEach(line => {
    const [status, path] = line.split('\t');
    const icon = status === 'M' ? '📝' : status === 'A' ? '🆕' : status === 'D' ? '🗑️' : '📄';
    console.log(`   ${icon} [${status}] ${path}`);
  });
  if (diffOutput.split('\n').length > 10) {
    console.log(`   ... এবং আরও ${diffOutput.split('\n').length - 10}টা ফাইল`);
  }
} catch (e) {
  console.log('   (কোনো changes নেই)');
}

console.log(`

┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 2: Files Parse করে Object এ রূপান্তর                            │
└──────────────────────────────────────────────────────────────────────────┘

🔄 Raw line "M	src/app/builder/QueryBuilder.ts" থেকে হয়:

{
  status: 'M',
  path: 'src/app/builder/QueryBuilder.ts',
  isNew: false,
  isDeleted: false,
  isModified: true,
  isRenamed: false
}
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 3: Scope Detection (কোন module/area পরিবর্তন হয়েছে)             │
└──────────────────────────────────────────────────────────────────────────┘

🎯 Path Pattern Matching:

┌─────────────────────────────────────┬──────────────────┐
│ File Path                           │ Detected Scope   │
├─────────────────────────────────────┼──────────────────┤
│ src/app/modules/auth/auth.ts        │ auth             │
│ src/app/modules/user/user.ts        │ user             │
│ src/app/builder/QueryBuilder.ts     │ builder          │
│ src/app/logging/opentelemetry.ts    │ logging          │
│ src/helpers/dateHelper.ts           │ helpers          │
│ scripts/smart-commit.js             │ scripts          │
│ tests/unit/auth.test.ts             │ test             │
│ doc/guide-bn.md                     │ docs             │
└─────────────────────────────────────┴──────────────────┘

📝 Code যা এটা করে:

function detectScope(filePath) {
  const patterns = {
    'src/app/modules/': (path) => path.split('/')[3],  // auth, user, etc.
    'src/app/builder/': () => 'builder',
    'src/app/logging/': () => 'logging',
    'scripts/': () => 'scripts',
    // ...
  };

  for (const [pattern, extractor] of Object.entries(patterns)) {
    if (filePath.includes(pattern)) {
      return extractor(filePath);
    }
  }
}
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 4: Diff Content Analysis (Code এর ভেতর কী আছে দেখা)             │
└──────────────────────────────────────────────────────────────────────────┘

🔧 Command: git diff -- "filepath"

প্রতিটা file এর diff পড়ে আমরা pattern খুঁজি:

┌────────────────────────────────────────┬─────────────┬────────────┐
│ Pattern (Regex)                        │ Type        │ Score +1   │
├────────────────────────────────────────┼─────────────┼────────────┤
│ /fix(ed|es|ing)?/i                     │ fix 🐛      │ ✓          │
│ /bug/i                                 │ fix 🐛      │ ✓          │
│ /resolv(e|ed|ing)/i                    │ fix 🐛      │ ✓          │
├────────────────────────────────────────┼─────────────┼────────────┤
│ /optimi[zs]/i                          │ perf ⚡     │ ✓          │
│ /cach(e|ing)/i                         │ perf ⚡     │ ✓          │
│ /performance/i                         │ perf ⚡     │ ✓          │
├────────────────────────────────────────┼─────────────┼────────────┤
│ /refactor/i                            │ refactor ♻️ │ ✓          │
│ /clean(ed|ing|up)?/i                   │ refactor ♻️ │ ✓          │
│ /renam(e|ed|ing)/i                     │ refactor ♻️ │ ✓          │
├────────────────────────────────────────┼─────────────┼────────────┤
│ /export\\s+(class|function|const)/     │ feat ✨     │ ✓          │
│ new file (status = 'A')                │ feat ✨     │ ✓          │
└────────────────────────────────────────┴─────────────┴────────────┘

📝 Example Diff Analysis:

\`\`\`diff
+ // Fix: handle null case                    ← 🐛 fix pattern detected!
+ if (!payment) {
+   throw new ApiError(404, 'Not found');
+ }
- return payment.amount;                      ← line removed
+ return payment?.amount ?? 0;                ← line added
\`\`\`

Result: { fix: 2, feat: 0, refactor: 0, perf: 0 }
Winner: fix 🐛 (highest score)
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 5: Files কে Purpose অনুযায়ী Group করা                          │
└──────────────────────────────────────────────────────────────────────────┘

function groupFilesByPurpose(files) {
  return {
    builders: files.filter(f => f.path.includes('Builder')),
    modules:  files.filter(f => f.path.includes('modules/')),
    logging:  files.filter(f => f.path.includes('logging/')),
    tests:    files.filter(f => f.path.includes('test')),
    scripts:  files.filter(f => f.path.includes('scripts/')),
    docs:     files.filter(f => f.path.endsWith('.md')),
    config:   files.filter(f => f.path.endsWith('.json')),
  };
}

📊 Example Grouping:

Input Files:
  - src/app/builder/QueryBuilder.ts
  - src/app/builder/PDFBuilder.ts
  - src/app/modules/auth/auth.service.ts
  - doc/guide.md
  - package.json

Output Groups:
  builders: [QueryBuilder.ts, PDFBuilder.ts]  ← 2 files
  modules:  [auth.service.ts]                 ← 1 file
  docs:     [guide.md]                        ← 1 file
  config:   [package.json]                    ← 1 file
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 6: Smart Subject তৈরি (Priority Order)                          │
└──────────────────────────────────────────────────────────────────────────┘

Subject generation এর priority order:

┌────┬─────────────────────────┬────────────────────────────────────────────┐
│ #  │ Check                   │ Generated Subject                          │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 1  │ Builder files আছে?      │ "add QueryBuilder functionality"           │
│    │                         │ "add multiple builders (Query, PDF)"       │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 2  │ Module files আছে?       │ "add auth module"                          │
│    │                         │ "add auth, user, message modules"          │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 3  │ Logging files আছে?      │ "add logging and observability"            │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 4  │ শুধু Test files?        │ "add tests"                                │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 5  │ Script files আছে?       │ "add commit helper script"                 │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 6  │ শুধু Doc files?         │ "update documentation"                     │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 7  │ Single file?            │ "add filename.ts"                          │
├────┼─────────────────────────┼────────────────────────────────────────────┤
│ 8  │ Fallback                │ "update source files"                      │
└────┴─────────────────────────┴────────────────────────────────────────────┘

📝 Code Flow:

if (fileGroups.builders.length > 0) {
  // Extract builder names: QueryBuilder → Query
  const names = builders.map(extractName);
  if (names.length === 1) return \`add \${names[0]}Builder functionality\`;
  if (names.length > 1)  return \`add multiple builders (\${names.join(', ')})\`;
}

if (fileGroups.modules.length > 0) {
  // Extract module names from path
  const modules = extractModuleNames();
  return \`add \${modules.join(', ')} modules\`;
}

// ... continue checking other groups
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 7: Confidence Score গণনা                                        │
└──────────────────────────────────────────────────────────────────────────┘

Formula:
  confidence = (typeScore / totalScore) + 0.3

Example:
  Detected types: { feat: 5, fix: 2, refactor: 1 }
  Total score: 5 + 2 + 1 = 8

  feat confidence:     (5/8) + 0.3 = 0.925 = 92% ███████████░
  fix confidence:      (2/8) + 0.3 = 0.55  = 55% ██████░░░░░
  refactor confidence: (1/8) + 0.3 = 0.425 = 42% █████░░░░░░

📊 Visual Bar Generation:

function drawBar(confidence) {
  const filled = Math.round(confidence * 10);
  const empty = 10 - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

confidence = 0.72 → ████████░░ 72%
confidence = 0.45 → █████░░░░░ 45%
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 STEP 8: Final Commit Message তৈরি                                    │
└──────────────────────────────────────────────────────────────────────────┘

Conventional Commit Format:
  <type>(<scope>): <subject>

Assembly Process:

  1. Type = "feat" (from Step 4 - highest score)
  2. Scope = "builder" (from Step 3 - if single scope)
  3. Subject = "add multiple builders (Query, PDF)" (from Step 6)

  Final: "feat(builder): add multiple builders (Query, PDF)"

┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   feat(builder): add multiple builders (Query, PDF)                 │
│   ^^^^  ^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^              │
│   type  scope    subject                                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

Multiple Scopes Example:
  Scopes detected: [auth, user, message]
  If <= 3 scopes: "feat(auth,user,message): add modules"
  If > 3 scopes:  "feat: add modules" (no scope)
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 COMPLETE FLOW DIAGRAM                                                │
└──────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   npm run       │
│    commit       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  git diff       │────▶│ M  src/app/builder/QueryBuilder.ts       │
│  --name-status  │     │ M  src/app/modules/auth/auth.service.ts  │
└────────┬────────┘     │ A  scripts/smart-commit.js               │
         │              └──────────────────────────────────────────┘
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Parse Files    │────▶│ { path, isNew, isModified, isDeleted }   │
└────────┬────────┘     └──────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Detect Scopes  │────▶│ scopes: [builder, auth, scripts]         │
└────────┬────────┘     └──────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  git diff       │────▶│ +export class QueryBuilder               │
│  (each file)    │     │ +// Fix: handle edge case                │
└────────┬────────┘     │ -old code removed                        │
         │              └──────────────────────────────────────────┘
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Pattern Match  │────▶│ { feat: 3, fix: 1, refactor: 0 }         │
└────────┬────────┘     └──────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Group Files    │────▶│ builders: 1, modules: 1, scripts: 1      │
└────────┬────────┘     └──────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Generate       │────▶│ "add multiple builders (Query, PDF)"     │
│  Subject        │     └──────────────────────────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Calculate      │────▶│ feat: 85%, fix: 45%, refactor: 30%       │
│  Confidence     │     └──────────────────────────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Assemble       │────▶│ "feat(builder): add QueryBuilder..."     │
│  Message        │     └──────────────────────────────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  💡 Suggested Commit Messages:                                      │
│  ──────────────────────────────────────────────────                 │
│                                                                     │
│    1. ✨ feat(builder): add QueryBuilder functionality              │
│       Confidence: █████████░ 85%                                    │
│                                                                     │
│    2. 🐛 fix(builder): fix QueryBuilder functionality               │
│       Confidence: █████░░░░░ 45%                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
`);

console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  📌 KEY DATA STRUCTURES                                                  │
└──────────────────────────────────────────────────────────────────────────┘

1️⃣ File Object:
{
  status: 'M',                              // Git status
  path: 'src/app/builder/QueryBuilder.ts',  // File path
  isNew: false,                             // status === 'A'
  isDeleted: false,                         // status === 'D'
  isModified: true,                         // status === 'M'
  isRenamed: false                          // status.startsWith('R')
}

2️⃣ Analysis Object:
{
  files: [...],                    // All file objects
  totalFiles: 25,                  // Total count
  newFiles: 5,                     // New files count
  modifiedFiles: 18,               // Modified count
  deletedFiles: 2,                 // Deleted count
  scopes: Set(['builder', 'auth']),// Detected scopes
  detectedTypes: Map({             // Type scores
    'feat': 5,
    'fix': 2,
    'refactor': 1
  }),
  linesAdded: 450,                 // Total lines added
  linesRemoved: 120,               // Total lines removed
  significantChanges: [...]        // Notable patterns found
}

3️⃣ Suggestion Object:
{
  type: 'feat',                    // Commit type
  scope: 'builder',                // Scope (optional)
  subject: 'add QueryBuilder...',  // Subject line
  fullMessage: 'feat(builder):...', // Complete message
  emoji: '✨',                      // Type emoji
  confidence: 0.85,                // 0-1 confidence score
  body: 'Changes: +450 -120...'    // Optional body text
}

4️⃣ CONFIG Object:
{
  types: {
    feat:     { priority: 1, emoji: '✨', description: 'New feature' },
    fix:      { priority: 2, emoji: '🐛', description: 'Bug fix' },
    refactor: { priority: 3, emoji: '♻️', description: 'Refactoring' },
    perf:     { priority: 4, emoji: '⚡', description: 'Performance' },
    docs:     { priority: 5, emoji: '📚', description: 'Documentation' },
    // ...
  },
  patterns: {
    feat: [/export\\s+class/, /new\\s+function/],
    fix:  [/fix(ed)?/i, /bug/i, /resolve/i],
    perf: [/optimi[zs]/i, /cache/i, /performance/i],
    // ...
  },
  scopes: {
    'src/app/modules/': (path) => path.split('/')[3],
    'src/app/builder/': () => 'builder',
    // ...
  }
}
`);

console.log(`
══════════════════════════════════════════════════════════════════════════
   ✅ Explanation Complete! Run "npm run commit" to see it in action.
══════════════════════════════════════════════════════════════════════════
`);
