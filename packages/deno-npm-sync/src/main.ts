/* eslint-disable no-continue */
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface DenoJson {
  imports: Record<string, string>;
}

interface SyncOptions {
  denoJsonPath: string;
  packageJsonPath: string;
  silent?: boolean;
  versionPrecision?: 'auto' | 'major' | 'minor' | 'full';
}

interface SyncResult {
  hasUpdates: boolean;
  updates: Array<{ name: string; oldVersion: string; newVersion: string }>;
}

const JSON_INDENT = 2;
const MAJOR_MINOR_PRECISION = 2;

/**
 * Detects the version precision from a version string
 * @param version - Version string like "1", "1.0", or "1.0.0"
 * @returns Number of version segments (1, 2, or 3)
 */
function detectVersionPrecision(version: string): number {
  const segments = version.split('.');
  return segments.length;
}

/**
 * Formats a version string to match the desired precision
 * @param version - Full version string like "1.2.3"
 * @param precision - Number of segments to keep (1, 2, or 3)
 * @returns Formatted version string
 */
function formatVersion(version: string, precision: number): string {
  const segments = version.split('.');
  return segments.slice(0, precision).join('.');
}

/**
 * Processes a single import entry (npm or jsr)
 * @param denoImport - The import string from deno.json
 * @param registry - Either 'npm' or 'jsr'
 * @param pkg - The package.json object
 * @param versionPrecision - Version precision mode
 * @returns Updated import string or null if no update needed
 */
function processImport(
  denoImport: string,
  registry: 'npm' | 'jsr',
  pkg: PackageJson,
  versionPrecision: 'auto' | 'major' | 'minor' | 'full',
): { newImport: string; name: string; oldVersion: string; newVersion: string } | null {
  // Match registry imports with optional subpath (e.g., npm:pkg@1.0.0 or npm:pkg@1.0.0/subpath)
  const npmPattern = /^npm:(?<name>[^@]+)@(?<version>\d+(?:\.\d+)*)(?<subpath>\/.*)?$/u;
  const jsrPattern =
    /^jsr:(?<name>@[^/@]+\/[^@/]+)@(?<version>\d+(?:\.\d+)*)(?<subpath>\/.*)?$/u;
  const pattern = registry === 'npm' ? npmPattern : jsrPattern;

  const match = denoImport.match(pattern);
  if (!match?.groups) return null;

  const { name, version, subpath } = match.groups;
  if (name == null || version == null) return null;

  const pkgVersion =
    pkg.devDependencies?.[name]?.replace(/^\D*/u, '') ??
    pkg.dependencies?.[name]?.replace(/^\D*/u, '');

  if (pkgVersion == null || pkgVersion === version) return null;

  // Determine the precision to use for the new version
  let finalVersion: string;
  if (versionPrecision === 'major') {
    // Always use only major version
    finalVersion = pkgVersion.split('.')[0] ?? pkgVersion;
  } else if (versionPrecision === 'minor') {
    // Always use major.minor version
    finalVersion = formatVersion(pkgVersion, MAJOR_MINOR_PRECISION);
  } else if (versionPrecision === 'full') {
    // Always use full version (major.minor.patch)
    finalVersion = pkgVersion;
  } else {
    // 'auto' mode: detect precision from current deno.json version and apply to new version
    const currentPrecision = detectVersionPrecision(version);
    finalVersion = formatVersion(pkgVersion, currentPrecision);
  }

  // Skip update if the formatted version matches the current version
  if (finalVersion === version) return null;

  const newImport = `${registry}:${name}@${finalVersion}${subpath ?? ''}`;
  return { newImport, name, oldVersion: version, newVersion: finalVersion };
}

/**
 * Synchronizes npm and JSR package versions from package.json to deno.json imports
 *
 * @param options - Configuration options
 * @param options.denoJsonPath - Path to deno.json file
 * @param options.packageJsonPath - Path to package.json file
 * @param options.silent - If true, suppresses console output
 * @param options.versionPrecision - Version precision mode:
 *   - 'auto': Preserves the version format from deno.json (e.g., "1", "1.0", "1.0.0")
 *   - 'major': Always uses only major version (e.g., "1")
 *   - 'minor': Always uses major.minor version (e.g., "1.0")
 *   - 'full': Always uses full version (e.g., "1.0.0")
 * @returns Object containing sync results
 */
export function syncDenoNpmDependencies(options: SyncOptions): SyncResult {
  const {
    denoJsonPath,
    packageJsonPath,
    silent = false,
    versionPrecision = 'auto',
  } = options;

  // Resolve paths
  const pkgPath = path.resolve(packageJsonPath);
  const denoPath = path.resolve(denoJsonPath);

  // Validate files exist
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`package.json not found at: ${pkgPath}`);
  }
  if (!fs.existsSync(denoPath)) {
    throw new Error(`deno.json not found at: ${denoPath}`);
  }

  // Read and parse files
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as PackageJson;
  const deno = JSON.parse(fs.readFileSync(denoPath, 'utf8')) as DenoJson;

  const updates: Array<{ name: string; oldVersion: string; newVersion: string }> = [];
  let hasUpdates = false;

  for (const [importKey, denoImport] of Object.entries(deno.imports)) {
    if (typeof denoImport !== 'string') continue;

    // Try processing as npm import
    const npmResult = processImport(denoImport, 'npm', pkg, versionPrecision);
    if (npmResult) {
      deno.imports[importKey] = npmResult.newImport;
      updates.push({
        name: npmResult.name,
        oldVersion: npmResult.oldVersion,
        newVersion: npmResult.newVersion,
      });
      hasUpdates = true;
      continue;
    }

    // Try processing as JSR import
    const jsrResult = processImport(denoImport, 'jsr', pkg, versionPrecision);
    if (jsrResult) {
      deno.imports[importKey] = jsrResult.newImport;
      updates.push({
        name: jsrResult.name,
        oldVersion: jsrResult.oldVersion,
        newVersion: jsrResult.newVersion,
      });
      hasUpdates = true;
    }
  }

  if (hasUpdates) {
    // Write the updated deno.json with proper formatting
    const jsonContent = `${JSON.stringify(deno, null, JSON_INDENT)}\n`;
    fs.writeFileSync(denoPath, jsonContent, 'utf8');
    if (!silent) {
      console.log('✅ Updated Deno dependencies:');
      for (const u of updates) {
        console.log(`  - ${u.name}: ${u.oldVersion} → ${u.newVersion}`);
      }
    }
  } else if (!silent) {
    console.log('✅ Deno imports are already in sync with package.json');
  }

  return { hasUpdates, updates };
}
