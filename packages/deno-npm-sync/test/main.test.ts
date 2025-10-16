import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncDenoNpmDependencies } from '../src/main.js';

describe('syncDenoNpmDependencies', () => {
  const testDir = path.join(__dirname, 'fixtures');
  const packageJsonPath = path.join(testDir, 'package.json');
  const denoJsonPath = path.join(testDir, 'deno.json');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  it('should sync npm package versions from package.json to deno.json', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    };

    const denoJson = {
      imports: {
        lodash: 'npm:lodash@4.17.0',
        ts: 'npm:typescript@4.9.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    expect(result.updates).toHaveLength(2);
    expect(result.updates).toContainEqual({
      name: 'lodash',
      oldVersion: '4.17.0',
      newVersion: '4.17.21',
    });
    expect(result.updates).toContainEqual({
      name: 'typescript',
      oldVersion: '4.9.0',
      newVersion: '5.0.0',
    });

    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports.lodash).toBe('npm:lodash@4.17.21');
    expect(updatedDeno.imports.ts).toBe('npm:typescript@5.0.0');
  });

  it('should handle npm imports with subpaths', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
    };

    const denoJson = {
      imports: {
        'lodash/fp': 'npm:lodash@4.17.0/fp',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports['lodash/fp']).toBe('npm:lodash@4.17.21/fp');
  });

  it('should not update when versions are already in sync', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
    };

    const denoJson = {
      imports: {
        lodash: 'npm:lodash@4.17.21',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(false);
    expect(result.updates).toHaveLength(0);
  });

  it('should skip non-npm imports', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
    };

    const denoJson = {
      imports: {
        '@std/assert': 'jsr:@std/assert@^1.0.0',
        'https://example': 'https://example.com/module.ts',
        lodash: 'npm:lodash@4.17.21',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(false);
    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports['@std/assert']).toBe('jsr:@std/assert@^1.0.0');
    expect(updatedDeno.imports['https://example']).toBe('https://example.com/module.ts');
  });

  it('should throw error if package.json does not exist', () => {
    fs.writeFileSync(denoJsonPath, JSON.stringify({ imports: {} }, null, 2));

    expect(() => {
      syncDenoNpmDependencies({
        denoJsonPath,
        packageJsonPath,
        silent: true,
      });
    }).toThrow(/package\.json not found/u);
  });

  it('should throw error if deno.json does not exist', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({}, null, 2));

    expect(() => {
      syncDenoNpmDependencies({
        denoJsonPath,
        packageJsonPath,
        silent: true,
      });
    }).toThrow(/deno\.json not found/u);
  });

  it('should log output when not silent', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
    };

    const denoJson = {
      imports: {
        lodash: 'npm:lodash@4.17.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: false,
    });

    expect(consoleSpy).toHaveBeenCalledWith('✅ Updated Deno dependencies:');
    expect(consoleSpy).toHaveBeenCalledWith('  - lodash: 4.17.0 → 4.17.21');
  });

  it('should not log when silent is true', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
    };

    const denoJson = {
      imports: {
        lodash: 'npm:lodash@4.17.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('should preserve JSON formatting in deno.json', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
    };

    const denoJson = {
      imports: {
        lodash: 'npm:lodash@4.17.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    const updatedContent = fs.readFileSync(denoJsonPath, 'utf8');
    // Should have proper formatting with 2-space indentation and trailing newline
    expect(updatedContent).toMatch(/\n$/u);
    expect(updatedContent).toContain('  "imports": {');
  });

  it('should sync JSR package versions from package.json to deno.json', () => {
    const packageJson = {
      dependencies: {
        '@std/assert': '^1.0.0',
        '@std/path': '^0.225.0',
      },
    };

    const denoJson = {
      imports: {
        '@std/assert': 'jsr:@std/assert@0.226.0',
        '@std/path': 'jsr:@std/path@0.224.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    expect(result.updates).toHaveLength(2);
    expect(result.updates).toContainEqual({
      name: '@std/assert',
      oldVersion: '0.226.0',
      newVersion: '1.0.0',
    });
    expect(result.updates).toContainEqual({
      name: '@std/path',
      oldVersion: '0.224.0',
      newVersion: '0.225.0',
    });

    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports['@std/assert']).toBe('jsr:@std/assert@1.0.0');
    expect(updatedDeno.imports['@std/path']).toBe('jsr:@std/path@0.225.0');
  });

  it('should handle JSR imports with subpaths', () => {
    const packageJson = {
      dependencies: {
        '@std/assert': '^1.0.0',
      },
    };

    const denoJson = {
      imports: {
        'assert/equals': 'jsr:@std/assert@0.226.0/equals',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports['assert/equals']).toBe('jsr:@std/assert@1.0.0/equals');
  });

  it('should sync both npm and JSR packages in the same deno.json', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
        '@std/assert': '^1.0.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
      },
    };

    const denoJson = {
      imports: {
        lodash: 'npm:lodash@4.17.0',
        '@std/assert': 'jsr:@std/assert@0.226.0',
        ts: 'npm:typescript@4.9.0',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(true);
    expect(result.updates).toHaveLength(3);

    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    expect(updatedDeno.imports.lodash).toBe('npm:lodash@4.17.21');
    expect(updatedDeno.imports['@std/assert']).toBe('jsr:@std/assert@1.0.0');
    expect(updatedDeno.imports.ts).toBe('npm:typescript@5.0.0');
  });

  it('should skip JSR imports when not in package.json', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.21',
      },
    };

    const denoJson = {
      imports: {
        '@std/assert': 'jsr:@std/assert@1.0.0',
        lodash: 'npm:lodash@4.17.21',
      },
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(denoJsonPath, JSON.stringify(denoJson, null, 2));

    const result = syncDenoNpmDependencies({
      denoJsonPath,
      packageJsonPath,
      silent: true,
    });

    expect(result.hasUpdates).toBe(false);
    const updatedDeno = JSON.parse(fs.readFileSync(denoJsonPath, 'utf8'));
    // JSR import should remain unchanged
    expect(updatedDeno.imports['@std/assert']).toBe('jsr:@std/assert@1.0.0');
  });
});
