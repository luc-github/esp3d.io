/**
 * Complète le scrollspy Starlight (IntersectionObserver insuffisant en bas de page).
 *
 * Cas « fenêtre très haute » (plein écran) : maxY = scrollHeight - innerHeight est petit,
 * donc scrollY + offset ne peut jamais dépasser la position document des derniers titres —
 * la TOC reste bloquée sur « Big thanks ». Les devtools réduisent innerHeight → maxY
 * augmente et tout re-fonctionne : d’où l’effet « bizarre ».
 *
 * Dès que même en bas de page `scrollY + offset` ne dépasse pas le dernier titre
 * (`maxY + offset < lastTop`), on mappe `scrollY / maxY` sur une ligne entre le premier
 * et le dernier titre. Attention : beaucoup de contenu *après* le dernier titre allonge
 * `maxY` sans écarter les titres — le ratio `scrollY/maxY` ne correspond plus à la section
 * lue ; on corrige en priorisant `location.hash` quand la cible est dans la zone d’ancrage
 * (haut de viewport). Les pages 21.x / 3.x ont des longueurs différentes → même TOC,
 * comportement différent sans rien de « caché ».
 */
(function () {
	const TOC_SELECTORS = 'starlight-toc, mobile-starlight-toc';

	function scrollOffset() {
		const header = document.querySelector('header');
		const navH = header ? header.getBoundingClientRect().height : 56;
		return navH + 40;
	}

	function headingDocumentTop(el) {
		return el.getBoundingClientRect().top + window.scrollY;
	}

	function decodeHashId(raw) {
		if (!raw) return '';
		try {
			return decodeURIComponent(raw);
		} catch {
			return raw;
		}
	}

	function collectHeadingLinks(toc) {
		const links = [...toc.querySelectorAll('nav a[href^="#"]')];
		const out = [];
		for (const link of links) {
			const raw = link.hash.slice(1);
			if (!raw) continue;
			const id = decodeHashId(raw);
			const el = document.getElementById(id);
			if (el && /^H[1-6]$/i.test(el.tagName)) out.push({ link, el });
		}
		return out;
	}

	/**
	 * Index du titre pointé par le hash quand le navigateur l’a amené sous la zone
	 * d’ancrage (évite 2e entrée → surlignage 3e quand scrollY/maxY est trompeur).
	 */
	function indexFromHashInAnchorZone(entries, offset) {
		const id = decodeHashId(location.hash?.slice(1) || '');
		if (!id) return -1;
		const i = entries.findIndex((e) => e.el.id === id);
		if (i < 0) return -1;
		const r = entries[i].el.getBoundingClientRect();
		const zoneLo = -48;
		const zoneHi = offset + 72;
		if (r.top >= zoneLo && r.top < zoneHi) return i;
		return -1;
	}

	function syncOneToc(toc) {
		const entries = collectHeadingLinks(toc);
		if (entries.length === 0) return;

		const scrollH = Math.max(
			document.documentElement.scrollHeight,
			document.body ? document.body.scrollHeight : 0
		);
		const maxY = Math.max(0, scrollH - window.innerHeight);
		const offset = scrollOffset();
		const yReach = maxY + offset;
		const lastIdx = entries.length - 1;
		const firstTop = headingDocumentTop(entries[0].el);
		const lastTop = headingDocumentTop(entries[lastIdx].el);
		const span = Math.max(lastTop - firstTop, 1);

		/* Ligne classique inatteignable pour le dernier titre, même scroll au max */
		const useProgressMap = lastIdx >= 1 && yReach < lastTop - 4;

		let chosen = 0;

		if (!useProgressMap) {
			const yAnchor = window.scrollY + offset;
			for (let i = 0; i < entries.length; i++) {
				if (headingDocumentTop(entries[i].el) <= yAnchor + 2) chosen = i;
			}
		} else {
			const t = maxY <= 0 ? 1 : Math.min(1, Math.max(0, window.scrollY / maxY));
			/* Lerp strict entre les tops des titres (pas span+32 : évite de dépasser le 3e) */
			const virtualLine = firstTop + t * span;
			for (let i = 0; i < entries.length; i++) {
				if (headingDocumentTop(entries[i].el) <= virtualLine + 2) chosen = i;
			}
			const hashIdx = indexFromHashInAnchorZone(entries, offset);
			if (hashIdx >= 0) chosen = hashIdx;
		}

		const active = entries[chosen];
		for (const { link } of entries) {
			if (link === active.link) link.setAttribute('aria-current', 'true');
			else link.removeAttribute('aria-current');
		}

		if (toc.tagName === 'MOBILE-STARLIGHT-TOC') {
			const display = toc.querySelector('.display-current');
			if (display) display.textContent = active.link.textContent.trim();
		}
	}

	function syncAll() {
		document.querySelectorAll(TOC_SELECTORS).forEach(syncOneToc);
	}

	let t1 = 0;
	let t2 = 0;
	function schedule() {
		syncAll();
		clearTimeout(t1);
		clearTimeout(t2);
		t1 = setTimeout(syncAll, 16);
		t2 = setTimeout(syncAll, 72);
	}

	window.addEventListener('scroll', schedule, { passive: true });
	window.addEventListener('resize', schedule, { passive: true });
	window.addEventListener('hashchange', schedule, { passive: true });
	document.addEventListener('astro:page-load', schedule);
	document.addEventListener('click', (e) => {
		const a = e.target && e.target.closest && e.target.closest('a[href^="#"]');
		if (!a || !a.closest(TOC_SELECTORS)) return;
		queueMicrotask(schedule);
	});

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', schedule, { once: true });
	} else {
		schedule();
	}
})();
