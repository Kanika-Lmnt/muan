const fs=require('fs');const {frame}=require('./frame');const {chromium}=require('playwright');
const FONTS=`@font-face{font-family:'Noto Sans Lao';font-weight:700;src:url(${'file://'+__dirname}/node_modules/@fontsource/noto-sans-lao/files/noto-sans-lao-lao-700-normal.woff2)}
@font-face{font-family:'Space Grotesk';font-weight:500;src:url(${'file://'+__dirname}/node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2)}
@font-face{font-family:'Space Grotesk';font-weight:700;src:url(${'file://'+__dirname}/node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2)}
@font-face{font-family:'Space Grotesk';font-weight:500;src:url(${'file://'+__dirname}/node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2)}`;
module.exports={FONTS};
if(require.main===module)(async()=>{
 fs.writeFileSync('out/stage.html',`<html><head><style>${FONTS} html,body{margin:0;background:#131019}</style></head><body><div id=s></div><span style="font-family:'Noto Sans Lao';font-weight:700">ໄປ</span><span style="font-family:'Space Grotesk';font-weight:700">a</span><span style="font-family:'Space Grotesk';font-weight:500">a</span></body></html>`);
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto('file://'+__dirname+'/out/stage.html');await p.evaluate(()=>document.fonts.ready);
 const ts=process.argv.slice(2).map(Number);
 for(const t of ts){await p.evaluate(s=>{document.getElementById('s').innerHTML=s},frame(t));await p.screenshot({path:`out/k_${t}.png`,clip:{x:0,y:0,width:1080,height:1920}});}
 await b.close();
})();
