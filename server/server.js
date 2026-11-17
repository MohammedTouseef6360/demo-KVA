(function(g){
  const http=require("http"), fs=require("fs"), path=require("path");
  const PORT=process.env.PORT||3000;
  const ROOT=path.join(__dirname,"..");
  const DATA_DIR=path.join(ROOT,"data");
  const DB=path.join(DATA_DIR,"db.json"), BAK=path.join(DATA_DIR,"db.backup.json");

  // --- load .env (zero-dep) ---
  try{
    const envPath=path.join(ROOT,".env");
    if(fs.existsSync(envPath)){
      for(const line of fs.readFileSync(envPath,"utf8").split(/\r?\n/)){
        const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if(m && process.env[m[1]]===undefined) process.env[m[1]]=m[2].replace(/^["']|["']$/g,"");
      }
    }
  }catch(e){}

  const GNANI_KEY=process.env.GNANI_API_KEY||process.env.GNANI_KEY||"";
  const GNANI_BASE=process.env.GNANI_BASE||"https://api.vachana.ai";
  const GEMINI_KEY=process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||"";
  const GEMINI_MODEL=process.env.GEMINI_MODEL||"gemini-2.0-flash";
  const EVON_BASE=process.env.EVON_BASE_URL||"";
  const EVON_KEY=process.env.EVON_API_KEY||"";
  const EVON_MODEL=process.env.EVON_MODEL||"evon-v3.3";
  const MIME={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",
    ".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};

  process.on("uncaughtException",e=>log("UNCAUGHT "+(e&&e.message)));
  process.on("unhandledRejection",e=>log("REJECTION "+(e&&e.message)));

  function log(m){ try{ console.log("["+new Date().toLocaleTimeString()+"] "+m); }catch(e){} }

  function safeRead(file){
    try{
      if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,"utf8"));
    }catch(e){}
    return null;
  }
  function loadDb(){
    let d=safeRead(DB);
    if(!d){ d=safeRead(BAK); if(d) log("Recovered from backup"); }
    if(!d) d={shop:null,customers:[],inventory:[],suppliers:[],txns:[],expenses:[],updatedAt:Date.now()};
    for(const k of ["customers","inventory","suppliers","txns","expenses"]) if(!Array.isArray(d[k])) d[k]=[];
    return d;
  }
  function persist(d){
    try{
      if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
      if(fs.existsSync(DB)){ try{ fs.copyFileSync(DB,BAK); }catch(e){} }
      const tmp=DB+".tmp";
      fs.writeFileSync(tmp,JSON.stringify(d,null,1));
      fs.renameSync(tmp,DB);
      return true;
    }catch(e){ log("PERSIST-FAIL (memory kept): "+e.message); return false; }
  }

  function json(res,code,obj){
    const body=JSON.stringify(obj);
    res.writeHead(code,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});
    res.end(body);
  }
  // On Vercel the Node runtime may pre-parse the body (req.body) and consume the
  // stream, so waiting for "end" would hang. Handle every shape we can meet.
  function parseJsonish(v){
    if(v===undefined || v===null) return null;
    if(Buffer.isBuffer(v)) v=v.toString("utf8");
    if(typeof v==="string"){ try{ return JSON.parse(v||"{}"); }catch(e){ return {__badjson:true}; } }
    if(typeof v==="object") return v;
    return {__badjson:true};
  }
  function readBody(req){
    if(req.body!==undefined && req.body!==null) return Promise.resolve(parseJsonish(req.body));
    if(req.readableEnded) return Promise.resolve({});
    return new Promise(resolve=>{
      let data="", size=0, done=false, timer=null;
      const finish=v=>{ if(!done){ done=true; if(timer) clearTimeout(timer); resolve(v); } };
      req.on("data",c=>{ size+=c.length; if(size>2_000_000){ finish(null); try{req.destroy()}catch(e){} } else data+=c; });
      req.on("end",()=>{ if(data.length>2_000_000) return finish(null); finish(parseJsonish(data||"{}")); });
      req.on("error",()=>finish(null));
      req.on("close",()=>finish(parseJsonish(data)));
      timer=setTimeout(()=>finish(data? parseJsonish(data):{}), 15000);
      if(timer.unref) timer.unref();
    });
  }

  function mergeArr(dst,src,key){
    const map=new Map(dst.map(x=>[x[key]||x.name,x]));
    for(const s of src){ const k=s[key]||s.name; map.set(k,Object.assign(map.get(k)||{},s)); }
    return [...map.values()];
  }

  async function handleRequest(req,res){
    try{
      const url=new URL(req.url,"http://x");
      const p=url.pathname;
      if(req.method==="OPTIONS"){ res.writeHead(204,{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,DELETE","Access-Control-Allow-Headers":"Content-Type"}); return res.end(); }

      if(p==="/api/health") return json(res,200,{ok:true,time:Date.now(),uptime:process.uptime()|0});

      if(p==="/api/state"){
        const d=loadDb();
        return json(res,200,{ok:true,state:{shop:d.shop,customers:d.customers,suppliers:d.suppliers,inventory:d.inventory},updatedAt:d.updatedAt});
      }

      if(p==="/api/sync" && req.method==="POST"){
        const body=await readBody(req);
        if(!body || body.__badjson) return json(res,400,{ok:false,error:"invalid-json"});
        const d=loadDb();
        try{
          if(body.customers) d.customers=mergeArr(d.customers,body.customers,"id");
          if(body.suppliers) d.suppliers=mergeArr(d.suppliers,body.suppliers,"id");
          if(body.inventory) d.inventory=mergeArr(d.inventory,body.inventory,"id");
          if(Array.isArray(body.txns)){
            const have=new Set(d.txns.map(t=>t.id));
            for(const t of body.txns) if(t && t.id && !have.has(t.id)) d.txns.push(t);
            d.txns.sort((a,b)=>b.at-a.at); d.txns=d.txns.slice(0,5000);
          }
          if(Array.isArray(body.expenses)){
            const have=new Set(d.expenses.map(t=>t.id));
            for(const e of body.expenses) if(e && e.id && !have.has(e.id)) d.expenses.push(e);
            d.expenses.sort((a,b)=>b.at-a.at); d.expenses=d.expenses.slice(0,2000);
          }
          d.updatedAt=Date.now();
        }catch(e){ return json(res,200,{ok:false,error:"merge-skipped"}); }
        const persisted=persist(d);
        return json(res,200,{ok:true,persisted,serverTxns:d.txns.length});
      }

      if(p==="/api/report/z"){
        const day=url.searchParams.get("day")||new Date().toISOString().slice(0,10);
        const d=loadDb();
        const txns=d.txns.filter(t=>t.day===day), sales=txns.filter(t=>t.type==="sale"), cols=txns.filter(t=>t.type==="collect");
        const gross=sales.reduce((s,t)=>s+(t.total||0),0);
        const cash=sales.reduce((s,t)=>s+(t.cash||0),0);
        const upi=sales.reduce((s,t)=>s+(t.upi||0),0);
        const newUd=sales.reduce((s,t)=>s+(t.udhaar||0),0);
        const exp=(d.expenses||[]).filter(e=>e.day===day).reduce((s,e)=>s+(e.amount||0),0);
        return json(res,200,{ok:true,z:{date:day,gross,cash,upi,newUdhaar:newUd,collected:cols.reduce((s,t)=>s+(t.total||0),0),expenses:exp,net:gross-exp,bills:sales.length}});

      }

      // ---- Gnani Voice AI proxy (BolBharat) ----
      if(p==="/api/gnani/status"){
        return json(res,200,{ok:true,gnani:!!GNANI_KEY,gemini:!!GEMINI_KEY,evon:!!(EVON_BASE&&EVON_KEY),base:GNANI_BASE});
      }

      if(p==="/api/gnani/stt" && req.method==="POST"){
        const body=await readBody(req);
        if(!body||body.__badjson) return json(res,400,{ok:false,error:"invalid-json"});
        if(!GNANI_KEY) return json(res,503,{ok:false,error:"no-gnani-key"});
        try{
          const buf=Buffer.from(body.audioBase64||"","base64");
          const form=new FormData();
          const blob=new Blob([buf],{type:body.mimeType||"audio/wav"});
          form.append("audio_file",blob,"clip.wav");
          form.append("language_code",body.language||"hi-IN");
          if(body.model) form.append("model",body.model);
          if(body.format) form.append("format",body.format);
          const r=await fetch(GNANI_BASE+"/stt/v3",{method:"POST",headers:{"X-API-Key-ID":GNANI_KEY},body:form});
          const txt=await r.text();
          let j; try{ j=JSON.parse(txt);}catch(e){ j={raw:txt}; }
          return json(res,r.ok?200:502,{ok:r.ok,gnani:r.ok,transcript:(j&& (j.transcript||j.text||j.result))||"",raw:j});
        }catch(e){ return json(res,502,{ok:false,error:"stt-failed",message:e.message}); }
      }

      if(p==="/api/gnani/tts" && req.method==="POST"){
        const body=await readBody(req);
        if(!body||body.__badjson) return json(res,400,{ok:false,error:"invalid-json"});
        if(!GNANI_KEY) return json(res,503,{ok:false,error:"no-gnani-key"});
        try{
          const r=await fetch(GNANI_BASE+"/api/v1/tts/inference",{method:"POST",
            headers:{"Content-Type":"application/json","X-API-Key-ID":GNANI_KEY},
            body:JSON.stringify({
              text:body.text||"", voice:body.voice||"Shivani", model:body.model||"timbre-v3.0",
              language:body.language||"hi-IN", speed:body.speed||1.0,
              audio_config:body.audio_config||{sample_rate:22050,num_channels:1,sample_width:2,encoding:"linear_pcm",container:"wav"}
            })});
          if(!r.ok){ const t=await r.text(); return json(res,502,{ok:false,error:"tts-failed",message:t}); }
          const ab=await r.arrayBuffer();
          const ct=r.headers.get("content-type")||"audio/wav";
          res.writeHead(200,{"Content-Type":ct,"Cache-Control":"no-store","Access-Control-Allow-Origin":"*"});
          return res.end(Buffer.from(ab));
        }catch(e){ return json(res,502,{ok:false,error:"tts-failed",message:e.message}); }
      }

      if(p==="/api/gnani/llm" && req.method==="POST"){
        const body=await readBody(req);
        if(!body||body.__badjson) return json(res,400,{ok:false,error:"invalid-json"});
        const prompt=body.prompt||"";
        const system=body.system||"";
        try{
          if(EVON_BASE && EVON_KEY){
            const r=await fetch(EVON_BASE.replace(/\/$/,"")+"/chat/completions",{
              method:"POST", headers:{"Content-Type":"application/json","Authorization":"Bearer "+EVON_KEY},
              body:JSON.stringify({model:EVON_MODEL,messages:[{role:"system",content:system},{role:"user",content:prompt}],temperature:0.2})});
            const j=await r.json();
            const text=(j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||"";
            return json(res,r.ok?200:502,{ok:r.ok,text});
          }
          if(!GEMINI_KEY) return json(res,503,{ok:false,error:"no-llm-key"});
          const url="https://generativelanguage.googleapis.com/v1beta/models/"+GEMINI_MODEL+":generateContent?key="+encodeURIComponent(GEMINI_KEY);
          const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({contents:[{role:"user",parts:[{text:system+"\n\n"+prompt}]}],generationConfig:{temperature:0.2,responseMimeType:"application/json"}})});
          const j=await r.json();
          const text=(j&&j.candidates&&j.candidates[0]&&j.candidates[0].content&&j.candidates[0].content.parts&&j.candidates[0].content.parts[0]&&j.candidates[0].content.parts[0].text)||"";
          return json(res,r.ok?200:502,{ok:r.ok,text,model:GEMINI_MODEL});
        }catch(e){ return json(res,502,{ok:false,error:"llm-failed",message:e.message}); }
      }

      if(p.startsWith("/api/") ){
        return json(res,404,{ok:false,error:"unknown-endpoint"});
      }

      let fp = p==="/" ? "/index.html" : p;
      fp = path.normalize(fp).replace(/^(\.\.[\/\\])+/,"");
      const full=path.join(ROOT,fp);
      if(!full.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
      fs.readFile(full,(err,buf)=>{
        if(err){ res.writeHead(404,{"Content-Type":"text/plain"}); return res.end("Not found"); }
        res.writeHead(200,{"Content-Type":MIME[path.extname(full).toLowerCase()]||"application/octet-stream","Cache-Control":full.includes("sw.js")?"no-cache":"max-age=300"});
        res.end(buf);
      });
    }catch(e){
      log("REQ-ERR "+e.message);
      try{ json(res,500,{ok:false,error:"internal",message:e.message}); }catch(e2){}
    }
  }

  // Vercel serverless: export the handler. Local dev: listen.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = handleRequest;
    module.exports.default = handleRequest;
  }
  if (require.main === module) {
    const srv = http.createServer(handleRequest);
    srv.on("error",e=>{
      if(e.code==="EADDRINUSE"){ log("Port busy - trying +1"); srv.listen(PORT+1); }
      else log("SRV-ERR "+e.message);
    });
    srv.listen(PORT,()=>log(`BolKhata backend UP http://localhost:${srv.address().port}  (crash-guarded)`));
  }
})(globalThis===undefined? global : globalThis);
