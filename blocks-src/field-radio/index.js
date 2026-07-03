import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps }      from '@wordpress/block-editor';
import { TextControl, ToggleControl } from '@wordpress/components';
import { __ }                         from '@wordpress/i18n';
import { FieldInspectorControls, FieldErrorSpan, resolveFieldId } from '../_shared/field-controls';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { label, name, id, required, value, checked } = attributes;
		const blockProps = useBlockProps( { className: 'form-blocks-field form-blocks-field--inline' } );
		const fieldId    = resolveFieldId( id, name );

		return (
			<>
				<FieldInspectorControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					showPlaceholder={ false }
					showDefaultValue={ false }
				>
					<TextControl
						label={ __( 'Value (submitted when selected)', 'form-blocks' ) }
						help={ __( 'What gets sent when this radio button is chosen.', 'form-blocks' ) }
						value={ value }
						onChange={ ( val ) => setAttributes( { value: val } ) }
					/>
					<ToggleControl
						label={ __( 'Selected by default', 'form-blocks' ) }
						checked={ checked }
						onChange={ ( val ) => setAttributes( { checked: val } ) }
					/>
				</FieldInspectorControls>

				<div { ...blockProps }>
					<input
						type="radio"
						className="form-blocks-field__radio"
						id={ fieldId }
						name={ name }
						value={ value }
						checked={ checked }
						readOnly
						tabIndex={ -1 }
					/>
					<label className="form-blocks-field__label" htmlFor={ fieldId }>
						{ label || <em>{ __( '(No label)', 'form-blocks' ) }</em> }
						{ required && <span className="form-blocks-field__required" aria-hidden="true"> *</span> }
					</label>
				</div>
			</>
		);
	},

	save( { attributes } ) {
		const { label, name, id, required, value, checked } = attributes;
		const blockProps = useBlockProps.save( { className: 'form-blocks-field form-blocks-field--inline' } );
		const fieldId    = resolveFieldId( id, name );
		const errorId    = fieldId ? `${ fieldId }-error` : undefined;

		return (
			<div { ...blockProps }>
				<input
					type="radio"
					className="form-blocks-field__radio"
					id={ fieldId || undefined }
					name={ name || undefined }
					value={ value || undefined }
					checked={ checked }
					required={ required }
					aria-required={ required ? 'true' : undefined }
					aria-describedby={ errorId }
					aria-label={ ! label && name ? name : undefined }
				/>
				{ label && (
					<label className="form-blocks-field__label" htmlFor={ fieldId || undefined }>
						{ label }
						{ required && <span className="form-blocks-field__required" aria-hidden="true"> *</span> }
					</label>
				) }
				<FieldErrorSpan fieldId={ fieldId } />
			</div>
		);
	},
} );
