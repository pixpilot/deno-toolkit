import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { syncDenoNpmDependencies } from '../src/main.js';

describe('catalog resolver', () => {
  const testDir = path.join(__dirname, 'temp-catalog-test');
  const packageJsonPath = path.join(testDir, 'package.json');
  const denoJsonPath = path.join(testDir, 'deno.json');

  beforeEach(() => {
    // Create isolated test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should resolve pnpm catalog references from pnpm-workspace.yaml', async () => {
    const workspaceYamlPath = path.join(testDir, 'pnpm-workspace.yaml');

    // Create pnpm-workspace.yaml with catalog
    const workspaceYaml = `
catalog:
  zod: ^3.22.0
  react: ^18.2.0
`;

    fs.writeFileSync(workspaceYamlPath, workspaceYaml);

    const packageJson = {
      dependencies: {
        zod: 'catalog:',
        react: 'catalog:',
      },
    };

    const denoJson = {
      imports: {
        zod: 'npm:zod@3.21.0',
        react: 'npm:react@18.0.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = await syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    expect(result.updates).toHaveLength(2);

    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports.zod).toBe('npm:zod@3.22.0');
    expect(updatedDeno.imports.react).toBe('npm:react@18.2.0');
  });

  it('should resolve named pnpm catalog references', async () => {
    const workspaceYamlPath = path.join(testDir, 'pnpm-workspace.yaml');

    // Create pnpm-workspace.yaml with named catalogs
    const workspaceYaml = `
catalogs:
  prod:
    zod: ^3.22.0
    lodash: ^4.17.21
  dev:
    typescript: ^5.0.0
    vitest: ^1.0.0
`;

    fs.writeFileSync(workspaceYamlPath, workspaceYaml);

    const packageJson = {
      dependencies: {
        zod: 'catalog:prod',
        lodash: 'catalog:prod',
      },
      devDependencies: {
        typescript: 'catalog:dev',
      },
    };

    const denoJson = {
      imports: {
        zod: 'npm:zod@3.21.0',
        lodash: 'npm:lodash@4.17.0',
        ts: 'npm:typescript@4.9.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = await syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    expect(result.updates).toHaveLength(3);

    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports.zod).toBe('npm:zod@3.22.0');
    expect(updatedDeno.imports.lodash).toBe('npm:lodash@4.17.21');
    expect(updatedDeno.imports.ts).toBe('npm:typescript@5.0.0');
  });

  it('should handle catalog references with version precision modes', async () => {
    const workspaceYamlPath = path.join(testDir, 'pnpm-workspace.yaml');

    const workspaceYaml = `
catalog:
  zod: ^3.22.4
`;

    fs.writeFileSync(workspaceYamlPath, workspaceYaml);

    const packageJson = {
      dependencies: {
        zod: 'catalog:',
      },
    };

    const denoJson = {
      imports: {
        zod: 'npm:zod@3',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    // Test with auto mode - should preserve major only format
    const result = await syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
      versionPrecision: 'auto',
    });

    expect(result.hasUpdates).toBe(false); // Same major version
    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports.zod).toBe('npm:zod@3'); // Preserved format
  });

  it('should fallback to regular version if catalog not found', async () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21', // Regular version, not catalog
      },
    };

    const denoJson = {
      imports: {
        lodash: 'npm:lodash@4.17.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = await syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports.lodash).toBe('npm:lodash@4.17.21');
  });
});
