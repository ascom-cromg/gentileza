import {formats,type CardDraft} from './model';
import type {Photo} from './drawing';
export async function loadLogo(){
  await Promise.all([document.fonts.load('700 42px Circula'),document.fonts.load('400 36px Circula'),document.fonts.load('600 24px Body'),document.fonts.load('400 24px Body')]);
  const logo=new Image();logo.src='/brand/cromg-white.png';await logo.decode();return logo;
}
export async function loadPhoto(file:File):Promise<Photo>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Escolha uma foto JPG, PNG ou WebP. Para HEIC, salve uma cópia em JPG.');
  if(file.size>10*1024*1024)throw new Error('Escolha uma foto de até 10 MB.');
  let bitmap:ImageBitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new Error('Não conseguimos abrir essa foto. Tente uma cópia em JPG ou PNG.');}
  if(bitmap.width<160||bitmap.height<160){bitmap.close();throw new Error('Essa foto está muito pequena. Escolha uma com pelo menos 160 × 160 pixels.');}
  if(bitmap.width*bitmap.height>80000000){bitmap.close();throw new Error('Essa foto é muito grande. Use uma versão menor.');}
  const ratio=Math.min(1,2200/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
  const c=canvas.getContext('2d');if(!c){bitmap.close();throw new Error('Não foi possível preparar a foto.');}
  c.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  return {source:canvas,width:canvas.width,height:canvas.height};
}
export function disposePhoto(photo:Photo|null){if(photo?.source instanceof ImageBitmap)photo.source.close();}
export function canvasBlob(canvas:HTMLCanvasElement){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Não foi possível criar a imagem.')),'image/png'));}
export function saveBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export function setCanvasSize(canvas:HTMLCanvasElement,draft:CardDraft){const size=formats[draft.format];if(canvas.width!==size.width)canvas.width=size.width;if(canvas.height!==size.height)canvas.height=size.height;}
