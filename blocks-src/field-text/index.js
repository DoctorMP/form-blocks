import { registerBlockType }  from '@wordpress/blocks';
import { useBlockProps }       from '@wordpress/block-editor';
import { TextControl }         from '@wordpress/components';
import { __ }                  from '@wordpress/i18n';
import { FieldInspectorControls, FieldLabel, FieldErrorSpan, resolveFieldId } from '../_shared/field-controls';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { label, name, id, required, placeholder, defaultValue, pattern } = attributes;
		const blockProps = useBlockProps( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );

		return (
			<>
				<FieldInspectorControls attributes={ attributes } setAttributes={ setAttributes }>
					<TextControl
						label={ __( 'Validation pattern (regex)', 'form-blocks' ) }
						help={ __( 'Optional — e.g. [A-Z]{3,} or ^\\d{5}$', 'form-blocks' ) }
						value={ pattern }
						onChange={ ( val ) => setAttributes( { pattern: val } ) }
					/>
				</FieldInspectorControls>

				<div { ...blockProps }>
					<FieldLabel label={ label } fieldId={ fieldId } required={ required } showPlaceholder />
					<input
						type="text"
						className="form-blocks-field__input"
						id={ fieldId }
						placeholder={ placeholder }
						value={ defaultValue }
						readOnly
						tabIndex={ -1 }
					/>
				</div>
			</>
		);
	},

	save( { attributes } ) {
		const { label, name, id, required, placeholder, defaultValue, pattern } = attributes;
		const blockProps = useBlockProps.save( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );
		const errorId    = fieldId ? `${ fieldId }-error` : undefined;

		return (
			<div { ...blockProps }>
				<FieldLabel label={ label } fieldId={ fieldId } required={ required } />
				<input
					type="text"
					className="form-blocks-field__input"
					id={ fieldId || undefined }
					name={ name || undefined }
					value={ defaultValue || undefined }
					placeholder={ placeholder || undefined }
					pattern={ pattern || undefined }
					required={ required }
					aria-required={ required ? 'true' : undefined }
					aria-describedby={ errorId }
					aria-label={ ! label && name ? name : undefined }
				/>
				<FieldErrorSpan fieldId={ fieldId } />
			</div>
		);
	},
} );
