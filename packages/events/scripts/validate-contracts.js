#!/usr/bin/env node

/**
 * Build-time validation bridge between TypeScript contracts and AsyncAPI spec
 * Ensures TypeScript event contracts remain in sync with AsyncAPI definitions
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validateContractsSync() {
  console.log('🔍 Validating TypeScript contracts against AsyncAPI spec...');
  
  try {
    // Load current AsyncAPI spec
    const asyncAPIPath = path.resolve(__dirname, '../asyncapi.yaml');
    const asyncAPIContent = fs.readFileSync(asyncAPIPath, 'utf8');
    const asyncAPI = yaml.load(asyncAPIContent);
    
    // Extract event types from TypeScript contracts
    const contractPaths = {
      'shoot-service': '../../../services/shoot-service/src/shared/contracts/shoots.events.ts',
      'user-service': '../../../services/user-service/src/shared/contracts/users.events.ts',
      'invitation-service': '../../../services/invitation-service/src/shared/contracts/invites.events.ts'
    };
    
    const errors = [];
    const warnings = [];
    
    // Validate each service's contracts
    for (const [serviceName, contractPath] of Object.entries(contractPaths)) {
      const fullPath = path.resolve(__dirname, contractPath);
      
      if (!fs.existsSync(fullPath)) {
        errors.push(`❌ Contract file not found: ${contractPath}`);
        continue;
      }
      
      const contractContent = fs.readFileSync(fullPath, 'utf8');
      
      // Basic TypeScript parsing - extract interface names and event types
      const interfaceRegex = /export interface (\w+)/g;
      const eventTypeRegex = /eventType:\s*'([^']+)'/g;
      
      const interfaces = [...contractContent.matchAll(interfaceRegex)].map(match => match[1]);
      const eventTypes = [...contractContent.matchAll(eventTypeRegex)].map(match => match[1]);
      
      console.log(`📋 ${serviceName}: Found ${interfaces.length} interfaces, ${eventTypes.length} event types`);
      
      // Validate interfaces exist in AsyncAPI schemas
      for (const interfaceName of interfaces) {
        if (!asyncAPI.components?.schemas?.[interfaceName]) {
          warnings.push(`⚠️  Interface '${interfaceName}' from ${serviceName} not found in AsyncAPI schemas`);
        }
      }
      
      // Validate event types exist in channels
      for (const eventType of eventTypes) {
        const found = Object.values(asyncAPI.channels || {}).some(channel =>
          Object.keys(channel.messages || {}).includes(eventType)
        );
        
        if (!found) {
          errors.push(`❌ Event type '${eventType}' from ${serviceName} not found in AsyncAPI channels`);
        }
      }
    }
    
    // Validate AsyncAPI schemas have corresponding TypeScript interfaces
    const schemaNames = Object.keys(asyncAPI.components?.schemas || {});
    for (const schemaName of schemaNames) {
      let found = false;
      
      for (const [serviceName, contractPath] of Object.entries(contractPaths)) {
        const fullPath = path.resolve(__dirname, contractPath);
        if (fs.existsSync(fullPath)) {
          const contractContent = fs.readFileSync(fullPath, 'utf8');
          if (contractContent.includes(`interface ${schemaName}`)) {
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        warnings.push(`⚠️  AsyncAPI schema '${schemaName}' has no corresponding TypeScript interface`);
      }
    }
    
    // Report results
    console.log('\n📊 Validation Results:');
    console.log(`✅ Validated ${Object.keys(contractPaths).length} service contracts`);
    console.log(`🔍 Found ${schemaNames.length} AsyncAPI schemas`);
    
    if (warnings.length > 0) {
      console.log(`\n⚠️  ${warnings.length} Warning(s):`);
      warnings.forEach(warning => console.log(warning));
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ ${errors.length} Error(s):`);
      errors.forEach(error => console.log(error));
      console.log('\n🔧 Fix these errors to ensure contracts stay in sync!');
      process.exit(1);
    }
    
    console.log('\n✅ All TypeScript contracts are in sync with AsyncAPI spec!');
    
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

// Run validation
if (import.meta.url === `file://${process.argv[1]}`) {
  validateContractsSync()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { validateContractsSync };