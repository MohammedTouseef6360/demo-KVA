(function(g){
  function inr(n){ return Number(n||0).toLocaleString("en-IN"); }

  function zText(z, shop){
    const L=[];
    L.push(`*${shop.name} — Z-Report ${z.date}*`);
    L.push(``);
    L.push(`Gross Bikri: ₹${inr(z.gross)}`);
    L.push(`Cash Drawer: ₹${inr(z.cash)}`);
    if(z.upi) L.push(`UPI: ₹${inr(z.upi)}`);
    L.push(`Naya Udhaar: ₹${inr(z.newUdhaar)}`);
    L.push(`Purana Vasooli: ₹${inr(z.collected)}`);
    if(z.expenses) L.push(`Kharcha: ₹${inr(z.expenses)}`);
    if(z.inward) L.push(`Maal (Inward): ₹${inr(z.inward)}`);
    L.push(`Net Cash: ₹${inr(z.net)}`);
    return L.join("\n");
  }

  function statement(cust, shop){
    const upi = `upi://pay?pa=${encodeURIComponent(shop.upi)}&pn=${encodeURIComponent(shop.name)}&am=${cust.due}&cu=INR`;
    let s = `Namaste *${cust.name}* ji 🙏\n_${shop.name}_ se reminder\n\n`;
    s += `Aapka udhaar: *₹${inr(cust.due)}*\n`;
    if(cust.history && cust.history.length){
      s += `\nLast entries:\n`;
      cust.history.slice(0,4).forEach(h=>{
        s += `${h.amt>0?"•":"✅"} ${h.label} — ${h.amt>0? "₹"+inr(h.amt) : "₹"+inr(-h.amt)+" jama"}\n`;
      });
    }
    s += `\nEk click me pay karein:\n${upi}\n\nDhanyavaad! 🙏`;
    return {text:s, upiLink:upi};
  }

  function waLink(phone, text){
    const p = String(phone||"").replace(/\D/g,"");
    const num = p.length===10 ? "91"+p : p;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  }

  function downloadCsv(csv, filename){
    try{
      const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download=filename||("bolkhata-"+Date.now()+".csv");
      document.body.appendChild(a); a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },400);
      return true;
    }catch(e){ return false; }
  }

  g.BKReports={inr,zText,statement,waLink,downloadCsv};
})(globalThis);
