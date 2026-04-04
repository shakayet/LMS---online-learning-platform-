#!/usr/bin/env node

const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const c = colors;

function print(text) {
  console.log(text);
}

function section(title) {
  print(`\n${c.cyan}${'═'.repeat(75)}${c.reset}`);
  print(`${c.bright}${c.cyan}  ${title}${c.reset}`);
  print(`${c.cyan}${'═'.repeat(75)}${c.reset}\n`);
}

function subsection(title) {
  print(`\n${c.yellow}┌${'─'.repeat(70)}┐${c.reset}`);
  print(`${c.yellow}│${c.reset} ${c.bright}${title}${c.reset}`);
  print(`${c.yellow}└${'─'.repeat(70)}┘${c.reset}\n`);
}

function junior(text) {
  print(`${c.green}   👶 Junior জিজ্ঞেস করছে: ${text}${c.reset}`);
}

function senior(text) {
  print(`${c.blue}   👨‍💻 Senior বলছে: ${text}${c.reset}`);
}

function code(text) {
  print(`${c.gray}   ${text}${c.reset}`);
}

function example(label, content) {
  print(`\n   ${c.magenta}📝 ${label}:${c.reset}`);
  content.split('\n').forEach(line => print(`   ${c.gray}${line}${c.reset}`));
}

function realLife(text) {
  print(`\n   ${c.yellow}🌍 Real Life Example: ${text}${c.reset}`);
}

print(`
${c.bright}${c.cyan}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║     🎓 SMART COMMIT - COMPLETE TUTORIAL                                      ║
║     Senior Developer থেকে Junior Developer এর জন্য Complete Guide            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
${c.reset}
`);

section('📚 PART 1: কেন এই Tool দরকার?');

junior('ভাইয়া, আমি তো git commit -m "update" দিয়েই কাজ চালাই। এত ঝামেলা কেন?');

senior(`দেখো, "update" বা "fix" দিয়ে commit করলে ৩ মাস পরে কেউ বুঝবে না কী করেছিলে।`);

print(`
   ${c.red}❌ খারাপ Commit Messages:${c.reset}
   ┌─────────────────────────────────────────────────────────────────┐
   │  "update"                                                        │
   │  "fix bug"                                                       │
   │  "changes"                                                       │
   │  "work in progress"                                              │
   │  "asdfghjkl" (হ্যাঁ, অনেকে এটাও করে!)                            │
   └─────────────────────────────────────────────────────────────────┘

   ${c.green}✅ ভালো Commit Messages:${c.reset}
   ┌─────────────────────────────────────────────────────────────────┐
   │  "feat(auth): add Google OAuth login"                           │
   │  "fix(payment): resolve null pointer in refund calculation"     │
   │  "refactor(api): extract validation logic to middleware"        │
   │  "perf(search): add database index for faster queries"          │
   └─────────────────────────────────────────────────────────────────┘
`);

realLife(`ধরো তোমার app এ bug হলো। তুমি git log দেখছো কবে এই bug আসলো।
   "update", "update", "fix", "update" - এগুলো দেখে কিছু বুঝবে?
   কিন্তু "fix(payment): handle null in refund" দেখলে সাথে সাথে বুঝবে!`);

section('📚 PART 2: Conventional Commits কী?');

junior('ভাইয়া, feat, fix এগুলো কী? কোথা থেকে আসলো?');

senior(`এটা হলো "Conventional Commits" - একটা industry standard format।
        Google, Microsoft, Facebook সবাই এটা follow করে।`);

print(`
   ${c.cyan}📐 Format:${c.reset}
   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │     <type>(<scope>): <subject>                                  │
   │     ─────  ───────   ─────────                                  │
   │       │       │          │                                      │
   │       │       │          └── কী করেছো (সংক্ষেপে)                 │
   │       │       │                                                 │
   │       │       └── কোন area তে করেছো (optional)                  │
   │       │                                                         │
   │       └── কী ধরনের কাজ করেছো                                    │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘

   ${c.yellow}📋 Type List (মুখস্থ করে ফেলো!):${c.reset}

   ┌───────────┬────────┬─────────────────────────────────────────────┐
   │ Type      │ Emoji  │ কখন ব্যবহার করবে                            │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ feat      │ ✨     │ নতুন feature যোগ করলে                        │
   │           │        │ যেমন: নতুন API, নতুন button, নতুন page      │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ fix       │ 🐛     │ Bug fix করলে                                │
   │           │        │ যেমন: crash fix, wrong calculation fix      │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ refactor  │ ♻️     │ Code structure পরিবর্তন (behavior same)      │
   │           │        │ যেমন: function ভাঙা, file সরানো              │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ perf      │ ⚡     │ Performance improve করলে                    │
   │           │        │ যেমন: query optimize, caching যোগ           │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ docs      │ 📚     │ Documentation লিখলে                         │
   │           │        │ যেমন: README update, comments যোগ           │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ test      │ ✅     │ Test লিখলে                                  │
   │           │        │ যেমন: unit test, integration test           │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ chore     │ 🔨     │ Maintenance কাজ                             │
   │           │        │ যেমন: package update, config change         │
   ├───────────┼────────┼─────────────────────────────────────────────┤
   │ ci        │ 🔧     │ CI/CD pipeline change                       │
   │           │        │ যেমন: GitHub Actions update                 │
   └───────────┴────────┴─────────────────────────────────────────────┘
`);

junior('scope টা কী? সেটা কি দিতেই হবে?');

senior(`scope হলো তুমি কোন module/area তে কাজ করেছো সেটা বলা।
        Optional, কিন্তু দিলে বুঝতে সুবিধা।`);

print(`
   ${c.cyan}📝 Scope Examples:${c.reset}

   ┌────────────────────────────────────────────────────────────────────┐
   │ File Path                        │ Scope হবে    │ Example         │
   ├────────────────────────────────────────────────────────────────────┤
   │ src/app/modules/auth/*           │ auth         │ feat(auth):     │
   │ src/app/modules/payment/*        │ payment      │ fix(payment):   │
   │ src/app/builder/QueryBuilder.ts  │ builder      │ refactor(builder): │
   │ src/app/logging/*                │ logging      │ perf(logging):  │
   │ tests/*                          │ test         │ test:           │
   │ docs/*                           │ docs         │ docs:           │
   └────────────────────────────────────────────────────────────────────┘

   ${c.green}✅ Examples:${c.reset}

   feat(auth): add Google OAuth login
   │     │     │
   │     │     └── বোঝা যাচ্ছে Google login যোগ করেছে
   │     └── auth module এ কাজ করেছে
   └── নতুন feature

   fix(payment): handle null in refund calculation
   │     │       │
   │     │       └── null handle করা হয়েছে refund এ
   │     └── payment module এ
   └── bug fix করেছে
`);

section('📚 PART 3: Script কিভাবে কাজ করে (Step by Step)');

junior('ভাইয়া, এখন বুঝলাম কেন দরকার। কিন্তু script টা ভেতরে কী করে?');

senior('চলো একদম শুরু থেকে দেখি, প্রতিটা step...');

subsection('🔍 STEP 1: Git থেকে Changed Files নেওয়া');

print(`
   ${c.cyan}প্রথমে আমরা জানতে চাই - কোন কোন file change হয়েছে?${c.reset}

   Terminal এ যখন তুমি লেখো: ${c.yellow}git status${c.reset}
   তুমি দেখো কোন files modified, added, deleted।

   আমরা একই কাজ করি code এ:
`);

example('JavaScript Code', `
const { execSync } = require('child_process');

// Git command চালাও এবং output নাও
const output = execSync('git diff --name-status HEAD', { encoding: 'utf-8' });

// Output আসে এরকম:
// M    src/app/builder/QueryBuilder.ts
// A    scripts/smart-commit.js
// D    old-file.ts
`);

print(`
   ${c.yellow}📋 Status এর মানে:${c.reset}
   ┌────┬─────────────────────────────────────────────────────────────┐
   │ M  │ Modified - file এ কিছু change করেছো                         │
   │ A  │ Added - নতুন file তৈরি করেছো                                 │
   │ D  │ Deleted - file মুছে ফেলেছো                                   │
   │ R  │ Renamed - file এর নাম বদলেছো                                 │
   └────┴─────────────────────────────────────────────────────────────┘
`);

realLife(`ধরো তুমি ৩টা file change করেছো:
   - auth.service.ts (edit করেছো)
   - new-helper.ts (নতুন বানিয়েছো)
   - old-code.ts (delete করেছো)

   Git বলবে: M auth.service.ts, A new-helper.ts, D old-code.ts`);

subsection('🔍 STEP 2: Files কে Object এ রূপান্তর');

junior('ভাইয়া, "M src/app/auth.ts" এই string দিয়ে কী করবো?');

senior('এটাকে JavaScript Object এ convert করবো যাতে সহজে কাজ করা যায়।');

example('Code', `
// Raw input: "M    src/app/modules/auth/auth.service.ts"

// Parse করে Object বানাও:
const file = {
  status: 'M',
  path: 'src/app/modules/auth/auth.service.ts',
  isNew: false,        // status === 'A' হলে true
  isDeleted: false,    // status === 'D' হলে true
  isModified: true,    // status === 'M' হলে true
  isRenamed: false     // status === 'R' হলে true
};
`);

print(`
   ${c.cyan}কেন Object বানাই?${c.reset}

   String: "M src/app/auth.ts"
   ❌ এটা দিয়ে check করা কঠিন - if (str.startsWith('M')) 🤮

   Object: { status: 'M', path: '...', isModified: true }
   ✅ এটা দিয়ে check করা সহজ - if (file.isModified) 😊
`);

subsection('🔍 STEP 3: Scope Detection (কোন area তে কাজ করেছো)');

junior('ভাইয়া, file path থেকে scope কিভাবে বের করবো?');

senior('Pattern matching! Path এর মধ্যে keywords খুঁজবো।');

example('Code', `
function detectScope(filePath) {
  // Path: "src/app/modules/auth/auth.service.ts"

  if (filePath.includes('modules/')) {
    // "modules/" এর পরের part নাও
    // modules/auth/... → "auth"
    const parts = filePath.split('/');
    const moduleIndex = parts.indexOf('modules');
    return parts[moduleIndex + 1];  // "auth"
  }

  if (filePath.includes('builder/')) {
    return 'builder';
  }

  if (filePath.includes('logging/')) {
    return 'logging';
  }

  // ... আরো patterns
}
`);

print(`
   ${c.yellow}📊 Pattern Matching Table:${c.reset}

   ┌────────────────────────────────────────┬──────────────────────────┐
   │ যদি Path এ থাকে...                     │ Scope হবে...              │
   ├────────────────────────────────────────┼──────────────────────────┤
   │ src/app/modules/auth/anything.ts       │ auth                     │
   │ src/app/modules/user/anything.ts       │ user                     │
   │ src/app/modules/payment/anything.ts    │ payment                  │
   │ src/app/builder/QueryBuilder.ts        │ builder                  │
   │ src/app/logging/logger.ts              │ logging                  │
   │ scripts/anything.js                    │ scripts                  │
   │ tests/anything.test.ts                 │ test                     │
   │ docs/anything.md                       │ docs                     │
   └────────────────────────────────────────┴──────────────────────────┘
`);

realLife(`তুমি এই files change করলে:
   - src/app/modules/auth/auth.service.ts → scope: auth
   - src/app/modules/auth/auth.controller.ts → scope: auth
   - src/app/modules/user/user.service.ts → scope: user

   সব scopes: [auth, auth, user] → unique: [auth, user]
   Final scope: "auth,user" (multiple scopes)`);

subsection('🔍 STEP 4: Diff Analysis (Code এর ভেতরে কী লেখা আছে)');

junior('ভাইয়া, শুধু file path দেখলেই তো হবে না। ভেতরে কী লিখেছি সেটা?');

senior(`Exactly! এজন্য আমরা git diff পড়ি এবং keywords খুঁজি।
        যেমন code এ "fix" লেখা থাকলে বুঝি bug fix করেছে।`);

example('Git Diff Output', `
$ git diff -- src/app/payment/payment.service.ts

 export class PaymentService {
   async processRefund(paymentId: string) {
-    return payment.amount;                    // ← এই line remove হয়েছে
+    // Fix: handle null case                  // ← নতুন যোগ হয়েছে
+    if (!payment) {                           // ← নতুন
+      throw new ApiError(404, 'Not found');   // ← নতুন
+    }
+    return payment?.amount ?? 0;              // ← নতুন
   }
 }
`);

print(`
   ${c.cyan}আমরা কী খুঁজি?${c.reset}

   ┌───────────────────────────────────────────────────────────────────┐
   │  + দিয়ে শুরু = নতুন line যোগ হয়েছে                                │
   │  - দিয়ে শুরু = পুরনো line remove হয়েছে                           │
   └───────────────────────────────────────────────────────────────────┘

   ${c.yellow}📋 Keyword Detection:${c.reset}

   ┌─────────────────────────────┬───────────┬─────────────────────────┐
   │ যদি নতুন code এ থাকে...     │ Type      │ কেন?                    │
   ├─────────────────────────────┼───────────┼─────────────────────────┤
   │ "fix", "bug", "resolve"     │ fix 🐛    │ Bug fix করছে           │
   │ "optimize", "cache", "perf" │ perf ⚡   │ Performance বাড়াচ্ছে    │
   │ "refactor", "clean", "move" │ refactor  │ Code restructure করছে  │
   │ "export class", "function"  │ feat ✨   │ নতুন কিছু যোগ করছে      │
   └─────────────────────────────┴───────────┴─────────────────────────┘
`);

example('Detection Code', `
const addedLines = diff.split('\\n')
  .filter(line => line.startsWith('+'))  // শুধু নতুন lines
  .join('\\n');

// Patterns check করো
if (/fix(ed|es|ing)?/i.test(addedLines)) {
  typeScores.fix += 1;  // fix এর score বাড়াও
}

if (/optimi[zs]/i.test(addedLines)) {
  typeScores.perf += 1;  // performance এর score বাড়াও
}

if (/export\\s+(class|function)/.test(addedLines)) {
  typeScores.feat += 1;  // feature এর score বাড়াও
}
`);

subsection('🔍 STEP 5: Score Calculation & Winner Selection');

junior('ভাইয়া, যদি একসাথে fix ও feat দুটোই match করে?');

senior('তখন score দেখবো! যার score বেশি সে জিতবে।');

print(`
   ${c.cyan}Example Scenario:${c.reset}

   ধরো তুমি এই code লিখেছো:
   ┌─────────────────────────────────────────────────────────────────┐
   │  + export class PaymentHelper {        // ← feat pattern       │
   │  +   // Fix: handle edge case          // ← fix pattern        │
   │  +   async processPayment() {          // ← feat pattern       │
   │  +     // Bug resolved here            // ← fix pattern        │
   │  +   }                                                         │
   │  + }                                                           │
   └─────────────────────────────────────────────────────────────────┘

   ${c.yellow}Score Calculation:${c.reset}

   feat patterns found: 2 (export class, async function)
   fix patterns found: 2 (Fix:, Bug resolved)

   Scores: { feat: 2, fix: 2 }  ← টাই!

   ${c.green}Tie-breaker Rules:${c.reset}
   1. নতুন file হলে → feat জেতে
   2. বেশি code remove হলে → refactor জেতে
   3. সমান হলে → feat জেতে (default)

   Final: feat ✨ (কারণ নতুন class export হচ্ছে)
`);

example('Confidence Calculation', `
// Formula: (typeScore / totalScore) + 0.3

const totalScore = 2 + 2 + 0 = 4;  // feat + fix + others

const featConfidence = (2 / 4) + 0.3 = 0.8 = 80%
const fixConfidence = (2 / 4) + 0.3 = 0.8 = 80%

// Visual bar:
// 80% = ████████░░
`);

subsection('🔍 STEP 6: Smart Subject Generation');

junior('ভাইয়া, type পেলাম। কিন্তু subject কিভাবে লিখবো?');

senior('Files গুলোকে group করে intelligent subject বানাবো।');

print(`
   ${c.cyan}File Grouping:${c.reset}

   Input files:
   ┌─────────────────────────────────────────────────────────────────┐
   │  - src/app/builder/QueryBuilder.ts                              │
   │  - src/app/builder/PDFBuilder.ts                                │
   │  - src/app/modules/auth/auth.service.ts                         │
   │  - doc/guide.md                                                 │
   └─────────────────────────────────────────────────────────────────┘

   Grouped:
   ┌─────────────────────────────────────────────────────────────────┐
   │  builders: [QueryBuilder.ts, PDFBuilder.ts]  → 2টা builder      │
   │  modules:  [auth.service.ts]                 → 1টা module       │
   │  docs:     [guide.md]                        → 1টা doc          │
   └─────────────────────────────────────────────────────────────────┘

   ${c.yellow}Subject Generation Priority:${c.reset}

   ┌────┬─────────────────────────┬────────────────────────────────────┐
   │ #  │ যদি এটা থাকে...          │ Subject হবে...                     │
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 1  │ Builder files           │ "add QueryBuilder functionality"   │
   │    │                         │ "add multiple builders (Query,PDF)"│
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 2  │ Module files            │ "add auth module"                  │
   │    │                         │ "add auth, user modules"           │
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 3  │ Logging files           │ "add logging and observability"    │
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 4  │ Only test files         │ "add tests"                        │
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 5  │ Script files            │ "add commit helper script"         │
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 6  │ Only doc files          │ "update documentation"             │
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 7  │ Single file             │ "add auth.service.ts"              │
   ├────┼─────────────────────────┼────────────────────────────────────┤
   │ 8  │ Fallback                │ "update source files"              │
   └────┴─────────────────────────┴────────────────────────────────────┘
`);

example('Subject Generation Code', `
function generateSubject(analysis) {
  const fileGroups = groupFiles(analysis.files);

  // Priority 1: Builder check
  if (fileGroups.builders.length > 0) {
    const names = extractBuilderNames(fileGroups.builders);
    // ["QueryBuilder.ts", "PDFBuilder.ts"] → ["Query", "PDF"]

    if (names.length === 1) {
      return \`add \${names[0]}Builder functionality\`;
    }
    return \`add multiple builders (\${names.join(', ')})\`;
  }

  // Priority 2: Module check
  if (fileGroups.modules.length > 0) {
    const modules = extractModuleNames(fileGroups.modules);
    // ["auth/auth.service.ts"] → ["auth"]

    return \`add \${modules.join(', ')} module\`;
  }

  // ... more priorities
}
`);

subsection('🔍 STEP 7: Final Message Assembly');

junior('সব পেলাম! এখন কিভাবে জোড়া লাগাবো?');

senior('সহজ! type + scope + subject মিলিয়ে দিলেই হলো।');

print(`
   ${c.cyan}Assembly Process:${c.reset}

   ┌─────────────────────────────────────────────────────────────────┐
   │                                                                 │
   │   Input:                                                        │
   │     type = "feat"                                               │
   │     scope = "builder"                                           │
   │     subject = "add multiple builders (Query, PDF)"              │
   │                                                                 │
   │   Assembly:                                                     │
   │     if (scope) {                                                │
   │       message = \`\${type}(\${scope}): \${subject}\`;                │
   │     } else {                                                    │
   │       message = \`\${type}: \${subject}\`;                          │
   │     }                                                           │
   │                                                                 │
   │   Output:                                                       │
   │     "feat(builder): add multiple builders (Query, PDF)"         │
   │      ^^^^  ^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^        │
   │      type  scope    subject                                     │
   │                                                                 │
   └─────────────────────────────────────────────────────────────────┘

   ${c.yellow}Multiple Scopes Handling:${c.reset}

   Scopes: [auth, user, message]

   If <= 3 scopes:
     "feat(auth,user,message): add modules"

   If > 3 scopes:
     "feat: add modules"  (no scope - too many)
`);

section('📚 PART 4: Complete Flow (এক নজরে)');

print(`
   ${c.cyan}
   ┌─────────────────┐
   │  npm run commit │  ← তুমি command দিলে
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐     ┌────────────────────────────────────────┐
   │  STEP 1         │     │ git diff --name-status HEAD            │
   │  Get Files      │────▶│ Output: M file1.ts, A file2.ts, D file3│
   └────────┬────────┘     └────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐     ┌────────────────────────────────────────┐
   │  STEP 2         │     │ { path: 'file1.ts', isModified: true } │
   │  Parse to Obj   │────▶│ { path: 'file2.ts', isNew: true }      │
   └────────┬────────┘     └────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐     ┌────────────────────────────────────────┐
   │  STEP 3         │     │ scopes: ['auth', 'builder']            │
   │  Detect Scope   │────▶│ (path pattern matching থেকে)            │
   └────────┬────────┘     └────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐     ┌────────────────────────────────────────┐
   │  STEP 4         │     │ +// Fix: handle null                   │
   │  Read Diff      │────▶│ +export class NewFeature               │
   └────────┬────────┘     └────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐     ┌────────────────────────────────────────┐
   │  STEP 5         │     │ { feat: 3, fix: 2, refactor: 1 }       │
   │  Score Types    │────▶│ Winner: feat (highest score)           │
   └────────┬────────┘     └────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐     ┌────────────────────────────────────────┐
   │  STEP 6         │     │ builders: 2, modules: 1, docs: 0       │
   │  Group Files    │────▶│ Subject: "add multiple builders"       │
   └────────┬────────┘     └────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────┐     ┌────────────────────────────────────────┐
   │  STEP 7         │     │ feat(builder): add multiple builders   │
   │  Assemble Msg   │────▶│ Confidence: 85%                        │
   └────────┬────────┘     └────────────────────────────────────────┘
            │
            ▼
   ┌─────────────────────────────────────────────────────────────────┐
   │  💡 OUTPUT                                                      │
   │  ────────────────────────────────────────────────               │
   │  1. ✨ feat(builder): add multiple builders (Query, PDF)        │
   │     Confidence: █████████░ 85%                                  │
   │                                                                 │
   │  2. 🐛 fix(builder): fix multiple builders (Query, PDF)         │
   │     Confidence: ██████░░░░ 55%                                  │
   └─────────────────────────────────────────────────────────────────┘
   ${c.reset}
`);

section('📚 PART 5: Practice Quiz (নিজে চেষ্টা করো!)');

print(`
   ${c.yellow}🎯 Quiz 1: এই scenario তে commit message কী হবে?${c.reset}

   Changed files:
   - src/app/modules/auth/auth.service.ts (M)
   - src/app/modules/auth/auth.controller.ts (M)
   - src/app/modules/auth/auth.validation.ts (M)

   Diff contains: "add Google OAuth login", "implement social auth"

   ${c.gray}তোমার উত্তর চিন্তা করো...${c.reset}

   ${c.green}✅ Answer: feat(auth): add auth module${c.reset}
   কারণ:
   - সব files auth module এ → scope: auth
   - নতুন feature যোগ হচ্ছে → type: feat
   - Single module → subject: "add auth module"

   ────────────────────────────────────────────────────────────────

   ${c.yellow}🎯 Quiz 2: এই scenario তে?${c.reset}

   Changed files:
   - src/app/modules/payment/payment.service.ts (M)

   Diff contains: "Fix: handle null in refund", "Bug resolved"

   ${c.gray}তোমার উত্তর চিন্তা করো...${c.reset}

   ${c.green}✅ Answer: fix(payment): fix payment module${c.reset}
   কারণ:
   - payment module এ → scope: payment
   - "fix", "bug" keywords → type: fix

   ────────────────────────────────────────────────────────────────

   ${c.yellow}🎯 Quiz 3: এই scenario তে?${c.reset}

   Changed files:
   - README.md (M)
   - doc/setup-guide.md (A)
   - doc/api-reference.md (M)

   ${c.gray}তোমার উত্তর চিন্তা করো...${c.reset}

   ${c.green}✅ Answer: docs: update documentation${c.reset}
   কারণ:
   - সব files .md → type: docs
   - শুধু doc files → subject: "update documentation"

   ────────────────────────────────────────────────────────────────

   ${c.yellow}🎯 Quiz 4: এই scenario তে?${c.reset}

   Changed files:
   - src/app/builder/QueryBuilder.ts (M)
   - src/app/builder/AggregationBuilder.ts (M)

   Diff contains: "optimize query", "add caching", "improve performance"

   ${c.gray}তোমার উত্তর চিন্তা করো...${c.reset}

   ${c.green}✅ Answer: perf(builder): optimize multiple builders (Query, Aggregation)${c.reset}
   কারণ:
   - builder files → scope: builder
   - "optimize", "caching", "performance" → type: perf
   - 2 builders → subject: "multiple builders (Query, Aggregation)"
`);

section('📚 PART 6: Tips & Best Practices');

print(`
   ${c.green}✅ DO (এগুলো করো):${c.reset}

   1. ${c.cyan}ছোট ছোট commit করো${c.reset}
      ❌ একটা commit এ ১০০টা file change করা
      ✅ প্রতিটা feature/fix এর জন্য আলাদা commit

   2. ${c.cyan}Present tense ব্যবহার করো${c.reset}
      ❌ "added login feature"
      ✅ "add login feature"

   3. ${c.cyan}Subject ছোট রাখো (50 chars)${c.reset}
      ❌ "fix the bug in payment processing where null pointer exception..."
      ✅ "fix null pointer in payment processing"

   4. ${c.cyan}Scope specific করো${c.reset}
      ❌ feat: add new feature
      ✅ feat(auth): add Google OAuth login

   ────────────────────────────────────────────────────────────────

   ${c.red}❌ DON'T (এগুলো করো না):${c.reset}

   1. ${c.cyan}Vague messages দিও না${c.reset}
      ❌ "update", "fix", "changes", "misc"

   2. ${c.cyan}Past tense ব্যবহার করো না${c.reset}
      ❌ "fixed", "added", "updated"

   3. ${c.cyan}Period (.) দিয়ে শেষ করো না${c.reset}
      ❌ "add login feature."
      ✅ "add login feature"

   4. ${c.cyan}Scope ছাড়া mixed changes করো না${c.reset}
      ❌ feat: add auth and fix payment and update docs
      ✅ আলাদা আলাদা commit করো

   ────────────────────────────────────────────────────────────────

   ${c.yellow}💡 Pro Tips:${c.reset}

   1. ${c.cyan}Commit message দেখে বুঝতে পারা উচিত কী হয়েছে - code না দেখেই${c.reset}

   2. ${c.cyan}git log --oneline দেখলে যেন project এর history বোঝা যায়${c.reset}

   3. ${c.cyan}Large changes কে smaller commits এ ভাগ করো${c.reset}
      যেমন: "add user model" → "add user service" → "add user routes"

   4. ${c.cyan}Breaking changes থাকলে type এর পরে ! দাও${c.reset}
      যেমন: feat(api)!: change response format
`);

print(`
${c.cyan}${'═'.repeat(75)}${c.reset}
${c.bright}${c.green}
   🎉 Tutorial Complete!

   এখন তুমি জানো:
   ✅ কেন ভালো commit message দরকার
   ✅ Conventional Commits format কী
   ✅ Smart Commit script কিভাবে কাজ করে
   ✅ প্রতিটা step এ কী হয়

   Try it now: npm run commit
${c.reset}
${c.cyan}${'═'.repeat(75)}${c.reset}
`);
