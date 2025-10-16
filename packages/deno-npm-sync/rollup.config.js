import rollupConfig from '@internal/rollup-config';

/**
 * Multi-entry build configuration
 * - Builds src/index.ts as the main library export
 * - Builds src/cli.ts as the CLI executable
 */
export default rollupConfig({
  multiEntry: true,
});
