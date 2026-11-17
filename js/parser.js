(function(g){
  const NUMW={ek:1,do:2,teen:3,tin:3,char:4,chaar:4,paanch:5,panch:5,chhe:6,che:6,saat:7,sat:7,aath:8,nau:9,das:10,dus:10,bis:20,bees:20,tees:30};
  const MULT={sawa:1.25,derh:1.5,dedh:1.5,dhai:2.5,aadha:0.5,adha:0.5,pauna:0.75,pav:0.25,pau:0.25,pao:0.25};
  const UNITS={
    g:["g","gram","grams","gm","gms"], kg:["kg","kilo","kilos","kgs"],
    l:["l","litre","liter","litr","ltr"], ml:["ml"],
    pc:["pc","piece","pieces","pcs","nag","nos"], pkt:["packet","pkt","pack"], box:["peti","box","carton"]
  };
  function unitOf(tok){ if(!tok) return null; for(const u in UNITS) if(UNITS[u].indexOf(tok)>-1) return u; return null; }
  function packStd(pack){
    const m=String(pack||"").match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pc)\b/i);
    if(!m) return {size:1,unit:"pc"};
    let n=parseFloat(m[1]); const u=m[2].toLowerCase();
    if(u==="kg") return {size:n*1000,unit:"g"};
    if(u==="l") return {size:n*1000,unit:"ml"};
    return {size:n,unit:u};
  }
  const RS="(?:rs\\.?|rupees?|rupaye)";

  function clean(t){
    return String(t).toLowerCase()
      .replace(/[₹]/g," rs ")
      .replace(/\bdhai\s+sau\s*(?:gram|gm|g)\b/g,"250 gram")
      .replace(/dedh\s+sau\s*(?:gram|gm|g)/g,"150 gram")
      .replace(/[-–—]/g," , ")
      .replace(/\s+/g," ").trim();
  }

  function extractQty(toks){
    toks=Array.isArray(toks)?toks:String(toks).split(" ");
    let qty=1,unit="pc",label="";
    for(let i=0;i<toks.length;i++){
      const tk=toks[i];
      if(/^\d+(\.\d+)?$/.test(tk)){
        const u=unitOf(toks[i+1]);
        qty=parseFloat(tk);
        if(u){ unit=u; label=tk+" "+toks[i+1]; i++; } else { unit="pc"; label=tk; }
        continue;
      }
      if(NUMW[tk]!=null && !/^(rs|rupee|rupaye)$/.test(toks[i-1]||"")){
        const u=unitOf(toks[i+1]);
        if(u){ qty=NUMW[tk]; unit=u; label=tk+" "+toks[i+1]; i++; continue; }
        if(qty===1&&unit==="pc"){ qty=NUMW[tk]; label=tk; }
        continue;
      }
      if(MULT[tk]!=null){
        const nxt=toks[i+1];
        let base=(nxt&&/^\d+$/.test(nxt))?Number(nxt):1;
        const u=unitOf(nxt)||unitOf(toks[i+2]);
        if(u==="kg"||u==="l"){
          qty=base*MULT[tk]*1000; unit=(u==="kg"?"g":"ml");
          label=tk+" "+(unitOf(nxt)?nxt:(toks[i+2]||""));
          i+=unitOf(nxt)?1:2; continue;
        }
        if(u===null&&(tk==="pau"||tk==="pav"||tk==="pao")){ qty=250; unit="g"; label=tk; continue; }
        if(u){ qty=base*MULT[tk]; unit=u; label=tk+" "+nxt; i++; continue; }
        qty=MULT[tk]*base; unit="pc"; label=tk; continue;
      }
    }
    if(unit==="kg"&&qty>=1000){}
    return {qty:+qty.toFixed(2),unit,label:label||unit};
  }

  function fmtQty(q,u){
    if(u==="g") return q>=1000? (+(q/1000).toFixed(3))+"kg" : Math.round(q)+"g";
    if(u==="ml") return q>=1000? (+(q/1000).toFixed(3))+"L" : Math.round(q)+"ml";
    if(u==="kg") return q+"kg";
    return q+" "+u;
  }

  function moneyScan(t){
    const out=[]; const re=new RegExp(RS+"\\s*(\\d+(?:\\.\\d+)?)","g"); let m;
    while((m=re.exec(t))){
      const amt=+m[1], idx=m.index, after=t.slice(m.index+m[0].length,m.index+m[0].length+16);
      const before=t.slice(Math.max(0,m.index-12),m.index);
      const dIdx=idx+m[0].length-m[1].length;
      let role="total";
      if(/^\s*(per|prati)\b/i.test(after)) role="rate";
      else if(/^\s*(cash|naqd|nakad)/i.test(after)) role="cash";
      else if(/^\s*(upi|online|gpay|phonepe|paytm)/i.test(after)) role="upi";
      else if(/^\s*(udhaar|udhar|udari)/i.test(after)) role="udhaar";
      else if(/\b(cash|naqd|nakad)\s*$/i.test(before)) role="cash";
      else if(/\b(upi|online|gpay|phonepe|paytm)\s*$/i.test(before)) role="upi";
      else if(/\b(udhaar|udhar|udari)\s*$/i.test(before)) role="udhaar";
      out.push({amt,idx,dIdx,role});
    }
    // Same money roles without the "rs"/"₹" prefix — "100 cash 50 udhaar".
    // Shopkeepers say this constantly; without it the numbers leak into item qty.
    const re2=/(\d+(?:\.\d+)?)\s*(cash|naqd|nakad|upi|online|gpay|phonepe|paytm|udhaar|udhar|udari)\b/gi;
    while((m=re2.exec(t))){
      const dIdx=m.index;
      if(out.some(x=>x.dIdx===dIdx)) continue;
      const w=m[2].toLowerCase();
      const role=/^(upi|online|gpay|phonepe|paytm)$/.test(w)?"upi"
        :/^(udhaar|udhar|udari)$/.test(w)?"udhaar":"cash";
      out.push({amt:+m[1],idx:dIdx,dIdx,role});
    }
    out.sort((a,b)=>a.idx-b.idx);
    return out;
  }

  function parseSale(t,catalog,customers){
    const res={intent:"sale",customer:null,items:[],total:null,cash:null,upi:null,udhaar:null,confidence:.92,unmatched:[]};
    let cm=t.match(/^([a-z]{3,15})\s+ko\b/);
    if(cm){
      const known=customers.find(c=>c.name.toLowerCase().startsWith(cm[1]));
      res.customer=known?known.name:cm[1][0].toUpperCase()+cm[1].slice(1);
    } else {
      const kn=customers.find(c=>t.indexOf(c.name.toLowerCase())>-1);
      if(kn) res.customer=kn.name;
    }

    const mon=moneyScan(t);
    const rates=mon.filter(x=>x.role==="rate");
    let zoneEnd=t.length;
    for(const x of mon){ if(x.role!=="rate"){ zoneEnd=x.idx; break; } }
    let zone=t.slice(0,zoneEnd);
    const koM=zone.match(/^\s*[a-z]+\s+ko\s+/);
    if(koM) zone=zone.slice(koM[0].length);

    const used=new Set();
    function harvest(str,offset){
      const hit=catalog.matchAt(str);
      if(!hit) return;
      used.add(hit.sku.id);
      const before=str.slice(0,hit.idx), after=str.slice(hit.idx+hit.alias.length);
      const bHit=catalog.matchAt(before);
      const localBefore=bHit? before.slice(bHit.idx+bHit.alias.length) : before;
      harvest(before,offset);

      const bClean=localBefore.replace(new RegExp(RS+"\\s*\\d+(?:\\.\\d+)?\\s*(?:per|prati)?\\s*\\w{0,6}","g")," ");
      const bToks=bClean.trim().split(" ").filter(Boolean).slice(-4);
      const aToks=after.trim().split(" ").filter(Boolean).slice(0,3);
      let qt=extractQty(bToks);
      if(!(qt.qty!==1||qt.unit!=="pc")){
        const q2=extractQty(aToks);
        if(q2.qty!==1||q2.unit!=="pc") qt=q2;
      }
      let unit=qt.unit, qty=qt.qty;
      if(unit==="g"&&qty>=1000){ qty=+(qty/1000).toFixed(2); unit="kg"; }
      if(unit==="ml"&&qty>=1000){ qty=+(qty/1000).toFixed(2); unit="l"; }
      const absIdx=offset+hit.idx;

      const rate=rates.find(r=>r.idx>absIdx&&r.idx-absIdx<60);
      let line=null;
      const ps=packStd(hit.sku.pack);
      if(rate){
        const ctxAfter=t.slice(rate.idx+String(rate.amt).length+4,rate.idx+30);
        const dim=/\b(per|prati)\s*(kilo|kg)\b/.test(ctxAfter)?"w":/\b(per|prati)?\s*(litre|ltr|l)\b/.test(ctxAfter)?"v":null;
        if((dim==="w")&&(unit==="kg")) line=Math.round(rate.amt*qty);
        else if((dim==="w")&&(unit==="g")) line=Math.round(rate.amt*(qty/1000));
        else if((dim==="v")&&(unit==="l")) line=Math.round(rate.amt*qty);
        else if((dim==="v")&&(unit==="ml")) line=Math.round(rate.amt*(qty/1000));
        else line=Math.round(rate.amt*qty);
      }
      if(line==null){
        if(unit==="g"&&ps.unit==="g") line=Math.round(hit.sku.mrp*(qty/ps.size));
        else if(unit==="ml"&&ps.unit==="ml") line=Math.round(hit.sku.mrp*(qty/ps.size));
        else line=Math.round(hit.sku.mrp*qty);
        if(line<=0) line=hit.sku.mrp;
      }
      res.items.push({skuId:hit.sku.id,name:hit.sku.name,pack:hit.sku.pack,mrp:hit.sku.mrp,
        qty,unit,unitLabel:qt.label,stdQty:fmtQty(qty,unit),price:+(line/qty).toFixed(2)});
      harvest(after,offset+hit.idx+hit.alias.length);
    }
    harvest(zone,0);

    const cashR=mon.find(x=>x.role==="cash"), upiR=mon.find(x=>x.role==="upi"), udhR=mon.find(x=>x.role==="udhaar"), totR=mon.find(x=>x.role==="total");
    if(cashR) res.cash=cashR.amt;
    if(upiR) res.upi=upiR.amt;
    if(udhR) res.udhaar=udhR.amt;
    if(res.items.length){
      const subtotal=res.items.reduce((s,it)=>s+Math.round(it.price*it.qty),0);
      const fullUdhaar=/\b(pura|poora|sara|full|sab)\s+(udhaar|udhar)\b/.test(t);
      if(totR) res.total=totR.amt;
      else if((res.cash||0)+(res.upi||0)+(res.udhaar||0)>0) res.total=(res.cash||0)+(res.upi||0)+(res.udhaar||0);
      else res.total=subtotal;
      if(fullUdhaar){ res.udhaar=res.total; res.cash=0; res.upi=0; }
      else {
        if(res.cash==null&&res.upi==null&&res.udhaar==null){ res.cash=res.total; }
        else {
          const paid=(res.cash||0)+(res.upi||0)+(res.udhaar||0);
          if(paid>0 && paid!==res.total){
            const rC=(res.cash||0)/paid, rU=(res.upi||0)/paid, rD=(res.udhaar||0)/paid;
            res.cash=Math.round(res.total*rC); res.upi=Math.round(res.total*rU); res.udhaar=Math.max(0,res.total-res.cash-res.upi);
          }
        }
      }
      if(res.total< (res.cash||0)+(res.upi||0)+(res.udhaar||0)) res.total=(res.cash||0)+(res.upi||0)+(res.udhaar||0);
    }
    if(res.cash<0)res.cash=0; if(res.upi<0)res.upi=0; if(res.udhaar<0)res.udhaar=0;
    res.when=parseWhen(t);
    return res;
  }

  function detectIntent(t){
    if(/\b(nahi|nahin|galat|wrong)\b/.test(t)) return "correction";
    if(/\bne\b.*\b(jama|diye|diya|de diya|paid)\b/.test(t)) return "collection";
    if(/\b(wapas|wapasi|return|lauta)\b/.test(t)) return "return";
    if(/\baaya\b/.test(t)&&/\b(diye|ko)\b/.test(t)) return "inward";
    if(/\b(bijli|light bill|chai wale|chai wala|rent|kiraya|petrol|delivery|majdoor|hamali|recharge|kharcha)\b/.test(t)) return "expense";
    if(/\bcredit\b/.test(t)) return "credit";
    if(/\b(kitna|kitni|kitne|hisaab|bikri|sales|baaki|balance|khatam)\b/.test(t)) return "query";
    return "sale";
  }
  function parseQuery(t){
    let c=t.match(/\b([a-z]{3,15})\s+ka\s+(?:kitna|kitni|baaki|balance)/);
    if(c&&!/\bbikri\b/.test(t)) return {type:"customer_balance",name:c[1]};
    if(/\baaj.*(bikri|sales|kamai)\b/.test(t)||/kitni\s+bikri/.test(t)) return {type:"today_sales"};
    if(/\baaj.*(udhaar|udhar)\b/.test(t)) return {type:"today_udhaar"};
    if(/\b(kam stock|low stock|kya khatam)\b/.test(t)) return {type:"low_stock"};
    if(/\b(kul|total|poora|sara)\s+(udhaar|udhar)\b/.test(t)) return {type:"total_udhaar"};
    return {type:"today_sales"};
  }
  function parseExpense(t){
    const amt=t.match(new RegExp(RS+"\\s*(\\d+)"))||t.match(/(\d+)\s*(?:rs|rupaye)/)||t.match(/(\d+)/);
    let label="Dukaan kharcha";
    const lm=t.match(/\b(bijli|light|chai wale|chai wala|chai|rent|kiraya|petrol|delivery|majdoor|hamali|internet|recharge)\w*/);
    if(lm) label=lm[0].charAt(0).toUpperCase()+lm[0].slice(1)+" expense";
    return {intent:"expense",label,amount:amt?+amt[1]:0,when:parseWhen(t)};
  }
  function parseWhen(t){
    if(/\bparso\b/.test(t)) return -2;
    if(/\bkal\b/.test(t)) return -1;
    if(/\baaj\b/.test(t)) return 0;
    return 0;
  }
  function parseCollection(t){
    const nm=t.match(/\b([a-z]{3,15})\s+ne\b/);
    const amt=t.match(new RegExp(RS+"?\\s*(\\d+)"))||t.match(/(\d+)\s*(?:rs|rupaye)/)||t.match(/(\d+)/);
    return {intent:"collection",name:nm?nm[1]:null,amount:amt?+amt[1]:0,when:parseWhen(t)};
  }
  function parseCredit(t){
    let nm=t.match(/^([a-z]{3,15})\s+ko\b/) || t.match(/\b([a-z]{3,15})\s+ko\b/);
    if(!nm){ const kn=["ramesh","sunita","geeta","vijay","amit"]; const found=kn.find(k=>t.includes(k)); if(found) nm=[null,found]; }
    const amt=t.match(new RegExp(RS+"\\s*(\\d+)"))||t.match(/(\d+)\s*(?:rs|rupaye)/)||t.match(/(\d+)/);
    const noteM=t.match(/\b(credit|udhaar)\s*(\w+)/);
    return {intent:"credit",name:nm?nm[1]:null,amount:amt?+amt[1]:0,note:"Credit added",when:parseWhen(t)};
  }
  function parseReturn(t,catalog){
    const nm=t.match(/\b([a-z]{3,15})\s+ne\b/);
    const sku=catalog.match(t.replace(/\b(wapas|kiya|kiye|ne)\b/g," "));
    const qt=extractQty(t.split(" ").filter(w=>!["wapas","kiya"].includes(w)));
    return {intent:"return",name:nm?nm[1]:null,skuId:sku?sku.id:null,name_:sku?sku.name:null,qty:qt.qty||1,unit:qt.unit};
  }
  function parseInward(t,catalog){
    const supM=t.match(/\b([a-z]{3,15})\s+(?:distributor|supplier)\b/);
    const amt=t.match(new RegExp(RS+"\\s*(\\d+)"));
    const sku=catalog.match(t);
    const qt=extractQty(t.split(" "));
    return {intent:"inward",supplier:supM?supM[1]:null,amount:amt?+amt[1]:0,
      skuId:sku?sku.id:null,itemName:sku?sku.name:null,qty:qt.qty||0,unit:qt.unit,when:parseWhen(t)};
  }
  function parseCorrection(t,bill,catalog){
    if(!bill||!bill.items.length) return null;
    let idx=-1;
    const target=catalog.matchAt(t);
    if(target) idx=bill.items.findIndex(it=>it.skuId===target.sku.id);
    if(idx<0) idx=bill.items.findIndex(it=>t.indexOf(String(it.name).toLowerCase().split(" ")[0])>-1);
    if(idx<0) return null;
    const nums=[...t.matchAll(/\b(\d+)\b/g)].map(m=>+m[1]).filter(n=>n>0&&n<50);
    const words=[...t.matchAll(/\b(ek|do|teen|tin|char|chaar|paanch|panch|chhe|che|saat|aath|nau|das|bis)\b/g)].map(m=>NUMW[m[1]]);
    const all=[...nums,...words];
    if(!all.length) return null;
    const fields={qty:all[all.length-1]};
    const rateM=t.match(/(\d+(?:\.\d+)?)\s*(?:rs|rupaye)?\s*(?:per|prati|rate)/);
    if(rateM){ fields.price=+rateM[1]; }
    return {intent:"correction",patch:{index:idx,fields,itemName:bill.items[idx].name}};
  }

  function parse(text,opts){
    opts=opts||{};
    const catalog=opts.catalog||g.BKC;
    const customers=opts.customers||[];
    const t=clean(text);
    if(!t) return {intent:"empty"};
    let intent=detectIntent(t);
    if(intent==="correction"&&opts.billOpen&&opts.bill){
      const c=parseCorrection(t,opts.bill,catalog);
      if(c) return c;
    }
    switch(intent){
      case "query": return parseQuery(t);
      case "expense": return parseExpense(t);
      case "collection": return parseCollection(t);
      case "credit": return parseCredit(t);
      case "return": return parseReturn(t,catalog);
      case "inward": return parseInward(t,catalog);
      default: return parseSale(t,catalog,customers);
    }
  }

  const DEMOS=[
    "Ramesh ko ek pau chai, 2 packet Maggi — ₹150 me se ₹100 cash ₹50 udhaar",
    "Sunita ko sawa kilo cheeni, aadha litre tel — pura udhaar",
    "Vijay ko derh kilo atta ₹60 per kilo, ek peti tel",
    "Ramesh ne ₹200 jama kiye",
    "Ramesh ka kitna udhaar baaki hai?",
    "Aaj kitni bikri hui?",
    "Bijli ka bill ₹800 diya",
    "Fortune distributor ko ₹5000 diye aur 5 peti tel aaya",
    "Geeta ne 1 packet doodh wapas kiya"
  ];

  // ---------- async parser (Gnani Evon / Gemini stand-in) ----------
  async function llmAvailable(){
    try{ const r=await fetch("/api/gnani/status",{signal:AbortSignal.timeout(1500)}); const j=await r.json(); return !!(j&&(j.gemini||j.evon)); }catch(e){ return false; }
  }
  async function callLLM(prompt,system){
    const r=await fetch("/api/gnani/llm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,system})});
    const j=await r.json();
    if(!j||!j.ok) throw new Error((j&&j.error)||"llm-failed");
    return j.text||"";
  }
  function catalogIndex(catalog){
    return (catalog.items||[]).map(i=>({id:i.id,name:i.name,pack:i.pack,mrp:i.mrp,aliases:i.aliases||[],cat:i.cat}));
  }
  async function parseAsync(text,opts){
    opts=opts||{};
    const catalog=opts.catalog||g.BKC;
    const customers=opts.customers||[];
    const t=clean(text);
    if(!t) return {intent:"empty"};
    // fallback if no LLM
    if(!(await llmAvailable())) return parse(text,opts);
    const items=catalogIndex(catalog);
    const custNames=customers.map(c=>c.name).join(", ");
    const itemNames=items.map(i=>i.name+" ("+i.pack+", ₹"+i.mrp+")").join("; ");
    const system="You are the NLU for BolKhata, a voice khata for Indian kirana stores. Extract structured JSON only. No prose.";
    const prompt=`Catalog items: ${itemNames}
Customers: ${custNames}
Utterance (Hinglish): "${text}"

Return a single JSON object. Possible intents and shapes:
Sale: {"intent":"sale","customer":string|null,"items":[{"name":string,"qty":number,"unit":"g"|"kg"|"ml"|"l"|"pc"|"pkt"|"box"}],"cash":number|null,"upi":number|null,"udhaar":number|null,"total":number|null}
Correction: {"intent":"correction","patch":{"index":number,"fields":{"qty":number},"itemName":string}}
Collection: {"intent":"collection","name":string,"amount":number}
Credit: {"intent":"credit","name":string,"amount":number,"note":string}
Query: {"intent":"query","type":"customer_balance"|"today_sales"|"today_udhaar"|"low_stock"|"total_udhaar","name":string|null}
Expense: {"intent":"expense","label":string,"amount":number}
Return: {"intent":"return","name":string|null,"name_":string|null,"qty":number}
Inward: {"intent":"inward","supplier":string|null,"amount":number,"itemName":string|null,"qty":number}

Rules: normalize colloquial units (pau/pav=250g, aadha=0.5, sawa=1.25, derh/dedh=1.5, dhai=2.5, peti=box). Split tender: "X cash Y udhaar". Full udhaar => udhaar=total,cash=0. Match catalog item names. For correction, index is 0-based line index.`;
    try{
      const raw=await callLLM(prompt,system);
      let obj=null;
      try{ obj=JSON.parse(raw); }catch(e){
        const m=raw.match(/\{[\s\S]*\}/); if(m) try{ obj=JSON.parse(m[0]); }catch(e2){}
      }
      if(!obj||!obj.intent) return parse(text,opts);
      // normalize sale items with catalog metadata
      if(obj.intent==="sale" && Array.isArray(obj.items)){
        const outItems=[];
        for(const it of obj.items){
          const nm=String(it.name||"").toLowerCase();
          const cat=items.find(c=>c.name.toLowerCase()===nm) || items.find(c=>nm.includes(c.name.toLowerCase())||c.name.toLowerCase().includes(nm)) || items.find(c=> (c.aliases||[]).some(a=>a.toLowerCase()===nm));
          const ps=cat? (function(p){const m=String(p||"").match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pc)/i);if(!m)return{size:1,unit:"pc"};let n=parseFloat(m[1]);const u=m[2].toLowerCase();if(u==="kg")return{size:n*1000,unit:"g"};if(u==="l")return{size:n*1000,unit:"ml"};return{size:n,unit:u};})(cat.pack) : {size:1,unit:"pc"};
          let qty=+it.qty||1, unit=it.unit||"pc";
          if(unit==="g"&&qty>=1000){qty=+(qty/1000).toFixed(2);unit="kg";}
          if(unit==="ml"&&qty>=1000){qty=+(qty/1000).toFixed(2);unit="l";}
          let price=it.price!=null?+it.price:null;
          if(price==null && cat){
            if(unit==="g"&&ps.unit==="g") price=Math.round(cat.mrp*(qty/ps.size));
            else if(unit==="ml"&&ps.unit==="ml") price=Math.round(cat.mrp*(qty/ps.size));
            else price=Math.round(cat.mrp*qty);
            if(!price||price<=0) price=cat.mrp;
          }
          outItems.push({
            skuId:cat?cat.id:null, name:cat?cat.name:(it.name), pack:cat?cat.pack:(it.unit||"pc"), mrp:cat?cat.mrp:(price||0),
            qty,unit,unitLabel:(it.qty+" "+(it.unit||"pc")), stdQty:(qty+" "+unit), price:price!=null?+(price/qty).toFixed(2):0,
            newSku:!cat
          });
        }
        obj.items=outItems;
        if(obj.cash==null && obj.upi==null && obj.udhaar==null){
          const subtotal=outItems.reduce((s,it)=>s+Math.round(it.price*it.qty),0);
          obj.total=obj.total||subtotal; obj.cash=obj.total; obj.upi=0; obj.udhaar=0;
        }
        if(obj.cash!=null||obj.upi!=null||obj.udhaar!=null){
          const subtotal=outItems.reduce((s,it)=>s+Math.round(it.price*it.qty),0);
          if(obj.total==null) obj.total=subtotal;
          const paid=(obj.cash||0)+(obj.upi||0)+(obj.udhaar||0);
          if(paid>0 && paid!==subtotal){
            const rC=(obj.cash||0)/paid, rU=(obj.upi||0)/paid, rD=(obj.udhaar||0)/paid;
            obj.cash=Math.round(subtotal*rC); obj.upi=Math.round(subtotal*rU); obj.udhaar=Math.max(0,subtotal-obj.cash-obj.upi);
          }
          if(obj.total< (obj.cash||0)+(obj.upi||0)+(obj.udhaar||0)) obj.total=(obj.cash||0)+(obj.upi||0)+(obj.udhaar||0);
        }
        // customer name casing
        if(obj.customer){ const kn=customers.find(c=>c.name.toLowerCase()===String(obj.customer).toLowerCase()); if(kn) obj.customer=kn.name; else obj.customer=String(obj.customer).charAt(0).toUpperCase()+String(obj.customer).slice(1); }
      }
      // correction patch: ensure itemName
      if(obj.intent==="correction" && obj.patch){
        if(!obj.patch.itemName && opts.bill && obj.patch.index>=0) obj.patch.itemName=opts.bill.items[obj.patch.index]?.name;
      }
      return obj;
    }catch(e){
      return parse(text,opts);
    }
  }

  g.BKParse={parse,parseAsync,DEMOS,_internals:{extractQty,moneyScan,parseSale}};
})(globalThis);
