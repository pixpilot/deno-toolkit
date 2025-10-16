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
}

interface SyncResult {
  hasUpdates: boolean;
  updates: Array<{ name: string; oldVersion: string; newVersion: string }>;
}

const JSON_INDENT = 2;

/**
 * Synchronizes npm and JSR package versions from package.json to deno.json imports
 *
 * @param options - Configuration options
 * @param options.denoJsonPath - Path to deno.json file
 * @param options.packageJsonPath - Path to package.json file
 * @param options.silent - If true, suppresses console output
 * @returns Object containing sync results
 */
export function syncDenoNpmDependencies(options: SyncOptions): SyncResult {
  const { denoJsonPath, packageJsonPath, silent = false } = options;

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

    // Match npm imports with optional subpath (e.g., npm:pkg@1.0.0 or npm:pkg@1.0.0/subpath)
    const npmMatch = denoImport.match(
      /^npm:(?<name>[^@]+)@(?<version>\d+(?:\.\d+)*)(?<subpath>\/.*)?$/u,
    );

    // Match JSR imports with optional subpath (e.g., jsr:@scope/pkg@1.0.0 or jsr:@scope/pkg@1.0.0/subpath)
    const jsrMatch = denoImport.match(
      /^jsr:(?<name>@[^/@]+\/[^@/]+)@(?<version>\d+(?:\.\d+)*)(?<subpath>\/.*)?$/u,
    );

    if (npmMatch?.groups) {
      const { name, version, subpath } = npmMatch.groups;
      if (name == null || version == null) continue;

      const pkgVersion =
        pkg.devDependencies?.[name]?.replace(/^\D*/u, '') ??
        pkg.dependencies?.[name]?.replace(/^\D*/u, '');

      if (pkgVersion != null && pkgVersion !== version) {
        const newImport = `npm:${name}@${pkgVersion}${subpath ?? ''}`;
        deno.imports[importKey] = newImport;
        updates.push({ name, oldVersion: version, newVersion: pkgVersion });
        hasUpdates = true;
      }
    } else if (jsrMatch?.groups) {
      const { name, version, subpath } = jsrMatch.groups;
      if (name == null || version == null) continue;

      const pkgVersion =
        pkg.devDependencies?.[name]?.replace(/^\D*/u, '') ??
        pkg.dependencies?.[name]?.replace(/^\D*/u, '');

      if (pkgVersion != null && pkgVersion !== version) {
        const newImport = `jsr:${name}@${pkgVersion}${subpath ?? ''}`;
        deno.imports[importKey] = newImport;
        updates.push({ name, oldVersion: version, newVersion: pkgVersion });
        hasUpdates = true;
      }
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
