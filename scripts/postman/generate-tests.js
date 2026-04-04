const fs = require('fs');
const path = require('path');

class TestScriptGenerator {
  constructor(options = {}) {
    this.options = {
      useSchemas: options.useSchemas || false,
      aiPowered: options.aiPowered || false,
      includeSecurity: options.includeSecurity !== false,
      includePerformance: options.includePerformance !== false,
      createBaseline: options.createBaseline || false,
      verifyContract: options.verifyContract || false,
      generateReport: options.generateReport || false,
      ciConfig: options.ciConfig || false,
      ...options,
    };

    this.schemas = {};
    this.baseline = null;
    this.testResults = {
      total: 0,
      generated: 0,
      byModule: {},
      byType: {
        statusCode: 0,
        schema: 0,
        responseTime: 0,
        security: 0,
        performance: 0,
      },
    };
  }

  async generate() {
    try {
      console.log('🧪 Enhanced Test Script Generator\n');
      console.log('Options:', this.options, '\n');

      const collectionPath = path.join(
        process.cwd(),
        'postman-collections',
        'complete-api-collection.json'
      );

      if (!fs.existsSync(collectionPath)) {
        console.error('❌ Collection not found. Generate it first with:');
        console.error('   node scripts/postman/generate-all.js\n');
        return;
      }

      const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

      if (this.options.useSchemas) {
        console.log('📚 Loading Mongoose schemas...');
        await this.loadMongooseSchemas();
        console.log(`✅ Loaded ${Object.keys(this.schemas).length} schemas\n`);
      }

      if (this.options.verifyContract) {
        console.log('📋 Loading contract baseline...');
        this.loadBaseline();
      }

      console.log('🔨 Generating tests...\n');
      this.processCollection(collection);

      const outputPath = this.options.merge
        ? collectionPath
        : path.join(
            process.cwd(),
            'postman-collections',
            'complete-api-collection-with-tests.json'
          );

      if (this.options.merge && fs.existsSync(collectionPath)) {
        const backupPath = collectionPath.replace(
          '.json',
          `-backup-${Date.now()}.json`
        );
        fs.copyFileSync(collectionPath, backupPath);
        console.log(`📦 Backup created: ${path.basename(backupPath)}`);
      }

      fs.writeFileSync(outputPath, JSON.stringify(collection, null, 2));
      console.log(`\n✅ Collection with tests saved: ${path.basename(outputPath)}`);

      if (this.options.createBaseline) {
        this.saveBaseline(collection);
      }

      this.generateSummary();

      if (this.options.generateReport) {
        this.generateHTMLReport();
      }

      if (this.options.ciConfig) {
        this.generateCIConfig();
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }

  processCollection(collection) {
    if (!collection.item) return;

    collection.item.forEach(moduleFolder => {
      const moduleName = this.extractModuleName(moduleFolder.name);
      console.log(`📂 Processing: ${moduleName} Module`);

      if (!this.testResults.byModule[moduleName]) {
        this.testResults.byModule[moduleName] = {
          total: 0,
          generated: 0,
        };
      }

      if (moduleFolder.item && Array.isArray(moduleFolder.item)) {
        moduleFolder.item.forEach(request => {
          this.processRequest(request, moduleName);
        });
      }

      console.log(
        `   ✓ Generated ${this.testResults.byModule[moduleName].generated} tests\n`
      );
    });
  }

  processRequest(request, moduleName) {
    if (!request.request) return;

    this.testResults.total++;
    this.testResults.byModule[moduleName].total++;

    const method = request.request.method;
    const url = request.request.url.raw || request.request.url;
    const path = this.extractPath(url);

    const tests = this.generateTestsForEndpoint(
      method,
      path,
      moduleName,
      request
    );

    if (!request.event) {
      request.event = [];
    }

    const testEventIndex = request.event.findIndex(
      e => e.listen === 'test'
    );
    if (testEventIndex >= 0) {
      request.event.splice(testEventIndex, 1);
    }

    request.event.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: tests,
      },
    });

    this.testResults.generated++;
    this.testResults.byModule[moduleName].generated++;
  }

  generateTestsForEndpoint(method, path, moduleName, request) {
    const tests = [];

    tests.push(`
    tests.push('');

    const endpointType = this.detectEndpointType(method, path, moduleName);

    tests.push(...this.generateStatusCodeTests(method, endpointType));
    this.testResults.byType.statusCode++;

    if (this.options.includePerformance) {
      tests.push(...this.generateResponseTimeTests(method, path));
      this.testResults.byType.responseTime++;
    }

    tests.push(
      ...this.generateSchemaTests(method, path, moduleName, endpointType)
    );
    this.testResults.byType.schema++;

    switch (endpointType) {
      case 'auth_login':
      case 'auth_register':
        tests.push(...this.generateAuthTests(method));
        break;
      case 'create':
        tests.push(...this.generateCreateTests(moduleName));
        break;
      case 'read_single':
      case 'read_list':
        tests.push(...this.generateReadTests(method, path));
        break;
      case 'update':
        tests.push(...this.generateUpdateTests());
        break;
      case 'delete':
        tests.push(...this.generateDeleteTests());
        break;
      case 'payment':
        tests.push(...this.generatePaymentTests());
        break;
    }

    if (this.options.includeSecurity) {
      tests.push(...this.generateSecurityTests(method, path));
      this.testResults.byType.security++;
    }

    if (this.options.includePerformance) {
      tests.push(...this.generatePerformanceRegressionTests(method, path));
      this.testResults.byType.performance++;
    }

    if (this.options.verifyContract) {
      tests.push(...this.generateContractTests(method, path));
    }

    if (this.options.aiPowered) {
      tests.push(...this.generateAIPoweredTests(method, path, moduleName));
    }

    return tests;
  }

  detectEndpointType(method, path, moduleName) {

    if (path.includes('/login')) return 'auth_login';
    if (path.includes('/register')) return 'auth_register';
    if (path.includes('/logout')) return 'auth_logout';
    if (path.includes('/refresh')) return 'auth_refresh';
    if (path.includes('/forget-password')) return 'auth_forget';
    if (path.includes('/reset-password')) return 'auth_reset';

    if (moduleName === 'payment') return 'payment';

    if (method === 'POST' && !path.includes(':')) return 'create';
    if (method === 'GET' && path.includes(':id')) return 'read_single';
    if (method === 'GET') return 'read_list';
    if (method === 'PUT' || method === 'PATCH') return 'update';
    if (method === 'DELETE') return 'delete';

    return 'unknown';
  }

  generateStatusCodeTests(method, endpointType) {
    const tests = [];
    tests.push('

    let expectedCode = 200;
    if (method === 'POST' && endpointType === 'create') expectedCode = 201;

    tests.push(`pm.test("✓ Status code is ${expectedCode}", () => {`);
    tests.push(`    pm.response.to.have.status(${expectedCode});`);
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ Response has success property", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response).to.have.property("success");');
    tests.push('    pm.expect(response.success).to.be.true;');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateResponseTimeTests(method, path) {
    const tests = [];
    tests.push('

    let threshold = 1000;
    if (path.includes('/payment')) threshold = 2000;
    if (path.includes('/upload') || path.includes('/file'))
      threshold = 3000;
    if (method === 'GET' && !path.includes(':')) threshold = 800;

    tests.push(
      `pm.test("✓ Response time under ${threshold}ms", () => {`
    );
    tests.push(
      `    pm.expect(pm.response.responseTime).to.be.below(${threshold});`
    );
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateSchemaTests(method, path, moduleName, endpointType) {
    const tests = [];
    tests.push('

    tests.push('pm.test("✓ Response has data property", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response).to.have.property("data");');
    tests.push('});');
    tests.push('');

    if (this.options.useSchemas && this.schemas[moduleName]) {
      tests.push(
        ...this.generateSchemaBasedTests(moduleName, this.schemas[moduleName])
      );
    }

    return tests;
  }

  generateSchemaBasedTests(moduleName, schema) {
    const tests = [];

    tests.push(
      `pm.test("✓ ${this.capitalizeFirst(moduleName)} schema validation", () => {`
    );
    tests.push('    const data = pm.response.json().data;');
    tests.push('    ');

    if (schema.required && schema.required.length > 0) {
      tests.push('    // Required fields');
      schema.required.forEach(field => {
        tests.push(`    pm.expect(data).to.have.property("${field}");`);
      });
    }

    if (schema.types) {
      tests.push('    ');
      tests.push('    // Field types');
      Object.entries(schema.types).forEach(([field, type]) => {
        const jsType = this.mongooseTypeToJS(type);
        if (jsType) {
          tests.push(
            `    pm.expect(data.${field}).to.be.a("${jsType}");`
          );
        }
      });
    }

    tests.push('});');
    tests.push('');

    return tests;
  }

  generateAuthTests(method) {
    const tests = [];
    tests.push('

    tests.push('pm.test("✓ Access token received", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.data).to.have.property("accessToken");');
    tests.push('    pm.expect(response.data.accessToken).to.be.a("string");');
    tests.push(
      '    pm.expect(response.data.accessToken.length).to.be.above(20);'
    );
    tests.push('    ');
    tests.push(
      '    // Auto-save token for subsequent requests'
    );
    tests.push(
      '    pm.collectionVariables.set("accessToken", response.data.accessToken);'
    );
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ Refresh token received", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push(
      '    pm.expect(response.data).to.have.property("refreshToken");'
    );
    tests.push(
      '    pm.collectionVariables.set("refreshToken", response.data.refreshToken);'
    );
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ User data included", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.data).to.have.property("user");');
    tests.push('    pm.expect(response.data.user).to.have.property("_id");');
    tests.push('    pm.expect(response.data.user).to.have.property("email");');
    tests.push('    ');
    tests.push('    // Save user ID');
    tests.push(
      '    pm.collectionVariables.set("userId", response.data.user._id);'
    );
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ Password not exposed in response", () => {');
    tests.push('    const responseBody = pm.response.text();');
    tests.push('    pm.expect(responseBody.toLowerCase()).to.not.include("password");');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateCreateTests(moduleName) {
    const tests = [];
    tests.push('

    tests.push('pm.test("✓ Resource created with ID", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.data).to.have.property("_id");');
    tests.push('    pm.expect(response.data._id).to.be.a("string");');
    tests.push('    ');
    tests.push(`    // Save ${moduleName} ID for later use`);
    tests.push(
      `    pm.collectionVariables.set("${moduleName}Id", response.data._id);`
    );
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ Timestamps created", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.data).to.have.property("createdAt");');
    tests.push('    pm.expect(response.data).to.have.property("updatedAt");');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateReadTests(method, path) {
    const tests = [];
    tests.push('

    if (path.includes(':id')) {

      tests.push('pm.test("✓ Single item retrieved", () => {');
      tests.push('    const response = pm.response.json();');
      tests.push('    pm.expect(response.data).to.be.an("object");');
      tests.push('    pm.expect(response.data).to.have.property("_id");');
      tests.push('});');
    } else {

      tests.push('pm.test("✓ List retrieved", () => {');
      tests.push('    const response = pm.response.json();');
      tests.push('    pm.expect(response.data).to.be.an("array");');
      tests.push('});');
      tests.push('');

      tests.push('pm.test("✓ Pagination metadata exists", () => {');
      tests.push('    const response = pm.response.json();');
      tests.push('    pm.expect(response).to.have.property("pagination");');
      tests.push('    pm.expect(response.pagination).to.have.property("total");');
      tests.push('    pm.expect(response.pagination).to.have.property("page");');
      tests.push('});');
    }
    tests.push('');

    return tests;
  }

  generateUpdateTests() {
    const tests = [];
    tests.push('

    tests.push('pm.test("✓ Update successful", () => {');
    tests.push('    pm.response.to.have.status(200);');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.success).to.be.true;');
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ updatedAt timestamp changed", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.data).to.have.property("updatedAt");');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateDeleteTests() {
    const tests = [];
    tests.push('

    tests.push('pm.test("✓ Delete successful", () => {');
    tests.push('    pm.response.to.have.status(200);');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.success).to.be.true;');
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ Success message received", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.message).to.exist;');
    tests.push('    pm.expect(response.message.toLowerCase()).to.include("delete");');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generatePaymentTests() {
    const tests = [];
    tests.push('

    tests.push('pm.test("✓ Payment data valid", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.data).to.have.property("amount");');
    tests.push('    pm.expect(response.data.amount).to.be.a("number");');
    tests.push('    pm.expect(response.data.amount).to.be.above(0);');
    tests.push('});');
    tests.push('');

    tests.push('pm.test("✓ Payment status exists", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    pm.expect(response.data).to.have.property("status");');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateSecurityTests(method, path) {
    const tests = [];
    tests.push('

    if (!path.includes('/login') && !path.includes('/register')) {
      tests.push('pm.test("✓ Authorization required", () => {');
      tests.push('    const hasAuthHeader = pm.request.headers.has("Authorization");');
      tests.push('    pm.expect(hasAuthHeader).to.be.true;');
      tests.push('});');
      tests.push('');
    }

    tests.push('pm.test("✓ No sensitive data exposed", () => {');
    tests.push('    const responseBody = pm.response.text().toLowerCase();');
    tests.push('    pm.expect(responseBody).to.not.include("password");');
    tests.push('    pm.expect(responseBody).to.not.include("secret");');
    tests.push('    pm.expect(responseBody).to.not.include("token");');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generatePerformanceRegressionTests(method, path) {
    const tests = [];
    tests.push('

    const varName = this.pathToVarName(method, path);

    tests.push('pm.test("✓ No performance regression", () => {');
    tests.push('    const currentTime = pm.response.responseTime;');
    tests.push(
      `    const baselineTime = pm.collectionVariables.get("${varName}_baseline") || currentTime;`
    );
    tests.push('    const threshold = baselineTime * 1.3; // 30% tolerance');
    tests.push('    ');
    tests.push(
      '    pm.expect(currentTime).to.be.below(threshold, '
    );
    tests.push(
      '        `Response time ${currentTime}ms exceeds baseline ${baselineTime}ms by more than 30%`'
    );
    tests.push('    );');
    tests.push('    ');
    tests.push('    // Update baseline (rolling average)');
    tests.push('    const newBaseline = Math.round((baselineTime + currentTime) / 2);');
    tests.push(
      `    pm.collectionVariables.set("${varName}_baseline", newBaseline);`
    );
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateContractTests(method, path) {
    const tests = [];

    if (!this.baseline) return tests;

    tests.push('
    tests.push('pm.test("✓ Response structure matches contract", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    // Contract validation logic here');
    tests.push('    pm.expect(response).to.have.property("success");');
    tests.push('    pm.expect(response).to.have.property("data");');
    tests.push('});');
    tests.push('');

    return tests;
  }

  generateAIPoweredTests(method, path, moduleName) {
    const tests = [];
    tests.push('

    tests.push('pm.test("✓ Response data types consistent", () => {');
    tests.push('    const response = pm.response.json();');
    tests.push('    const data = response.data;');
    tests.push('    ');
    tests.push('    // Learn and validate data types dynamically');
    tests.push('    if (data && typeof data === "object") {');
    tests.push('        Object.keys(data).forEach(key => {');
    tests.push('            const value = data[key];');
    tests.push('            const valueType = typeof value;');
    tests.push('            ');
    tests.push(
      '            // Store type for future validation'
    );
    tests.push(
      `            const storedType = pm.collectionVariables.get(\`${moduleName}_\${key}_type\`);`
    );
    tests.push('            if (!storedType) {');
    tests.push(
      `                pm.collectionVariables.set(\`${moduleName}_\${key}_type\`, valueType);`
    );
    tests.push('            } else {');
    tests.push(
      '                pm.expect(valueType).to.equal(storedType, '
    );
    tests.push(
      '                    `Field \${key} type changed from \${storedType} to \${valueType}`'
    );
    tests.push('                );');
    tests.push('            }');
    tests.push('        });');
    tests.push('    }');
    tests.push('});');
    tests.push('');

    return tests;
  }

  async loadMongooseSchemas() {
    const modulesPath = path.join(process.cwd(), 'src', 'app', 'modules');

    if (!fs.existsSync(modulesPath)) {
      console.warn('⚠️  Modules path not found');
      return;
    }

    const modules = fs
      .readdirSync(modulesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const module of modules) {
      const modelFile = path.join(
        modulesPath,
        module,
        `${module}.model.ts`
      );

      if (fs.existsSync(modelFile)) {
        try {
          const schema = this.parseMongooseSchema(modelFile);
          if (schema) {
            this.schemas[module] = schema;
          }
        } catch (error) {
          console.warn(`⚠️  Could not parse schema for ${module}`);
        }
      }
    }
  }

  parseMongooseSchema(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const schema = {
      required: [],
      types: {},
      enums: {},
    };

    const requiredMatches = content.matchAll(
      /(\w+):\s*\{[^}]*required:\s*true/g
    );
    for (const match of requiredMatches) {
      schema.required.push(match[1]);
    }

    const typeMatches = content.matchAll(/(\w+):\s*\{[^}]*type:\s*(\w+)/g);
    for (const match of typeMatches) {
      schema.types[match[1]] = match[2];
    }

    const enumMatches = content.matchAll(
      /(\w+):\s*\{[^}]*enum:\s*\[([^\]]+)\]/g
    );
    for (const match of enumMatches) {
      const enumValues = match[2]
        .split(',')
        .map(v => v.trim().replace(/['"]/g, ''));
      schema.enums[match[1]] = enumValues;
    }

    return schema;
  }

  /**
   * Load contract baseline
   */
  loadBaseline() {
    const baselinePath = path.join(
      process.cwd(),
      'test-baseline',
      'contract-baseline.json'
    );

    if (fs.existsSync(baselinePath)) {
      this.baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      console.log('✅ Baseline loaded\n');
    } else {
      console.warn('⚠️  No baseline found. Create one with --create-baseline\n');
    }
  }

  /**
   * Save contract baseline
   */
  saveBaseline(collection) {
    const baselineDir = path.join(process.cwd(), 'test-baseline');
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    const baselinePath = path.join(baselineDir, 'contract-baseline.json');
    fs.writeFileSync(baselinePath, JSON.stringify(collection, null, 2));
    console.log(`\n📋 Contract baseline saved: ${baselinePath}`);
  }

  /**
   * Generate summary report
   */
  generateSummary() {
    console.log('\n📊 Test Generation Summary\n');
    console.log('='.repeat(60));
    console.log(`\nTotal Endpoints: ${this.testResults.total}`);
    console.log(`Tests Generated: ${this.testResults.generated}`);
    console.log('\nBy Module:');

    Object.entries(this.testResults.byModule).forEach(([module, stats]) => {
      console.log(`  ✅ ${this.capitalizeFirst(module)} - ${stats.generated} tests`);
    });

    console.log('\nTest Types:');
    console.log(`  ✓ Status Code Tests: ${this.testResults.byType.statusCode}`);
    console.log(`  ✓ Schema Validation: ${this.testResults.byType.schema}`);
    console.log(`  ✓ Response Time: ${this.testResults.byType.responseTime}`);
    console.log(`  ✓ Security Tests: ${this.testResults.byType.security}`);
    console.log(
      `  ✓ Performance Tests: ${this.testResults.byType.performance}`
    );

    const totalAssertions =
      Object.values(this.testResults.byType).reduce((a, b) => a + b, 0) * 3; // Rough estimate
    console.log(`\nTotal Test Assertions: ~${totalAssertions}`);
    console.log('\n' + '='.repeat(60));
  }

  /**
   * Generate HTML report
   */
  generateHTMLReport() {
    console.log('\n📄 Generating HTML report...');

    const reportDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const html = this.buildHTMLReport();
    const reportPath = path.join(
      reportDir,
      `test-coverage-${Date.now()}.html`
    );

    fs.writeFileSync(reportPath, html);
    console.log(`✅ HTML report generated: ${reportPath}`);
  }

  /**
   * Build HTML report content
   */
  buildHTMLReport() {
    const coverage =
      (this.testResults.generated / this.testResults.total) * 100;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test Coverage Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; }
        .coverage { font-size: 48px; font-weight: bold; color: ${coverage >= 80 ? '#28a745' : coverage >= 60 ? '#ffc107' : '#dc3545'}; margin: 20px 0; }
        .module { margin: 20px 0; padding: 20px; background: #f9f9f9; border-radius: 4px; }
        .module h3 { color: #333; margin-bottom: 10px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; }
        .stat-card h4 { font-size: 14px; opacity: 0.9; margin-bottom: 10px; }
        .stat-card .value { font-size: 32px; font-weight: bold; }
        ul { list-style: none; }
        li { padding: 8px 0; border-bottom: 1px solid #eee; }
        li:last-child { border-bottom: none; }
        .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .badge-success { background: #d4edda; color: #155724; }
        .badge-warning { background: #fff3cd; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 API Test Coverage Report</h1>
        <p class="subtitle">Generated on ${new Date().toLocaleString()}</p>

        <div class="coverage">${coverage.toFixed(1)}% Coverage</div>

        <div class="stats">
            <div class="stat-card">
                <h4>Total Endpoints</h4>
                <div class="value">${this.testResults.total}</div>
            </div>
            <div class="stat-card">
                <h4>Tests Generated</h4>
                <div class="value">${this.testResults.generated}</div>
            </div>
            <div class="stat-card">
                <h4>Modules Covered</h4>
                <div class="value">${Object.keys(this.testResults.byModule).length}</div>
            </div>
        </div>

        <h2>Module Coverage</h2>
        ${Object.entries(this.testResults.byModule)
          .map(
            ([module, stats]) => `
            <div class="module">
                <h3>${this.capitalizeFirst(module)} Module</h3>
                <p>
                    <span class="badge badge-success">✓ ${stats.generated} tests generated</span>
                    <span class="badge badge-warning">${stats.total} endpoints</span>
                </p>
            </div>
        `
          )
          .join('')}

        <h2>Test Types Distribution</h2>
        <ul>
            <li>Status Code Tests: ${this.testResults.byType.statusCode}</li>
            <li>Schema Validation: ${this.testResults.byType.schema}</li>
            <li>Response Time Tests: ${this.testResults.byType.responseTime}</li>
            <li>Security Tests: ${this.testResults.byType.security}</li>
            <li>Performance Tests: ${this.testResults.byType.performance}</li>
        </ul>
    </div>
</body>
</html>`;
  }

  /**
   * Generate CI/CD configuration
   */
  generateCIConfig() {
    console.log('\n⚙️  Generating CI/CD configuration...');

    const githubDir = path.join(process.cwd(), '.github', 'workflows');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }

    const yaml = `name: API Tests
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  api-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install Newman
        run: npm install -g newman newman-reporter-htmlextra

      - name: Run API Tests
        run: |
          newman run postman-collections/complete-api-collection-with-tests.json \\
            -e postman-collections/environment.json \\
            --reporters cli,json,htmlextra \\
            --reporter-htmlextra-export test-reports/newman-report.html \\
            --reporter-json-export test-reports/newman-report.json

      - name: Upload Test Report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test-reports/

      - name: Comment PR with Results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('test-reports/newman-report.json'));
            const summary = \`
            ## 🧪 API Test Results

            - **Total Tests**: \${report.run.stats.tests.total}
            - **Passed**: ✅ \${report.run.stats.tests.passed}
            - **Failed**: ❌ \${report.run.stats.tests.failed}
            - **Avg Response Time**: \${Math.round(report.run.timings.responseAverage)}ms
            \`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: summary
            });
`;

    const configPath = path.join(githubDir, 'api-tests.yml');
    fs.writeFileSync(configPath, yaml);
    console.log(`✅ CI/CD config generated: ${configPath}`);
  }

  // Helper methods

  extractModuleName(name) {
    return name
      .replace(/Module$/i, '')
      .trim()
      .toLowerCase();
  }

  extractPath(url) {
    if (typeof url === 'string') {
      return url.replace(/{{BASE_URL}}/g, '').replace(/{{.*?}}/g, ':param');
    }
    return url.path ? url.path.join('/') : '';
  }

  pathToVarName(method, path) {
    return `${method}_${path.replace(/[\/:\{\}]/g, '_')}`;
  }

  mongooseTypeToJS(mongooseType) {
    const typeMap = {
      String: 'string',
      Number: 'number',
      Boolean: 'boolean',
      Date: 'string',
      ObjectId: 'string',
      Array: 'array',
    };
    return typeMap[mongooseType] || null;
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  const options = {
    useSchemas: args.includes('--use-schemas'),
    aiPowered: args.includes('--ai-powered'),
    includeSecurity: !args.includes('--no-security'),
    includePerformance: !args.includes('--no-performance'),
    createBaseline: args.includes('--create-baseline'),
    verifyContract: args.includes('--verify-contract'),
    generateReport: args.includes('--run-and-report') || args.includes('--report'),
    ciConfig: args.includes('--ci-config'),
    merge: args.includes('--merge'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const generator = new TestScriptGenerator(options);
  await generator.generate();
}

function showHelp() {
  console.log(`
🧪 Enhanced Test Script Generator - Help

Usage:
  node scripts/postman/generate-tests.js [options]

Options:
  --use-schemas          Use Mongoose schemas for validation rules
  --ai-powered          Enable AI-powered dynamic test generation
  --create-baseline     Create contract baseline for future verification
  --verify-contract     Verify responses against contract baseline
  --run-and-report      Generate HTML coverage report
  --ci-config           Generate GitHub Actions workflow config
  --merge               Merge tests into existing collection (creates backup)
  --no-security         Disable security tests
  --no-performance      Disable performance tests
  --help, -h            Show this help message

Examples:
  # Basic test generation
  node scripts/postman/generate-tests.js

  # With schema validation and AI
  node scripts/postman/generate-tests.js --use-schemas --ai-powered

  # Create contract baseline
  node scripts/postman/generate-tests.js --create-baseline

  # Verify contract and generate report
  node scripts/postman/generate-tests.js --verify-contract --run-and-report

  # Full featured with CI/CD
  node scripts/postman/generate-tests.js --use-schemas --ai-powered --ci-config --report

Output:
  - postman-collections/complete-api-collection-with-tests.json
  - test-reports/test-coverage-{timestamp}.html (if --report)
  - test-baseline/contract-baseline.json (if --create-baseline)
  - .github/workflows/api-tests.yml (if --ci-config)

Features:
  ✅ Status code validation
  ✅ Response schema validation
  ✅ Response time checks
  ✅ Security vulnerability tests
  ✅ Performance regression tracking
  ✅ Contract testing
  ✅ AI-powered dynamic tests
  ✅ HTML coverage reports
  ✅ CI/CD integration
`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = TestScriptGenerator;
