<?php
/**
 * Server-side render for the form-blocks/form block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner blocks HTML.
 * @var WP_Block $block      Block instance.
 *
 * @package Form Blocks
 */

// Walk immediate child blocks and collect config records used for server-side
// validation. Guard against PHP < 8.0 with strpos() instead of str_starts_with().
if ( ! function_exists( 'form_blocks_collect_field_configs' ) ) {
	/**
	 * Collect field configs from inner blocks.
	 *
	 * @param WP_Block_List $inner_blocks List of immediate child blocks.
	 * @return array
	 */
	function form_blocks_collect_field_configs( WP_Block_List $inner_blocks ): array {
		$prefix = 'form-blocks/field-';
		$plen   = strlen( $prefix );
		$fields = array();

		foreach ( $inner_blocks as $inner_block ) {
			if ( 0 !== strpos( $inner_block->name, $prefix ) ) {
				continue;
			}
			$a        = $inner_block->attributes;
			$fields[] = array(
				'type'     => substr( $inner_block->name, $plen ),
				'name'     => $a['name'] ?? '',
				'required' => ! empty( $a['required'] ),
				'pattern'  => $a['pattern'] ?? '',
				'options'  => $a['options'] ?? array(),
			);
		}

		return $fields;
	}
}

// Compute a stable, non-guessable form ID from the block's configuration.
// Sensitive settings are stored in the transient, not in hidden HTML fields.
$fb_form_id = substr(
	wp_hash(
		implode(
			'|',
			array(
				$attributes['target'] ?? '',
				$attributes['recipient'] ?? '',
				$attributes['method'] ?? '',
				$attributes['message'] ?? '',
				$attributes['headers'] ?? '',
			)
		)
	),
	0,
	20
);

// Collect field configs and persist everything the handler needs.
$fb_field_configs = form_blocks_collect_field_configs( $block->inner_blocks );
$fb_has_required  = in_array( true, array_column( $fb_field_configs, 'required' ), true );

set_transient(
	'fb_form_' . $fb_form_id,
	array_merge( $attributes, array( '_fields' => $fb_field_configs ) ),
	WEEK_IN_SECONDS
);

// Resolve status message from a previous standard (non-async) submission.
$fb_status  = '';
$fb_message = '';
if (
	isset( $_GET['form_blocks_status'], $_GET['form_blocks_id'] ) && // phpcs:ignore WordPress.Security.NonceVerification
	sanitize_key( $_GET['form_blocks_id'] ) === $fb_form_id         // phpcs:ignore WordPress.Security.NonceVerification
	) {
	$fb_status  = sanitize_key( $_GET['form_blocks_status'] ); // phpcs:ignore WordPress.Security.NonceVerification
	$fb_message = '';
}

// Resolve field-level validation errors and submitted values from a previous
// standard submission. Both are stored together in one short-lived transient.
$fb_errors = array();
$fb_values = array();
$fb_eid    = isset( $_GET['form_blocks_eid'] ) // phpcs:ignore WordPress.Security.NonceVerification
	? sanitize_key( wp_unslash( $_GET['form_blocks_eid'] ) ) // phpcs:ignore WordPress.Security.NonceVerification
	: '';

if (
	$fb_eid &&
	isset( $_GET['form_blocks_id'] ) && // phpcs:ignore WordPress.Security.NonceVerification
	sanitize_key( $_GET['form_blocks_id'] ) === $fb_form_id // phpcs:ignore WordPress.Security.NonceVerification
	) {
	$fb_stored = get_transient( 'fb_verr_' . $fb_eid );
	if ( is_array( $fb_stored ) ) {
		$fb_errors = $fb_stored['errors'] ?? array();
		$fb_values = $fb_stored['values'] ?? array();
		delete_transient( 'fb_verr_' . $fb_eid );
	}
}

// Resolve message texts — custom attribute overrides the plugin default.
$msg_success          = ! empty( $attributes['msgSuccess'] )
	? $attributes['msgSuccess']
	: __( 'Your message has been sent successfully.', 'form-blocks' );
$msg_send_error       = ! empty( $attributes['msgSendError'] )
	? $attributes['msgSendError']
	: __( 'There was a problem sending your message. Please try again.', 'form-blocks' );
$msg_validation_error = ! empty( $attributes['msgValidationError'] )
	? $attributes['msgValidationError']
	: __( 'Please correct the errors below.', 'form-blocks' );
$msg_network_error    = ! empty( $attributes['msgNetworkError'] )
	? $attributes['msgNetworkError']
	: __( 'An unexpected error occurred. Please try again.', 'form-blocks' );

// Set the status message now that we know whether field errors are present.
if ( 'success' === $fb_status ) {
	$fb_message = $msg_success;
} elseif ( ! empty( $fb_errors ) ) {
	$fb_message = $msg_validation_error;
} elseif ( 'error' === $fb_status ) {
	$fb_message = $msg_send_error;
}

$is_async    = ! empty( $attributes['async'] );
$extra_attrs = array(
	'data-form-id'           => $fb_form_id,
	'data-msg-network-error' => $msg_network_error,
);
if ( $is_async ) {
	$extra_attrs['data-async'] = 'true';
}
$wrapper_attrs = get_block_wrapper_attributes( $extra_attrs );
?>
<?php if ( ! empty( $fb_errors ) || ! empty( $fb_values ) ) : ?>
<script>
	<?php if ( ! empty( $fb_values ) ) : ?>
window.fbValues = window.fbValues || {};
window.fbValues[<?php echo wp_json_encode( $fb_form_id ); ?>] = <?php echo wp_json_encode( $fb_values ); ?>;
	<?php endif; ?>
	<?php if ( ! empty( $fb_errors ) ) : ?>
window.fbErrors = window.fbErrors || {};
window.fbErrors[<?php echo wp_json_encode( $fb_form_id ); ?>] = <?php echo wp_json_encode( $fb_errors ); ?>;
	<?php endif; ?>
</script>
<?php endif; ?>
<form
	<?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
	action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>"
	method="post"
	enctype="multipart/form-data"
>
	<div
		class="form-blocks-status<?php echo $fb_status ? ' form-blocks-status--' . esc_attr( $fb_status ) : ''; ?>"
		role="alert"
		aria-live="polite"
		<?php echo $fb_message ? '' : 'hidden'; ?>
	>
		<?php echo esc_html( $fb_message ); ?>
	</div>

	<?php if ( $fb_has_required ) : ?>
	<p class="form-blocks-required-note" aria-hidden="true">
		<?php esc_html_e( '* Required fields', 'form-blocks' ); ?>
	</p>
	<?php endif; ?>

	<?php wp_nonce_field( 'form_blocks_submit' ); ?>
	<input type="hidden" name="action"         value="form_blocks_submit">
	<input type="hidden" name="form_blocks_id" value="<?php echo esc_attr( $fb_form_id ); ?>">
	<?php wp_referer_field(); ?>

	<?php echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
</form>
