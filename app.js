const siteAssets = Array.isArray(window.SITE_ASSETS) ? window.SITE_ASSETS : [];
const imageDescriptions = {
  "011-portfolio.jpg": "Guests celebrating on a dance floor, photographed with colourful motion blur.",
  "019-portfolio.jpg": "Hands holding a skincare bottle in direct sunlight.",
  "025-portfolio.jpg": "A groom lifts his bride beside Sydney Harbour.",
  "027-portfolio.jpg": "Wedding rings and a bouquet of red roses.",
  "031-portfolio.jpg": "A bartender garnishes a red cocktail with a slice of orange.",
  "038-portfolio.jpg": "A portrait of a woman in sunglasses seated on a garden bench.",
  "043-portfolio.jpg": "Guests enjoying lunch outside the Beach Hut restaurant.",
  "044-portfolio.jpg": "Balter Cerveza bottles displayed on a sunlit bar.",
  "096-events.jpg": "A speaker facing a ballroom filled with seated guests."
};
const assetsByPage = siteAssets.reduce((groups, item) => {
  const key = item.page === "www.zacmorganphotography.com" ? "home" : item.page;
  groups[key] ||= [];
  groups[key].push({ src: item.src, alt: imageDescriptions[item.src.split("/").pop()] || item.alt || "", position: "center" });
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
    portfolioLead: { ...assetAt("portfolio", 14), alt: "Newlyweds embracing by Sydney Harbour, the bride's dress caught in the breeze." },
    portfolioPortrait: { ...assetAt("portfolio", 1), alt: "Studio portrait of a woman in a red dress against a soft grey backdrop." },
    portfolioLive: { ...assetAt("portfolio", 42), alt: "A singer on stage beneath beams of blue light." },
    homePerformance: { ...assetAt("events", 20), alt: "A DJ performing beneath blue and yellow stage lighting." },
    commercialLead: { ...assetAt("events", 39), alt: "A speaker preparing to address guests in an elegantly lit ballroom." },
    contactFeature: { ...assetAt("portfolio", 35), alt: "A couple sharing a quiet moment beneath flowering trees." },
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
let disposeMotion = () => {};
let disposeCarousel = () => {};
const galleryFilters = { portfolio: "selected", events: "selected" };
const collectionLabels = { selected: "Selected", weddings: "Weddings", events: "Events & live", commercial: "Brands & hospitality", portraits: "Portraits", all: "All work" };
const collections = {
  portfolio: {
    selected: [14, 1, 42, 20, 29, 8, 25, 33, 3, 15, 9, 43, 30, 36, 27, 35, 18, 45],
    weddings: [14, 35, 29, 30, 23, 15, 2, 16, 19, 25, 31],
    events: [42, 43, 44, 45, 38, 3, 13, 12, 17, 18, 0, 5, 6, 7, 39, 40, 41],
    commercial: [20, 36, 33, 4, 8, 9, 10, 11, 21, 22, 24, 32, 34, 37],
    portraits: [1, 27, 28, 26]
  },
  events: { selected: [39, 25, 40, 29, 5, 36, 19, 35, 4, 13, 30, 37, 20, 21, 32, 41, 7, 22] }
};

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
  window.scrollTo({ top: 0, behavior: "instant" });
  render(routeToPage(url.pathname));
}

function render(page) {
  setMenuOpen(false);
  currentPage = page;
  disposeMotion();
  disposeCarousel();
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
  hydrateGalleryFilters();
  hydrateContactForm();
  syncEditor();
  disposeMotion = window.SiteMotion?.mount(app) || (() => {});
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
  const dimensions = window.SITE_IMAGE_DIMENSIONS?.[data.src];
  const size = dimensions ? `width="${dimensions[0]}" height="${dimensions[1]}"` : "";
  const priority = className.includes("cover") || className.includes("wide-image");
  return `
    <div class="${className} editable-image" role="button" tabindex="0" aria-label="View photograph: ${escapeHtml(data.alt)}" data-image-ref="${ref}" data-lightbox-image="${escapeHtml(data.src)}" data-lightbox-alt="${escapeHtml(data.alt)}" ${extra}>
      <span class="image-edit-badge">Edit image</span>
      <img src="${escapeHtml(data.src)}" ${size} alt="${escapeHtml(data.alt)}" style="--pos: ${escapeHtml(data.position || "center")}" loading="${priority ? "eager" : "lazy"}" decoding="async">
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
        <p class="eyebrow">Behind the camera</p>
        ${editable("home.about.title", "Hi, I'm Zac.", "h2")}
        ${editable("home.about.sub", "Photographs with feeling. An eye for the details.", "h3")}
        ${editable("home.about.body", "From a wedding's quiet moments to the energy of a live show, I photograph people at their most natural. My work brings together honest connection, considered composition, and the atmosphere that makes each occasion its own.", "p")}
        <a class="button-link" href="/portfolio/" data-link>Explore my work</a>
      </section>
      <section class="home-selections" aria-label="Explore the collections">
        ${collectionCard("portfolioLead", "Weddings & couples", "/portfolio/", "01")}
        ${collectionCard("portfolioLive", "Events & live music", "/events/", "02")}
        ${collectionCard("commercialLead", "Brands & hospitality", "/events/", "03")}
      </section>
      <section class="text-band">
        <div class="quote-shell">
          <p class="eyebrow">Kind words</p>
          <p class="quote">${escapeHtml(text("home.quote.v2", "\"He was able to capture great photos of us, our families and candid photos from the day. Highly recommend his services.\""))}</p>
          <p class="quote-author">Alexander · Wedding photography</p>
          <div class="feature-links">
            <a href="/testimonials/" data-link>More client stories</a>
            <a href="/contact/" data-link>Enquire about a shoot</a>
          </div>
        </div>
      </section>
    </article>
  `,
  portfolio: () => `
    <article class="page">
      <section class="portfolio-showcase">
        <div class="portfolio-intro">
          <div><p class="eyebrow">Zac Morgan Photography / Portfolio</p>
          ${editable("portfolio.title", "Selected work", "h1")}</div>
          ${editable("portfolio.sub", "A quiet glance. A room full of energy. The details that bring a story to life.", "p")}
        </div>
        <div class="portfolio-cover" aria-label="Featured portfolio images">
          <figure>${imageHtml("portfolioLead", "cover-image")}<figcaption><span>Weddings & couples</span><span>01</span></figcaption></figure>
          <figure>${imageHtml("portfolioPortrait", "cover-image")}<figcaption><span>Portraits</span><span>02</span></figcaption></figure>
          <figure>${imageHtml("portfolioLive", "cover-image")}<figcaption><span>Live performance</span><span>03</span></figcaption></figure>
        </div>
      </section>
      ${galleryBrowser("portfolio")}
      ${enquiryBand("portfolio.cta", "Your story, thoughtfully captured.")}
    </article>
  `,
  events: () => `
    <article class="page">
      <section class="commercial-hero">
        ${hero("commercialLead", "events.title", "Brands & events", "events.sub", "The people, places, and details behind your business.", "/contact/", "Discuss your brief")}
      </section>
      <section class="section service-intro">
        <div><p class="eyebrow">Commercial photography</p>${editable("events.intro2", "Make the right impression.", "h2")}</div>
        <div>${editable("events.body1", "From conferences and product launches to restaurant menus and live performances, I create photographs that capture the character of your business and the energy of your event.", "p")}
        <p class="service-list">Corporate events · Hospitality · Products · Live music</p></div>
      </section>
      ${galleryBrowser("events")}
      ${enquiryBand("events.cta", "Let's bring your next brief to life.")}
    </article>
  `,
  testimonials: () => `
    <article class="page">
      <section class="reviews page-intro">
        <p class="eyebrow">Testimonials</p>
        ${editable("testimonials.title", "Kind words", "h1")}
        <p class="reviews-intro">A few words from the people I've had the pleasure of photographing.</p>
        <div class="reviews-grid">
        ${reviews.map((review, index) => `
          <div class="review">
            <blockquote data-editable data-key="review.${index}.quote">${escapeHtml(text(`review.${index}.quote`, `"${review.quote}"`))}</blockquote>
            <cite data-editable data-key="review.${index}.author">- ${escapeHtml(text(`review.${index}.author`, review.author))}</cite>
          </div>
        `).join("")}
        </div>
      </section>
      <section class="cta-image">
        ${imageHtml("testimonialsCta", "wide-image")}
      </section>
      ${enquiryBand("testimonials.cta", "Let's make something worth remembering.")}
    </article>
  `,
  contact: () => `
    <article class="page">
      <section class="section contact-layout">
        ${imageHtml("contactFeature", "contact-image wide-image")}
        <div>
          <p class="eyebrow">Enquiries</p>
          ${editable("contact.title", "Let's work together.", "h1")}
          ${editable("contact.body1", "Planning a wedding, hosting an event, or creating something for your brand? Tell me a little about it. I'd love to hear what you have in mind.", "p")}
          <a class="contact-email" href="mailto:zacmorganphotography@gmail.com">zacmorganphotography@gmail.com</a>
          ${contactForm()}
        </div>
      </section>
    </article>
  `
};

function homeCarousel() {
  const slides = [
    ["homeWedding", "home.hero1.title", "Weddings & couples", "home.hero1.sub", "The big feelings. The little moments. All yours.", "/portfolio/", "Explore the portfolio"],
    ["homePerformance", "home.hero3.title", "Live performance", "home.hero3.sub", "The energy of the room, held in a photograph.", "/events/", "Explore events"],
    ["homeBrand", "home.hero4.title", "Brands & hospitality", "home.hero4.sub", "An eye for the details that make you different.", "/events/", "View commercial work"]
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
                <p class="eyebrow">Zac Morgan Photography</p>
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
      <button class="carousel-pause" type="button" data-carousel-pause aria-label="Pause slideshow" title="Pause slideshow"><span aria-hidden="true">&#10074;&#10074;</span></button>
      <span class="carousel-count" data-carousel-count aria-hidden="true">01 / 03</span>
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

function collectionCard(ref, label, href, number) {
  return `<figure>${imageHtml(ref, "collection-image")}<figcaption><a href="${href}" data-link>${label}</a><span>${number}</span></figcaption></figure>`;
}

function enquiryBand(key, heading) {
  return `<section class="enquiry-band"><div><p class="eyebrow">Create something personal</p>${editable(key, heading, "h2")}</div><a class="button-link" href="/contact/" data-link>Enquire about a shoot <span aria-hidden="true">&#8599;</span></a></section>`;
}

function galleryBrowser(group) {
  const filters = group === "portfolio" ? Object.keys(collectionLabels) : ["selected", "all"];
  return `<section class="gallery-browser" data-gallery-browser="${group}">
    <div class="gallery-toolbar"><div class="collection-filters" aria-label="Photography collections">${filters.map(filter => `<button type="button" data-filter="${filter}" aria-pressed="${galleryFilters[group] === filter}">${collectionLabels[filter]}</button>`).join("")}</div><span class="gallery-count" aria-live="polite"></span></div>
    <div data-gallery-results>${gallery(group)}</div>
  </section>`;
}

function gallery(group) {
  const modeClass = `${state.settings[currentPage].mode}-mode`;
  const indices = galleryFilters[group] === "all" ? state.images[group].map((_, index) => index) : collections[group][galleryFilters[group]];
  return `
    <section class="gallery-grid ${modeClass}" aria-label="${group} gallery">
      ${indices.filter(index => state.images[group][index]).map(index => imageHtml(`${group}.${index}`)).join("")}
    </section>
  `;
}

function hydrateGalleryFilters() {
  const browser = app.querySelector("[data-gallery-browser]");
  if (!browser) return;
  const group = browser.dataset.galleryBrowser;
  const updateCount = () => { browser.querySelector(".gallery-count").textContent = `${browser.querySelectorAll(".image-tile").length} photographs`; };
  updateCount();
  browser.querySelectorAll("[data-filter]").forEach(button => button.addEventListener("click", () => {
    galleryFilters[group] = button.dataset.filter;
    browser.querySelectorAll("[data-filter]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    browser.querySelector("[data-gallery-results]").innerHTML = gallery(group);
    hydrateEditableImages();
    hydrateLightbox();
    disposeMotion();
    disposeMotion = window.SiteMotion?.mount(app) || (() => {});
    updateCount();
  }));
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
  const sessionTypes = ["Wedding or engagement", "Event or live music", "Brand or hospitality", "Portrait", "Other"];
  return `
    <form class="contact-form" action="mailto:zacmorganphotography@gmail.com" method="post" enctype="text/plain">
      <label>Your name *<input name="name" autocomplete="name" required></label>
      <label>Email address *<input type="email" name="email" autocomplete="email" required></label>
      <label class="full">Phone number<input type="tel" name="phone" autocomplete="tel"></label>
      <fieldset class="radio-grid"><legend>What are you planning?</legend>
        ${sessionTypes.map((type) => `<label><input type="radio" name="session" value="${type}">${type}</label>`).join("")}
      </fieldset>
      <label>Date, if known<input type="date" name="date"></label>
      <label>Location<input name="location"></label>
      <label class="full">Tell me about your plans *<textarea name="message" rows="4" required></textarea></label>
      <label class="full">How did you hear about me?
        <select name="source">
          <option value="">Please select</option>
          <option>From a recent shoot</option>
          <option>Advertisement</option>
          <option>Instagram</option>
          <option>Google</option>
          <option>From a friend</option>
          <option>Bark / Oneflare / Airtasker</option>
          <option>Other</option>
        </select>
      </label>
      <button type="submit">Continue to email <span aria-hidden="true">&#8599;</span></button>
      <p class="form-note full">Your email app will open with your enquiry ready to send.</p>
    </form>
  `;
}

function hydrateContactForm() {
  app.querySelector(".contact-form")?.addEventListener("submit", event => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const labels = { name: "Name", email: "Email", phone: "Phone", session: "Photography", date: "Date", location: "Location", message: "Plans", source: "Referral" };
    const body = [...values.entries()].filter(([, value]) => value).map(([key, value]) => `${labels[key]}: ${value}`).join("\n\n");
    location.href = `mailto:zacmorganphotography@gmail.com?subject=${encodeURIComponent(`Photography enquiry from ${values.get("name")}`)}&body=${encodeURIComponent(body)}`;
  });
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
    if (node.dataset.editBound) return;
    node.dataset.editBound = "true";
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
    if (node.dataset.lightboxBound) return;
    node.dataset.lightboxBound = "true";
    node.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); node.click(); }
    });
    node.addEventListener("click", (event) => {
      if (editing) return;
      event.preventDefault();
      const src = node.dataset.lightboxImage;
      const alt = node.dataset.lightboxAlt || "";
      const lightbox = document.createElement("dialog");
      lightbox.className = "lightbox";
      lightbox.setAttribute("aria-label", "Photograph viewer");
      lightbox.innerHTML = `
        <button type="button" class="lightbox-close" aria-label="Close image">×</button>
        <img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">
      `;
      const close = () => { lightbox.close(); lightbox.remove(); node.focus({ preventScroll: true }); };
      lightbox.addEventListener("click", (clickEvent) => {
        if (clickEvent.target === lightbox || clickEvent.target.closest(".lightbox-close")) close();
      });
      lightbox.addEventListener("cancel", event => { event.preventDefault(); close(); });
      document.body.appendChild(lightbox);
      lightbox.showModal();
    });
  });
}

function hydrateCarousel() {
  const carousel = document.querySelector("[data-carousel]");
  if (!carousel) return;

  let active = 0;
  const controller = new AbortController();
  const options = { signal: controller.signal };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  let paused = reducedMotion.matches;
  let hovered = false;
  let focused = false;
  const pauseButton = carousel.querySelector("[data-carousel-pause]");
  const slides = [...carousel.querySelectorAll("[data-slide]")];
  const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
  const show = (index) => {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const isActive = slideIndex === active;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", isActive ? "false" : "true");
      slide.inert = !isActive;
    });
    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === active);
      dot.setAttribute("aria-pressed", String(dotIndex === active));
    });
    carousel.querySelector("[data-carousel-count]").textContent = `${String(active + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}`;
    carousel.dispatchEvent(new CustomEvent("slidechange"));
  };

  carousel.querySelector("[data-carousel-prev]").addEventListener("click", () => show(active - 1));
  carousel.querySelector("[data-carousel-next]").addEventListener("click", () => show(active + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => show(index)));

  const syncPlayback = () => {
    clearInterval(carouselTimer);
    pauseButton.setAttribute("aria-label", paused ? "Play slideshow" : "Pause slideshow");
    pauseButton.title = paused ? "Play slideshow" : "Pause slideshow";
    pauseButton.firstElementChild.textContent = paused ? "\u25b6" : "\u275a\u275a";
    if (!paused && !hovered && !focused && !document.hidden && !editing) {
      carouselTimer = setInterval(() => show(active + 1), 6200);
    }
  };
  pauseButton.addEventListener("click", () => { paused = !paused; syncPlayback(); }, options);
  carousel.addEventListener("pointerenter", (event) => { hovered = event.pointerType === "mouse"; syncPlayback(); }, options);
  carousel.addEventListener("pointerleave", () => { hovered = false; syncPlayback(); }, options);
  carousel.addEventListener("focusin", () => { focused = true; syncPlayback(); }, options);
  carousel.addEventListener("focusout", (event) => { focused = carousel.contains(event.relatedTarget); syncPlayback(); }, options);
  document.addEventListener("visibilitychange", syncPlayback, options);
  document.addEventListener("editingchange", syncPlayback, options);
  reducedMotion.addEventListener("change", () => { paused = reducedMotion.matches; syncPlayback(); }, options);
  show(0);
  syncPlayback();
  disposeCarousel = () => { controller.abort(); clearInterval(carouselTimer); };
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
  document.querySelector("[data-editor]").inert = !value;
  document.body.classList.toggle("editing", editing);
  document.dispatchEvent(new Event("editingchange"));
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

function setMenuOpen(open) {
  const toggle = document.querySelector(".menu-toggle");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  toggle.title = open ? "Close navigation" : "Open navigation";
  document.querySelector(".nav-links").classList.toggle("is-open", open);
}

document.querySelector(".menu-toggle").addEventListener("click", event => setMenuOpen(event.currentTarget.getAttribute("aria-expanded") !== "true"));
document.addEventListener("keydown", event => { if (event.key === "Escape") setMenuOpen(false); });
bindEditor();
render(currentPage);
hydrateFromServer();
