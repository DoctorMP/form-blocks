<?php
/**
 * Block registration service.
 *
 * Scans blocks/ and registers each block's assets and render callback
 * automatically based on which files are present in blocks/{slug}/.
 *
 * To add a new block, create a matching directory under /blocks/.
 * No other changes are required.
 *
 * Registration paths — choose whichever suits the block:
 *
 * Path A — block.json (recommended for wp-scripts workflow):
 *   Place a block.json in the block directory. WordPress reads it and
 *   registers all declared assets automatically. For dynamic blocks, either
 *   declare "render": "file:./render.php" in block.json (WP 6.1+), or provide
 *   a render.php defining form_blocks_render_{slug}().
 *
 * Path B — file detection (no block.json):
 *   index.js    Block editor script.
 *   style.css   Styles loaded in the editor and on the frontend.
 *   editor.css  Styles loaded only inside the block editor.
 *   view.js     Script loaded only on the frontend (WP 6.1+).
 *   render.php  Dynamic render callback: form_blocks_render_{slug}().
 *
 * @package Form Blocks
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	die;
}

/**
 * Class FormBlocks_Block_Loader
 *
 * @since 1.0.0
 */
class FormBlocks_Block_Loader {

	/**
	 * WordPress dependencies injected into every editor script (Path B).
	 *
	 * @since 1.0.0
	 * @var   string[]
	 */
	private const EDITOR_DEPS = array(
		'wp-blocks',
		'wp-block-editor',
		'wp-components',
		'wp-i18n',
	);

	/**
	 * Attach WordPress hooks.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function register(): void {
		add_action( 'init', array( $this, 'register_all' ) );
		add_filter( 'block_categories_all', array( $this, 'add_block_category' ), 10, 2 );
	}

	/**
	 * Scan blocks/ and register every block found there.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function register_all(): void {
		$blocks_dir = FORM_BLOCKS_BLOCKS_PATH;

		if ( ! is_dir( $blocks_dir ) ) {
			return;
		}

		foreach ( scandir( $blocks_dir ) as $entry ) {
			if ( '.' === $entry || '..' === $entry ) {
				continue;
			}

			if ( is_dir( $blocks_dir . $entry ) ) {
				$this->register_block( $entry );
			}
		}
	}

	/**
	 * Dispatch registration for a single block.
	 *
	 * Prefers block.json when present; falls back to individual file detection.
	 *
	 * @since  1.0.0
	 * @param  string $slug Block slug matching the directory name under /blocks/.
	 * @return void
	 */
	private function register_block( string $slug ): void {
		$dir = FORM_BLOCKS_BLOCKS_PATH . $slug;

		if ( file_exists( $dir . '/block.json' ) ) {
			$this->register_from_metadata( $dir, $slug );
			return;
		}

		$this->register_from_files( $dir, FORM_BLOCKS_BLOCKS_URL . $slug, $slug );
	}

	/**
	 * Register a block using a block.json manifest.
	 *
	 * WordPress handles all asset registration declared in block.json.
	 * render.php alongside block.json attaches a PHP render callback for
	 * dynamic blocks that do not use the native "render" template field.
	 *
	 * @since  1.0.0
	 * @param  string $dir  Absolute filesystem path to the block directory.
	 * @param  string $slug Block slug.
	 * @return void
	 */
	private function register_from_metadata( string $dir, string $slug ): void {
		$args        = array();
		$render_file = $dir . '/render.php';

		if ( file_exists( $render_file ) ) {
			$metadata = (array) wp_json_file_decode( $dir . '/block.json', array( 'associative' => true ) );

			// Skip PHP callback when block.json already points to a render template (WP 6.1+).
			if ( empty( $metadata['render'] ) ) {
				require_once $render_file;
				$callback = 'form_blocks_render_' . str_replace( '-', '_', $slug );
				if ( function_exists( $callback ) ) {
					$args['render_callback'] = $callback;
				}
			}
		}

		register_block_type( $dir, $args );
	}

	/**
	 * Register a block by detecting individual asset files.
	 *
	 * Each file is optional; only the ones that exist are registered.
	 *
	 * @since  1.0.0
	 * @param  string $dir  Absolute filesystem path to the block directory.
	 * @param  string $uri  Public URL of the block directory.
	 * @param  string $slug Block slug.
	 * @return void
	 */
	private function register_from_files( string $dir, string $uri, string $slug ): void {
		$args = array();

		if ( file_exists( $dir . '/index.js' ) ) {
			$handle = 'form-blocks-' . $slug . '-editor';
			wp_register_script(
				$handle,
				$uri . '/index.js',
				self::EDITOR_DEPS,
				filemtime( $dir . '/index.js' ),
				false
			);
			$args['editor_script'] = $handle;
		}

		if ( file_exists( $dir . '/style.css' ) ) {
			$handle = 'form-blocks-' . $slug . '-style';
			wp_register_style(
				$handle,
				$uri . '/style.css',
				array(),
				filemtime( $dir . '/style.css' )
			);
			$args['style'] = $handle;
		}

		if ( file_exists( $dir . '/editor.css' ) ) {
			$handle = 'form-blocks-' . $slug . '-editor-style';
			wp_register_style(
				$handle,
				$uri . '/editor.css',
				array(),
				filemtime( $dir . '/editor.css' )
			);
			$args['editor_style'] = $handle;
		}

		if ( file_exists( $dir . '/view.js' ) ) {
			$handle = 'form-blocks-' . $slug . '-view';
			wp_register_script(
				$handle,
				$uri . '/view.js',
				array(),
				filemtime( $dir . '/view.js' ),
				true
			);
			$args['view_script'] = $handle;
		}

		if ( file_exists( $dir . '/render.php' ) ) {
			require_once $dir . '/render.php';
			$callback = 'form_blocks_render_' . str_replace( '-', '_', $slug );
			if ( function_exists( $callback ) ) {
				$args['render_callback'] = $callback;
			}
		}

		register_block_type( 'form-blocks/' . $slug, $args );
	}

	/**
	 * Register the Form Blocks category in the block inserter.
	 *
	 * @since  1.0.0
	 * @param  array   $categories Existing block categories.
	 * @param  WP_Post $post       Current post object.
	 * @return array
	 */
	public function add_block_category( array $categories, $post ): array {
		return array_merge(
			array(
				array(
					'slug'  => 'form-blocks',
					'title' => __( 'Form Blocks', 'form-blocks' ),
				),
			),
			$categories
		);
	}
}
