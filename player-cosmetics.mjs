const requirements = Object.freeze({
  free: career => ({ unlocked: true, progress: '已解锁' }),
  threeWins: career => ({ unlocked: career.wins >= 3, progress: `${Math.min(career.wins, 3)} / 3 场胜利` }),
  sixWins: career => ({ unlocked: career.wins >= 6, progress: `${Math.min(career.wins, 6)} / 6 场胜利` }),
  champion: (career, tourCareer) => ({ unlocked: tourCareer.titles > 0, progress: tourCareer.titles > 0 ? '已解锁' : '赢得一座赛事冠军' }),
});

export const PLAYER_COSMETICS = Object.freeze([
  Object.freeze({ id: 'linNan', name: '训练日常', emoji: '🏸', description: '熟悉的球衣与球拍。', kit: 'linNan', requirement: 'free', accessory: 'none' }),
  Object.freeze({ id: 'duckCaptain', name: '鸭鸭队长', emoji: '🦆', description: '头顶小黄鸭，球场存在感 +100。', kit: 'duckCaptain', requirement: 'free', accessory: 'duck' }),
  Object.freeze({ id: 'wideLens', name: '超宽墨镜', emoji: '🕶️', description: '今天的战术是：先帅再说。', kit: 'wideLens', requirement: 'free', accessory: 'glasses' }),
  Object.freeze({ id: 'bunny', name: '兔兔冲刺员', emoji: '🐰', description: '三场胜利解锁，耳朵跟着步法晃。', kit: 'bunny', requirement: 'threeWins', accessory: 'bunny' }),
  Object.freeze({ id: 'rooster', name: '鸡王出场', emoji: '🐓', description: '六场胜利解锁，冠羽比球速更抢眼。', kit: 'rooster', requirement: 'sixWins', accessory: 'rooster' }),
  Object.freeze({ id: 'shuttle', name: '羽球成精', emoji: '🐤', description: '捧起一座冠军奖杯，解锁羽球头套。', kit: 'shuttle', requirement: 'champion', accessory: 'shuttle' }),
]);

export function playerCosmeticStatus(career, tourCareer, id) {
  const cosmetic = PLAYER_COSMETICS.find(item => item.id === id) || PLAYER_COSMETICS[0];
  return { cosmetic, ...requirements[cosmetic.requirement](career, tourCareer) };
}

export function playerCosmeticOptions(career, tourCareer) {
  return PLAYER_COSMETICS.map(cosmetic => ({
    ...cosmetic,
    ...requirements[cosmetic.requirement](career, tourCareer),
  }));
}

export function createPlayerCosmetics(THREE, athlete) {
  const origin = athlete.bind.head;
  const root = new THREE.Group();
  root.name = 'Lin Nan · playful outfit accessories';
  athlete.head.add(root);

  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .68, ...options });
  const colors = {
    yellow: material('#ffd84d'), orange: material('#f08a31'), white: material('#fff6df'),
    red: material('#e94d50'), pink: material('#ff93c4'), dark: material('#262b32'),
    lens: material('#72c6c0', { transparent: true, opacity: .62, metalness: .12, roughness: .25 }),
    green: material('#84d581'),
  };
  const outfitGroups = new Map();
  const at = (x, y, z) => new THREE.Vector3(x, y - origin.y, z - origin.z);
  const group = id => {
    const outfit = new THREE.Group();
    outfit.name = `Cosmetic · ${id}`;
    outfitGroups.set(id, outfit);
    root.add(outfit);
    return outfit;
  };
  const mesh = (parent, geometry, finish, position, scale) => {
    const item = new THREE.Mesh(geometry, finish);
    item.position.copy(at(...position));
    if (scale) item.scale.set(...scale);
    item.castShadow = true;
    item.receiveShadow = true;
    parent.add(item);
    return item;
  };
  const tube = (parent, points, radius, finish) => {
    const curve = new THREE.CatmullRomCurve3(points.map(point => at(...point)));
    const item = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, radius, 8, false), finish);
    item.castShadow = true;
    parent.add(item);
    return item;
  };
  const sphere = (parent, finish, position, scale) => mesh(parent, new THREE.SphereGeometry(1, 24, 16), finish, position, scale);

  const duck = group('duck');
  mesh(duck, new THREE.CylinderGeometry(.105, .115, .025, 32), colors.yellow, [0, 1.804, .008]);
  sphere(duck, colors.yellow, [0, 1.838, .002], [.09, .058, .09]);
  for (const side of [-1, 1]) {
    sphere(duck, colors.white, [side * .03, 1.839, .145], [.014, .015, .009]);
    sphere(duck, colors.dark, [side * .03, 1.839, .153], [.006, .008, .004]);
  }
  const bill = mesh(duck, new THREE.ConeGeometry(.047, .064, 5), colors.orange, [0, 1.799, .157]);
  bill.rotation.x = Math.PI / 2;

  const glasses = group('glasses');
  for (const side of [-1, 1]) {
    mesh(glasses, new THREE.CircleGeometry(.036, 32), colors.lens, [side * .037, 1.684, .147]);
    const frame = mesh(glasses, new THREE.TorusGeometry(.036, .006, 8, 32), colors.dark, [side * .037, 1.684, .151]);
    frame.scale.set(1.14, .84, 1);
    tube(glasses, [[-.006, 1.685, .151], [0, 1.69, .154], [.006, 1.685, .151]], .004, colors.dark);
    tube(glasses, [[side * .078, 1.686, .148], [side * .091, 1.68, .108], [side * .09, 1.678, .07]], .003, colors.dark);
  }

  const bunny = group('bunny');
  for (const side of [-1, 1]) {
    const ear = sphere(bunny, colors.pink, [side * .051, 1.907, .005], [.028, .086, .026]);
    ear.rotation.z = side * -.16;
    const inner = sphere(bunny, colors.white, [side * .051, 1.907, .028], [.014, .059, .006]);
    inner.rotation.z = side * -.16;
  }

  const rooster = group('rooster');
  mesh(rooster, new THREE.CylinderGeometry(.07, .078, .022, 24), colors.white, [0, 1.813, .004]);
  for (let index = 0; index < 3; index++) {
    const crest = mesh(rooster, new THREE.ConeGeometry(.025, .076, 12), colors.red, [(-1 + index) * .036, 1.875 + (index === 1 ? .012 : 0), .005]);
    crest.rotation.z = (index - 1) * -.25;
  }
  const comb = mesh(rooster, new THREE.ConeGeometry(.031, .044, 8), colors.orange, [0, 1.82, .083]);
  comb.rotation.x = Math.PI / 2;

  const shuttle = group('shuttle');
  sphere(shuttle, colors.white, [0, 1.852, .002], [.064, .047, .064]);
  mesh(shuttle, new THREE.CylinderGeometry(.035, .066, .087, 10, 1, true), colors.green, [0, 1.899, -.004]);
  for (const side of [-1, 1]) {
    const feather = mesh(shuttle, new THREE.ConeGeometry(.022, .102, 8), colors.white, [side * .052, 1.902, .0]);
    feather.rotation.z = side * -.44;
  }
  mesh(shuttle, new THREE.TorusGeometry(.063, .007, 6, 24), colors.orange, [0, 1.854, .002]);

  function select(id = 'linNan') {
    for (const outfit of outfitGroups.values()) outfit.visible = false;
    const selected = outfitGroups.get(id);
    if (selected) selected.visible = true;
    return outfitGroups.has(id) ? id : 'linNan';
  }
  return { root, select };
}
