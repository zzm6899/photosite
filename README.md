# Zac Morgan Photography Local Mock

This is a self-contained local mock of the public Zac Morgan Photography site.

Run it with:

```powershell
node server.js
```

Then open:

```text
http://localhost:4173
```

Use the `Edit Site` button to change text, swap images, upload replacements, adjust crop position, and tune each page's gallery layout. Changes are stored in browser local storage and, when served through `server.js`, also saved to `site-content.json`. The editor can export/import that JSON content file too.

## Docker hosting

Run `docker compose up --build -d`, then visit `http://localhost:8080`.
The Nginx container serves the same portfolio and preserves redirects from the previous `/pages/*.html` links.
Edits in this static container are saved in the browser; export JSON to keep a portable backup.
Use `node server.js` for disk-backed content saving through `/api/content`.

The existing GitHub Actions workflow builds and publishes `ghcr.io/zzm6899/photosite:latest` on pushes to `main`.

## Enquiries

The contact form prepares an email addressed to `zacmorganphotography@gmail.com` in the visitor's email application. It does not send email automatically.
