import { COURT, CORK_RADIUS, LINE_HALF_WIDTH, clamp, landingCall } from './physics.mjs?v=e3adc2276e91027a';

// Stores measured simulation samples. Replay never re-solves or changes a point.
export class FlightRecorder {
  constructor() { this.reset(); }
  reset(key = '') { this.key = key; this.samples = []; this.time = 0; }
  record(key, p, dt = 0) {
    if (key !== this.key) this.reset(key);
    this.time += dt;
    this.samples.push({ x: p.x, y: p.y, z: p.z, t: this.time });
    if (this.samples.length > 720) this.samples.shift();
  }
  finish(position, velocity, hitter) {
    const samples = this.samples.map(p => ({ ...p }));
    const lastTime = samples.at(-1)?.t ?? 0;
    if (!samples.length || Math.hypot(samples.at(-1).x - position.x, samples.at(-1).y - position.y, samples.at(-1).z - position.z) > 1e-6)
      samples.push({ ...position, t: lastTime + 1 / 240 });
    return { position: { x: position.x, y: position.y, z: position.z }, velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      samples, hitter, call: landingCall(position) };
  }
}

export function replaySample(samples, time) {
  if (!samples.length) return null;
  if (time <= samples[0].t) return { ...samples[0] };
  for (let i = 1; i < samples.length; i++) {
    const b = samples[i], a = samples[i - 1];
    if (time <= b.t) {
      const f = clamp((time - a.t) / Math.max(1e-9, b.t - a.t), 0, 1);
      return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, z: a.z + (b.z - a.z) * f, t: time };
    }
  }
  return { ...samples.at(-1) };
}

export class EagleEyeReview {
  constructor(onClose) {
    this.onClose = onClose; this.active = false; this.last = null;
    this.element = document.createElement('section');
    this.element.id = 'eagle-eye'; this.element.className = 'hidden';
    this.element.setAttribute('role', 'dialog'); this.element.setAttribute('aria-modal', 'true');
    this.element.setAttribute('aria-labelledby', 'eagle-title');
    this.element.innerHTML = `<div class="eagle-panel"><header><div><span class="eagle-eyebrow">FEATHER COURT / LINE REVIEW</span><h2 id="eagle-title">鹰眼 · 落点回放</h2></div><button id="eagle-close" aria-label="关闭鹰眼回放">返回球场 <kbd>Esc</kbd></button></header>
      <div class="eagle-verdict" aria-live="polite"><strong id="eagle-call">回放中</strong><span id="eagle-detail"></span></div>
      <canvas id="eagle-canvas" role="img" aria-label="首次触地轨迹、球头接触范围和球场边线"></canvas>
      <div class="eagle-timeline"><span id="eagle-time">0.00 s</span><input id="eagle-scrub" type="range" min="0" max="1000" value="0" aria-label="拖动查看落地慢动作"><span>首次触地</span></div>
      <footer><div class="eagle-playback"><button id="eagle-play">暂停</button><button id="eagle-restart">重播</button><label>速度 <select id="eagle-speed"><option value=".2">0.2×</option><option value=".35" selected>0.35×</option><option value="1">1×</option></select></label></div><p>白线属于界内 · 以球头首次触地范围判定<br><small>游戏物理回放，不是摄像机测量；B 可再次查看</small></p></footer></div>`;
    document.body.append(this.element);
    this.canvas = this.element.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
    this.element.querySelector('#eagle-close').onclick = () => this.close();
    this.element.querySelector('#eagle-play').onclick = () => { this.auto = false; this.paused = !this.paused; this.updateButton(); };
    this.element.querySelector('#eagle-restart').onclick = () => { this.auto = false; this.cursor = this.start; this.paused = false; this.hold = 0; this.updateButton(); };
    this.element.querySelector('#eagle-speed').onchange = () => { this.auto = false; };
    this.element.querySelector('#eagle-scrub').oninput = e => { this.auto = false; this.paused = true; this.cursor = this.start + Number(e.target.value) / 1000 * (this.end - this.start); this.updateButton(); this.draw(); };
    this.element.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        const focusable = [...this.element.querySelectorAll('button,select,input')];
        const index = focusable.indexOf(document.activeElement);
        e.preventDefault(); focusable[(index + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
      }
    });
  }
  open(record, automatic = false) {
    if (!record || !record.samples.length) return false;
    this.last = record; this.end = record.samples.at(-1).t;
    this.start = Math.max(record.samples[0].t, this.end - 1.15);
    this.cursor = this.start; this.hold = 0; this.paused = false; this.auto = automatic; this.active = true;
    this.previousFocus = document.activeElement;
    this.element.classList.remove('hidden'); this.updateButton(); this.draw();
    this.element.querySelector('#eagle-close').focus({ preventScroll: true });
    return true;
  }
  close() {
    if (!this.active) return;
    this.active = false; this.element.classList.add('hidden'); this.onClose();
    if (this.previousFocus?.isConnected) this.previousFocus.focus({ preventScroll: true });
  }
  updateButton() { this.element.querySelector('#eagle-play').textContent = this.paused ? '播放' : '暂停'; }
  update(dt) {
    if (!this.active) return;
    if (!this.paused) {
      this.cursor = Math.min(this.end, this.cursor + dt * Number(this.element.querySelector('#eagle-speed').value));
      if (this.cursor >= this.end) this.hold += dt;
    }
    this.draw();
    if (this.auto && this.hold > 1.7) this.close();
  }
  draw() {
    const bounds = this.canvas.getBoundingClientRect();
    const w = Math.max(280, bounds.width), h = Math.max(240, bounds.height), ratio = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(w * ratio) || this.canvas.height !== Math.round(h * ratio)) { this.canvas.width = Math.round(w * ratio); this.canvas.height = Math.round(h * ratio); }
    const c = this.ctx; c.setTransform(ratio, 0, 0, ratio, 0, 0); c.clearRect(0, 0, w, h);
    const record = this.last, call = record.call, p = record.position;
    const landed = this.cursor >= this.end - 1e-6;
    const sample = replaySample(record.samples, this.cursor);
    const color = call.inside ? '#ccef9d' : '#ff967e';
    const overviewWidth = w > 620 ? 155 : 84, mainWidth = w - overviewWidth - 35;
    const span = Math.max(.72, Math.min(6, Math.abs(call.clearance) * 2.5));
    const scale = Math.min(mainWidth, h - 50) / span;
    const cx = mainWidth * .53, cy = h * .52;
    const px = x => cx + (x - p.x) * scale, py = z => cy + (z - p.z) * scale;
    c.fillStyle = '#123c3a'; c.fillRect(0, 0, w, h);
    c.save(); c.beginPath(); c.rect(0, 0, mainWidth + 8, h); c.clip();
    c.fillStyle = '#26645c'; c.fillRect(px(-3.9), py(-8), 7.8 * scale, 16 * scale);
    c.strokeStyle = '#ffffff08'; c.lineWidth = 1;
    const grid = span > 2 ? .5 : .1;
    for (let x = Math.floor((p.x - span) / grid) * grid; x < p.x + span; x += grid) { c.beginPath(); c.moveTo(px(x), 0); c.lineTo(px(x), h); c.stroke(); }
    for (let z = Math.floor((p.z - span) / grid) * grid; z < p.z + span; z += grid) { c.beginPath(); c.moveTo(0, py(z)); c.lineTo(mainWidth, py(z)); c.stroke(); }
    c.fillStyle = '#f2f0dd';
    for (const x of [-3.05, -COURT.halfWidth, COURT.halfWidth, 3.05]) c.fillRect(px(x - LINE_HALF_WIDTH), py(-6.72), .04 * scale, 13.44 * scale);
    for (const z of [-6.7, -5.94, -1.98, 1.98, 5.94, 6.7]) c.fillRect(px(-3.07), py(z - LINE_HALF_WIDTH), 6.14 * scale, .04 * scale);
    c.fillRect(px(-.02), py(-6.7), .04 * scale, 4.72 * scale); c.fillRect(px(-.02), py(1.98), .04 * scale, 4.72 * scale);
    c.setLineDash([5, 5]); c.strokeStyle = '#ccef9d70'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(px(-3.1), py(0)); c.lineTo(px(3.1), py(0)); c.stroke(); c.setLineDash([]);
    const visible = record.samples.filter(v => v.t >= this.start && v.t <= this.cursor);
    c.strokeStyle = '#e8efdf99'; c.lineWidth = 2; c.beginPath();
    visible.forEach((v, i) => i ? c.lineTo(px(v.x), py(v.z)) : c.moveTo(px(v.x), py(v.z))); c.lineTo(px(sample.x), py(sample.z)); c.stroke();
    if (landed) {
      c.strokeStyle = color + '60'; c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, 22 + 5 * Math.sin(Math.min(this.hold, 1) * Math.PI), 0, Math.PI * 2); c.stroke();
      c.fillStyle = color; c.beginPath(); c.arc(cx, cy, Math.max(2, CORK_RADIUS * scale), 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(cx - 1, cy - 1, 2, 2);
    } else {
      c.fillStyle = '#fffce8'; c.shadowColor = '#fff9ba'; c.shadowBlur = 13;
      c.beginPath(); c.arc(px(sample.x), py(sample.z), 4, 0, Math.PI * 2); c.fill(); c.shadowBlur = 0;
    }
    c.fillStyle = '#d9e9df'; c.font = '12px "Segoe UI", "Microsoft YaHei", sans-serif'; c.fillText('触地区域放大', 16, 25);
    const ruler = Math.max(.05, Math.round(span / 5 * 20) / 20);
    c.strokeStyle = '#d9e9df'; c.lineWidth = 2; c.beginPath(); c.moveTo(18, h - 24); c.lineTo(18 + ruler * scale, h - 24); c.stroke();
    c.fillText(`${Math.round(ruler * 100)} cm`, 18, h - 34); c.restore();
    // Full-court context and the actual height profile remain legible at every zoom.
    const ox = mainWidth + 22, ow = overviewWidth, oh = Math.min(h - 75, ow * 2.58), oy = 42;
    const mx = x => ox + (x / 6.1 + .5) * ow, mz = z => oy + (z / 13.4 + .5) * oh;
    c.fillStyle = '#0a2d2b'; c.fillRect(ox - 5, oy - 8, ow + 10, oh + 16);
    c.strokeStyle = '#d8e2d799'; c.lineWidth = 1; c.strokeRect(mx(-2.59), mz(-6.7), ow * 5.18 / 6.1, oh);
    for (const z of [-1.98, 0, 1.98]) { c.beginPath(); c.moveTo(mx(-2.59), mz(z)); c.lineTo(mx(2.59), mz(z)); c.stroke(); }
    c.strokeStyle = '#d8e2d775'; c.beginPath(); record.samples.forEach((v, i) => i ? c.lineTo(mx(v.x), mz(v.z)) : c.moveTo(mx(v.x), mz(v.z))); c.stroke();
    c.fillStyle = landed ? color : '#fff'; c.beginPath(); c.arc(mx(sample.x), mz(sample.z), 3, 0, 7); c.fill();
    c.font = '11px "Segoe UI", "Microsoft YaHei", sans-serif'; c.fillStyle = '#d9e9df'; c.fillText('全场落点', ox, 24); c.fillText('己方', ox + ow * .35, oy + oh + 25);
    if (mainWidth > 350 && h > 300) {
      const hx = 20, hy = h - 75, hw = 150, hh = 60;
      const tail = record.samples.filter(v => v.t >= this.start), maxY = Math.max(1, ...tail.map(v => v.y));
      c.fillStyle = '#092927c9'; c.fillRect(hx, hy - hh, hw + 20, hh + 15); c.strokeStyle = '#d9e9df80'; c.lineWidth = 1; c.beginPath();
      visible.forEach((v, i) => { const x = hx + (v.t - this.start) / Math.max(.001, this.end - this.start) * hw, y = hy - v.y / maxY * (hh - 15); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.stroke();
      c.fillStyle = '#d9e9df'; c.fillText('下落高度', hx + 7, hy - hh + 14);
    }
    this.element.querySelector('#eagle-call').textContent = landed ? (call.onLine ? '压线 · 界内' : call.inside ? '界内 IN' : '界外 OUT') : '慢动作复核';
    this.element.querySelector('#eagle-call').style.color = landed ? color : '#e9efdf';
    const distance = Math.abs(call.margin) * 100;
    this.element.querySelector('#eagle-detail').textContent = landed
      ? `${call.line} · ${call.onLine ? '球头接触白线' : `${call.inside ? '界内余量' : '超出界线'} ${distance < .1 ? '< 0.1' : distance.toFixed(1)} cm`} · ${record.hitter === 'player' ? '你的回球' : '对手回球'}`
      : '正在查看球头首次触地前的真实轨迹';
    this.element.querySelector('#eagle-time').textContent = `${(this.cursor - this.end).toFixed(2)} s`;
    this.element.querySelector('#eagle-scrub').value = String(Math.round((this.cursor - this.start) / Math.max(.001, this.end - this.start) * 1000));
  }
}
