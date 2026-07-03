/**
 * Form block — frontend view script.
 *
 * Initialises all form blocks on the page:
 *   - Repopulates field values after a failed non-async submission.
 *   - Displays server-side validation errors injected via window.fbErrors.
 *   - Attaches an async fetch handler to forms with data-async="true".
 *
 * Uses a readyState guard instead of DOMContentLoaded so the code runs
 * regardless of whether the script is loaded with defer, in the footer,
 * or anywhere else on the page.
 */

function initFormBlocks() {
	document.querySelectorAll( 'form.wp-block-form-blocks-form' ).forEach( ( form ) => {
		const formId = form.dataset.formId;

		if ( formId ) {
			// Restore submitted values first, then overlay the error state.
			if ( window.fbValues && window.fbValues[ formId ] ) {
				repopulateForm( form, window.fbValues[ formId ] );
				delete window.fbValues[ formId ];
			}

			if ( window.fbErrors && window.fbErrors[ formId ] ) {
				showFieldErrors( form, window.fbErrors[ formId ] );
				delete window.fbErrors[ formId ];
			}
		}

		if ( form.dataset.async === 'true' ) {
			attachAsyncHandler( form );
		}
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', initFormBlocks );
} else {
	initFormBlocks();
}

/**
 * Attach a submit interceptor to a single async form.
 *
 * @param {HTMLFormElement} form
 */
function attachAsyncHandler( form ) {
	const statusEl      = form.querySelector( '.form-blocks-status' );
	const networkErrMsg = form.dataset.msgNetworkError ||
		'An unexpected error occurred. Please try again.';

	form.addEventListener( 'submit', async ( event ) => {
		event.preventDefault();

		const submitBtn = form.querySelector( '[type="submit"]' );
		setSubmitting( form, submitBtn, true );
		hideStatus( statusEl );
		clearFieldErrors( form );

		try {
			const response = await fetch( form.action, {
				method: 'POST',
				// Do NOT set Content-Type — the browser derives it from FormData,
				// including the correct multipart boundary for file uploads.
				headers: { 'X-Form-Blocks-Async': '1' },
				body: new FormData( form ),
			} );

			const data = await response.json();

			if ( data.errors ) {
				showFieldErrors( form, data.errors );
			}

			showStatus( statusEl, data.success, data.message );

			if ( data.success ) {
				form.reset();
			}
		} catch {
			showStatus( statusEl, false, networkErrMsg );
		} finally {
			setSubmitting( form, submitBtn, false );
		}
	} );
}

/**
 * Repopulate form field values from the previously submitted data.
 * Called after a non-async submission that failed, so the user doesn't
 * have to retype everything.
 *
 * @param {HTMLFormElement} form
 * @param {Object}          values  { fieldName: submittedValue }
 */
function repopulateForm( form, values ) {
	Object.entries( values ).forEach( ( [ name, value ] ) => {
		form.querySelectorAll( `[name="${ CSS.escape( name ) }"]` ).forEach( ( input ) => {
			const type = ( input.type || '' ).toLowerCase();
			if ( type === 'checkbox' ) {
				input.checked = ( input.value === value || value === '1' || value === 'on' );
			} else if ( type === 'radio' ) {
				input.checked = ( input.value === value );
			} else {
				// Covers text, email, number, date, time, textarea, select.
				input.value = value;
			}
		} );
	} );
}

/**
 * Mark fields with validation errors and populate their error spans.
 *
 * @param {HTMLFormElement} form
 * @param {Object}          errors  { fieldName: errorMessage }
 */
function showFieldErrors( form, errors ) {
	Object.entries( errors ).forEach( ( [ fieldName, errorMessage ] ) => {
		const input = form.querySelector( `[name="${ CSS.escape( fieldName ) }"]` );
		if ( ! input ) return;

		input.setAttribute( 'aria-invalid', 'true' );

		const errorId = input.getAttribute( 'aria-describedby' );
		if ( errorId ) {
			const errorEl = document.getElementById( errorId );
			if ( errorEl ) {
				errorEl.textContent = errorMessage;
			}
		}
	} );
}

/**
 * Remove all field-level error indicators from a form.
 *
 * @param {HTMLFormElement} form
 */
function clearFieldErrors( form ) {
	form.querySelectorAll( '[aria-invalid="true"]' ).forEach( ( input ) => {
		input.removeAttribute( 'aria-invalid' );
	} );
	form.querySelectorAll( '.form-blocks-field__error' ).forEach( ( el ) => {
		el.textContent = '';
	} );
}

/**
 * Toggle disabled state and aria-busy on the form during submission.
 *
 * @param {HTMLFormElement}         form
 * @param {HTMLButtonElement|null}  submitBtn
 * @param {boolean}                 busy
 */
function setSubmitting( form, submitBtn, busy ) {
	form.setAttribute( 'aria-busy', busy ? 'true' : 'false' );
	if ( submitBtn ) {
		submitBtn.disabled = busy;
	}
}

/**
 * Show the status element with a success or error class.
 *
 * @param {Element|null} el
 * @param {boolean}      success
 * @param {string}       message
 */
function showStatus( el, success, message ) {
	if ( ! el ) return;
	el.textContent = message;
	el.className   = 'form-blocks-status form-blocks-status--' + ( success ? 'success' : 'error' );
	el.removeAttribute( 'hidden' );
}

/**
 * Hide and clear the status element.
 *
 * @param {Element|null} el
 */
function hideStatus( el ) {
	if ( ! el ) return;
	el.textContent = '';
	el.setAttribute( 'hidden', '' );
}
