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
  // Copy/paste from a password manager or notes app can add spaces, zero-width
  // characters or surrounding quotation marks. Strip those harmless wrappers,
  // but never log or silently rewrite a key containing other Unicode symbols.
  const normalized = value
    .replace(/[\\u200B-\\u200D\\uFEFF]/g, "")
    .trim()
    .replace(/^[\"'“”‘’]+|[\"'“”‘’]+$/g, "")
    .replace(/[\\r\\n\\t ]+/g, "");

  if (!normalized) {
    throw new Error("Add your " + provider + " API key in API & Settings.");
  }
  if (/[^\\x21-\\x7E]/.test(normalized)) {
    throw new Error(
      provider + " API key contains a non-standard character. Re-copy only the key itself (plain English letters/numbers/symbols), without labels, quotation marks or extra text, then save it again."
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
        "Api-Revision": "2026-05-20"
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

export async function generateProject(apiKey: string, topic: string, style: string, language: string, duration: number): Promise<VideoProject> {
  const prompt =
    "You are a YouTube Shorts science storyteller, visual director and fact-checking editor.\n" +
    "Create one original, high-retention " + duration + "-second vertical video about: " + JSON.stringify(topic) + ".\n" +
    "Audience: international viewers. Output language: " + language + ". Visual style: " + style + ".\n" +
    "Priorities: a precise curiosity gap in the first 1-2 seconds; fast but understandable progression; one satisfying payoff; a reveal or meaningful visual change every few seconds. Avoid false claims, fake statistics, invented sources, filler and generic engagement bait.\n" +
    "For hypothetical scenarios, clearly distinguish assumptions from established science. For factual claims, use cautious wording if the premise is uncertain. Do not invent citations or dates.\n" +
    "Return ONLY valid JSON with this structure: { title, hook, description, hashtags, pinnedComment, scenes }.\n" +
    "scenes must be an array of 5-7 items. Each item must have title, narration, visual, overlayText, duration. Total duration should be close to " + duration + " seconds. Narration must fit natural speech. Add a question or visual surprise early, escalate the stakes, then deliver the payoff.";
  const raw = await geminiText(apiKey, prompt);
  const project = extractJson<VideoProject>(raw);
  if (!Array.isArray(project.scenes) || project.scenes.length < 2) throw new Error("The generated storyboard does not contain enough scenes. Generate again.");
  project.scenes = project.scenes.map((scene, index) => ({
    title: scene.title || "Scene " + (index + 1),
    narration: scene.narration || "",
    visual: scene.visual || "",
    overlayText: scene.overlayText || "",
    duration: Math.max(2, Number(scene.duration) || 5)
  }));
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

export async function searchPixabay(apiKey: string, query: string): Promise<MediaAsset[]> {
  if (!apiKey.trim()) throw new Error("Add your Pixabay API key in API Settings.");
  const q = encodeURIComponent(query.trim().slice(0, 100));
  const [imagesRes, videosRes] = await Promise.all([
    fetch("https://pixabay.com/api/?key=" + encodeURIComponent(apiKey.trim()) + "&q=" + q + "&image_type=photo&orientation=vertical&safesearch=true&per_page=12"),
    fetch("https://pixabay.com/api/videos/?key=" + encodeURIComponent(apiKey.trim()) + "&q=" + q + "&safesearch=true&per_page=12&order=popular")
  ]);
  if (!imagesRes.ok) throw new Error("Pixabay images (" + imagesRes.status + "): " + await readError(imagesRes));
  if (!videosRes.ok) throw new Error("Pixabay videos (" + videosRes.status + "): " + await readError(videosRes));
  const [images, videos] = await Promise.all([imagesRes.json(), videosRes.json()]);
  const imageAssets: MediaAsset[] = (images.hits || []).map((hit: any) => ({
    id: "pix-img-" + hit.id, source: "Pixabay", kind: "image",
    title: hit.tags || "Pixabay image", thumbnail: hit.webformatURL || hit.previewURL,
    url: hit.largeImageURL || hit.webformatURL, pageUrl: hit.pageURL,
    credit: "Pixabay / " + (hit.user || "Contributor"), license: "Pixabay Content License"
  }));
  const videoAssets: MediaAsset[] = (videos.hits || []).map((hit: any) => {
    const variants = hit.videos || {};
    const best = variants.large || variants.medium || variants.small || variants.tiny;
    return {
      id: "pix-vid-" + hit.id, source: "Pixabay", kind: "video",
      title: hit.tags || "Pixabay video", thumbnail: best?.thumbnail,
      url: best?.url || hit.pageURL, pageUrl: hit.pageURL,
      credit: "Pixabay / " + (hit.user || "Contributor"), license: "Pixabay Content License", duration: hit.duration
    };
  });
  return [...imageAssets, ...videoAssets];
}

export async function searchUnsplash(apiKey: string, query: string): Promise<MediaAsset[]> {
  if (!apiKey.trim()) throw new Error("Add your Unsplash Access Key in API Settings.");
  const params = new URLSearchParams({ query, per_page: "12", orientation: "portrait", content_filter: "high" });
  const response = await fetch("https://api.unsplash.com/search/photos?" + params, {
    headers: { Authorization: "Client-ID " + apiKey.trim(), "Accept-Version": "v1" }
  });
  if (!response.ok) throw new Error("Unsplash (" + response.status + "): " + await readError(response));
  const data = await response.json();
  return (data.results || []).map((photo: any) => ({
    id: "unsplash-" + photo.id, source: "Unsplash", kind: "image",
    title: photo.alt_description || photo.description || "Unsplash photograph",
    thumbnail: photo.urls?.small, url: photo.urls?.regular || photo.urls?.full,
    pageUrl: photo.links?.html,
    credit: "Photo by " + (photo.user?.name || photo.user?.username || "Unsplash photographer") + " on Unsplash",
    license: "Unsplash License", downloadLocation: photo.links?.download_location
  }));
}

export async function trackUnsplashDownload(apiKey: string, location?: string): Promise<void> {
  if (!apiKey.trim() || !location) return;
  await fetch(location, { headers: { Authorization: "Client-ID " + apiKey.trim(), "Accept-Version": "v1" } });
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
