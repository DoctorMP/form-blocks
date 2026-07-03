import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps }      from '@wordpress/block-editor';
import { FieldInspectorControls, FieldLabel, FieldErrorSpan, resolveFieldId } from '../_shared/field-controls';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { label, name, id, required, placeholder, defaultValue } = attributes;
		const blockProps = useBlockProps( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );

		return (
			<>
				<FieldInspectorControls attributes={ attributes } setAttributes={ setAttributes } />
				<div { ...blockProps }>
					<FieldLabel label={ label } fieldId={ fieldId } required={ required } showPlaceholder />
					<input
						type="number"
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
		const { label, name, id, required, placeholder, defaultValue } = attributes;
		const blockProps = useBlockProps.save( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );
		const errorId    = fieldId ? `${ fieldId }-error` : undefined;

		return (
			<div { ...blockProps }>
				<FieldLabel label={ label } fieldId={ fieldId } required={ required } />
				<input
					type="number"
					className="form-blocks-field__input"
					id={ fieldId || undefined }
					name={ name || undefined }
					value={ defaultValue || undefined }
					placeholder={ placeholder || undefined }
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
