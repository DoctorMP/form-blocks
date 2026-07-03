/**
 * Shared helpers for all form field blocks.
 *
 * Components used in edit() only:   FieldInspectorControls
 * Components safe in edit + save(): FieldLabel, FieldErrorSpan, resolveFieldId
 */

import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, TextControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// =============================================================================
// Edit + save helpers
// =============================================================================

/**
 * Resolves the HTML id for a field.
 * Uses the explicit id attribute when set; generates a fallback from name.
 *
 * @param {string} id
 * @param {string} name
 * @return {string}
 */
export function resolveFieldId( id, name ) {
	if ( id ) return id;
	if ( name ) return `fb-${ name.toLowerCase().replace( /[^a-z0-9]+/g, '-' ) }`;
	return '';
}

/**
 * Renders the <label> element for a field.
 *
 * In edit() pass showPlaceholder={true} so "(No label)" appears as a hint.
 * In save() omit showPlaceholder (defaults to false) so the label is simply
 * absent from the output when the author hasn't set one.
 *
 * @param {Object}  props
 * @param {string}  props.label
 * @param {string}  props.fieldId
 * @param {boolean} props.required
 * @param {boolean} [props.showPlaceholder]
 */
export function FieldLabel( { label, fieldId, required, showPlaceholder = false } ) {
	if ( ! label ) {
		if ( ! showPlaceholder ) return null;
		return (
			<label htmlFor={ fieldId || undefined } className="form-blocks-field__label">
				<em>{ __( '(No label)', 'form-blocks' ) }</em>
				{ required && <span className="form-blocks-field__required" aria-hidden="true"> *</span> }
			</label>
		);
	}

	return (
		<label htmlFor={ fieldId || undefined } className="form-blocks-field__label">
			{ label }
			{ required && <span className="form-blocks-field__required" aria-hidden="true"> *</span> }
		</label>
	);
}

/**
 * Renders the aria-live error message container placed after each field input.
 *
 * Always present in the DOM; visually hidden via CSS when empty
 * (.form-blocks-field__error:empty { display:none }).
 * JS populates it on validation failure so screen readers announce the error.
 *
 * @param {Object}  props
 * @param {string}  props.fieldId  Resolved field id (used to build the span's id).
 */
export function FieldErrorSpan( { fieldId } ) {
	const errorId = fieldId ? `${ fieldId }-error` : undefined;
	return (
		<span
			id={ errorId }
			className="form-blocks-field__error"
			aria-live="polite"
		/>
	);
}

// =============================================================================
// Edit-only helpers
// =============================================================================

/**
 * Renders the common "Field settings" inspector panel shared by all field blocks.
 *
 * @param {Object}           props
 * @param {Object}           props.attributes
 * @param {Function}         props.setAttributes
 * @param {boolean}          [props.showPlaceholder]   Default true.
 * @param {boolean}          [props.showDefaultValue]  Default true.
 * @param {string}           [props.defaultValueLabel] Override label for the default value control.
 * @param {React.ReactNode}  [props.children]          Extra controls appended inside the panel.
 */
export function FieldInspectorControls( {
	attributes,
	setAttributes,
	showPlaceholder   = true,
	showDefaultValue  = true,
	defaultValueLabel = null,
	children,
} ) {
	const { label, name, id, required, placeholder, defaultValue } = attributes;

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Field settings', 'form-blocks' ) }>

				<TextControl
					label={ __( 'Label', 'form-blocks' ) }
					value={ label ?? '' }
					onChange={ ( val ) => setAttributes( { label: val } ) }
				/>
				<TextControl
					label={ __( 'Name', 'form-blocks' ) }
					help={ __( 'Submitted as the field key; used in [name] email placeholders.', 'form-blocks' ) }
					value={ name ?? '' }
					onChange={ ( val ) => setAttributes( { name: val } ) }
				/>
				<TextControl
					label={ __( 'ID', 'form-blocks' ) }
					help={ __( 'Leave blank to auto-generate from Name.', 'form-blocks' ) }
					value={ id ?? '' }
					onChange={ ( val ) => setAttributes( { id: val } ) }
				/>

				{ showPlaceholder && (
					<TextControl
						label={ __( 'Placeholder', 'form-blocks' ) }
						value={ placeholder ?? '' }
						onChange={ ( val ) => setAttributes( { placeholder: val } ) }
					/>
				) }

				{ showDefaultValue && (
					<TextControl
						label={ defaultValueLabel ?? __( 'Default value', 'form-blocks' ) }
						value={ defaultValue ?? '' }
						onChange={ ( val ) => setAttributes( { defaultValue: val } ) }
					/>
				) }

				<ToggleControl
					label={ __( 'Required', 'form-blocks' ) }
					checked={ required ?? false }
					onChange={ ( val ) => setAttributes( { required: val } ) }
				/>

				{ children }

			</PanelBody>
		</InspectorControls>
	);
}
