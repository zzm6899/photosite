# Zac Morgan Photography — Local Docker Site

A pixel-faithful local recreation of zacmorganphotography.com, served via Nginx in Docker.

## Quick Start

```bash
cd zacmorgan-site

# Build and run
docker compose up --build -d

# Visit
open http://localhost:8080
```

## Stop / Remove

```bash
docker compose down
```

## File Structure

```
zacmorgan-site/
├── index.html          ← Homepage
├── pages/
│   ├── portfolio.html  ← Portfolio gallery
│   ├── events.html     ← Branding & Events
│   ├── testimonials.html ← Client reviews
│   └── contact.html    ← Enquiry form → book.zacmclients.photos/admin
├── css/
│   └── style.css       ← All styles (edit freely)
├── js/
│   └── main.js         ← Slider, lightbox, form submit
├── images/             ← All downloaded photos
├── nginx.conf          ← Nginx server config
├── Dockerfile          ← Docker image definition
└── docker-compose.yml  ← Compose for easy dev/prod
```

## Contact Form → Admin Integration

The contact form on `/pages/contact.html` submits enquiries to:
```
POST https://book.zacmclients.photos/api/enquiry
```
with a JSON payload containing: `name`, `email`, `phone`, `session`, `date`, `location`, `message`, `source`.

**Fallback:** If the API endpoint is unreachable, the form redirects the user directly to `https://book.zacmclients.photos/admin` with query params pre-filled.

To change the endpoint, edit `js/main.js` — search for `book.zacmclients.photos`.

## Live Editing (No Rebuild Needed)

Thanks to Docker volume mounts, you can edit `css/style.css`, `js/main.js`, or any `images/` file and refresh the browser — no rebuild required.

To update HTML files, either rebuild or add them as additional volumes in `docker-compose.yml`.

## Updating Images

Drop new images into the `images/` folder and reference them in the HTML — they'll be served immediately via the volume mount.

## Tech Stack

- **HTML5 / CSS3 / Vanilla JS** — no frameworks, easy to modify
- **Nginx Alpine** — lightweight, fast static server
- **Docker / Docker Compose** — portable, runs anywhere
- **Google Fonts** — Lora (headings) + Montserrat (body)

## Ports

| Service | Port |
|---------|------|
| Website | http://localhost:8080 |

To change port, edit `docker-compose.yml` → `ports: "YOURPORT:8080"`.
