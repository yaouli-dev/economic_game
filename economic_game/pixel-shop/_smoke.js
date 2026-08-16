/* 温馨版冒烟测试 v2：mock DOM，跑通 章节→身份→连续答题→最终结算→结局→二周目→破产路径→购买提示 */
const fs=require('fs');
const html=fs.readFileSync(process.argv[2],'utf-8');
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
    remove(){ if(this.parentNode) this.parentNode.removeChild(this); },
    addEventListener(){}, getContext(){ return ctx2d; }, value:'', focus(){}, click(){ if(this.onclick) this.onclick(); }
  };
  Object.defineProperty(el,'textContent',{
    get(){ return el._html.replace(/<[^>]*>/g,''); },
    set(v){ el._html=String(v); }
  });
  Object.defineProperty(el,'innerHTML',{
    get(){ return el._html; },
    set(v){ el._html=v; if(v===''){ el.children.length=0; el.firstChild=null; el.lastChild=null; } }
  });
  return el;
}
const ctx2d=new Proxy({}, { get:(t,k)=>{
  if(k==='measureText') return ()=>({width:40});
  return ()=>{};
}, set:()=>true });
const els={};
const ids=['sceneBG','sceneShop','portrait','subBar','subHint','subText','subCursor','scr-title','scr-id','scr-game','scr-result',
 'btnNew','btnContinue','btnReset','btnStart','inpName','inpAge','chipsShop','chipsMode','idInit','idWarn',
 'stCash','stPl','stMon','sceneCard','scenTitle','scenText','optList','explainBox','explainTxt','btnHint',
 'resultNote','btnSettle2','miniStats','goalLine','tipBox','logBody','modal','modalBox','settleBody','btnSettle','fxLayer','musicBtn','app','resTitle','resStats','resFootprint','resRuns','resBtns'];
ids.forEach(i=>els[i]=makeEl(i));
const document={ getElementById:i=>els[i]||(els[i]=makeEl(i)),
  addEventListener(){}, createElement:t=>makeEl(t) };
const localStorage={ _d:{}, getItem:k=>localStorage._d[k]||null, setItem:(k,v)=>{localStorage._d[k]=v}, removeItem:k=>{delete localStorage._d[k]} };
const window={ AudioContext:function(){ return { createGain:()=>({gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}), createOscillator:()=>({type:'',frequency:{value:0},connect(){},start(){},stop(){}}), createBuffer:()=>({getChannelData:()=>new Float32Array(1)}), createBufferSource:()=>({buffer:null,connect(){},start(){}}), currentTime:0, state:'running', destination:null, resume(){} }; } };
Object.assign(global,{document,localStorage,window,requestAnimationFrame:()=>{},confirm:()=>true,setTimeout:(f)=>0,clearTimeout:()=>{},setInterval:()=>1,clearInterval:()=>{}});

/* 固定随机种子，保证冒烟测试可复现（避免随机市场事件导致偶发破产） */
let _seed=20260814;
Math.random=()=>{ _seed=(_seed*1103515245+12345)%2147483648; return _seed/2147483648; };

const TEST = `
let pass=0, fail=0;
const ok=(name,cond)=>{ cond?(pass++,console.log('  ✓',name)):(fail++,console.log('  ✗ FAIL:',name)); };
const mockBtn=()=>({disabled:false,style:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},onclick:null});
/* 前瞻最优：克隆状态试算 3 选项取利润最高者（模拟会玩的人，保证冒烟流程走完 10 环节） */
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

try{ drawApt(1); drawOffice(1); drawStreet(1); drawDream(1); ok('四个故事场景绘制',true); }
catch(e){ ok('四个故事场景绘制',false); console.log('   ',e.message); }

/* —— 章节 → 身份 —— */
showTitle();
startStory();
ok('故事开始，字幕打字中', !!typeTimer);
storyClick(); ok('点击跳过打字', !typeTimer);
let guard=0;
while(curScreen!=='id' && guard++<30) storyClick();
ok('章节点击完进入身份屏', curScreen==='id');

/* —— 身份：自定义姓名 + 年龄 —— */
$('inpName').value='小美';
$('inpAge').value='26';
idSel={shop:'coffee',mode:'profit'};
startGame();
ok('进入游戏屏', curScreen==='game');
ok('开局现金为 ¥0（15万已投入开店）', S.cash===0);
ok('初始状态正确（现金0/需求58/声誉48）', S.cash===0 && S.demand===58 && S.rep===48 && S.month===1);
ok('第1题已显示', S.month===1 && $('scenTitle').textContent.includes('定价'));

/* —— 第 1 环节：现金 0，买不起提示 —— */
const m1=Array.from($('optList').children);
ok('第1环节有3个选项', m1.length===3);
ok('开局提示按钮禁用（现金不足）', $('btnHint').disabled===true);
m1[simulateBest(SCEN[0])].onclick();
ok('小课堂出现（第1环节）', $('explainBox').classList.contains('on'));
ok('结算卡只显示净赚/亏了 + 本月累计', $('resultNote').textContent.includes('本环节净赚') || $('resultNote').textContent.includes('本环节亏了'));
ok('结算卡显示累计净利润', $('resultNote').textContent.includes('本月累计净利润'));
ok('下一题按钮显示', $('btnSettle2').style.display==='block');
ok('第1环节不弹月度结算', $('modal').classList.contains('on')===false);
$('btnSettle2').onclick();
ok('进入第2环节', S.month===2);

/* —— 第 2 环节：赚了钱，可以花收入买提示 —— */
ok('第2环节提示可用（已有收入）', $('btnHint').disabled===false);
const cashBefore=S.cash;
$('btnHint').onclick();
ok('购买提示扣款 ¥'+HINT_PRICE, S.cash===cashBefore-HINT_PRICE);
ok('购买后提示按钮禁用', $('btnHint').disabled===true);
ok('讲解提前出现（小课堂）', $('explainBox').classList.contains('on'));

/* —— 连续答题：2~10 环节，前瞻最优选择（应稳定经营） —— */
let month=S.month;
while(curScreen==='game' && month<=10){
  const btns=Array.from($('optList').children);
  ok('第'+month+'环节有3个选项', btns.length===3);
  btns[simulateBest(SCEN[month-1])].onclick();
  ok('小课堂出现（第'+month+'环节）', $('explainBox').classList.contains('on'));
  ok('下一题/报告按钮显示', $('btnSettle2').style.display==='block');
  ok('现金实时更新', typeof S.cash==='number');
  if(month<10){
    ok('前9环节不弹月度结算', $('modal').classList.contains('on')===false);
  }
  $('btnSettle2').onclick();
  if(S.over) break;
  if($('modal').classList.contains('on')){ $('btnSettle').click(); break; }  // 第10环节最终结算弹层
  if(S.month===month) break;
  month=S.month;
}
console.log('  实际游玩环节数:', month, '/ 10');
ok('完成10个环节（或提前结局）', month>=10 || !!S.over);
ok('结局已触发', !!S.over);
ok('结果屏渲染', curScreen==='result' && $('resTitle').textContent.length>0);
ok('经济足迹展示', $('resFootprint').textContent.includes('综合福祉'));
ok('二周目解锁', NG_UNLOCK===true);

/* —— 破产路径（现金跌破破产线，确定性触发） —— */
newState('profit',{name:'破产测试',shop:'coffee',age:26});
S.cash=BANKRUPT_LINE-500;  // 故意亏穿
S.month=5;
const bt5=Array.from($('optList').children);
choose(SCEN[4].o[0], mockBtn());   // 答一题触发 settle
ok('现金跌破破产线后按钮提示查看结局', $('btnSettle2').textContent.includes('查看结局'));
$('btnSettle2').onclick();
ok('破产结局已触发', S.over==='bankrupt' && curScreen==='result');

/* —— 目标文案含两种模式条件 —— */
const gl=$('goalLine').textContent;
ok('目标区写清利润模式条件', gl.includes('利润模式') && gl.includes(fmtI(PROFIT_GOAL)));
ok('目标区写清口碑模式条件', gl.includes('口碑模式') && gl.includes('80'));

console.log('\\n结果: '+pass+' 通过, '+fail+' 失败');
process.exit(fail?1:0);
`;
(0,eval)(js.replace('"use strict";','') + '\n' + TEST);
