/**
 * Webpack configuration for Form Blocks.
 *
 * Source:  blocks-src/{slug}/   (block.json drives asset discovery)
 * Output:  blocks/{slug}/
 *
 * Each block directory needs a block.json. Assets declared with the
 * "file:./" prefix are auto-compiled. See blocks-src/form/ for a
 * complete reference.
 *
 * Commands:
 *   npm run blocks:build  — production build (minified, no source maps)
 *   npm run blocks:start  — development build + file watcher
 *   npm run blocks:lint   — lint block JS with WordPress ESLint config
 */

const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path          = require( 'path' );

module.exports = {
	...defaultConfig,
	output: {
		...defaultConfig.output,
		path: path.resolve( __dirname, 'blocks' ),
	},
};
