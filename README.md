# Shorts Studio AI

Responsive PWA prototype for an animated science / What If video production workflow.

## Working in the current MVP

- Responsive desktop and mobile layout.
- Gemini Interactions API for script + storyboard generation.
- Gemini TTS voice generation using the TTS model configured in the service.
- Pixabay image/video search and Unsplash photo search.
- Built-in Free Sound Studio: generates original ambient beds and sound effects locally in the browser using Web Audio. It does not require Freesound or another sound API key.
- Per-scene visual directions, narration, overlay text, duration, still-image credits and source video clips.
- Browser-side Canvas + MediaRecorder render with still-image motion and source video footage where CORS/browser support permits.
- Browser-side audio mix: Gemini voiceover plus one generated music/effect track.
- Thumbnail PNG generation.
- Downloadable project JSON, SRT subtitles and YouTube title/description/hashtags/pinned-comment metadata.
- Local browser project save, PWA manifest, icon and basic app-shell service-worker cache.

## API setup

Open **API & Settings** in the app and enter your own:
- Gemini API key
- Pixabay API key
- Unsplash Access Key

No sound API key is required. In **Media**, choose **Free Sound FX** and select one of the built-in presets.

Keys are stored in localStorage in the current browser profile. They are **not committed to this repository**, but browser-side keys can be inspected by someone who has access to that browser profile or developer tools. This is a personal-use MVP. Before making a multi-user public service, proxy provider calls through a server-side Worker and store keys as server secrets.

## Built-in sound presets

- Cinematic Ambient — gentle documentary music bed.
- Space Atmosphere — low floating tones for science and space.
- Technology Pulse — soft electronic pulse.
- Soft Tension — subtle suspense music bed.
- Atmospheric Wind — airy background bed.
- Transition Whoosh — generated sweeps at scene transitions.
- Cinematic Impact — low hits at key moments.
- Rising Tension — a rising effect towards the final reveal.

These tracks are synthesized in the browser with Web Audio and are not recordings downloaded from a stock library. The user can preview them, adjust the output volume and mix one chosen track into the exported video. Because they are synthesized, they are intentionally simple sound design rather than a full commercial music catalogue.

## Important limitations

- Generated scientific scripts are drafts. Fact-check scientific claims, numbers and assumptions before publishing.
- Pixabay API results must be shown with provider attribution; API searches are rate-limited and cached according to Pixabay's terms.
- Unsplash API results must remain hotlinked to Unsplash URLs and display photographer attribution. The app triggers the documented download tracking endpoint when an image is attached.
- The current browser renderer makes a motion-graphic video from scene cards, scene images, overlay text, narration and audio. It is not a complete nonlinear editor or full 3D renderer. The output container/codec depends on device browser support.
- Browser-side rendering and local sound generation use device memory, CPU/GPU and battery. Render shorter/lower-resolution videos on mobile if needed.
- The built-in sound mixer currently supports one generated music/effect track alongside the voiceover. It does not yet offer multi-track audio editing, ducking automation, per-scene audio placement or a full music sequencer.
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
