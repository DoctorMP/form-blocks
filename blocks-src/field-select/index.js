import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps }      from '@wordpress/block-editor';
import { Button, TextControl } from '@wordpress/components';
import { __ }                  from '@wordpress/i18n';
import { FieldInspectorControls, FieldLabel, FieldErrorSpan, resolveFieldId } from '../_shared/field-controls';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { label, name, id, required, defaultValue, options } = attributes;
		const blockProps = useBlockProps( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );

		function updateOption( index, key, val ) {
			const next = options.map( ( opt, i ) =>
				i === index ? { ...opt, [ key ]: val } : opt
			);
			setAttributes( { options: next } );
		}

		function removeOption( index ) {
			setAttributes( { options: options.filter( ( _, i ) => i !== index ) } );
		}

		function addOption() {
			setAttributes( { options: [ ...options, { label: '', value: '' } ] } );
		}

		return (
			<>
				<FieldInspectorControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					showPlaceholder={ false }
					defaultValueLabel={ __( 'Default selection (value)', 'form-blocks' ) }
				>
					<div className="form-blocks-options-editor">
						<p className="form-blocks-options-editor__heading">
							<strong>{ __( 'Options', 'form-blocks' ) }</strong>
						</p>
						{ options.map( ( opt, index ) => (
							<div key={ index } className="form-blocks-options-editor__row">
								<TextControl
									label={ index === 0 ? __( 'Label', 'form-blocks' ) : undefined }
									hideLabelFromVision={ index !== 0 }
									value={ opt.label }
									onChange={ ( val ) => updateOption( index, 'label', val ) }
								/>
								<TextControl
									label={ index === 0 ? __( 'Value', 'form-blocks' ) : undefined }
									hideLabelFromVision={ index !== 0 }
									value={ opt.value }
									onChange={ ( val ) => updateOption( index, 'value', val ) }
								/>
								<Button
									variant="tertiary"
									isDestructive
									onClick={ () => removeOption( index ) }
									aria-label={ __( 'Remove option', 'form-blocks' ) }
								>
									✕
								</Button>
							</div>
						) ) }
						<Button variant="secondary" onClick={ addOption }>
							{ __( '+ Add option', 'form-blocks' ) }
						</Button>
					</div>
				</FieldInspectorControls>

				<div { ...blockProps }>
					<FieldLabel label={ label } fieldId={ fieldId } required={ required } showPlaceholder />
					<select
						className="form-blocks-field__input"
						id={ fieldId }
						value={ defaultValue }
						onChange={ () => {} }
						tabIndex={ -1 }
					>
						{ options.length === 0 && (
							<option value="" disabled>
								{ __( '— add options in the panel —', 'form-blocks' ) }
							</option>
						) }
						{ options.map( ( opt, i ) => (
							<option key={ i } value={ opt.value }>
								{ opt.label || opt.value || `Option ${ i + 1 }` }
							</option>
						) ) }
					</select>
				</div>
			</>
		);
	},

	save( { attributes } ) {
		const { label, name, id, required, defaultValue, options } = attributes;
		const blockProps = useBlockProps.save( { className: 'form-blocks-field' } );
		const fieldId    = resolveFieldId( id, name );
		const errorId    = fieldId ? `${ fieldId }-error` : undefined;

		return (
			<div { ...blockProps }>
				<FieldLabel label={ label } fieldId={ fieldId } required={ required } />
				<select
					className="form-blocks-field__input"
					id={ fieldId || undefined }
					name={ name || undefined }
					required={ required }
					aria-required={ required ? 'true' : undefined }
					aria-describedby={ errorId }
					aria-label={ ! label && name ? name : undefined }
				>
					{ options.map( ( opt, i ) => (
						<option
							key={ i }
							value={ opt.value }
							selected={ opt.value === defaultValue ? true : undefined }
						>
							{ opt.label || opt.value }
						</option>
					) ) }
				</select>
				<FieldErrorSpan fieldId={ fieldId } />
			</div>
		);
	},
} );
