const fs=require('fs');const {spawn}=require('child_process');const {frame,DUR}=require('./frame');const {FONTS}=require('./keys');const {chromium}=require('playwright');
(async()=>{
 fs.writeFileSync('out/stage.html',`<html><head><style>${FONTS} html,body{margin:0;background:#131019}</style></head><body><div id=s></div><span style="font-family:'Noto Sans Lao';font-weight:700">ໄປ</span><span style="font-family:'Space Grotesk';font-weight:700">a</span><span style="font-family:'Space Grotesk';font-weight:500">a</span></body></html>`);
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
 await p.goto('file://'+__dirname+'/out/stage.html');await p.evaluate(()=>document.fonts.ready);
 const FPS=30,N=Math.round(DUR*FPS);
 const ff=spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate',String(FPS),'-c:v','mjpeg','-i','-','-c:v','libx264','-preset','veryfast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart','out/paisaidee-advert.mp4'],{stdio:['pipe','inherit','inherit']});
 for(let i=0;i<N;i++){await p.evaluate(s=>{document.getElementById('s').innerHTML=s},frame(i/FPS));const buf=await p.screenshot({type:'jpeg',quality:93,clip:{x:0,y:0,width:1080,height:1920}});if(!ff.stdin.write(buf))await new Promise(r=>ff.stdin.once('drain',r));}
 ff.stdin.end();await new Promise(r=>ff.on('close',r));await b.close();console.log('frames',N);
})();
