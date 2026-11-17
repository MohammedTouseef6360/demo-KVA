(function(g){
  let stream=null, detector=null, scanning=false, rafId=null;

  function supported(){ return "BarcodeDetector" in g; }

  async function start(videoEl, onDetect, onError){
    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      onError && onError("camera-unavailable"); return false;
    }
    try{
      stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment", width:{ideal:1280}, height:{ideal:720}}});
      videoEl.srcObject = stream;
      await videoEl.play().catch(()=>{});
    }catch(e){ onError && onError("permission-denied"); return false; }
    if(supported()){
      try{
        const formats = await g.BarcodeDetector.getSupportedFormats();
        const want=["ean_13","ean_8","upc_a","upc_e","code_128"].filter(f=>formats.includes(f));
        detector = new g.BarcodeDetector({formats: want.length?want:["ean_13"]});
      }catch(e){ detector=null; }
    }
    scanning=true;
    const loop = async ()=>{
      if(!scanning) return;
      if(detector && videoEl.readyState>=2){
        try{
          const codes = await detector.detect(videoEl);
          if(codes && codes.length){
            const raw = codes[0].rawValue;
            stop();
            onDetect && onDetect(raw);
            return;
          }
        }catch(e){}
      }
      rafId=requestAnimationFrame(loop);
    };
    loop();
    return true;
  }

  function stop(){
    scanning=false;
    if(rafId) cancelAnimationFrame(rafId), rafId=null;
    try{ stream && stream.getTracks().forEach(t=>t.stop()); }catch(e){}
    try{ if(stream) stream=null; }catch(e){}
  }

  g.BKScan={supported,start,stop};
})(globalThis);
