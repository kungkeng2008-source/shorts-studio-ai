import type { Scene } from "./services";

export type RenderOptions = {
  title: string;
  scenes: Scene[];
  voiceBlob?: Blob | null;
  soundBlob?: Blob | null;
  soundVolume?: number;
  style: string;
  width?: number;
  height?: number;
  fps?: number;
  onProgress?: (progress: number) => void;
};

const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

async function loadImage(url?: string): Promise<HTMLImageElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

async function loadVideo(url?: string): Promise<HTMLVideoElement | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    const video = document.createElement("video");
    let settled = false;
    const finish = (value: HTMLVideoElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(value);
    };
    const timeout = window.setTimeout(() => finish(null), 12000);
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => finish(video);
    video.onerror = () => finish(null);
    video.src = url;
    video.load();
  });
}

function drawWrapped(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, size: number, color: string, maxLines = 3) {
  ctx.font = "700 " + size + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = size * .25;
  const lines = wrap(ctx, text, max).slice(0, maxLines);
  const h = size * 1.22;
  lines.forEach((line, i) => ctx.fillText(line, x, y + (i - (lines.length - 1) / 2) * h, max));
  ctx.shadowBlur = 0;
}

function drawScene(ctx: CanvasRenderingContext2D, w: number, h: number, scene: Scene, index: number, count: number, style: string, elapsed: number, progress: number, img: HTMLImageElement | null, video: HTMLVideoElement | null = null) {
  const gradient = ctx.createLinearGradient(0, 0, w * .8, h);
  gradient.addColorStop(0, style.includes("Blueprint") ? "#092342" : "#101a34");
  gradient.addColorStop(.5, style.includes("Cartoon") ? "#668daf" : "#29436f");
  gradient.addColorStop(1, "#080d18");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
  const media: CanvasImageSource | null = video && video.readyState >= 2 ? video : img;
  const mediaWidth = video && video.readyState >= 2 ? video.videoWidth : img?.width;
  const mediaHeight = video && video.readyState >= 2 ? video.videoHeight : img?.height;
  if (media && mediaWidth && mediaHeight) {
    const scale = Math.max(w / mediaWidth, h / mediaHeight);
    const dw = mediaWidth * scale, dh = mediaHeight * scale;
    ctx.save(); ctx.globalAlpha = .48;
    ctx.drawImage(media, (w - dw) / 2 + Math.sin(elapsed * .3) * 12, (h - dh) / 2, dw, dh);
    ctx.restore();
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(3,8,19,.12)"); shade.addColorStop(.55, "rgba(3,8,19,.22)"); shade.addColorStop(1, "rgba(3,8,19,.88)");
    ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
  }
  if (style.includes("Blueprint")) {
    ctx.strokeStyle = "rgba(145,195,255,.16)"; ctx.lineWidth = 1;
    for (let x=0; x<w; x+=w/12) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y=0; y<h; y+=h/18) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  } else if (style.includes("Hologram")) {
    ctx.strokeStyle = "rgba(114,230,255,.22)"; ctx.lineWidth = 2;
    for (let i=0;i<10;i++) { const y=h*.28+i*h*.055; ctx.beginPath(); ctx.moveTo(0,y+Math.sin(elapsed+i)*16); ctx.quadraticCurveTo(w*.5,y-60,w,y+10); ctx.stroke(); }
  } else if (style.includes("Isometric") || style.includes("Data Chart")) {
    ctx.strokeStyle = "rgba(180,205,255,.12)";
    for (let i=-10;i<12;i++) { ctx.beginPath(); ctx.moveTo(i*w/10,h*.55); ctx.lineTo(w/2+i*w/10,h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w/2+i*w/10,h*.55); ctx.lineTo(i*w/10,h); ctx.stroke(); }
  }
  if (!img) {
    const x=w/2, y=h*.4, r=w*.18;
    ctx.save();
    for (let i=0;i<3;i++) { ctx.beginPath(); ctx.ellipse(x,y,r*(1.4+i*.3),r*(.7+i*.18),-.4+i*.5,0,Math.PI*2); ctx.strokeStyle="rgba(174,195,255,"+(.35-i*.08)+")"; ctx.lineWidth=3; ctx.stroke(); }
    const orb=ctx.createRadialGradient(x-r*.4,y-r*.4,r*.1,x,y,r);
    orb.addColorStop(0,"#a8e6d4"); orb.addColorStop(.5,"#5a85c9"); orb.addColorStop(1,"#101b46");
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=orb; ctx.shadowColor="#7ccaff"; ctx.shadowBlur=50; ctx.fill();
    ctx.restore();
  }
  ctx.textAlign="left"; ctx.font="700 "+Math.round(w*.024)+"px Arial"; ctx.fillStyle="#c3d6ff";
  ctx.fillText("WHAT IF LAB  /  "+String(index+1).padStart(2,"0"),w*.07,h*.105);
  drawWrapped(ctx,(scene.overlayText||scene.title).toUpperCase(),w/2,h*.68,w*.83,Math.round(w*.065),"#fff",3);
  ctx.fillStyle="rgba(5,10,23,.78)";
  ctx.beginPath(); ctx.roundRect(w*.06,h*.78,w*.88,h*.15,18); ctx.fill();
  ctx.font="500 "+Math.round(w*.027)+"px Arial"; ctx.fillStyle="#f5f7ff"; ctx.textAlign="center"; ctx.textBaseline="middle";
  const captions=wrap(ctx,scene.narration,w*.78).slice(0,4);
  captions.forEach((line,i)=>ctx.fillText(line,w/2,h*.85+(i-(captions.length-1)/2)*w*.04,w*.78));
  ctx.fillStyle="rgba(255,255,255,.22)"; ctx.fillRect(w*.07,h*.955,w*.86,5);
  ctx.fillStyle="#9db6ff"; ctx.fillRect(w*.07,h*.955,w*.86*progress,5);
  ctx.font="600 "+Math.round(w*.02)+"px Arial"; ctx.textAlign="right"; ctx.fillStyle="#dce7ff";
  ctx.fillText("SCENE "+(index+1)+" / "+count,w*.93,h*.94);
}

export async function renderBrowserVideo(options: RenderOptions): Promise<Blob> {
  const scenes=options.scenes.filter(s=>s.narration.trim()||s.visual.trim());
  if (!scenes.length) throw new Error("Add at least one scene before rendering.");
  if (!("MediaRecorder" in window) || !HTMLCanvasElement.prototype.captureStream) throw new Error("This browser cannot record video. Use the latest Chrome, Edge or Safari.");
  const w=options.width||720, h=options.height||1280, fps=options.fps||24;
  const canvas=document.createElement("canvas"); canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext("2d",{alpha:false}); if(!ctx) throw new Error("Canvas is unavailable.");
  const images=await Promise.all(scenes.map(s=>loadImage(s.imageUrl)));
  const videos=await Promise.all(scenes.map(s=>loadVideo(s.videoUrl)));
  const stream=canvas.captureStream(fps);
  let audioContext:AudioContext|null=null;
  const audioSources:AudioBufferSourceNode[]=[];
  if(options.voiceBlob || options.soundBlob) {
    const Ctx=window.AudioContext||(window as any).webkitAudioContext;
    if(!Ctx) throw new Error("Audio mixing is not supported by this browser. Try the latest Chrome or Edge.");
    audioContext=new Ctx();
    await audioContext.resume();
    const destination=audioContext.createMediaStreamDestination();
    if(options.voiceBlob) {
      const voiceBuffer=await audioContext.decodeAudioData((await options.voiceBlob.arrayBuffer()).slice(0));
      const voiceSource=audioContext.createBufferSource();
      voiceSource.buffer=voiceBuffer;
      const voiceGain=audioContext.createGain();
      voiceGain.gain.value=1;
      voiceSource.connect(voiceGain).connect(destination);
      voiceGain.connect(audioContext.destination);
      audioSources.push(voiceSource);
    }
    if(options.soundBlob) {
      const soundBuffer=await audioContext.decodeAudioData((await options.soundBlob.arrayBuffer()).slice(0));
      const soundSource=audioContext.createBufferSource();
      soundSource.buffer=soundBuffer;
      const soundGain=audioContext.createGain();
      soundGain.gain.value=Math.max(0,Math.min(1,options.soundVolume ?? 0.2));
      soundSource.connect(soundGain).connect(destination);
      soundGain.connect(audioContext.destination);
      audioSources.push(soundSource);
    }
    destination.stream.getAudioTracks().forEach(track=>stream.addTrack(track));
  }
  const types=["video/mp4;codecs=avc1.42E01E,mp4a.40.2","video/mp4","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"];
  const mimeType=types.find(type=>MediaRecorder.isTypeSupported(type));
  if(!mimeType) throw new Error("No MP4 or WebM recorder format is supported by this browser.");
  const chunks:BlobPart[]=[];
  const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:w>=1080?6000000:3000000,audioBitsPerSecond:128000});
  const finished=new Promise<Blob>((resolve,reject)=>{
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>reject(new Error("Recording stopped unexpectedly. Try a shorter video."));
    recorder.onstop=()=>resolve(new Blob(chunks,{type:mimeType}));
  });
  const total=scenes.reduce((sum,s)=>sum+Math.max(1,s.duration),0);
  recorder.start(500); audioSources.forEach(source=>source.start(0));
  let elapsed=0;
  for(let i=0;i<scenes.length;i++){
    const scene=scenes[i], duration=Math.max(1,scene.duration), started=performance.now();
    const clip=videos[i];
    if (clip) { try { await clip.play(); } catch { /* use the still image fallback if autoplay is blocked */ } }
    while((performance.now()-started)/1000<duration){
      const t=(performance.now()-started)/1000;
      drawScene(ctx,w,h,scene,i,scenes.length,options.style,t,Math.min(1,(elapsed+t)/total),images[i],clip);
      options.onProgress?.(Math.round(Math.min(1,(elapsed+t)/total)*100));
      await frame();
    }
    clip?.pause();
    elapsed+=duration;
  }
  recorder.stop(); stream.getTracks().forEach(track=>track.stop()); audioSources.forEach(source=>{ try { source.stop(); } catch { /* already stopped */ } }); await audioContext?.close();
  options.onProgress?.(100);
  return finished;
}

export async function createThumbnail(title:string,style:string,imageUrl?:string,w=1280,h=720):Promise<Blob>{
  const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Thumbnail canvas is unavailable.");
  const img=await loadImage(imageUrl);
  const fakeScene:Scene={title,narration:"",visual:"",overlayText:title,duration:1};
  drawScene(ctx,w,h,fakeScene,0,1,style,0,0,img);
  ctx.fillStyle="#a9c1ff";ctx.font="700 26px Arial";ctx.textAlign="left";ctx.fillText("WHAT IF LAB  /  REAL SCIENCE",60,62);
  return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("Thumbnail export failed.")),"image/png"));
}
