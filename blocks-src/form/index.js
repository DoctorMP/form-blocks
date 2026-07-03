/**
 * Form block — editor script.
 *
 * Dynamic block: render.php handles frontend output.
 * save() returns only inner-block content so render.php can wrap it
 * in the <form> element with the correct hidden fields and nonce.
 *
 * style.scss  → splitChunks cacheGroup → blocks/form/style-index.css
 * editor.scss → MiniCSSExtractPlugin   → blocks/form/index.css
 */

import './style.scss';
import './editor.scss';

import { registerBlockType }                         from '@wordpress/blocks';
import { useBlockProps, InnerBlocks, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from './block.json';

const TARGET_OPTIONS = [
	{ label: __( 'Send email', 'form-blocks' ), value: 'mail' },
	{ label: __( 'Call API',   'form-blocks' ), value: 'api'  },
];

const METHOD_OPTIONS = [
	{ label: 'GET',    value: 'get'    },
	{ label: 'POST',   value: 'post'   },
	{ label: 'PUT',    value: 'put'    },
	{ label: 'PATCH',  value: 'patch'  },
	{ label: 'DELETE', value: 'delete' },
];

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const {
			target, recipient, method, message, headers, async: isAsync,
			msgSuccess, msgSendError, msgValidationError, msgNetworkError,
			msgRequired, msgInvalidEmail, msgInvalidNumber, msgInvalidTime,
			msgInvalidDate, msgPatternMismatch, msgInvalidSelect,
		} = attributes;
		const blockProps = useBlockProps();
		const isMail     = target === 'mail';

		return (
			<>
				<InspectorControls>
					<PanelBody title={ __( 'Form settings', 'form-blocks' ) }>

						<SelectControl
							label={ __( 'Delivery target', 'form-blocks' ) }
							value={ target }
							options={ TARGET_OPTIONS }
							onChange={ ( val ) => setAttributes( { target: val } ) }
						/>

						<TextControl
							label={ isMail
								? __( 'Recipient email', 'form-blocks' )
								: __( 'Endpoint URL', 'form-blocks' )
							}
							help={ isMail
								? __( 'Email address that receives submissions.', 'form-blocks' )
								: __( 'Full URL of the API endpoint.', 'form-blocks' )
							}
							type={ isMail ? 'email' : 'url' }
							value={ recipient }
							onChange={ ( val ) => setAttributes( { recipient: val } ) }
						/>

						{ ! isMail && (
							<SelectControl
								label={ __( 'HTTP method', 'form-blocks' ) }
								value={ method }
								options={ METHOD_OPTIONS }
								onChange={ ( val ) => setAttributes( { method: val } ) }
							/>
						) }

						{ isMail && (
							<TextareaControl
								label={ __( 'Message template', 'form-blocks' ) }
								help={ __( 'Use [fieldname] to insert submitted values.', 'form-blocks' ) }
								value={ message }
								rows={ 6 }
								onChange={ ( val ) => setAttributes( { message: val } ) }
							/>
						) }

						<TextareaControl
							label={ __( 'Additional headers', 'form-blocks' ) }
							help={ __( 'One per line — e.g. Authorization: Bearer token', 'form-blocks' ) }
							value={ headers }
							rows={ 3 }
							onChange={ ( val ) => setAttributes( { headers: val } ) }
						/>

						<ToggleControl
							label={ __( 'Async submission', 'form-blocks' ) }
							help={ isAsync
								? __( 'Submits via fetch — no page reload.', 'form-blocks' )
								: __( 'Submits with a standard page reload.', 'form-blocks' )
							}
							checked={ isAsync }
							onChange={ ( val ) => setAttributes( { async: val } ) }
						/>

					</PanelBody>

					<PanelBody title={ __( 'Messages', 'form-blocks' ) } initialOpen={ false }>

						<p style={ { fontSize: '0.85em', color: '#757575', marginTop: 0 } }>
							{ __( 'Leave blank to use the default text.', 'form-blocks' ) }
						</p>

						<TextControl
							label={ __( 'Success', 'form-blocks' ) }
							placeholder={ __( 'Your message has been sent successfully.', 'form-blocks' ) }
							value={ msgSuccess }
							onChange={ ( val ) => setAttributes( { msgSuccess: val } ) }
						/>
						<TextControl
							label={ __( 'Sending error', 'form-blocks' ) }
							placeholder={ __( 'There was a problem sending your message. Please try again.', 'form-blocks' ) }
							value={ msgSendError }
							onChange={ ( val ) => setAttributes( { msgSendError: val } ) }
						/>
						<TextControl
							label={ __( 'Validation error', 'form-blocks' ) }
							placeholder={ __( 'Please correct the errors below.', 'form-blocks' ) }
							value={ msgValidationError }
							onChange={ ( val ) => setAttributes( { msgValidationError: val } ) }
						/>
						<TextControl
							label={ __( 'Network error (async only)', 'form-blocks' ) }
							placeholder={ __( 'An unexpected error occurred. Please try again.', 'form-blocks' ) }
							value={ msgNetworkError }
							onChange={ ( val ) => setAttributes( { msgNetworkError: val } ) }
						/>

						<hr style={ { margin: '1rem 0' } } />

						<TextControl
							label={ __( 'Required field', 'form-blocks' ) }
							placeholder={ __( 'This field is required.', 'form-blocks' ) }
							value={ msgRequired }
							onChange={ ( val ) => setAttributes( { msgRequired: val } ) }
						/>
						<TextControl
							label={ __( 'Invalid email', 'form-blocks' ) }
							placeholder={ __( 'Please enter a valid email address.', 'form-blocks' ) }
							value={ msgInvalidEmail }
							onChange={ ( val ) => setAttributes( { msgInvalidEmail: val } ) }
						/>
						<TextControl
							label={ __( 'Invalid number', 'form-blocks' ) }
							placeholder={ __( 'Please enter a valid number.', 'form-blocks' ) }
							value={ msgInvalidNumber }
							onChange={ ( val ) => setAttributes( { msgInvalidNumber: val } ) }
						/>
						<TextControl
							label={ __( 'Invalid time', 'form-blocks' ) }
							placeholder={ __( 'Please enter a valid time (HH:MM).', 'form-blocks' ) }
							value={ msgInvalidTime }
							onChange={ ( val ) => setAttributes( { msgInvalidTime: val } ) }
						/>
						<TextControl
							label={ __( 'Invalid date', 'form-blocks' ) }
							placeholder={ __( 'Please enter a valid date.', 'form-blocks' ) }
							value={ msgInvalidDate }
							onChange={ ( val ) => setAttributes( { msgInvalidDate: val } ) }
						/>
						<TextControl
							label={ __( 'Pattern mismatch', 'form-blocks' ) }
							placeholder={ __( 'Please match the required format.', 'form-blocks' ) }
							value={ msgPatternMismatch }
							onChange={ ( val ) => setAttributes( { msgPatternMismatch: val } ) }
						/>
						<TextControl
							label={ __( 'Invalid selection', 'form-blocks' ) }
							placeholder={ __( 'Please select a valid option.', 'form-blocks' ) }
							value={ msgInvalidSelect }
							onChange={ ( val ) => setAttributes( { msgInvalidSelect: val } ) }
						/>

					</PanelBody>
				</InspectorControls>

				<div { ...blockProps }>
					<span className="form-blocks-form__badge">
						{ isMail
							? __( 'Form → email', 'form-blocks' )
							: __( 'Form → API', 'form-blocks' )
						}
						{ recipient ? `  ${ recipient }` : '' }
					</span>
					<InnerBlocks />
				</div>
			</>
		);
	},

	// Dynamic block — render.php wraps the output in <form>.
	// Save only the inner blocks so WordPress stores them in post_content
	// and passes their rendered HTML as $content to render.php.
	save() {
		return <InnerBlocks.Content />;
	},
} );
