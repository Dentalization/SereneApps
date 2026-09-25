"""Self-contained offline review page; no automatic dental mask is generated."""
import base64
import json


def annotation_page(template, previews):
    payload = {"videoSha256": template["videoSha256"], "frames": [
        {"frameIndex": frame["frameIndex"], "image": "data:image/jpeg;base64," +
         base64.b64encode(previews[frame["preview"]]).decode("ascii")}
        for frame in template["frames"]]}
    serialized = json.dumps(payload, separators=(",", ":"), ensure_ascii=True).replace("<", "\\u003c")
    return _PAGE.replace("__PAYLOAD__", serialized)


_PAGE = r'''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Private dental frame review</title>
<style>
body{font:16px system-ui;background:#101827;color:#eef3ff;margin:0;padding:20px}main{max-width:1100px;margin:auto}
h1{font-size:25px}p{line-height:1.5;color:#c6d2e8}label{display:block;margin:12px 0}
input,select,button{font:inherit;padding:9px;border-radius:8px;border:1px solid #70809c;background:#202d43;color:white}
input[type=text]{width:min(100%,650px)}button{cursor:pointer;margin:5px 5px 5px 0}
.stage{position:relative;width:fit-content;max-width:100%;margin:12px 0}.stage img{display:block;max-width:100%;max-height:70vh}
.stage canvas{position:absolute;inset:0;width:100%;height:100%;cursor:crosshair}
.row{display:flex;flex-wrap:wrap;gap:18px}.note{border:1px solid #465875;border-radius:10px;padding:12px}
#error{color:#ff9f9f;white-space:pre-wrap}small{color:#aabbd7}
</style><main>
<h1>Private dental-region review</h1>
<p>Draw only visible tooth surfaces. Each accepted frame needs an explicit mouth-stability decision and visible-region labels. This page runs offline; a typed reviewer name is an operator declaration, not verified clinical identity. Never mark a full image as teeth to pass the gate.</p>
<label>Reviewer label <input id="reviewer" type="text" placeholder="Operator name or study code"></label>
<label>Expected region labels, comma separated <input id="regions" type="text" placeholder="anterior,left_posterior,right_posterior"></label>
<label>Optional expected FDI tooth IDs, comma separated <input id="teeth" type="text" placeholder="11,12,13"></label>
<p class="note"><span id="position"></span> · SHA-256 <code id="hash"></code></p>
<div class="row"><label><input type="checkbox" id="use"> Accept this frame</label>
<label><input type="checkbox" id="stable"> Mouth position stable on this frame</label></div>
<label>Visible region labels on this frame <input id="visible" type="text" placeholder="anterior,left_posterior"></label>
<label>Polygon to draw <select id="mode"><option value="roi">Dental ROI</option></select></label>
<small>Click polygon vertices. Use Clear selected polygon to redraw. Optional tooth polygons must stay inside the dental ROI.</small>
<div class="stage"><img id="preview" alt="Video frame for private annotation"><canvas id="canvas"></canvas></div>
<button id="back">Previous</button><button id="next">Next</button><button id="clear">Clear selected polygon</button>
<button id="export">Export reviewed JSON</button><p id="error" role="alert"></p>
</main><script>
const payload=__PAYLOAD__;
const $=id=>document.getElementById(id);
const drafts=Object.fromEntries(payload.frames.map(frame=>[frame.frameIndex,{use:false,stable:false,visible:'',roi:[],teeth:{}}]));
let cursor=0;
const list=value=>value.split(',').map(v=>v.trim()).filter(Boolean);
const unique=values=>[...new Set(values)];
function draft(){return drafts[payload.frames[cursor].frameIndex]}
function toothIds(){return unique(list($('teeth').value)).map(Number).filter(n=>Number.isInteger(n)&&[1,2,3,4].includes(Math.floor(n/10))&&n%10>=1&&n%10<=8)}
function options(){const prior=$('mode').value;$('mode').innerHTML='<option value="roi">Dental ROI</option>';
  for(const id of toothIds()){const option=document.createElement('option');option.value=String(id);option.textContent='Tooth '+id;$('mode').append(option)}
  $('mode').value=[...$('mode').options].some(o=>o.value===prior)?prior:'roi';draw()}
function polygon(){return $('mode').value==='roi'?draft().roi:(draft().teeth[$('mode').value]??=[])}
function draw(){const canvas=$('canvas'),image=$('preview');if(!image.naturalWidth)return;
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);
  function paint(points,color){if(!points?.length)return;context.beginPath();points.forEach(([x,y],i)=>i?context.lineTo(x*canvas.width,y*canvas.height):context.moveTo(x*canvas.width,y*canvas.height));
    if(points.length>2)context.closePath();context.lineWidth=Math.max(2,canvas.width/300);context.strokeStyle=color;context.stroke();
    for(const [x,y] of points){context.beginPath();context.arc(x*canvas.width,y*canvas.height,Math.max(4,canvas.width/160),0,Math.PI*2);context.fillStyle=color;context.fill()}}
  paint(draft().roi,'#4ce7c3');for(const [id,points] of Object.entries(draft().teeth))paint(points,id===$('mode').value?'#ffd455':'#f59fc1')}
function show(){const frame=payload.frames[cursor],item=draft();$('position').textContent=`Frame ${cursor+1}/${payload.frames.length} · decoded index ${frame.frameIndex}`;
  $('use').checked=item.use;$('stable').checked=item.stable;$('visible').value=item.visible;
  $('preview').onload=draw;$('preview').src=frame.image;$('error').textContent='';draw()}
$('hash').textContent=payload.videoSha256;$('teeth').addEventListener('input',options);
$('mode').addEventListener('change',draw);$('use').addEventListener('change',event=>draft().use=event.target.checked);
$('stable').addEventListener('change',event=>draft().stable=event.target.checked);
$('visible').addEventListener('input',event=>draft().visible=event.target.value);
$('canvas').addEventListener('click',event=>{const box=event.target.getBoundingClientRect();polygon().push([
  Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),Math.max(0,Math.min(1,(event.clientY-box.top)/box.height))]);draw()});
$('clear').onclick=()=>{if($('mode').value==='roi')draft().roi=[];else draft().teeth[$('mode').value]=[];draw()};
$('back').onclick=()=>{cursor=Math.max(0,cursor-1);show()};$('next').onclick=()=>{cursor=Math.min(payload.frames.length-1,cursor+1);show()};
$('export').onclick=()=>{try{const reviewer=$('reviewer').value.trim(),expected=unique(list($('regions').value)),expectedTeeth=toothIds(),rawTeeth=list($('teeth').value);
  if(!reviewer||!expected.length)throw Error('Enter a reviewer label and expected region labels.');
  if(rawTeeth.length!==expectedTeeth.length)throw Error('Expected tooth IDs must be unique valid adult FDI numbers.');
  const frames=payload.frames.filter(frame=>drafts[frame.frameIndex].use).map(frame=>{const item=drafts[frame.frameIndex],visible=unique(list(item.visible));
    if(item.roi.length<3)throw Error(`Frame ${frame.frameIndex}: draw a dental polygon with at least three points.`);
    if(visible.some(label=>!expected.includes(label)))throw Error(`Frame ${frame.frameIndex}: a visible label is not in expected regions.`);
    const toothRegions=Object.entries(item.teeth).filter(([,points])=>points.length).map(([fdi,points])=>{
      if(points.length<3||!expectedTeeth.includes(Number(fdi)))throw Error(`Frame ${frame.frameIndex}: invalid tooth polygon ${fdi}.`);
      return {fdi:Number(fdi),polygon:points}});
    return {frameIndex:frame.frameIndex,polygon:item.roi,mouthStable:item.stable,visibleRegions:visible,toothRegions}});
  if(frames.length<3)throw Error('Accept at least three independently reviewed frames.');
  if(expected.some(label=>!frames.some(frame=>frame.visibleRegions.includes(label))))throw Error('An expected region is absent from every accepted frame.');
  const output={source:'operator_annotated_unverified',reviewer,videoSha256:payload.videoSha256,expectedRegions:expected,
    expectedToothIds:expectedTeeth,frames};
  const anchor=document.createElement('a');anchor.href=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)],{type:'application/json'}));
  anchor.download=`dentalRegions-${payload.videoSha256.slice(0,12)}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(anchor.href),1000);
  $('error').textContent='Exported. The Python gate will still check hashes, polygon geometry and frame quality.';
  }catch(error){$('error').textContent=error.message}};
options();show();
</script></html>'''
