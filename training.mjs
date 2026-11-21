import { landingCall, solveShot } from './physics.mjs';

export const TRAINING_REPS = 8;

const receive = {
  name: '接发球',
  hints: ['用左键稳稳接过网', '先移动到来球后方，再左键接球'],
  startZ: 4.4,
  origin: { x: .55, y: 1.12, z: -3.1 },
  feedType: 'serve',
  targets: [[.45,3.8],[1.05,3.25],[.65,4.7],[1.65,3.9]],
};
const net = {
  name: '网前手感',
  hints: ['向球侧跨一步，5 搓球或 7 勾对角', '向前跨一步，用 5 搓球或 7 勾对角'],
  startZ: 2.46,
  origin: { x: 1.35, y: 1.42, z: -1.2 },
  feedType: 'net',
  targets: [[.45,1.65],[1.1,1.5],[.65,1.38],[1.88,1.46]],
};
const attack = {
  name: '后场进攻',
  hints: ['退到球后，右键杀球', '空格加右键跳杀，8 劈杀斜线'],
  startZ: 5.25,
  origin: { x: .65, y: 2.2, z: -4.15 },
  feedType: 'lift',
  targets: [[.45,5.1],[1.05,5.15],[.65,5.85],[1.75,5.85]],
};

export const TRAINING_NAMES = { receive: receive.name, net: net.name, attack: attack.name, mixed: '随机应变' };
const drills = { receive, net, attack };
const mixedOrder = ['receive', 'net', 'attack', 'net', 'receive', 'attack', 'net', 'attack'];

export function trainingRep(mode, index) {
  const kind = mode === 'mixed' ? mixedOrder[index % mixedOrder.length] : mode;
  const drill = drills[kind] || receive;
  const side = index % 2 ? -1 : 1;
  const [x,z] = drill.targets[Math.floor(index / 2) % drill.targets.length];
  const origin = { ...drill.origin, x: drill.origin.x * side };
  const target = { x: -x * side, z };
  const velocity = solveShot(origin, target, drill.feedType, kind === 'receive' ? { up: 5.4 } : {});
  return {
    kind, name: drill.name, hint: drill.hints[Number(index > 2)], origin, target, velocity,
    feedType: drill.feedType, startZ: drill.startZ,
  };
}

export function gradeTrainingRep(kind, { shot, landing, outcome, missed }) {
  if (!shot) return { success: false, reason: missed ? '挥空了 · 再靠近一步' : '漏接 · 试试提前按下击球键' };
  if (outcome === 'net') return { success: false, reason: '下网 · 提高击球点' };
  if (!landing || landing.z >= 0 || !landingCall(landing).inside) {
    return { success: false, reason: '落点出界 · 留一点边线余量' };
  }
  if (kind === 'net' && !(['net','netcross','drop','slicedrop'].includes(shot.type) && landing.z >= -2.3)) {
    return { success: false, reason: '球回过去了 · 试试用 5 或 7 放到网前' };
  }
  if (kind === 'attack' && !(['smash','slicesmash'].includes(shot.type) && shot.kmh >= 125 && shot.launchY < 0)) {
    return { success: false, reason: '球回过去了 · 站到球后，抢高点下压' };
  }
  return {
    success: true,
    reason: kind === 'attack' ? `下压进场 · ${shot.kmh} km/h` : kind === 'net' ? `网前落点 · 距网 ${Math.abs(landing.z).toFixed(1)} 米` : '接发进场',
  };
}
