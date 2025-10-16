# @pixpilot/deno-npm-sync

A CLI tool and library to automatically synchronize npm and JSR package versions from `package.json` to Deno's `deno.json` imports. This ensures your Deno projects always use the same package versions as defined in your package.json, eliminating version drift and manual updates.

## Features

- 🔄 **Automatic Synchronization**: Syncs npm and JSR package versions from `package.json` to `deno.json`
- 📦 **Dual Registry Support**: Works with both npm (`npm:`) and JSR (`jsr:`) imports
- 🎯 **Subpath Support**: Handles imports with subpaths (e.g., `npm:lodash@4.17.21/fp`, `jsr:@std/assert@1.0.0/equals`)
- 🔍 **Smart Detection**: Only updates packages that have version mismatches
- 🎨 **Flexible Version Precision**: Four modes - auto-detect, major-only, major.minor, or full version
- 🛡️ **Type-Safe**: Written in TypeScript with full type definitions
- 🧪 **Well-Tested**: Comprehensive test coverage with 25+ test cases
- 🚀 **CLI & Library**: Use as a command-line tool or programmatically in your code

## Installation

### Global Installation (CLI)

```bash
pnpm install -g @pixpilot/deno-npm-sync
# or
npm install -g @pixpilot/deno-npm-sync
# or
yarn global add @pixpilot/deno-npm-sync
```

### Local Installation (Library)

```bash
pnpm add -D @pixpilot/deno-npm-sync
# or
npm install --save-dev @pixpilot/deno-npm-sync
# or
yarn add -D @pixpilot/deno-npm-sync
```

## CLI Usage

### Basic Usage

```bash
# Sync from default locations (./package.json and ./deno.json)
deno-npm-sync

# Specify custom paths
deno-npm-sync --deno ./functions/deno.json --package ./package.json

# Silent mode (no output)
deno-npm-sync --silent
```

### CLI Options

```bash
Options:
  -V, --version                    output the version number
  -d, --deno <path>                Path to deno.json file (default: "./deno.json")
  -p, --package <path>             Path to package.json file (default: "./package.json")
  -s, --silent                     Suppress console output (default: false)
  -v, --version-precision <mode>   Version precision mode: 'auto' (preserve format),
                                   'major' (x), 'minor' (x.y), or 'full' (x.y.z) (default: "auto")
  -h, --help                       display help for command
```

### Examples

```bash
# Sync with custom deno.json location
deno-npm-sync --deno ./src/deno.json

# Sync with custom package.json location
deno-npm-sync --package ./custom-package.json

# Sync both with custom paths
deno-npm-sync -d ./functions/deno.json -p ./package.json

# Run in silent mode (useful for CI/CD)
deno-npm-sync --silent

# Use 'auto' mode to preserve version format from deno.json (default)
deno-npm-sync --version-precision auto

# Use 'major' mode to always use major version only (e.g., npm:lodash@4)
deno-npm-sync --version-precision major

# Use 'minor' mode to always use major.minor version (e.g., npm:lodash@4.17)
deno-npm-sync --version-precision minor

# Use 'full' mode to always use full version (e.g., npm:lodash@4.17.21)
deno-npm-sync --version-precision full

# Combine options
deno-npm-sync --deno ./functions/deno.json --silent --version-precision minor
```

## Automation & Integration

Add to your `package.json` scripts for automatic synchronization:

```json
{
  "scripts": {
    "sync:deno": "deno-npm-sync",
    "sync:deno:major": "deno-npm-sync --version-precision major",
    "sync:deno:minor": "deno-npm-sync --version-precision minor",
    "sync:deno:full": "deno-npm-sync --version-precision full",
    "postinstall": "pnpm run sync:deno"
  }
}
```

### Usage Examples

- **Post-install hook**: Automatically sync after `pnpm install`
- **Pre-commit hook**: Ensure deno.json is up-to-date before commits
- **CI/CD pipeline**: Add to your build process for consistency
- **Development workflow**: Run manually or via npm scripts

## Version Precision Modes

The tool supports four version precision modes to control how version numbers are formatted in your `deno.json`:

### Auto Mode (Default)

In `auto` mode, the tool automatically detects and preserves the version format from your existing `deno.json` entries:

- **Major only** (`1`): If your deno.json has `npm:lodash@4`, it stays as `npm:lodash@4`
- **Major.Minor** (`1.0`): If your deno.json has `npm:lodash@4.17`, it stays as `npm:lodash@4.17`
- **Major.Minor.Patch** (`1.0.0`): If your deno.json has `npm:lodash@4.17.21`, it stays as `npm:lodash@4.17.21`

**Example:**

```
// deno.json (before)
{
  "imports": {
    "lodash": "npm:lodash@4",           // Major only
    "react": "npm:react@18.2",          // Major.Minor
    "typescript": "npm:typescript@5.0.0" // Major.Minor.Patch
  }
}

// package.json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "react": "^18.3.1",
    "typescript": "^5.4.5"
  }
}

// deno.json (after sync with --version-precision auto)
{
  "imports": {
    "lodash": "npm:lodash@4",           // Preserved as major only
    "react": "npm:react@18.3",          // Preserved as major.minor
    "typescript": "npm:typescript@5.4.5" // Preserved as full version
  }
}
```

### Major Mode

In `major` mode, the tool always uses only the major version number (e.g., `4`):

**Example:**

```
// deno.json (before)
{
  "imports": {
    "lodash": "npm:lodash@4.17.21",
    "react": "npm:react@18.2.0",
    "typescript": "npm:typescript@5.0.0"
  }
}

// package.json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "react": "^18.3.1",
    "typescript": "^5.4.5"
  }
}

// deno.json (after sync with --version-precision major)
{
  "imports": {
    "lodash": "npm:lodash@4",      // Forced to major only
    "react": "npm:react@18",       // Forced to major only
    "typescript": "npm:typescript@5" // Forced to major only
  }
}
```

### Minor Mode

In `minor` mode, the tool always uses major.minor version format (e.g., `4.17`):

**Example:**

```
// deno.json (before)
{
  "imports": {
    "lodash": "npm:lodash@4",
    "react": "npm:react@18.2.0",
    "typescript": "npm:typescript@5.0.0"
  }
}

// package.json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "react": "^18.3.1",
    "typescript": "^5.4.5"
  }
}

// deno.json (after sync with --version-precision minor)
{
  "imports": {
    "lodash": "npm:lodash@4.17",      // Forced to major.minor
    "react": "npm:react@18.3",        // Forced to major.minor
    "typescript": "npm:typescript@5.4" // Forced to major.minor
  }
}
```

### Full Mode

In `full` mode, the tool always uses the complete version (e.g., `4.17.21`):

**Example:**

```
// deno.json (before)
{
  "imports": {
    "lodash": "npm:lodash@4",
    "react": "npm:react@18.2",
    "typescript": "npm:typescript@5.0.0"
  }
}

// package.json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "react": "^18.3.1",
    "typescript": "^5.4.5"
  }
}

// deno.json (after sync with --version-precision full)
{
  "imports": {
    "lodash": "npm:lodash@4.17.21",    // Forced to full version
    "react": "npm:react@18.3.1",       // Forced to full version
    "typescript": "npm:typescript@5.4.5" // Forced to full version
  }
}
```

**Use Cases:**

- **Auto mode**: Perfect for projects where you want to maintain existing version precision per package
- **Major mode**: Ideal when you want to lock to major versions only for maximum compatibility
- **Minor mode**: Good balance between stability and getting minor updates
- **Full mode**: When you need exact version matching and full control

## Registry Support

### NPM Registry

The tool syncs npm packages with the `npm:` specifier:

```
# deno.json
{
  "imports": {
    "lodash": "npm:lodash@4.17.21",
    "react": "npm:react@18.2.0"
  }
}

# package.json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "react": "^18.2.0"
  }
}
```

### JSR (JavaScript Registry)

The tool also syncs JSR packages with the `jsr:` specifier:

```
# deno.json
{
  "imports": {
    "@std/assert": "jsr:@std/assert@1.0.0",
    "@std/path": "jsr:@std/path@0.225.0"
  }
}

# package.json
{
  "dependencies": {
    "@std/assert": "^1.0.0",
    "@std/path": "^0.225.0"
  }
}
```

### Mixed Registries

You can use both npm and JSR imports in the same project:

```json
// deno.json
{
  "imports": {
    "lodash": "npm:lodash@4.17.21",
    "@std/assert": "jsr:@std/assert@1.0.0",
    "react": "npm:react@18.2.0"
  }
}
```

The tool will automatically detect and sync the correct registry for each package.

## Programmatic Usage

You can also use the library programmatically in your Node.js or TypeScript code:

```typescript
import { syncDenoNpmDependencies } from '@pixpilot/deno-npm-sync';

// Basic usage with auto mode (default)
const result = syncDenoNpmDependencies({
  denoJsonPath: './deno.json',
  packageJsonPath: './package.json',
  silent: false,
});

// Using major mode to always use major version only
const result2 = syncDenoNpmDependencies({
  denoJsonPath: './deno.json',
  packageJsonPath: './package.json',
  silent: false,
  versionPrecision: 'major',
});

// Using minor mode for major.minor versions
const result3 = syncDenoNpmDependencies({
  denoJsonPath: './deno.json',
  packageJsonPath: './package.json',
  silent: false,
  versionPrecision: 'minor',
});

// Using full mode for complete versions
const result4 = syncDenoNpmDependencies({
  denoJsonPath: './deno.json',
  packageJsonPath: './package.json',
  silent: false,
  versionPrecision: 'full',
});

// Check results
if (result.hasUpdates) {
  console.log(`Updated ${result.updates.length} packages:`);
  result.updates.forEach((update) => {
    console.log(`  ${update.name}: ${update.oldVersion} → ${update.newVersion}`);
  });
} else {
  console.log('All packages are already in sync!');
}
```

### API

#### `syncDenoNpmDependencies(options: SyncOptions): SyncResult`

Synchronizes npm package versions from package.json to deno.json imports.

**Parameters:**

- `options.denoJsonPath` (string): Path to deno.json file
- `options.packageJsonPath` (string): Path to package.json file
- `options.silent` (boolean, optional): If true, suppresses console output (default: false)
- `options.versionPrecision` ('auto' | 'major' | 'minor' | 'full', optional): Version precision mode (default: 'auto')
  - `'auto'`: Preserves the version format from deno.json (e.g., `1`, `1.0`, `1.0.0`)
  - `'major'`: Always uses only major version (e.g., `1`)
  - `'minor'`: Always uses major.minor version (e.g., `1.0`)
  - `'full'`: Always uses full version (e.g., `1.0.0`)

**Returns:**

- `hasUpdates` (boolean): Whether any updates were made
- `updates` (array): Array of update objects containing:
  - `name` (string): Package name
  - `oldVersion` (string): Previous version in deno.json
  - `newVersion` (string): New version from package.json

## How It Works

The tool scans your `deno.json` imports for npm and JSR-prefixed packages:

```json
{
  "imports": {
    "lodash": "npm:lodash@4.17.0",
    "typescript": "npm:typescript@4.9.0/lib/typescript.d.ts",
    "@std/assert": "jsr:@std/assert@0.226.0",
    "@std/path": "jsr:@std/path@0.224.0/posix"
  }
}
```

Then it checks your `package.json` for the same packages:

```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "@std/assert": "^1.0.0",
    "@std/path": "^0.225.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

And updates the deno.json to match:

```json
{
  "imports": {
    "lodash": "npm:lodash@4.17.21",
    "typescript": "npm:typescript@5.0.0/lib/typescript.d.ts",
    "@std/assert": "jsr:@std/assert@1.0.0",
    "@std/path": "jsr:@std/path@0.225.0/posix"
  }
}
```

## Use Cases

- **Monorepos**: Keep Deno and Node.js dependencies in sync
- **Hybrid Projects**: Projects using both Deno and Node.js
- **JSR + npm**: Projects using both JSR and npm registries
- **CI/CD Pipelines**: Automate dependency synchronization in your build process
- **Development Workflow**: Ensure consistency between package managers

## Integration with Scripts

Add to your `package.json` scripts:

```json
{
  "scripts": {
    "sync:deno": "deno-npm-sync",
    "postinstall": "deno-npm-sync --silent"
  }
}
```
