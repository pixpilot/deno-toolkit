# @pixpilot/deno-npm-sync

A CLI tool and library to automatically synchronize npm and JSR package versions from `package.json` to Deno's `deno.json` imports. This ensures your Deno projects always use the same package versions as defined in your package.json, eliminating version drift and manual updates.

## Features

- 🔄 **Automatic Synchronization**: Syncs npm and JSR package versions from `package.json` to `deno.json`
- 📦 **Dual Registry Support**: Works with both npm (`npm:`) and JSR (`jsr:`) imports
- 🎯 **Subpath Support**: Handles imports with subpaths (e.g., `npm:lodash@4.17.21/fp`, `jsr:@std/assert@1.0.0/equals`)
- 🔍 **Smart Detection**: Only updates packages that have version mismatches
- 🛡️ **Type-Safe**: Written in TypeScript with full type definitions
- 🧪 **Well-Tested**: Comprehensive test coverage with 13+ test cases
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
  -V, --version           output the version number
  -d, --deno <path>       Path to deno.json file (default: "./deno.json")
  -p, --package <path>    Path to package.json file (default: "./package.json")
  -s, --silent            Suppress console output (default: false)
  -h, --help              display help for command
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
```

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

// Basic usage
const result = syncDenoNpmDependencies({
  denoJsonPath: './deno.json',
  packageJsonPath: './package.json',
  silent: false,
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT © PixPilot

## Repository

[GitHub Repository](https://github.com/pixpilot/deno-toolkit/tree/main/packages/deno-npm-sync)
