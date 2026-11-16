import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const imports=()=>/\b(from\s*|import\s*\(\s*|import\s*)(['"])(\.[^'"\s]+\.(?:mjs|js))\2/g;
const digest=text=>createHash('sha256').update(text).digest('hex').slice(0,16);

// The URL of an unchanged engine or mesh-data module stays reusable across
// releases. Its digest includes all transitive imports, preventing a cached
// parent from silently keeping an obsolete dependency after an update.
export async function versionLocalAssets(root){
 const files=new Map();
 async function scan(dir=''){
  for(const entry of await readdir(path.join(root,dir),{withFileTypes:true})){
   if(entry.name.startsWith('.'))continue;
   const file=path.posix.join(dir,entry.name);
   if(entry.isDirectory())await scan(file);
   else if(/\.(?:mjs|js|html|css)$/.test(file))files.set(file,await readFile(path.join(root,file),'utf8'));
  }
 }
 await scan();
 const resolve=(from,url)=>path.posix.normalize(path.posix.join(path.posix.dirname(from),url));
 const dependencies=new Map();
 for(const [file,text]of files)if(/\.(?:mjs|js|html)$/.test(file)){
  dependencies.set(file,[...text.matchAll(imports())].map(m=>resolve(file,m[3])));
 }
 const versions=new Map();
 for(const file of files.keys()){
  const reachable=new Set();
  function visit(name){
   if(reachable.has(name))return;
   if(!files.has(name))throw Error(`Missing local import ${name} referenced by ${file}`);
   reachable.add(name);for(const next of dependencies.get(name)||[])visit(next);
  }
  visit(file);
  versions.set(file,digest([...reachable].sort().map(name=>`${name}\0${files.get(name)}`).join('\0')));
 }
 for(const [file,source]of files){
  if(!/\.(?:mjs|js|html)$/.test(file))continue;
  let text=source.replace(imports(),(_,prefix,quote,url)=>`${prefix}${quote}${url}?v=${versions.get(resolve(file,url))}${quote}`);
  if(file.endsWith('.html'))text=text.replace(/(src|href)="(\.\/[^"?]+\.(?:css|mjs|js))"/g,(_,attr,url)=>`${attr}="${url}?v=${versions.get(resolve(file,url))}"`);
  await writeFile(path.join(root,file),text);
 }
 return versions;
}
