# Shorts Studio AI

Responsive PWA prototype for an animated science / What If video production workflow.

## Working in the current MVP

- Responsive desktop and mobile layout.
- Gemini Interactions API for script + storyboard generation.
- Gemini TTS voice generation using the TTS model configured in the service.
- Pixabay image/video search, Unsplash photo search and Freesound sound search.
- Per-scene visual directions, narration, overlay text, duration and image credit/source.
- Browser-side Canvas + MediaRecorder render. The browser decides whether MP4 or WebM is available.
- Thumbnail PNG generation.
- Downloadable project JSON and YouTube title/description/hashtags/pinned-comment metadata.
- Local browser project save, PWA manifest, icon and basic app-shell service-worker cache.

## API setup

Open **API & Settings** in the app and enter your own:
- Gemini API key
- Pixabay API key
- Unsplash Access Key
- Freesound API token

Keys are stored in localStorage in the current browser profile. They are **not committed to this repository**, but browser-side keys can be inspected by someone who has access to that browser profile or developer tools. This is a personal-use MVP. Before making a multi-user public service, proxy provider calls through a server-side Worker and store keys as server secrets.

## Important limitations

- Generated scientific scripts are drafts. Fact-check scientific claims, numbers and assumptions before publishing.
- Media providers have different terms. Keep attribution and inspect the individual license of every Freesound result before using it commercially.
- Pixabay API results must be shown with provider attribution; API searches are rate-limited and cached according to Pixabay's terms.
- Unsplash API results must remain hotlinked to Unsplash URLs and display photographer attribution. The app triggers the documented download tracking endpoint when an image is attached.
- The current browser renderer makes a motion-graphic video from scene cards, scene images, overlay text, narration and audio. It is not a complete nonlinear editor or full 3D renderer. The output container/codec depends on device browser support.
- Browser-side rendering uses device memory, CPU/GPU and battery. Render shorter/lower-resolution videos on mobile if needed.
- Background music from Freesound can be previewed/selected, but the initial video renderer currently mixes the generated narration track only. Add licensed music/SFX in a later editor pass.
- PWA offline support caches the app shell, not media search results or generated video files.

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Publish with GitHub Pages

The GitHub Actions workflow builds the app and deploys the Pages artifact. One repository-level setting must be enabled once:

1. Open [Repository Settings → Pages](https://github.com/kungkeng2008-source/shorts-studio-ai/settings/pages).
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Return to **Actions** and rerun the latest **Build and Deploy Shorts Studio AI** workflow (or push a new commit).
4. After the workflow succeeds, open:
   https://kungkeng2008-source.github.io/shorts-studio-ai/

On a phone, open the published HTTPS URL in Safari/Chrome and choose **Add to Home Screen** / **Install app**. On desktop, use the browser's Install App option when available.
