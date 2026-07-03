import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps }      from '@wordpress/block-editor';
import { ToggleControl }      from '@wordpress/components';
import { __ }                 from '@wordpress/i18n';
import { FieldInspectorControls, FieldErrorSpan, resolveFieldId } from '../_shared/field-controls';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { label, name, id, required, checked } = attributes;
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
					<ToggleControl
						label={ __( 'Checked by default', 'form-blocks' ) }
						checked={ checked }
						onChange={ ( val ) => setAttributes( { checked: val } ) }
					/>
				</FieldInspectorControls>

				<div { ...blockProps }>
					<input
						type="checkbox"
						className="form-blocks-field__checkbox"
						id={ fieldId }
						checked={ checked }
						readOnly
						tabIndex={ -1 }
						value="1"
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
		const { label, name, id, required, checked } = attributes;
		const blockProps = useBlockProps.save( { className: 'form-blocks-field form-blocks-field--inline' } );
		const fieldId    = resolveFieldId( id, name );
		const errorId    = fieldId ? `${ fieldId }-error` : undefined;

		return (
			<div { ...blockProps }>
				<input
					type="checkbox"
					className="form-blocks-field__checkbox"
					id={ fieldId || undefined }
					name={ name || undefined }
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
