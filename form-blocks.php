<?php
/**
 * Plugin Name: Form Blocks
 * Plugin URI: https://michal-pawelczyk.net/wp-plugins/form-blocks
 * Description: Block-based simple and versatile form builder for WordPress
 * Version: 1.0.0
 * Author: Michał Pawelczyk
 * Author URI: https://michal-pawelczyk.net
 * License: GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 *
 * @package Form Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	die;
}

define( 'FORM_BLOCKS_PLUGIN_FILE', __FILE__ );
define( 'FORM_BLOCKS_PLUGIN_PATH', plugin_dir_path( __FILE__ ) );
define( 'FORM_BLOCKS_PLUGIN_URL', plugin_dir_url( __FILE__ ) );
define( 'FORM_BLOCKS_BLOCKS_PATH', FORM_BLOCKS_PLUGIN_PATH . 'blocks/' );
define( 'FORM_BLOCKS_BLOCKS_URL', FORM_BLOCKS_PLUGIN_URL . 'blocks/' );

require_once FORM_BLOCKS_PLUGIN_PATH . 'inc/class-formblocks-block-loader.php';
require_once FORM_BLOCKS_PLUGIN_PATH . 'inc/class-formblocks-form-handler.php';
require_once FORM_BLOCKS_PLUGIN_PATH . 'inc/class-formblocks.php';

new FormBlocks();
