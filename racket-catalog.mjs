// Appearance references only; cosmetics never modify the contact point or player skills.
const yonex='https://www.yonex.com/badminton/racquets/';
export const RACKET_SKINS={
 astrox100zz:{label:'天斧 100ZZ',model:'ASTROX 100 ZZ',family:'ASTROX',mark:'100 ZZ',edition:'藏青 · Dark Navy',pattern:'navy',shaft:'#111e30',palette:{rim:'#2866ac',carbon:'#111e30',grip:'#202328',accent:'#eef4fa',gold:'#fa6524'}},
 astrox88dpro:{label:'天斧 88D Pro',model:'ASTROX 88 D PRO',family:'ASTROX',mark:'88 D PRO',edition:'三代 · 黑 / 银',pattern:'silver',shaft:'#171e23',reference:yonex+'3ax88d-p',palette:{rim:'#bdcbd4',carbon:'#151e25',grip:'#202328',accent:'#dce4e9',gold:'#46b9ad'}},
 nanoflare1000z:{label:'疾光 1000Z',model:'NANOFLARE 1000 Z',family:'NANOFLARE',mark:'1000 Z',edition:'闪电黄 · Lightning Yellow',pattern:'lightning',shaft:'#e5d729',reference:yonex+'nf-1000z',palette:{rim:'#e7db25',carbon:'#191e20',grip:'#202328',accent:'#f2ee9b',gold:'#e7db25'}},
 astrox99pro:{label:'天斧 99 Pro',model:'ASTROX 99 PRO',family:'ASTROX',mark:'99 PRO',edition:'三代 · 黑 / 绿',pattern:'emerald',shaft:'#172320',reference:yonex+'astrox-99-pro-3ax99-p',palette:{rim:'#209968',carbon:'#18221f',grip:'#202328',accent:'#bfd2c9',gold:'#c3a466'}},
 arcsaber11pro:{label:'弓箭 11 Pro',model:'ARCSABER 11 PRO',family:'ARCSABER',mark:'11 PRO',edition:'灰珠色 · Grayish Pearl',pattern:'pearl',shaft:'#434952',reference:yonex+'arc11-p',palette:{rim:'#b63a4f',carbon:'#444c56',grip:'#202328',accent:'#bec2c5',gold:'#d6435b'}},
 astrox77pro:{label:'天斧 77 Pro',model:'ASTROX 77 PRO',family:'ASTROX',mark:'77 PRO',edition:'高橙 · High Orange',pattern:'orange',shaft:'#202332',reference:yonex+'astrox-77-pro',palette:{rim:'#ef592d',carbon:'#202332',grip:'#202328',accent:'#b5c0ce',gold:'#dbad55'}},
 'control-original':{label:'青柠控制款',model:'FEATHER CONTROL',family:'FEATHER',mark:'CONTROL',edition:'原创 · 青柠',pattern:'lime',shaft:'#22302e',palette:{rim:'#c4ec78',carbon:'#22302e',grip:'#eeeadd',accent:'#edf4d9',gold:'#c4ec78'}},
 'aero-blue':{label:'冰蓝轻量款',model:'FEATHER AERO',family:'FEATHER',mark:'AERO',edition:'原创 · 冰蓝',pattern:'aero',shaft:'#20323a',palette:{rim:'#82d6e1',carbon:'#20323a',grip:'#dce7e2',accent:'#b4f2ee',gold:'#dce7e2'}},
 liningN90:edition('李宁 N90 一代','WOODS','N90','朱红 / 鎏金','sabre','#a91d28','#30151e','#f8ca68','#c98f36','#241e20'),
 bravesword12:edition('胜利 亮剑 12','BRAVE SWORD','12','剑蓝 / 银刃','blade','#2d73b6','#1d3149','#e1e9eb','#8ec6ea','#e9ebed'),
 thrusterRyuga:edition('胜利 龙牙之刃','THRUSTER','RYUGA','烈橙 / 墨黑','scale','#f07825','#26252c','#ecd3a4','#af4521','#292932'),
 auraspeed90k:edition('胜利 神速 90K','AURASPEED','90K','午夜蓝 / 冰青','pulse','#4babc6','#192938','#a6e8ef','#a4b9cc','#233145'),
 axforce100:edition('李宁 雷霆 100','AXFORCE','100','曜黑 / 赤金','fault','#c5944c','#201d26','#f4df99','#a72f41','#27232a'),
 aeronaut9000c:edition('李宁 风动 9000C','AERONAUT','9000C','海蓝 / 绯红','tide','#458aaf','#22344a','#d7eee9','#d84d54','#ebeff0'),
 halbertec8000:edition('李宁 战戟 8000','HALBERTEC','8000','薄荷 / 樱粉','split','#82cab1','#2d414b','#f2efe8','#e99ab4','#dce9df'),
 astrox88spro:edition('天斧 88S Pro','ASTROX','88 S PRO','银翼 / 青绿','wing','#c4cbd3','#273b39','#f2f4f0','#42bba5','#e8e6dc'),
 arcsaber7pro:edition('弓箭 7 Pro','ARCSABER','7 PRO','岩灰 / 黄线','rail','#9c9d96','#464849','#d7d8d1','#ead65c','#34383b'),
 nanoflare800pro:edition('疾光 800 Pro','NANOFLARE','800 PRO','深绿 / 铜纹','circuit','#278677','#173b37','#91bdb0','#bd865b','#253b36'),
 'shenzhen-home':edition('林楠 · 深圳主场','SIGNATURE','HOME','校服蓝白 · 签名版','home','#1754ad','#15346b','#f2f6ec','#8dc7eb','#f0eee5'),
 'first-title':{...edition('林楠 · 首冠纪念','SIGNATURE','CHAMPION','曜黑 / 冠军金','laurel','#d6ac56','#211e22','#fff0bd','#b58836','#2f2827'),unlock:'firstTitle'}
};
function edition(label,family,mark,description,pattern,rim,carbon,accent,gold,grip){
 return {label,family,mark,model:family+' '+mark,edition:description,pattern,shaft:carbon,palette:{rim,carbon,grip,accent,gold}};
}
export const SERIES={
 ASTROX:'天斧',NANOFLARE:'疾光',ARCSABER:'弓箭',WOODS:'林系列',AXFORCE:'雷霆',AERONAUT:'风动',HALBERTEC:'战戟',
 'BRAVE SWORD':'亮剑',THRUSTER:'突击',AURASPEED:'神速',FEATHER:'俱乐部原创',SIGNATURE:'林楠签名'
};
const brandFamilies={WOODS:'lining',AXFORCE:'lining',AERONAUT:'lining',HALBERTEC:'lining','BRAVE SWORD':'victor',THRUSTER:'victor',AURASPEED:'victor',FEATHER:'feather',SIGNATURE:'signature'};
export function racketBrand(spec){return brandFamilies[spec.family]||'yonex';}
// Legacy trophy maps were written in first-award order. Prefer the explicit id once recorded.
export function firstTitleEvent(tourCareer,career,events){
 const candidates=[tourCareer?.firstTitleEvent];
 for(const trophies of [tourCareer?.trophies,career?.trophies]){
  for(const [id,count] of Object.entries(trophies||{}))if(count>0)candidates.push(id);
 }
 for(const id of candidates){const found=events.find(event=>event.id===id);if(found)return found;}
 return null;
}
export const canEquipRacket=(id,firstTitle)=>Object.hasOwn(RACKET_SKINS,id)&&(!RACKET_SKINS[id].unlock||Boolean(firstTitle));
export const RACKET_PALETTES=Object.fromEntries(Object.entries(RACKET_SKINS).map(([id,skin])=>[id,skin.palette]));
export const racketSkin=id=>Object.hasOwn(RACKET_SKINS,id)?RACKET_SKINS[id]:RACKET_SKINS.astrox100zz;
