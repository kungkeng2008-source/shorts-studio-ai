export type Scene = {
  title: string;
  narration: string;
  visual: string;
  overlayText: string;
  duration: number;
  imageUrl?: string;
  videoUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
};

export type VideoProject = {
  title: string;
  hook: string;
  description: string;
  hashtags: string[];
  pinnedComment: string;
  scenes: Scene[];
};

export type MediaAsset = {
  id: string;
  source: "Pixabay" | "Unsplash" | "Built-in";
  kind: "image" | "video" | "audio";
  title: string;
  thumbnail?: string;
  url: string;
  pageUrl?: string;
  credit?: string;
  license?: string;
  downloadLocation?: string;
  duration?: number;
  presetId?: string;
};

async function readError(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || parsed?.errors?.join?.("; ") || raw || response.statusText;
  } catch {
    return raw || response.statusText;
  }
}

function normalizeApiKey(value: string, provider: string): string {
  // Remove harmless copy/paste artifacts: Unicode whitespace, zero-width
  // formatting marks, a BOM, and quotation marks around the key.
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\u2060\uFEFF\u00AD]/g, "")
    .trim()
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[\s\u00A0]+/g, "");

  if (!normalized) {
    throw new Error("Add your " + provider + " API key in API & Settings.");
  }
  // Google API keys are ASCII strings. This check runs after harmless
  // invisible Unicode formatting and whitespace characters are removed.
  if (/[^\x21-\x7E]/.test(normalized)) {
    throw new Error(
      provider + " API key still contains a non-standard character. Clear the field and paste only the raw API key, without labels or extra text."
    );
  }
  return normalized;
}

async function createInteraction(apiKey: string, body: Record<string, unknown>): Promise<any> {
  const cleanKey = normalizeApiKey(apiKey, "Gemini");
  let response: Response;
  try {
    response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": cleanKey,
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/headers|RequestInit|ISO-8859-1|ByteString/i.test(message)) {
      throw new Error("The Gemini API key contains unsupported characters. Open API & Settings, clear the Gemini field, paste the plain API key again, and save.");
    }
    throw new Error("Could not contact Gemini. Check your internet connection and try again. " + message);
  }
  if (!response.ok) throw new Error("Gemini API (" + response.status + "): " + await readError(response));
  return response.json();
}

function interactionText(data: any): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const contents = (data.steps || []).flatMap((step: any) => step.content || []);
  const text = contents.filter((part: any) => part.type === "text" && part.text).map((part: any) => part.text).join("\n");
  if (text.trim()) return text.trim();
  throw new Error("Gemini returned a response without text. Try again or check the selected model.");
}

export async function geminiText(apiKey: string, prompt: string): Promise<string> {
  const data = await createInteraction(apiKey, {
    model: "gemini-3.6-flash",
    input: prompt,
    store: false,
    generation_config: { temperature: 0.85 }
  });
  return interactionText(data);
}

export function extractJson<T>(raw: string): T {
  const cleaned = raw.trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Could not read JSON from Gemini. Generate again.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

function topicTerms(topic: string): string[] {
  const stopWords = new Set([
    "why","what","when","where","who","how","does","do","did","is","are","was","were",
    "the","a","an","and","or","but","for","to","of","in","on","at","by","with","from",
    "have","has","had","can","could","would","should","will","if","than","then","this",
    "that","these","those","it","its","your","you","we","they","their","our","about",
    "tại","sao","vì","như","thế","nào","là","có","của","và","hay","hoặc","khi","nếu",
    "một","những","các","được","bị","thì","ra","sẽ","đã","đang","gì","ai","đâu"
  ]);
  return Array.from(new Set(topic
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g) || []
  )).filter(word => word.length > 1 && !stopWords.has(word));
}

function projectMatchesTopic(project: VideoProject, topic: string): boolean {
  const terms = topicTerms(topic);
  if (!terms.length) return true;
  const content = [
    project.title, project.hook, project.description,
    ...(project.scenes || []).flatMap(scene => [
      scene.title, scene.narration, scene.visual, scene.overlayText
    ])
  ].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const matches = terms.filter(term => content.includes(term)).length;
  const required = terms.length <= 2 ? 1 : 2;
  return matches >= required;
}

export async function generateProject(apiKey: string, topic: string, style: string, language: string, duration: number): Promise<VideoProject> {
  const corePrompt =
    "You are a YouTube Shorts science storyteller, visual director and fact-checking editor.\n" +
    "LOCKED VIDEO TOPIC (must not be changed): " + JSON.stringify(topic) + ".\n" +
    "Every title, hook, scene, narration and visual direction MUST explain this exact topic. Do not substitute a different What If scenario or reuse a previous project. Do not change the subject to Earth, space, planets or another topic unless that is explicitly the requested topic.\n" +
    "Create one original, high-retention " + duration + "-second vertical video about the locked topic above.\n" +
    "Audience: international viewers. Output language: " + language + ". Visual style: " + style + ".\n" +
    "Priorities: a precise curiosity gap in the first 1-2 seconds; fast but understandable progression; one satisfying payoff; a reveal or meaningful visual change every few seconds. Avoid false claims, fake statistics, invented sources, filler and generic engagement bait.\n" +
    "For hypothetical scenarios, clearly distinguish assumptions from established science. For factual claims, use cautious wording if the premise is uncertain. Do not invent citations or dates.\n" +
    "Return ONLY valid JSON with this structure: { title, hook, description, hashtags, pinnedComment, scenes }.\n" +
    "scenes must be an array of 5-7 items. Each item must have title, narration, visual, overlayText, duration. Total duration should be close to " + duration + " seconds. Narration must fit natural speech. Add a question or visual surprise early, escalate the stakes, then deliver the payoff.\n" +
    "Before returning, verify that every scene is about the LOCKED VIDEO TOPIC and that the title clearly names the requested subject.";
  const parseAndNormalize = (rawText: string): VideoProject => {
    const result = extractJson<VideoProject>(rawText);
    if (!Array.isArray(result.scenes) || result.scenes.length < 2) {
      throw new Error("The generated storyboard does not contain enough scenes. Generate again.");
    }
    result.scenes = result.scenes.map((scene, index) => ({
      title: scene.title || "Scene " + (index + 1),
      narration: scene.narration || "",
      visual: scene.visual || "",
      overlayText: scene.overlayText || "",
      duration: Math.max(2, Number(scene.duration) || 5)
    }));
    return result;
  };

  let project = parseAndNormalize(await geminiText(apiKey, corePrompt));

  // If Gemini ignores the requested subject, automatically retry once instead
  // of silently accepting a storyboard for the wrong video topic.
  if (!projectMatchesTopic(project, topic)) {
    const correction =
      corePrompt +
      "\n\nCORRECTION: Your previous response was about the wrong subject. The user's requested topic is exactly " +
      JSON.stringify(topic) +
      ". Discard the previous answer and write a completely new storyboard only about this exact topic. Do not reuse unrelated scenes.";
    project = parseAndNormalize(await geminiText(apiKey, correction));
    if (!projectMatchesTopic(project, topic)) {
      throw new Error("Gemini returned a storyboard that does not match your topic. No wrong-topic project was saved. Please generate again.");
    }
  }

  return project;
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcmToWav(pcm: Uint8Array, sampleRate = 24000, channels = 1): Blob {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm.slice().buffer as ArrayBuffer], { type: "audio/wav" });
}

function findAudioPart(data: any): { encoded: string; mimeType?: string } | null {
  if (data.output_audio?.data) return { encoded: data.output_audio.data, mimeType: data.output_audio.mime_type || data.output_audio.mimeType };
  for (const step of data.steps || []) {
    for (const part of step.content || []) {
      if (part.type === "audio" && (part.data || part.audio?.data)) {
        return { encoded: part.data || part.audio.data, mimeType: part.mime_type || part.mimeType || part.audio?.mime_type };
      }
      if (part.inline_data?.data || part.inlineData?.data) {
        const item = part.inline_data || part.inlineData;
        return { encoded: item.data, mimeType: item.mime_type || item.mimeType };
      }
    }
  }
  throw new Error("Gemini TTS response did not contain audio data.");
}

export async function generateVoice(apiKey: string, transcript: string, voice = "Kore", style = "clear, engaging documentary narration, medium pace"): Promise<Blob> {
  if (!transcript.trim()) throw new Error("There is no narration to voice.");
  const data = await createInteraction(apiKey, {
    model: "gemini-3.1-flash-tts-preview",
    input: "Speak the following narration in a " + style + ". Read only the words between the transcript markers. Use natural pauses and clear pronunciation.\nTRANSCRIPT START\n" + transcript + "\nTRANSCRIPT END",
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice }] },
    store: false
  });
  const audio = findAudioPart(data);
  if (!audio) throw new Error("Gemini TTS response did not contain audio data.");
  const bytes = base64ToBytes(audio.encoded);
  if (audio.mimeType?.includes("wav") || (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70)) {
    return new Blob([bytes.slice().buffer as ArrayBuffer], { type: "audio/wav" });
  }
  return pcmToWav(bytes, 24000, 1);
}

const MEDIA_CACHE_TTL = 24 * 60 * 60 * 1000;

function readMediaCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (!item || Date.now() - Number(item.savedAt) > MEDIA_CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return item.data as T;
  } catch { return null; }
}

function writeMediaCache<T>(key: string, data: T): void {
  try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data })); }
  catch { /* Storage is optional; search should still work. */ }
}

async function fetchMediaJson(url: string, provider: string): Promise<any> {
  let response: Response;
  try {
    response = await fetch(url, { method: "GET", mode: "cors" });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      provider + " could not be reached from this browser. This may be a CORS/network block, DNS/VPN filtering or a browser extension. The search phrase is not the cause. Details: " + detail
    );
  }
  if (!response.ok) {
    throw new Error(provider + " returned HTTP " + response.status + ": " + await readError(response));
  }
  try { return await response.json(); }
  catch { throw new Error(provider + " returned an invalid JSON response."); }
}

export async function searchPixabay(apiKey: string, query: string): Promise<MediaAsset[]> {
  const key = apiKey.trim();
  const term = query.trim().slice(0, 100);
  if (!key) throw new Error("Add your Pixabay API key in API Settings.");
  if (!term) throw new Error("Enter an English search phrase first.");

  const imageCacheKey = "shorts-media-cache:pixabay-images:" + term.toLowerCase();
  const videoCacheKey = "shorts-media-cache:pixabay-videos:" + term.toLowerCase();
  const cachedImages = readMediaCache<MediaAsset[]>(imageCacheKey);
  const cachedVideos = readMediaCache<MediaAsset[]>(videoCacheKey);
  if (cachedImages || cachedVideos) return [...(cachedImages || []), ...(cachedVideos || [])];

  const q = encodeURIComponent(term);
  const imageUrl = "https://pixabay.com/api/?key=" + encodeURIComponent(key) +
    "&q=" + q + "&lang=en&image_type=photo&orientation=vertical&safesearch=true&per_page=12&order=popular";
  const videoUrl = "https://pixabay.com/api/videos/?key=" + encodeURIComponent(key) +
    "&q=" + q + "&lang=en&safesearch=true&per_page=12&order=popular";

  // Keep whichever endpoint responds. One failed endpoint must not erase
  // successful results from the other endpoint.
  const [imageResult, videoResult] = await Promise.allSettled([
    cachedImages ? Promise.resolve(null) : fetchMediaJson(imageUrl, "Pixabay image search"),
    cachedVideos ? Promise.resolve(null) : fetchMediaJson(videoUrl, "Pixabay video search")
  ]);

  let images = cachedImages || [];
  let videos = cachedVideos || [];
  const errors: string[] = [];

  if (!cachedImages) {
    if (imageResult.status === "fulfilled" && imageResult.value) {
      images = (imageResult.value.hits || []).map((hit: any): MediaAsset => ({
        id: "pix-img-" + hit.id, source: "Pixabay", kind: "image",
        title: hit.tags || "Pixabay image",
        thumbnail: hit.webformatURL || hit.previewURL,
        url: hit.largeImageURL || hit.webformatURL, pageUrl: hit.pageURL,
        credit: "Pixabay / " + (hit.user || "Contributor"),
        license: "Pixabay Content License"
      }));
      writeMediaCache(imageCacheKey, images);
    } else if (imageResult.status === "rejected") {
      errors.push(imageResult.reason instanceof Error ? imageResult.reason.message : "Pixabay image search failed.");
    }
  }

  if (!cachedVideos) {
    if (videoResult.status === "fulfilled" && videoResult.value) {
      videos = (videoResult.value.hits || []).map((hit: any): MediaAsset => {
        const variants = hit.videos || {};
        const best = variants.large || variants.medium || variants.small || variants.tiny;
        return {
          id: "pix-vid-" + hit.id, source: "Pixabay", kind: "video",
          title: hit.tags || "Pixabay video", thumbnail: best?.thumbnail,
          url: best?.url || hit.pageURL, pageUrl: hit.pageURL,
          credit: "Pixabay / " + (hit.user || "Contributor"),
          license: "Pixabay Content License", duration: hit.duration
        };
      });
      writeMediaCache(videoCacheKey, videos);
    } else if (videoResult.status === "rejected") {
      errors.push(videoResult.reason instanceof Error ? videoResult.reason.message : "Pixabay video search failed.");
    }
  }

  const results = [...images, ...videos];
  if (results.length) return results;
  if (errors.length) throw new Error(errors.join(" | ") +
    " Check the Pixabay API key and allow this site through any privacy/ad-block extension.");
  return [];
}

export async function searchUnsplash(apiKey: string, query: string): Promise<MediaAsset[]> {
  const key = apiKey.trim();
  const term = query.trim();
  if (!key) throw new Error("Add your Unsplash Access Key in API Settings.");
  if (!term) throw new Error("Enter an English search phrase first.");

  const cacheKey = "shorts-media-cache:unsplash:" + term.toLowerCase();
  const cached = readMediaCache<MediaAsset[]>(cacheKey);
  if (cached) return cached;

  // Use the documented client_id query parameter on a GET request to avoid
  // triggering an extra CORS preflight with a custom Authorization header.
  const params = new URLSearchParams({
    client_id: key, query: term, per_page: "12",
    orientation: "portrait", content_filter: "high"
  });
  const data = await fetchMediaJson(
    "https://api.unsplash.com/search/photos?" + params.toString(),
    "Unsplash search"
  );
  const results: MediaAsset[] = (data.results || []).map((photo: any): MediaAsset => ({
    id: "unsplash-" + photo.id, source: "Unsplash", kind: "image",
    title: photo.alt_description || photo.description || "Unsplash photograph",
    thumbnail: photo.urls?.small, url: photo.urls?.regular || photo.urls?.full,
    pageUrl: photo.links?.html,
    credit: "Photo by " + (photo.user?.name || photo.user?.username || "Unsplash photographer") + " on Unsplash",
    license: "Unsplash License", downloadLocation: photo.links?.download_location
  }));
  writeMediaCache(cacheKey, results);
  return results;
}


export async function trackUnsplashDownload(apiKey: string, location?: string): Promise<void> {
  if (!apiKey.trim() || !location) return;
  try {
    const separator = location.includes("?") ? "&" : "?";
    const url = location + separator + new URLSearchParams({ client_id: apiKey.trim() }).toString();
    await fetch(url, { method: "GET", mode: "cors" });
  } catch {
    // Tracking is best-effort; do not block attaching the selected photo.
  }
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
