import { chromium } from "playwright";
const BASE="http://127.0.0.1:5603", CODE=process.env.CODE;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const p = await (await b.newContext({viewport:{width:1366,height:1200}})).newPage();
p.on("pageerror",(e)=>console.log("PAGEERROR:",e.message));
const B=async(n,{nth=0}={})=>{await p.getByRole("button",{name:n}).nth(nth).click();await p.waitForTimeout(500);};
const sum=async(l,v)=>{await p.getByLabel(l).first().fill(String(v));await p.getByRole("button",{name:/^Check$/}).first().click();await p.waitForTimeout(700);};
await p.goto(`${BASE}/join`,{waitUntil:"networkidle"});
await p.getByLabel(/class code/i).fill(CODE);
await p.getByRole("button",{name:"Next"}).click();
await p.locator("#display-name").waitFor({timeout:20000});
await p.locator("#display-name").fill("IncProbe");
await p.getByRole("button",{name:/Go in/i}).click(); await p.waitForTimeout(1500);
await p.getByRole("link",{name:/^Start/}).first().click(); await p.waitForTimeout(1200);
await p.getByRole("button",{name:/Start this one/}).nth(1).click(); await p.waitForTimeout(1200);
await B(/Take this booth: Middle Row/);
await sum("What you owe before you open", 390);
await B(/See what is left/);
await B(/No — leave it out: Sunrise Yoga/);
await B(/No — leave it out: Sell-out rebate/);
await sum("What is left to plan with", 1510);
await B(/Split the money/);
// press "+" on Stock as far as it will go, using only the steppers
for (let i=0;i<40;i++){ await p.getByRole("button",{name:/Increase Stock by/}).first().click(); await p.waitForTimeout(50); }
for (let i=0;i<40;i++){ await p.getByRole("button",{name:/Increase Cushion by/}).first().click(); await p.waitForTimeout(50); }
for (let i=0;i<40;i++){ await p.getByRole("button",{name:/Increase Your cut by/}).first().click(); await p.waitForTimeout(50); }
const t = await p.evaluate(()=>document.body.innerText);
console.log("### AFTER MAXING ALL THREE STEPPERS (no closer used) ###");
console.log(t.split("THE OPENING PLAN")[1]?.slice(0,1600) ?? t.slice(0,1600));
// press Check this plan three times to reach the scaffold
for (let i=0;i<3;i++){ await p.getByRole("button",{name:/Check this plan/}).first().click(); await p.waitForTimeout(500); }
const t2 = await p.evaluate(()=>document.body.innerText);
console.log("\n### AFTER 3 REFUSED SAVES ###");
console.log(t2.split("THE OPENING PLAN")[1]?.slice(0,2000) ?? t2.slice(0,2000));
await p.screenshot({path: process.env.OUT+"/increment-impossible.png", fullPage:true});
await b.close();
