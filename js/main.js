document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));
    // Close nav when clicking outside
    document.addEventListener('click', (e) => {
      if (!toggle.contains(e.target) && !links.contains(e.target)) {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Scroll nav background
  const nav = document.getElementById('main-nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.style.background = window.scrollY > 50 ? 'rgba(13,13,13,0.98)' : 'rgba(13,13,13,0.92)';
    });
  }

  // Fade in on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

  // Lightbox
  const lightbox = document.querySelector('.lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('.lightbox-img');
    const imgs = Array.from(document.querySelectorAll('.masonry-item img'));
    let idx = 0;
    let previouslyFocused = null;

    const focusableInLightbox = () => Array.from(lightbox.querySelectorAll('button'));

    const show = (i) => {
      previouslyFocused = document.activeElement;
      idx = i;
      lbImg.src = imgs[i].src;
      lbImg.alt = imgs[i].alt || 'Portfolio image';
      lightbox.classList.add('active');
      document.body.style.overflow = 'hidden';
      // Move focus to close button when lightbox opens
      requestAnimationFrame(() => {
        const closeBtn = lightbox.querySelector('.lightbox-close');
        if (closeBtn) closeBtn.focus();
      });
    };

    const hide = () => {
      lightbox.classList.remove('active');
      document.body.style.overflow = '';
      // Restore focus to the element that triggered the lightbox
      if (previouslyFocused) previouslyFocused.focus();
    };

    imgs.forEach((img, i) => {
      img.addEventListener('click', () => show(i));
      // Make images keyboard-accessible
      img.setAttribute('tabindex', '0');
      img.setAttribute('role', 'button');
      img.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(i); }
      });
    });

    lightbox.querySelector('.lightbox-close')?.addEventListener('click', hide);
    lightbox.querySelector('.lightbox-prev')?.addEventListener('click', () => show((idx - 1 + imgs.length) % imgs.length));
    lightbox.querySelector('.lightbox-next')?.addEventListener('click', () => show((idx + 1) % imgs.length));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) hide(); });

    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') hide();
      if (e.key === 'ArrowLeft') show((idx - 1 + imgs.length) % imgs.length);
      if (e.key === 'ArrowRight') show((idx + 1) % imgs.length);
    });

    // Focus trap inside lightbox
    lightbox.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusable = focusableInLightbox();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  // Contact form validation
  const form = document.getElementById('enquiry-form');
  const status = document.getElementById('form-status');
  if (form && status) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = form.querySelector('[name="name"]');
      const email = form.querySelector('[name="email"]');
      const phone = form.querySelector('[name="phone"]');
      const session = form.querySelector('[name="session"]:checked');
      const date = form.querySelector('[name="date"]');
      const location = form.querySelector('[name="location"]');
      const message = form.querySelector('[name="message"]');

      // Validate required fields
      const missing = [
        name && !name.value.trim() && 'Name',
        email && !email.value.trim() && 'Email',
        phone && !phone.value.trim() && 'Phone number',
        !session && 'Session type',
        date && !date.value && 'Event date',
        location && !location.value.trim() && 'Event location',
        message && !message.value.trim() && 'Message',
      ].filter(Boolean);

      if (missing.length) {
        status.textContent = `Please fill in: ${missing.join(', ')}.`;
        status.className = 'form-status error';
        status.focus();
        return;
      }

      // Basic email format check
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
        status.textContent = 'Please enter a valid email address.';
        status.className = 'form-status error';
        status.focus();
        return;
      }

      status.textContent = 'Message sent! Zac will get back to you soon.';
      status.className = 'form-status success';
      status.focus();
      form.reset();
    });
  }
});
