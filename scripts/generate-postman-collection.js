const fs = require('fs');
const path = require('path');

/**
 * Smart Postman Collection Generator v2.0
 *
 * Features:
 * - Auto-detects ALL modules from src/routes/index.ts
 * - Parses route files to extract endpoints
 * - Reads validation files to generate accurate request bodies
 * - Extracts JSDoc comments for descriptions
 * - Detects auth requirements from route middleware
 * - Converts :param to {{param}} variables
 * - Generates complete collection with all modules
 *
 * Usage:
 *   node scripts/generate-postman-collection.js           # Generate complete collection
 *   node scripts/generate-postman-collection.js auth      # Generate single module
 */

class SmartPostmanGenerator {
  constructor() {
    this.baseUrl = '{{BASE_URL}}';
    this.modulesPath = path.join(process.cwd(), 'src', 'app', 'modules');
    this.routesIndexPath = path.join(process.cwd(), 'src', 'routes', 'index.ts');
    this.outputDir = path.join(process.cwd(), 'postman-collections');
  }

  /**
   * Main entry point - generates complete collection
   */
  async generateCompleteCollection() {
    console.log('🚀 Starting Smart Postman Collection Generator v2.0...\n');

    const modules = this.detectModulesFromRoutes();
    console.log(`📦 Found ${modules.length} modules:\n`);
    modules.forEach(m => console.log(`   - ${m.name} → ${m.path}`));
    console.log('');

    const collection = {
      info: {
        name: 'Complete API Collection',
        description: 'Auto-generated complete API collection with all modules, smart authentication and dynamic variables',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      variable: this.generateVariables(),
      event: this.generateCollectionEvents(),
    };

    for (const module of modules) {
      console.log(`📝 Processing: ${module.name}...`);
      try {
        const moduleFolder = this.parseModuleFolder(module);
        if (moduleFolder && moduleFolder.item.length > 0) {
          collection.item.push(moduleFolder);
          console.log(`   ✅ Added ${moduleFolder.item.length} endpoints`);
        } else {
          console.log(`   ⚠️  No endpoints found`);
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    this.ensureOutputDir();
    const outputPath = path.join(this.outputDir, 'complete-api-collection.json');
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`\n✅ Collection generated successfully!`);
    console.log(`📁 Saved to: postman-collections/complete-api-collection.json`);
    console.log(`📊 Total modules: ${collection.item.length}`);
    console.log(`📊 Total endpoints: ${collection.item.reduce((sum, m) => sum + m.item.length, 0)}`);
  }

  /**
   * Generate single module collection
   */
  async generateSingleModule(moduleName) {
    console.log(`🚀 Generating collection for module: ${moduleName}\n`);

    const modules = this.detectModulesFromRoutes();
    const module = modules.find(m =>
      m.name.toLowerCase() === moduleName.toLowerCase() ||
      m.folderName.toLowerCase() === moduleName.toLowerCase()
    );

    if (!module) {
      console.log(`❌ Module '${moduleName}' not found!`);
      console.log('\n📋 Available modules:');
      modules.forEach(m => console.log(`   - ${m.name} (${m.folderName})`));
      return;
    }

    const collection = {
      info: {
        name: `${this.capitalize(module.name)} API Collection`,
        description: `Auto-generated collection for ${module.name} module`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [],
      variable: this.generateVariables(),
      event: this.generateCollectionEvents(),
    };

    const moduleFolder = this.parseModuleFolder(module);
    if (moduleFolder) {
      collection.item = moduleFolder.item;
    }

    this.ensureOutputDir();
    const outputPath = path.join(this.outputDir, `${moduleName}-collection.json`);
    fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));

    console.log(`✅ Collection generated: postman-collections/${moduleName}-collection.json`);
    console.log(`📊 Endpoints: ${collection.item.length}`);
  }

  /**
   * Detect modules from src/routes/index.ts
   */
  detectModulesFromRoutes() {
    const modules = [];

    if (!fs.existsSync(this.routesIndexPath)) {
      console.error('❌ Routes index file not found:', this.routesIndexPath);
      return modules;
    }

    const content = fs.readFileSync(this.routesIndexPath, 'utf8');
    const apiRoutesMatch = content.match(/const\s+apiRoutes\s*=\s*\[([\s\S]*?)\];/);

    if (!apiRoutesMatch) {
      console.error('❌ Could not find apiRoutes array');
      return modules;
    }

    const routeEntryRegex = /{\s*path:\s*['"`]([^'"`]+)['"`]\s*,\s*route:\s*(\w+)/g;
    let match;

    while ((match = routeEntryRegex.exec(apiRoutesMatch[1])) !== null) {
      const apiPath = match[1];
      const routeName = match[2];

      const importRegex = new RegExp(
        `import\\s*{\\s*${routeName}\\s*}\\s*from\\s*['"]([^'"]+)['"]`
      );
      const importMatch = content.match(importRegex);

      let moduleFolderName = '';
      if (importMatch) {
        const importPath = importMatch[1];
        const pathParts = importPath.split('/');
        moduleFolderName = pathParts[pathParts.length - 2] || '';
      }

      modules.push({
        name: this.pathToModuleName(apiPath),
        path: apiPath,
        folderName: moduleFolderName,
        routeName: routeName,
      });
    }

    return modules;
  }

  /**
   * Parse a module folder and generate Postman folder
   */
  parseModuleFolder(module) {
    const modulePath = path.join(this.modulesPath, module.folderName);

    if (!fs.existsSync(modulePath)) {
      return null;
    }

    const routeFile = this.findRouteFile(modulePath, module.folderName);
    if (!routeFile) {
      return null;
    }

    const validationFile = this.findValidationFile(modulePath, module.folderName);
    const validationSchemas = validationFile ? this.parseValidationFile(validationFile) : {};

    const endpoints = this.parseRouteFile(routeFile, module.path, validationSchemas, module.folderName);

    return {
      name: `${this.capitalize(module.name)} Module`,
      description: `${this.capitalize(module.name)} related endpoints`,
      item: endpoints,
    };
  }

  /**
   * Find route file in module folder
   */
  findRouteFile(modulePath, folderName) {
    const possibleNames = [
      `${folderName}.route.ts`,
      `${folderName}.routes.ts`,
      'route.ts',
      'routes.ts',
    ];

    for (const name of possibleNames) {
      const filePath = path.join(modulePath, name);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  /**
   * Find validation file in module folder
   */
  findValidationFile(modulePath, folderName) {
    const possibleNames = [
      `${folderName}.validation.ts`,
      'validation.ts',
    ];

    for (const name of possibleNames) {
      const filePath = path.join(modulePath, name);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }
    return null;
  }

  /**
   * Parse validation file to extract schemas with full body content
   */
  parseValidationFile(filePath) {
    const schemas = {};
    const content = fs.readFileSync(filePath, 'utf8');

    // Match each const declaration
    const schemaBlocks = content.split(/(?=const\s+\w+\s*=\s*z\.object)/);

    for (const block of schemaBlocks) {
      const nameMatch = block.match(/const\s+(\w+)\s*=\s*z\.object/);
      if (!nameMatch) continue;

      const schemaName = nameMatch[1];

      // Extract body schema content
      const bodyMatch = block.match(/body:\s*z\.object\s*\(\s*{([\s\S]*?)}\s*\)/);
      if (bodyMatch) {
        const bodyContent = bodyMatch[1];
        const fields = this.extractZodFieldsImproved(bodyContent);
        schemas[schemaName] = fields;
      }
    }

    return schemas;
  }

  /**
   * Improved field extraction from Zod schema
   */
  extractZodFieldsImproved(schemaContent) {
    const fields = {};

    // Match field definitions more accurately
    const lines = schemaContent.split('\n');
    let currentField = null;

    for (const line of lines) {
      // Match field start: fieldName: z.something
      const fieldMatch = line.match(/^\s*(\w+):\s*z\.(string|number|boolean|array|enum|date|object)/);
      if (fieldMatch) {
        currentField = fieldMatch[1];
        const fieldType = fieldMatch[2];

        // Check if it's an array
        if (fieldType === 'array') {
          fields[currentField] = this.generateSampleValue(currentField, 'array');
        } else if (fieldType === 'enum') {
          // Try to extract enum values
          const enumMatch = line.match(/z\.enum\s*\(\s*\[([\s\S]*?)\]/);
          if (enumMatch) {
            const firstValue = enumMatch[1].match(/['"]([^'"]+)['"]/);
            fields[currentField] = firstValue ? firstValue[1] : 'value';
          } else {
            fields[currentField] = 'value';
          }
        } else {
          fields[currentField] = this.generateSampleValue(currentField, fieldType);
        }
      }
    }

    return fields;
  }

  /**
   * Generate sample value for field
   */
  generateSampleValue(fieldName, fieldType) {
    // Field-specific samples with Postman variables
    const fieldSamples = {
      // IDs - use Postman variables
      email: '{{TEST_EMAIL}}',
      password: '{{TEST_PASSWORD}}',
      newPassword: '{{NEW_PASSWORD}}',
      confirmPassword: '{{NEW_PASSWORD}}',
      currentPassword: '{{TEST_PASSWORD}}',

      // Common fields
      name: '{{TEST_NAME}}',
      title: 'Sample Title',
      description: 'Sample description text',

      // Reference IDs - use variables
      chatId: '{{chatId}}',
      messageId: '{{messageId}}',
      userId: '{{userId}}',
      sessionId: '{{sessionId}}',
      paymentId: '{{paymentId}}',
      subjectId: '{{subjectId}}',
      applicationId: '{{applicationId}}',
      subscriptionId: '{{subscriptionId}}',
      billingId: '{{billingId}}',
      reviewId: '{{reviewId}}',
      tutorId: '{{tutorId}}',
      studentId: '{{studentId}}',
      slotId: '{{slotId}}',

      // Subject/Tutor Application
      subject: 'Mathematics',
      subjects: ['Mathematics', 'Physics'],

      // Contact info
      phone: '+49123456789',
      address: '123 Main Street, Berlin, Germany',

      // Dates
      birthDate: '1995-05-15',
      startTime: '{{START_TIME}}',
      endTime: '{{END_TIME}}',
      date: '{{DATE}}',

      // URLs
      cvUrl: 'https://example.com/cv.pdf',
      abiturCertificateUrl: 'https://example.com/abitur.pdf',
      educationProofUrls: ['https://example.com/proof1.pdf'],

      // Status/Reason
      status: 'SUBMITTED',
      reason: 'Sample reason text',
      rejectionReason: 'Application does not meet requirements',
      cancellationReason: 'Need to reschedule the session',
      adminNotes: 'Admin notes here',

      // Codes
      oneTimeCode: 123456,

      // Ratings
      rating: 5,
      overallRating: 5,
      teachingQuality: 5,
      communication: 5,
      punctuality: 5,
      preparedness: 5,

      // Other
      comment: 'This is a sample comment',
      text: 'Sample text message',
      targetId: '{{TARGET_ID}}',
      targetModel: 'Task',
      businessType: 'individual',
      country: 'US',
      isActive: true,
      isRecommended: true,
      isPublic: true,
    };

    if (fieldSamples[fieldName] !== undefined) {
      return fieldSamples[fieldName];
    }

    // Type-based defaults
    switch (fieldType) {
      case 'string':
        return `sample_${fieldName}`;
      case 'number':
        return 0;
      case 'boolean':
        return true;
      case 'array':
        return [];
      case 'date':
        return new Date().toISOString();
      default:
        return '';
    }
  }

  /**
   * Parse route file and extract endpoints
   */
  parseRouteFile(filePath, basePath, validationSchemas, moduleName) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const endpoints = [];

    // Find all router method calls
    const routeRegex = /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
    let match;

    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const matchIndex = match.index;

      // Get the full route definition block (until next router. or end)
      const routeEndIndex = content.indexOf('router.', matchIndex + 1);
      const routeBlock = content.slice(matchIndex, routeEndIndex > 0 ? routeEndIndex : undefined);

      // Extract info
      const { description, access } = this.extractRouteInfo(content, matchIndex, lines);
      const requiresAuth = this.checkAuthRequired(routeBlock);
      const schemaName = this.extractValidationSchema(routeBlock);

      // Build full path with variables
      const fullPath = `/api/v1${basePath}${routePath === '/' ? '' : routePath}`;
      const pathWithVariables = this.convertParamsToVariables(fullPath);

      // Generate endpoint
      const endpoint = this.createEndpoint({
        method,
        path: routePath,
        fullPath,
        pathWithVariables,
        description,
        access,
        requiresAuth,
        schemaName,
        validationSchemas,
        moduleName,
      });

      endpoints.push(endpoint);
    }

    return endpoints;
  }

  /**
   * Check if route requires authentication
   */
  checkAuthRequired(routeBlock) {
    // Check for auth() middleware
    return routeBlock.includes('auth(') || routeBlock.includes('auth,');
  }

  /**
   * Extract validation schema name from route block
   */
  extractValidationSchema(routeBlock) {
    const match = routeBlock.match(/validateRequest\s*\(\s*\w+\.(\w+)\s*\)/);
    return match ? match[1] : null;
  }

  /**
   * Convert :param to {{param}} for Postman
   */
  convertParamsToVariables(path) {
    return path.replace(/:(\w+)/g, '{{$1}}');
  }

  /**
   * Extract route info from JSDoc comments
   */
  extractRouteInfo(content, matchIndex, lines) {
    let description = '';
    let access = 'Private';

    const beforeMatch = content.substring(0, matchIndex);
    const lineNumber = beforeMatch.split('\n').length - 1;

    for (let i = lineNumber - 1; i >= Math.max(0, lineNumber - 20); i--) {
      const line = lines[i].trim();

      if (line.startsWith('router.')) break;

      if (line.includes('@desc')) {
        const descMatch = line.match(/@desc\s+(.+)/);
        if (descMatch) description = descMatch[1].trim();
      }

      if (line.includes('@access')) {
        const accessMatch = line.match(/@access\s+(.+)/);
        if (accessMatch) access = accessMatch[1].trim();
      }

      if (line.startsWith('//') && !description && !line.includes('@')) {
        description = line.replace('//', '').trim();
      }
    }

    return { description, access };
  }

  /**
   * Create Postman endpoint object
   */
  createEndpoint({ method, path, fullPath, pathWithVariables, description, access, requiresAuth, schemaName, validationSchemas, moduleName }) {
    const name = description || this.generateEndpointName(method, path);
    const urlParts = pathWithVariables.split('/').filter(p => p);

    const endpoint = {
      name,
      request: {
        method,
        header: [
          {
            key: 'Content-Type',
            value: 'application/json',
            type: 'text',
          },
        ],
        url: {
          raw: `{{BASE_URL}}${pathWithVariables}`,
          host: ['{{BASE_URL}}'],
          path: urlParts,
        },
      },
      response: [],
    };

    // Add auth if required
    if (requiresAuth) {
      endpoint.request.auth = {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{accessToken}}',
            type: 'string',
          },
        ],
      };
    } else {
      // Mark as no auth
      endpoint.request.auth = {
        type: 'noauth',
      };
    }

    // Add body for POST, PUT, PATCH
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      let bodyContent = {};

      // Try validation schema first
      if (schemaName && validationSchemas[schemaName]) {
        bodyContent = validationSchemas[schemaName];
      }

      // If empty, use defaults
      if (Object.keys(bodyContent).length === 0) {
        bodyContent = this.generateDefaultBody(path, method, moduleName);
      }

      endpoint.request.body = {
        mode: 'raw',
        raw: JSON.stringify(bodyContent, null, 2),
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    }

    // Add test scripts
    const testScript = this.generateTestScript(path, method, moduleName);
    if (testScript) {
      endpoint.event = [
        {
          listen: 'test',
          script: {
            exec: testScript,
            type: 'text/javascript',
          },
        },
      ];
    }

    return endpoint;
  }

  /**
   * Generate default body for common endpoints
   */
  generateDefaultBody(path, method, moduleName) {
    // Auth endpoints
    if (path.includes('login')) {
      return { email: '{{TEST_EMAIL}}', password: '{{TEST_PASSWORD}}' };
    }
    if (path.includes('forget-password') || path.includes('resend-verify')) {
      return { email: '{{TEST_EMAIL}}' };
    }
    if (path.includes('reset-password')) {
      return { newPassword: '{{NEW_PASSWORD}}', confirmPassword: '{{NEW_PASSWORD}}' };
    }
    if (path.includes('change-password')) {
      return {
        currentPassword: '{{TEST_PASSWORD}}',
        newPassword: '{{NEW_PASSWORD}}',
        confirmPassword: '{{NEW_PASSWORD}}',
      };
    }
    if (path.includes('verify-email')) {
      return { email: '{{TEST_EMAIL}}', oneTimeCode: 123456 };
    }
    if (path.includes('refresh-token')) {
      return {};
    }
    if (path.includes('logout')) {
      return {};
    }

    // Subject
    if (moduleName === 'subject') {
      if (method === 'POST') {
        return { name: 'Mathematics', isActive: true };
      }
      if (method === 'PATCH') {
        return { name: 'Updated Subject Name', isActive: true };
      }
    }

    // Tutor Application
    if (moduleName === 'tutorApplication') {
      if (path.includes('reject')) {
        return { rejectionReason: 'Application does not meet requirements' };
      }
      if (path.includes('approve')) {
        return { adminNotes: 'Approved' };
      }
      if (method === 'POST' && path === '/') {
        return {
          // Auth fields
          email: '{{TEST_EMAIL}}',
          password: '{{TEST_PASSWORD}}',
          // Personal info
          name: '{{TEST_NAME}}',
          birthDate: '1995-05-15',
          phone: '+49123456789',
          // Address (structured)
          street: 'Hauptstraße',
          houseNumber: '42',
          zipCode: '10115',
          city: 'Berlin',
          // Subjects
          subjects: ['{{subjectId}}'],
          // Documents (all mandatory)
          cv: 'https://example.com/cv.pdf',
          abiturCertificate: 'https://example.com/abitur.pdf',
          officialIdDocument: 'https://example.com/id.pdf',
        };
      }
    }

    // Interview Slots
    if (moduleName === 'interviewSlot') {
      if (method === 'POST') {
        return {
          startTime: '{{START_TIME}}',
          endTime: '{{END_TIME}}',
          date: '{{DATE}}',
        };
      }
      if (path.includes('book')) {
        return { applicationId: '{{applicationId}}' };
      }
    }

    // Trial Request
    if (moduleName === 'trialRequest') {
      if (method === 'POST' && path === '/') {
        return {
          subject: 'Mathematics',
          description: 'I need help with calculus',
          preferredTime: '{{START_TIME}}',
        };
      }
      if (path.includes('accept')) {
        return {};
      }
    }

    // Session
    if (moduleName === 'session') {
      if (path.includes('propose')) {
        return {
          chatId: '{{chatId}}',
          subject: 'Mathematics',
          startTime: '{{START_TIME}}',
          endTime: '{{END_TIME}}',
          description: 'Session for calculus review',
        };
      }
      if (path.includes('reject')) {
        return { rejectionReason: 'Not available at this time' };
      }
      if (path.includes('cancel')) {
        return { cancellationReason: 'Need to reschedule' };
      }
    }

    // Subscription
    if (moduleName === 'studentSubscription') {
      if (method === 'POST') {
        return {
          plan: 'REGULAR',
          tutorId: '{{tutorId}}',
        };
      }
    }

    // Review
    if (moduleName === 'sessionReview') {
      if (method === 'POST') {
        return {
          sessionId: '{{sessionId}}',
          overallRating: 5,
          teachingQuality: 5,
          communication: 5,
          punctuality: 5,
          preparedness: 5,
          comment: 'Excellent tutor!',
          isRecommended: true,
        };
      }
      if (method === 'PATCH') {
        return {
          overallRating: 4,
          comment: 'Updated review',
        };
      }
    }

    // Chat/Message
    if (path.includes('message') || moduleName === 'message') {
      return { chatId: '{{chatId}}', text: 'Hello, this is a test message!' };
    }

    // Bookmark
    if (path.includes('bookmark') || moduleName === 'bookmark') {
      return { targetId: '{{TARGET_ID}}', targetModel: 'Task' };
    }

    // Payment
    if (moduleName === 'payment') {
      if (path.includes('refund')) {
        return { reason: 'Refund requested by customer' };
      }
      if (path.includes('account')) {
        return { businessType: 'individual', country: 'US' };
      }
    }

    // Notification
    if (path.includes('read')) {
      return {};
    }

    return {};
  }

  /**
   * Generate test scripts for auto-saving IDs
   */
  generateTestScript(path, method, moduleName) {
    // Login - save tokens
    if (path.includes('login') && method === 'POST') {
      return [
        '// Auto-save tokens from login response',
        'const response = pm.response.json();',
        '',
        'if (response.success && response.data) {',
        '  if (response.data.accessToken) {',
        '    pm.collectionVariables.set("accessToken", response.data.accessToken);',
        '    console.log("✅ Access token saved");',
        '  }',
        '',
        '  if (response.data.refreshToken) {',
        '    pm.collectionVariables.set("refreshToken", response.data.refreshToken);',
        '    console.log("✅ Refresh token saved");',
        '  }',
        '',
        '  if (response.data.user && response.data.user._id) {',
        '    pm.collectionVariables.set("userId", response.data.user._id);',
        '    console.log("✅ User ID saved:", response.data.user._id);',
        '  }',
        '}',
      ];
    }

    // Generic ID saving for POST create endpoints
    if (method === 'POST' && (path === '/' || path.match(/^\/[^/]*$/))) {
      const idVar = this.getIdVariableForModule(moduleName);
      if (idVar) {
        return [
          `// Auto-save ${idVar}`,
          'const response = pm.response.json();',
          '',
          'if (response.success && response.data && response.data._id) {',
          `  pm.collectionVariables.set("${idVar}", response.data._id);`,
          `  console.log("✅ ${idVar} saved:", response.data._id);`,
          '}',
        ];
      }
    }

    return null;
  }

  /**
   * Get ID variable name for module
   */
  getIdVariableForModule(moduleName) {
    const moduleIdMap = {
      'chat': 'chatId',
      'message': 'messageId',
      'payment': 'paymentId',
      'session': 'sessionId',
      'subject': 'subjectId',
      'tutorApplication': 'applicationId',
      'interviewSlot': 'slotId',
      'trialRequest': 'trialRequestId',
      'studentSubscription': 'subscriptionId',
      'monthlyBilling': 'billingId',
      'tutorEarnings': 'earningsId',
      'sessionReview': 'reviewId',
    };
    return moduleIdMap[moduleName] || null;
  }

  /**
   * Generate endpoint name from method and path
   */
  generateEndpointName(method, path) {
    if (path === '/') {
      if (method === 'GET') return 'Get All';
      if (method === 'POST') return 'Create';
      return `${method} - Root`;
    }

    const readablePath = path.replace(/:(\w+)/g, '{$1}');
    const parts = readablePath.split('/').filter(p => p);
    const name = parts
      .map(part => {
        if (part.includes('{')) return part;
        return part
          .split('-')
          .map(word => this.capitalize(word))
          .join(' ');
      })
      .join(' - ');

    return `${method} - ${name || 'Root'}`;
  }

  /**
   * Generate collection variables
   */
  generateVariables() {
    return [
      // Base URL
      { key: 'BASE_URL', value: 'http://localhost:5000', type: 'string' },

      // Auth tokens
      { key: 'accessToken', value: '', type: 'string' },
      { key: 'refreshToken', value: '', type: 'string' },

      // User IDs
      { key: 'userId', value: '', type: 'string' },
      { key: 'tutorId', value: '', type: 'string' },
      { key: 'studentId', value: '', type: 'string' },

      // Resource IDs
      { key: 'chatId', value: '', type: 'string' },
      { key: 'messageId', value: '', type: 'string' },
      { key: 'sessionId', value: '', type: 'string' },
      { key: 'paymentId', value: '', type: 'string' },
      { key: 'clientSecret', value: '', type: 'string' },
      { key: 'subjectId', value: '', type: 'string' },
      { key: 'applicationId', value: '', type: 'string' },
      { key: 'slotId', value: '', type: 'string' },
      { key: 'trialRequestId', value: '', type: 'string' },
      { key: 'subscriptionId', value: '', type: 'string' },
      { key: 'billingId', value: '', type: 'string' },
      { key: 'earningsId', value: '', type: 'string' },
      { key: 'reviewId', value: '', type: 'string' },
      { key: 'notificationId', value: '', type: 'string' },
      { key: 'TARGET_ID', value: '', type: 'string' },

      // Test data
      { key: 'TEST_EMAIL', value: 'test@example.com', type: 'string' },
      { key: 'TEST_PASSWORD', value: 'SecurePass123!', type: 'string' },
      { key: 'TEST_NAME', value: 'John Doe', type: 'string' },
      { key: 'NEW_PASSWORD', value: 'NewSecure123!', type: 'string' },
      { key: 'UPDATED_NAME', value: 'Updated Name', type: 'string' },

      // Date/Time (will need to be set manually or via pre-request script)
      { key: 'START_TIME', value: new Date(Date.now() + 86400000).toISOString(), type: 'string' },
      { key: 'END_TIME', value: new Date(Date.now() + 90000000).toISOString(), type: 'string' },
      { key: 'DATE', value: new Date(Date.now() + 86400000).toISOString().split('T')[0], type: 'string' },
    ];
  }

  /**
   * Generate collection-level events
   */
  generateCollectionEvents() {
    return [
      {
        listen: 'prerequest',
        script: {
          type: 'text/javascript',
          exec: [
            '// Auto-inject Bearer token if available and not already set',
            'const token = pm.collectionVariables.get("accessToken");',
            '',
            'if (token && !pm.request.headers.has("Authorization")) {',
            '  pm.request.headers.add({',
            '    key: "Authorization",',
            '    value: "Bearer " + token',
            '  });',
            '}',
            '',
            '// Update dynamic timestamps',
            'const now = new Date();',
            'const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);',
            'const dayAfter = new Date(now.getTime() + 25 * 60 * 60 * 1000);',
            '',
            'pm.collectionVariables.set("START_TIME", tomorrow.toISOString());',
            'pm.collectionVariables.set("END_TIME", dayAfter.toISOString());',
            'pm.collectionVariables.set("DATE", tomorrow.toISOString().split("T")[0]);',
          ],
        },
      },
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            '// Generic response validation',
            'pm.test("Status code is 2xx", function () {',
            '  pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);',
            '});',
            '',
            'pm.test("Response has success field", function () {',
            '  const response = pm.response.json();',
            '  pm.expect(response).to.have.property("success");',
            '});',
          ],
        },
      },
    ];
  }

  /**
   * Convert API path to module name
   */
  pathToModuleName(path) {
    return path
      .replace(/^\//, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => this.capitalize(word))
      .join(' ');
  }

  /**
   * Capitalize first letter
   */
  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Ensure output directory exists
   */
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const generator = new SmartPostmanGenerator();

  if (args.length === 0) {
    await generator.generateCompleteCollection();
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('Smart Postman Collection Generator v2.0');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/generate-postman-collection.js           Generate complete collection');
    console.log('  node scripts/generate-postman-collection.js <module>  Generate single module');
    console.log('  node scripts/generate-postman-collection.js --help    Show this help');
    console.log('');
    console.log('Features:');
    console.log('  - Auto-detects all modules from routes/index.ts');
    console.log('  - Reads validation files for request bodies');
    console.log('  - Detects auth requirements from middleware');
    console.log('  - Converts :param to {{param}} variables');
    console.log('  - Auto-saves tokens and IDs in test scripts');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/generate-postman-collection.js');
    console.log('  node scripts/generate-postman-collection.js auth');
    console.log('  node scripts/generate-postman-collection.js subject');
  } else {
    await generator.generateSingleModule(args[0]);
  }
}

main().catch(console.error);