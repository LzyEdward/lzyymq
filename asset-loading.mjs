// Optional visual assets must never hold the entire court behind a spinner.
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
 const [vertices,indices]=new Uint32Array(buffer,0,2);
 if(vertices<100||vertices>1000000||indices<300||indices>6000000||indices%3)throw new Error('手部模型格式无效');
 const indexOffset=Math.ceil((8+vertices*21)/4)*4;
 if(buffer.byteLength!==indexOffset+indices*4)throw new Error('手部模型下载不完整');
 return {vertices,indices,indexOffset};
}
