export type SoundKind = "music" | "effect";

export type SoundPreset = {
  id: string;
  name: string;
  kind: SoundKind;
  description: string;
  tags: string[];
  durationLabel: string;
};

export const SOUND_PRESETS: SoundPreset[] = [
  { id: "cinematic-ambient", name: "Cinematic Ambient", kind: "music", description: "Warm, calm documentary bed with slowly changing chords.", tags: ["documentary", "cinematic", "calm", "background"], durationLabel: "Full video" },
  { id: "space-atmosphere", name: "Space Atmosphere", kind: "music", description: "Deep floating tones for planets, science and space stories.", tags: ["space", "planet", "science", "ambient"], durationLabel: "Full video" },
  { id: "tech-pulse", name: "Technology Pulse", kind: "music", description: "Soft electronic pulses for technology and engineering explainers.", tags: ["technology", "electronic", "pulse", "engineering"], durationLabel: "Full video" },
  { id: "soft-tension", name: "Soft Tension", kind: "music", description: "A subtle suspense bed for mysteries and surprising reveals.", tags: ["mystery", "suspense", "tension", "story"], durationLabel: "Full video" },
  { id: "wind-bed", name: "Atmospheric Wind", kind: "music", description: "Gentle airy noise for weather, flight and nature scenes.", tags: ["wind", "air", "nature", "flight"], durationLabel: "Full video" },
  { id: "whoosh", name: "Transition Whoosh", kind: "effect", description: "A short airy sweep repeated at scene transitions.", tags: ["whoosh", "transition", "swoosh", "movement"], durationLabel: "Scene transitions" },
  { id: "impact", name: "Cinematic Impact", kind: "effect", description: "Soft low hit to emphasise key reveals.", tags: ["impact", "hit", "reveal", "dramatic"], durationLabel: "Key moments" },
  { id: "riser", name: "Rising Tension", kind: "effect", description: "A rising sweep that builds towards the final reveal.", tags: ["riser", "build", "tension", "transition"], durationLabel: "Final reveal" }
];

export function findSoundPresets(query: string): SoundPreset[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return SOUND_PRESETS;
  const words = normalized.split(/\s+/).filter(Boolean);
  const matches = SOUND_PRESETS.filter((preset) =>
    [preset.name, preset.description, preset.kind, ...preset.tags].join(" ").toLowerCase().includes(normalized) ||
    words.some((word) => [preset.name, preset.description, ...preset.tags].join(" ").toLowerCase().includes(word))
  );
  return matches.length ? matches : SOUND_PRESETS;
}

function addTone(
  context: OfflineAudioContext,
  frequency: number,
  start: number,
  duration: number,
  peak: number,
  waveform: OscillatorType = "sine",
  endFrequency?: number,
  pan = 0
) {
  if (start >= context.length / context.sampleRate) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const panner = context.createStereoPanner();
  oscillator.type = waveform;
  oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), Math.min(context.length / context.sampleRate, start + duration));
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), Math.min(context.length / context.sampleRate, start + Math.min(0.04, duration * 0.2)));
  gain.gain.setValueAtTime(Math.max(0.0002, peak), Math.max(start + Math.min(0.04, duration * 0.2), start + duration * 0.72));
  gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(context.length / context.sampleRate, start + duration));
  panner.pan.setValueAtTime(pan, start);
  oscillator.connect(gain).connect(panner).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(Math.min(context.length / context.sampleRate, start + duration + 0.02));
}

function addNoiseSweep(
  context: OfflineAudioContext,
  start: number,
  duration: number,
  peak: number,
  lowFrequency: number,
  highFrequency: number,
  filterType: BiquadFilterType = "bandpass",
  pan = 0
) {
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, Math.ceil(sampleRate * duration), sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(Math.max(20, lowFrequency), start);
  filter.frequency.exponentialRampToValueAtTime(Math.max(20, highFrequency), Math.min(context.length / sampleRate, start + duration));
  filter.Q.value = filterType === "bandpass" ? 0.7 : 0.35;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.linearRampToValueAtTime(peak, start + duration * 0.32);
  gain.gain.exponentialRampToValueAtTime(0.0001, Math.min(context.length / sampleRate, start + duration));
  const panner = context.createStereoPanner();
  panner.pan.setValueAtTime(pan, start);
  source.connect(filter).connect(gain).connect(panner).connect(context.destination);
  source.start(start);
}

function buildMusic(context: OfflineAudioContext, id: string, duration: number) {
  const chordSets: Record<string, number[][]> = {
    "cinematic-ambient": [[110, 164.81, 220], [98, 146.83, 196], [130.81, 196, 261.63], [110, 164.81, 220]],
    "space-atmosphere": [[55, 82.41, 110, 164.81], [65.41, 98, 130.81, 196], [49, 73.42, 98, 146.83]],
    "soft-tension": [[82.41, 123.47, 155.56], [77.78, 116.54, 146.83], [87.31, 130.81, 164.81]]
  };
  if (id === "wind-bed") {
    for (let start = 0; start < duration; start += 7) {
      const span = Math.min(8, duration - start);
      addNoiseSweep(context, start, span, 0.045, 120 + Math.random() * 80, 380 + Math.random() * 160, "lowpass", Math.sin(start) * 0.35);
    }
    return;
  }
  if (id === "tech-pulse") {
    addTone(context, 55, 0, duration, 0.035, "sine");
    for (let t = 0.25; t < duration; t += 0.65) {
      addTone(context, 90, t, 0.16, 0.085, "sine", 42);
      addTone(context, 660 + (Math.floor(t * 3) % 3) * 110, t + 0.12, 0.07, 0.018, "triangle");
    }
    return;
  }
  const chords = chordSets[id] || chordSets["cinematic-ambient"];
  const chordLength = id === "space-atmosphere" ? 8 : 6;
  for (let start = 0, chordIndex = 0; start < duration; start += chordLength, chordIndex++) {
    const chord = chords[chordIndex % chords.length];
    const span = Math.min(chordLength + 1, duration - start);
    chord.forEach((frequency, noteIndex) => {
      addTone(context, frequency, start, span, noteIndex === 0 ? 0.055 : 0.024, "sine", undefined, (noteIndex - 1) * 0.2);
      if (id === "space-atmosphere" && noteIndex === 0) addTone(context, frequency * 2.01, start + 0.4, span * 0.8, 0.009, "sine", undefined, 0.25);
    });
  }
  if (id === "soft-tension") {
    for (let t = 1; t < duration; t += 3.2) addTone(context, 41.2, t, 1.6, 0.045, "sine", 34);
  }
}

function buildEffects(context: OfflineAudioContext, id: string, duration: number) {
  if (id === "whoosh") {
    const count = Math.max(1, Math.min(8, Math.round(duration / 6)));
    for (let i = 0; i < count; i++) {
      const start = Math.min(duration - 0.8, 0.3 + (duration - 1.2) * (i / Math.max(1, count - 1)));
      addNoiseSweep(context, Math.max(0, start), Math.min(0.85, duration - start), 0.22, 350, 6200, "bandpass", i % 2 ? 0.35 : -0.35);
    }
  } else if (id === "impact") {
    const positions = [0.25, duration * 0.48, Math.max(0, duration - 0.55)];
    positions.forEach((start, index) => {
      addTone(context, 95 - index * 8, start, 0.42, 0.18, "sine", 34);
      addNoiseSweep(context, start, 0.22, 0.095, 1200, 120, "lowpass");
    });
  } else if (id === "riser") {
    const span = Math.min(5, duration);
    addNoiseSweep(context, Math.max(0, duration - span), span, 0.16, 180, 7200, "lowpass");
    addTone(context, 110, Math.max(0, duration - span), span, 0.045, "sawtooth", 440);
  }
}

function encodeWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const frames = buffer.length;
  const output = new ArrayBuffer(44 + frames * channels * 2);
  const view = new DataView(output);
  const writeText = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  writeText(0, "RIFF");
  view.setUint32(4, output.byteLength - 8, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, buffer.sampleRate, true);
  view.setUint32(28, buffer.sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, frames * channels * 2, true);
  let offset = 44;
  const channelData = Array.from({ length: channels }, (_, channel) => buffer.getChannelData(channel));
  for (let frame = 0; frame < frames; frame++) {
    for (let channel = 0; channel < channels; channel++) {
      const sample = Math.max(-1, Math.min(1, channelData[channel][frame]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([output], { type: "audio/wav" });
}

export async function createBuiltInSoundTrack(presetId: string, durationSeconds: number): Promise<Blob> {
  const preset = SOUND_PRESETS.find((item) => item.id === presetId);
  if (!preset) throw new Error("Unknown built-in sound preset.");
  const duration = Math.max(2, Math.min(180, durationSeconds));
  const sampleRate = 22050;
  const OfflineCtor = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
  if (!OfflineCtor) throw new Error("Your browser does not support local sound generation. Please use an updated Chrome or Edge browser.");
  const context: OfflineAudioContext = new OfflineCtor(2, Math.ceil(duration * sampleRate), sampleRate);
  if (preset.kind === "music") buildMusic(context, preset.id, duration);
  else buildEffects(context, preset.id, duration);
  const rendered = await context.startRendering();
  return encodeWav(rendered);
}
