/* 平衡性分析：mock 环境加载游戏代码，模拟多种策略，输出每个环节盈亏、本月累计净利与通关率 */
const fs=require('fs');
const html=fs.readFileSync('index.html','utf-8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];

function makeEl(id){
  const cls=new Set();
  const el={
    id, children:[], firstChild:null, lastChild:null, _html:'',
    className:'', style:{}, disabled:false, onclick:null,
    classList:{ add(c){cls.add(c)}, remove(c){cls.delete(c)}, toggle(c){cls.has(c)?cls.delete(c):cls.add(c)}, contains(c){return cls.has(c)} },
    appendChild(c){ this.children.push(c); if(!this.firstChild) this.firstChild=c; this.lastChild=c; return c; },
    insertBefore(c,r){ const i=this.children.indexOf(r); if(i<0) this.children.unshift(c); else this.children.splice(i,0,c); if(!this.firstChild) this.firstChild=c; if(!this.lastChild) this.lastChild=c; return c; },
    removeChild(c){ const i=this.children.indexOf(c); if(i>=0){ this.children.splice(i,1); if(this.firstChild===c) this.firstChild=this.children[0]||null; if(this.lastChild===c) this.lastChild=this.children[this.children.length-1]||null; } },
    remove(){}, addEventListener(){}, getContext(){ return ctx2d; }, value:'', focus(){}, click(){}
  };
  Object.defineProperty(el,'textContent',{ get(){ return el._html.replace(/<[^>]*>/g,''); }, set(v){ el._html=String(v); } });
  Object.defineProperty(el,'innerHTML',{ get(){ return el._html; }, set(v){ el._html=v; if(v===''){ el.children.length=0; el.firstChild=null; el.lastChild=null; } } });
  return el;
}
const ctx2d=new Proxy({}, { get:(t,k)=>{ if(k==='measureText') return ()=>({width:40}); return ()=>{}; }, set:()=>true });
const els={};
const ids=['sceneBG','sceneShop','portrait','subBar','subHint','subText','subCursor','scr-title','scr-id','scr-game','scr-result',
 'btnNew','btnContinue','btnReset','btnStart','inpName','inpAge','chipsShop','chipsMode','idInit','idWarn',
 'stCash','stPl','stMon','sceneCard','scenTitle','scenText','optList','explainBox','explainTxt','btnHint',
 'resultNote','btnSettle2','miniStats','goalLine','tipBox','logBody','modal','modalBox','settleBody','btnSettle','fxLayer','musicBtn','app','resTitle','resStats','resFootprint','resRuns','resBtns'];
ids.forEach(i=>els[i]=makeEl(i));
const document={ getElementById:i=>els[i]||(els[i]=makeEl(i)), addEventListener(){}, createElement:t=>makeEl(t) };
const localStorage={ _d:{}, getItem:k=>localStorage._d[k]||null, setItem:(k,v)=>{localStorage._d[k]=v}, removeItem:k=>{delete localStorage._d[k]} };
const window={ AudioContext:function(){ return { createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}), createOscillator:()=>({type:'',frequency:{value:0},connect(){},start(){},stop(){}}), createBuffer:()=>({getChannelData:()=>new Float32Array(1)}), createBufferSource:()=>({buffer:null,connect(){},start(){}}), currentTime:0, state:'running', destination:null, resume(){} }; } };
Object.assign(global,{document,localStorage,window,requestAnimationFrame:()=>{},confirm:()=>true,setTimeout:(f)=>0,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{},Math});

/* 固定随机种子，保证可复现 */
let _seed=42;
Math.random=()=>{ _seed=(_seed*1103515245+12345)%2147483648; return _seed/2147483648; };

const RUN = `
function playStrategy(name, shop, pick){
  newState('profit',{name:'测试',shop,age:26});
  const steps=[];
  for(let i=0;i<10;i++){
    const sc=SCEN[i];
    const opt=sc.o[pick(i, S)];
    const note={disabled:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},onclick:null};
    choose(opt, note);
    steps.push({s:S.month, profit:Math.round(S.profit), cash:Math.round(S.cash), total:Math.round(S.totalProfit), demand:Math.round(S.demand), rep:Math.round(S.rep)});
    if(S.cash<=BANKRUPT_LINE) { steps.push({s:S.month, bankrupt:true, cash:Math.round(S.cash)}); break; }
  }
  const losses=steps.filter(x=>x.profit<0).length;
  const line=steps.map(x=>x.profit).join(', ');
  console.log('['+name+'] 累计净利:'+(S.totalProfit>=0?'+':'')+S.totalProfit.toLocaleString('zh-CN')+'  亏损环节:'+losses+'/10  现金:'+Math.round(S.cash)+'  '+(S.cash<=BANKRUPT_LINE?'破产!':'')+'  通关:'+(checkWin()?'是':'否')+'\\n  环节净利序列: '+line);
}

console.log('== 咖啡店 ==');
playStrategy('全选A(o[0])', 'coffee', ()=>{ return 0; });
playStrategy('全选B(o[1])', 'coffee', ()=>{ return 1; });
playStrategy('全选C(o[2])', 'coffee', ()=>{ return 2; });
playStrategy('随机', 'coffee', ()=>Math.floor(Math.random()*3));
playStrategy('循环ABC', 'coffee', (i)=>i%3);
console.log('== 奶茶铺 ==');
playStrategy('全选A', 'tea', ()=>{ return 0; });
playStrategy('全选B', 'tea', ()=>{ return 1; });
playStrategy('全选C', 'tea', ()=>{ return 2; });
playStrategy('循环ABC', 'tea', (i)=>i%3);
console.log('== 便利店 ==');
playStrategy('全选A', 'store', ()=>{ return 0; });
playStrategy('全选B', 'store', ()=>{ return 1; });
playStrategy('全选C', 'store', ()=>{ return 2; });
playStrategy('循环ABC', 'store', (i)=>i%3);
console.log('== 小吃店 ==');
playStrategy('全选A', 'snack', ()=>{ return 0; });
playStrategy('全选B', 'snack', ()=>{ return 1; });
playStrategy('全选C', 'snack', ()=>{ return 2; });
playStrategy('循环ABC', 'snack', (i)=>i%3);
console.log('== 理智经营（前瞻模拟：每题试算 3 选项取最优） ==');
/* 前瞻评估：克隆状态，对每题每个选项模拟 applyFx+settle，选利润最高者 */
function simulateBest(sc){
  let best=0, bestProfit=-Infinity;
  for(let i=0;i<sc.o.length;i++){
    const saved=S;
    S=JSON.parse(JSON.stringify(S));
    applyFx(sc.o[i].fx);
    const r=settle();
    const p=r.profit;
    S=saved;
    if(p>bestProfit){bestProfit=p; best=i;}
  }
  return best;
}
['coffee','tea','store','snack'].forEach(sh=>{
  newState('profit',{name:'理智',shop:sh,age:26});
  const steps=[];
  for(let i=0;i<10;i++){
    const opt=SCEN[i].o[simulateBest(SCEN[i])];
    const note={disabled:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},onclick:null};
    choose(opt, note);
    steps.push(Math.round(S.profit));
    if(S.cash<=BANKRUPT_LINE) break;
  }
  console.log('[理智经营-'+sh+'] 累计净利:'+(S.totalProfit>=0?'+':'')+S.totalProfit.toLocaleString('zh-CN')+'  亏损环节:'+steps.filter(x=>x<0).length+'/10  现金:'+Math.round(S.cash)+'  '+(S.cash<=BANKRUPT_LINE?'破产!':'')+'  通关:'+(checkWin()?'是':'否')+'\\n  环节净利序列: '+steps.join(', '));
});
console.log('\\n== 随机策略 ×30 局统计（咖啡店） ==');
let rWin=0, rLossS=0, rTotalS=0, rBankrupt=0, rTotalSum=0;
for(let g=0;g<30;g++){
  newState('profit',{name:'随机',shop:'coffee',age:26});
  for(let i=0;i<10;i++){
    const opt=SCEN[i].o[Math.floor(Math.random()*3)];
    const note={disabled:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},onclick:null};
    choose(opt, note);
    rTotalS++; if(S.profit<0) rLossS++;
    if(S.cash<=BANKRUPT_LINE){ rBankrupt++; break; }
  }
  rTotalSum+=S.totalProfit;
  if(checkWin()) rWin++;
}
console.log('  30局随机：亏损环节占比 '+Math.round(rLossS/rTotalS*100)+'% ('+rLossS+'/'+rTotalS+')  通关率 '+rWin+'/30  破产 '+rBankrupt+'/30  平均累计净利 '+Math.round(rTotalSum/30).toLocaleString('zh-CN'));
console.log('== 全选B ×20 局统计（咖啡店） ==');
let bWin=0, bLossS=0, bTotalS=0, bSum=0;
for(let g=0;g<20;g++){
  newState('profit',{name:'全B',shop:'coffee',age:26});
  for(let i=0;i<10;i++){
    const opt=SCEN[i].o[1];
    const note={disabled:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},onclick:null};
    choose(opt, note);
    bTotalS++; if(S.profit<0) bLossS++;
    if(S.cash<=BANKRUPT_LINE) break;
  }
  bSum+=S.totalProfit;
  if(checkWin()) bWin++;
}
console.log('  20局全B：亏损环节占比 '+Math.round(bLossS/bTotalS*100)+'%  通关率 '+bWin+'/20  平均累计净利 '+Math.round(bSum/20).toLocaleString('zh-CN'));
console.log('== 理智经营 ×20 局统计（咖啡店，前瞻评估应稳定通关） ==');
let wWin=0, wLossS=0, wTotalS=0, wSum=0;
for(let g=0;g<20;g++){
  newState('profit',{name:'理智',shop:'coffee',age:26});
  for(let i=0;i<10;i++){
    const opt=SCEN[i].o[simulateBest(SCEN[i])];
    const note={disabled:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},onclick:null};
    choose(opt, note);
    wTotalS++; if(S.profit<0) wLossS++;
    if(S.cash<=BANKRUPT_LINE) break;
  }
  wSum+=S.totalProfit;
  if(checkWin()) wWin++;
}
console.log('  20局理智经营：亏损环节占比 '+Math.round(wLossS/wTotalS*100)+'%  通关率 '+wWin+'/20  平均累计净利 '+Math.round(wSum/20).toLocaleString('zh-CN'));
console.log('\\n[提示] 10 环节=1 个月(每环节 3 天)  baseFlow 咖啡100/奶茶130/便利155/小吃170  固定成本 12000/8000/10000/8000  START_CASH=0  PROFIT_GOAL='+PROFIT_GOAL+'  BANKRUPT_LINE='+BANKRUPT_LINE);
`;
(0,eval)(js.replace('"use strict";','') + '\n' + RUN);
