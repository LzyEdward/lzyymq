// Optional visual assets must never hold the entire court behind a spinner.
export async function decodeAssetBuffer(buffer){
 const bytes=new Uint8Array(buffer);
 // Some servers transparently decode content. Check the bytes rather than
 // blindly decompressing based on the file suffix or response MIME type.
 if(bytes[0]!==0x1f||bytes[1]!==0x8b)return buffer;
 if(typeof DecompressionStream==='undefined')throw new Error('浏览器不支持压缩模型');
 return new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
}
export async function boundedAsset(load,{timeout=10000,label='资源',fallback=null,onWarning=()=>{}}={}){
 const controller=new AbortController();let timer,expired=false;
 try{
  return await Promise.race([
   Promise.resolve().then(()=>load(controller.signal)),
   new Promise((_,reject)=>{timer=setTimeout(()=>{expired=true;controller.abort();reject(new Error(`${label}加载超时`));},timeout);}),
  ]);
 }catch(error){onWarning({label,reason:expired?'timeout':'load',message:error.message});return typeof fallback==='function'?fallback():fallback;}
 finally{clearTimeout(timer);}
}

export function handBufferLayout(buffer){
 if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<8)throw new Error('手部模型数据不完整');
 const first=new Uint32Array(buffer,0,2),modern=first[0]===0x32444846;
 if(modern&&buffer.byteLength<16)throw new Error('手部UV模型数据不完整');
 const [vertices,indices]=modern?new Uint32Array(buffer,4,2):first;
 if(vertices<100||vertices>1000000||indices<300||indices>6000000||indices%3)throw new Error('手部模型格式无效');
 const positionOffset=modern?16:8,uvOffset=Math.ceil((positionOffset+vertices*21)/4)*4;
 const indexOffset=uvOffset+(modern?vertices*8:0);
 if(buffer.byteLength!==indexOffset+indices*4)throw new Error('手部模型下载不完整');
 return modern?{vertices,indices,indexOffset,positionOffset,uvOffset}:{vertices,indices,indexOffset};
}
