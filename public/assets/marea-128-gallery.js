/* Marea Studio Composer 1.3.28 screenshots — responsive strip and accessible viewer. */
(() => {
  'use strict';
  const strip = document.querySelector('[data-marea-128-gallery]');
  const dialog = document.getElementById('m126-lightbox');
  if (!strip || !dialog || typeof dialog.showModal !== 'function') return;
  const links = [...strip.querySelectorAll('[data-marea-full]')];
  const shots = [...strip.querySelectorAll('.m126-shot')];
  const image = dialog.querySelector('#m126-lightbox-image');
  const title = dialog.querySelector('#m126-lightbox-title');
  const counter = document.querySelector('[data-m126-strip-count]');
  let active = 0;
  let opener = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safePrefix = '/assets/marea/1-3-28/';

  function show(index) {
    if (!links.length) return;
    active = (index + links.length) % links.length;
    const link = links[active];
    const url = link.getAttribute('data-marea-full');
    if (!url || !url.startsWith(safePrefix)) return;
    image.src = url;
    image.alt = link.querySelector('img')?.alt || 'Captura real de Marea Studio';
    title.textContent = `${link.getAttribute('data-marea-label') || 'Marea Studio'} · ${active + 1}/${links.length}`;
  }

  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = link;
    show(index);
    dialog.showModal();
    dialog.querySelector('[data-m126-close]')?.focus();
  }));
  dialog.querySelector('[data-m126-close]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-m126-prev]')?.addEventListener('click', () => show(active - 1));
  dialog.querySelector('[data-m126-next]')?.addEventListener('click', () => show(active + 1));
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { opener?.focus(); opener = null; });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(active + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });

  function position() {
    const stripLeft = strip.getBoundingClientRect().left;
    let current = 0;
    let nearest = Infinity;
    shots.forEach((shot, index) => {
      const distance = Math.abs(shot.getBoundingClientRect().left - stripLeft);
      if (distance < nearest) { nearest = distance; current = index; }
    });
    if (counter) counter.textContent = `${String(current + 1).padStart(2, '0')} / ${String(shots.length).padStart(2, '0')}`;
    return current;
  }
  function move(direction) {
    const current = position();
    const next = (current + direction + shots.length) % shots.length;
    shots[next]?.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'nearest', inline: 'start' });
  }
  document.querySelector('[data-m126-strip-prev]')?.addEventListener('click', () => move(-1));
  document.querySelector('[data-m126-strip-next]')?.addEventListener('click', () => move(1));
  strip.addEventListener('scroll', position, { passive: true });
  window.addEventListener('resize', position, { passive: true });
  position();

  // Also moves by itself, while respecting hover, keyboard focus and reduced-motion preferences.
  if (!reducedMotion && shots.length > 1) {
    window.setInterval(() => {
      if (document.hidden || dialog.open || strip.matches(':hover') || strip.contains(document.activeElement)) return;
      move(1);
    }, 5800);
  }
})();
