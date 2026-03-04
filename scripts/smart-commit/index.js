#!/usr/bin/env node

/**
 * Smart Commit Message Generator v3.0
 * ====================================
 * Generates DETAILED commit messages with bullet points showing exactly what changed.
 *
 * Output Format:
 *   feat: update payment integration and user module
 *   - Enhanced PaymentService with new Stripe methods
 *   - Updated UserController error handling
 *   - Added validation schemas for payment flow
 *   - Updated environment configuration
 *
 * Usage:
 *   npm run commit           # Analyze and suggest
 *   npm run commit:auto      # Commit with selection
 *   npm run commit:staged    # Only staged files
 */

const { execSync } = require('child_process');
const readline = require('readline');

// ═══════════════════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════════════════

const CONFIG = {
  types: {
    feat: { priority: 1, emoji: '✨', description: 'New feature', verb: 'add' },
    fix: { priority: 2, emoji: '🐛', description: 'Bug fix', verb: 'fix' },
    refactor: { priority: 3, emoji: '♻️', description: 'Code refactoring', verb: 'refactor' },
    perf: { priority: 4, emoji: '⚡', description: 'Performance improvement', verb: 'optimize' },
    docs: { priority: 5, emoji: '📚', description: 'Documentation', verb: 'update' },
    style: { priority: 6, emoji: '💄', description: 'Code style/formatting', verb: 'format' },
    test: { priority: 7, emoji: '✅', description: 'Tests', verb: 'add tests for' },
    build: { priority: 8, emoji: '📦', description: 'Build system', verb: 'update' },
    ci: { priority: 9, emoji: '🔧', description: 'CI/CD', verb: 'configure' },
    chore: { priority: 10, emoji: '🔨', description: 'Maintenance', verb: 'update' },
  },
  patterns: {
    feat: [/export\s+(class|function|const|interface)/, /implement/i, /added?\s+new/i],
    fix: [/fix(ed|es|ing)?/i, /bug/i, /resolv(e|ed|ing)/i, /correct/i],
    refactor: [/refactor/i, /restructur/i, /clean/i, /simplif/i, /mov(e|ed|ing)/i],
    perf: [/optimi[zs]/i, /perf(ormance)?/i, /cach(e|ing)/i, /fast(er)?/i],
  },
  scopes: {
    'src/app/modules/': (path) => path.split('/')[3],
    'src/app/builder/': () => 'builder',
    'src/app/logging/': () => 'logging',
    'src/app/middlewares/': () => 'middleware',
    'scripts/': () => 'scripts',
    'doc/': () => 'docs',
    'tests/': () => 'test',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Git Operations
// ═══════════════════════════════════════════════════════════════════════════════

function runGit(command) {
  try {
    return execSync(`git ${command}`, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

// Files/folders to ignore in analysis
const IGNORE_PATTERNS = [
  /^dist\//,           // Compiled output
  /^node_modules\//,   // Dependencies
  /\.map$/,            // Source maps
  /\.lock$/,           // Lock files (analyzed separately)
  /^\.git\//,          // Git internals
  /^coverage\//,       // Test coverage
  /\.log$/,            // Log files
];

function shouldIgnoreFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return IGNORE_PATTERNS.some(pattern => pattern.test(normalized));
}

function getChangedFiles(stagedOnly = false) {
  const cmd = stagedOnly ? 'diff --cached --name-status' : 'diff --name-status HEAD';
  const output = runGit(cmd);
  if (!output) return [];
  return output.split('\n').map(line => {
    const [status, ...parts] = line.split('\t');
    return {
      status: status[0],
      path: parts.join('\t'),
      isNew: status === 'A',
      isDeleted: status === 'D',
      isModified: status === 'M',
    };
  }).filter(f => f.path && !shouldIgnoreFile(f.path)); // Ignore dist/ etc.
}

function getFileDiff(filePath, stagedOnly = false) {
  return runGit(`diff ${stagedOnly ? '--cached' : ''} -- "${filePath}"`);
}

function getUntrackedFiles() {
  const output = runGit('ls-files --others --exclude-standard');
  if (!output) return [];
  return output.split('\n').filter(f => f && !shouldIgnoreFile(f));
}

function getShortPath(filePath) {
  return filePath.split(/[/\\]/).pop();
}

function getExtension(filePath) {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

function getBuilderPurpose(builderName) {
  const purposes = {
    'Query': 'database queries',
    'Aggregation': 'MongoDB aggregations',
    'Export': 'data exports',
    'PDF': 'PDF generation',
    'Email': 'email templates',
    'Notification': 'push notifications',
    'Socket': 'real-time events',
    'Cache': 'caching operations',
    'Job': 'background jobs',
    'Test': 'testing utilities',
    'Response': 'API responses',
  };
  return purposes[builderName] || 'utilities';
}

// ═══════════════════════════════════════════════════════════════════════════════
// File Analysis - Extract Detailed Info
// ═══════════════════════════════════════════════════════════════════════════════

function extractFileDetails(filePath, fileInfo, stagedOnly) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const fileName = getShortPath(filePath);

  const result = {
    path: filePath,
    fileName,
    isNew: fileInfo.isNew,
    isDeleted: fileInfo.isDeleted,
    isModified: fileInfo.isModified,
    module: null,
    fileType: null,
    category: null,
    builderName: null,
    scriptType: null,
    description: null, // Human-readable description of change
    addedFunctions: [],
    addedClasses: [],
    linesAdded: 0,
    linesRemoved: 0,
  };

  // Detect file type
  const typePatterns = {
    service: /\.service\.(ts|js)$/,
    controller: /\.controller\.(ts|js)$/,
    model: /\.model\.(ts|js)$/,
    route: /\.route\.(ts|js)$/,
    validation: /\.validation\.(ts|js)$/,
    interface: /\.interface\.(ts|js)$/,
    helper: /[Hh]elper\.(ts|js)$/,
    test: /\.(test|spec)\.(ts|js)$/,
  };

  for (const [type, pattern] of Object.entries(typePatterns)) {
    if (pattern.test(fileName)) {
      result.fileType = type;
      break;
    }
  }

  // Extract module name
  const moduleMatch = normalizedPath.match(/modules\/(\w+)\//);
  if (moduleMatch) {
    result.module = moduleMatch[1];
    result.category = 'module';
  }

  // Detect builder
  const builderMatch = normalizedPath.match(/(\w+)Builder/i);
  if (builderMatch) {
    result.builderName = builderMatch[1];
    result.category = 'builder';
  }

  // Detect script type
  if (normalizedPath.includes('scripts/')) {
    result.category = 'script';
    if (normalizedPath.includes('smart-commit')) result.scriptType = 'commit-helper';
    else if (normalizedPath.includes('generate-module')) result.scriptType = 'module-generator';
    else if (normalizedPath.includes('code-review')) result.scriptType = 'code-reviewer';
    else if (normalizedPath.includes('diagram')) result.scriptType = 'diagram-generator';
    else if (normalizedPath.includes('postman')) result.scriptType = 'postman';
  }

  // Detect other categories
  if (normalizedPath.includes('logging/')) result.category = 'logging';
  if (normalizedPath.endsWith('.md') || normalizedPath.includes('/doc/')) result.category = 'docs';
  if (normalizedPath.endsWith('.json') || normalizedPath.endsWith('.yml')) result.category = 'config';
  if (normalizedPath.includes('/test') || normalizedPath.includes('.test.') || normalizedPath.includes('.spec.')) result.category = 'test';

  // Analyze diff to find what changed
  if (!fileInfo.isDeleted) {
    const diff = getFileDiff(filePath, stagedOnly);
    const diffInfo = analyzeDiffContent(diff);
    result.linesAdded = diffInfo.linesAdded;
    result.linesRemoved = diffInfo.linesRemoved;
    result.addedFunctions = diffInfo.addedFunctions;
    result.addedClasses = diffInfo.addedClasses;
  }

  // Generate human-readable description
  result.description = generateFileDescription(result);

  return result;
}

function analyzeDiffContent(diff) {
  const result = {
    linesAdded: 0,
    linesRemoved: 0,
    addedFunctions: [],
    addedClasses: [],
    addedExports: [],
    changes: [], // Meaningful change descriptions
  };

  if (!diff) return result;

  const lines = diff.split('\n');
  const addedLines = [];

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      result.linesAdded++;
      addedLines.push(line.slice(1));
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      result.linesRemoved++;
    }
  }

  const addedContent = addedLines.join('\n');

  // Skip compiled JS patterns (these are auto-generated)
  const skipPatterns = ['__awaiter', '__generator', '__assign', '__rest', '__decorate', '__param', '__metadata'];

  // Find new TypeScript/JavaScript functions
  // Pattern: async functionName(, function name(, const name = (, name(params):
  const funcPatterns = [
    /(?:async\s+)?function\s+(\w+)\s*\(/g,                    // function name(
    /(?:async\s+)?(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,  // const name = () =>
    /(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/g,    // name(): Type {  (method)
    /(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)/g, // class methods
  ];

  const foundFunctions = new Set();
  for (const pattern of funcPatterns) {
    let match;
    while ((match = pattern.exec(addedContent)) !== null) {
      const name = match[1];
      // Skip common keywords and compiled patterns
      if (name &&
          !['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'new', 'throw', 'await'].includes(name) &&
          !skipPatterns.some(p => name.includes(p)) &&
          !name.startsWith('_') && // Skip private/internal
          name.length > 2) { // Skip very short names
        foundFunctions.add(name);
      }
    }
  }
  result.addedFunctions = [...foundFunctions].slice(0, 5); // Limit to 5

  // Find new classes
  const classMatches = addedContent.match(/class\s+(\w+)/g);
  if (classMatches) {
    result.addedClasses = classMatches
      .map(m => m.replace('class ', ''))
      .filter(name => !skipPatterns.some(p => name.includes(p)));
  }

  // Find new exports
  const exportMatches = addedContent.match(/export\s+(?:class|function|const|interface|type)\s+(\w+)/g);
  if (exportMatches) {
    result.addedExports = exportMatches
      .map(m => m.match(/(\w+)$/)?.[1])
      .filter(Boolean)
      .filter(name => !skipPatterns.some(p => name.includes(p)));
  }

  // Detect meaningful changes from diff content
  if (addedContent.includes('OAuth') || addedContent.includes('oauth')) result.changes.push('OAuth integration');
  if (addedContent.includes('passport')) result.changes.push('authentication');
  if (addedContent.includes('socket') || addedContent.includes('Socket')) result.changes.push('real-time');
  if (addedContent.includes('cache') || addedContent.includes('Cache')) result.changes.push('caching');
  if (addedContent.includes('queue') || addedContent.includes('job')) result.changes.push('background jobs');
  if (addedContent.includes('validation') || addedContent.includes('Zod')) result.changes.push('validation');
  if (addedContent.includes('middleware')) result.changes.push('middleware');
  if (addedContent.includes('index') || addedContent.includes('export')) result.changes.push('exports');

  return result;
}

function generateFileDescription(detail) {
  const action = detail.isNew ? 'Add' : detail.isDeleted ? 'Remove' : 'Update';
  const pastAction = detail.isNew ? 'Added' : detail.isDeleted ? 'Removed' : 'Updated';

  // Builder - with meaningful descriptions
  if (detail.builderName) {
    const builderName = `${detail.builderName}Builder`;
    if (detail.isNew) {
      if (detail.addedFunctions.length > 0) {
        return `Add ${builderName} with ${detail.addedFunctions.slice(0, 3).join(', ')}`;
      }
      return `Add ${builderName} for ${getBuilderPurpose(detail.builderName)}`;
    }
    if (detail.addedFunctions.length > 0) {
      const funcs = detail.addedFunctions.filter(f => f.length > 2).slice(0, 2);
      if (funcs.length > 0) {
        return `Enhance ${builderName} with ${funcs.join(', ')}`;
      }
    }
    return `${action} ${builderName} implementation`;
  }

  // Module files - more specific descriptions
  if (detail.module && detail.fileType) {
    const moduleName = capitalize(detail.module);
    const typeName = capitalize(detail.fileType);

    if (detail.isNew) {
      return `Add ${moduleName}${typeName}`;
    }

    // Try to give meaningful description based on functions
    if (detail.addedFunctions.length > 0) {
      const meaningfulFuncs = detail.addedFunctions.filter(f =>
        f.length > 3 &&
        !['constructor', 'init', 'setup'].includes(f.toLowerCase())
      ).slice(0, 2);

      if (meaningfulFuncs.length > 0) {
        return `${action} ${moduleName}${typeName} (${meaningfulFuncs.join(', ')})`;
      }
    }
    return `${action} ${moduleName}${typeName}`;
  }

  // Scripts - with specific script names
  if (detail.category === 'script') {
    const scriptDescriptions = {
      'commit-helper': 'smart commit message generator',
      'module-generator': 'module code generator',
      'code-reviewer': 'code review system',
      'diagram-generator': 'diagram generator',
      'postman': 'Postman collection',
    };

    // Check for specific script files
    if (detail.fileName.includes('gui') || detail.path.includes('/gui/')) {
      return `${action} module generator GUI`;
    }
    if (detail.fileName.includes('template') || detail.fileName.endsWith('.hbs')) {
      const templateName = detail.fileName.replace('.hbs', '').replace('.template', '');
      return `${action} ${templateName} template`;
    }
    if (detail.fileName.includes('builder')) {
      return `${action} ${detail.fileName.replace('.js', '')} for code generation`;
    }

    const desc = scriptDescriptions[detail.scriptType] || detail.fileName;
    return `${action} ${desc}`;
  }

  // Docs - with readable doc names
  if (detail.category === 'docs') {
    const docName = detail.fileName
      .replace('.md', '')
      .replace(/-bn$/, '') // Remove bangla suffix
      .replace(/-/g, ' ')  // Replace dashes with spaces
      .replace(/complete guide/i, 'guide');
    return `${action} ${docName} docs`;
  }

  // Config - specific config descriptions
  if (detail.category === 'config') {
    if (detail.fileName === 'package.json') return `${action} dependencies`;
    if (detail.fileName === 'package-lock.json') return `${action} package lock`;
    if (detail.fileName === 'tsconfig.json') return `${action} TypeScript config`;
    if (detail.fileName === 'vitest.config.ts') return `${action} test configuration`;
    if (detail.fileName.includes('.env')) return `${action} environment config`;
    return `${action} ${detail.fileName}`;
  }

  // Logging
  if (detail.category === 'logging') {
    if (detail.fileName.includes('opentelemetry')) return `${action} OpenTelemetry setup`;
    if (detail.fileName.includes('autoLabel')) return `${action} auto-labeling system`;
    if (detail.fileName.includes('request')) return `${action} request logging`;
    return `${action} logging configuration`;
  }

  // Test files
  if (detail.category === 'test') {
    const testName = detail.fileName.replace(/\.(test|spec)\.(ts|js)$/, '');
    return `${action} tests for ${testName}`;
  }

  // Default
  return `${action} ${detail.fileName}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Analysis
// ═══════════════════════════════════════════════════════════════════════════════

function analyzeChanges(files, stagedOnly = false) {
  const analysis = {
    files,
    totalFiles: files.length,
    newFiles: files.filter(f => f.isNew).length,
    modifiedFiles: files.filter(f => f.isModified).length,
    deletedFiles: files.filter(f => f.isDeleted).length,
    scopes: new Set(),
    detectedTypes: new Map(),
    linesAdded: 0,
    linesRemoved: 0,
    fileDetails: [],
  };

  for (const file of files) {
    // Detect scope
    const normalizedPath = file.path.replace(/\\/g, '/');
    for (const [pattern, extractor] of Object.entries(CONFIG.scopes)) {
      if (normalizedPath.includes(pattern)) {
        analysis.scopes.add(extractor(normalizedPath));
        break;
      }
    }

    // Extract detailed info
    const details = extractFileDetails(file.path, file, stagedOnly);
    analysis.fileDetails.push(details);
    analysis.linesAdded += details.linesAdded;
    analysis.linesRemoved += details.linesRemoved;

    // Detect commit type from diff
    if (!file.isDeleted) {
      const diff = getFileDiff(file.path, stagedOnly);
      for (const [type, patterns] of Object.entries(CONFIG.patterns)) {
        for (const pattern of patterns) {
          if (pattern.test(diff)) {
            analysis.detectedTypes.set(type, (analysis.detectedTypes.get(type) || 0) + 1);
          }
        }
      }
    }
  }

  return analysis;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Commit Message Generation - THE MAIN MAGIC
// ═══════════════════════════════════════════════════════════════════════════════

function generateCommitSuggestions(analysis) {
  const suggestions = [];

  // Count by category for smarter type detection
  const categoryCounts = {};
  for (const d of analysis.fileDetails) {
    const cat = d.category || 'other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  // Determine primary type based on what makes sense
  let primaryType = 'chore';

  // Rule 1: If mostly new files -> feat
  const newFileRatio = analysis.newFiles / analysis.totalFiles;
  if (newFileRatio > 0.5) {
    primaryType = 'feat';
  }

  // Rule 2: Check pattern matches for explicit types
  let highestScore = 0;
  for (const [type, score] of analysis.detectedTypes) {
    if (score > highestScore) {
      highestScore = score;
      // Only override if pattern match is strong
      if (score >= 3 || newFileRatio < 0.3) {
        primaryType = type;
      }
    }
  }

  // Rule 3: Category-based overrides (strongest rules)
  const docsCount = categoryCounts.docs || 0;
  const testCount = categoryCounts.test || 0;
  const configCount = categoryCounts.config || 0;
  const builderCount = categoryCounts.builder || 0;
  const scriptCount = categoryCounts.script || 0;

  // All docs -> docs
  if (docsCount === analysis.totalFiles) {
    primaryType = 'docs';
  }
  // All tests -> test
  else if (testCount === analysis.totalFiles) {
    primaryType = 'test';
  }
  // All config -> chore
  else if (configCount === analysis.totalFiles) {
    primaryType = 'chore';
  }
  // Mostly builders/scripts with new files -> feat
  else if ((builderCount + scriptCount) > analysis.totalFiles * 0.5 && analysis.newFiles > 0) {
    primaryType = 'feat';
  }
  // Mixed changes with significant new files -> feat
  else if (analysis.newFiles > analysis.modifiedFiles && analysis.newFiles > 5) {
    primaryType = 'feat';
  }

  // Generate the detailed message
  const { subject, bulletPoints } = generateDetailedMessage(analysis, primaryType);

  // Format scope
  const scopes = [...analysis.scopes];
  const scopePart = scopes.length === 1 ? `(${scopes[0]})` : scopes.length <= 3 ? `(${scopes.join(',')})` : '';

  // Create full message with bullet points
  const typeConfig = CONFIG.types[primaryType];
  const headerLine = `${primaryType}${scopePart}: ${subject}`;
  const fullMessageWithBullets = [headerLine, ...bulletPoints.map(b => `- ${b}`)].join('\n');

  suggestions.push({
    type: primaryType,
    subject,
    bulletPoints,
    headerLine,
    fullMessage: fullMessageWithBullets,
    emoji: typeConfig.emoji,
    confidence: 0.85,
  });

  // Alternative types
  const altTypes = Object.keys(CONFIG.types).filter(t => t !== primaryType).slice(0, 2);
  for (const altType of altTypes) {
    const altConfig = CONFIG.types[altType];
    const altHeader = `${altType}${scopePart}: ${subject}`;
    suggestions.push({
      type: altType,
      subject,
      bulletPoints,
      headerLine: altHeader,
      fullMessage: [altHeader, ...bulletPoints.map(b => `- ${b}`)].join('\n'),
      emoji: altConfig.emoji,
      confidence: 0.5,
    });
  }

  return suggestions;
}

function generateDetailedMessage(analysis, type) {
  const details = analysis.fileDetails;
  const bulletPoints = [];

  // Group by category
  const groups = {
    builders: details.filter(f => f.category === 'builder'),
    modules: details.filter(f => f.category === 'module'),
    scripts: details.filter(f => f.category === 'script'),
    logging: details.filter(f => f.category === 'logging'),
    docs: details.filter(f => f.category === 'docs'),
    config: details.filter(f => f.category === 'config'),
    test: details.filter(f => f.category === 'test'),
    other: details.filter(f => !f.category),
  };

  // Generate subject line
  let subject = '';
  const activeGroups = Object.entries(groups).filter(([_, files]) => files.length > 0);

  if (activeGroups.length === 1) {
    const [groupName, files] = activeGroups[0];
    subject = generateGroupSubject(groupName, files, type);
  } else if (activeGroups.length === 2) {
    const names = activeGroups.map(([name]) => name);
    subject = `update ${names.join(' and ')}`;
  } else {
    const topGroups = activeGroups.sort((a, b) => b[1].length - a[1].length).slice(0, 2);
    subject = `update ${topGroups.map(([name]) => name).join(' and ')}`;
  }

  // Smart bullet point generation - group similar items
  const MAX_BULLETS = 10;
  const MAX_PER_GROUP = 3;

  // Builders - group by builder name
  if (groups.builders.length > 0) {
    const builderMap = new Map();
    for (const file of groups.builders) {
      const name = file.builderName || 'Other';
      if (!builderMap.has(name)) builderMap.set(name, []);
      builderMap.get(name).push(file);
    }

    if (builderMap.size <= MAX_PER_GROUP) {
      // Show individual builders
      for (const [name, files] of builderMap) {
        const newFiles = files.filter(f => f.isNew);
        const modFiles = files.filter(f => f.isModified);
        if (newFiles.length > 0) {
          bulletPoints.push(`Add ${name}Builder for ${getBuilderPurpose(name)}`);
        } else if (modFiles.length > 0) {
          const funcs = modFiles.flatMap(f => f.addedFunctions).filter(f => f.length > 2).slice(0, 2);
          if (funcs.length > 0) {
            bulletPoints.push(`Enhance ${name}Builder (${funcs.join(', ')})`);
          } else {
            bulletPoints.push(`Update ${name}Builder`);
          }
        }
      }
    } else {
      // Summarize builders
      const newBuilders = [...builderMap.entries()].filter(([_, files]) => files.some(f => f.isNew)).map(([n]) => n);
      const updatedBuilders = [...builderMap.entries()].filter(([_, files]) => files.some(f => f.isModified) && !files.some(f => f.isNew)).map(([n]) => n);

      if (newBuilders.length > 0) {
        bulletPoints.push(`Add ${newBuilders.length} new builders (${newBuilders.slice(0, 3).join(', ')}${newBuilders.length > 3 ? '...' : ''})`);
      }
      if (updatedBuilders.length > 0) {
        bulletPoints.push(`Update ${updatedBuilders.length} existing builders (${updatedBuilders.slice(0, 3).join(', ')}${updatedBuilders.length > 3 ? '...' : ''})`);
      }
    }
  }

  // Modules - group by module name
  if (groups.modules.length > 0) {
    const moduleMap = new Map();
    for (const file of groups.modules) {
      if (!file.module) continue;
      if (!moduleMap.has(file.module)) moduleMap.set(file.module, []);
      moduleMap.get(file.module).push(file);
    }

    for (const [moduleName, files] of moduleMap) {
      if (files.length === 1) {
        bulletPoints.push(files[0].description);
      } else {
        const types = [...new Set(files.map(f => f.fileType).filter(Boolean))];
        bulletPoints.push(`Update ${moduleName} module (${types.join(', ')})`);
      }
    }
  }

  // Scripts - smart grouping
  if (groups.scripts.length > 0) {
    const scriptGroups = new Map();
    for (const file of groups.scripts) {
      const type = file.scriptType || 'other';
      if (!scriptGroups.has(type)) scriptGroups.set(type, []);
      scriptGroups.get(type).push(file);
    }

    const scriptNames = {
      'commit-helper': 'smart commit generator',
      'module-generator': 'module generator',
      'code-reviewer': 'code review tools',
      'diagram-generator': 'diagram generator',
      'postman': 'Postman scripts',
    };

    for (const [type, files] of scriptGroups) {
      const name = scriptNames[type] || 'scripts';
      const hasNew = files.some(f => f.isNew);
      bulletPoints.push(`${hasNew ? 'Add' : 'Update'} ${name}${files.length > 1 ? ` (${files.length} files)` : ''}`);
    }
  }

  // Logging
  if (groups.logging.length > 0) {
    bulletPoints.push(`Update logging system (${groups.logging.length} files)`);
  }

  // Docs - smart grouping
  if (groups.docs.length > 0) {
    if (groups.docs.length <= 2) {
      for (const file of groups.docs) {
        bulletPoints.push(file.description);
      }
    } else {
      const newDocs = groups.docs.filter(f => f.isNew);
      const updatedDocs = groups.docs.filter(f => f.isModified);
      if (newDocs.length > 0) {
        bulletPoints.push(`Add ${newDocs.length} documentation files`);
      }
      if (updatedDocs.length > 0) {
        bulletPoints.push(`Update ${updatedDocs.length} existing docs`);
      }
    }
  }

  // Config
  if (groups.config.length > 0) {
    if (groups.config.length === 1) {
      bulletPoints.push(groups.config[0].description);
    } else {
      const configNames = groups.config.map(f => f.fileName).slice(0, 3);
      bulletPoints.push(`Update configuration (${configNames.join(', ')}${groups.config.length > 3 ? '...' : ''})`);
    }
  }

  // Tests
  if (groups.test.length > 0) {
    if (groups.test.length <= 2) {
      for (const file of groups.test) {
        bulletPoints.push(file.description);
      }
    } else {
      const newTests = groups.test.filter(f => f.isNew).length;
      const updatedTests = groups.test.filter(f => f.isModified).length;
      if (newTests > 0) bulletPoints.push(`Add ${newTests} test files`);
      if (updatedTests > 0) bulletPoints.push(`Update ${updatedTests} existing tests`);
    }
  }

  // Other - only if we have space
  if (groups.other.length > 0 && bulletPoints.length < MAX_BULLETS - 1) {
    const remaining = MAX_BULLETS - bulletPoints.length - 1;
    for (let i = 0; i < Math.min(groups.other.length, remaining); i++) {
      bulletPoints.push(groups.other[i].description);
    }
    if (groups.other.length > remaining) {
      bulletPoints.push(`...and ${groups.other.length - remaining} more files`);
    }
  }

  // Final limit check
  if (bulletPoints.length > MAX_BULLETS) {
    const summary = bulletPoints.slice(0, MAX_BULLETS - 1);
    const remaining = analysis.totalFiles - summary.length;
    summary.push(`...and ${remaining} more changes`);
    return { subject, bulletPoints: summary };
  }

  return { subject, bulletPoints };
}

function generateGroupSubject(groupName, files, type) {
  const verb = CONFIG.types[type]?.verb || 'update';

  switch (groupName) {
    case 'builders': {
      const names = [...new Set(files.map(f => f.builderName).filter(Boolean))];
      if (names.length === 1) return `${verb} ${names[0]}Builder`;
      if (names.length <= 3) return `${verb} ${names.join(', ')} builders`;
      return `${verb} ${names.length} builder modules`;
    }
    case 'modules': {
      const names = [...new Set(files.map(f => f.module).filter(Boolean))];
      if (names.length === 1) return `${verb} ${names[0]} module`;
      if (names.length <= 3) return `${verb} ${names.join(', ')} modules`;
      return `${verb} ${names.length} modules`;
    }
    case 'scripts': {
      const types = [...new Set(files.map(f => f.scriptType).filter(Boolean))];
      const names = { 'commit-helper': 'commit helper', 'module-generator': 'module generator', 'code-reviewer': 'code review', 'diagram-generator': 'diagram generator', 'postman': 'Postman scripts' };
      if (types.length === 1) return `${verb} ${names[types[0]] || 'scripts'}`;
      return `${verb} development scripts`;
    }
    case 'logging':
      return `${verb} logging and observability`;
    case 'docs': {
      if (files.length === 1) return `${verb} ${files[0].fileName.replace('.md', '')} documentation`;
      return `${verb} documentation`;
    }
    case 'config': {
      if (files.length === 1) return `${verb} ${files[0].fileName}`;
      return `${verb} configuration`;
    }
    case 'test':
      return `${verb} tests`;
    default:
      return `${verb} codebase`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI Interface
// ═══════════════════════════════════════════════════════════════════════════════

function printHeader() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║          🧠 Smart Commit Message Generator v3.0                 ║');
  console.log('║          📝 With Detailed Bullet Points                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');
}

function printAnalysis(analysis) {
  console.log('📊 Change Analysis:');
  console.log('─'.repeat(50));
  console.log(`   Total files:    ${analysis.totalFiles}`);
  console.log(`   New:            ${analysis.newFiles}`);
  console.log(`   Modified:       ${analysis.modifiedFiles}`);
  console.log(`   Deleted:        ${analysis.deletedFiles}`);
  console.log(`   Lines:          +${analysis.linesAdded} / -${analysis.linesRemoved}`);
  if (analysis.scopes.size > 0) {
    console.log(`   Scopes:         ${[...analysis.scopes].join(', ')}`);
  }

  // Show category breakdown
  const categories = new Map();
  for (const d of analysis.fileDetails) {
    const cat = d.category || 'other';
    categories.set(cat, (categories.get(cat) || 0) + 1);
  }
  if (categories.size > 1) {
    console.log('\n   📁 By Category:');
    for (const [cat, count] of categories) {
      console.log(`      ${cat}: ${count} file(s)`);
    }
  }
  console.log('');
}

function printSuggestions(suggestions) {
  console.log('💡 Suggested Commit Messages:');
  console.log('─'.repeat(60));

  suggestions.forEach((s, i) => {
    const conf = Math.round(s.confidence * 100);
    const bar = '█'.repeat(Math.round(conf / 10)) + '░'.repeat(10 - Math.round(conf / 10));

    console.log(`\n  ${i + 1}. ${s.emoji} ${s.headerLine}`);
    s.bulletPoints.forEach(bp => console.log(`     - ${bp}`));
    console.log(`\n     Confidence: ${bar} ${conf}%`);
    console.log(`     Type: ${CONFIG.types[s.type].description}`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const stagedOnly = args.includes('--staged');
  const autoCommit = args.includes('--commit');
  const withEmoji = args.includes('--emoji');

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Smart Commit Message Generator v3.0
===================================
Generates detailed commit messages with bullet points.

Usage:
  npm run commit              # Analyze and suggest
  npm run commit:auto         # Commit with selection
  npm run commit:staged       # Only staged files

Options:
  --staged    Analyze only staged files
  --commit    Interactive commit mode
  --emoji     Include emoji in message
  --help      Show this help
`);
    process.exit(0);
  }

  printHeader();

  // Get files
  let files = getChangedFiles(stagedOnly);
  if (!stagedOnly) {
    files = files.concat(getUntrackedFiles().map(path => ({
      status: 'A', path, isNew: true, isDeleted: false, isModified: false
    })));
  }

  if (files.length === 0) {
    console.log('❌ No changes detected!\n');
    process.exit(1);
  }

  // Analyze
  const analysis = analyzeChanges(files, stagedOnly);
  printAnalysis(analysis);

  // Generate suggestions
  const suggestions = generateCommitSuggestions(analysis);
  printSuggestions(suggestions);

  // Recent commits
  const recent = runGit('log --oneline -5').split('\n').filter(Boolean);
  if (recent.length > 0) {
    console.log('\n📜 Recent Commits:');
    console.log('─'.repeat(50));
    recent.forEach(c => console.log(`   ${c}`));
  }

  console.log('\n');

  // Commit mode
  if (autoCommit) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const choice = await new Promise(r => rl.question('Select (1-3), or q to quit: ', a => { rl.close(); r(a); }));

    if (choice.toLowerCase() === 'q') {
      console.log('Cancelled.');
      process.exit(0);
    }

    const num = parseInt(choice);
    if (num >= 1 && num <= 3) {
      const selected = suggestions[num - 1];
      const msg = withEmoji ? `${selected.emoji} ${selected.fullMessage}` : selected.fullMessage;

      if (!stagedOnly) {
        console.log('\n📦 Staging all changes...');
        execSync('git add -A', { stdio: 'inherit' });
      }

      console.log('\n✅ Creating commit with message:\n');
      console.log(msg.split('\n').map(l => `   ${l}`).join('\n'));
      console.log('');

      try {
        // Use heredoc for multiline commit
        const escapedMsg = msg.replace(/'/g, "'\\''");
        execSync(`git commit -m $'${escapedMsg}'`, { stdio: 'inherit' });
        console.log('\n🎉 Commit created successfully!\n');
      } catch (e) {
        console.error('\n❌ Commit failed:', e.message);
        process.exit(1);
      }
    } else {
      console.log('Invalid choice.');
      process.exit(1);
    }
  } else {
    console.log('💡 Tip: Use --commit flag for interactive commit mode\n');
    console.log('📋 Copy-paste commands:');
    console.log('═'.repeat(60));

    suggestions.forEach((s, i) => {
      const msg = withEmoji ? `${s.emoji} ${s.fullMessage}` : s.fullMessage;
      const escapedMsg = msg.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      console.log(`\n${i + 1}. git add -A && git commit -m "${escapedMsg}"`);
      console.log('\n   Preview:');
      msg.split('\n').forEach(line => console.log(`   │ ${line}`));
    });
    console.log('');
  }
}

main().catch(console.error);
