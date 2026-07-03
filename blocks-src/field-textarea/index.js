import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps }      from '@wordpress/block-editor';
import { RangeControl }       from '@wordpress/components';
import { __ }                 from '@wordpress/i18n';
import { FieldInspectorControls, FieldLabel, FieldErrorSpan, resolveFieldId } from '../_shared/field-controls';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { label, name, id, required, placeholder, defaultValue, rows, cols } = attributes;
		const blockProps = useBlockProps( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );

		return (
			<>
				<FieldInspectorControls attributes={ attributes } setAttributes={ setAttributes }>
					<RangeControl
						label={ __( 'Rows', 'form-blocks' ) }
						value={ rows }
						min={ 1 }
						max={ 30 }
						onChange={ ( val ) => setAttributes( { rows: val } ) }
					/>
					<RangeControl
						label={ __( 'Columns (0 = auto)', 'form-blocks' ) }
						value={ cols }
						min={ 0 }
						max={ 120 }
						onChange={ ( val ) => setAttributes( { cols: val } ) }
					/>
				</FieldInspectorControls>

				<div { ...blockProps }>
					<FieldLabel label={ label } fieldId={ fieldId } required={ required } showPlaceholder />
					<textarea
						className="form-blocks-field__input"
						id={ fieldId }
						placeholder={ placeholder }
						rows={ rows }
						cols={ cols || undefined }
						value={ defaultValue }
						readOnly
						tabIndex={ -1 }
					/>
				</div>
			</>
		);
	},

	save( { attributes } ) {
		const { label, name, id, required, placeholder, defaultValue, rows, cols } = attributes;
		const blockProps = useBlockProps.save( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );
		const errorId    = fieldId ? `${ fieldId }-error` : undefined;

		return (
			<div { ...blockProps }>
				<FieldLabel label={ label } fieldId={ fieldId } required={ required } />
				<textarea
					className="form-blocks-field__input"
					id={ fieldId || undefined }
					name={ name || undefined }
					rows={ rows || undefined }
					cols={ cols || undefined }
					placeholder={ placeholder || undefined }
					required={ required }
					aria-required={ required ? 'true' : undefined }
					aria-describedby={ errorId }
					aria-label={ ! label && name ? name : undefined }
				>
					{ defaultValue || undefined }
				</textarea>
				<FieldErrorSpan fieldId={ fieldId } />
			</div>
		);
	},
} );
