import http from 'node:http';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const root = existsSync(path.join(scriptRoot, 'vendor', 'three', 'build', 'three.module.js')) ? scriptRoot : path.join(scriptRoot, 'dist');
let port = Number(process.env.PORT || 5173);
const host = process.env.HOST || '127.0.0.1';
const initialPort=port;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png' };
const server=http.createServer(async (req, res) => {
  try {
    const requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + requested);
    if (file !== root && !file.startsWith(root + path.sep)) throw new Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.on('error',error=>{
  if(error.code==='EADDRINUSE'&&port<initialPort+30){port++;server.listen(port,host);return;}
  console.error(`Cannot start Feather Court: ${error.message}`);process.exitCode=1;
});
server.on('listening',()=>{
  const url=`http://${host==='0.0.0.0'?'localhost':host}:${port}`;console.log(`LZYYMQ Feather Court 6.6 is ready: ${url}`);
  if(process.argv.includes('--open')&&process.platform==='win32'){
    const opener=spawn('cmd.exe',['/d','/c','start','',url],{windowsHide:true,stdio:'ignore'});opener.unref();
  }
});
server.listen(port,host);
