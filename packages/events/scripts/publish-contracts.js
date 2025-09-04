#!/usr/bin/env node

/**
 * Automated publishing script for event contracts library
 * Copies the built library to consuming services and updates their dependencies
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function publishContracts() {
  console.log('📦 Publishing event contracts to consuming services...');
  
  try {
    // Ensure library is built
    console.log('🔨 Building event contracts library...');
    execSync('npm run build', { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    
    const services = [
      '../../../services/shoot-service',
      '../../../services/user-service', 
      '../../../services/invite-service'
    ];
    
    const packageInfo = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8')
    );
    
    console.log(`📋 Publishing ${packageInfo.name}@${packageInfo.version}`);
    
    for (const servicePath of services) {
      const fullServicePath = path.resolve(__dirname, servicePath);
      const servicePackagePath = path.join(fullServicePath, 'package.json');
      
      if (!fs.existsSync(servicePackagePath)) {
        console.warn(`⚠️  Service not found: ${servicePath}`);
        continue;
      }
      
      const servicePackage = JSON.parse(fs.readFileSync(servicePackagePath, 'utf8'));
      const serviceName = path.basename(fullServicePath);
      
      console.log(`🔄 Updating ${serviceName}...`);
      
      // Update or add dependency
      if (!servicePackage.dependencies) {
        servicePackage.dependencies = {};
      }
      
      // Use workspace reference for local development
      servicePackage.dependencies[packageInfo.name] = 'workspace:*';
      
      // Write updated package.json
      fs.writeFileSync(
        servicePackagePath,
        JSON.stringify(servicePackage, null, 2) + '\n'
      );
      
      console.log(`✅ Updated ${serviceName} dependency to ${packageInfo.name}@workspace:*`);
    }
    
    console.log('\n🎉 Event contracts published successfully!');
    console.log('\nServices can now import events like:');
    console.log('```typescript');
    console.log('import { ShootCreatedEvent, USER_EVENT_TYPES } from \'@tempsdarret/events\';');
    console.log('```');
    
    console.log('\n💡 Next steps:');
    console.log('1. Run `npm install` in each service directory');
    console.log('2. Update service imports to use shared contracts');
    console.log('3. Remove duplicate event type definitions');
    
  } catch (error) {
    console.error('❌ Failed to publish contracts:', error.message);
    process.exit(1);
  }
}

// Run publishing
if (import.meta.url === `file://${process.argv[1]}`) {
  publishContracts()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { publishContracts };