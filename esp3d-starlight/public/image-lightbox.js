/**
 * Zoom plein écran au clic.
 * - Sur `/esp3d/…` : toutes les images du contenu principal sont zoomables (opt-out : `data-no-zoom`, `.badges`).
 * - Ailleurs : uniquement les balises `<img data-zoom>` explicites.
 */
(() => {
	const ESP3D_PATH = /^\/esp3d(?:\/|$)/i;

	let dialog;
	let zoomImg;

	function ensure() {
		if (dialog) return dialog;
		dialog = document.createElement('dialog');
		dialog.className = 'image-lightbox-dialog';
		dialog.setAttribute('aria-label', 'Enlarged image');
		dialog.innerHTML =
			'<div class="image-lightbox-shell">' +
			'<button type="button" class="image-lightbox-close" aria-label="Close">&times;</button>' +
			'<img alt="" decoding="async" />' +
			'</div>';
		document.body.appendChild(dialog);
		zoomImg = dialog.querySelector('img');
		dialog.querySelector('.image-lightbox-close').addEventListener('click', () => dialog.close());
		dialog.addEventListener('click', (e) => {
			if (e.target === dialog) dialog.close();
		});
		return dialog;
	}

	function open(img) {
		const src = img.currentSrc || img.src;
		if (!src) return;
		const d = ensure();
		zoomImg.src = src;
		zoomImg.alt = img.alt || '';
		d.showModal();
	}

	function syncEsp3dZoomMarkers() {
		document.querySelectorAll('img[data-zoom-auto]').forEach((el) => {
			el.removeAttribute('data-zoom-auto');
			el.removeAttribute('data-zoom');
		});

		if (!ESP3D_PATH.test(location.pathname)) return;

		const main = document.querySelector('main');
		if (!main) return;

		main.querySelectorAll('img[src]').forEach((img) => {
			if (img.closest('.badges')) return;
			if (img.hasAttribute('data-no-zoom')) return;
			img.setAttribute('data-zoom', '');
			img.setAttribute('data-zoom-auto', '');
		});
	}

	document.addEventListener(
		'click',
		(e) => {
			const t = e.target;
			if (!(t instanceof HTMLImageElement)) return;
			if (!t.hasAttribute('data-zoom')) return;
			e.preventDefault();
			open(t);
		},
		true,
	);

	function onNav() {
		syncEsp3dZoomMarkers();
		if (!dialog?.open) return;
		dialog.close();
	}

	document.addEventListener('astro:page-load', onNav);

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', onNav, { once: true });
	} else {
		onNav();
	}
})();
