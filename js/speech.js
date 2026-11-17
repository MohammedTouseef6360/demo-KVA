(function(g){
  "use strict";
  const SR = g.SpeechRecognition || g.webkitSpeechRecognition || null;
  let rec=null, active=false, gnaniAvailable=null;

  // probe gnani availability once
  async function probeGnani(){
    if(gnaniAvailable!==null) return gnaniAvailable;
    try{
      const r=await fetch("/api/gnani/status",{signal:AbortSignal.timeout(2000)});
      const j=await r.json();
      gnaniAvailable=!!(j&&j.gnani);
    }catch(e){ gnaniAvailable=false; }
    return gnaniAvailable;
  }

  function asrSupported(){ return !!(g.MediaRecorder||g.AudioContext||SR); }

  // ---------- WAV recorder (16-bit PCM) ----------
  let audioCtx=null, mediaStream=null, processor=null, sourceNode=null, samples=[];
  async function startRecording(){
    samples=[];
    mediaStream=await navigator.mediaDevices.getUserMedia({audio:true});
    audioCtx=new (g.AudioContext||g.webkitAudioContext)({sampleRate:16000});
    sourceNode=audioCtx.createMediaStreamSource(mediaStream);
    processor=audioCtx.createScriptProcessor(4096,1,1);
    processor.onaudioprocess=(e)=>{
      const d=e.inputBuffer.getChannelData(0);
      for(let i=0;i<d.length;i++) samples.push(d[i]);
    };
    sourceNode.connect(processor);
    processor.connect(audioCtx.destination);
  }
  function stopRecording(){
    try{processor&&processor.disconnect();}catch(e){}
    try{sourceNode&&sourceNode.disconnect();}catch(e){}
    try{mediaStream&&mediaStream.getTracks().forEach(t=>t.stop());}catch(e){}
    try{audioCtx&&audioCtx.close();}catch(e){}
    processor=null;sourceNode=null;mediaStream=null;audioCtx=null;
    const pcm=encodeWav(samples,16000);
    samples=[];
    return pcm;
  }
  function encodeWav(samples,sr){
    const num=samples.length;
    const buf=new ArrayBuffer(44+num*2);
    const v=new DataView(buf);
    function ws(o,s){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));}
    ws(0,"RIFF");v.setUint32(4,36+num*2,true);ws(8,"WAVE");ws(12,"fmt ");v.setUint32(16,16,true);
    v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);
    v.setUint16(32,2,true);v.setUint16(34,16,true);ws(36,"data");v.setUint32(40,num*2,true);
    let off=44;
    for(let i=0;i<num;i++){
      let s=Math.max(-1,Math.min(1,samples[i]));
      v.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);off+=2;
    }
    return new Blob([buf],{type:"audio/wav"});
  }
  function blobToBase64(blob){
    return new Promise((res,rej)=>{
      const r=new FileReader();
      r.onload=()=>res(r.result.split(",")[1]);
      r.onerror=rej;
      r.readAsDataURL(blob);
    });
  }

  // ---------- listen ----------
  let listening=false;
  function startBrowserSR(onPartial,onFinal,onError,onStart,onEnd){
    if(!SR){ onError&&onError("unsupported"); onEnd&&onEnd(); return false; }
    try{ if(rec) rec.abort(); }catch(e){}
    rec=new SR();
    rec.lang="hi-IN"; rec.interimResults=true; rec.maxAlternatives=1; rec.continuous=false;
    active=true; listening=true;
    rec.onstart=()=>onStart&&onStart();
    rec.onresult=(e)=>{
      let interim="", final="";
      for(let i=e.resultIndex;i<e.results.length;i++){
        const r=e.results[i];
        if(r.isFinal) final+=r[0].transcript; else interim+=r[0].transcript;
      }
      if(interim) onPartial&&onPartial(interim);
      if(final) onFinal&&onFinal(final.trim());
    };
    rec.onerror=(e)=>{ active=false;listening=false; onError&&onError(e.error||"error"); };
    rec.onend=()=>{ active=false;listening=false; onEnd&&onEnd(); };
    try{ rec.start(); return true; }catch(e){ active=false;listening=false; onError&&onError("start-failed"); onEnd&&onEnd(); return false; }
  }
  function listen({onPartial,onFinal,onError,onStart,onEnd}){
    if(listening){ stopListen(); return false; }
    probeGnani().then(async (useGnani)=>{
      const canGnani = useGnani && navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
      if(canGnani){
        listening=true;
        let ok=false;
        try{ await startRecording(); ok=true; }catch(e){ ok=false; }
        if(!ok){ listening=false; // fall back to browser SR
          startBrowserSR(onPartial,onFinal,onError,onStart,onEnd); return;
        }
        onStart&&onStart(); onPartial&&onPartial("Recording… bolo");
        rec={cancel:()=>{ try{stopRecording();}catch(e){} listening=false; active=false; },
          stop:async()=>{
          listening=false;
          onPartial&&onPartial("Transcribing…");
          try{
            const blob=stopRecording();
            const b64=await blobToBase64(blob);
            const r=await fetch("/api/gnani/stt",{method:"POST",headers:{"Content-Type":"application/json"},
              body:JSON.stringify({audioBase64:b64,mimeType:"audio/wav",language:"hi-IN",model:"prisma-v3.0",format:"transcribe"})});
            const j=await r.json();
            if(j&&j.ok && j.transcript){ onFinal&&onFinal(String(j.transcript).trim()); }
            else { onError&&onError("no-transcript"); }
          }catch(e){ onError&&onError("stt-failed"); }
          onEnd&&onEnd();
        }};
        return;
      }
      // fallback: browser Web Speech
      startBrowserSR(onPartial,onFinal,onError,onStart,onEnd);
    });
    return true;
  }

  // stopListen must handle both modes
  function stopListen(){
    if(rec && typeof rec.stop==="function" && rec.stop.constructor && rec.stop.constructor.name==="AsyncFunction"){
      rec.stop(); rec=null; return;
    }
    try{ rec && rec.abort && rec.abort(); }catch(e){}
    try{ rec && rec.stop && rec.stop(); }catch(e){}
    active=false; listening=false;
  }

  // ---------- speak ----------
  async function speak(text){
    let voice="Shivani", lang="hi-IN";
    try{
      const db=g.BKStore.get();
      if(!db||!db.settings||!db.settings.sound) return;
      voice=db.settings.voice||voice; lang=db.settings.lang||lang;
    }catch(e){}
    const useGnani=await probeGnani();
    if(useGnani){
      try{
        const r=await fetch("/api/gnani/tts",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({text,voice,model:"timbre-v3.0",language:lang,speed:0.9,
            audio_config:{sample_rate:24000,num_channels:1,sample_width:2,encoding:"linear_pcm",container:"wav"}})});
        if(!r.ok) throw 0;
        const ab=await r.arrayBuffer();
        const blob=new Blob([ab],{type:"audio/wav"});
        const url=URL.createObjectURL(blob);
        const audio=new Audio(url);
        audio.onended=()=>URL.revokeObjectURL(url);
        await audio.play();
        return;
      }catch(e){ /* fall through */ }
    }
    // fallback: browser TTS
    try{
      const S=g.speechSynthesis; if(!S) return;
      S.cancel();
      const u=new SpeechSynthesisUtterance(text);
      u.lang=lang; u.rate=0.9; u.pitch=1; u.volume=1;
      S.speak(u);
    }catch(e){}
  }

  let beepCtx=null;
  function beep(freq,dur){
    try{
      const AC=g.AudioContext||g.webkitAudioContext; if(!AC) return;
      if(!beepCtx) beepCtx=new AC();
      const ctx=beepCtx;
      const o=ctx.createOscillator(), gn=ctx.createGain();
      o.connect(gn); gn.connect(ctx.destination);
      o.frequency.value=freq||880; o.type="sine";
      gn.gain.setValueAtTime(0.12,ctx.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+(dur||0.15));
      o.start(); o.stop(ctx.currentTime+(dur||0.15));
    }catch(e){}
  }
  function vibrate(p){ try{ navigator.vibrate && navigator.vibrate(p||20); }catch(e){} }
  function cancelListen(){
    if(rec && rec.cancel){ rec.cancel(); rec=null; active=false; listening=false; return; }
    try{ rec && rec.abort && rec.abort(); }catch(e){}
    try{ stopRecording(); }catch(e){}
    active=false; listening=false;
  }
  function isListening(){ return listening; }

  g.BKVoice={asrSupported,listen,stopListen,cancelListen,speak,beep,vibrate,isListening};
})(globalThis===undefined?window:globalThis);