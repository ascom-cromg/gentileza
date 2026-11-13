import {test} from 'node:test';
import assert from 'node:assert/strict';
import {cropRect,fitText,wrapText,formats,frames,photoZone,initialDraft,downloadName} from '../lib/atelie/model';
test('photo cover never exposes empty edges, for portrait and landscape images at every crop limit',()=>{
 for(const [iw,ih] of [[400,1000],[1600,900],[1080,1080]])for(const format of Object.keys(formats) as (keyof typeof formats)[])for(const frame of frames)for(const zoom of [1,1.6,3])for(const x of [-1,0,1])for(const y of [-1,0,1]){
  const zone=photoZone(format,frame.id),crop=cropRect(iw,ih,zone,zoom,x,y);
  assert.ok(crop.x<=.001&&crop.y<=.001);
  assert.ok(crop.x+crop.width>=zone.width-.001&&crop.y+crop.height>=zone.height-.001);
  assert.ok(Math.abs(crop.width/crop.height-iw/ih)<.0001);
 }
});
test('wrapping preserves accents, manual breaks and unbroken words without cutting text',()=>{
 const measure=(text:string)=>Array.from(text).length*10;
 assert.deepEqual(wrapText('Olá, você!\n\nQue bom.',110,measure),['Olá, você!','','Que bom.']);
 const value='Carinho'.repeat(20);const lines=wrapText(value,50,measure);assert.equal(lines.join(''),value);assert.ok(lines.every(l=>measure(l)<=50));
});
test('long messages shrink to fit and report overflow instead of silently truncating',()=>{
 const message='Sua presença faz a diferença. '.repeat(8).trim();
 const fit=fitText(message,700,500,27,70,(t,size)=>t.length*size*.5);assert.equal(fit.fits,true);assert.ok(fit.size<70);assert.equal(fit.lines.join(' ').replace(/\s+/g,' '),message);
 const overflow=fitText('Um carinho\n'.repeat(100),700,100,27,70,(t,size)=>t.length*size*.5);assert.equal(overflow.fits,false);assert.ok(overflow.lines.length>=100);
});
test('all three formats are full resolution and keep the crop above the message zone',()=>{
 assert.deepEqual(Object.values(formats).map(f=>[f.width,f.height]),[[1080,1350],[1080,1080],[1080,1920]]);
 for(const f of Object.keys(formats) as (keyof typeof formats)[])for(const frame of frames){const z=photoZone(f,frame.id);assert.ok(z.y>180&&z.x>150&&z.x+z.width<1000&&z.y+z.height<formats[f].height-400);}
});
test('download filenames cannot contain paths or recipient HTML',()=>{
 assert.equal(downloadName({...initialDraft,to:'João da Silva'}),'gentileza-joao-da-silva-post.png');assert.ok(!downloadName({...initialDraft,to:'../../<script>evil</script>'}).includes('/'));
});

test('photo loading rejects non-raster formats and oversized files before decoding',async()=>{
 const {loadPhoto}=await import('../lib/atelie/browser');
 await assert.rejects(loadPhoto(new File(['<svg/>'],'not-a-photo.svg',{type:'image/svg+xml'})),/JPG, PNG ou WebP/);
 await assert.rejects(loadPhoto(new File([new Uint8Array(10*1024*1024+1)],'large.jpg',{type:'image/jpeg'})),/10 MB/);
});
