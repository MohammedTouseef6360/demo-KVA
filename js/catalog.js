(function(g){
  const RAW = [
    "Aashirvaad Atta|atta,aashirvaad,gehu ka atta|5kg|320|Staples",
    "Fortune Chakki Atta|fortune atta,chakki atta|5kg|290|Staples",
    "Rajdhani Atta|rajdhani atta|1kg|55|Staples",
    "India Gate Basmati Rice|basmati,india gate,chawal|1kg|140|Staples",
    "Daawat Rice|daawat,davat rice|1kg|125|Staples",
    "Kolam Rice|kolam,safed chawal|5kg|400|Staples",
    "Toor Dal|toor,arhar dal,tur dal|1kg|160|Staples",
    "Moong Dal|moong,mung dal|1kg|120|Staples",
    "Chana Dal|chana,bengal gram|1kg|90|Staples",
    "Masoor Dal|masoor|1kg|110|Staples",
    "Urad Dal|urad,udad dal|1kg|130|Staples",
    "Rajma|rajma,kidney beans|500g|95|Staples",
    "Chole/Chickpeas|chole,kabuli chana|500g|80|Staples",
    "Fortune Sunflower Oil|tel,fortune oil,tel fortune|1L|145|Oil",
    "Fortune Oil 5L|bada tel,peti tel|5L|700|Oil",
    "Saffola Oil|saffola|1L|165|Oil",
    "Mustard Oil|sarso tel,mustard|1L|180|Oil",
    "Coconut Oil|nariyal tel,coconut|500ml|220|Oil",
    "Cheeni (Sugar)|cheeni,sakkar,chini,sugar|1kg|45|Staples",
    "Tata Salt|namak,tata salt|1kg|28|Staples",
    "Black Salt|kala namak|200g|30|Staples",
    "Tata Tea Premium|chai,chaay,tata tea|500g|285|Tea",
    "Red Label Tea|red label|500g|260|Tea",
    "Taj Mahal Tea|taj mahal chai|250g|165|Tea",
    "Bru Coffee|coffee,bru|50g|95|Tea",
    "Nescafe Coffee|nescafe|50g|145|Tea",
    "Amul Doodh|doodh,amul milk,milk|500ml|28|Dairy",
    "Amul Taaza 1L|doodh 1 litre|1L|54|Dairy",
    "Gokul Doodh|gokul milk|500ml|27|Dairy",
    "Amul Dahi|dahi,curd,yogurt|400g|35|Dairy",
    "Amul Butter|makkhan,butter|100g|58|Dairy",
    "Amul Cheese Slices|cheese|200g|130|Dairy",
    "Amul Paneer|paneer|200g|95|Dairy",
    "Amul Lassi|lassi|200ml|25|Dairy",
    "Chaach (Buttermilk)|chaach,mattha|200ml|20|Dairy",
    "MDH Garam Masala|garam masala|100g|65|Masala",
    "MDH Chole Masala|chole masala|100g|68|Masala",
    "MDH Sabji Masala|sabji masala|100g|62|Masala",
    "Everest Masala|everest|100g|60|Masala",
    "Lal Mirch Powder|lal mirch,mirchi powder|100g|42|Masala",
    "Haldi Powder|haldi,turmeric|100g|38|Masala",
    "Dhania Powder|dhania,coriander powder|100g|40|Masala",
    "Jeera Whole|jeera,cumin|100g|90|Masala",
    "Maggi Noodles|maggi|70g|14|Snacks",
    "Yippee Noodles|yippee|60g|12|Snacks",
    "Top Ramen|top ramen,ramen|70g|14|Snacks",
    "Kurkure|kurkure|20g|10|Snacks",
    "Lays Chips|lays,chips|26g|10|Snacks",
    "Haldiram Bhujia|bhujia,haldiram|200g|55|Snacks",
    "Aloo Bhujia|aloo bhujia|150g|45|Snacks",
    "Parle-G|parle g,parleg,biscuit parle,biscuit|250g|30|Biscuit",
    "Parle-G Family|bada parle g|800g|85|Biscuit",
    "Marie Gold|marie,britannia marie|250g|32|Biscuit",
    "Good Day Biscuit|good day|200g|40|Biscuit",
    "Oreo|oreo|120g|30|Biscuit",
    "Bourbon|bourbon|150g|45|Biscuit",
    "Krackjack|krackjack|200g|35|Biscuit",
    "Monaco|monaco|200g|35|Biscuit",
    "Lifebuoy Soap|lifebuoy,sabun|125g|35|Care",
    "Lux Soap|lux sabun|100g|30|Care",
    "Cinthol Soap|cinthol|100g|38|Care",
    "Dettol Soap|dettol sabun|110g|42|Care",
    "Surf Excel Easy Wash|surf,surf excel,washing powder|1kg|210|Wash",
    "Surf Excel 500g|aadha surf|500g|110|Wash",
    "Rin Detergent|rin|1kg|130|Wash",
    "Wheel Detergent|wheel|1kg|99|Wash",
    "Ariel Detergent|ariel|1kg|320|Wash",
    "Vim Bar|vim,bartan sabun|200g|20|Wash",
    "Pril Dishwash|pril|500ml|105|Wash",
    "Harpic Cleaner|harpic,toilet cleaner|500ml|92|Wash",
    "Lizol Floor Cleaner|lizol|500ml|118|Wash",
    "Clinic Plus Shampoo|clinic plus,shampoo|175ml|112|Care",
    "Head & Shoulders|h&s shampoo,head shoulders|180ml|145|Care",
    "Dove Shampoo|dove|180ml|210|Care",
    "Colgate Toothpaste|colgate,manjan|150g|95|Care",
    "Colgate MaxFresh|maxfresh,colgate bada|200g|115|Care",
    "Pepsodent Toothpaste|pepsodent|140g|82|Care",
    "Close-Up Toothpaste|closeup|80g|78|Care",
    "Colgate Brush|brush,toothbrush|1pc|45|Care",
    "Gillette Guard Razor|razor,gillette|1pc|45|Care",
    "Vaseline Petroleum Jelly|vaseline|100g|65|Care",
    "Nycil Prickly Heat|nycil,prickly heat|50g|55|Care",
    "Cycle Agarbatti|agarbatti,incense|1pkt|40|Home",
    "Matchbox|machis,matchbox|1pc|2|Home",
    "Candles|candle,mombatti|6pc|30|Home",
    "Mortein Spray|mortein,machar spray|200ml|95|Home",
    "Odonil Air Freshener|odonil,freshener|75g|55|Home",
    "Scrubber Pad|scrubber,jhaadu pad|1pc|15|Home",
    "Polythene Bags|polythene,thaila|1pkt|20|Home",
    "Thums Up|thums up|750ml|45|Drinks",
    "Coca-Cola|coke,coca cola|750ml|45|Drinks",
    "Sprite|sprite|750ml|45|Drinks",
    "Maaza|maaza|mango drink|600ml|40|Drinks",
    "Frooti|frooti|200ml|15|Drinks",
    "Bisleri Water 1L|bisleri paani,paani bisleri|1L|22|Drinks",
    "Bisleri 500ml|chota paani|500ml|15|Drinks",
    "Britannia Bread|bread,pav,bun bread|400g|40|Bakery",
    "Egg Tray|ande,eggs,tray anda|30pc|180|Dairy",
    "Pav (6pc)|pav|6pc|25|Bakery",
    "Ice Cream Cup|icecream,ice cream cup|100ml|25|Frozen",
    "Kwality Wall's Tub|family pack icecream|700ml|190|Frozen"
  ];
  function ean(i){
    const base = ("890" + String(1000000 + i*7 % 9999999)).slice(0,12);
    let sum=0; for(let k=0;k<12;k++) sum += Number(base[k]) * (k%2?3:1);
    return base + ((10 - (sum%10))%10);
  }
  const list=[];
  RAW.forEach((row,i)=>{
    const [name,aliasStr,pack,mrp,cat] = row.split("|");
    const aliases = aliasStr.split(",").map(a=>a.trim());
    list.push({ id:"sku"+String(list.length+1).padStart(3,"0"),
      name, aliases, pack, mrp:Number(mrp), cat,
      barcode:ean(list.length+1),
      stock: 8 + ((list.length*13)%18),
      min: 4 + (list.length%3)*2,
      draft:false });
    const vm=pack.match(/^(\d+(?:\.\d+)?)\s*(kg|g|L|ml)$/i);
    if(vm){
      const n=parseFloat(vm[1]); const u=vm[2].toLowerCase();
      let half=null;
      if((u==="kg"||u==="g")&&n>0.25) half=(n/2)+(u==="kg"?"kg":"g");
      if((u==="l"||u==="ml")&&n>=1) half=(n/2)+(u==="l"?"L":"ml");
      if(half){
        const hmrp=Math.max(5,Math.round(Number(mrp)*0.52));
        list.push({ id:"sku"+String(list.length+1).padStart(3,"0"),
          name:name+" "+half, aliases:[aliases[0]+" "+half,name.toLowerCase()+" "+half], pack:half, mrp:hmrp, cat,
          barcode:ean(900+list.length),
          stock: 6+((list.length*7)%12), min:4+(list.length%3), draft:false });
      }
    }
  });
  g.BKC = { items:list, byId(id){return this.items.find(x=>x.id===id)},
    matchAt(text){
      const t=String(text).toLowerCase();
      let best=null,bestLen=0,pos=-1;
      for(const it of this.items){
        const cands=[it.name.toLowerCase(),...it.aliases];
        for(const a of cands){
          const ix=t.indexOf(a);
          if(ix>-1 && a.length>bestLen){best=it;bestLen=a.length;pos=ix;}
        }
      }
      return best?{sku:best,alias:t.slice(pos,pos+bestLen),idx:pos}:null;
    },
    match(text){ const h=this.matchAt(text); return h?h.sku:null; },
    byBarcode(code){
      code=String(code).trim();
      return this.items.find(x=>x.barcode===code) || null;
    },
    search(q){
      q=q.toLowerCase().trim(); if(!q) return this.items;
      return this.items.filter(it=> it.name.toLowerCase().includes(q) || it.aliases.some(a=>a.includes(q)) || it.cat.toLowerCase().includes(q));
    }
  };
})(globalThis);
