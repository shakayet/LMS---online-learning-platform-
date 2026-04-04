#!/usr/bin/env node

const CONFIG = {
  types: {
    feat: { priority: 1, emoji: '✨', description: 'New feature' },
    fix: { priority: 2, emoji: '🐛', description: 'Bug fix' },
    refactor: { priority: 3, emoji: '♻️', description: 'Code refactoring' },
    perf: { priority: 4, emoji: '⚡', description: 'Performance improvement' },
    docs: { priority: 5, emoji: '📚', description: 'Documentation' },
    style: { priority: 6, emoji: '💄', description: 'Code style/formatting' },
    test: { priority: 7, emoji: '✅', description: 'Tests' },
    build: { priority: 8, emoji: '📦', description: 'Build system' },
    ci: { priority: 9, emoji: '🔧', description: 'CI/CD' },
    chore: { priority: 10, emoji: '🔨', description: 'Maintenance' },
  },
  patterns: {
    feat: [/export\s+(class|function|const|interface)/, /implement/i, /add(ed|ing)?\s+new/i],
    fix: [/fix(ed|es|ing)?/i, /bug/i, /resolv(e|ed|ing)/i, /patch/i],
    refactor: [/refactor/i, /clean(ed|ing|up)?/i, /restructur/i, /extract/i],
    perf: [/optimi[zs]/i, /cach(e|ing)/i, /performance/i, /speed/i, /fast(er)?/i],
  },
};

function simulateAnalysis(scenario) {
  const analysis = {
    files: scenario.files.map(f => ({
      path: f.path,
      status: f.status || 'M',
      isNew: f.status === 'A',
      isModified: f.status === 'M' || !f.status,
      isDeleted: f.status === 'D',
    })),
    totalFiles: scenario.files.length,
    newFiles: scenario.files.filter(f => f.status === 'A').length,
    modifiedFiles: scenario.files.filter(f => f.status === 'M' || !f.status).length,
    deletedFiles: scenario.files.filter(f => f.status === 'D').length,
    scopes: new Set(),
    detectedTypes: new Map(),
    categories: new Map(),
    linesAdded: scenario.linesAdded || 100,
    linesRemoved: scenario.linesRemoved || 20,
  };

  for (const file of analysis.files) {
    const scope = detectScope(file.path);
    if (scope) analysis.scopes.add(scope);

    const ext = file.path.match(/\.[^.]+$/)?.[0] || '';
    if (ext === '.md') {
      analysis.categories.set('docs', (analysis.categories.get('docs') || 0) + 1);
    } else if (ext === '.json' || ext === '.yml') {
      analysis.categories.set('config', (analysis.categories.get('config') || 0) + 1);
    } else {
      analysis.categories.set('source', (analysis.categories.get('source') || 0) + 1);
    }
  }

  if (scenario.diffContent) {
    for (const [type, patterns] of Object.entries(CONFIG.patterns)) {
      for (const pattern of patterns) {
        if (pattern.test(scenario.diffContent)) {
          analysis.detectedTypes.set(type, (analysis.detectedTypes.get(type) || 0) + 1);
        }
      }
    }
  }

  if (analysis.newFiles > 0) {
    analysis.detectedTypes.set('feat', (analysis.detectedTypes.get('feat') || 0) + analysis.newFiles);
  }

  return analysis;
}

function detectScope(filePath) {
  const path = filePath.replace(/\\/g, '/');

  if (path.includes('src/app/modules/')) {
    return path.split('/')[3];
  }
  if (path.includes('builder') || path.includes('Builder')) return 'builder';
  if (path.includes('logging/')) return 'logging';
  if (path.includes('scripts/')) return 'scripts';
  if (path.includes('tests/') || path.includes('test/')) return 'test';
  if (path.includes('doc/') || path.endsWith('.md')) return 'docs';
  if (path.includes('.github/')) return 'ci';

  return null;
}

function groupFilesByPurpose(files) {
  return {
    builders: files.filter(f => f.path.includes('builder') || f.path.includes('Builder')),
    modules: files.filter(f => f.path.includes('modules/')),
    logging: files.filter(f => f.path.includes('logging/')),
    tests: files.filter(f => f.path.includes('test') || f.path.includes('spec')),
    scripts: files.filter(f => f.path.includes('scripts/')),
    docs: files.filter(f => f.path.endsWith('.md') || f.path.includes('doc/')),
    config: files.filter(f => f.path.endsWith('.json') || f.path.endsWith('.yml')),
  };
}

function generateCommitMessage(analysis) {

  let primaryType = 'chore';
  let highestScore = 0;

  for (const [type, score] of analysis.detectedTypes) {
    if (score > highestScore) {
      highestScore = score;
      primaryType = type;
    }
  }

  if (analysis.newFiles > 0 && analysis.modifiedFiles === 0 && analysis.deletedFiles === 0) {
    primaryType = 'feat';
  }
  if (analysis.categories.get('docs') === analysis.totalFiles) {
    primaryType = 'docs';
  }
  if (analysis.categories.get('config') === analysis.totalFiles) {
    primaryType = 'chore';
  }

  const scopes = Array.from(analysis.scopes);
  let scope = '';
  if (scopes.length === 1) {
    scope = scopes[0];
  } else if (scopes.length > 1 && scopes.length <= 3) {
    scope = scopes.join(',');
  }

  const subject = generateSubject(analysis, primaryType);

  const scopePart = scope ? `(${scope})` : '';
  const fullMessage = `${primaryType}${scopePart}: ${subject}`;

  return {
    type: primaryType,
    scope,
    subject,
    fullMessage,
    emoji: CONFIG.types[primaryType].emoji,
    description: CONFIG.types[primaryType].description,
  };
}

function generateSubject(analysis, type) {
  const actions = {
    feat: 'add', fix: 'fix', refactor: 'refactor', perf: 'optimize',
    docs: 'update', test: 'add', chore: 'update', ci: 'update',
    style: 'format', build: 'update',
  };
  const action = actions[type] || 'update';
  const fileGroups = groupFilesByPurpose(analysis.files);

  if (fileGroups.builders.length > 0) {
    const builderNames = [...new Set(fileGroups.builders.map(f => {
      const match = f.path.match(/(\w+)Builder/i);
      return match ? match[1] : null;
    }).filter(Boolean))];

    if (builderNames.length === 1) return `${action} ${builderNames[0]}Builder functionality`;
    if (builderNames.length > 1) return `${action} multiple builders (${builderNames.slice(0, 3).join(', ')})`;
  }

  if (fileGroups.modules.length > 0) {
    const moduleNames = [...new Set(fileGroups.modules.map(f => {
      const match = f.path.match(/modules\/(\w+)\//);
      return match ? match[1] : null;
    }).filter(Boolean))];

    if (moduleNames.length === 1) return `${action} ${moduleNames[0]} module`;
    if (moduleNames.length > 1 && moduleNames.length <= 3) return `${action} ${moduleNames.join(', ')} modules`;
  }

  if (fileGroups.logging.length > 0) return `${action} logging and observability`;

  if (fileGroups.tests.length === analysis.totalFiles) return `${action} tests`;

  if (fileGroups.scripts.length > 0) {
    const scriptType = fileGroups.scripts[0].path.includes('commit') ? 'commit helper' :
                       fileGroups.scripts[0].path.includes('generate') ? 'generator' : 'utility';
    return `${action} ${scriptType} script`;
  }

  if (fileGroups.docs.length === analysis.totalFiles) return `${action} documentation`;

  if (analysis.totalFiles === 1) {
    const fileName = analysis.files[0].path.split('/').pop();
    return `${action} ${fileName}`;
  }

  return `${action} codebase`;
}

const scenarios = [
  {
    id: 1,
    name: '🔐 Single Module (Auth) - Login Feature',
    description: 'auth module এ Google OAuth যোগ করলে',
    files: [
      { path: 'src/app/modules/auth/auth.service.ts', status: 'M' },
      { path: 'src/app/modules/auth/auth.controller.ts', status: 'M' },
      { path: 'src/app/modules/auth/strategies/google.strategy.ts', status: 'A' },
    ],
    diffContent: 'export class GoogleStrategy implements PassportStrategy { ... }',
    linesAdded: 150,
    linesRemoved: 10,
  },
  {
    id: 2,
    name: '💳 Payment Bug Fix',
    description: 'payment module এ null pointer bug fix করলে',
    files: [
      { path: 'src/app/modules/payment/payment.service.ts', status: 'M' },
    ],
    diffContent: `
      // Fix: handle null case in refund
      if (!payment) {
        throw new ApiError(404, 'Payment not found');
      }
      // Bug resolved
    `,
    linesAdded: 8,
    linesRemoved: 2,
  },
  {
    id: 3,
    name: '🏗️ Multiple Builders Update',
    description: 'QueryBuilder এবং AggregationBuilder update করলে',
    files: [
      { path: 'src/app/builder/QueryBuilder.ts', status: 'M' },
      { path: 'src/app/builder/AggregationBuilder.ts', status: 'M' },
    ],
    diffContent: 'export class QueryBuilder { ... } // add new methods',
    linesAdded: 200,
    linesRemoved: 50,
  },
  {
    id: 4,
    name: '📚 Documentation Only',
    description: 'শুধু markdown files update করলে',
    files: [
      { path: 'README.md', status: 'M' },
      { path: 'doc/api-guide-bn.md', status: 'M' },
      { path: 'doc/setup-guide-bn.md', status: 'A' },
    ],
    diffContent: '# Setup Guide\n## Installation\n...',
    linesAdded: 300,
    linesRemoved: 20,
  },
  {
    id: 5,
    name: '✅ Test Files Only',
    description: 'শুধু test files যোগ করলে',
    files: [
      { path: 'tests/unit/auth.test.ts', status: 'A' },
      { path: 'tests/unit/user.test.ts', status: 'A' },
      { path: 'tests/integration/api.test.ts', status: 'A' },
    ],
    diffContent: 'describe("Auth", () => { it("should login", () => {...}) })',
    linesAdded: 250,
    linesRemoved: 0,
  },
  {
    id: 6,
    name: '⚡ Performance Optimization',
    description: 'search module এ query optimization করলে',
    files: [
      { path: 'src/app/modules/search/search.service.ts', status: 'M' },
    ],
    diffContent: `
      // Optimize: use index hint for faster lookup
      const results = await Model.find(query).hint({ createdAt: -1 });
      // Add caching for better performance
      await redis.setex(cacheKey, 3600, JSON.stringify(results));
    `,
    linesAdded: 25,
    linesRemoved: 5,
  },
  {
    id: 7,
    name: '🔧 Config Files Only',
    description: 'package.json এবং tsconfig update করলে',
    files: [
      { path: 'package.json', status: 'M' },
      { path: 'tsconfig.json', status: 'M' },
    ],
    diffContent: '"dependencies": { "lodash": "^4.17.21" }',
    linesAdded: 5,
    linesRemoved: 2,
  },
  {
    id: 8,
    name: '🔄 Multiple Modules',
    description: 'auth, user, এবং message modules একসাথে update করলে',
    files: [
      { path: 'src/app/modules/auth/auth.service.ts', status: 'M' },
      { path: 'src/app/modules/user/user.service.ts', status: 'M' },
      { path: 'src/app/modules/message/message.service.ts', status: 'M' },
    ],
    diffContent: 'export class AuthService { ... }',
    linesAdded: 80,
    linesRemoved: 30,
  },
  {
    id: 9,
    name: '📝 Logging System Update',
    description: 'logging/observability files update করলে',
    files: [
      { path: 'src/app/logging/opentelemetry.ts', status: 'M' },
      { path: 'src/app/logging/requestLogger.ts', status: 'M' },
      { path: 'src/app/logging/autoLabelBootstrap.ts', status: 'M' },
    ],
    diffContent: 'export function setupTracing() { ... }',
    linesAdded: 100,
    linesRemoved: 40,
  },
  {
    id: 10,
    name: '🗑️ Code Cleanup (Delete)',
    description: 'legacy code remove করলে',
    files: [
      { path: 'src/app/modules/legacy/old.service.ts', status: 'D' },
      { path: 'src/app/modules/legacy/old.controller.ts', status: 'D' },
    ],
    diffContent: '',
    linesAdded: 0,
    linesRemoved: 500,
  },
  {
    id: 11,
    name: '🆕 New Script Added',
    description: 'নতুন utility script তৈরি করলে',
    files: [
      { path: 'scripts/smart-commit.js', status: 'A' },
    ],
    diffContent: 'export function analyzeCommit() { ... }',
    linesAdded: 400,
    linesRemoved: 0,
  },
  {
    id: 12,
    name: '🔧 CI/CD Update',
    description: 'GitHub Actions workflow update করলে',
    files: [
      { path: '.github/workflows/ci.yml', status: 'M' },
      { path: '.github/workflows/deploy.yml', status: 'A' },
    ],
    diffContent: 'name: CI\non: push\njobs: ...',
    linesAdded: 80,
    linesRemoved: 10,
  },
  {
    id: 13,
    name: '♻️ Refactoring',
    description: 'code restructure করলে (behavior same)',
    files: [
      { path: 'src/app/modules/user/user.service.ts', status: 'M' },
      { path: 'src/app/modules/user/helpers/validation.ts', status: 'A' },
    ],
    diffContent: `
      // Refactor: extract validation logic
      // Clean up duplicate code
      // Restructure for better maintainability
    `,
    linesAdded: 50,
    linesRemoved: 80,
  },
  {
    id: 14,
    name: '📄 Single File Edit',
    description: 'একটা মাত্র file edit করলে',
    files: [
      { path: 'src/app/modules/user/user.interface.ts', status: 'M' },
    ],
    diffContent: 'export interface User { name: string; email: string; }',
    linesAdded: 5,
    linesRemoved: 2,
  },
];

function displayScenario(scenario) {
  const analysis = simulateAnalysis(scenario);
  const result = generateCommitMessage(analysis);

  console.log(`
┌${'─'.repeat(72)}┐
│ ${scenario.name.padEnd(70)} │
├${'─'.repeat(72)}┤
│ 📝 ${scenario.description.padEnd(67)} │
├${'─'.repeat(72)}┤`);

  console.log(`│ 📂 Changed Files:${' '.repeat(54)}│`);
  scenario.files.forEach(f => {
    const icon = f.status === 'A' ? '🆕' : f.status === 'D' ? '🗑️' : '📝';
    const status = f.status === 'A' ? 'NEW' : f.status === 'D' ? 'DEL' : 'MOD';
    console.log(`│    ${icon} [${status}] ${f.path.padEnd(53)}│`);
  });

  if (scenario.diffContent) {
    const keywords = [];
    if (/fix/i.test(scenario.diffContent)) keywords.push('fix');
    if (/bug/i.test(scenario.diffContent)) keywords.push('bug');
    if (/optimi/i.test(scenario.diffContent)) keywords.push('optimize');
    if (/cach/i.test(scenario.diffContent)) keywords.push('cache');
    if (/refactor/i.test(scenario.diffContent)) keywords.push('refactor');
    if (/clean/i.test(scenario.diffContent)) keywords.push('clean');
    if (/export\s+class/i.test(scenario.diffContent)) keywords.push('new export');

    if (keywords.length > 0) {
      console.log(`├${'─'.repeat(72)}┤`);
      console.log(`│ 🔍 Detected Keywords: ${keywords.join(', ').padEnd(48)}│`);
    }
  }

  console.log(`├${'─'.repeat(72)}┤`);
  console.log(`│ 📊 Analysis:${' '.repeat(59)}│`);
  console.log(`│    Scopes: ${Array.from(analysis.scopes).join(', ').padEnd(59)}│`);
  console.log(`│    Type Scores: ${[...analysis.detectedTypes.entries()].map(([k,v]) => `${k}:${v}`).join(', ').padEnd(54)}│`);
  console.log(`├${'─'.repeat(72)}┤`);
  console.log(`│ ${result.emoji} OUTPUT: ${result.fullMessage.padEnd(60)}│`);
  console.log(`│    Type: ${result.description.padEnd(61)}│`);
  console.log(`└${'─'.repeat(72)}┘`);
}

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   🎬 SMART COMMIT - SCENARIO SIMULATOR                                       ║
║   বিভিন্ন Changes করলে কেমন Output আসবে দেখো                                  ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

scenarios.forEach((scenario, index) => {
  displayScenario(scenario);
  console.log('');
});

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                           📋 QUICK REFERENCE TABLE                           ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Change Type              │ Example Files                │ Output Type        ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ Single module            │ modules/auth/*.ts            │ feat(auth): add... ║
║ Multiple modules         │ modules/auth, user, msg      │ feat: add auth,... ║
║ Builder files            │ builder/QueryBuilder.ts      │ feat(builder): ... ║
║ Logging files            │ logging/*.ts                 │ feat(logging): ... ║
║ Only .md files           │ README.md, doc/*.md          │ docs: update doc...║
║ Only test files          │ tests/**/*.test.ts           │ test: add tests    ║
║ Only config files        │ package.json, tsconfig.json  │ chore: update ...  ║
║ CI/CD files              │ .github/workflows/*.yml      │ ci: update CI/CD   ║
║ Scripts                  │ scripts/*.js                 │ feat(scripts): ... ║
║ "fix" in diff            │ any file + "fix" keyword     │ fix(...): fix ...  ║
║ "optimize" in diff       │ any file + "optimize" kw     │ perf(...): optim...║
║ "refactor" in diff       │ any file + "refactor" kw     │ refactor: refac... ║
║ File deletion            │ any file (status: D)         │ refactor: remove...║
╚══════════════════════════════════════════════════════════════════════════════╝
`);

console.log(`
💡 TIP: Run "npm run commit" to see real output for your actual changes!
`);
