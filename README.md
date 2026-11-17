# Zac Morgan Photography Local Mock

This is a local preview of the Zac Morgan Photography portfolio. Use it to try copy, image and gallery changes before publishing them.

Run it with:

```powershell
node server.js
```

Then open:

```text
http://localhost:4173
```

Click `Edit Site` to edit copy, swap or upload images, adjust crops and change gallery layouts. The editor saves changes in your browser. If you start the site with `server.js`, it also writes them to `site-content.json`. You can import and export that JSON file from the editor.

## Docker hosting

Run `docker compose up --build -d`, then visit `http://localhost:8080`.
The Nginx container serves the same portfolio and preserves redirects from the previous `/pages/*.html` links.
When you're using the static container, edits stay in your browser. Export the JSON file if you want a backup you can move to another machine.
Use `node server.js` for disk-backed content saving through `/api/content`.

The existing GitHub Actions workflow builds and publishes `ghcr.io/zzm6899/photosite:latest` on pushes to `main`.

## Enquiries

The contact form opens a draft to `zacmorganphotography@gmail.com` in the visitor's email app. The visitor sends it from there.
