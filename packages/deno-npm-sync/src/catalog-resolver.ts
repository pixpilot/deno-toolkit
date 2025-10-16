import fs from 'node:fs';
import path from 'node:path';
import { detect } from 'package-manager-detector';
import { parse } from 'yaml';

interface PnpmWorkspaceYaml {
  catalog?: Record<string, string>;
  catalogs?: Record<string, Record<string, string>>;
}

/**
 * Detects the package manager used in the project
 * @param cwd - Current working directory
 * @returns Package manager name or null
 */
export async function detectPackageManager(cwd: string): Promise<string | null> {
  const result = await detect({ cwd });
  return result?.name ?? null;
}

/**
 * Reads and parses pnpm-workspace.yaml
 * @param workspaceRoot - Root directory of the workspace
 * @returns Parsed workspace YAML or null if not found
 */
export function readPnpmWorkspaceYaml(workspaceRoot: string): PnpmWorkspaceYaml | null {
  const workspaceYamlPath = path.join(workspaceRoot, 'pnpm-workspace.yaml');

  if (!fs.existsSync(workspaceYamlPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(workspaceYamlPath, 'utf8');
    return parse(content) as PnpmWorkspaceYaml;
  } catch {
    return null;
  }
}

/**
 * Resolves a pnpm catalog reference to its actual version
 * @param packageName - Name of the package
 * @param catalogName - Name of the catalog (e.g., 'prod', 'dev') or 'default'
 * @param workspaceRoot - Root directory of the workspace
 * @returns Resolved version or null if not found
 */
export function resolvePnpmCatalog(
  packageName: string,
  catalogName: string,
  workspaceRoot: string,
): string | null {
  const yaml = readPnpmWorkspaceYaml(workspaceRoot);

  if (!yaml) {
    return null;
  }

  // Handle default catalog
  if (catalogName === 'default') {
    return yaml.catalog?.[packageName] ?? null;
  }

  // Handle named catalogs
  return yaml.catalogs?.[catalogName]?.[packageName] ?? null;
}

/**
 * Parses a catalog reference string (e.g., "catalog:prod" or "catalog:")
 * @param reference - Catalog reference string
 * @returns Object with catalogName or null if not a catalog reference
 */
export function parseCatalogReference(reference: string): { catalogName: string } | null {
  if (!reference.startsWith('catalog:')) {
    return null;
  }

  const catalogName = reference.slice('catalog:'.length).trim();
  return { catalogName: catalogName || 'default' };
}

/**
 * Resolves a version string, handling catalog references
 * @param version - Version string or catalog reference (e.g., "^3.0.0" or "catalog:prod")
 * @param packageName - Name of the package
 * @param workspaceRoot - Root directory of the workspace
 * @returns Resolved version or null if cannot be resolved
 */
export async function resolveVersion(
  version: string,
  packageName: string,
  workspaceRoot: string,
): Promise<string | null> {
  // Check if it's a catalog reference
  const catalogRef = parseCatalogReference(version);

  if (!catalogRef) {
    // Not a catalog reference, return as-is
    return version;
  }

  // Detect package manager
  const packageManager = await detectPackageManager(workspaceRoot);

  if (packageManager !== 'pnpm') {
    // Only pnpm supports catalogs
    return null;
  }

  // Resolve the catalog reference
  return resolvePnpmCatalog(packageName, catalogRef.catalogName, workspaceRoot);
}

/**
 * Finds the workspace root by looking for pnpm-workspace.yaml
 * @param startPath - Starting directory to search from
 * @returns Workspace root path or null if not found
 */
export function findWorkspaceRoot(startPath: string): string | null {
  let currentPath = path.resolve(startPath);
  const { root } = path.parse(currentPath);

  while (currentPath !== root) {
    const workspaceYamlPath = path.join(currentPath, 'pnpm-workspace.yaml');

    if (fs.existsSync(workspaceYamlPath)) {
      return currentPath;
    }

    currentPath = path.dirname(currentPath);
  }

  return null;
}
