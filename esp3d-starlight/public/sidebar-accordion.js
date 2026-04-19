/**
 * Starlight sidebar accordion (desktop): when a `<details>` group is opened,
 * close every other open `<details>` under the same parent `<ul>`.
 *
 * - Uses `click` + `requestAnimationFrame` so this runs after the UA toggles
 *   the `<details>` and after Starlight’s `SidebarPersistState` click handler.
 * - Persists `sl-sidebar-state` using the same index order as Starlight:
 *   one boolean per `sl-sidebar-restore` (see SidebarRestorePoint), not raw
 *   `querySelectorAll('details')` order (which can diverge and corrupt restore).
 *
 * Breakpoint matches the layout sidebar (`50rem` in PageFrame), not `50em`.
 */
(() => {
	const MQ = '(min-width: 50rem)';

	function sidebarScroller() {
		return document.getElementById('starlight__sidebar');
	}

	function persistTarget() {
		return sidebarScroller()?.querySelector('sl-sidebar-state-persist');
	}

	/** Same indexing as `sl-sidebar-restore data-index` (Starlight sidebar groups). */
	function syncOpenStateFromDOM() {
		const scroller = sidebarScroller();
		const target = persistTarget();
		if (!target || !scroller) return;
		const hash = target.dataset.hash || '';
		const open = [...target.querySelectorAll('sl-sidebar-restore')].map((el) => {
			const d = el.closest('details');
			return Boolean(d?.open);
		});
		try {
			sessionStorage.setItem(
				'sl-sidebar-state',
				JSON.stringify({ hash, open, scroll: scroller.scrollTop }),
			);
		} catch {}
	}

	function collapseOpenSiblingDetails(openedDetails) {
		const li = openedDetails.parentElement;
		if (!li || li.tagName !== 'LI') return false;
		const ul = li.parentElement;
		if (!ul || ul.tagName !== 'UL') return false;
		const root = persistTarget();
		if (!root || !root.contains(openedDetails)) return false;

		let changed = false;
		for (const other of ul.querySelectorAll(':scope > li > details')) {
			if (other === openedDetails || !other.open) continue;
			other.open = false;
			changed = true;
		}
		return changed;
	}

	const scroller = sidebarScroller();
	if (!scroller) return;

	scroller.addEventListener(
		'click',
		(ev) => {
			if (!window.matchMedia(MQ).matches) return;
			const t = ev.target;
			if (!(t instanceof Element)) return;
			const summary = t.closest('summary');
			if (!summary || !scroller.contains(summary)) return;
			const details = summary.closest('details');
			if (!details || !persistTarget()?.contains(details)) return;

			requestAnimationFrame(() => {
				if (!details.open) return;
				if (collapseOpenSiblingDetails(details)) queueMicrotask(() => syncOpenStateFromDOM());
			});
		},
		true,
	);
})();
