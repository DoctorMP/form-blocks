<?php
/**
 * Form submission handler.
 *
 * Processes submissions routed through admin-post.php. Sensitive form
 * configuration (recipient, message template, headers) is never exposed in
 * hidden form fields — it is stored in a transient when the block renders and
 * retrieved here by the form ID that was issued at render time.
 *
 * @package Form Blocks
 * @since   1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	die;
}

/**
 * Class FormBlocks_Form_Handler
 *
 * @since 1.0.0
 */
class FormBlocks_Form_Handler {

	/**
	 * Register admin-post hooks.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function register(): void {
		add_action( 'admin_post_form_blocks_submit', array( $this, 'handle' ) );
		add_action( 'admin_post_nopriv_form_blocks_submit', array( $this, 'handle' ) );
	}

	// =========================================================================
	// Entry point
	// =========================================================================

	/**
	 * Verify the request, resolve form config, dispatch to mail or API.
	 *
	 * @since  1.0.0
	 * @return void
	 */
	public function handle(): void {
		if (
			! isset( $_POST['_wpnonce'] ) ||
			! wp_verify_nonce( sanitize_key( wp_unslash( $_POST['_wpnonce'] ) ), 'form_blocks_submit' )
		) {
			$this->finish( false, __( 'Security check failed.', 'form-blocks' ) );
		}

		$form_id = sanitize_key( wp_unslash( $_POST['form_blocks_id'] ?? '' ) );
		$config  = get_transient( 'fb_form_' . $form_id );

		if ( false === $config || ! is_array( $config ) ) {
			$this->finish( false, __( 'Form configuration not found. Please reload the page and try again.', 'form-blocks' ), $form_id );
		}

		$fields        = $this->collect_fields();
		$field_configs = $config['_fields'] ?? array();

		// Build message overrides from the block's custom message attributes.
		$custom_messages = array_filter(
			array(
				'required' => $config['msgRequired'] ?? '',
				'email'    => $config['msgInvalidEmail'] ?? '',
				'number'   => $config['msgInvalidNumber'] ?? '',
				'time'     => $config['msgInvalidTime'] ?? '',
				'date'     => $config['msgInvalidDate'] ?? '',
				'pattern'  => $config['msgPatternMismatch'] ?? '',
				'select'   => $config['msgInvalidSelect'] ?? '',
			)
		);

		$errors = $this->validate_fields( $fields, $field_configs, $custom_messages );

		$msg_validation_error = ! empty( $config['msgValidationError'] )
			? $config['msgValidationError']
			: __( 'Please correct the errors below.', 'form-blocks' );

		if ( ! empty( $errors ) ) {
			$this->finish( false, $msg_validation_error, $form_id, $errors, $fields );
		}

		$target = $config['target'] ?? 'mail';

		$success = ( 'api' === $target )
			? $this->send_to_api( $config, $fields )
			: $this->send_mail( $config, $fields );

		$msg_success    = ! empty( $config['msgSuccess'] )
			? $config['msgSuccess']
			: __( 'Your message has been sent successfully.', 'form-blocks' );
		$msg_send_error = ! empty( $config['msgSendError'] )
			? $config['msgSendError']
			: __( 'There was a problem sending your message. Please try again.', 'form-blocks' );

		$this->finish( $success, $success ? $msg_success : $msg_send_error, $form_id );
	}

	// =========================================================================
	// Mail
	// =========================================================================

	/**
	 * Send the submission as an email via wp_mail().
	 *
	 * @since  1.0.0
	 * @param  array $config Form block attributes retrieved from the transient.
	 * @param  array $fields Sanitized POST field values keyed by field name.
	 * @return bool  True on success, false on failure.
	 */
	private function send_mail( array $config, array $fields ): bool {
		$to = sanitize_email( $config['recipient'] ?? '' );

		if ( ! is_email( $to ) ) {
			return false;
		}

		$subject = sprintf(
			/* translators: %s: site name */
			__( '%s — New form submission', 'form-blocks' ),
			get_bloginfo( 'name' )
		);

		$body        = $this->resolve_placeholders( $config['message'] ?? '', $fields );
		$extra       = $this->parse_headers( $config['headers'] ?? '' );
		$headers     = array_merge( array( 'Content-Type: text/html; charset=UTF-8' ), $extra );
		$attachments = $this->save_uploaded_files();

		$result = wp_mail( $to, $subject, $body, $headers, $attachments );

		foreach ( $attachments as $file ) {
			@unlink( $file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
		}

		return (bool) $result;
	}

	/**
	 * Move uploaded files to the temp dir for use as wp_mail() attachments.
	 *
	 * @since  1.0.0
	 * @return string[] Absolute paths of the saved temp files.
	 */
	private function save_uploaded_files(): array {
		$saved = array();

		foreach ( $this->normalize_files() as $file ) {
			$dest = get_temp_dir() . wp_unique_filename( get_temp_dir(), sanitize_file_name( $file['name'] ) );
			if ( move_uploaded_file( $file['tmp_name'], $dest ) ) {
				$saved[] = $dest;
			}
		}

		return $saved;
	}

	// =========================================================================
	// API
	// =========================================================================

	/**
	 * Forward the submission to an external API endpoint.
	 *
	 * GET  — appends fields to the URL as a query string.
	 * POST/PUT/PATCH — sends fields in the request body. Switches to multipart
	 *                  automatically when file uploads are present.
	 *
	 * @since  1.0.0
	 * @param  array $config Form block attributes retrieved from the transient.
	 * @param  array $fields Sanitized POST field values keyed by field name.
	 * @return bool  True when the remote responds with a 2xx status code.
	 */
	private function send_to_api( array $config, array $fields ): bool {
		$url    = esc_url_raw( $config['recipient'] ?? '' );
		$method = strtoupper( sanitize_text_field( $config['method'] ?? 'POST' ) );

		if ( empty( $url ) ) {
			return false;
		}

		$extra_headers = $this->parse_headers( $config['headers'] ?? '' );
		$header_map    = $this->headers_to_map( $extra_headers );

		$args = array(
			'method'  => $method,
			'timeout' => 15,
			'headers' => $header_map,
		);

		if ( 'GET' === $method ) {
			$url = add_query_arg( $fields, $url );
		} else {
			$files = $this->normalize_files();

			if ( ! empty( $files ) ) {
				$multipart                       = $this->build_multipart_body( $fields, $files );
				$args['body']                    = $multipart['body'];
				$args['headers']['Content-Type'] = $multipart['content_type'];
			} elseif ( false !== stripos( $header_map['Content-Type'] ?? '', 'application/json' ) ) {
				$args['body']                    = wp_json_encode( $fields );
				$args['headers']['Content-Type'] = 'application/json';
			} else {
				$args['body'] = $fields;
			}
		}

		$response = wp_remote_request( $url, $args );

		if ( is_wp_error( $response ) ) {
			return false;
		}

		$code = wp_remote_retrieve_response_code( $response );

		return $code >= 200 && $code < 300;
	}

	/**
	 * Build a multipart/form-data body from fields and uploaded files.
	 *
	 * Used when forwarding file uploads to an API endpoint.
	 *
	 * @since  1.0.0
	 * @param  array $fields Scalar field values.
	 * @param  array $files  Normalized file records (name, type, tmp_name).
	 * @return array{body: string, content_type: string}
	 */
	private function build_multipart_body( array $fields, array $files ): array {
		$boundary = '----FormBlocksBoundary' . bin2hex( random_bytes( 8 ) );
		$body     = '';

		foreach ( $fields as $name => $value ) {
			$body .= "--{$boundary}\r\n";
			$body .= "Content-Disposition: form-data; name=\"{$name}\"\r\n\r\n";
			$body .= "{$value}\r\n";
		}

		foreach ( $files as $file ) {
			$filename = sanitize_file_name( $file['name'] );
			$mime     = ! empty( $file['type'] ) ? $file['type'] : 'application/octet-stream';
			$content  = file_get_contents( $file['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions

			$body .= "--{$boundary}\r\n";
			$body .= "Content-Disposition: form-data; name=\"{$file['field_name']}\"; filename=\"{$filename}\"\r\n";
			$body .= "Content-Type: {$mime}\r\n\r\n";
			$body .= "{$content}\r\n";
		}

		$body .= "--{$boundary}--\r\n";

		return array(
			'body'         => $body,
			'content_type' => "multipart/form-data; boundary={$boundary}",
		);
	}

	// =========================================================================
	// Validation
	// =========================================================================

	/**
	 * Validate submitted field values against their block configurations.
	 *
	 * Returns an associative array of { fieldName: errorMessage }.
	 * An empty array means all fields are valid.
	 *
	 * @since  1.0.0
	 * @param  array $fields        Collected POST values keyed by field name.
	 * @param  array $field_configs Field config records stored in the transient.
	 * @param  array $messages      Optional custom error message overrides.
	 * @return array<string, string>
	 */
	private function validate_fields( array $fields, array $field_configs, array $messages = array() ): array {
		$msg = array_merge(
			array(
				'required' => __( 'This field is required.', 'form-blocks' ),
				'email'    => __( 'Please enter a valid email address.', 'form-blocks' ),
				'number'   => __( 'Please enter a valid number.', 'form-blocks' ),
				'time'     => __( 'Please enter a valid time (HH:MM).', 'form-blocks' ),
				'date'     => __( 'Please enter a valid date.', 'form-blocks' ),
				'pattern'  => __( 'Please match the required format.', 'form-blocks' ),
				'select'   => __( 'Please select a valid option.', 'form-blocks' ),
			),
			$messages
		);

		$errors = array();

		foreach ( $field_configs as $config ) {
			$name = $config['name'] ?? '';
			$type = $config['type'] ?? 'text';

			if ( '' === $name ) {
				continue;
			}

			$value    = $fields[ $name ] ?? null;
			$is_empty = null === $value || '' === $value;

			if ( ! empty( $config['required'] ) && $is_empty ) {
				$errors[ $name ] = $msg['required'];
				continue;
			}

			if ( $is_empty ) {
				continue;
			}

			switch ( $type ) {
				case 'email':
					if ( ! is_email( $value ) ) {
						$errors[ $name ] = $msg['email'];
					}
					break;

				case 'number':
					if ( ! is_numeric( $value ) ) {
						$errors[ $name ] = $msg['number'];
					}
					break;

				case 'time':
					if ( ! preg_match( '/^\d{2}:\d{2}(:\d{2})?$/', $value ) ) {
						$errors[ $name ] = $msg['time'];
					}
					break;

				case 'date':
					$parts = explode( '-', $value );
					if (
						3 !== count( $parts ) ||
						! checkdate( (int) $parts[1], (int) $parts[2], (int) $parts[0] )
					) {
						$errors[ $name ] = $msg['date'];
					}
					break;

				case 'text':
					$pattern = trim( $config['pattern'] ?? '' );
					if ( '' !== $pattern ) {
						$regex  = '/' . str_replace( '/', '\/', $pattern ) . '/';
						$result = @preg_match( $regex, $value ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
						if ( false !== $result && ! $result ) {
							$errors[ $name ] = $msg['pattern'];
						}
					}
					break;

				case 'select':
					$valid_values = array_column( $config['options'] ?? array(), 'value' );
					if ( ! empty( $valid_values ) && ! in_array( $value, $valid_values, true ) ) {
						$errors[ $name ] = $msg['select'];
					}
					break;
			}
		}

		return $errors;
	}

	// =========================================================================
	// Helpers — input collection
	// =========================================================================

	/**
	 * Collect sanitized POST values, excluding internal hidden fields.
	 *
	 * @since  1.0.0
	 * @return array<string, string>
	 */
	private function collect_fields(): array {
		$reserved = array( 'action', '_wpnonce', '_wp_http_referer', 'form_blocks_id' );
		$fields   = array();

		foreach ( $_POST as $key => $value ) { // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
			if ( in_array( $key, $reserved, true ) ) {
				continue;
			}
			$name            = preg_replace( '/[^a-zA-Z0-9_\-]/', '', $key );
			$fields[ $name ] = sanitize_textarea_field( wp_unslash( $value ) );
		}

		return $fields;
	}

	/**
	 * Normalize $_FILES into a flat list of file records.
	 *
	 * Handles both single-file and multi-file (name="field[]") inputs.
	 *
	 * @since  1.0.0
	 * @return array Each entry has keys: field_name, name, type, tmp_name, size.
	 */
	private function normalize_files(): array {
		$files = array();

		foreach ( $_FILES as $field_name => $file ) {
			if ( is_array( $file['name'] ) ) {
				foreach ( $file['name'] as $i => $fname ) {
					if ( UPLOAD_ERR_OK !== $file['error'][ $i ] ) {
						continue;
					}
					if ( ! is_uploaded_file( $file['tmp_name'][ $i ] ) ) {
						continue;
					}
					$files[] = array(
						'field_name' => $field_name,
						'name'       => $fname,
						'type'       => $file['type'][ $i ],
						'tmp_name'   => $file['tmp_name'][ $i ],
						'size'       => $file['size'][ $i ],
					);
				}
			} else {
				if ( UPLOAD_ERR_OK !== $file['error'] ) {
					continue;
				}
				if ( ! is_uploaded_file( $file['tmp_name'] ) ) {
					continue;
				}
				$files[] = array(
					'field_name' => $field_name,
					'name'       => $file['name'],
					'type'       => $file['type'],
					'tmp_name'   => $file['tmp_name'],
					'size'       => $file['size'],
				);
			}
		}

		return $files;
	}

	// =========================================================================
	// Helpers — formatting
	// =========================================================================

	/**
	 * Replace [fieldname] placeholders in a message template.
	 *
	 * @since  1.0.0
	 * @param  string $template Message template from block attributes.
	 * @param  array  $fields   Submitted field values.
	 * @return string
	 */
	private function resolve_placeholders( string $template, array $fields ): string {
		foreach ( $fields as $name => $value ) {
			$template = str_replace( '[' . $name . ']', esc_html( $value ), $template );
		}
		return $template;
	}

	/**
	 * Split a raw "Header-Name: value" string (one per line) into an array.
	 *
	 * @since  1.0.0
	 * @param  string $raw Raw headers attribute value.
	 * @return string[]
	 */
	private function parse_headers( string $raw ): array {
		if ( '' === trim( $raw ) ) {
			return array();
		}
		return array_values(
			array_filter(
				array_map( 'trim', preg_split( '/\r?\n/', $raw ) )
			)
		);
	}

	/**
	 * Convert a "Header-Name: value" list to an associative map.
	 *
	 * @since  1.0.0
	 * @param  string[] $headers List of header strings.
	 * @return array<string, string>
	 */
	private function headers_to_map( array $headers ): array {
		$map = array();
		foreach ( $headers as $header ) {
			$parts = explode( ':', $header, 2 );
			if ( 2 === count( $parts ) ) {
				$map[ trim( $parts[0] ) ] = trim( $parts[1] );
			}
		}
		return $map;
	}

	// =========================================================================
	// Response
	// =========================================================================

	/**
	 * Detect whether the current request was sent by the async JS handler.
	 *
	 * The fetch handler adds an X-Form-Blocks-Async: 1 header so the server
	 * can return JSON instead of performing a redirect.
	 *
	 * @since  1.0.0
	 * @return bool
	 */
	private function is_async(): bool {
		return ! empty( $_SERVER['HTTP_X_FORM_BLOCKS_ASYNC'] );
	}

	/**
	 * Send the response and terminate.
	 *
	 * Async requests receive a JSON body; standard POST requests are redirected
	 * back to the referrer with status query args appended.
	 * When $errors is non-empty, async returns them inline; non-async stores
	 * them in a short-lived transient and passes the key via the redirect URL.
	 *
	 * @since  1.0.0
	 * @param  bool   $success  Whether the operation succeeded.
	 * @param  string $message  Human-readable result message.
	 * @param  string $form_id  Form instance ID, used to scope the redirect message.
	 * @param  array  $errors   Optional field-level errors { fieldName: message }.
	 * @param  array  $fields   Submitted field values to restore the form on redirect.
	 * @return void
	 */
	private function finish( bool $success, string $message, string $form_id = '', array $errors = array(), array $fields = array() ): void {
		if ( $this->is_async() ) {
			$payload = array(
				'success' => $success,
				'message' => $message,
			);
			if ( ! empty( $errors ) ) {
				$payload['errors'] = $errors;
			}
			wp_send_json( $payload, $success ? 200 : 422 );
			// wp_send_json() calls wp_die(), so execution stops here.
		}

		$query_args = array(
			'form_blocks_status' => $success ? 'success' : 'error',
			'form_blocks_id'     => $form_id,
		);

		if ( ! empty( $errors ) ) {
			$error_id = substr( wp_generate_uuid4(), 0, 20 );
			set_transient(
				'fb_verr_' . $error_id,
				array(
					'errors' => $errors,
					'values' => $fields,
				),
				5 * MINUTE_IN_SECONDS
			);
			$query_args['form_blocks_eid'] = $error_id;
		}

		$referer = wp_get_referer() ?? home_url( '/' );
		wp_safe_redirect( add_query_arg( $query_args, $referer ) );
		exit;
	}
}
