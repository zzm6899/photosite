document.addEventListener('DOMContentLoaded', () => {
  const menuButton = document.querySelector('.nav-toggle');
  const menu = document.getElementById('primary-navigation');
  if (menuButton && menu) {
    const setMenu = (open) => {
      menu.classList.toggle('open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
    document.addEventListener('click', (event) => {
      if (!menuButton.contains(event.target) && !menu.contains(event.target)) setMenu(false);
    });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
  }

  document.querySelectorAll('[data-filter-controls]').forEach((controls) => {
    const buttons = Array.from(controls.querySelectorAll('[data-filter]'));
    const section = controls.closest('.gallery-section');
    const items = Array.from((section || document).querySelectorAll('[data-filter-item]'));
    const count = (section || document).querySelector('[data-gallery-count]');
    if (!buttons.length || !items.length) return;
    const canonical = new Map(buttons.map((button) => [button.dataset.filter.toLowerCase(), button.dataset.filter]));
    const aliases = {
      'brand and business': 'Brand & Corporate',
      'brand and corporate': 'Brand & Corporate',
      corporate: 'Brand & Corporate',
      business: 'Brand & Corporate',
      'event and hospitality': 'Events & Hospitality',
      events: 'Events & Hospitality',
      event: 'Events & Hospitality',
      hospitality: 'Events & Hospitality',
      weddings: 'Weddings & Celebrations',
      wedding: 'Weddings & Celebrations',
      'cosplay & character': 'Portraits',
      'cosplay and character': 'Portraits',
      'live performance': 'Events & Hospitality',
      selected: 'all'
    };
    const resolve = (raw) => {
      if (!raw || ['all', 'all work'].includes(raw.toLowerCase())) return 'all';
      const key = raw.trim().toLowerCase().replace(/\s+/g, ' ');
      const mapped = aliases[key] || raw.trim();
      return canonical.get(mapped.toLowerCase()) || 'all';
    };
    const apply = (filter, updateUrl, replaceUrl) => {
      const visible = items.filter((item) => filter === 'all' || (item.dataset.categories || '').toLowerCase().split(',').map((part) => part.trim()).includes(filter.toLowerCase()));
      items.forEach((item) => { item.hidden = !visible.includes(item); });
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
      if (count) count.textContent = visible.length + (visible.length === 1 ? ' photograph' : ' photographs');
      if (updateUrl || replaceUrl) {
        const url = new URL(window.location.href);
        if (filter === 'all') url.searchParams.delete('category');
        else url.searchParams.set('category', filter);
        const next = url.pathname + url.search + url.hash;
        if (updateUrl) window.history.pushState({ category: filter }, '', next);
        else if (window.location.pathname + window.location.search + window.location.hash !== next) window.history.replaceState({ category: filter }, '', next);
      }
    };
    const params = new URLSearchParams(window.location.search);
    apply(resolve(params.get('category')), false, true);
    buttons.forEach((button) => button.addEventListener('click', () => {
      const active = buttons.find((candidate) => candidate.getAttribute('aria-pressed') === 'true');
      if (button.dataset.filter !== active?.dataset.filter) apply(button.dataset.filter, true, false);
    }));
    window.addEventListener('popstate', () => apply(resolve(new URLSearchParams(window.location.search).get('category')), false, false));
  });

  const galleryImages = Array.from(document.querySelectorAll('[data-lightbox-item]'));
  const lightbox = document.querySelector('.lightbox');
  if (lightbox && galleryImages.length) {
    const image = lightbox.querySelector('.lightbox-img');
    const closeButton = lightbox.querySelector('.lightbox-close');
    let index = 0;
    let returnFocus = null;
    const isOpen = () => lightbox.classList.contains('active');
    const visibleImages = () => galleryImages.filter((item) => !item.closest('[data-filter-item]')?.hidden);
    const show = (nextIndex) => {
      const available = visibleImages();
      if (!available.length) return;
      const wasOpen = isOpen();
      if (!wasOpen) returnFocus = document.activeElement;
      index = (nextIndex + available.length) % available.length;
      image.src = available[index].currentSrc || available[index].src;
      image.alt = available[index].alt || 'Portfolio photograph';
      lightbox.classList.add('active');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (!wasOpen) closeButton.focus();
    };
    const hide = () => {
      if (!isOpen()) return;
      lightbox.classList.remove('active');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
      returnFocus = null;
    };
    galleryImages.forEach((item) => {
      item.tabIndex = 0;
      item.setAttribute('role', 'button');
      item.setAttribute('aria-haspopup', 'dialog');
      item.addEventListener('click', () => show(visibleImages().indexOf(item)));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); show(visibleImages().indexOf(item)); }
      });
    });
    closeButton.addEventListener('click', hide);
    lightbox.querySelector('.lightbox-prev').addEventListener('click', () => show(index - 1));
    lightbox.querySelector('.lightbox-next').addEventListener('click', () => show(index + 1));
    lightbox.addEventListener('click', (event) => { if (event.target === lightbox) hide(); });
    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;
      if (event.key === 'Escape') { event.preventDefault(); hide(); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1); }
    });
    lightbox.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const focusable = Array.from(lightbox.querySelectorAll('button'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }

  const form = document.getElementById('enquiry-form');
  const status = document.getElementById('form-status');
  if (form && status) {
    const email = 'zacmorganphotography@gmail.com';
    const submit = form.querySelector('[type="submit"]');
    const initialButtonText = submit.textContent;
    const showStatus = (kind, text, withEmailLink) => {
      status.replaceChildren();
      status.append(document.createTextNode(text));
      if (withEmailLink) {
        const link = document.createElement('a');
        link.href = 'mailto:' + email + '?subject=Photography%20enquiry';
        link.textContent = email;
        status.append(link);
      }
      status.className = 'form-status ' + kind;
      status.hidden = false;
      status.focus();
    };
    const requestedSession = new URLSearchParams(window.location.search).get('session');
    if (requestedSession) {
      const matchingRadio = Array.from(form.querySelectorAll('[name="session"]')).find((radio) => radio.value.toLowerCase() === requestedSession.toLowerCase());
      if (matchingRadio) matchingRadio.checked = true;
    }
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.hidden = true;
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        session: values.session,
        date: values.date,
        location: values.location.trim(),
        message: values.message.trim(),
        source: values.source || 'Website'
      };
      submit.disabled = true;
      submit.textContent = 'Sending enquiry…';
      form.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch('https://book.zacmclients.photos/api/enquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error('Enquiry endpoint returned ' + response.status);
        form.reset();
        showStatus('success', 'Thanks — your enquiry has been sent.', false);
      } catch (error) {
        showStatus('error', 'The form could not send your enquiry. Email Zac directly at ', true);
      } finally {
        submit.disabled = false;
        submit.textContent = initialButtonText;
        form.removeAttribute('aria-busy');
      }
    });
  }
});
