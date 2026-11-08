import { useEffect, useMemo, useRef, useState } from "react";
import {
  Atom, AudioLines, BookOpen, Check, Clapperboard, Copy, Download, Film,
  Image as ImageIcon, LoaderCircle, Menu, Mic2, Play, Search, Sparkles,
  WandSparkles, X, Plus, Trash2, Save, Smartphone, Monitor, Music2,
  Layers3, Upload, Volume2, RotateCcw
} from "lucide-react";
import { generateLocalProject, saveBlob, type Scene, type VideoProject, type MediaAsset } from "./services";
import { SOUND_PRESETS, findSoundPresets, createBuiltInSoundTrack } from "./sounds";
import { renderBrowserVideo, createThumbnail } from "./renderer";

type Style = "Isometric 3D" | "Cartoon Explainer" | "Blueprint" | "Hologram HUD" | "3D Data Chart" | "Paper Cutout";
type Page = "Studio" | "Discover" | "Storyboard" | "Media" | "Voice" | "Export";
const styleOptions: Style[] = ["Isometric 3D", "Cartoon Explainer", "Blueprint", "Hologram HUD", "3D Data Chart", "Paper Cutout"];

const defaultProject: VideoProject = {
  title: "What If Earth Stopped Spinning for 5 Seconds?",
  hook: "Imagine Earth’s rotation stopping instantly for just five seconds. Would everything around you stop too? No.",
  description: "A short thought experiment about Earth’s rotation and inertia. This is a starter script; review scientific claims before publishing.",
  hashtags: ["#WhatIf", "#Science", "#Earth"],
  pinnedComment: "What should we explore next? Leave your question below.",
  scenes: [
    { title: "The Five-Second Pause", narration: "Imagine Earth’s rotation stopping instantly for just five seconds. Would everything around you stop too? No. Motion would not simply disappear.", visual: "A detailed blue Earth floating in deep space, rotating slowly. A bright five-second countdown appears, then rotation freezes.", overlayText: "WHAT IF EARTH STOPPED?", duration: 7 },
    { title: "The Speed We Never Feel", narration: "At the equator, Earth’s surface moves eastward at about one thousand six hundred seventy kilometres per hour. We do not notice because everything around us moves with the planet.", visual: "Isometric Earth with glowing equator, latitude lines and an eastward rotation arrow.", overlayText: "1,670 KM/H AT THE EQUATOR", duration: 8 },
    { title: "Inertia Takes Over", narration: "If the solid Earth stopped suddenly, the air, oceans and loose objects would tend to keep moving eastward because of inertia.", visual: "Cutaway illustration of Earth’s surface, ocean and atmosphere with directional arrows.", overlayText: "INERTIA DOESN’T STOP", duration: 8 },
    { title: "The Atmosphere Keeps Moving", narration: "The atmosphere would not instantly stop with the ground. Powerful relative winds and huge ocean movement would develop.", visual: "Scientific cutaway of the planet with moving air streams and ocean currents.", overlayText: "AIR AND OCEANS KEEP MOVING", duration: 8 },
    { title: "When the Spin Returns", narration: "After five seconds, restarting Earth’s rotation would not neatly reset everything. Moving air, water and the surface would interact in a complex chain of effects.", visual: "Earth’s rotation arrow lights up again. Atmospheric and ocean motion vectors overlap.", overlayText: "FIVE SECONDS LATER…", duration: 7 },
    { title: "The Real Takeaway", narration: "This is an impossible thought experiment, not a precise forecast. We are already moving with Earth, and inertia is why we do not feel that motion.", visual: "Return to a calm, beautifully lit Earth in space. Rotation lines fade into a final question card.", overlayText: "WE’RE MOVING RIGHT NOW", duration: 7 }
  ]
};

function getStoredProject(): VideoProject {
  try {
    const raw = localStorage.getItem("shorts-studio-project");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.scenes) && parsed.scenes.length) return parsed;
    }
  } catch { /* use local starter project */ }
  return defaultProject;
}

function soundAsset(preset: (typeof SOUND_PRESETS)[number]): MediaAsset {
  return {
    id: "built-in-" + preset.id,
    source: "Built-in",
    kind: "audio",
    title: preset.name,
    url: "",
    credit: "Generated locally on this device",
    license: "Original synthetic audio · no external sound API",
    presetId: preset.id
  };
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "shorts-video";
}

function App() {
  const [page, setPage] = useState<Page>("Studio");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [project, setProject] = useState<VideoProject>(getStoredProject);
  const [topic, setTopic] = useState("What if Earth suddenly stopped spinning for five seconds?");
  const [style, setStyle] = useState<Style>("Isometric 3D");
  const [language, setLanguage] = useState("English");
  const [targetDuration, setTargetDuration] = useState(45);
  const [selectedScene, setSelectedScene] = useState(0);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaResults, setMediaResults] = useState<MediaAsset[]>(() => SOUND_PRESETS.map(soundAsset));
  const [selectedSound, setSelectedSound] = useState<MediaAsset | null>(null);
  const [selectedSoundPresetId, setSelectedSoundPresetId] = useState<string | null>(null);
  const [selectedSoundPreviewUrl, setSelectedSoundPreviewUrl] = useState("");
  const [soundVolume, setSoundVolume] = useState(25);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderFormat, setRenderFormat] = useState<"short" | "long">("short");
  const [outputResolution, setOutputResolution] = useState<"720" | "1080">("720");
  const [lastExport, setLastExport] = useState("");

  const scenes = project.scenes;
  const totalDuration = useMemo(() => scenes.reduce((sum, scene) => sum + (Number(scene.duration) || 0), 0), [scenes]);
  const fullNarration = useMemo(() => scenes.map(scene => scene.narration.trim()).filter(Boolean).join(" "), [scenes]);
  const currentScene = scenes[selectedScene] || scenes[0];

  useEffect(() => {
    try {
      const safeProject = {
        ...project,
        scenes: project.scenes.map(scene => ({
          ...scene,
          imageUrl: scene.imageUrl?.startsWith("blob:") ? undefined : scene.imageUrl,
          videoUrl: scene.videoUrl?.startsWith("blob:") ? undefined : scene.videoUrl
        }))
      };
      localStorage.setItem("shorts-studio-project", JSON.stringify(safeProject));
    } catch { /* storage can be full */ }
  }, [project]);

  useEffect(() => {
    try { localStorage.removeItem("shorts-studio-keys"); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    return () => { if (voiceUrl) URL.revokeObjectURL(voiceUrl); };
  }, [voiceUrl]);

  useEffect(() => {
    return () => { if (selectedSoundPreviewUrl) URL.revokeObjectURL(selectedSoundPreviewUrl); };
  }, [selectedSoundPreviewUrl]);

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const updateProject = (patch: Partial<VideoProject>) => setProject(old => ({ ...old, ...patch }));
  const updateScene = (key: keyof Scene, value: string | number) => {
    setProject(old => ({ ...old, scenes: old.scenes.map((scene, index) => index === selectedScene ? { ...scene, [key]: value } : scene) }));
    if (key === "narration") clearVoice();
  };

  const clearVoice = () => {
    setVoiceBlob(null);
    setVoiceUrl(old => { if (old) URL.revokeObjectURL(old); return ""; });
  };
  const reportError = (message: string) => { setError(message); setNotice(""); };
  const clearMessages = () => { setError(""); setNotice(""); };

  const makeScript = () => {
    clearMessages();
    const generated = generateLocalProject(topic, style, language, targetDuration);
    setProject(generated);
    setSelectedScene(0);
    clearVoice();
    setPage("Storyboard");
    setNotice("Local storyboard created. No API or internet connection was used. Review all factual claims before publishing.");
  };

  const previewBrowserVoice = () => {
    clearMessages();
    if (!fullNarration.trim()) { setError("Add narration to the scenes first."); return; }
    if (!("speechSynthesis" in window)) { setError("This browser does not support built-in speech preview. Upload or record a voice track instead."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(fullNarration);
    utterance.lang = language === "Vietnamese" ? "vi-VN" : language === "Spanish" ? "es-ES" : language === "French" ? "fr-FR" : language === "German" ? "de-DE" : "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setNotice("Browser voice preview is playing. This preview is not included in the exported video.");
    utterance.onerror = () => setError("The browser could not play speech preview. Upload a voice recording instead.");
    window.speechSynthesis.speak(utterance);
  };

  const uploadVoice = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("audio/")) { setError("Choose an audio file such as WAV, MP3, M4A or WebM."); return; }
    clearMessages();
    setVoiceBlob(file);
    setVoiceUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(file); });
    setNotice("Voice file loaded. It will be mixed into the exported video.");
  };

  const startRecording = async () => {
    clearMessages();
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setError("Microphone recording is not available here. Upload a WAV or MP3 voice file instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      recorder.ondataavailable = event => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setVoiceBlob(blob);
        setVoiceUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
        recordingStreamRef.current?.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        setNotice("Your voice recording is ready and will be mixed into the exported video.");
      };
      recorder.start();
      setIsRecording(true);
      setNotice("Recording. Read the narration aloud, then press Stop recording.");
    } catch (err) {
      reportError(err instanceof Error ? "Microphone access failed: " + err.message : "Microphone access failed. Check browser permission.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const filterSounds = () => {
    clearMessages();
    setMediaResults(findSoundPresets(mediaQuery).map(soundAsset));
    if (mediaQuery.trim()) setNotice("Filtered the built-in sound library. No internet search was made.");
  };

  const chooseSound = async (asset: MediaAsset) => {
    if (!asset.presetId) return;
    clearMessages();
    setBusy("Creating a free sound preview on this device…");
    try {
      const preview = await createBuiltInSoundTrack(asset.presetId, 12);
      setSelectedSound(asset);
      setSelectedSoundPresetId(asset.presetId);
      setSelectedSoundPreviewUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(preview); });
      setNotice("Sound selected. It will be generated to match the full video and mixed into the export.");
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Could not create this sound.");
    } finally { setBusy(""); }
  };

  const attachSceneFile = (file?: File) => {
    if (!file) return;
    clearMessages();
    if (file.size > 180 * 1024 * 1024) { setError("This file is larger than 180 MB. Choose a smaller image or clip for reliable browser rendering."); return; }
    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith("video/");
    if (!isVideo && !file.type.startsWith("image/")) {
      URL.revokeObjectURL(url);
      setError("Choose an image (JPG, PNG, WebP) or video (MP4, WebM) file.");
      return;
    }
    setProject(old => ({
      ...old,
      scenes: old.scenes.map((scene, index) => index === selectedScene
        ? { ...scene, imageUrl: isVideo ? undefined : url, videoUrl: isVideo ? url : undefined, imageCredit: "Uploaded by you", imageSourceUrl: undefined }
        : scene)
    }));
    setNotice((isVideo ? "Video clip" : "Image") + " attached to Scene " + (selectedScene + 1) + ". Re-upload it if you refresh the page.");
  };

  const clearSceneMedia = () => {
    setProject(old => ({
      ...old,
      scenes: old.scenes.map((scene, index) => index === selectedScene
        ? { ...scene, imageUrl: undefined, videoUrl: undefined, imageCredit: undefined, imageSourceUrl: undefined }
        : scene)
    }));
    setNotice("Scene returned to its built-in animated illustration.");
  };

  const addScene = () => {
    const newScene: Scene = { title: "New reveal", narration: "Write the next beat of the story here.", visual: "Describe a clear visual that explains this beat.", overlayText: "THE NEXT REVEAL", duration: 5 };
    setProject(old => ({ ...old, scenes: [...old.scenes, newScene] }));
    setSelectedScene(scenes.length);
  };

  const removeScene = (index: number) => {
    if (scenes.length <= 1) { setError("Keep at least one scene in the storyboard."); return; }
    setProject(old => ({ ...old, scenes: old.scenes.filter((_, i) => i !== index) }));
    setSelectedScene(Math.max(0, Math.min(index - 1, scenes.length - 2)));
    clearVoice();
  };

  const saveProjectFile = () => {
    const payload = { ...project, visualStyle: style, format: renderFormat === "short" ? "9:16" : "16:9", generatedAt: new Date().toISOString() };
    saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), slugify(project.title) + "-project.json");
    setLastExport("Project JSON downloaded");
  };

  const downloadMetadata = () => {
    const text = [
      "TITLE", project.title, "",
      "DESCRIPTION", project.description, "",
      "HASHTAGS", project.hashtags.join(" "), "",
      "PINNED COMMENT", project.pinnedComment, "",
      "SCRIPT", ...scenes.map((scene, index) => "SCENE " + (index + 1) + ": " + scene.title + "\n" + scene.narration)
    ].join("\n");
    saveBlob(new Blob([text], { type: "text/plain;charset=utf-8" }), slugify(project.title) + "-youtube-metadata.txt");
    setLastExport("YouTube metadata downloaded");
  };

  const downloadSubtitles = () => {
    let cursor = 0;
    let index = 1;
    const blocks: string[] = [];
    const stamp = (seconds: number) => {
      const milliseconds = Math.round(seconds * 1000);
      const hours = Math.floor(milliseconds / 3600000);
      const minutes = Math.floor((milliseconds % 3600000) / 60000);
      const secs = Math.floor((milliseconds % 60000) / 1000);
      const ms = milliseconds % 1000;
      return [hours, minutes, secs].map(value => String(value).padStart(2, "0")).join(":") + "," + String(ms).padStart(3, "0");
    };
    scenes.forEach(scene => {
      const duration = Math.max(1, Number(scene.duration) || 1);
      if (scene.narration.trim()) {
        blocks.push(index + "\n" + stamp(cursor) + " --> " + stamp(cursor + duration) + "\n" + scene.narration.trim());
        index++;
      }
      cursor += duration;
    });
    saveBlob(new Blob([blocks.join("\n\n")], { type: "text/plain;charset=utf-8" }), slugify(project.title) + ".srt");
    setLastExport("SRT subtitles downloaded");
  };

  const makeThumbnail = async () => {
    clearMessages();
    setBusy("Creating thumbnail…");
    try {
      const blob = await createThumbnail(project.title, style, currentScene?.imageUrl);
      saveBlob(blob, slugify(project.title) + "-thumbnail.png");
      setLastExport("Thumbnail PNG downloaded");
      setNotice("Thumbnail created.");
    } catch (err) { reportError(err instanceof Error ? err.message : "Thumbnail export failed."); }
    finally { setBusy(""); }
  };

  const renderVideo = async () => {
    clearMessages();
    setRenderProgress(0);
    setBusy("Preparing local video render…");
    try {
      const isShort = renderFormat === "short";
      const width = outputResolution === "1080" ? (isShort ? 1080 : 1920) : (isShort ? 720 : 1280);
      const height = outputResolution === "1080" ? (isShort ? 1920 : 1080) : (isShort ? 1280 : 720);
      const soundBlob = selectedSoundPresetId ? await createBuiltInSoundTrack(selectedSoundPresetId, totalDuration) : null;
      const blob = await renderBrowserVideo({
        title: project.title, scenes, voiceBlob, soundBlob, soundVolume: soundVolume / 100, style,
        width, height, fps: 24,
        onProgress: value => setRenderProgress(value)
      });
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      saveBlob(blob, slugify(project.title) + "." + extension);
      setLastExport("Rendered " + extension.toUpperCase() + " downloaded");
      setNotice("Video rendered on this device.");
    } catch (err) { reportError(err instanceof Error ? err.message : "Video rendering failed."); }
    finally { setBusy(""); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); }
    catch { setError("Clipboard permission unavailable. Download the metadata file instead."); }
  };

  const nav = [
    { name: "Studio" as Page, icon: Clapperboard },
    { name: "Discover" as Page, icon: Search },
    { name: "Storyboard" as Page, icon: BookOpen },
    { name: "Media" as Page, icon: ImageIcon },
    { name: "Voice" as Page, icon: AudioLines },
    { name: "Export" as Page, icon: Download }
  ];

  return <div className="app-shell">
    <aside className={mobileMenu ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brand-mark"><Atom size={22}/></div><div><b>SHORTS STUDIO</b><small>LOCAL VIDEO WORKSHOP</small></div><button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="nav-list">{nav.map(item => { const Icon=item.icon; return <button key={item.name} className={page===item.name?"nav-item active":"nav-item"} onClick={()=>{setPage(item.name);setMobileMenu(false);}}><Icon size={17}/><span>{item.name}</span>{item.name==="Studio"&&<i/>}</button>; })}</div>
      <div className="sidebar-bottom"><div className="workspace-label">MODE</div><div className="channel-chip"><span className="online-dot"/> NO API · WORKS LOCALLY</div></div>
      <div className="sidebar-foot"><span className="online-dot"/> Local workspace <span className="version">NO API</span></div>
    </aside>
    {mobileMenu&&<button className="scrim" onClick={()=>setMobileMenu(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileMenu(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><span className="device-pill">● NO API · LOCAL MODE</span><div className="avatar">S</div></div></header>
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={13}/> YOUR LOCAL VIDEO WORKSHOP</div><h1>Make curiosity <em>move.</em></h1><p>Create a starter storyboard, add your own media and render directly on this device.</p></div><span className="pill green">NO API REQUIRED</span></section>
        {error&&<div className="alert error-alert"><X size={16}/><span>{error}</span><button onClick={()=>setError("")}><X size={14}/></button></div>}
        {notice&&<div className="alert success-alert"><Check size={16}/><span>{notice}</span><button onClick={()=>setNotice("")}><X size={14}/></button></div>}
        {busy&&<div className="busy-line"><LoaderCircle size={16} className="spin"/><span>{busy}</span></div>}

        {page==="Studio"&&<>
          <section className="hero-grid">
            <div className="hero-card"><div className="hero-copy"><span className="pill">NO API · NO SIGN-UP</span><h2>One question.<br/><em>A thousand possibilities.</em></h2><p>Build a Short with a strong opening, clear scenes, local sound and your own footage.</p><button className="primary-btn" onClick={()=>setPage("Discover")}><WandSparkles size={16}/> Start a new video</button></div><div className="earth-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="planet"><div className="planet-shade"/></div><span className="orbit-label label-one">WHAT IF?</span><span className="orbit-label label-two">REAL SCIENCE</span></div></div>
            <div className="metric-card"><div className="metric-top"><span>PROJECT PULSE</span><span className="pulse-dot"/></div><div className="metric-value">{scenes.length}<small> scenes</small></div><div className="metric-sub">Your current story structure</div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="metric-bottom"><span>EST. DURATION</span><b>{totalDuration}s</b></div></div>
          </section>
          <div className="section-heading"><div><h3>Your current project</h3><p>{project.title}</p></div><span className="muted-label">AUTO-SAVED IN THIS BROWSER</span></div>
          <div className="topic-grid">
            <button className="topic-card" onClick={()=>setPage("Storyboard")}><div className="topic-art art-0"><span>STORYBOARD</span><b>✦</b></div><div className="topic-body"><h4>Edit your scenes</h4><p>Update narration, overlay text and timing.</p><small>{scenes.length} scenes · {totalDuration}s</small></div></button>
            <button className="topic-card" onClick={()=>setPage("Media")}><div className="topic-art art-1"><span>LOCAL MEDIA</span><b>◉</b></div><div className="topic-body"><h4>Add your own footage</h4><p>Upload images or clips from your computer and choose free built-in sound.</p><small>No external media search</small></div></button>
            <button className="topic-card" onClick={()=>setPage("Export")}><div className="topic-art art-2"><span>EXPORT</span><b>↗</b></div><div className="topic-body"><h4>Render and download</h4><p>Create a video, thumbnail, subtitles and metadata.</p><small>{voiceBlob?"Voice track ready":"Voice track optional"}</small></div></button>
          </div>
        </>}

        {page==="Discover"&&<section className="panel">
          <div className="section-heading"><div><h3>Local topic & storyboard builder</h3><p>Builds a ready-to-edit story template directly in your browser. No API, no sign-in and no external search.</p></div><Sparkles size={22}/></div>
          <label className="field-label">VIDEO QUESTION OR TOPIC</label>
          <textarea className="text-area" rows={3} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What if the Moon disappeared?"/>
          <div className="settings-grid">
            <div><label className="field-label">VISUAL STYLE</label><select className="text-field" value={style} onChange={e=>setStyle(e.target.value as Style)}>{styleOptions.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="field-label">OUTPUT LANGUAGE</label><select className="text-field" value={language} onChange={e=>setLanguage(e.target.value)}>{["English","Vietnamese","Spanish","Hindi","Portuguese","Japanese","German","French"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="field-label">TARGET DURATION</label><select className="text-field" value={targetDuration} onChange={e=>setTargetDuration(Number(e.target.value))}><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option></select></div>
          </div>
          <div className="notice"><b>Important:</b> This is a local storyboard template, not an AI researcher. The Earth-stopping topic has a dedicated starter script; other topics receive a generic outline that you must fact-check and rewrite.</div>
          <button className="primary-btn" onClick={makeScript}><WandSparkles size={16}/> Build storyboard locally</button>
          <div className="section-heading"><div><h3>Starter questions</h3><p>Click to load a topic into the builder.</p></div></div>
          <div className="topic-grid">{[
            "What if the Moon suddenly disappeared?",
            "Why do airplane windows have a tiny hole?",
            "Could humans survive on Mars without a spacesuit?",
            "What if gravity doubled overnight?",
            "What happens if you fall into Jupiter?",
            "Why can a huge steel ship float?"
          ].map((item,i)=><button className="topic-card" key={item} onClick={()=>setTopic(item)}><div className={"topic-art art-"+(i%3)}><span>IDEA {String(i+1).padStart(2,"0")}</span><b>{["☾","◉","✦"][i%3]}</b></div><div className="topic-body"><h4>{item}</h4><small>Click to use this question</small></div></button>)}</div>
        </section>}

        {page==="Storyboard"&&<section className="editor-layout">
          <div className="panel storyboard-panel">
            <div className="section-heading"><div><h3>Storyboard builder</h3><p>Shape the story scene by scene before rendering.</p></div><span className="pill green">9:16 SHORT</span></div>
            <label className="field-label">VIDEO TITLE</label><input className="text-field" value={project.title} onChange={e=>updateProject({title:e.target.value})}/>
            <label className="field-label">OPENING HOOK</label><textarea className="text-area" rows={2} value={project.hook} onChange={e=>updateProject({hook:e.target.value})}/>
            <div className="scene-heading"><b>SCENES <span>{scenes.length}</span></b><button className="text-btn" onClick={addScene}><Plus size={13}/> Add scene</button></div>
            <div className="scene-list">{scenes.map((scene,i)=><div key={i} className={selectedScene===i?"scene-row selected":"scene-row"}><button className="scene-select" onClick={()=>setSelectedScene(i)}><span className="scene-index">{String(i+1).padStart(2,"0")}</span><span className="scene-info"><b>{scene.title}</b><small>{scene.duration}s · {scene.narration.slice(0,58)}…</small></span></button><button className="icon-btn danger-icon" onClick={()=>removeScene(i)} aria-label="Delete scene"><Trash2 size={14}/></button></div>)}</div>
            <div className="form-actions"><button className="secondary-btn" onClick={()=>{localStorage.setItem("shorts-studio-project",JSON.stringify(project));setNotice("Project saved in this browser.");}}><Save size={14}/> Save project</button><button className="secondary-btn" onClick={saveProjectFile}><Download size={14}/> Download JSON</button></div>
          </div>
          <div className="panel scene-detail">
            <div className="preview-frame">{currentScene?.videoUrl?<video className="scene-image" src={currentScene.videoUrl} autoPlay loop muted playsInline />:currentScene?.imageUrl?<img className="scene-image" src={currentScene.imageUrl} alt="Selected scene" />:<div className="preview-earth"/>}<div className="preview-horizon"/><div className="preview-caption">{currentScene?.overlayText||currentScene?.title}</div><span className="preview-tag">SCENE {selectedScene+1}</span><button className="play-float" onClick={()=>setPage("Export")}><Play size={19} fill="currentColor"/></button></div>
            <div className="scene-edit">
              <div className="detail-title"><b>Scene {selectedScene+1} details</b><span>{currentScene?.duration}s</span></div>
              <label className="field-label">SCENE TITLE</label><input className="text-field" value={currentScene?.title||""} onChange={e=>updateScene("title",e.target.value)}/>
              <label className="field-label">ON-SCREEN TEXT</label><input className="text-field" value={currentScene?.overlayText||""} onChange={e=>updateScene("overlayText",e.target.value)}/>
              <label className="field-label">VOICEOVER NARRATION</label><textarea className="text-area" rows={4} value={currentScene?.narration||""} onChange={e=>updateScene("narration",e.target.value)}/>
              <label className="field-label">VISUAL DIRECTION</label><textarea className="text-area" rows={3} value={currentScene?.visual||""} onChange={e=>updateScene("visual",e.target.value)}/>
              <label className="field-label">DURATION (SECONDS)</label><input className="text-field" type="number" min={1} max={60} value={currentScene?.duration||5} onChange={e=>updateScene("duration",Number(e.target.value))}/>
              {currentScene?.imageCredit&&<div className="credit-line">{currentScene.imageCredit}</div>}
              <button className="secondary-btn" onClick={()=>setPage("Media")}><ImageIcon size={15}/> Upload media for this scene</button>
            </div>
          </div>
        </section>}

        {page==="Media"&&<section className="panel media-panel">
          <div className="section-heading"><div><h3>Local media & free sound studio</h3><p>No Pixabay, Unsplash, Freesound or external search. Built-in graphics work immediately; upload your own image or video if you want specific footage.</p></div><Layers3 size={22}/></div>
          <div className="local-upload-card">
            <div><b>Selected scene: {selectedScene+1}. {currentScene?.title}</b><small>Choose an image or video from your computer to replace the built-in illustration.</small></div>
            <label className="file-upload-btn"><Upload size={16}/> Upload image / video<input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" onChange={e=>attachSceneFile(e.target.files?.[0])}/></label>
            <button className="secondary-btn" onClick={clearSceneMedia}><RotateCcw size={14}/> Use built-in animation</button>
          </div>
          <div className="section-heading"><div><h3>Built-in free sounds</h3><p>Generated directly on this device and mixed into the final render. No sound API is used.</p></div><Music2 size={22}/></div>
          <div className="media-toolbar">
            <input className="text-field" value={mediaQuery} onChange={e=>setMediaQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")filterSounds();}} placeholder="Filter sounds: cinematic, space, whoosh, impact…"/>
            <button className="primary-btn" onClick={filterSounds}><Search size={15}/> Filter sounds</button>
          </div>
          {selectedSound&&<div className="sound-selected"><Music2 size={17}/><div><b>{selectedSound.title}</b><small>{selectedSound.credit} · {selectedSound.license}</small>{selectedSoundPreviewUrl&&<audio className="sound-preview" controls preload="none" src={selectedSoundPreviewUrl}/>}<label className="sound-volume-label">Sound volume: {soundVolume}%</label><input className="sound-volume" type="range" min="0" max="60" value={soundVolume} onChange={e=>setSoundVolume(Number(e.target.value))}/></div><button className="secondary-btn" onClick={()=>{setSelectedSound(null);setSelectedSoundPresetId(null);setSelectedSoundPreviewUrl("");setNotice("Background sound removed.");}}>Remove</button></div>}
          <div className="media-grid">{mediaResults.map(asset=>{const preset=SOUND_PRESETS.find(item=>item.id===asset.presetId);return <div className="media-card" key={asset.id}><div className="media-audio-art"><AudioLines size={30}/></div><div className="media-card-body"><b>{asset.title}</b><small>{preset?.description}</small><small className="license-text">{preset?.kind==="music"?"BACKGROUND MUSIC":"SOUND EFFECT"} · GENERATED LOCALLY</small><div className="media-card-actions"><button className="secondary-btn" onClick={()=>chooseSound(asset)}>Generate & select</button></div></div></div>;})}</div>
        </section>}

        {page==="Voice"&&<section className="panel">
          <div className="section-heading"><div><h3>Voice studio · no API</h3><p>Preview the script with your browser’s built-in voice, upload a voice file, or record yourself reading the narration.</p></div><Mic2 size={22}/></div>
          <div className="voice-length">{fullNarration.trim().split(/\s+/).filter(Boolean).length} words · {totalDuration}s estimated video</div>
          <label className="field-label">COMBINED NARRATION</label><textarea className="text-area" rows={8} value={fullNarration} readOnly/>
          <div className="form-actions">
            <button className="secondary-btn" onClick={previewBrowserVoice}><Volume2 size={15}/> Preview browser voice</button>
            <button className="secondary-btn" onClick={()=>window.speechSynthesis?.cancel()}><X size={14}/> Stop preview</button>
            <label className="file-upload-btn"><Upload size={15}/> Upload voice file<input type="file" accept="audio/*" onChange={e=>uploadVoice(e.target.files?.[0])}/></label>
            <button className={isRecording?"danger-record-btn":"primary-btn"} onClick={isRecording?stopRecording:startRecording}><Mic2 size={15}/>{isRecording?"Stop recording":"Record your voice"}</button>
          </div>
          {voiceUrl&&<div className="audio-preview"><div><b>Voice track ready</b><small>Will be mixed into the exported video</small></div><audio controls src={voiceUrl}/><button className="secondary-btn" onClick={()=>voiceBlob&&saveBlob(voiceBlob,slugify(project.title)+"-voice") }><Download size={14}/> Download voice</button><button className="secondary-btn" onClick={clearVoice}>Remove</button></div>}
          <div className="notice"><b>Important:</b> Browser voice preview is only for listening and cannot be exported as a voice track. To include speech in your video, upload an audio file or record your own voice here.</div>
        </section>}

        {page==="Export"&&<section className="panel">
          <div className="section-heading"><div><h3>Export center</h3><p>Render on this device, then download video, thumbnail and publishing metadata.</p></div><Download size={22}/></div>
          <div className="export-preview"><div className="export-screen"><div className="preview-earth"/><span>WHAT IF LAB</span><b>{project.title}</b></div><div className="export-settings">
            <label className="field-label">VIDEO FORMAT</label><div className="format-toggle"><button className={renderFormat==="short"?"format-selected":""} onClick={()=>setRenderFormat("short")}><Smartphone size={16}/> Shorts 9:16</button><button className={renderFormat==="long"?"format-selected":""} onClick={()=>setRenderFormat("long")}><Monitor size={16}/> Long 16:9</button></div>
            <label className="field-label">RENDER RESOLUTION</label><select className="text-field" value={outputResolution} onChange={e=>setOutputResolution(e.target.value as any)}><option value="720">720p — lower memory use</option><option value="1080">1080p — higher quality (more memory)</option></select>
            <div className="notice">Local render uses Canvas + MediaRecorder. Built-in animation, your uploaded media, recorded/uploaded narration and one generated free sound track can be included. Browser codec support decides MP4 or WebM. Keep this tab open.</div>
            <div className="export-buttons"><button className="primary-btn" disabled={!!busy} onClick={renderVideo}><Film size={16}/> Render video</button><button className="secondary-btn" disabled={!!busy} onClick={makeThumbnail}><ImageIcon size={15}/> Create thumbnail</button></div>
            {busy.toLowerCase().includes("render")&&<div className="render-progress"><div><span>Rendering on device</span><b>{renderProgress}%</b></div><div className="progress-track"><i style={{width:renderProgress+"%"}}/></div></div>}
            {lastExport&&<div className="notice"><Check size={15}/> {lastExport}</div>}
          </div></div>
          <div className="section-heading"><div><h3>YouTube publishing pack</h3><p>Review the copy, then download all metadata as a text file.</p></div></div>
          <div className="metadata-card"><div><label className="field-label">TITLE</label><p>{project.title}</p><button className="text-btn" onClick={()=>copy(project.title)}><Copy size={13}/> Copy title</button></div><div><label className="field-label">DESCRIPTION</label><p>{project.description}</p><button className="text-btn" onClick={()=>copy(project.description)}><Copy size={13}/> Copy description</button></div><div><label className="field-label">HASHTAGS</label><p>{project.hashtags.join(" ")}</p><button className="text-btn" onClick={()=>copy(project.hashtags.join(" "))}><Copy size={13}/> Copy hashtags</button></div><div><label className="field-label">PINNED COMMENT</label><p>{project.pinnedComment}</p><button className="text-btn" onClick={()=>copy(project.pinnedComment)}><Copy size={13}/> Copy comment</button></div></div>
          <div className="form-actions"><button className="secondary-btn" onClick={downloadMetadata}><FileText size={15}/> Download title + description + tags</button><button className="secondary-btn" onClick={downloadSubtitles}><FileText size={15}/> Download subtitles SRT</button><button className="secondary-btn" onClick={saveProjectFile}><Download size={15}/> Download project JSON</button></div>
        </section>}
      </div>
    </main>
    <footer className="mobile-bottom">{nav.slice(0,4).map(item=>{const Icon=item.icon;return <button className={page===item.name?"selected":""} key={item.name} onClick={()=>setPage(item.name)}><Icon size={19}/><small>{item.name}</small></button>})}</footer>
  </div>;
}

export default App;
