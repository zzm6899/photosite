const siteAssets = Array.isArray(window.SITE_ASSETS) ? window.SITE_ASSETS : [];
const assetsByPage = siteAssets.reduce((groups, item) => {
  const key = item.page === "www.zacmorganphotography.com" ? "home" : item.page;
  groups[key] ||= [];
  groups[key].push({ src: item.src, alt: item.alt || "", position: "center" });
  return groups;
}, {});

const fallbackImage = {
  src: "/assets/site/001-www-zacmorganphotography-com.jpg",
  alt: "Zac Morgan Photography image",
  position: "center"
};
const assetAt = (page, index) => assetsByPage[page]?.[index] || fallbackImage;
const logoUrl = assetAt("shared", 0).src;
const homeImages = assetsByPage.home || [];
const portfolioImages = assetsByPage.portfolio || [];
const eventImages = assetsByPage.events || [];

const defaultState = {
  settings: {
    home: { mode: "feature", columns: 2, gap: 0, heroHeight: 560 },
    portfolio: { mode: "masonry", columns: 3, gap: 18, heroHeight: 480 },
    events: { mode: "masonry", columns: 3, gap: 18, heroHeight: 440 },
    testimonials: { mode: "grid", columns: 2, gap: 18, heroHeight: 500 },
    contact: { mode: "grid", columns: 2, gap: 18, heroHeight: 520 }
  },
  text: {},
  images: {
    logo: { src: logoUrl, alt: "Zac Morgan Photography logo", position: "center" },
    homeWedding: { ...assetAt("home", 3) },
    homeEvent: { ...assetAt("home", 4) },
    homeAction: { ...assetAt("home", 1) },
    homeBrand: { ...assetAt("home", 9) },
    homeParty: { ...assetAt("home", 0) },
    homeCorporate: { ...assetAt("home", 5) },
    testimonialsCta: { ...assetAt("testimonials", 0) },
    contactHero: { ...assetAt("contact", 0) },
    portfolio: portfolioImages.map((image) => ({ ...image, position: "center" })),
    events: eventImages.map((image) => ({ ...image, position: "center" }))
  }
};

const storageKey = "zac-local-site-v2";
const serverContentUrl = "/site-content.json";
const serverSaveUrl = "/api/content";
const app = document.querySelector("#app");
const state = loadState();
let currentPage = routeToPage(location.pathname);
let editing = false;
let selectedImage = null;
let serverSaveTimer = 0;
let carouselTimer = 0;

document.querySelector("[data-logo]").src = state.images.logo.src;
document.querySelector("[data-logo]").alt = state.images.logo.alt;
document.addEventListener("click", handleGlobalClick);
window.addEventListener("popstate", () => render(routeToPage(location.pathname)));

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return merge(defaultState, saved || {});
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  clearTimeout(serverSaveTimer);
  serverSaveTimer = setTimeout(() => {
    fetch(serverSaveUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state)
    }).catch(() => {});
  }, 300);
}

async function hydrateFromServer() {
  try {
    const response = await fetch(serverContentUrl, { cache: "no-store" });
    if (!response.ok) return;
    const serverState = await response.json();
    Object.assign(state, merge(state, serverState));
    localStorage.setItem(storageKey, JSON.stringify(state));
    render(currentPage);
  } catch {
    // Static hosting still works; it just falls back to localStorage-only edits.
  }
}

function merge(base, patch) {
  if (Array.isArray(base)) return Array.isArray(patch) ? patch : structuredClone(base);
  if (!base || typeof base !== "object") return patch ?? base;
  const out = structuredClone(base);
  Object.entries(patch || {}).forEach(([key, value]) => {
    out[key] = merge(out[key], value);
  });
  return out;
}

function routeToPage(path) {
  const clean = path.replace(/^\/|\/$/g, "");
  if (clean === "portfolio") return "portfolio";
  if (clean === "events") return "events";
  if (clean === "testimonials") return "testimonials";
  if (clean === "contact") return "contact";
  return "home";
}

function pageToPath(page) {
  return page === "home" ? "/" : `/${page}/`;
}

function handleGlobalClick(event) {
  const link = event.target.closest("[data-link]");
  if (!link) return;
  const url = new URL(link.href);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  history.pushState({}, "", url.pathname);
  render(routeToPage(url.pathname));
}

function render(page) {
  currentPage = page;
  clearInterval(carouselTimer);
  applyPageSettings();
  document.title = page === "home" ? "Zac Morgan Photography" : `${title(page)} - Zac Morgan Photography`;
  document.body.dataset.page = page;
  document.querySelectorAll("[data-link]").forEach((link) => {
    const isCurrent = new URL(link.href).pathname === pageToPath(page);
    if (isCurrent) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  app.innerHTML = templates[page]();
  app.focus({ preventScroll: true });
  hydrateEditableText();
  hydrateEditableImages();
  hydrateCarousel();
  hydrateLightbox();
  syncEditor();
}

function title(page) {
  return page.charAt(0).toUpperCase() + page.slice(1);
}

function applyPageSettings() {
  const settings = state.settings[currentPage];
  document.documentElement.style.setProperty("--columns", settings.columns);
  document.documentElement.style.setProperty("--gap", `${settings.gap}px`);
  document.documentElement.style.setProperty("--hero-height", `${settings.heroHeight}px`);
}

function text(key, fallback) {
  return state.text[key] ?? fallback;
}

function editable(key, fallback, tag = "span") {
  return `<${tag} data-editable data-key="${key}">${escapeHtml(text(key, fallback))}</${tag}>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function imageHtml(ref, className = "image-tile", extra = "") {
  const data = resolveImage(ref);
  const priority = className.includes("portfolio-cover") || className.includes("wide-image");
  return `
    <div class="${className} editable-image" data-image-ref="${ref}" data-lightbox-image="${data.src}" data-lightbox-alt="${escapeHtml(data.alt)}" ${extra}>
      <span class="image-edit-badge">Edit image</span>
      <img src="${data.src}" alt="${escapeHtml(data.alt)}" style="--pos: ${data.position || "center"}" loading="${priority ? "eager" : "lazy"}" decoding="async">
      <span class="image-view-label">View</span>
    </div>
  `;
}

function resolveImage(ref) {
  if (ref.includes(".")) {
    const [group, index] = ref.split(".");
    return state.images[group][Number(index)];
  }
  return state.images[ref];
}

const templates = {
  home: () => `
    <article class="page">
      ${homeCarousel()}
      <section class="section narrow">
        ${editable("home.about.title", "Hey, I'm zac an event / wedding photographer", "h2")}
        ${editable("home.about.sub", "Let’s get to know each other", "p")}
        ${editable("home.about.body", "Photography has been my hobby since I was a child. Capturing the moment and sharing those memories is what makes me happy .", "p")}
        <a class="button-link" href="/portfolio/" data-link>Check out my work</a>
      </section>
      <section class="text-band">
        <div class="quote-shell">
          <p class="quote">${escapeHtml(text("home.quote", "\"Zac Morgan really was the ultimate professional, capturing only the best of photos for my son’s 21st. Would definitely recommend him to anyone who is looking for the ultimate professional. Thank you Zac for creating a lifetime of memories.\""))}</p>
          <p class="quote-author">— Henry M</p>
          <div class="feature-links">
            <a href="/portfolio/" data-link>Engagements / Weddings</a>
            <a href="/portfolio/" data-link>Band Photos</a>
            <a href="/events/" data-link>Corporate Events</a>
            <a href="/portfolio/" data-link>Parties</a>
          </div>
        </div>
      </section>
    </article>
  `,
  portfolio: () => `
    <article class="page">
      <section class="portfolio-showcase">
        <div class="portfolio-copy">
          <p class="eyebrow">Zac Morgan Photography</p>
          ${editable("portfolio.title", "Portfolio", "h1")}
          ${editable("portfolio.sub", "Editorial event, wedding, hospitality, and portrait photography with a natural finish and a polished commercial eye.", "h3")}
          ${editable("portfolio.body1", "A curated selection of commissioned work, built around atmosphere, detail, movement, and honest colour.", "p")}
          <div class="button-row">
            <a class="button-link" href="/contact/" data-link>Book a shoot</a>
            <a class="button-link secondary" href="/events/" data-link>Business portfolio</a>
          </div>
        </div>
        <div class="portfolio-cover" aria-label="Featured portfolio images">
          ${imageHtml("portfolio.0", "portfolio-cover-main")}
          ${imageHtml("portfolio.1", "portfolio-cover-side top")}
          ${imageHtml("portfolio.2", "portfolio-cover-side bottom")}
        </div>
      </section>
      <section class="gallery-heading">
        <p class="eyebrow">Selected Work</p>
        ${editable("portfolio.galleryHeading", "Clean, vivid coverage across real moments and produced spaces.", "h2")}
      </section>
      ${gallery("portfolio")}
      <section class="section narrow dark-band">
        ${editable("portfolio.cta", "Like What you see?", "h2")}
        <a class="button-link" href="/contact/" data-link>Contact Now</a>
      </section>
    </article>
  `,
  events: () => `
    <article class="page">
      <section class="events-top">
        ${hero("events.0", "events.formals.title", "Formals", "events.formals.sub", "Let’s capture it together", "/contact/", "Connect", "small")}
        ${hero("events.1", "events.parties.title", "Parties", "events.parties.sub", "Let’s capture it together", "/contact/", "Connect", "small")}
        ${hero("events.2", "events.business.title", "Business", "events.business.sub", "Let’s capture it together", "/contact/", "Connect", "small")}
      </section>
      <section class="section narrow page-intro">
        <p class="eyebrow">Branding / Events</p>
        ${editable("events.intro2", "Brand moments with atmosphere, detail, and intent.", "h2")}
        ${editable("events.body1", "Corporate events, launches, hospitality activations, and formal celebrations photographed with a clean editorial eye.", "p")}
      </section>
      ${gallery("events")}
      <section class="section narrow">
        ${editable("events.cta", "interested in what i can do for you?", "h2")}
        <a class="button-link" href="/contact/" data-link>Let's Connect</a>
      </section>
    </article>
  `,
  testimonials: () => `
    <article class="page">
      <section class="reviews page-intro">
        <p class="eyebrow">Testimonials</p>
        ${editable("testimonials.title", "Reviews from my Clients", "h1")}
        ${reviews.map((review, index) => `
          <div class="review">
            <blockquote data-editable data-key="review.${index}.quote">${escapeHtml(text(`review.${index}.quote`, `"${review.quote}"`))}</blockquote>
            <cite data-editable data-key="review.${index}.author">- ${escapeHtml(text(`review.${index}.author`, review.author))}</cite>
          </div>
        `).join("")}
      </section>
      <section class="cta-image">
        ${imageHtml("testimonialsCta", "wide-image")}
      </section>
      <section class="section narrow">
        ${editable("testimonials.cta", "Ready to enquire?", "h2")}
        <a class="button-link" href="/contact/" data-link>Let's Connect</a>
      </section>
    </article>
  `,
  contact: () => `
    <article class="page">
      <section class="section contact-layout">
        ${imageHtml("contactHero", "wide-image")}
        <div>
          ${editable("contact.title", "Let's start your Journey", "h2")}
          ${editable("contact.body1", "Are you ready to showcase your brand, capture impactful moments, and elevate your business presence through powerful imagery? As a professional event and branding photographer, I’m here to help you create visuals that leave a lasting impression.", "p")}
          ${editable("contact.body2", "Whether it’s a corporate event, product launch, conference, gala, or commercial shoot, I’m dedicated to documenting the essence of your brand with precision and creativity. Every shot is crafted to highlight the energy, professionalism, and unique story behind your business.", "p")}
          ${editable("contact.body3", "Let’s collaborate to ensure every detail, every connection, and every meaningful moment is beautifully captured—providing you with high-quality visuals that resonate with your audience and stand the test of time.", "p")}
          ${contactForm()}
        </div>
      </section>
    </article>
  `
};

function homeCarousel() {
  const slides = [
    ["homeWedding", "home.hero1.title", "Wedding / Engagement Shoots", "home.hero1.sub", "For your personal records", "/portfolio/", "View Portfolio"],
    ["homeEvent", "home.hero2.title", "Event Photography", "home.hero2.sub", "Time to create memories", "/events/", "View Portfolio"],
    ["homeAction", "home.hero3.title", "Live in action", "home.hero3.sub", "Time to immerse yourself", "/events/", "View Portfolio"],
    ["homeBrand", "home.hero4.title", "Brand/ Business Shoots", "home.hero4.sub", "Images for your business / Social Media", "/events/", "Learn more"],
    ["homeParty", "home.hero5.title", "Parties", "home.hero5.sub", "Let’s capture it together", "/portfolio/", "Learn more"],
    ["homeCorporate", "home.hero6.title", "Corporate Events", "home.hero6.sub", "Let’s capture it together", "/events/", "Learn more"]
  ];

  return `
    <section class="hero-carousel" data-carousel aria-label="Featured photography services">
      <div class="carousel-track">
        ${slides.map(([imageRef, titleKey, titleText, subKey, subText, href, cta], index) => {
          const data = resolveImage(imageRef);
          return `
            <section class="hero-slide editable-image ${index === 0 ? "is-active" : ""}" data-slide="${index}" data-image-ref="${imageRef}" aria-hidden="${index === 0 ? "false" : "true"}">
              <span class="image-edit-badge">Edit image</span>
              <img src="${data.src}" alt="${escapeHtml(data.alt)}" style="--pos: ${data.position || "center"}">
              <div class="hero-copy">
                ${editable(titleKey, titleText, "h1")}
                ${editable(subKey, subText, "p")}
                <a class="button-link" href="${href}" data-link>${cta}</a>
              </div>
            </section>
          `;
        }).join("")}
      </div>
      <button class="carousel-button prev" type="button" data-carousel-prev aria-label="Previous slide">‹</button>
      <button class="carousel-button next" type="button" data-carousel-next aria-label="Next slide">›</button>
      <div class="carousel-dots" aria-label="Choose slide">
        ${slides.map((_, index) => `<button type="button" data-carousel-dot="${index}" class="${index === 0 ? "is-active" : ""}" aria-label="Show slide ${index + 1}"></button>`).join("")}
      </div>
    </section>
  `;
}

function hero(imageRef, titleKey, titleText, subKey, subText, href, cta, size = "") {
  const data = resolveImage(imageRef);
  return `
    <section class="hero-card ${size} editable-image" data-image-ref="${imageRef}">
      <span class="image-edit-badge">Edit image</span>
      <img src="${data.src}" alt="${escapeHtml(data.alt)}" style="--pos: ${data.position || "center"}">
      <div class="hero-copy">
        ${editable(titleKey, titleText, "h1")}
        ${subText ? editable(subKey, subText, "p") : ""}
        <a class="button-link" href="${href}" data-link>${cta}</a>
      </div>
    </section>
  `;
}

function gallery(group) {
  const modeClass = `${state.settings[currentPage].mode}-mode`;
  return `
    <section class="gallery-grid ${modeClass}" aria-label="${group} gallery">
      ${state.images[group].map((_, index) => imageHtml(`${group}.${index}`, `image-tile ${index % 5 === 1 ? "tall" : ""} ${index % 6 === 2 ? "wide" : ""}`)).join("")}
    </section>
  `;
}

const reviews = [
  { author: "Alexander", quote: "Zac's photo's for our wedding were amazing. He was professional, genuine and out to ensure we captured the day very well. He was pleasant and kind throughout the day . He was able to capture great photos of us, our families and candid photos from the day. Highly recommend his services." },
  { author: "Jorden", quote: "I recently had a photoshoot with Zac from Speedy Photography, and I was blown away by the experience. Not only were the photos stunning, but Zac also made sure the session was fun and relaxed. The turnaround time was incredibly fast, too. Highly recommend!" },
  { author: "Luisa Munoz", quote: "Thanks so much Zac for your amazing work at our wedding. I am loving all the photos that captured the best day of my life. You're awesome and easy to work with." },
  { author: "Henry Makhouf", quote: "Zac Morgan really was the ultimate professional, capturing only the best of photos for my son’s 21st . Would definitely recommend him to anyone who is looking for the ultimate professional thank you Zac for creating a lifetime of of memories" },
  { author: "Keith", quote: "Amazing work from Zac with his help at a family birthday party of ours. The photos were outstanding and his turn around time was very speedy, highly recommend." },
  { author: "R osanna", quote: "Amazing work from Zac who took photos for my engagement party. He was very professional and followed the requests to take photos on the night. The turnaround time was very speedy and the photos were of high quality Would highly recommend Zac!" },
  { author: "Lorenzo", quote: "Zak was professional, punctual and a great communicator. He delivered the images promptly and had handled the brief with professionalism and flare. Would highly recommend Zac for your next event." },
  { author: "Purification", quote: "He's so courteous and friendly. And all his photos are great. And I highly recommend him" }
];

function contactForm() {
  const sessionTypes = ["Event Shoot", "Corporate Event", "Wedding", "Business Shoot", "Casual", "Other"];
  return `
    <form class="contact-form" action="mailto:hello@example.com" method="post" enctype="text/plain">
      <label>Your name *<input name="name" required></label>
      <label>Email address *<input type="email" name="email" required></label>
      <label class="full">Phone Number *<input type="tel" name="phone" required></label>
      <div class="radio-grid">
        ${sessionTypes.map((type) => `<label><input type="radio" name="session" value="${type}">${type}</label>`).join("")}
      </div>
      <label>Event Date *<input type="date" name="date" required></label>
      <label>Event Location *<input name="location" required></label>
      <label class="full">Details / message *<textarea name="message" rows="6" required></textarea></label>
      <label class="full">How did you hear about me?
        <select name="source">
          <option>Select option</option>
          <option>From a recent shoot</option>
          <option>Ad</option>
          <option>Instagram</option>
          <option>Google</option>
          <option>From a friend</option>
          <option>Bark / Oneflare / AirTasker</option>
          <option>Other</option>
        </select>
      </label>
      <button type="submit">Send Message</button>
    </form>
  `;
}

function hydrateEditableText() {
  document.querySelectorAll("[data-editable]").forEach((node) => {
    node.contentEditable = editing ? "true" : "false";
    node.addEventListener("blur", () => {
      state.text[node.dataset.key] = node.textContent.trim();
      saveState();
    });
  });
}

function hydrateEditableImages() {
  document.querySelectorAll(".editable-image").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (!editing) return;
      event.preventDefault();
      event.stopPropagation();
      selectImage(node.dataset.imageRef);
    });
  });
}

function hydrateLightbox() {
  document.querySelectorAll("[data-lightbox-image]").forEach((node) => {
    node.addEventListener("click", (event) => {
      if (editing) return;
      event.preventDefault();
      const src = node.dataset.lightboxImage;
      const alt = node.dataset.lightboxAlt || "";
      const lightbox = document.createElement("div");
      lightbox.className = "lightbox";
      lightbox.innerHTML = `
        <button type="button" class="lightbox-close" aria-label="Close image">×</button>
        <img src="${src}" alt="${escapeHtml(alt)}">
      `;
      const close = () => lightbox.remove();
      lightbox.addEventListener("click", (clickEvent) => {
        if (clickEvent.target === lightbox || clickEvent.target.closest(".lightbox-close")) close();
      });
      document.addEventListener("keydown", function onKeydown(keyEvent) {
        if (keyEvent.key !== "Escape") return;
        close();
        document.removeEventListener("keydown", onKeydown);
      });
      document.body.appendChild(lightbox);
    });
  });
}

function hydrateCarousel() {
  const carousel = document.querySelector("[data-carousel]");
  if (!carousel) return;

  let active = 0;
  const slides = [...carousel.querySelectorAll("[data-slide]")];
  const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
  const show = (index) => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === active;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
    });
    dots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === active));
  };

  carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => show(active - 1));
  carousel.querySelector("[data-carousel-next]").addEventListener("click", () => show(active + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => show(index)));

  carouselTimer = setInterval(() => {
    if (!editing) show(active + 1);
  }, 5200);
}

function bindEditor() {
  document.querySelector("[data-edit-toggle]").addEventListener("click", () => setEditing(!editing));
  document.querySelector("[data-close-editor]").addEventListener("click", () => setEditing(false));

  document.querySelectorAll("[data-layout-control]").forEach((control) => {
    control.addEventListener("input", () => {
      const key = control.dataset.layoutControl;
      state.settings[currentPage][key] = key === "mode" ? control.value : Number(control.value);
      saveState();
      render(currentPage);
    });
  });

  document.querySelector("[data-image-url]").addEventListener("change", (event) => {
    if (!selectedImage || !event.target.value) return;
    updateSelectedImage({ src: event.target.value });
  });

  document.querySelector("[data-image-position]").addEventListener("change", (event) => {
    if (!selectedImage) return;
    updateSelectedImage({ position: event.target.value });
  });

  document.querySelector("[data-image-alt]").addEventListener("input", (event) => {
    if (!selectedImage) return;
    updateSelectedImage({ alt: event.target.value }, false);
  });

  document.querySelector("[data-image-upload]").addEventListener("change", (event) => {
    if (!selectedImage || !event.target.files[0]) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => updateSelectedImage({ src: reader.result }));
    reader.readAsDataURL(event.target.files[0]);
  });

  document.querySelector("[data-export]").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zac-site-content.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  document.querySelector("[data-import]").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      Object.assign(state, merge(defaultState, JSON.parse(reader.result)));
      saveState();
      render(currentPage);
    });
    reader.readAsText(file);
  });

  document.querySelector("[data-reset]").addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    location.reload();
  });
}

function setEditing(value) {
  editing = value;
  document.body.classList.toggle("editing", editing);
  hydrateEditableText();
  if (!editing) {
    selectedImage = null;
    document.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  }
}

function syncEditor() {
  document.querySelector("[data-editor-page]").textContent = title(currentPage);
  Object.entries(state.settings[currentPage]).forEach(([key, value]) => {
    const control = document.querySelector(`[data-layout-control="${key}"]`);
    if (control) control.value = value;
  });
}

function selectImage(ref) {
  selectedImage = ref;
  document.querySelectorAll(".is-selected").forEach((node) => node.classList.remove("is-selected"));
  const node = document.querySelector(`[data-image-ref="${CSS.escape(ref)}"]`);
  if (node) node.classList.add("is-selected");
  const image = resolveImage(ref);
  document.querySelector("[data-image-url]").value = image.src;
  document.querySelector("[data-image-position]").value = image.position || "center";
  document.querySelector("[data-image-alt]").value = image.alt || "";
}

function updateSelectedImage(patch, rerender = true) {
  if (selectedImage.includes(".")) {
    const [group, index] = selectedImage.split(".");
    Object.assign(state.images[group][Number(index)], patch);
  } else {
    Object.assign(state.images[selectedImage], patch);
  }
  saveState();
  if (rerender) render(currentPage);
}

bindEditor();
render(currentPage);
hydrateFromServer();
