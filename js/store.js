(function(g){
  const KEY = "bolkhatav3";
  const uid = ()=> Date.now().toString(36)+Math.random().toString(36).slice(2,7);

  function todayKey(d){ d=d||new Date(); return d.toISOString().slice(0,10); }

  function seed(){
    const inv = g.BKC.items.map(x=>({...x}));
    return {
      shop:{ name:"Shanti Kirana", owner:"Shanti Devi", upi:"shantikirana@upi", phone:"98xxxxxx10" },
      settings:{ pin:"", sound:true, reminderDays:3, autoSync:true, role:"owner", voice:"Shivani", lang:"hi-IN", aiDisclosed:false },
      customers:[
        {id:"c1",name:"Ramesh",phone:"9812345670",due:420,limit:1000,lastTxn:null,history:[]},
        {id:"c2",name:"Sunita",phone:"9812345671",due:1850,limit:2000,lastTxn:null,history:[]},
        {id:"c3",name:"Geeta",phone:"9812345672",due:3100,limit:3500,lastTxn:null,history:[]},
        {id:"c4",name:"Vijay",phone:"9812345673",due:750,limit:1500,lastTxn:null,history:[]},
        {id:"c5",name:"Amit",phone:"9812345674",due:0,limit:800,lastTxn:null,history:[]}
      ],
      inventory:inv,
      suppliers:[{id:"s1",name:"Fortune Distributor",due:5000},{id:"s2",name:"Local Wholesale",due:1200}],
      txns:[], expenses:[], syncQueue:[]
    };
  }

  let db = null;
  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      db = raw ? JSON.parse(raw) : seed();
    }catch(e){ db = seed(); }
    if(!db || !db.inventory) db = seed();
    return db;
  }
  function save(){ try{ localStorage.setItem(KEY, JSON.stringify(db)); }catch(e){} }
  function get(){ return db || load(); }

  function queueSync(op, payload){
    db.syncQueue.push({op,payload,at:Date.now()});
    if(db.syncQueue.length>200) db.syncQueue.splice(0, db.syncQueue.length-200);
    save();
  }

  function findCustomer(nameOrId){
    if(!nameOrId) return null;
    const n = String(nameOrId).toLowerCase();
    return db.customers.find(c=> c.id===nameOrId) || db.customers.find(c=> c.name.toLowerCase()===n)
      || db.customers.find(c=> c.name.toLowerCase().startsWith(n));
  }
  function findCustomers(nameOrId){
    if(!nameOrId) return [];
    const n = String(nameOrId).toLowerCase();
    const exact = db.customers.filter(c=> c.name.toLowerCase()===n);
    if(exact.length) return exact;
    const starts = db.customers.filter(c=> c.name.toLowerCase().startsWith(n));
    if(starts.length) return starts;
    return db.customers.filter(c=> c.name.toLowerCase().includes(n));
  }
  function ensureCustomer(name){
    let c = findCustomer(name);
    if(c) return c;
    c = {id:"c"+uid(), name:String(name).charAt(0).toUpperCase()+String(name).slice(1), phone:"", due:0, limit:2000, lastTxn:null, history:[]};
    db.customers.push(c); save();
    return c;
  }

  function findInv(skuIdOrName){
    if(!skuIdOrName) return null;
    return db.inventory.find(i=> i.id===skuIdOrIdFix(skuIdOrName)) || null;
  }
  function skuIdOrFix(v){ return v; }
  function invByName(name){
    const n=String(name||"").toLowerCase();
    return db.inventory.find(i=> i.name.toLowerCase()===n) || db.inventory.find(i=> i.aliases.some(a=>n.includes(a))) || null;
  }
  function draftSku(name, price, pack){
    const it = {id:"d"+uid(), name:name.charAt(0).toUpperCase()+name.slice(1), aliases:[String(name).toLowerCase()],
      pack:pack||"1pc", mrp:price||20, cat:"Draft", barcode:"", stock:10, min:4, draft:true};
    db.inventory.push(it); save();
    return it;
  }

  // ---- pack-aware unit conversion ----
  // stock is counted in packs/units; a sale may be in g/ml/pc, so convert.
  function packSize(pack){
    const m=String(pack||"").match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml|pc|pkt|box)/i);
    if(!m) return {size:1,unit:"pc"};
    let n=parseFloat(m[1]); const u=m[2].toLowerCase();
    if(u==="kg") return {size:n*1000,unit:"g"};
    if(u==="l") return {size:n*1000,unit:"ml"};
    return {size:n,unit:u};
  }
  function toUnits(pack,qty,unit){
    const ps=packSize(pack); let q=Number(qty)||0; let u=unit||"pc";
    if(u==="kg"){ q*=1000; u="g"; }
    else if(u==="l"){ q*=1000; u="ml"; }
    if(u==="g" && ps.unit==="g") return q/ps.size;
    if(u==="ml" && ps.unit==="ml") return q/ps.size;
    if((u==="pc"||u==="pkt"||u==="box") && ps.unit==="pc") return q/ps.size;
    return q;
  }

  function applySale(parsed){
    const items=[];
    for(const p of parsed.items){
      let inv = p.skuId ? db.inventory.find(i=>i.id===p.skuId) : invByName(p.name);
      let isNew=false;
      if(!inv){ inv = draftSku(p.name, p.price, p.pack); isNew=true; }
      const lineTotal = Math.round(p.price * p.qty);
      items.push({skuId:inv.id, name:p.name, qty:p.qty, unit:p.unit||p.unitLabel||"pc", unitLabel:p.unitLabel||"", price:p.price, total:lineTotal, newSku:isNew});
      inv.stock = Math.max(0, +(inv.stock - toUnits(inv.pack, p.qty, p.unit)).toFixed(2));
    }
    let cust=null;
    if(parsed.customer) cust = ensureCustomer(parsed.customer);
    const when = Number(parsed.when)||0;
    const at = Date.now() + when*86400000;
    const txn = {id:"t"+uid(), type:"sale", at:at, day:todayKey(new Date(at)),
      customerName: cust? cust.name : "Cash Sale", customerId: cust?cust.id:null,
      items, total: parsed.total || ((parsed.cash||0)+(parsed.upi||0)+(parsed.udhaar||0)) || items.reduce((s,i)=>s+i.total,0),
      cash: parsed.cash||0, upi: parsed.upi||0, udhaar: parsed.udhaar||0};
    if(txn.total < txn.cash + txn.udhaar) txn.total = txn.cash + txn.udhaar;
    if(cust && txn.udhaar>0){
      cust.due += txn.udhaar;
      txn.limitBreach = !!(cust.limit>0 && cust.due>cust.limit);
      txn.newDue = cust.due;
      cust.history.unshift({t:txn.at, label:`${items.map(i=>i.qty+" "+i.unit+" "+i.name).join(" + ")}`, amt:txn.udhaar});
      if(cust.history.length>12) cust.history.pop();
    }
    cust && (cust.lastTxn = txn.at);
    db.txns.unshift(txn);
    if(db.txns.length>400) db.txns.length=400;
    save();
    return txn;
  }

  function applyCorrection(patch, bill){
    const it = bill.items[patch.index];
    if(!it) return bill;
    if(patch.fields.qty!=null) it.qty = patch.fields.qty;
    if(patch.fields.price!=null){ it.price = patch.fields.price; }
    it.total = Math.round(it.price*it.qty);
    bill.items.forEach(i=> i.total = Math.round(i.price*i.qty));
    bill.subtotal = bill.items.reduce((s,i)=> s+i.total,0);
    if(bill.cash + bill.udhaar !== bill.subtotal && !(bill.cash&&bill.udhaar)){
      if(bill.udhaar>0) bill.cash = Math.max(0,bill.subtotal-bill.udhaar);
      else if(bill.cash>0) bill.udhaar = Math.max(0,bill.subtotal-bill.cash);
      else bill.cash = bill.subtotal;
    }
    save();
    return bill;
  }

  function applyCollection(name, amount, when){
    const c = ensureCustomer(name);
    amount = Number(amount)||0;
    c.due = Math.max(0, c.due - amount);
    const at = Date.now() + (Number(when)||0)*86400000;
    const txn = {id:"t"+uid(), type:"collect", at:at, day:todayKey(new Date(at)),
      customerName:c.name, customerId:c.id, total:amount, cash:amount, udhaar:0,
      items:[{name:"Udhaar jama", qty:1, unit:"payment", price:amount, total:amount}]};
    c.history.unshift({t:txn.at,label:"₹"+amount+" jama kiye",amt:-amount});
    db.txns.unshift(txn); save();
    return {txn, customer:c};
  }

  function applyExpense(label, amount, category, when){
    const at = Date.now() + (Number(when)||0)*86400000;
    const e = {id:"e"+uid(), label:label||"Kharcha", amount:Number(amount)||0, at:at, day:todayKey(new Date(at)), category:category||"general"};
    db.expenses.unshift(e);
    if(db.expenses.length>200) db.expenses.length=200;
    save(); return e;
  }

  function applyReturn(name, skuName, qty, unit, when){
    const inv = invByName(skuName);
    const q = Number(qty)||1;
    const units = inv ? toUnits(inv.pack, q, unit) : q;
    if(inv) inv.stock = +(inv.stock + units).toFixed(2);
    let adj = inv ? Math.round(inv.mrp * units) : 0;
    let cust=null;
    if(name){ cust=ensureCustomer(name); cust.due=Math.max(0,cust.due-adj); }
    const at = Date.now() + (Number(when)||0)*86400000;
    const txn={id:"t"+uid(),type:"return",at:at,day:todayKey(new Date(at)),
      customerName:cust?cust.name:"Counter",customerId:cust?cust.id:null,
      items:[{name:inv?inv.name:skuName,qty:q,unit:unit||"pc",price:inv?inv.mrp:adj,total:-adj}],
      total:-adj,cash:0,udhaar:0};
    db.txns.unshift(txn); save();
    return txn;
  }

  function applyCredit(name, amount, note, when){
    const c = ensureCustomer(name);
    amount = Number(amount)||0;
    c.due = (c.due||0) + amount;
    const at = Date.now() + (Number(when)||0)*86400000;
    const txn = {id:"t"+uid(), type:"credit", at:at, day:todayKey(new Date(at)),
      customerName:c.name, customerId:c.id, total:amount, cash:0, udhaar:amount,
      items:[{name:note||"Credit added", qty:1, unit:"credit", price:amount, total:amount}]};
    c.history.unshift({t:txn.at, label:(note||"Credit added"), amt:amount});
    if(c.history.length>12) c.history.pop();
    c.lastTxn = txn.at;
    db.txns.unshift(txn);
    if(db.txns.length>400) db.txns.length=400;
    save();
    return {txn, customer:c};
  }

  function applyInward(supplierName, amount, itemName, qty, unit, when){
    const inv = invByName(itemName);
    const q = Number(qty)||0;
    const units = inv ? toUnits(inv.pack, q, unit) : q;
    if(inv) inv.stock = +(inv.stock + units).toFixed(2);
    let sup = supplierName && db.suppliers.find(s=> s.name.toLowerCase().includes(String(supplierName).toLowerCase()));
    if(!sup && supplierName){ sup={id:"s"+uid(),name:supplierName,due:0}; db.suppliers.push(sup); }
    if(sup) sup.due += Number(amount)||0;
    const at = Date.now() + (Number(when)||0)*86400000;
    const e={id:"e"+uid(),label:(sup?sup.name:"Supplier")+" inward "+(itemName||""),amount:Number(amount)||0,at:at,day:todayKey(new Date(at)),category:"inward"};
    db.expenses.unshift(e); save();
    return {supplier:sup, item:inv};
  }

  function adjustStock(id, delta){
    const inv = db.inventory.find(i=>i.id===id);
    if(inv){ inv.stock = Math.max(0, +(inv.stock+delta).toFixed(2)); save(); }
    return inv;
  }

  function dashboard(){
    const tk=todayKey();
    const sales=db.txns.filter(t=> t.type==="sale" && t.day===tk);
    const credit=db.txns.filter(t=> t.type==="credit" && t.day===tk);
    const collect=db.txns.filter(t=> t.type==="collect" && t.day===tk);
    const totalSales=sales.reduce((s,t)=>s+t.total,0);
    const cashToday=sales.reduce((s,t)=>s+t.cash,0)+collect.reduce((s,t)=>s+t.total,0);
    const upiToday=sales.reduce((s,t)=>s+(t.upi||0),0);
    const udhaarToday=sales.reduce((s,t)=>s+t.udhaar,0)+credit.reduce((s,t)=>s+t.udhaar,0);
    const udhaarTotal=db.customers.reduce((s,c)=>s+c.due,0);
    const low=db.inventory.filter(i=> i.stock<=i.min);
    const expToday=db.expenses.filter(e=> e.day===tk && e.category!=="inward").reduce((s,e)=>s+e.amount,0);
    return {sales:totalSales, bills:sales.length, cash:cashToday, upi:upiToday, udhaarGiven:udhaarToday,
      udhaarTotal, lowCount:low.length, expenses:expToday,
      net: totalSales - expToday};
  }

  function zReport(dateKey){
    const dk=dateKey||todayKey();
    const txns=db.txns.filter(t=> t.day===dk);
    const sales=txns.filter(t=>t.type==="sale");
    const credits=txns.filter(t=>t.type==="credit");
    const collects=txns.filter(t=>t.type==="collect");
    const gross=sales.reduce((s,t)=>s+t.total,0)+credits.reduce((s,t)=>s+t.total,0);
    const cash=sales.reduce((s,t)=>s+t.cash,0);
    const upi=sales.reduce((s,t)=>s+(t.upi||0),0);
    const newUd=sales.reduce((s,t)=>s+t.udhaar,0)+credits.reduce((s,t)=>s+t.udhaar,0);
    const oldRec=collects.reduce((s,t)=>s+t.total,0);
    const exp=db.expenses.filter(e=>e.day===dk && e.category!=="inward").reduce((s,e)=>s+e.amount,0);
    const inward=db.expenses.filter(e=>e.day===dk && e.category==="inward").reduce((s,e)=>s+e.amount,0);
    return {date:dk,gross,cash,upi,newUdhaar:newUd,collected:oldRec,expenses:exp,inward,net:gross-exp};
  }

  function analytics(days){
    const since=Date.now()-days*86400000;
    const map={};
    for(const t of db.txns){
      if(t.type!=="sale"||t.at<since) continue;
      for(const it of t.items){ map[it.name]=map[it.name]||{qty:0,revenue:0,name:it.name}; map[it.name].qty+=it.qty; map[it.name].revenue+=it.total; }
    }
    const arr=Object.values(map).sort((a,b)=>b.revenue-a.revenue);
    const dead=db.inventory.filter(i=>{
      const sold=arr.find(a=>a.name===i.name);
      return !sold && i.stock>0;
    }).map(i=>({name:i.name,stock:i.stock,value:i.stock*i.mrp}));
    const deadCapital=dead.reduce((s,d)=>s+d.value,0);
    const hours={};
    for(const t of db.txns){ if(t.at<since)continue; const h=new Date(t.at).getHours(); hours[h]=(hours[h]||0)+1; }
    return {top:arr.slice(0,5), slow:arr.slice(-5).reverse(), dead:dead.slice(0,6), deadCapital, peak:hours};
  }

  function overdueCustomers(){
    const cutoff=Date.now()-(db.settings.reminderDays||3)*86400000;
    return db.customers.filter(c=> c.due>0).filter(c=>{
      const last=c.history[0];
      return !last || last.t<cutoff;
    });
  }

  function csvExport(){
    const rows=[["Date","Type","Customer","Items","Cash","Udhaar","Total"]];
    for(const t of db.txns){
      rows.push([new Date(t.at).toLocaleString(), t.type, t.customerName||"",
        (t.items||[]).map(i=>`${i.qty}${i.unit} ${i.name}`).join(" | "),
        t.cash||0,(t.udhaar||0),t.total]);
    }
    return rows.map(r=> r.map(v=> `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
  }

  g.BKStore = {load,get,save,seed,findCustomer,findCustomers,ensureCustomer,applySale,applyCorrection,applyCollection,
    applyExpense,applyReturn,applyInward,applyCredit,adjustStock,dashboard,zReport,analytics,overdueCustomers,csvExport,
    todayKey,queueSync, invByName, draftSku};
})(globalThis);
