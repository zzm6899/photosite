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
