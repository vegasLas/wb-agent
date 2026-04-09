#!/usr/bin/env node
/**
 * Script to migrate relative imports to @ alias imports
 * Usage: node scripts/migrate-to-alias.js
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

/**
 * Calculate the @ alias path from a relative import
 * @param {string} relativeImport - The relative import path (e.g., '../config/env')
 * @param {string} currentFileDir - Directory of the file containing the import
 * @returns {string|null} - The alias path or null if not applicable
 */
function convertToAlias(relativeImport, currentFileDir) {
  // Skip non-relative imports
  if (!relativeImport.startsWith('./') && !relativeImport.startsWith('../')) {
    return null;
  }

  // Resolve the absolute path of the import
  const resolvedPath = path.resolve(currentFileDir, relativeImport);
  
  // Check if it's within src directory
  if (!resolvedPath.startsWith(SRC_DIR)) {
    return null;
  }

  // Get the relative path from src
  const fromSrc = path.relative(SRC_DIR, resolvedPath);
  
  // Replace backslashes with forward slashes for consistency
  const normalized = fromSrc.replace(/\\/g, '/');
  
  return `@/${normalized}`;
}

/**
 * Process a single file and update imports
 * @param {string} filePath - Path to the TypeScript file
 * @returns {boolean} - Whether any changes were made
 */
function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileDir = path.dirname(filePath);
  
  let modified = false;
  let newContent = content;

  // Regex patterns for different import/export styles
  const patterns = [
    // ES6 imports: import ... from '...'
    /from\s+(['"])(\.\.?\/[^'"]+)\1/g,
    // Dynamic imports: import('...')
    /import\s*\(\s*(['"])(\.\.?\/[^'"]+)\2\s*\)/g,
    // CommonJS requires: require('...')
    /require\s*\(\s*(['"])(\.\.?\/[^'"]+)\3\s*\)/g,
  ];

  for (const pattern of patterns) {
    newContent = newContent.replace(pattern, (match, quote, relativePath) => {
      const aliasPath = convertToAlias(relativePath, fileDir);
      if (aliasPath) {
        modified = true;
        return match.replace(relativePath, aliasPath);
      }
      return match;
    });
  }

  if (modified) {
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log(`✓ Updated: ${path.relative(SRC_DIR, filePath)}`);
    return true;
  }

  return false;
}

/**
 * Recursively find all TypeScript files
 * @param {string} dir - Directory to search
 * @returns {string[]} - Array of file paths
 */
function findTsFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTsFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Main function
 */
function main() {
  console.log('🚀 Migrating relative imports to @ alias...\n');
  
  if (!fs.existsSync(SRC_DIR)) {
    console.error('❌ Error: src directory not found');
    process.exit(1);
  }

  const files = findTsFiles(SRC_DIR);
  console.log(`Found ${files.length} TypeScript files\n`);

  let updatedCount = 0;
  let processedCount = 0;

  for (const file of files) {
    processedCount++;
    if (processFile(file)) {
      updatedCount++;
    }
  }

  console.log(`\n✅ Done! Updated ${updatedCount} files out of ${processedCount} processed.`);
  console.log('\n📋 Summary:');
  console.log(`   - Total files: ${processedCount}`);
  console.log(`   - Files with changes: ${updatedCount}`);
  console.log(`   - Files unchanged: ${processedCount - updatedCount}`);
}

main();
