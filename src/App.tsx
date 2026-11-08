import { useEffect, useMemo, useState } from "react";
import {
  Atom, AudioLines, BookOpen, Check, ChevronDown, Clapperboard, Copy,
  Download, Film, Image as ImageIcon, LoaderCircle, Menu, Mic2, Play,
  Search, Settings2, Sparkles, WandSparkles, X, Plus, Trash2, Volume2,
  Video, FileText, KeyRound, ExternalLink, Save, Smartphone, Monitor,
  RefreshCw, Music2, Link2, Eye, Layers3
} from "lucide-react";
import {
  generateProject, generateVoice, searchPixabay, searchUnsplash,
  searchFreesound, trackUnsplashDownload, saveBlob,
  type Scene, type VideoProject, type MediaAsset
} from "./services";
import { renderBrowserVideo, createThumbnail } from "./renderer";

type Style = "Isometric 3D" | "Cartoon Explainer" | "Blueprint" | "Hologram HUD" | "3D Data Chart" | "Paper Cutout";
type Keys = { gemini: string; pixabay: string; unsplash: string; freesound: string };
type Page = "Studio" | "Discover" | "Storyboard" | "Media" | "Voice" | "Export";
const styleOptions: Style[] = ["Isometric 3D", "Cartoon Explainer", "Blueprint", "Hologram HUD", "3D Data Chart", "Paper Cutout"];
const defaultProject: VideoProject = {
  title: "What If Earth Stopped Spinning?",
  hook: "What if Earth suddenly stopped spinning for five seconds?",
  description: "A science-led thought experiment about inertia, Earth's rotation and what the physics actually tells us. Hypothetical scenario; real science.",
  hashtags: ["#WhatIf", "#Science", "#Earth"],
  pinnedComment: "What impossible science question should we test next?",
  scenes: [
    { title: "The impossible question", narration: "What if Earth suddenly stopped spinning for five seconds?", visual: "Earth rotating in deep space; dramatic opening reveal", overlayText: "WHAT IF EARTH STOPPED?", duration: 4 },
    { title: "The hidden motion", narration: "At the equator, the ground moves eastward at roughly one thousand six hundred seventy kilometers per hour.", visual: "Isometric Earth with glowing rotation arrows and a speed marker", overlayText: "1,670 KM/H AT THE EQUATOR", duration: 8 },
    { title: "What keeps moving?", narration: "The atmosphere and oceans would keep moving because of inertia. The exact effects depend on how the stop happens.", visual: "Cutaway of the atmosphere and ocean with directional motion vectors", overlayText: "INERTIA CHANGES EVERYTHING", duration: 12 },
    { title: "The real answer", narration: "A sudden stop is an impossible thought experiment, not a realistic event. Physics helps us separate dramatic images from what we can calculate.", visual: "Earth in space; concise fact cards and a final reveal", overlayText: "THE PHYSICS, NOT THE MYTH", duration: 12 }
  ]
};

function getStoredKeys(): Keys {
  try {
    const raw = localStorage.getItem("shorts-studio-keys");
    if (raw) return { gemini: "", pixabay: "", unsplash: "", freesound: "", ...JSON.parse(raw) };
  } catch { /* ignore malformed browser storage */ }
  return { gemini: "", pixabay: "", unsplash: "", freesound: "" };
}

function getStoredProject(): VideoProject {
  try {
    const raw = localStorage.getItem("shorts-studio-project");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.scenes) && parsed.scenes.length) return parsed;
    }
  } catch { /* use starter project */ }
  return defaultProject;
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
  const [keys, setKeys] = useState<Keys>(getStoredKeys);
  const [keyDraft, setKeyDraft] = useState<Keys>(getStoredKeys);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [voiceName, setVoiceName] = useState("Kore");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState("");
  const [mediaQuery, setMediaQuery] = useState("earth space science");
  const [mediaSource, setMediaSource] = useState<"Pixabay" | "Unsplash" | "Freesound">("Pixabay");
  const [mediaResults, setMediaResults] = useState<MediaAsset[]>([]);
  const [selectedSound, setSelectedSound] = useState<MediaAsset | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderFormat, setRenderFormat] = useState<"short" | "long">("short");
  const [outputResolution, setOutputResolution] = useState<"720" | "1080">("720");
  const [lastExport, setLastExport] = useState("");

  const scenes = project.scenes;
  const totalDuration = useMemo(() => scenes.reduce((sum, scene) => sum + (Number(scene.duration) || 0), 0), [scenes]);
  const fullNarration = useMemo(() => scenes.map(scene => scene.narration.trim()).filter(Boolean).join(" "), [scenes]);
  const currentScene = scenes[selectedScene] || scenes[0];

  useEffect(() => {
    try { localStorage.setItem("shorts-studio-project", JSON.stringify(project)); } catch { /* storage can be full or disabled */ }
  }, [project]);

  useEffect(() => {
    return () => { if (voiceUrl) URL.revokeObjectURL(voiceUrl); };
  }, [voiceUrl]);

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

  const saveSettings = () => {
    setKeys(keyDraft);
    try { localStorage.setItem("shorts-studio-keys", JSON.stringify(keyDraft)); } catch { /* browser may block storage */ }
    setShowSettings(false);
    setNotice("API settings saved in this browser. They are not committed to GitHub.");
    setError("");
  };

  const makeScript = async () => {
    clearMessages();
    if (!keys.gemini.trim()) { setShowSettings(true); setError("Add your Gemini API key first. It stays in this browser only."); return; }
    setBusy("Generating a research-led storyboard with Gemini…");
    try {
      const generated = await generateProject(keys.gemini, topic, style, language, targetDuration);
      setProject(generated);
      setSelectedScene(0);
      clearVoice();
      setPage("Storyboard");
      setNotice("Storyboard generated. Review the claims, narration and scene directions before making media.");
    } catch (err) { reportError(err instanceof Error ? err.message : "Could not generate the storyboard."); }
    finally { setBusy(""); }
  };

  const createVoice = async () => {
    clearMessages();
    if (!keys.gemini.trim()) { setShowSettings(true); setError("Add your Gemini API key first."); return; }
    if (!fullNarration.trim()) { setError("Add narration to the scenes before generating voice."); return; }
    setBusy("Generating narration audio with Gemini TTS…");
    try {
      const blob = await generateVoice(keys.gemini, fullNarration, voiceName, "clear, curious, confident science documentary narration, natural pauses, medium pace");
      setVoiceBlob(blob);
      setVoiceUrl(old => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(blob); });
      setNotice("Voice generated. Preview it below before rendering.");
      setPage("Voice");
    } catch (err) { reportError(err instanceof Error ? err.message : "Voice generation failed."); }
    finally { setBusy(""); }
  };

  const searchMedia = async () => {
    clearMessages();
    setBusy("Searching " + mediaSource + "…");
    try {
      let results: MediaAsset[] = [];
      if (mediaSource === "Pixabay") results = await searchPixabay(keys.pixabay, mediaQuery);
      if (mediaSource === "Unsplash") results = await searchUnsplash(keys.unsplash, mediaQuery);
      if (mediaSource === "Freesound") results = await searchFreesound(keys.freesound, mediaQuery);
      setMediaResults(results);
      if (!results.length) setNotice("No results found. Try a broader English search phrase.");
    } catch (err) { reportError(err instanceof Error ? err.message : "Media search failed."); }
    finally { setBusy(""); }
  };

  const applyMedia = async (asset: MediaAsset) => {
    if (asset.kind === "audio") {
      setSelectedSound(asset);
      setNotice("Sound selected. Check its license on Freesound before publishing; add it in your editor or use it only where your license permits.");
      return;
    }
    const imageUrl = asset.kind === "video" ? (asset.thumbnail || asset.url) : asset.url;
    const videoUrl = asset.kind === "video" ? asset.url : undefined;
    setProject(old => ({
      ...old,
      scenes: old.scenes.map((scene, index) => index === selectedScene ? {
        ...scene, imageUrl, videoUrl, imageCredit: asset.credit || asset.source, imageSourceUrl: asset.pageUrl || asset.url
      } : scene)
    }));
    if (asset.source === "Unsplash") {
      try { await trackUnsplashDownload(keys.unsplash, asset.downloadLocation); } catch { /* attribution stays visible even if tracking fails */ }
    }
    setNotice("Added media to Scene " + (selectedScene + 1) + ". Credit: " + (asset.credit || asset.source));
    setPage("Storyboard");
  };

  const addScene = () => {
    const newScene: Scene = { title: "New reveal", narration: "Write the next beat of the story here.", visual: "Describe a clear, original visual that explains this beat.", overlayText: "THE NEXT REVEAL", duration: 5 };
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
    const payload = { ...project, visualStyle: style, format: renderFormat === "short" ? "9:16" : "16:9", generatedAt: new Date().toISOString(), mediaCredits: scenes.filter(s => s.imageCredit).map(s => ({ credit: s.imageCredit, source: s.imageSourceUrl })) };
    saveBlob(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }), slugify(project.title) + "-project.json");
    setLastExport("Project JSON downloaded");
  };

  const downloadMetadata = () => {
    const text = [
      "TITLE", project.title, "",
      "DESCRIPTION", project.description, "",
      "HASHTAGS", project.hashtags.join(" "), "",
      "PINNED COMMENT", project.pinnedComment, "",
      "SCRIPT", ...scenes.map((scene, index) => "SCENE " + (index + 1) + ": " + scene.title + "\n" + scene.narration),
      "", "MEDIA CREDITS", ...scenes.filter(s => s.imageCredit).map(s => s.imageCredit + " — " + s.imageSourceUrl)
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
    clearMessages(); setBusy("Designing thumbnail…");
    try {
      const blob = await createThumbnail(project.title, style, currentScene?.imageUrl);
      saveBlob(blob, slugify(project.title) + "-thumbnail.png");
      setLastExport("Thumbnail PNG downloaded");
      setNotice("Thumbnail created. You can use it as a video cover or long-form thumbnail.");
    } catch (err) { reportError(err instanceof Error ? err.message : "Thumbnail export failed."); }
    finally { setBusy(""); }
  };

  const renderVideo = async () => {
    clearMessages(); setRenderProgress(0);
    setBusy("Preparing local video render…");
    try {
      const isShort = renderFormat === "short";
      const width = outputResolution === "1080" ? (isShort ? 1080 : 1920) : (isShort ? 720 : 1280);
      const height = outputResolution === "1080" ? (isShort ? 1920 : 1080) : (isShort ? 1280 : 720);
      const blob = await renderBrowserVideo({
        title: project.title, scenes, voiceBlob, style,
        width, height, fps: 24,
        onProgress: (value) => setRenderProgress(value)
      });
      const extension = blob.type.includes("mp4") ? "mp4" : "webm";
      saveBlob(blob, slugify(project.title) + "." + extension);
      setLastExport("Rendered " + extension.toUpperCase() + " downloaded");
      setNotice("Video rendered on this device. Check the file extension: " + extension.toUpperCase() + ".");
    } catch (err) { reportError(err instanceof Error ? err.message : "Video rendering failed."); }
    finally { setBusy(""); }
  };

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNotice("Copied to clipboard."); }
    catch { setError("Clipboard permission is unavailable. Download the metadata file instead."); }
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
      <div className="brand"><div className="brand-mark"><Atom size={22}/></div><div><b>SHORTS STUDIO</b><small>AI CREATOR WORKSPACE</small></div><button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)}><X size={18}/></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <div className="nav-list">{nav.map(item => { const Icon=item.icon; return <button key={item.name} className={page===item.name?"nav-item active":"nav-item"} onClick={()=>{setPage(item.name);setMobileMenu(false);}}><Icon size={17}/><span>{item.name}</span>{item.name==="Studio"&&<i/>}</button>; })}</div>
      <div className="sidebar-bottom"><div className="workspace-label">YOUR CHANNEL</div><div className="channel-chip"><span className="channel-dot"/> WHAT IF LAB <ChevronDown size={14}/></div><button className="nav-item" onClick={()=>{setKeyDraft(keys);setShowSettings(true);}}><Settings2 size={17}/> API & Settings</button></div>
      <div className="sidebar-foot"><span className="online-dot"/> Local workspace <span className="version">BETA 0.2</span></div>
    </aside>
    {mobileMenu&&<button className="scrim" onClick={()=>setMobileMenu(false)} aria-label="Close menu"/>}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setMobileMenu(true)}><Menu size={20}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{page}</b></div><div className="top-actions"><span className="device-pill">● Responsive PWA</span><button className="icon-btn" onClick={()=>{setKeyDraft(keys);setShowSettings(true);}}><Settings2 size={18}/></button><div className="avatar">S</div></div></header>
      <div className="content">
        <section className="welcome-row"><div><div className="eyebrow"><Sparkles size={13}/> YOUR ANIMATED SCIENCE WORKSHOP</div><h1>Make curiosity <em>move.</em></h1><p>Turn impossible questions into visual stories people want to finish.</p></div><button className="secondary-btn settings-cta" onClick={()=>{setKeyDraft(keys);setShowSettings(true);}}><Settings2 size={16}/> Configure APIs</button></section>
        {error&&<div className="alert error-alert"><X size={16}/><span>{error}</span><button onClick={()=>setError("")}><X size={14}/></button></div>}
        {notice&&<div className="alert success-alert"><Check size={16}/><span>{notice}</span><button onClick={()=>setNotice("")}><X size={14}/></button></div>}
        {busy&&<div className="busy-line"><LoaderCircle size={16} className="spin"/><span>{busy}</span></div>}

        {page==="Studio"&&<>
          <section className="hero-grid">
            <div className="hero-card"><div className="hero-copy"><span className="pill">FEATURED FORMAT · WHAT IF</span><h2>One question.<br/><em>A thousand possibilities.</em></h2><p>Build a Short with a strong opening, escalating visuals and a satisfying scientific payoff.</p><button className="primary-btn" onClick={()=>setPage("Discover")}><WandSparkles size={16}/> Start a new video</button></div><div className="earth-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="planet"><div className="planet-shade"/></div><span className="orbit-label label-one">WHAT IF?</span><span className="orbit-label label-two">REAL SCIENCE</span></div></div>
            <div className="metric-card"><div className="metric-top"><span>PROJECT PULSE</span><span className="pulse-dot"/></div><div className="metric-value">{scenes.length}<small> scenes</small></div><div className="metric-sub">Your current story structure</div><div className="mini-bars"><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/><i/></div><div className="metric-bottom"><span>EST. DURATION</span><b>{totalDuration}s</b></div></div>
          </section>
          <div className="section-heading"><div><h3>Your current project</h3><p>{project.title}</p></div><span className="muted-label">AUTO-SAVED IN THIS BROWSER</span></div>
          <div className="topic-grid">
            <button className="topic-card" onClick={()=>setPage("Storyboard")}><div className="topic-art art-0"><span>STORYBOARD</span><b>✦</b></div><div className="topic-body"><h4>Edit your scenes</h4><p>Update voiceover, visual direction and timing.</p><small>{scenes.length} scenes · {totalDuration}s</small></div></button>
            <button className="topic-card" onClick={()=>setPage("Media")}><div className="topic-art art-1"><span>MEDIA LIBRARY</span><b>◉</b></div><div className="topic-body"><h4>Find footage and sound</h4><p>Search Pixabay, Unsplash and Freesound.</p><small>Choose media for each scene</small></div></button>
            <button className="topic-card" onClick={()=>setPage("Export")}><div className="topic-art art-2"><span>EXPORT</span><b>↗</b></div><div className="topic-body"><h4>Render and download</h4><p>Create a video, thumbnail and metadata pack.</p><small>{voiceBlob?"Voice ready":"Voice not generated yet"}</small></div></button>
          </div>
        </>}

        {page==="Discover"&&<section className="panel">
          <div className="section-heading"><div><h3>Topic discovery & script generator</h3><p>Generate a story concept and storyboard in English or another selected language.</p></div><Sparkles size={22}/></div>
          <label className="field-label">VIDEO QUESTION OR TOPIC</label>
          <textarea className="text-area" rows={3} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="What if the Moon disappeared?"/>
          <div className="settings-grid">
            <div><label className="field-label">VISUAL STYLE</label><select className="text-field" value={style} onChange={e=>setStyle(e.target.value as Style)}>{styleOptions.map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="field-label">OUTPUT LANGUAGE</label><select className="text-field" value={language} onChange={e=>setLanguage(e.target.value)}>{["English","Vietnamese","Spanish","Hindi","Portuguese","Japanese","German","French"].map(s=><option key={s}>{s}</option>)}</select></div>
            <div><label className="field-label">TARGET DURATION</label><select className="text-field" value={targetDuration} onChange={e=>setTargetDuration(Number(e.target.value))}><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option><option value={90}>90 seconds</option></select></div>
          </div>
          <div className="notice"><b>Editorial rule:</b> AI-generated science scripts are drafts, not verified facts. Check numbers, scientific claims and sources before publishing.</div>
          <button className="primary-btn" disabled={!!busy} onClick={makeScript}><WandSparkles size={16}/> Generate script + storyboard</button>
          <div className="section-heading"><div><h3>Starter questions</h3><p>Click to load a topic into the generator.</p></div></div>
          <div className="topic-grid">{[
            "What if the Moon suddenly disappeared?",
            "Why do airplane windows have a tiny hole?",
            "Could humans survive on Mars without a spacesuit?",
            "What if gravity doubled overnight?",
            "What happens if you fall into Jupiter?",
            "Why can a huge steel ship float?"
          ].map((item,i)=><button className="topic-card" key={item} onClick={()=>setTopic(item)}><div className={"topic-art art-"+(i%3)}><span>IDEA "+String(i+1).padStart(2,"0")+"</span><b>{["☾","◉","✦"][i%3]}</b></div><div className="topic-body"><h4>{item}</h4><small>Click to use this question</small></div></button>)}</div>
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
            <div className="preview-frame"><div className="preview-sky"/>{currentScene?.videoUrl?<video className="scene-image" src={currentScene.videoUrl} poster={currentScene.imageUrl} autoPlay loop muted playsInline />:currentScene?.imageUrl?<img className="scene-image" src={currentScene.imageUrl} alt="Selected scene" />:<div className="preview-earth"/>}<div className="preview-horizon"/><div className="preview-caption">{currentScene?.overlayText||currentScene?.title}</div><span className="preview-tag">SCENE {selectedScene+1}</span><button className="play-float" onClick={()=>setPage("Export")}><Play size={19} fill="currentColor"/></button></div>
            <div className="scene-edit">
              <div className="detail-title"><b>Scene {selectedScene+1} details</b><span>{currentScene?.duration}s</span></div>
              <label className="field-label">SCENE TITLE</label><input className="text-field" value={currentScene?.title||""} onChange={e=>updateScene("title",e.target.value)}/>
              <label className="field-label">ON-SCREEN TEXT</label><input className="text-field" value={currentScene?.overlayText||""} onChange={e=>updateScene("overlayText",e.target.value)}/>
              <label className="field-label">VOICEOVER NARRATION</label><textarea className="text-area" rows={4} value={currentScene?.narration||""} onChange={e=>updateScene("narration",e.target.value)}/>
              <label className="field-label">VISUAL DIRECTION</label><textarea className="text-area" rows={3} value={currentScene?.visual||""} onChange={e=>updateScene("visual",e.target.value)}/>
              <label className="field-label">DURATION (SECONDS)</label><input className="text-field" type="number" min={1} max={60} value={currentScene?.duration||5} onChange={e=>updateScene("duration",Number(e.target.value))}/>
              {currentScene?.imageCredit&&<div className="credit-line">Media credit: {currentScene.imageCredit} · <a href={currentScene.imageSourceUrl} target="_blank" rel="noreferrer">source</a></div>}
              <button className="secondary-btn" onClick={()=>{setMediaQuery(currentScene?.visual||currentScene?.title||"science");setPage("Media");}}><ImageIcon size={15}/> Find media for this scene</button>
            </div>
          </div>
        </section>}

        {page==="Media"&&<section className="panel media-panel">
          <div className="section-heading"><div><h3>Media library</h3><p>Search visuals and sound effects. Always review source and license before publishing.</p></div><Layers3 size={22}/></div>
          <div className="media-toolbar">
            <input className="text-field" value={mediaQuery} onChange={e=>setMediaQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")searchMedia();}} placeholder="Search in English: Earth from space, spaceship, ocean…"/>
            <select className="text-field media-source" value={mediaSource} onChange={e=>setMediaSource(e.target.value as any)}><option>Pixabay</option><option>Unsplash</option><option>Freesound</option></select>
            <button className="primary-btn" disabled={!!busy} onClick={searchMedia}><Search size={15}/> Search</button>
          </div>
          <div className="notice">Current scene: <b>{selectedScene+1}. {currentScene?.title}</b>. Choose an image/video result to attach it to this scene. For Freesound, preview it and inspect its license individually.</div>
          {selectedSound&&<div className="sound-selected"><Music2 size={17}/><div><b>{selectedSound.title}</b><small>{selectedSound.credit} · {selectedSound.license}</small><audio className="sound-preview" controls preload="none" src={selectedSound.url}/></div><a href={selectedSound.pageUrl} target="_blank" rel="noreferrer">Open source <ExternalLink size={12}/></a></div>}
          <div className="media-grid">{mediaResults.map(asset=><div className="media-card" key={asset.id}>{asset.thumbnail?<img src={asset.thumbnail} alt={asset.title} loading="lazy"/>:<div className="media-audio-art"><AudioLines size={30}/></div>}<div className="media-card-body"><b>{asset.title}</b><small>{asset.source} · {asset.kind} · {asset.credit}</small><small className="license-text">{asset.license}</small><div className="media-card-actions"><button className="secondary-btn" onClick={()=>applyMedia(asset)}>{asset.kind==="audio"?"Select sound":"Add to scene"}</button>{asset.pageUrl&&<a href={asset.pageUrl} target="_blank" rel="noreferrer" aria-label="Open source"><ExternalLink size={15}/></a>}</div></div></div>)}</div>
          {!mediaResults.length&&<div className="empty-state"><ImageIcon size={30}/><b>No media search yet</b><span>Choose a provider, enter a search phrase and press Search.</span></div>}
        </section>}

        {page==="Voice"&&<section className="panel">
          <div className="section-heading"><div><h3>Voice studio</h3><p>Generate a narration track from your storyboard using Gemini TTS.</p></div><Mic2 size={22}/></div>
          <div className="settings-grid"><div><label className="field-label">VOICE PRESET</label><select className="text-field" value={voiceName} onChange={e=>setVoiceName(e.target.value)}>{["Kore","Puck","Charon","Fenrir","Aoede","Leda","Orus","Zephyr"].map(v=><option key={v}>{v}</option>)}</select></div><div><label className="field-label">SCRIPT LENGTH</label><div className="voice-length">{fullNarration.trim().split(/\s+/).filter(Boolean).length} words · {totalDuration}s estimated video</div></div></div>
          <label className="field-label">COMBINED NARRATION</label><textarea className="text-area" rows={8} value={fullNarration} readOnly/>
          <button className="primary-btn" disabled={!!busy} onClick={createVoice}><AudioLines size={16}/> Generate voiceover</button>
          {voiceUrl&&<div className="audio-preview"><div><b>Generated narration</b><small>Gemini TTS · WAV audio</small></div><audio controls src={voiceUrl}/><button className="secondary-btn" onClick={()=>voiceBlob&&saveBlob(voiceBlob,slugify(project.title)+"-voice.wav")}><Download size={14}/> Download WAV</button></div>}
          <div className="notice">TTS model access and charges depend on your Gemini project and quota. If a model is unavailable to your key, the API error will be shown here.</div>
        </section>}

        {page==="Export"&&<section className="panel">
          <div className="section-heading"><div><h3>Export center</h3><p>Render on this device, then download video, thumbnail and publishing metadata.</p></div><Download size={22}/></div>
          <div className="export-preview"><div className="export-screen"><div className="preview-earth"/><span>WHAT IF LAB</span><b>{project.title}</b></div><div className="export-settings">
            <label className="field-label">VIDEO FORMAT</label><div className="format-toggle"><button className={renderFormat==="short"?"format-selected":""} onClick={()=>setRenderFormat("short")}><Smartphone size={16}/> Shorts 9:16</button><button className={renderFormat==="long"?"format-selected":""} onClick={()=>setRenderFormat("long")}><Monitor size={16}/> Long 16:9</button></div>
            <label className="field-label">RENDER RESOLUTION</label><select className="text-field" value={outputResolution} onChange={e=>setOutputResolution(e.target.value as any)}><option value="720">720p — lower memory use</option><option value="1080">1080p — higher quality (more memory)</option></select>
            <div className="notice">Local render uses Canvas + MediaRecorder on this device. Browser codec support decides whether the downloaded file is MP4 or WebM. Keep this tab open until rendering finishes; longer videos use more memory and battery.</div>
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
    {showSettings&&<div className="modal-backdrop" onClick={()=>setShowSettings(false)}><div className="modal api-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">LOCAL API SETTINGS</span><h3>Connect your services</h3></div><button className="icon-btn" onClick={()=>setShowSettings(false)}><X size={18}/></button></div><p className="muted">Keys are stored in this browser's local storage for this personal prototype. They are not committed to GitHub, but browser-side keys can be inspected by someone with access to this device or browser profile. For a public multi-user app, move them to a server-side proxy before sharing.</p>
          {([{key:"gemini",label:"Gemini API key",hint:"Used for script generation and TTS"},{key:"pixabay",label:"Pixabay API key",hint:"Images and video search"},{key:"unsplash",label:"Unsplash Access Key",hint:"Photographic image search"},{key:"freesound",label:"Freesound API token",hint:"Sound effects search"}] as const).map(item=><div key={item.key}><label className="field-label">{item.label.toUpperCase()}</label><input className="text-field" type="password" autoComplete="off" value={keyDraft[item.key]} onChange={e=>setKeyDraft(old=>({...old,[item.key]:e.target.value}))} placeholder="Paste key here"/><div className="key-hint">{item.hint}</div></div>)}
          <div className="modal-actions"><span className="muted"><KeyRound size={13}/> Never commit keys to GitHub</span><button className="primary-btn" onClick={saveSettings}><Check size={15}/> Save API settings</button></div>
        </div></div>}
    <footer className="mobile-bottom">{nav.slice(0,4).map(item=>{const Icon=item.icon;return <button className={page===item.name?"selected":""} key={item.name} onClick={()=>setPage(item.name)}><Icon size={19}/><small>{item.name}</small></button>})}</footer>
  </div>;
}

export default App;
