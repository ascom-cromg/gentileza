export const palettes = {
  butter: {name:'Raio de sol',paper:'#F6E6A6',light:'#FFFAE8',accent:'#DF633C',deep:'#695B27',soft:'#E3BD59'},
  lavender: {name:'Carinho lilás',paper:'#DFD3EF',light:'#F8F3FF',accent:'#8163A5',deep:'#58416E',soft:'#B6A0D1'},
  sage: {name:'Abraço verde',paper:'#DBE8BF',light:'#F5F8EA',accent:'#69854C',deep:'#445A37',soft:'#A9C27D'},
  peach: {name:'Afeto pêssego',paper:'#F4D1BE',light:'#FFF5EC',accent:'#CD6849',deep:'#784C38',soft:'#E8A689'},
} as const;
export const frames = [
  {id:'garden',name:'Jardim de carinho',detail:'Flores para um dia mais leve',color:'butter'},
  {id:'hug',name:'Um abraço em palavras',detail:'Um coração que acolhe',color:'lavender'},
  {id:'stamp',name:'Selo de afeto',detail:'Entrega especial, direto do coração',color:'sage'},
  {id:'polaroid',name:'Memória boa',detail:'Carinho com jeito de fotografia',color:'peach'},
] as const;
export type Frame = typeof frames[number]['id'];
export type Palette = keyof typeof palettes;
export const formats = {post:{name:'Post',label:'4:5',width:1080,height:1350},square:{name:'Quadrado',label:'1:1',width:1080,height:1080},story:{name:'Story / Status',label:'9:16',width:1080,height:1920}} as const;
export type Format=keyof typeof formats;
export type CardDraft={from:string;to:string;message:string;frame:Frame;palette:Palette;format:Format;zoom:number;x:number;y:number};
export const initialDraft:CardDraft={from:'',to:'',message:'Seu jeito de cuidar faz a diferença. Que bom ter você por perto!',frame:'garden',palette:'butter',format:'post',zoom:1,x:0,y:0};
export const inspirations=[
  'Seu jeito de cuidar faz a diferença. Que bom ter você por perto!',
  'Obrigada por transformar os dias corridos em dias mais leves. Sua parceria vale muito!',
  'Talvez você nem perceba, mas seu sorriso e sua presença deixam tudo melhor.',
  'Hoje o lembrete é simples: seu trabalho importa. E você também.',
];
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function photoZone(format:Format,frame:Frame){
  const h=formats[format].height, height=Math.min(620,Math.round((h-370)*.40));
  const width=frame==='hug'?Math.min(540,Math.round(height*1.3)):600;
  return {x:(1080-width)/2,y:205,width,height};
}
export function cropRect(imageWidth:number,imageHeight:number,box:{width:number;height:number},zoom:number,x:number,y:number){
  const scale=Math.max(box.width/imageWidth,box.height/imageHeight)*clamp(zoom,1,3);
  const width=imageWidth*scale,height=imageHeight*scale;
  return {width,height,x:(box.width-width)/2-clamp(x,-1,1)*(width-box.width)/2,y:(box.height-height)/2-clamp(y,-1,1)*(height-box.height)/2};
}
// Preserve every character, including explicit blank lines and unbroken words.
export function wrapText(value:string,width:number,measure:(text:string)=>number):string[]{
  const lines:string[]=[];
  for(const paragraph of value.replace(/\r\n?/g,'\n').split('\n')){
    if(!paragraph){lines.push('');continue;}
    let line='';
    const words=paragraph.split(/(\s+)/);
    for(const word of words){
      if(measure(line+word)<=width){line+=word;continue;}
      if(line.trim()){lines.push(line.trimEnd());line='';}
      if(!word.trim())continue;
      let part='';
      for(const char of Array.from(word)){
        if(part&&measure(part+char)>width){lines.push(part);part='';}
        part+=char;
      }
      line=part;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}
export function fitText(value:string,width:number,height:number,min:number,max:number,measure:(text:string,size:number)=>number){
  for(let size=max;size>=min;size--){
    const lines=wrapText(value,width,text=>measure(text,size)),lineHeight=size*1.23;
    if(lines.length*lineHeight<=height&&lines.every(l=>measure(l,size)<=width+.1))return {size,lines,lineHeight,fits:true};
  }
  return {size:min,lines:wrapText(value,width,text=>measure(text,min)),lineHeight:min*1.23,fits:false};
}
export function downloadName(draft:CardDraft){const name=draft.to.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,36);return 'gentileza'+(name?'-'+name:'')+'-'+draft.format+'.png';}
