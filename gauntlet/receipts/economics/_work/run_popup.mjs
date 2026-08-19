import { chromium } from "playwright";
import fs from "node:fs";
const BASE="http://127.0.0.1:5603", CODE=process.env.CODE, OUT=process.env.OUT;
fs.mkdirSync(OUT,{recursive:true});
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await (await b.newContext({viewport:{width:1366,height:1400}})).newPage();
p.on("pageerror",(e)=>console.log("PAGEERROR:",e.message));
let step=0;
const dump=async(tag)=>{step+=1;const n=String(step).padStart(2,"0");
  const t=await p.evaluate(()=>document.body.innerText);
  fs.writeFileSync(`${OUT}/${n}-${tag}.txt`,t);
  await p.screenshot({path:`${OUT}/${n}-${tag}.png`,fullPage:true});
  console.log(`\n===== ${n} ${tag} =====\n${t}`);};
const ctrls=async()=>{const o=[];
  for(const e of await p.locator("button:visible").all()) o.push("«"+(((await e.innerText())||(await e.getAttribute("aria-label"))||"").replace(/\s+/g," ").trim())+"»"+((await e.getAttribute("aria-disabled"))==="true"?"[DIS]":""));
  console.log("BTNS:",JSON.stringify(o));};
const B=async(n,{nth=0}={})=>{await p.getByRole("button",{name:n}).nth(nth).click();await p.waitForTimeout(600);};
const sum=async(l,v)=>{await p.getByLabel(l).first().fill(String(v));await p.getByRole("button",{name:/^Check$/}).first().click();await p.waitForTimeout(750);};
const push=async(l,k)=>{for(let i=0;i<k;i++){await p.getByRole("button",{name:new RegExp("Increase "+l+" by")}).first().click();await p.waitForTimeout(45);}};
try{
await p.goto(`${BASE}/join`,{waitUntil:"networkidle"});
await p.getByLabel(/class code/i).fill(CODE);
await p.getByRole("button",{name:"Next"}).click();
await p.locator("#display-name").waitFor({timeout:20000});
await p.locator("#display-name").fill("FullRun");
await p.getByRole("button",{name:/Go in/i}).click(); await p.waitForTimeout(1400);
await p.getByRole("link",{name:/^Start/}).first().click(); await p.waitForTimeout(1100);
await p.getByRole("button",{name:/Start this one/}).nth(1).click(); await p.waitForTimeout(1100);
await B(/Take this booth: Middle Row/);
await sum("What you owe before you open", 390);
await B(/See what is left/);
await B(/Yes — count it in: Sunrise Yoga/);
await B(/No — leave it out: Sell-out rebate/);
await sum("What is left to plan with", 1510);
await B(/Split the money/);
// cover line: Cushion  (the 3 buttons named Stock/Cushion/Your cut above the lines)
await B(/^Cushion$/);
await push("Stock",16);      // 800
await push("Cushion",10);    // 500
await dump("plan-before-closer"); await ctrls();
await B(/Your cut \$470/);   // closer -> cut
await dump("plan-balanced");
await B(/Lock the plan in/);
await dump("first-saturday");
await sum("What the order costs", 180);
await B(/Open the doors/);
await dump("sat1-result"); await ctrls();
// tips jar: pay the cool box ($75)
try{ await B(/Pay for this/,{nth:0}); }catch(e){console.log("tip1",e.message);}
await B(/It can wait, even if it costs more\./);
await B(/Book Marisol/);
await dump("standing"); await ctrls();
await B(/Cook both nights/);
await dump("sat23"); await ctrls();
await B(/Find the money/);
await dump("generator"); await ctrls();

}catch(e){console.log("ERR",e.message);await dump("error");}
await b.close();
