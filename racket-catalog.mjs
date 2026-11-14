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
 'aero-blue':{label:'冰蓝轻量款',model:'FEATHER AERO',family:'FEATHER',mark:'AERO',edition:'原创 · 冰蓝',pattern:'aero',shaft:'#20323a',palette:{rim:'#82d6e1',carbon:'#20323a',grip:'#dce7e2',accent:'#b4f2ee',gold:'#dce7e2'}}
};
export const RACKET_PALETTES=Object.fromEntries(Object.entries(RACKET_SKINS).map(([id,skin])=>[id,skin.palette]));
export const racketSkin=id=>RACKET_SKINS[id]||RACKET_SKINS.astrox100zz;
