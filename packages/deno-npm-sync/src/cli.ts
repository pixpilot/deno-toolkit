#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { program } from 'commander';
import { syncDenoNpmDependencies } from './main.js';

program
  .name('deno-npm-sync')
  .description('Sync npm and JSR package versions from package.json to deno.json imports')
  .version('0.0.0')
  .option('-d, --deno <path>', 'Path to deno.json file', './deno.json')
  .option('-p, --package <path>', 'Path to package.json file', './package.json')
  .option('-s, --silent', 'Suppress console output', false)
  .option(
    '-v, --version-precision <mode>',
    "Version precision mode: 'auto' (preserve format), 'major' (x), 'minor' (x.y), or 'full' (x.y.z)",
    'auto',
  )
  .action(
    (options: {
      deno: string;
      package: string;
      silent: boolean;
      versionPrecision: string;
    }) => {
      try {
        // Validate versionPrecision
        const validModes = ['auto', 'major', 'minor', 'full'] as const;
        if (!validModes.includes(options.versionPrecision as never)) {
          console.error(
            "❌ Error: --version-precision must be one of: 'auto', 'major', 'minor', 'full'",
          );
          process.exit(1);
        }

        // Resolve paths relative to current working directory
        const denoJsonPath = path.resolve(process.cwd(), options.deno);
        const packageJsonPath = path.resolve(process.cwd(), options.package);

        const result = syncDenoNpmDependencies({
          denoJsonPath,
          packageJsonPath,
          silent: options.silent,
          versionPrecision: options.versionPrecision as
            | 'auto'
            | 'major'
            | 'minor'
            | 'full',
        });

        if (!options.silent && result.hasUpdates) {
          console.log(
            `\n✨ Successfully synchronized ${result.updates.length} package(s)`,
          );
        }

        // Exit with success
        process.exit(0);
      } catch (error) {
        console.error(
          '❌ Error:',
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    },
  );

program.parse();
