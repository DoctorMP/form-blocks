import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';
import metadata from './block.json';

registerBlockType( metadata.name, {
	edit( { attributes, setAttributes } ) {
		const { text } = attributes;
		const blockProps = useBlockProps( { className: 'form-blocks-submit' } );

		return (
			<RichText
				tagName="span"
				role="button"
				allowedFormats={ [] }
				value={ text }
				onChange={ ( val ) => setAttributes( { text: val } ) }
				placeholder={ __( 'Submit', 'form-blocks' ) }
				{ ...blockProps }
			/>
		);
	},

	save( { attributes } ) {
		const { text } = attributes;
		const blockProps = useBlockProps.save( { className: 'form-blocks-submit' } );

		return (
			<div className="form-blocks-submit-wrapper">
				<RichText.Content
					tagName="button"
					type="submit"
					value={ text }
					{ ...blockProps }
				/>
			</div>
		);
	},
} );
