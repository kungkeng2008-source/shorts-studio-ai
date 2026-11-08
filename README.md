# Shorts Studio AI

Responsive PWA starter for an animated science / What If video production workspace.

## Prototype features in this first commit

- Responsive desktop and mobile layout.
- Topic discovery starter cards.
- Scene-by-scene storyboard editor.
- Six visual style presets: Isometric 3D, Cartoon Explainer, Blueprint, Hologram HUD, 3D Data Chart, and Paper Cutout.
- Editable narration, visual direction, and scene duration.
- Download a structured project JSON.
- PWA manifest, SVG app icon, and basic offline shell caching.
- GitHub Pages deployment workflow.

## Not implemented yet

This first version is a usable **front-end prototype**, not a full AI video generator. It does not yet call Gemini, Pixabay, Unsplash, or Freesound; it does not synthesize speech or render MP4. Those integrations will be added in subsequent commits and tested before being marked as ready.

## Security

Do not paste production API keys into the public repository or browser local storage. Provider keys must be stored as server-side secrets in a backend such as Cloudflare Workers. The frontend must call that backend, never expose provider secrets in JavaScript bundles.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub Pages

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **GitHub Actions** as the source.
3. The workflow in `.github/workflows/deploy-pages.yml` builds and deploys the app on pushes to `main`.
4. After the first successful deployment, the app URL is:
   `https://kungkeng2008-source.github.io/shorts-studio-ai/`

The app uses relative asset URLs so the same build can also be deployed to another static host.

## PWA

Serve over HTTPS, then use the browser's Install App / Add to Home Screen option. Offline caching is a basic app-shell cache; generated media and project files remain on the user's device.
