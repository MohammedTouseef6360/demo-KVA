(function(g){
"use strict";
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const Store=g.BKStore, P=g.BKParse, Voice=g.BKVoice, Rep=g.BKReports, Scan=g.BKScan;
const db=Store.load();
let bill=null, scanPick=null, pinBuf="", pinDone=null, syncTimer=null, repRange=1, catFilter="All", histQ="";

function inr(n){return Rep.inr(n)}
function esc(s){const d=document.createElement("div");d.textContent=String(s??"");return d.innerHTML}
function toast(msg,kind){
  const t=document.createElement("div");
  t.className="toast "+(kind||"ok");
  t.innerHTML=`<span class="tico">${kind==="err"?"!":kind==="warn"?"⚠":"✓"}</span><span></span>`;
  t.lastChild.textContent=msg;
  $("#toastWrap").appendChild(t);
  setTimeout(()=>{t.style.opacity="0";t.style.transition="opacity .3s";setTimeout(()=>t.remove(),320)},2600);
}
function setSync(on,label){ const d=$("#syncDot"); d.classList.toggle("on",!!on); $("#syncLabel").textContent=label||"Offline OK"; }

/* ---------- navigation ---------- */
function switchTab(tab){
  $$(".nvi[data-tab]").forEach(b=>b.classList.toggle("on",b.dataset.tab===tab));
  $$(".view").forEach(v=>v.classList.toggle("on",v.id==="view-"+tab));
  window.scrollTo({top:0});
  if(tab==="udhaar") renderKhata();
  if(tab==="stock") renderInv();
  if(tab==="history") renderHistory();
}
$$(".nvi[data-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
document.addEventListener("click",e=>{
  const go=e.target.closest("[data-goto]"); if(go) switchTab(go.dataset.goto);
  const os=e.target.closest("[data-open-sheet]"); if(os) openSheet(os.dataset.openSheet);
});

/* ---------- sync ---------- */
async function syncNow(){
  if(!db.settings.autoSync){ setSync(false,"Sync off"); return; }
  try{
    const r=await fetch("/api/sync",{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({customers:db.customers,suppliers:db.suppliers,inventory:db.inventory,txns:db.txns.slice(0,200),expenses:db.expenses.slice(0,100)}),signal:AbortSignal.timeout(4000)});
    const j=await r.json();
    if(j&&j.ok){setSync(true,j.persisted?"Cloud synced ✓":"Memory only");return;}
    throw 0;
  }catch(e){ setSync(false,"Offline OK"); }
}
function scheduleSync(){ clearTimeout(syncTimer); syncTimer=setTimeout(syncNow,1500); }

/* ---------- stats / reminders ---------- */
function pmChip(t){
  if(t.type==="collect") return '<span class="chip-pm collect">Vasooli</span>';
  if(t.type==="return") return '<span class="chip-pm return">Return</span>';
  if(t.type==="credit") return '<span class="chip-pm udhaar">Credit</span>';
  if(t.type==="expense"||(t.total<0)) return '<span class="chip-pm expense">Expense</span>';
  const hasUpi=t.upi>0, hasCash=t.cash>0, hasUdh=t.udhaar>0;
  if((hasCash||hasUpi)&&hasUdh) return `<span class="chip-pm split">Split ₹${inr(t.cash||0)}+₹${inr(t.upi||0)}+₹${inr(t.udhaar)}</span>`;
  if(hasUpi&&hasCash&&!hasUdh) return `<span class="chip-pm split">Cash+UPI ₹${inr((t.cash||0)+(t.upi||0))}</span>`;
  if(t.upi>0&&!t.cash&&!t.udhaar) return '<span class="chip-pm" style="background:var(--secondary);color:#fff">UPI</span>';
  if(t.udhaar>0) return '<span class="chip-pm udhaar">Udhaar</span>';
  return '<span class="chip-pm">Cash</span>';
}
function tavFor(t){
  if(t.type==="collect") return '<span class="tav upi"><span class="ms">savings</span></span>';
  if(t.type==="return") return '<span class="tav"><span class="ms">assignment_return</span></span>';
  if(t.type==="credit") return '<span class="tav udhaar"><span class="ms">account_balance_wallet</span></span>';
  if(t.udhaar>0&&!(t.cash>0)) return '<span class="tav udhaar"><span class="ms">account_balance_wallet</span></span>';
  if(t.cash>0&&t.udhaar>0) return '<span class="tav cash"><span class="ms">payments</span></span>';
  return '<span class="tav cash"><span class="ms">payments</span></span>';
}
function txnCard(t){
  const items=(t.items||[]).map(i=>`${i.qty} ${i.unit} ${i.name}`).join(" + ");
  const time=new Date(t.at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
  const amt=t.total<0? `<b class="neg tn">−₹${inr(-t.total)}</b>` : `<b class="tn">+₹${inr(t.total)}</b>`;
  const pend=t.udhaar>0&&t.type==="sale"? '<div class="tpend">Pending</div>':"";
  return `<li class="txn-card ${t.udhaar>0?'uh':''}">${tavFor(t)}
    <div class="tmid"><div class="tname">${esc(t.customerName)} <span style="color:var(--ink2);font-weight:400">· ${esc(items)}</span></div>
    <div class="tmeta"><span>${time}</span><span class="tdot"></span>${pmChip(t)}</div></div>
    <div class="tamt">${amt}${pend}</div></li>`;
}
function renderStats(){
  const d=Store.dashboard();
  $("#stSales").textContent=inr(d.sales);
  $("#stBills").textContent=d.bills+" bills";
  $("#stNet").textContent=inr(d.net);
  $("#stUdhaar").textContent=inr(d.udhaarTotal);
  $("#stUdhaarN").textContent=db.customers.filter(c=>c.due>0).length+" customers";
  $("#stLow").textContent=d.lowCount;
  const over=Store.overdueCustomers(), badge=$("#navBadge");
  badge.hidden=!over.length; badge.textContent=over.length;
  const rs=$("#remindStrip");
  if(over.length){
    rs.hidden=false;
    $("#remindName").textContent=over[0].name;
    $("#remindInfo").textContent=`₹${inr(over[0].due)} udhaar · ${over.length} grahak ${db.settings.reminderDays}-din se pending`;
    rs.dataset.nextId=over[0].id; rs.dataset.restIds=over.slice(1).map(c=>c.id).join(",");
  } else rs.hidden=true;
  renderTodayTxns();
}
$("#remindSend")?.addEventListener("click",()=>{
  sendReminder($("#remindStrip").dataset.nextId);
});
function sendReminder(id){
  const c=db.customers.find(x=>x.id===id); if(!c)return;
  const st=Rep.statement(c,db.shop);
  try{ g.open(Rep.waLink(c.phone,st.text),"_blank"); }catch(e){}
  toast("WhatsApp reminder — "+c.name); Voice.speak(c.name+" ko reminder bhej diya");
  const rest=($("#remindStrip").dataset.restIds||"").split(",").filter(Boolean);
  if(rest.length){$("#remindStrip").dataset.nextId=rest[0];$("#remindStrip").dataset.restIds=rest.slice(1).join(",");}
  else setTimeout(renderStats,600);
}
function renderTodayTxns(){
  const tk=Store.todayKey();
  const list=db.txns.filter(t=>t.day===tk).slice(0,5);
  $("#todayTxns").innerHTML=list.map(txnCard).join("") ||
   `<li class="empty"><span class="ms fill">point_of_sale</span><b>Aaj koi bill nahi</b><small>Neeche green mic dabao aur pehla bill bolo!</small></li>`;
}

/* ---------- history ---------- */
function dayLabel(key){
  const tk=Store.todayKey();
  const y=new Date(Date.now()-86400000).toISOString().slice(0,10);
  if(key===tk) return "Today";
  if(key===y) return "Yesterday";
  return new Date(key+"T12:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}
function renderHistory(){
  const q=histQ.toLowerCase();
  let list=db.txns.filter(t=>!q|| (t.customerName||"").toLowerCase().includes(q) || (t.items||[]).some(i=>i.name.toLowerCase().includes(q)));
  const groups={};
  list.forEach(t=>{(groups[t.day]=groups[t.day]||[]).push(t)});
  const keys=Object.keys(groups).sort().reverse().slice(0,7);
  $("#histList").innerHTML=keys.map(k=>`<h4 class="day-h">${dayLabel(k)}</h4><ul class="txn-list">${groups[k].map(txnCard).join("")}</ul>`).join("")
    || `<div class="empty"><span class="ms fill">history</span><b>Kuch nahi mila</b><small>Pehla transaction bolo ya search badlo</small></div>`;
}
$("#histSearch")?.addEventListener("input",e=>{histQ=e.target.value;renderHistory();});

/* ---------- voice view ---------- */
function openVoice(){ $("#voiceView").hidden=false; document.body.style.overflow="hidden"; }
function closeVoice(){ $("#voiceView").hidden=true; document.body.style.overflow=""; try{Voice.cancelListen&&Voice.cancelListen()}catch(e){}; stopMicUI(); }
$("#fabMic").addEventListener("click",()=>openVoice());
$$("[data-close-voice]").forEach(b=>b.addEventListener("click",closeVoice));

function stopMicUI(){
  try{Voice.stopListen()}catch(e){}
  $("#fabMic").classList.remove("rec");
  $("#micBtn").style.background="var(--pc)";
  $("#micBtn").setAttribute("aria-pressed","false");
  $("#micStatus").textContent="MIC DABAO YA CHIP DABAO";
  $("#fabLbl").textContent="Voice";
}
function startMic(){
  if(!window.isSecureContext){ toast("Mic ke liye HTTPS chahiye — demo chip dabao ya localhost use karo","warn"); Voice.beep(400,.15); return; }
  if(!Voice.asrSupported()){ toast("Is browser me live voice nahi — demo chip dabao","warn"); return; }
  if(Voice.isListening()){ Voice.stopListen(); return; }
  $("#fabMic").classList.add("rec");
  $("#micBtn").setAttribute("aria-pressed","true");
  $("#micBtn").style.background="#C62222";
  $("#micStatus").textContent="LISTENING…"; 
  $("#heardText").textContent="…";
  $("#fabLbl").textContent="Sun raha…";
  Voice.beep(700,.08);
  let final="";
  Voice.listen({
    onPartial:t=>{$("#heardText").textContent=t},
    onFinal:t=>{final=t;$("#heardText").textContent="“"+t+"”";handleUtterance(t,{billOpen:!!bill,bill,catalog:g.BKC,customers:db.customers});},
    onError:e=>{
      stopMicUI();
      if(e==="not-allowed"){toast("Mic permission do — browser settings","warn");}
      else {toast("Voice nahi aayi — dobara try karo ya demo chip","warn");}
    },
    onEnd:()=>stopMicUI()
  });
}
$("#micBtn").addEventListener("click",startMic);

$("#demoChips").innerHTML=P.DEMOS.map((d,i)=>`<button class="cat-chip" data-di="${i}" style="border-radius:999px">${esc(d.length>30?d.slice(0,28)+"…":d)}</button>`).join("");
$$("#demoChips .cat-chip").forEach(ch=>ch.addEventListener("click",()=>{
  const text=P.DEMOS[Number(ch.dataset.di)];
  $("#heardText").textContent="“"+text+"”";
  handleUtterance(text,{billOpen:!!bill,bill,catalog:g.BKC,customers:db.customers});
}));

/* ---------- intents ---------- */
async function handleUtterance(text,ctx){
  if(!db.settings.aiDisclosed){ db.settings.aiDisclosed=true; Store.save(); Voice.speak("Main BolKhata AI assistant hoon"); }
  const t0=performance.now();
  let parsed;
  try {
    parsed = (typeof P.parseAsync==="function") ? await P.parseAsync(text,ctx) : P.parse(text,ctx);
  } catch(e){ toast("Voice samajh nahi aaya","warn"); return; }
  try { routeIntent(parsed,((performance.now()-t0)/1000).toFixed(2)); } catch(e){ toast("Bill error","err"); }
}
function routeIntent(p,latency){
  switch(p.intent){
    case "sale":{
      if(!p.items.length){toast("Item samajh nahi aaya — naam bolo","warn");break;}
      const itemsSum=Math.round(p.items.reduce((s,i)=>s+i.price*i.qty,0));
      bill={customer:p.customer,items:p.items.map(i=>({...i,total:Math.round(i.price*i.qty)})),
        subtotal:itemsSum,cash:0,upi:0,udhaar:0,latencyMs:latency,when:p.when||0};
      const pc=Math.round(p.cash||0), pu=Math.round(p.upi||0), pdu=Math.round(p.udhaar||0);
      const paid=pc+pu+pdu;
      if(paid>0){
        const rC=pc/paid, rU=pu/paid, rD=pdu/paid;
        bill.cash=Math.round(itemsSum*rC); bill.upi=Math.round(itemsSum*rU); bill.udhaar=Math.max(0,itemsSum-bill.cash-bill.upi);
      } else {
        bill.cash=itemsSum;
      }
      renderBill(); Voice.beep(950,.09); Voice.vibrate(30);
      break;}
    case "correction": {
      if(bill&&p.patch){
        Store.applyCorrection(p.patch,bill); renderBill();
        toast(`Sahi kar diya — ${p.itemName}`);
        Voice.speak(`${p.itemName} ${bill.items[p.patch.index].qty} kar diya`);
        $("#micStatus").textContent="BILL UPDATE HO GAYA ✓";
      } else toast("Pehle bill to banao!","warn");
      break;}
    case "collection":{
      if(!p.name||!p.amount){toast("Kaun aur kitna jama? Phir bolo","warn");break;}
      const matches=Store.findCustomers(p.name);
      let cname=p.name;
      if(matches.length>1){ const pick=prompt("Kaunsa "+p.name+"? "+matches.map((m,i)=>(i+1)+") "+m.name).join("  "),"1"); const idx=parseInt(pick,10)-1; if(idx>=0&&idx<matches.length) cname=matches[idx].name; }
      const c=Store.ensureCustomer(cname);
      Store.applyCollection(c.name,p.amount,p.when||0); scheduleSync(); renderStats();
      toast(`₹${inr(p.amount)} jama — ${c.name}. Baaki ₹${inr(c.due)}`);
      Voice.speak(`${p.amount} rupaye jama ho gaye. Ab ${inr(c.due)} baaki`);
      break;}
    case "credit":{
      if(!p.name||!p.amount){toast("Kaun aur kitna credit? Phir bolo","warn");break;}
      const matches=Store.findCustomers(p.name);
      let cname=p.name;
      if(matches.length>1){ const pick=prompt("Kaunsa "+p.name+"? "+matches.map((m,i)=>(i+1)+") "+m.name).join("  "),"1"); const idx=parseInt(pick,10)-1; if(idx>=0&&idx<matches.length) cname=matches[idx].name; }
      const cc=Store.ensureCustomer(cname);
      Store.applyCredit(cc.name,p.amount,p.note,p.when||0); scheduleSync(); renderStats(); renderKhata();
      toast(`Rs ${inr(p.amount)} credit added - ${cc.name}. Baaki Rs ${inr(cc.due)}`);
      Voice.speak(`${p.amount} rupaye credit add ho gaye. Ab ${inr(cc.due)} baaki`);
      break;}
    case "query": answerQuery(p); break;
    case "expense":{
      if(!p.amount){toast("Kitne ka kharcha? Phir bolo","warn");break;}
      Store.applyExpense(p.label,p.amount,"general",p.when||0); scheduleSync(); renderStats(); renderExpenses();
      toast(`${p.label} ₹${inr(p.amount)} darj`); Voice.speak(`${p.amount} rupaye ka kharcha darj ho gaya`);
      break;}
    case "return":{
      Store.applyReturn(p.name,p.name_,p.qty,p.unit,p.when||0); scheduleSync(); renderStats(); renderInv();
      toast(`Return darj — stock wapas aa gaya`); Voice.speak("Samman darj, stock wapas aa gaya");
      break;}
    case "inward":{
      Store.applyInward(p.supplier,p.amount,p.itemName,p.qty,p.unit,p.when||0); scheduleSync(); renderStats(); renderInv();
      toast(`Maal aaya ${p.itemName||""} ×${p.qty} · supplier ko ₹${inr(p.amount)}`);
      Voice.speak(`Stock badh gaya. ${p.supplier?p.supplier:"Supplier"} ko ${p.amount} diye`);
      break;}
    default: toast("Ek baar phir se bolo","warn");
  }
}
function answerQuery(p){
  if(p.type==="customer_balance"){
    const c=Store.findCustomer(p.name);
    if(c){const m=`${c.name} ka udhaar ${inr(c.due)} rupaye baaki hai`;toast(m);Voice.speak(m);switchTab("udhaar");$("#khSearch").value=c.name;renderKhata();}
    else{toast("Ye grahak nahi mila","warn");Voice.speak("Ye naam nahi mila");}
    return;
  }
  const d=Store.dashboard();
  if(p.type==="today_sales"){const m=`Aaj ki bikri ${inr(d.sales)} rupaye, ${d.bills} bills`;toast(m);Voice.speak(m);openSheet("reportsSheet");renderReports();return;}
  if(p.type==="today_udhaar"){const m=`Aaj ${inr(d.udhaarGiven)} rupaye ka naya udhaar diya`;toast(m);Voice.speak(m);return;}
  if(p.type==="low_stock"){const low=db.inventory.filter(i=>i.stock<=i.min);const m=`${low.length} item kam stock me hain${low[0]? ", jaise "+low[0].name:""}`;toast(m,"warn");Voice.speak(m);switchTab("stock");return;}
  if(p.type==="total_udhaar"){const m=`Kul udhaar ${inr(d.udhaarTotal)} rupaye baaki`;toast(m);Voice.speak(m);}
}

/* ---------- bill (draft items) ---------- */
function renderBill(){
  $("#billWrap").hidden=!bill;
  if(!bill) return;
  $("#draftItems").innerHTML=bill.items.map((it,i)=>`
    <div style="background:var(--card);border:1px solid var(--outline-soft);border-radius:var(--r-lg);padding:14px;display:flex;justify-content:space-between;align-items:center;gap:10px">
      <div style="min-width:0">
        <div style="font-size:15px;font-weight:600">${esc(it.name)}${it.newSku?' <span class="tag-new">NEW SKU</span>':''}</div>
        <div style="font-size:12px;color:var(--ink2);margin-top:2px">${it.qty} × ${esc(it.unitLabel||it.unit)} → <b style="color:var(--primary)">${esc(it.stdQty)}</b></div>
        <div class="stepper" style="margin-top:6px">
          <button data-qi="${i}" data-d="-1">−</button><span style="min-width:26px;text-align:center;font-weight:700;font-size:13px">${it.qty}</span><button data-qi="${i}" data-d="1">+</button>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0"><div style="font-family:var(--fd);font-size:20px;font-weight:700;color:var(--primary)">₹${inr(Math.round(it.price*it.qty))}</div><small style="color:var(--ink2);font-size:11px">@ ₹${it.price}</small></div>
    </div>`).join("");
  $$("#draftItems .stepper button").forEach(b=>b.addEventListener("click",()=>{
    const i=Number(b.dataset.qi),d=Number(b.dataset.d);
    bill.items[i].qty=Math.max(.25,+(bill.items[i].qty+d).toFixed(2));
    recalcBill(); renderBill();
  }));
  recalcBill(false);
}
function recalcBill(save=true){
  if(!bill)return;
  bill.subtotal=Math.round(bill.items.reduce((s,i)=>s+i.price*i.qty,0));
  if(bill.upi==null) bill.upi=0;
  const oldPaid=Math.round(bill.cash+bill.upi+bill.udhaar);
  if(oldPaid>0 && oldPaid!==bill.subtotal){
    const rC=oldPaid>0?bill.cash/oldPaid:1, rU=oldPaid>0?bill.upi/oldPaid:0, rD=oldPaid>0?bill.udhaar/oldPaid:0;
    bill.cash=Math.round(bill.subtotal*rC);
    bill.upi=Math.round(bill.subtotal*rU);
    bill.udhaar=Math.max(0,bill.subtotal-bill.cash-bill.upi);
  } else if(oldPaid===0){
    bill.cash=bill.subtotal; bill.upi=0; bill.udhaar=0;
  }
  const paid=Math.round(bill.cash+bill.upi+bill.udhaar), grand=paid>0?paid:bill.subtotal;
  $("#splitCashLbl").textContent=`Cash ₹${inr(Math.round(bill.cash))}`;
  $("#splitUpiLbl").textContent=`UPI ₹${inr(Math.round(bill.upi||0))}`;
  $("#splitUdhLbl").textContent=`Udhaar ₹${inr(Math.round(bill.udhaar))}`;
  $("#grandN").textContent=inr(grand);
}
$("#splitCashLbl").addEventListener("click",()=>{if(!bill)return;const t=bill.subtotal;bill.cash=t;bill.upi=0;bill.udhaar=0;recalcBill();});
$("#splitUpiLbl").addEventListener("click",()=>{if(!bill)return;const t=bill.subtotal;bill.upi=t;bill.cash=0;bill.udhaar=0;recalcBill();});
$("#splitUdhLbl").addEventListener("click",()=>{if(!bill)return;const t=bill.subtotal;bill.udhaar=t;bill.cash=0;bill.upi=0;recalcBill();});
$("#cancelBillBtn").addEventListener("click",()=>{bill=null;$("#billWrap").hidden=true;});
$("#confirmBtn").addEventListener("click",confirmSale);
function confirmSale(){
  if(!bill)return;
  const total=Math.round(bill.cash+(bill.upi||0)+bill.udhaar)||bill.subtotal;
  const txn=Store.applySale({customer:bill.customer,
    items:bill.items.map(i=>({skuId:i.skuId,name:i.name,qty:i.qty,unit:i.unit,unitLabel:i.unitLabel,stdQty:i.stdQty,price:i.price})),
    cash:bill.cash,upi:bill.upi||0,udhaar:bill.udhaar,total,when:bill.when||0});
  bill=null; $("#billWrap").hidden=true;
  scheduleSync(); renderStats(); renderHistorySafe();
  Voice.beep(1200,.12); Voice.vibrate([30,40,30]);
  toast(`₹${inr(total)} darj ho gaya ✓`);
  Voice.speak(`${total} rupaye darj ho gaya`);
  $("#micStatus").textContent="READY — AGla BILL BOLO";
  if(txn.limitBreach){
    if(!confirm(`⚠ Credit limit cross for ${txn.customerName} (now ₹${inr(txn.newDue)}). Continue?`)){ 
      // rollback not implemented; just warn
    }
    toast(`⚠ Credit limit cross — ${txn.customerName} ab ₹${inr(txn.newDue)}`,"warn");Voice.speak("Dhyan do credit limit paar ho gayi");
  }
  const lowItems=txn.items.map(i=>db.inventory.find(x=>x.id===i.skuId)).filter(inv=>inv&&inv.stock<=inv.min);
  if(lowItems.length){ toast(`⚠ Low stock: ${lowItems.map(i=>i.name).join(", ")}`,"warn"); Voice.speak("Dhyan do, kam stock hai"); }
}
function renderHistorySafe(){try{renderHistory()}catch(e){}}

/* correction */
$("#corrBtn").addEventListener("click",openCorrect);
function openCorrect(){
  if(!bill)return;
  $("#corrList").innerHTML=bill.items.map((it,i)=>`
    <div style="background:var(--card);border:1px solid var(--outline-soft);border-radius:var(--r-lg);padding:13px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center">
      <div><b style="font-size:14.5px">${esc(it.name)}</b><small style="display:block;color:var(--ink2);font-size:12px">${esc(it.unitLabel||it.unit)} → ${esc(it.stdQty)}</small></div>
      <div style="display:flex;gap:7px;align-items:center">
        <button data-ci="${i}" data-d="-1" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--outline);background:var(--sc);font-weight:700">−</button>
        <input data-ci="${i}" inputmode="decimal" value="${it.qty}" style="width:56px;height:38px;text-align:center;font-weight:700;border:1px solid var(--outline);border-radius:10px"/>
        <button data-ci="${i}" data-d="1" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--outline);background:var(--sc);font-weight:700">+</button>
      </div>
    </div>`).join("");
  $$("#corrList button[data-d]").forEach(b=>b.addEventListener("click",()=>{
    const inp=b.parentElement.querySelector("input");
    inp.value=Math.max(.25,(parseFloat(inp.value)||0)+Number(b.dataset.d));
  }));
  openSheet("corrSheet");
}
$("#corrSave").addEventListener("click",()=>{
  $$("#corrList input").forEach(inp=>{const v=parseFloat(inp.value);if(v>=0)bill.items[Number(inp.dataset.ci)].qty=v;});
  recalcBill(); renderBill(); closeSheet("corrSheet"); toast("Bill sahi ho gaya");
});

/* ---------- sheets ---------- */
function openSheet(id){const s=document.getElementById(id);s.hidden=false;document.body.style.overflow="hidden";const f=s.querySelector("input,button.tbtn");f&&setTimeout(()=>f.focus(),80);if(id==="scanSheet")startScan();if(id==="supSheet")renderSuppliers();}
function closeSheet(id){document.getElementById(id).hidden=true;document.body.style.overflow="";if(id==="scanSheet"){Scan.stop();}}
$$("[data-close]").forEach(b=>b.addEventListener("click",()=>closeSheet(b.dataset.close)));

/* scanner */
function startScan(){
  scanPick=null;$("#scanAdd").disabled=true;$("#scanResultBox").innerHTML="";
  const video=$("#camVideo"),msg=$("#camMsg"),line=$("#scanLine");
  msg.textContent=Scan.supported()? "Barcode dikhao…":"Auto-scan Chrome Android me best — neeche number likho";
  line.style.display=Scan.supported()?"block":"none";
  Scan.start(video,code=>{
    Voice.beep(1400,.12);Voice.vibrate([20,30]);
    msg.textContent="✓ "+code; resolveBarcode(code);
  },err=>{msg.textContent=err==="permission-denied"?"Camera permission do — ya number likho":"Camera nahi khula — number likho";});
}
function resolveBarcode(code){
  let sku=g.BKC.byBarcode(code);
  if(!sku){
    const name="Scanned …"+code.slice(-4);
    $("#scanResultBox").innerHTML=`<div class="hit-card"><div><b>${name}</b><small>Catalog me nahi — naya draft SKU banega ₹20 par</small></div><strong style="font-family:var(--fd);font-size:18px;color:var(--primary)">₹20</strong></div>`;
    scanPick={skuId:null,name,price:20,pack:"1pc"};$("#scanAdd").disabled=false;return;
  }
  const inv=db.inventory.find(i=>i.id===sku.id);
  $("#scanResultBox").innerHTML=`<div class="hit-card"><div><b>${esc(sku.name)}</b><small>${esc(sku.pack)} · Stock ${inv?inv.stock:"—"} · ${esc(sku.barcode)}</small></div><strong style="font-family:var(--fd);font-size:18px;color:var(--primary)">₹${sku.mrp}</strong></div>`;
  scanPick={skuId:sku.id,name:sku.name,price:sku.mrp,pack:sku.pack};$("#scanAdd").disabled=false;
}
$("#barcodeGo").addEventListener("click",()=>{const v=$("#barcodeInput").value.trim();if(v.length>=6)resolveBarcode(v);});
$("#scanAdd").addEventListener("click",()=>{
  if(!scanPick)return;
  if(!bill)bill={customer:null,items:[],subtotal:0,cash:0,udhaar:0,latencyMs:"scan"};
  bill.items.push({skuId:scanPick.skuId,name:scanPick.name,qty:1,unit:"pkt",unitLabel:"1 pkt",stdQty:scanPick.pack,price:scanPick.price,newSku:!scanPick.skuId});
  renderBill();closeSheet("scanSheet");openVoice();
  toast(scanPick.name+" bill me jud gaya");
});

/* ---------- udhaar ---------- */
function renderKhata(){
  const q=($("#khSearch").value||"").toLowerCase().trim();
  const list=db.customers.filter(c=>!q||c.name.toLowerCase().includes(q)).sort((a,b)=>b.due-a.due);
  $("#kCount").textContent=list.filter(c=>c.due>0).length;
  $("#kTotal").textContent=inr(list.reduce((s,c)=>s+c.due,0));
  $("#khList").innerHTML=list.map(c=>{
    const last=c.history&&c.history[0];
    const lastTxt=last?(Date.now()-last.t<86400000?"Today":Date.now()-last.t<172800000?"Yesterday":Math.floor((Date.now()-last.t)/86400000)+" days ago"):"No entry yet";
    const overdue=!last || Date.now()-last.t>db.settings.reminderDays*86400000;
    const status=c.due<=0?'<span class="badge cleared">Cleared</span>'
      :overdue?'<span class="badge overdue">Overdue</span>'
      :'<span class="badge pending">Pending</span>';
    const limit=c.limit>0&&c.due>c.limit?`<div class="badge limit" style="margin-right:6px">Limit ₹${inr(c.limit)} cross</div>`:"";
    return `<article class="kcard">
      <div class="ktop">
        <div class="kwho"><span class="kav">${esc(c.name[0])}</span>
          <div><h3>${esc(c.name)}</h3><p class="klast"><span class="ms">history</span>Last: ${lastTxt}${c.phone?" · "+esc(c.phone):""}</p></div>
        </div>
        <div class="kdue"><b class="tn">₹${inr(c.due)}</b>${limit}${status}</div>
      </div>
      <div class="kfoot">
        <button class="kact grn" data-collect="${c.id}"><span class="ms">savings</span>Vasooli</button>
        <button class="kact" data-upi="${c.id}"><span class="ms">bolt</span>UPI</button>
        <button class="kact" data-wa="${c.id}" ${c.due<=0?'style="opacity:.45;pointer-events:none"':""}><span class="ms">notifications_active</span>Remind</button>
      </div>
    </article>`;
  }).join("") || `<div class="empty"><span class="ms fill">group</span><b>Koi grahak nahi</b><small>Bolo: “Ramesh ko 2 packet Maggi pura udhaar”</small></div>`;
  $$("#khList [data-wa]").forEach(b=>b.addEventListener("click",()=>sendReminder(b.dataset.wa)));
  $$("#khList [data-upi]").forEach(b=>b.addEventListener("click",()=>{
    const c=db.customers.find(x=>x.id===b.dataset.upi);
    const upi=`upi://pay?pa=${encodeURIComponent(db.shop.upi)}&pn=${encodeURIComponent(db.shop.name)}&am=${c.due}&cu=INR`;
    navigator.clipboard?.writeText(upi).catch(()=>{});
    try{location.href=upi}catch(e){}
    toast("UPI link ready"+(c.due?` — ₹${inr(c.due)} (copy bhi ho gaya)`:""));
    Voice.speak("UPI link taiyar hai");
  }));
  $$("#khList [data-collect]").forEach(b=>b.addEventListener("click",()=>{
    const c=db.customers.find(x=>x.id===b.dataset.collect);
    const amt=prompt(`${c.name} se kitna jama hue? (Due ₹${inr(c.due)})`,String(Math.min(c.due||500,500)));
    if(!amt)return;const n=parseFloat(amt);if(isNaN(n)||n<=0)return;
    Store.applyCollection(c.id,n);scheduleSync();renderKhata();renderStats();
    toast(`₹${inr(n)} vasool — ${c.name}`);Voice.speak(`${n} rupaye jama ho gaye`);
  }));
}
$("#khSearch").addEventListener("input",renderKhata);
$("#khVoiceQ").addEventListener("click",()=>{openVoice();startMic();});
$("#addCustBtn").addEventListener("click",()=>{
  const name=prompt("Naya grahak — naam?");if(!name)return;
  const phone=prompt("Phone number (10 digit, optional)","")||"";
  db.customers.push({id:"c"+Date.now().toString(36),name:name.charAt(0).toUpperCase()+name.slice(1),phone,due:0,limit:2000,lastTxn:null,history:[]});
  Store.save();scheduleSync();renderKhata();toast("Grahak add ho gaya — "+name);
});
$("#addCreditBtn")?.addEventListener("click",()=>{
  const name=prompt("Kis grahak ko credit dena hai?");if(!name)return;
  const amt=prompt("Kitne rupaye credit?","500");if(!amt)return;const n=parseFloat(amt);if(isNaN(n)||n<=0)return;
  const note=prompt("Note (optional)","Credit added")||"Credit added";
  const c=Store.ensureCustomer(name);
  Store.applyCredit(c.name,n,note);scheduleSync();renderKhata();renderStats();
  toast(`Rs ${inr(n)} credit added - ${c.name}. Baaki Rs ${inr(c.due)}`);
});

/* ---------- stock ---------- */
function buildCatChips(){
  const cats=["All",...new Set(g.BKC.items.map(i=>i.cat))];
  $("#catChips").innerHTML=cats.map(c=>`<button class="cat-chip ${c===catFilter?"on":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  $$("#catChips .cat-chip").forEach(ch=>ch.addEventListener("click",()=>{catFilter=ch.dataset.cat;buildCatChips();renderInv();}));
}
function renderInv(){
  let list=g.BKC.search("").filter(i=>catFilter==="All"||i.cat===catFilter)
    .map(it=>({...it,...(db.inventory.find(x=>x.id===it.id)||{})}));
  list.sort((a,b)=>(a.stock<=a.min?-1:1)-(b.stock<=b.min?-1:1));
  $("#invList").innerHTML=list.slice(0,60).map(i=>{
    const max=Math.max(i.min*3,i.stock,1), pct=Math.min(100,Math.round(i.stock/max*100));
    const isLow=i.stock<=i.min&&i.stock>0, isOut=i.stock<=0;
    return `<li class="icard ${isLow||isOut?"low":""}">
      <div class="iart"><span class="ms">${iconFor(i.cat)}</span></div>
      <div class="imid">
        <div class="irow1"><h3>${esc(i.name)} (${esc(i.pack)})</h3>${isOut?'<span class="tag-out">Out</span>':isLow?'<span class="tag-low"><span class="ms" style="font-size:12px">warning</span>Low</span>':""}${i.draft?'<span class="tag-new">Draft</span>':""}</div>
        <div class="imeta">${esc(i.cat)} • ₹${i.mrp} / unit</div>
        <div class="ileft ${isLow||isOut?"warn":""}">${i.stock%1?i.stock.toFixed(1):i.stock} units left</div>
        <div class="ibar"><i style="width:${pct}%"></i></div>
      </div>
      <div class="iaction">
        <button class="restock" data-restock="${i.id}">Restock</button>
        <button class="edit-btn ms" data-edit="${i.id}" aria-label="Edit">edit</button>
      </div>
    </li>`;
  }).join("");
  $$("#invList [data-restock]").forEach(b=>b.addEventListener("click",()=>{
    const inv=db.inventory.find(x=>x.id===b.dataset.restock);
    const q=prompt(`Kitna maal aaya — ${inv.name}?`,String(Math.max(10,inv.min*2)));
    if(q===null)return;const n=parseFloat(q);if(isNaN(n)||n<=0)return;
    Store.adjustStock(inv.id,n);renderInv();renderStats();toast(`${inv.name} +${n} ho gaya`);
  }));
  $$("#invList [data-edit]").forEach(b=>b.addEventListener("click",()=>{
    const inv=db.inventory.find(x=>x.id===b.dataset.edit);
    const q=prompt(`${inv.name} — naya stock count?`,String(inv.stock));
    if(q===null)return;const n=parseFloat(q);if(isNaN(n)||n<0)return;
    inv.stock=n;Store.save();renderInv();renderStats();
  }));
}
function iconFor(cat){
  const map={Staples:"grain",Oil:"water_drop",Tea:"emoji_food_beverage",Dairy:"local_drink",Masala:"restaurant",Snacks:"lunch_dining",Biscuit:"cookie",Care:"soap",Wash:"local_laundry_service",Home:"home",Drinks:"local_cafe",Bakery:"bakery_dining",Frozen:"ac_unit",Draft:"help"};
  return map[cat]||inventory_icon(cat);
}
function inventory_icon(){return "inventory_2";}
$("#addItemBtn").addEventListener("click",()=>{
  const name=prompt("Naya item ka naam?");if(!name)return;
  const mrp=parseFloat(prompt("MRP ₹?","20"))||20;
  const pack=prompt("Pack size (jaise 500g, 1L, 1pc)","1pc")||"1pc";
  const it={id:"d"+Date.now().toString(36),name:name.charAt(0).toUpperCase()+name.slice(1),aliases:[name.toLowerCase()],pack,mrp,cat:"Draft",barcode:"",stock:0,min:4,draft:true};
  db.inventory.push(it);Store.save();g.BKC.items.push(it);buildCatChips();renderInv();renderStats();
  toast(name+" catalog me jud gaya");
});

function renderSuppliers(){
  const list=db.suppliers||[];
  $("#supList").innerHTML=list.map(s=>`
    <article class="kcard">
      <div class="ktop">
        <div class="kwho"><span class="kav">${esc(s.name[0])}</span>
          <div><h3>${esc(s.name)}</h3><p class="klast"><span class="ms">history</span>Supplier</p></div>
        </div>
        <div class="kdue"><b class="tn">₹${inr(s.due||0)}</b> <span class="badge ${s.due>0?'overdue':'cleared'}">${s.due>0?'Due':'Clear'}</span></div>
      </div>
      <div class="kfoot">
        <button class="kact grn" data-spay="${s.id}"><span class="ms">savings</span>Pay</button>
        <button class="kact" data-sdel="${s.id}"><span class="ms">delete</span>Delete</button>
      </div>
    </article>`).join("") || `<div class="empty"><span class="ms fill">local_shipping</span><b>Koi supplier nahi</b></div>`;
  $$("#supList [data-spay]").forEach(b=>b.addEventListener("click",()=>{
    const s=db.suppliers.find(x=>x.id===b.dataset.spay);
    const amt=prompt(`${s.name} ko kitna pay karna hai? (Due ₹${inr(s.due||0)})`,String(s.due||0));
    if(!amt)return;const n=parseFloat(amt);if(isNaN(n)||n<=0)return;
    s.due=Math.max(0,(s.due||0)-n);
    const e={id:"e"+Date.now().toString(36),label:s.name+" payment",amount:n,at:Date.now(),day:Store.todayKey(),category:"supplier-pay"};
    db.expenses.unshift(e);Store.save();scheduleSync();renderSuppliers();renderStats();
    toast(`₹${inr(n)} paid to ${s.name}`);
  }));
  $$("#supList [data-sdel]").forEach(b=>b.addEventListener("click",()=>{
    if(!confirm("Supplier delete karna hai?"))return;
    db.suppliers=db.suppliers.filter(x=>x.id!==b.dataset.sdel);Store.save();renderSuppliers();
  }));
}
$("#addSupBtn")?.addEventListener("click",()=>{
  const name=prompt("Supplier ka naam?");if(!name)return;
  const due=parseFloat(prompt("Starting due (₹)","0"))||0;
  db.suppliers.push({id:"s"+Date.now().toString(36),name,due});Store.save();renderSuppliers();toast(name+" add ho gaya");
});

/* ---------- reports ---------- */
$$(".rtab").forEach(t=>t.addEventListener("click",()=>{
  repRange=Number(t.dataset.range);
  $$(".rtab").forEach(x=>x.classList.toggle("on",x===t));
  renderReports();
}));
function renderReports(){
  if(repRange===1){
    const z=Store.zReport();
    $("#repBody").innerHTML=zCard(z)+peakBars(null);
  }else{
    const a=Store.analytics(repRange);
    $("#repBody").innerHTML=topSlow(a)+deadCard(a)+peakBars(a);
  }
}
function zCard(z){
  const rows=[["Gross Bikri",z.gross],["Cash Drawer",z.cash],["Naya Udhaar Diya",z.newUdhaar],["Purana Vasooli",z.collected],["Kharcha (out)",z.expenses]];
  return `<div class="zcard">${rows.map(([l,v])=>`<div class="zrow"><span>${l}</span><b class="tn">₹${inr(v)}</b></div>`).join("")}
    <div class="zrow hl"><span>NET CASH</span><b class="tn">₹${inr(z.gross - z.expenses)}</b></div></div>`;
}
function topSlow(a){
  const bars=a.top.map(x=>`<div class="bar-row"><div class="bar-l"><span>${esc(x.name)}</span><b class="tn">₹${inr(x.revenue)}</b></div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,x.revenue/(a.top[0]?.revenue||1)*100)}%"></div></div></div>`).join("")||'<p class="sh-sub">Data kam hai</p>';
  const slow=a.slow.map(s=>`<div class="zrow"><span>${esc(s.name)}</span><b class="tn">₹${inr(s.revenue)}</b></div>`).join("");
  return `<h4 class="sec-t">Hero Items</h4>${bars}<h4 class="sec-t" style="margin-top:16px">Slow Movers</h4><div class="zcard">${slow||'<div class="zrow"><span>Data kam hai</span></div>'}</div>`;
}
function deadCard(a){
  return `<h4 class="sec-t" style="margin-top:16px">Dead Stock — paisa phasa</h4>
  <div class="zcard"><div class="zrow hl"><span>KUL LOCKED CAPITAL</span><b class="tn">₹${inr(a.deadCapital)}</b></div>
  ${a.dead.map(d=>`<div class="zrow"><span>${esc(d.name)}</span><b class="tn">₹${inr(d.value)}</b></div>`).join("")}</div>`;
}
function peakBars(a){
  const hours=a?a.peak:Object.fromEntries(db.txns.map(t=>[new Date(t.at).getHours(),1]));
  const keys=[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21].filter(h=>hours[h]!=null);
  const max=Math.max(...keys.map(h=>hours[h]),1);
  if(!keys.length)return "";
  return `<h4 class="sec-t" style="margin-top:16px">Rush Hours</h4>`+keys.map(h=>`<div class="bar-row"><div class="bar-l"><span>${h}:00</span></div><div class="bar-track"><div class="bar-fill" style="width:${hours[h]/max*100}%"></div></div></div>`).join("");
}
$("#csvBtn").addEventListener("click",()=>{Rep.downloadCsv(Store.csvExport(),"kirana-transactions.csv");toast("CSV download ho gaya");});
$("#zShareBtn").addEventListener("click",()=>{
  const z=Store.zReport(),txt=Rep.zText(z,db.shop);
  navigator.clipboard?.writeText(txt).catch(()=>{});
  try{g.open("https://wa.me/?text="+encodeURIComponent(txt),"_blank")}catch(e){}
  toast("Z-report WhatsApp ready (copy bhi)");
});
$("#closeDayBtn")?.addEventListener("click",()=>{
  const z=Store.zReport();
  db.settings.closedDay=Store.todayKey();
  Store.save(); scheduleSync();
  toast(`Day closed — Gross ₹${inr(z.gross)}, Net ₹${inr(z.net)}`);
  Voice.speak(`Aaj ka hisaab band. Gross ${z.gross} rupaye`);
});
$("#unlockDayBtn")?.addEventListener("click",()=>{
  db.settings.closedDay=""; Store.save(); toast("Day unlocked"); });

/* ---------- expenses sheet ---------- */
$("#qaExpense").addEventListener("click",()=>{openSheet("expSheet");renderExpenses();});
$("#expVoiceBtn").addEventListener("click",()=>{closeSheet("expSheet");openVoice();setTimeout(startMic,150);toast('Bolo: “Bijli ka bill ₹800 diya”',"ok");});
function renderExpenses(){
  const tk=Store.todayKey();
  const list=db.expenses.filter(e=>e.day===tk).slice(0,10);
  $("#expList").innerHTML=list.map(e=>`
    <li class="txn-card"><span class="tav expense"><span class="ms">${e.category==="inward"?"local_shipping":"receipt_long"}</span></span>
    <div class="tmid"><div class="tname">${esc(e.label)}</div><div class="tmeta"><span>${new Date(e.at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span><span class="tdot"></span><span class="chip-pm expense">${e.category==="inward"?"INWARD":"EXPENSE"}</span></div></div>
    <div class="tamt"><b class="neg tn">−₹${inr(e.amount)}</b></div></li>`).join("")
    || `<li class="empty"><span class="ms fill">receipt_long</span><b>Aaj koi kharcha nahi</b><small>“Chai wale ko ₹40 diye” bolke jodo</small></li>`;
}

/* ---------- settings ---------- */
function loadSettingsUI(){
  $("#setShop").value=db.shop.name;$("#setUpi").value=db.shop.upi;
  $("#setRemind").value=db.settings.reminderDays;
  $("#setSound").checked=!!db.settings.sound;$("#setSync").checked=!!db.settings.autoSync;
  $("#setPin").checked=!!db.settings.pin;
  if($("#setVoice")) $("#setVoice").value=db.settings.voice||"Shivani";
  if($("#setLang")) $("#setLang").value=db.settings.lang||"hi-IN";
}
$("#setShop").addEventListener("change",e=>{db.shop.name=e.target.value||"Meri Dukaan";$("#shopName").textContent=db.shop.name;Store.save();scheduleSync();toast("Save ho gaya");});
$("#setUpi").addEventListener("change",e=>{db.shop.upi=e.target.value||"merchant@upi";Store.save();toast("UPI save ho gaya");});
$("#setRemind").addEventListener("change",e=>{db.settings.reminderDays=Math.max(1,+e.target.value||3);Store.save();renderStats();});
$("#setSound").addEventListener("change",e=>{db.settings.sound=e.target.checked;syncSoundBtn();Store.save();});
$("#setSync").addEventListener("change",e=>{db.settings.autoSync=e.target.checked;Store.save();if(e.target.checked)syncNow();else setSync(false,"Sync off");});
$("#setVoice")?.addEventListener("change",e=>{db.settings.voice=e.target.value;Store.save();});
$("#setLang")?.addEventListener("change",e=>{db.settings.lang=e.target.value;Store.save();});
$("#setPin").addEventListener("change",e=>{
  if(e.target.checked){const p=prompt("4-digit PIN set karo","1234");
    if(p&&/^\d{4}$/.test(p)){db.settings.pin=p;toast("PIN lock ON");}
    else e.target.checked=false;}
  else{db.settings.pin="";toast("PIN lock OFF");}
  Store.save();
});
function syncSoundBtn(){
  const on=!!db.settings.sound;
  const b=$("#soundToggle");b.textContent=on?"volume_up":"volume_off";
  b.setAttribute("aria-pressed",String(on));
}
$("#soundToggle").addEventListener("click",()=>{db.settings.sound=!db.settings.sound;Store.save();syncSoundBtn();loadSettingsUI();toast(db.settings.sound?"Awaaz ON":"Awaaz OFF");});
$("#demoSeedBtn").addEventListener("click",()=>{
  const seq=[
    ["Ramesh ko ek pau chai, 2 packet Maggi — ₹150 me se ₹100 cash ₹50 udhaar"],
    ["Sunita ko sawa kilo cheeni, aadha litre tel — pura udhaar"],
    ["Ramesh ne ₹200 jama kiye"],
    ["Bijli ka bill ₹800 diya"],
    ["Fortune distributor ko ₹5000 diye aur 5 peti tel aaya"]
  ];
  closeSheet("settingsSheet");
  let i=0;
  const step=async()=>{
    if(i>=seq.length){
      renderStats();
      try{switchTab("udhaar")}catch(e){}
      setTimeout(()=>{try{renderKhata()}catch(e){};try{openSheet("reportsSheet");renderReports()}catch(e){}},400);
      setTimeout(()=>{try{closeSheet("reportsSheet");switchTab("stock");renderInv()}catch(e){}},1800);
      setTimeout(()=>{try{switchTab("home");renderStats()}catch(e){};toast("Demo data ready 🎬")},3200);
      return;
    }
    await handleUtterance(seq[i][0],{billOpen:false,bill:null,catalog:g.BKC,customers:db.customers});
    if(bill)confirmSale();
    i++;setTimeout(step,700);
  };
  step();
});
$("#resetBtn").addEventListener("click",()=>{
  if(confirm("Sab data mit jayega. Pakka?")){localStorage.removeItem("bolkhatav3");location.reload();}
});

/* ---------- PIN ---------- */
function pinGate(done){
  if(!db.settings.pin){done();return;}
  pinDone=done;pinBuf="";drawPin();$("#pinTitle").textContent="PIN daalo";
  $("#pinOverlay").hidden=false;buildPad();
}
function buildPad(){
  if($("#pinPad").children.length)return;
  const keys=["1","2","3","4","5","6","7","8","9","⌫","0","✓"];
  $("#pinPad").innerHTML=keys.map(k=>`<button class="pk" data-k="${k}">${k}</button>`).join("");
  $$("#pinPad .pk").forEach(b=>b.addEventListener("click",()=>{
    const k=b.dataset.k;
    if(k==="⌫")pinBuf=pinBuf.slice(0,-1);
    else if(k==="✓"){checkPin();return;}
    else if(pinBuf.length<4){pinBuf+=k;Voice.beep(600,.05);if(pinBuf.length===4)checkPin();}
    drawPin();
  }));
}
function drawPin(){$$("#pinDots i").forEach((d,i)=>d.classList.toggle("f",i<pinBuf.length));}
function checkPin(){
  if(pinBuf===db.settings.pin){$("#pinOverlay").hidden=true;const d=pinDone;pinDone=null;d&&d();}
  else{pinBuf="";drawPin();$("#pinTitle").textContent="Galat PIN — phir se";Voice.vibrate(80);}
}

/* ---------- boot ---------- */
$("#shopName").textContent=db.shop.name;
syncSoundBtn();loadSettingsUI();buildCatChips();
renderStats();try{renderInv()}catch(e){};
if("serviceWorker" in navigator){navigator.serviceWorker.register("sw.js").catch(()=>{});}
window.addEventListener("online",syncNow);
window.addEventListener("offline",()=>setSync(false,"Offline OK"));
syncNow();
document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){
    $$(".sheet").forEach(s=>s.hidden=true);document.body.style.overflow="";
    try{Voice.cancelListen&&Voice.cancelListen()}catch(err){}
    try{Scan.stop()}catch(err){}
  }
});
pinGate(()=>toast("Namaste ji 🙏 Kirana AI ready hai"));
})(window);
