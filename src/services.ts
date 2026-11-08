export type Scene = {
  title: string;
  narration: string;
  visual: string;
  overlayText: string;
  duration: number;
  imageUrl?: string;
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
  source: "Pixabay" | "Unsplash" | "Freesound";
  kind: "image" | "video" | "audio";
  title: string;
  thumbnail?: string;
  url: string;
  pageUrl?: string;
  credit?: string;
  license?: string;
  downloadLocation?: string;
  duration?: number;
};

export type ApiKeys = {
  gemini: string;
  pixabay: string;
  unsplash: string;
  freesound: string;
};

async function readError(response: Response): Promise<string> {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || parsed?.message || raw || response.statusText;
  } catch {
    return raw || response.statusText;
  }
}

export async function geminiText(apiKey: string, prompt: string): Promise<string> {
  if (!apiKey.trim()) throw new Error("Chưa nhập Gemini API key. Mở Cài đặt API để nhập khóa.");
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
    body: JSON.stringify({
      model: "gemini-3.6-flash",
      input: prompt,
      store: false,
      generation_config: { temperature: 0.85 }
    })
  });
  if (!response.ok) throw new Error(`Gemini API (${response.status}): ${await readError(response)}`);
  const data = await response.json();
  if (typeof data.output_text === "string" && data.output_text.trim()) return data.output_text.trim();
  const textParts = (data.output || []).flatMap((step: any) => step.content || [])
    .filter((part: any) => part.type === "text" && part.text)
    .map((part: any) => part.text);
  if (textParts.length) return textParts.join("\n").trim();
  throw new Error("Gemini trả về phản hồi không có nội dung văn bản.");
}

export function extractJson<T>(raw: string): T {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Không đọc được JSON từ kết quả Gemini. Hãy tạo lại.");
  return JSON.parse(cleaned.slice(start, end + 1)) as T;
}

export async function generateProject(apiKey: string, topic: string, style: string, language: string, duration: number): Promise<VideoProject> {
  const prompt = `You are an experienced YouTube Shorts science storyteller and fact-checking script editor.
Create one original, high-retention ${duration}-second vertical video about: "${topic}".
Audience: international English-speaking viewers. Output language: ${language}.
Visual style: ${style}.
Priorities: a specific curiosity gap in the first 1-2 seconds; rapid but understandable progression; one clear payoff; avoid false claims, fake statistics, unsupported certainty, copied formats, generic filler and engagement bait.
If the premise is hypothetical, clearly distinguish assumptions from established science. Do not invent citations, sources, dates or statistics.
Return ONLY valid JSON with exactly this structure:
{
 "title":"short clickable title",
 "hook":"spoken opening hook (max 18 words)",
 "description":"2-3 sentence description with a natural disclosure if hypothetical",
 "hashtags":["#...","#...","#..."],
 "pinnedComment":"one question inviting real discussion",
 "scenes":[
  {"title":"scene label","narration":"spoken words for this scene","visual":"detailed visual direction for animation/footage","overlayText":"very short on-screen text, max 7 words","duration":number}
 ]
}
Use 5-7 scenes. Sum scene durations to approximately ${duration}. Spoken narration should fit the scene duration at natural pace. Include a visual change or reveal every few seconds. For science questions, ensure the answer is scientifically accurate and cautious.`;
  const raw = await geminiText(apiKey, prompt);
  const project = extractJson<VideoProject>(raw);
  if (!Array.isArray(project.scenes) || project.scenes.length < 2) throw new Error("Kịch bản thiếu phân cảnh. Hãy tạo lại.");
  project.scenes = project.scenes.map((scene, index) => ({
    title: scene.title || `Scene ${index + 1}`,
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
  return new Blob([header, pcm], { type: "audio/wav" });
}

export async function generateVoice(apiKey: string, transcript: string, voice = "Kore", style = "clear, engaging documentary narration, medium pace"): Promise<Blob> {
  if (!apiKey.trim()) throw new Error("Chưa nhập Gemini API key.");
  if (!transcript.trim()) throw new Error("Chưa có lời thoại để tạo giọng đọc.");
  const input = `Speak the following narration in a ${style}. Read only the words inside the transcript. Use natural pauses and clear pronunciation.\nTRANSCRIPT:\n${transcript}`;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey.trim() },
    body: JSON.stringify({
      model: "gemini-3.1-flash-tts-preview",
      input,
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice }] },
      store: false
    })
  });
  if (!response.ok) throw new Error(`Gemini TTS (${response.status}): ${await readError(response)}`);
  const data = await response.json();
  const encoded = data.output_audio?.data || data.output?.flatMap((step: any) => step.content || []).find((part: any) => part.type === "audio")?.data;
  if (!encoded) throw new Error("Gemini TTS không trả về dữ liệu âm thanh.");
  const audioBytes = base64ToBytes(encoded);
  // Gemini 3.1 TTS returns raw 24 kHz, 16-bit mono PCM for unary audio responses.
  return pcmToWav(audioBytes, 24000, 1);
}

export async function searchPixabay(apiKey: string, query: string): Promise<MediaAsset[]> {
  if (!apiKey.trim()) throw new Error("Chưa nhập Pixabay API key.");
  const q = encodeURIComponent(query.trim());
  const [imagesRes, videosRes] = await Promise.all([
    fetch(`https://pixabay.com/api/?key=${encodeURIComponent(apiKey.trim())}&q=${q}&image_type=photo&orientation=vertical&safesearch=true&per_page=12`),
    fetch(`https://pixabay.com/api/videos/?key=${encodeURIComponent(apiKey.trim())}&q=${q}&safesearch=true&per_page=12&order=popular`)
  ]);
  if (!imagesRes.ok) throw new Error(`Pixabay images (${imagesRes.status}): ${await readError(imagesRes)}`);
  if (!videosRes.ok) throw new Error(`Pixabay videos (${videosRes.status}): ${await readError(videosRes)}`);
  const [images, videos] = await Promise.all([imagesRes.json(), videosRes.json()]);
  const imageAssets: MediaAsset[] = (images.hits || []).map((hit: any) => ({
    id: `pix-img-${hit.id}`, source: "Pixabay", kind: "image",
    title: hit.tags || "Pixabay image", thumbnail: hit.webformatURL || hit.previewURL,
    url: hit.largeImageURL || hit.webformatURL, pageUrl: hit.pageURL,
    credit: `Pixabay / ${hit.user || "Contributor"}`
  }));
  const videoAssets: MediaAsset[] = (videos.hits || []).map((hit: any) => {
    const variants = hit.videos || {};
    const best = variants.large || variants.medium || variants.small || variants.tiny;
    return {
      id: `pix-vid-${hit.id}`, source: "Pixabay", kind: "video",
      title: hit.tags || "Pixabay video", thumbnail: best?.thumbnail,
      url: best?.url || hit.pageURL, pageUrl: hit.pageURL,
      credit: `Pixabay / ${hit.user || "Contributor"}`, duration: hit.duration
    };
  });
  return [...imageAssets, ...videoAssets];
}

export async function searchUnsplash(apiKey: string, query: string): Promise<MediaAsset[]> {
  if (!apiKey.trim()) throw new Error("Chưa nhập Unsplash Access Key.");
  const params = new URLSearchParams({ query, per_page: "12", orientation: "portrait", content_filter: "high" });
  const response = await fetch(`https://api.unsplash.com/search/photos?${params}`, {
    headers: { Authorization: `Client-ID ${apiKey.trim()}` }
  });
  if (!response.ok) throw new Error(`Unsplash (${response.status}): ${await readError(response)}`);
  const data = await response.json();
  return (data.results || []).map((photo: any) => ({
    id: `unsplash-${photo.id}`, source: "Unsplash", kind: "image",
    title: photo.alt_description || photo.description || "Unsplash photograph",
    thumbnail: photo.urls?.small, url: photo.urls?.regular || photo.urls?.full,
    pageUrl: photo.links?.html,
    credit: `Photo by ${photo.user?.name || photo.user?.username || "Unsplash photographer"} on Unsplash`,
    license: "Unsplash License",
    downloadLocation: photo.links?.download_location
  }));
}

export async function trackUnsplashDownload(apiKey: string, location?: string): Promise<void> {
  if (!apiKey.trim() || !location) return;
  await fetch(location, { headers: { Authorization: `Client-ID ${apiKey.trim()}` } });
}

export async function searchFreesound(apiKey: string, query: string): Promise<MediaAsset[]> {
  if (!apiKey.trim()) throw new Error("Chưa nhập Freesound API token.");
  const params = new URLSearchParams({
    query, page_size: "12",
    fields: "id,name,username,license,duration,url,previews,description"
  });
  const response = await fetch(`https://freesound.org/apiv2/search/text/?${params}&token=${encodeURIComponent(apiKey.trim())}`);
  if (!response.ok) throw new Error(`Freesound (${response.status}): ${await readError(response)}`);
  const data = await response.json();
  return (data.results || []).map((sound: any) => ({
    id: `freesound-${sound.id}`, source: "Freesound", kind: "audio",
    title: sound.name || "Sound effect",
    thumbnail: undefined,
    url: sound.previews?.["preview-hq-mp3"] || sound.previews?.["preview-lq-mp3"] || sound.url,
    pageUrl: sound.url,
    credit: `Freesound / ${sound.username || "Creator"}`,
    license: sound.license || "Check the Freesound page before use",
    duration: sound.duration
  }));
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
