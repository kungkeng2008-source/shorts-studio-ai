# Shorts Studio AI — No-API Edition

A responsive, browser-local video starter studio. The app does not call Gemini, Pixabay, Unsplash, Freesound, or any other external API.

## What works without API keys

- Local storyboard templates for the Earth-stopping thought experiment and a generic six-scene outline for other topics.
- Scene editing: title, hook, narration, on-screen text, visual direction and duration.
- Built-in illustrative Canvas graphics and animation; users can upload their own images or video clips from their device.
- Built-in synthetic background tracks and sound effects generated with Web Audio. No external sound library is queried.
- Browser speech preview using the device's built-in speech engine (preview only).
- Upload a WAV/MP3/M4A/WebM voice file or record a voiceover with the microphone; imported/recorded audio is mixed into the rendered video where the browser can decode it.
- Local Canvas + MediaRecorder video rendering, PNG thumbnail, SRT subtitles, YouTube metadata TXT and project JSON.
- Responsive interface for desktop and mobile; project text is auto-saved in the current browser.

## Limitations (read before publishing)

- This is not generative AI. The local script builder uses fixed starter templates; topics other than the dedicated Earth rotation example receive a generic outline that must be researched and rewritten.
- Browser speech preview cannot be captured as a downloadable narration track. Upload or record a voice file to include speech in the video.
- Built-in visuals are Canvas motion graphics, not photorealistic AI images or full 3D animation. Upload your own visuals for specific scenes.
- Built-in sound is simple synthetic sound design, not a commercial music catalogue.
- Imported image/video/voice files are held as browser object URLs during the current session. Re-upload them if you refresh or reopen the project. The JSON file does not embed media binaries.
- Browser codec support decides whether the exported file is MP4 or WebM. Rendering uses device CPU, memory and battery.
- No direct YouTube upload or cloud project sync is included.

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

GitHub Actions builds and deploys the `dist` folder. Repository Pages source must be set to **GitHub Actions**.

Published app:
https://kungkeng2008-source.github.io/shorts-studio-ai/
