import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {buildAnatomicalHand} from './tools/compile-hand-anatomy.mjs';
import {buildPlayerArm} from './tools/compile-player-arm.mjs';
import {versionLocalAssets} from './tools/version-assets.mjs';
import {gzipSync} from 'node:zlib';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(root, 'dist');
const three = path.join(root, 'node_modules', 'three');
await mkdir(out,{recursive:true});await cp(path.join(root,'competition.css'),path.join(out,'competition.css'));
await mkdir(path.join(out, 'vendor', 'three', 'build'), { recursive: true });
await mkdir(path.join(out, 'vendor', 'three', 'addons', 'utils'), { recursive: true });
for (const file of ['index.html', 'style.css', 'favicon.svg', 'physics.mjs', 'controls.mjs', 'gameplay.mjs', 'player-styles.mjs', 'athlete.mjs', 'server.mjs', 'README.md', 'UPDATE-2.0.md', 'UPDATE-3.0.md', 'UPDATE-4.0.md', 'UPDATE-5.0.md', 'UPDATE-5.4.md', 'UPDATE-5.5.md', 'UPDATE-5.6.md', 'UPDATE-5.7.md', 'UPDATE-5.8.md', 'UPDATE-5.9.md', 'UPDATE-5.10.md', 'UPDATE-6.0.md', 'UPDATE-6.1.md', 'UPDATE-6.3.md', 'competition.mjs', 'tournament.mjs', 'tracking.mjs', 'interaction.mjs', 'interaction.css', 'aiming.mjs', 'aiming.css', 'eagle-eye.mjs', 'eagle-eye.css', 'home.css', 'technique-panel.mjs', 'technique.css', 'UPDATE-6.5.md', 'UPDATE-6.6.md', 'UPDATE-6.7.md', 'UPDATE-6.4.1.md', 'UPDATE-6.4.md', 'opponent-ai.mjs', 'UPDATE-5.2.md', 'UPDATE-5.3.md', 'LEVELS.md', 'UPDATE-5.1.md', 'THIRD-PARTY.md', '启动游戏.bat']) await cp(path.join(root, file), path.join(out, file));
await cp(path.join(root,'athlete-real.mjs'),path.join(out,'athlete-real.mjs'));
await cp(path.join(root,'court-shoe.mjs'),path.join(out,'court-shoe.mjs'));
await cp(path.join(root,'garment-surfaces.mjs'),path.join(out,'garment-surfaces.mjs'));
await cp(path.join(root,'court-net.mjs'),path.join(out,'court-net.mjs'));
await cp(path.join(root,'racket-finish.mjs'),path.join(out,'racket-finish.mjs'));
await cp(path.join(root,'court-surface.mjs'),path.join(out,'court-surface.mjs'));
await cp(path.join(root,'first-person-arm.mjs'),path.join(out,'first-person-arm.mjs'));
await cp(path.join(root,'player-arm.mjs'),path.join(out,'player-arm.mjs'));
await cp(path.join(root,'roof-structure.mjs'),path.join(out,'roof-structure.mjs'));
await cp(path.join(root,'VERIFICATION-5.0.md'),path.join(out,'VERIFICATION-5.0.md'));
await cp(path.join(root,'VERIFICATION-5.1.md'),path.join(out,'VERIFICATION-5.1.md'));
await cp(path.join(root,'VERIFICATION-5.2.md'),path.join(out,'VERIFICATION-5.2.md'));
await cp(path.join(root,'VERIFICATION-5.3.md'),path.join(out,'VERIFICATION-5.3.md'));
await cp(path.join(root,'VERIFICATION-5.4.md'),path.join(out,'VERIFICATION-5.4.md'));
await cp(path.join(root,'assets'),path.join(out,'assets'),{recursive:true});
// Sculpt once at build time. Browsers download GPU-ready meshes instead of
// blocking input for several seconds while evaluating the implicit surface.
for(const [name,open] of [['grip',false],['open',true]])await writeFile(path.join(out,'assets',`hand-${name}.bin`),buildAnatomicalHand(open).bytes);
const armBytes=buildPlayerArm().bytes;
await writeFile(path.join(out,'assets','player-arm.bin'),armBytes);
await writeFile(path.join(out,'assets','player-arm.bin.gz'),gzipSync(armBytes,{level:9}));
for(const file of ['presentation.mjs','viewmodel.mjs','hand-sculpt.mjs','racket-model.mjs','skin-surface.mjs','motion.mjs','hall-details.mjs','net-material.mjs','footwork.mjs','render-budget.mjs','UPDATE-6.8.md','UPDATE-6.9.md'])await cp(path.join(root,file),path.join(out,file));
await writeFile(path.join(out, 'package.json'), JSON.stringify({ name: 'feather-court-portable', version: JSON.parse(await readFile(path.join(root,'package.json'),'utf8')).version, private: true, type: 'module', scripts: { start: 'node server.mjs' } }, null, 2) + '\n');
await cp(path.join(root, 'game.js'), path.join(out, 'game.js'));
for(const file of ['bootstrap.js','asset-loading.mjs','hand-surface.mjs','hand-pose.mjs','hall-surfaces.mjs','shuttle-model.mjs','woven-strings.mjs','UPDATE-6.9.1.md','UPDATE-7.0.md','UPDATE-7.0.1.md','UPDATE-7.1.md','UPDATE-7.2.md','UPDATE-7.3.md'])await cp(path.join(root,file),path.join(out,file));
await cp(path.join(three, 'build', 'three.module.js'), path.join(out, 'vendor', 'three', 'build', 'three.module.js'));
await cp(path.join(three, 'build', 'three.core.js'), path.join(out, 'vendor', 'three', 'build', 'three.core.js'));
const addon = await readFile(path.join(three, 'examples', 'jsm', 'utils', 'BufferGeometryUtils.js'), 'utf8');
await writeFile(path.join(out, 'vendor', 'three', 'addons', 'utils', 'BufferGeometryUtils.js'), addon.replaceAll("from 'three'", "from '../../build/three.module.js'"));
for (const file of ['LICENSE', 'README.md']) await cp(path.join(three, file), path.join(out, 'vendor', 'three', file));
// Content-based versions keep unchanged large assets cached between updates.
for(const file of ['hair-surface.mjs','sports-towel.mjs','render-loop.mjs','racket-frame.mjs','arm-nails.mjs'])await cp(path.join(root,file),path.join(out,file));
await cp(path.join(root,'UPDATE-7.14.md'),path.join(out,'UPDATE-7.14.md'));
await cp(path.join(root,'UPDATE-7.15.md'),path.join(out,'UPDATE-7.15.md'));
await cp(path.join(root,'UPDATE-7.16.md'),path.join(out,'UPDATE-7.16.md'));
// Keep the tiny recovery UI independent of any external JS request. Even if
// the module CDN stalls, the page can show a retry instead of a frozen veil.
const htmlFile=path.join(out,'index.html');
await writeFile(htmlFile,(await readFile(htmlFile,'utf8')).replace('<script type="module" src="./bootstrap.js"></script>',`<script>${await readFile(path.join(root,'bootstrap.js'),'utf8')}</script>`));
for(const file of ['racket-catalog.mjs','racket-gallery.mjs','racket-gallery.css','hall-context.mjs','tactics.mjs','tactics.css','match-mind.mjs','UPDATE-7.22.md','UPDATE-7.20.md','UPDATE-7.21.md'])await cp(path.join(root,file),path.join(out,file));
await versionLocalAssets(out);
await cp(path.join(root,'UPDATE-7.4.md'),path.join(out,'UPDATE-7.4.md'));
await cp(path.join(root,'UPDATE-7.5.md'),path.join(out,'UPDATE-7.5.md'));
await cp(path.join(root,'UPDATE-7.6.md'),path.join(out,'UPDATE-7.6.md'));
await cp(path.join(root,'UPDATE-7.7.md'),path.join(out,'UPDATE-7.7.md'));
await cp(path.join(root,'UPDATE-7.8.md'),path.join(out,'UPDATE-7.8.md'));
await cp(path.join(root,'UPDATE-7.9.md'),path.join(out,'UPDATE-7.9.md'));
await cp(path.join(root,'UPDATE-7.10.md'),path.join(out,'UPDATE-7.10.md'));
await cp(path.join(root,'UPDATE-7.11.md'),path.join(out,'UPDATE-7.11.md'));
console.log('Built self-contained offline game at dist/. Start with: npm run start');

await cp(path.join(root,'UPDATE-7.12.md'),path.join(out,'UPDATE-7.12.md'));





await cp(path.join(root,'UPDATE-7.13.md'),path.join(out,'UPDATE-7.13.md'));

await cp(path.join(root,'UPDATE-7.17.md'),path.join(out,'UPDATE-7.17.md'));

await cp(path.join(root,'UPDATE-7.18.md'),path.join(out,'UPDATE-7.18.md'));

await cp(path.join(root,'UPDATE-7.19.md'),path.join(out,'UPDATE-7.19.md'));
await cp(path.join(root,'VERIFICATION-7.21.md'),path.join(out,'VERIFICATION-7.21.md'));
await cp(path.join(root,'VERIFICATION-7.22.md'),path.join(out,'VERIFICATION-7.22.md'));

await cp(path.join(root,'UPDATE-7.24.md'),path.join(out,'UPDATE-7.24.md'));

await cp(path.join(root,'UPDATE-7.27.md'),path.join(out,'UPDATE-7.27.md'));

await cp(path.join(root,'UPDATE-7.28.md'),path.join(out,'UPDATE-7.28.md'));
