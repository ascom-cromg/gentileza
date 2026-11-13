import {palettes,formats,photoZone,cropRect,fitText,type CardDraft,type Frame} from './model';
export type Photo={source:CanvasImageSource;width:number;height:number};
export type Assets={logo:HTMLImageElement;photo?:Photo};
const INK='#30332B',CREAM='#FFFDF5';
type C=CanvasRenderingContext2D;
function rounded(c:C,x:number,y:number,w:number,h:number,r=28){c.beginPath();c.roundRect(x,y,w,h,r);}
function fill(c:C,color:string){c.fillStyle=color;c.fill();}
function stroke(c:C,color=INK,width=2.5){c.strokeStyle=color;c.lineWidth=width;c.stroke();}
function label(c:C,text:string,x:number,y:number,size:number,color=INK,align:CanvasTextAlign='left',font='Body',weight=400){c.font=`${weight} ${size}px ${font}`;c.fillStyle=color;c.textAlign=align;c.fillText(text,x,y);}
function smile(c:C,x:number,y:number,r:number){c.save();c.strokeStyle=INK;c.lineWidth=Math.max(2,r*.055);c.lineCap='round';c.fillStyle=INK;for(const dx of [-.28,.28]){c.beginPath();c.ellipse(x+dx*r,y-r*.1,r*.045,r*.085,0,0,Math.PI*2);c.fill();}c.beginPath();c.arc(x,y+r*.03,r*.42,.12*Math.PI,.88*Math.PI);c.stroke();c.restore();}
function flower(c:C,x:number,y:number,r:number,color:string,center=CREAM,face=false){c.save();c.translate(x,y);for(let i=0;i<8;i++){c.save();c.rotate(i*Math.PI/4);c.beginPath();c.ellipse(0,-r*.62,r*.3,r*.49,0,0,Math.PI*2);fill(c,color);c.restore();}c.beginPath();c.arc(0,0,r*.41,0,Math.PI*2);fill(c,center);if(face)smile(c,0,0,r*.65);c.restore();}
function heartPath(c:C,x:number,y:number,w:number,h:number){c.beginPath();c.moveTo(x+w*.5,y+h*.98);c.bezierCurveTo(x+w*.1,y+h*.7,x-w*.14,y+h*.3,x+w*.08,y+h*.1);c.bezierCurveTo(x+w*.26,y-h*.09,x+w*.47,y+h*.02,x+w*.5,y+h*.22);c.bezierCurveTo(x+w*.54,y+h*.02,x+w*.77,y-h*.09,x+w*.93,y+h*.1);c.bezierCurveTo(x+w*1.17,y+h*.3,x+w*.87,y+h*.75,x+w*.5,y+h*.98);c.closePath();}
function heart(c:C,x:number,y:number,size:number,color:string,outline=false){heartPath(c,x-size/2,y-size/2,size,size);if(outline)stroke(c,color,3);else fill(c,color);}
function spark(c:C,x:number,y:number,r:number,color:string){c.beginPath();for(let i=0;i<24;i++){const a=i*Math.PI/12-Math.PI/2,rr=i%2?r*.52:r;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();fill(c,color);}
function sprig(c:C,x:number,y:number,h:number,color:string,mirror=1){c.save();c.translate(x,y);c.scale(mirror,1);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(-25,-h*.55,18,-h);stroke(c,color,3);for(let i=0;i<4;i++){const cy=-h*(.23+i*.19),cx=i*4-5;c.beginPath();c.ellipse(cx-15,cy,23,10,.65,0,Math.PI*2);fill(c,color);c.beginPath();c.ellipse(cx+22,cy-19,24,10,-.65,0,Math.PI*2);fill(c,color);}c.restore();}
function trail(c:C,x:number,y:number,w:number,h:number,color:string){c.save();c.beginPath();c.moveTo(x,y);c.bezierCurveTo(x-w,y+h*.1,x+w*1.1,y+h*.9,x+w*.1,y+h);c.setLineDash([6,9]);stroke(c,color,2);c.restore();}
function scallop(c:C,x:number,y:number,w:number,h:number,r=19){rounded(c,x,y,w,h,20);fill(c,CREAM);c.beginPath();for(let cx=x+r;cx<x+w;cx+=r*2){c.moveTo(cx+r,y);c.arc(cx,y,r,0,Math.PI*2);c.moveTo(cx+r,y+h);c.arc(cx,y+h,r,0,Math.PI*2);}for(let cy=y+r;cy<y+h;cy+=r*2){c.moveTo(x+r,cy);c.arc(x,cy,r,0,Math.PI*2);c.moveTo(x+w+r,cy);c.arc(x+w,cy,r,0,Math.PI*2);}fill(c,CREAM);}
function stamp(c:C,x:number,y:number,w:number,h:number,paper:string){rounded(c,x,y,w,h,8);fill(c,CREAM);c.beginPath();for(let cx=x+18;cx<x+w;cx+=36){c.moveTo(cx+9,y);c.arc(cx,y,9,0,Math.PI*2);c.moveTo(cx+9,y+h);c.arc(cx,y+h,9,0,Math.PI*2);}for(let cy=y+18;cy<y+h;cy+=36){c.moveTo(x+9,cy);c.arc(x,cy,9,0,Math.PI*2);c.moveTo(x+w+9,cy);c.arc(x+w,cy,9,0,Math.PI*2);}fill(c,paper);c.save();c.setLineDash([4,7]);rounded(c,x+19,y+19,w-38,h-38,6);stroke(c,'#A5AE98',1.4);c.restore();}
function envelope(c:C,x:number,y:number,w:number,color:string){c.save();c.translate(x,y);c.rotate(-.14);rounded(c,0,0,w,w*.66,8);fill(c,CREAM);stroke(c,INK,2.5);c.beginPath();c.moveTo(0,0);c.lineTo(w*.5,w*.39);c.lineTo(w,0);stroke(c,INK,2.5);c.beginPath();c.moveTo(0,w*.66);c.lineTo(w*.34,w*.3);c.moveTo(w,w*.66);c.lineTo(w*.67,w*.3);stroke(c,INK,2);heart(c,w*.5,w*.38,w*.24,color);c.restore();}
function hands(c:C,x:number,y:number,scale:number,color:string,mirror=1){c.save();c.translate(x,y);c.scale(scale*mirror,scale);c.beginPath();c.moveTo(-70,170);c.bezierCurveTo(-50,100,-40,60,-4,22);c.bezierCurveTo(8,8,26,20,17,37);c.lineTo(-2,72);c.bezierCurveTo(46,62,86,83,88,104);c.bezierCurveTo(90,121,72,130,51,126);c.lineTo(31,122);c.bezierCurveTo(17,139,12,157,5,184);c.closePath();fill(c,CREAM);stroke(c,color,3);c.beginPath();c.moveTo(0,74);c.quadraticCurveTo(16,78,31,95);c.moveTo(36,106);c.lineTo(71,114);stroke(c,color,2.5);c.restore();}
function header(c:C,d:CardDraft,h:number){const p=palettes[d.palette];label(c,'gentileza',80,83,36,INK,'left','Circula',700);label(c,'circula.',80,118,36,INK,'left','Circula',700);label(c,'UM CARINHO COM A SUA CARA',80,158,13,p.deep,'left','Body',600);c.save();c.translate(925,105);c.rotate(.14);spark(c,0,0,62,p.accent);heart(c,0,0,46,CREAM);c.restore();}
function footer(c:C,d:CardDraft,h:number,logo:HTMLImageElement){const p=palettes[d.palette];label(c,'FEITO DE PESSOAS.',82,h-82,14,p.deep,'left','Body',600);label(c,'FEITO PARA PESSOAS.',82,h-58,14,p.deep,'left','Body',600);rounded(c,808,h-115,190,72,16);fill(c,INK);c.drawImage(logo,825,h-105,156,48.75);}
function mask(c:C,frame:Frame,x:number,y:number,w:number,h:number){if(frame==='garden'){const r=w/2;c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+r*.83);c.bezierCurveTo(x,y-r*.28,x+w,y-r*.28,x+w,y+r*.83);c.lineTo(x+w,y+h);c.quadraticCurveTo(x+w*.5,y+h+24,x,y+h);c.closePath();}else if(frame==='hug')heartPath(c,x,y,w,h);else if(frame==='stamp'){c.beginPath();c.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,Math.PI*2);}else rounded(c,x,y,w,h,3);}
function photoFrame(c:C,d:CardDraft,photo:Photo){const p=palettes[d.palette],z=photoZone(d.format,d.frame);c.save();if(d.frame==='polaroid'){c.translate(540,z.y+z.height/2);c.rotate(-.065);c.translate(-540,-z.y-z.height/2);rounded(c,z.x-26,z.y-25,z.width+52,z.height+88,5);c.shadowColor='#43372A20';c.shadowBlur=22;c.shadowOffsetY=10;fill(c,CREAM);c.shadowColor='transparent';label(c,'um momento bom pra guardar.',540,z.y+z.height+44,20,p.deep,'center','Georgia');}else{if(d.frame==='stamp')stamp(c,z.x-32,z.y-32,z.width+64,z.height+64,p.paper);else{mask(c,d.frame,z.x-18,z.y-18,z.width+36,z.height+36);fill(c,CREAM);}}mask(c,d.frame,z.x,z.y,z.width,z.height);c.clip();const rect=cropRect(photo.width,photo.height,z,d.zoom,d.x,d.y);c.drawImage(photo.source,z.x+rect.x,z.y+rect.y,rect.width,rect.height);c.restore();if(d.frame==='garden'){flower(c,z.x-16,z.y+z.height-35,78,p.accent,p.light,true);flower(c,z.x+z.width+5,z.y+65,56,p.soft);}else if(d.frame==='hug'){hands(c,z.x-25,z.y+z.height-125,1.05,p.deep);hands(c,z.x+z.width+25,z.y+z.height-125,1.05,p.deep,-1);heart(c,850,z.y+45,40,p.accent);}else if(d.frame==='stamp'){spark(c,z.x+z.width+5,z.y+30,60,p.accent);heart(c,z.x-30,z.y+z.height-25,70,p.accent);}else{flower(c,z.x+z.width+20,z.y+25,70,p.accent,p.light,true);heart(c,z.x-30,z.y+z.height-15,60,p.accent);}}
export type RenderResult={fits:boolean;fontSize:number};
export function drawCard(c:C,d:CardDraft,assets:Assets,scale=1):RenderResult{
 const h=formats[d.format].height,p=palettes[d.palette],hasPhoto=!!assets.photo;
 c.save();c.setTransform(scale,0,0,scale,0,0);c.clearRect(0,0,1080,h);c.fillStyle=p.paper;c.fillRect(0,0,1080,h);header(c,d,h);
 const zone=photoZone(d.format,d.frame),panelTop=hasPhoto?zone.y+zone.height+(d.frame==='polaroid'?84:62):255,panelBottom=h-178;
 if(!hasPhoto){
  if(d.frame==='garden'){scallop(c,112,panelTop+22,856,panelBottom-panelTop-30,19);flower(c,135,panelTop+38,89,p.accent,p.light,true);flower(c,934,panelBottom-12,95,p.soft,p.light);sprig(c,112,panelBottom-100,145,p.deep);sprig(c,969,panelTop+230,130,p.deep,-1);}
  else if(d.frame==='hug'){rounded(c,116,panelTop+14,848,panelBottom-panelTop,140);fill(c,p.light);heart(c,540,panelTop+82,76,p.accent);hands(c,120,panelBottom-170,1.15,p.deep);hands(c,960,panelBottom-170,1.15,p.deep,-1);heart(c,150,panelTop+210,38,p.accent);heart(c,935,panelTop+210,38,p.accent);}
  else if(d.frame==='stamp'){stamp(c,110,panelTop,860,panelBottom-panelTop+20,p.paper);envelope(c,86,panelTop+85,115,p.accent);spark(c,948,panelBottom-55,76,p.accent);}
  else{c.save();c.translate(540,(panelTop+panelBottom)/2);c.rotate(-.035);rounded(c,-422,-(panelBottom-panelTop)/2,844,panelBottom-panelTop+20,8);c.shadowColor='#51342818';c.shadowBlur=20;c.shadowOffsetY=10;fill(c,CREAM);c.restore();flower(c,931,panelTop+20,83,p.accent,p.light,true);heart(c,135,panelBottom-30,76,p.accent);}
 }
 if(hasPhoto)photoFrame(c,d,assets.photo!);
 // Doodles are deliberately kept outside the type and crop areas.
 if(hasPhoto){sprig(c,100,zone.y+zone.height-25,140,p.deep);trail(c,950,zone.y+125,60,200,p.deep);heart(c,112,zone.y+90,38,p.accent);}
 else{trail(c,66,panelTop+190,33,190,p.deep);spark(c,989,panelTop+130,28,p.accent);}
 const textTop=hasPhoto?panelTop:panelTop+(d.frame==='hug'?150:108);
 const name=(d.to.trim()||'Alguém especial');
 label(c,'PARA',540,textTop,14,p.deep,'center','Body',600);
 const nameFit=fitText(name,730,70,24,42,(t,s)=>{c.font=`700 ${s}px Circula`;return c.measureText(t).width;});
 c.font=`700 ${nameFit.size}px Circula`;c.fillStyle=INK;c.textAlign='center';nameFit.lines.forEach((l,i)=>c.fillText(l,540,textTop+52+i*nameFit.lineHeight));
 const bodyTop=textTop+100,bodyBottom=panelBottom-114;
 const value=d.message.trim()||'Uma gentileza sua vai ficar linda aqui.';
 const fit=fitText(value,hasPhoto?790:690,bodyBottom-bodyTop,hasPhoto?27:32,hasPhoto?57:70,(t,s)=>{c.font=`400 ${s}px Georgia`;return c.measureText(t).width;});
 if(fit.fits){const blockHeight=fit.lines.length*fit.lineHeight;const y=bodyTop+(bodyBottom-bodyTop-blockHeight)/2+fit.size;c.fillStyle=INK;c.textAlign='center';c.font=`400 ${fit.size}px Georgia`;fit.lines.forEach((line,i)=>c.fillText(line,540,y+i*fit.lineHeight));}
 else{label(c,'Seu carinho merece espaço.',540,(bodyTop+bodyBottom)/2,32,p.deep,'center','Georgia');label(c,'Encurte a mensagem ou escolha um formato maior.',540,(bodyTop+bodyBottom)/2+43,22,p.deep,'center');}
 label(c,'com carinho,',540,panelBottom-57,21,p.deep,'center','Georgia');
 const fromFit=fitText(d.from.trim()||'Alguém que te deseja bem',700,45,20,28,(t,s)=>{c.font=`600 ${s}px Body`;return c.measureText(t).width;});
 c.font=`600 ${fromFit.size}px Body`;c.fillStyle=INK;c.textAlign='center';fromFit.lines.forEach((line,i)=>c.fillText(line,540,panelBottom-17+i*fromFit.lineHeight));
 footer(c,d,h,assets.logo);c.restore();return {fits:fit.fits&&nameFit.fits&&fromFit.fits,fontSize:fit.size};
}
