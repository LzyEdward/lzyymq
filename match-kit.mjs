// Original match uniforms. The dark raglan and gold fade studies use the
// Lin Dan and Lee Chong Wei match photographs credited in README.md.
const palettes=[
 ['#133d46','#102c37','#72e5c4'],['#b72c3d','#241e31','#ffce66'],
 ['#f4c733','#172444','#fff9e5'],['#3265aa','#17243f','#d7eaff'],
 ['#159380','#123f3e','#e2f1b6'],['#ecece4','#14374b','#237b92'],
 ['#422b65','#241b3b','#ea8093'],['#e16938','#253244','#ffe6ac']
];
const known={
 liShifeng:['LI S F','CHN',1,'crew','#ffeada'],lohKeanYew:['LOH K Y','SGP',0,'crop','#ffe9da'],
 xiaXuanze:['XIA X Z','CHN',1,'crew','#ffe9d8'],jiXinpeng:['JI X P','CHN',2,'part','#ffe9dc'],
 yangYang:['YANG Y','CHN',1,'part','#ffeadc'],hendrawan:['HENDRAWAN','INA',4,'crew','#f3d8c3'],
 alanBudikusuma:['BUDIKUSUMA A','INA',7,'part','#f3d7bf'],hariyanto:['ARBI H','INA',4,'crop','#f1d5c1'],
 linDan:['LIN D','CHN',1,'crop','#fff0dd'],leeChongWei:['LEE C W','MAS',2,'sweep','#ffecd7'],
 chenLong:['CHEN L','CHN',5,'crew','#fff2e6'],taufik:['HIDAYAT T','INA',4,'part','#ebccb7'],
 momota:['MOMOTA K','JPN',3,'part','#fff3e8'],shiYuqi:['SHI Y Q','CHN',1,'sweep','#ffe8d5'],
 viktorAxelsen:['AXELSEN V','DEN',5,'crew','#fff6ef','#664b34'],
 peterGade:['GADE P','DEN',5,'sweep','#fff5ec','#745d41'],ginting:['GINTING A S','INA',7,'crop','#eecdb2'],
 lakshya:['SEN L','IND',3,'wave','#ebc6ae'],prannoy:['PRANNOY H S','IND',7,'wave','#debba6'],
 leeZiiJia:['LEE Z J','MAS',6,'part','#ffead7'],jonatan:['CHRISTIE J','INA',4,'sweep','#f2d6c0']
};
const codes={'中国':'CHN','马来西亚':'MAS','印度尼西亚':'INA','丹麦':'DEN','日本':'JPN','中国台北':'TPE','韩国':'KOR','印度':'IND','泰国':'THA','中国香港':'HKG','德国':'GER','法国':'FRA','新加坡':'SGP','英格兰':'ENG'};
const cuts=['crop','part','crew','sweep','wave'];
export function matchKit(input='custom'){
 const star=typeof input==='object'?input:null;
 let key=star?.id||String(input);
 if(key==='linDan08')key='linDan';
 if(key==='axelsenOld')key='viktorAxelsen';
 const seed=star?.seed||0, entry=known[key];
 const [shirt,pants,accent]=palettes[entry?.[2]??(seed%palettes.length)];
 return {key:star?.id||input,shirt,pants,accent,pattern:(entry?.[2]??seed)%4,
  lettering:entry?.[0]||star?.latin?.toUpperCase()||'FEATHER',team:entry?.[1]||codes[star?.country]||'COURT',
  build:({linDan:[1.045,.975,1.025],leeChongWei:[.945,.966,.98],momota:[1.02,.985,1.015],shiYuqi:[.975,1.039,.98],liShifeng:[.975,1.035,.98],lohKeanYew:[1.015,.99,1.02],chenLong:[1.035,1.065,1.02],peterGade:[.98,1.045,.96],viktorAxelsen:[1.025,1.075,1.035],taufik:[1.025,.98,1.04]})[key]||[1,1,1],cut:entry?.[3]||cuts[seed%cuts.length],skin:entry?.[4]||'#fff0e2',hair:entry?.[5]||'#292019'};
}

export function hairCutOffset(cut,x,y,z){
 const crown=Math.min(1,Math.max(0,(y-1.709)/.077));
 const fringe=Math.max(0,Math.min(1,(z+.012)/.13));
 const swept=cut==='part'||cut==='sweep';
 const lift=cut==='crew'?.002:cut==='wave'?.021:cut==='part'?.018:cut==='sweep'?.022:.008;
 const wave=cut==='wave'?Math.sin(x*165+z*51)*.003:0;
 return [swept?-.014*crown*fringe:0,
  crown*(lift*(.55+.45*fringe)+(swept?.008*Math.sin(x*26):0)+wave),
  crown*fringe*(cut==='part'?.019:cut==='sweep'?-.011:.003)];
}
