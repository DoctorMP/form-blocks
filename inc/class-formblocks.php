<?php
/**
 * Plugin initialization class.
 *
 * @package Form Blocks
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	die;
}

/**
 * Class FormBlocks
 *
 * @since 1.0.0
 */
class FormBlocks {

	/**
	 * Block loader instance.
	 *
	 * @since 1.0.0
	 * @var   FormBlocks_Block_Loader
	 */
	private FormBlocks_Block_Loader $block_loader;

	/**
	 * Form handler instance.
	 *
	 * @since 1.0.0
	 * @var   FormBlocks_Form_Handler
	 */
	private FormBlocks_Form_Handler $form_handler;

	/**
	 * Bootstrap the plugin.
	 *
	 * @since 1.0.0
	 */
	public function __construct() {
		$this->block_loader = new FormBlocks_Block_Loader();
		$this->block_loader->register();

		$this->form_handler = new FormBlocks_Form_Handler();
		$this->form_handler->register();

		add_action( 'init', array( $this, 'load_textdomain' ) );
	}

	/**
	 * Load the plugin text domain.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function load_textdomain(): void {
		load_plugin_textdomain( 'form-blocks', false, dirname( plugin_basename( FORM_BLOCKS_PLUGIN_FILE ) ) . '/languages' );
	}
}
