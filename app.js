import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

// Kết nối trực tiếp giữa các máy bằng PeerJS (nạp trong index.html, biến toàn cục Peer). Không cần máy chủ riêng.

/* ================= tiện ích ================= */
const $ = s => document.querySelector(s);
const LS = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
const COLORS = ['#e8b04a','#e0577a','#4fb3bf','#8bc34a','#b388ff','#ff8a50','#64b5f6','#f5f5f5'];
const clean = (s,n) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').trim().slice(0,n);
const safeColor = c => /^#[0-9a-f]{6}$/i.test(c) ? c : '#cccccc';
const validVid = id => typeof id === 'string' && /^[\w-]{6,20}$/.test(id);
const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
function ytId(u){
  try{
    const x = new URL(String(u).trim());
    const h = x.hostname.replace(/^(www\.|m\.|music\.)/,'');
    let id = null;
    if (h === 'youtu.be') id = x.pathname.slice(1).split('/')[0];
    else if (h === 'youtube.com' || h.endsWith('.youtube.com')){
      id = x.searchParams.get('v');
      if (!id){ const m = x.pathname.match(/^\/(shorts|embed|live)\/([\w-]+)/); if (m) id = m[2]; }
    }
    return validVid(id) ? id : null;
  }catch(e){ return null; }
}
let toastT = 0;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 4000); }

const me = { name: LS.get('kara.name') || '', color: LS.get('kara.color') || COLORS[Math.floor(Math.random()*COLORS.length)] };
if (!/^#[0-9a-f]{6}$/i.test(me.color)) me.color = COLORS[0];

/* ================= mã phòng ================= */
const params = new URLSearchParams(location.search);
let roomId = (params.get('room') || '').toLowerCase();
if (!/^[a-z0-9]{4,24}$/.test(roomId)){
  roomId = Math.random().toString(36).slice(2,8);
  params.set('room', roomId);
  history.replaceState(null, '', location.pathname + '?' + params.toString());
}
const HOST_ID = 'phonghat-karaoke-v1-' + roomId;
const inviteLink = () => location.origin + location.pathname + '?room=' + roomId;

/* ================= cảnh 3D ================= */
const HW=14, Z_FRONT=-22, Z_BACK=10, H=12, STAGE_Z=-14, STAGE_H=1, ROW0=-8, ROWD=1.2, ROWH=0.35, ROWS=12;
const KIOSK = { x:6, z:-16.2 };
const MIC = { x:0, z:-16.2 };
const SCREEN_Y = STAGE_H + 5.4, SCREEN_Z = Z_FRONT + 0.32;
const FONT = '"Be Vietnam Pro",system-ui,sans-serif';

const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.useLegacyLights = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0408);
scene.fog = new THREE.Fog(0x0d0408, 28, 55);
const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 200);

const cssRenderer = new CSS3DRenderer({ element: $('#css3d') });
const cssScene = new THREE.Scene();

const std = (c,o) => new THREE.MeshStandardMaterial(Object.assign({ color:c, roughness:.85, metalness:0 }, o || {}));
const glow = c => new THREE.MeshBasicMaterial({ color:c });
// "lỗ" trong suốt để video (lớp CSS phía sau) lộ ra, vật thể phía trước vẫn che được
const holeMat = new THREE.MeshBasicMaterial({ color:0x000000, opacity:0, transparent:true, blending:THREE.NoBlending, fog:false });
function box(w,h,d,mat,x,y,z){ const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); scene.add(m); return m; }
function canvasTex(w,h){ const c = document.createElement('canvas'); c.width = w; c.height = h; const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return { c, t }; }

// sàn, tường, trần
box(HW*2, 0.1, Z_BACK-Z_FRONT, std(0x2a0d17), 0, -0.05, (Z_BACK+Z_FRONT)/2);
const wallMat = std(0x2b0c16);
box(0.3, H, Z_BACK-Z_FRONT, wallMat, -HW-0.15, H/2, (Z_BACK+Z_FRONT)/2);
box(0.3, H, Z_BACK-Z_FRONT, wallMat,  HW+0.15, H/2, (Z_BACK+Z_FRONT)/2);
box(HW*2, H, 0.3, std(0x1a070d), 0, H/2, Z_FRONT-0.15);
box(HW*2, H, 0.3, wallMat, 0, H/2, Z_BACK+0.15);
box(HW*2, 0.2, Z_BACK-Z_FRONT, std(0x0c0306), 0, H+0.1, (Z_BACK+Z_FRONT)/2);
const panelA = std(0x5c1428,{roughness:1}), panelB = std(0x3d0d1b,{roughness:1}), sconce = glow(0xffc66e);
for (let z = Z_FRONT+3, i = 0; z < Z_BACK-1; z += 2.2, i++){
  for (const s of [-1,1]){
    box(0.12, 6.5, 1.9, i%2 ? panelA : panelB, s*(HW-0.06), 5.2, z);
    if (i%2 === 0) box(0.08, 0.5, 0.18, sconce, s*(HW-0.1), 2.6 + Math.min(4.2, Math.max(0,(z-ROW0)/ROWD)*ROWH), z);
  }
}
{ const g = new THREE.BufferGeometry(), n = 500, a = new Float32Array(n*3);
  for (let i = 0; i < n; i++){ a[i*3] = (Math.random()*2-1)*(HW-0.5); a[i*3+1] = H-0.05; a[i*3+2] = Z_FRONT + Math.random()*(Z_BACK-Z_FRONT); }
  g.setAttribute('position', new THREE.BufferAttribute(a,3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color:0xffe2b0, size:0.07 }))); }

// sân khấu + bậc thang
const wood = std(0x4a2814, { roughness:.6 });
box(HW*2, STAGE_H, STAGE_Z-Z_FRONT, wood, 0, STAGE_H/2, (STAGE_Z+Z_FRONT)/2);
box(HW*2, 0.06, 0.08, glow(0xe8b04a), 0, STAGE_H-0.03, STAGE_Z+0.04);
for (const s of [-1,1]) for (let k = 0; k < 3; k++){
  const hgt = (k+1)*STAGE_H/3, z0 = STAGE_Z+2-(k+1)*(2/3);
  box(3, hgt, 2/3, wood, s*9.5, hgt/2, z0+1/3);
}
// bậc ghế
const riser = std(0x22080f);
for (let i = 0; i < ROWS; i++){
  const h = (i+1)*ROWH, z0 = ROW0+i*ROWD, depth = (i === ROWS-1) ? (Z_BACK-z0) : ROWD;
  box(HW*2, h, depth, riser, 0, h/2, z0+depth/2);
  box(HW*2, 0.025, 0.04, glow(0x6b2a1a), 0, h+0.01, z0+0.02);
}
{ const velvet = std(0x7a1830, { roughness:.95 }), pos = [];
  for (let i = 0; i < ROWS; i++) for (let x = -12.9; x <= 12.9; x += 0.78){ if (Math.abs(x) < 1.4) continue; pos.push([x,(i+1)*ROWH,ROW0+i*ROWD+0.75]); }
  const cush = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62,0.16,0.55), velvet, pos.length);
  const back = new THREE.InstancedMesh(new THREE.BoxGeometry(0.62,0.7,0.12), velvet, pos.length);
  const arm  = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08,0.55,0.55), std(0x2a0a12), pos.length);
  const m = new THREE.Matrix4();
  pos.forEach((p,i) => {
    m.makeTranslation(p[0],p[1]+0.42,p[2]); cush.setMatrixAt(i,m);
    m.makeTranslation(p[0],p[1]+0.75,p[2]+0.3); back.setMatrixAt(i,m);
    m.makeTranslation(p[0]+0.35,p[1]+0.28,p[2]); arm.setMatrixAt(i,m);
  });
  scene.add(cush, back, arm); }

// màn hình lớn
box(16.8, 9.8, 0.2, std(0x050203), 0, SCREEN_Y, Z_FRONT+0.2);
const idleScr = canvasTex(1600, 900);
const screenIdle = new THREE.Mesh(new THREE.PlaneGeometry(16,9), new THREE.MeshBasicMaterial({ map:idleScr.t, fog:false }));
screenIdle.position.set(0, SCREEN_Y, SCREEN_Z); scene.add(screenIdle);
const screenHole = new THREE.Mesh(new THREE.PlaneGeometry(16,9), holeMat);
screenHole.position.copy(screenIdle.position); screenHole.visible = false; scene.add(screenHole);
// băng chữ phía trên màn hình
const bannerTex = canvasTex(2048, 102);
const banner = new THREE.Mesh(new THREE.PlaneGeometry(16, 0.8), new THREE.MeshBasicMaterial({ map:bannerTex.t, fog:false }));
banner.position.set(0, 11.5, Z_FRONT+0.62); scene.add(banner);
// rèm
function curtain(x){
  const g = new THREE.PlaneGeometry(4, H-0.5, 48, 1), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i)*6)*0.18);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color:0x6e1029, roughness:.9, side:THREE.DoubleSide }));
  m.position.set(x, (H-0.5)/2+0.25, Z_FRONT+0.9); scene.add(m);
}
curtain(-10.9); curtain(10.9);
// loa
for (const s of [-1,1]){
  box(1.1, 2.4, 0.9, std(0x111111,{roughness:.5}), s*8.2, STAGE_H+1.2, STAGE_Z-1.2);
  box(0.7, 0.7, 0.02, std(0x2a2a2a), s*8.2, STAGE_H+1.6, STAGE_Z-0.74);
}
// cây mic
box(0.04, 1.5, 0.04, std(0x999999,{metalness:.8,roughness:.3}), MIC.x, STAGE_H+0.75, MIC.z);
const micHeadMat = std(0x333333,{metalness:.6,roughness:.4});
const standMic = new THREE.Mesh(new THREE.SphereGeometry(0.07,16,12), micHeadMat);
standMic.position.set(MIC.x, STAGE_H+1.55, MIC.z); scene.add(standMic);
const micRing = new THREE.Mesh(new THREE.RingGeometry(0.7,0.82,48), new THREE.MeshBasicMaterial({ color:0xe0577a, transparent:true, opacity:.6, side:THREE.DoubleSide }));
micRing.rotation.x = -Math.PI/2; micRing.position.set(MIC.x, STAGE_H+0.02, MIC.z); scene.add(micRing);

// màn hình nhắc lời: đặt ở mép sân khấu, quay về phía người hát
const PW = 1.5, PH = PW*9/16;
const promptGroup = new THREE.Group();
promptGroup.position.set(0, STAGE_H+0.5, STAGE_Z-0.45);
scene.add(promptGroup);
promptGroup.lookAt(MIC.x, STAGE_H+1.65, MIC.z);
const housing = new THREE.Mesh(new THREE.BoxGeometry(PW+0.12, PH+0.12, 0.22), std(0x0b0b0e,{roughness:.5}));
housing.position.z = -0.12; promptGroup.add(housing);
const promptTex = canvasTex(640, 360);
const promptIdle = new THREE.Mesh(new THREE.PlaneGeometry(PW,PH), new THREE.MeshBasicMaterial({ map:promptTex.t, fog:false }));
promptIdle.position.z = 0.002; promptGroup.add(promptIdle);
const promptHole = new THREE.Mesh(new THREE.PlaneGeometry(PW,PH), holeMat);
promptHole.position.z = 0.002; promptHole.visible = false; promptGroup.add(promptHole);
box(0.5, 0.5, 0.5, std(0x0b0b0e), 0, STAGE_H+0.2, STAGE_Z-0.35);
promptGroup.updateMatrixWorld(true);

// máy chọn bài
const kioTex = canvasTex(512, 360);
box(0.9, 1.15, 0.6, std(0x1c1c22,{roughness:.4,metalness:.3}), KIOSK.x, STAGE_H+0.575, KIOSK.z);
{ const s = new THREE.Mesh(new THREE.PlaneGeometry(0.85,0.6), new THREE.MeshBasicMaterial({ map:kioTex.t }));
  s.position.set(KIOSK.x, STAGE_H+1.33, KIOSK.z+0.18); s.rotation.x = -0.55; scene.add(s);
  box(0.92, 0.66, 0.06, std(0x0a0a0d), KIOSK.x, STAGE_H+1.31, KIOSK.z+0.15).rotation.x = -0.55; }
const ring = new THREE.Mesh(new THREE.RingGeometry(0.9,1.05,48), new THREE.MeshBasicMaterial({ color:0xe8b04a, transparent:true, opacity:.7, side:THREE.DoubleSide }));
ring.rotation.x = -Math.PI/2; ring.position.set(KIOSK.x, STAGE_H+0.02, KIOSK.z+1); scene.add(ring);

// ánh sáng
scene.add(new THREE.AmbientLight(0xffe8e0, 0.28));
scene.add(new THREE.HemisphereLight(0x7a3050, 0x120408, 0.45));
function spot(color,inten,x,y,z,tx,ty,tz,ang){ const l = new THREE.SpotLight(color,inten,40,ang,0.6,1.2); l.position.set(x,y,z); l.target.position.set(tx,ty,tz); scene.add(l, l.target); return l; }
spot(0xffd9a0, 2.2, 0, H-0.5, -8, MIC.x, STAGE_H, MIC.z, 0.42);
spot(0xff5c8a, 1.4, -8, H-0.5, -10, -2, STAGE_H, -17, 0.35);
spot(0x5cc8ff, 1.4, 8, H-0.5, -10, 2, STAGE_H, -17, 0.35);
const kioLight = new THREE.PointLight(0xffc66e, 1.2, 6, 2); kioLight.position.set(KIOSK.x, STAGE_H+2, KIOSK.z+1); scene.add(kioLight);
const screenLight = new THREE.PointLight(0x9fb8ff, 0.9, 30, 1.5); screenLight.position.set(0, STAGE_H+5, Z_FRONT+3); scene.add(screenLight);
for (const z of [-4,4]) for (const s of [-1,1]){ const l = new THREE.PointLight(s < 0 ? 0xff4d7a : 0xffb84d, 0.6, 12, 2); l.position.set(s*12.5, 6, z); scene.add(l); }

// lớp video CSS3D
function videoEl(w,h,id){
  const wrap = document.createElement('div');
  wrap.style.cssText = `width:${w}px;height:${h}px;background:#000;backface-visibility:hidden;pointer-events:none`;
  const inner = document.createElement('div'); inner.id = id; wrap.appendChild(inner); return wrap;
}
const bigCss = new CSS3DObject(videoEl(1280, 720, 'ytBig'));
bigCss.position.copy(screenIdle.position); bigCss.scale.setScalar(16/1280); bigCss.visible = false; cssScene.add(bigCss);
const promptCss = new CSS3DObject(videoEl(640, 360, 'ytPrompt'));
promptIdle.getWorldPosition(promptCss.position); promptIdle.getWorldQuaternion(promptCss.quaternion);
promptCss.scale.setScalar(PW/640); promptCss.visible = false; cssScene.add(promptCss);

function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); cssRenderer.setSize(w, h);
  camera.aspect = w/h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize); resize();

/* ================= trạng thái chung ================= */
let uid = null, peer = null, isHost = false, netReady = false, hostConn = null;
let queue = [], now = null, mic = null, videoError = '';
const users = new Map();            // id -> { n, c, p, r }
let serverOffset = 0;               // lệch giờ so với máy chủ phòng
const serverNow = () => Date.now() + serverOffset;

/* ================= vẽ màn hình ================= */
function wrapLines(ctx,text,maxW,maxLines){
  const words = String(text).split(/\s+/).filter(Boolean), lines = []; let cur = '', cut = false;
  for (let i = 0; i < words.length; i++){
    const t = cur ? cur+' '+words[i] : words[i];
    if (ctx.measureText(t).width > maxW && cur){ lines.push(cur); cur = words[i]; if (lines.length === maxLines){ cut = true; cur = ''; break; } }
    else cur = t;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines){ lines.length = maxLines; cut = true; }
  if (cut){ let l = lines[maxLines-1]; while (l && ctx.measureText(l+'…').width > maxW) l = l.slice(0,-1); lines[maxLines-1] = l+'…'; }
  return lines;
}
function drawAll(){
  // màn hình lớn khi chưa có video
  const c = idleScr.c.getContext('2d');
  const g = c.createLinearGradient(0,0,1600,900); g.addColorStop(0,'#1a0612'); g.addColorStop(1,'#071222');
  c.fillStyle = g; c.fillRect(0,0,1600,900);
  c.fillStyle = '#fff6ea'; c.font = '800 92px '+FONT;
  if (videoError){
    c.fillText('Video này không phát được', 110, 300);
    c.fillStyle = '#d9bfb0'; c.font = '400 46px '+FONT; c.fillText(videoError, 110, 390);
  } else {
    c.fillText('Phòng hát đang chờ ca sĩ', 110, 300);
    c.fillStyle = '#d9bfb0'; c.font = '400 46px '+FONT; c.fillText('Lên sân khấu, đến máy chọn bài để xếp hàng.', 110, 390);
  }
  c.fillStyle = '#e8b04a'; c.font = '600 40px '+FONT; c.fillText(queue.length ? 'Tiếp theo' : 'Hàng chờ đang trống', 110, 560);
  queue.slice(0,4).forEach((q,i) => {
    c.font = '600 44px '+FONT; c.fillStyle = '#fff6ea';
    c.fillText(wrapLines(c,(i+1)+'.  '+q.title,1050,1)[0], 110, 630+i*66);
    c.font = '400 34px '+FONT; c.fillStyle = '#bfa293'; c.fillText(q.name, 1230, 630+i*66);
  });
  idleScr.t.needsUpdate = true;
  // băng chữ
  const b = bannerTex.c.getContext('2d');
  b.fillStyle = '#12060b'; b.fillRect(0,0,2048,102);
  b.font = '600 52px '+FONT; b.textAlign = 'center';
  if (now){ b.fillStyle = '#e8b04a'; b.fillText(wrapLines(b, 'Đang hát: '+now.title+'  —  '+now.name, 1950, 1)[0], 1024, 70); }
  else { b.fillStyle = '#d9bfb0'; b.fillText('Phòng hát  '+roomId, 1024, 70); }
  b.textAlign = 'left'; bannerTex.t.needsUpdate = true;
  // màn hình nhắc lời khi không có video
  const p = promptTex.c.getContext('2d');
  p.fillStyle = '#08080b'; p.fillRect(0,0,640,360);
  p.fillStyle = '#e8b04a'; p.font = '800 40px '+FONT; p.fillText('Màn hình nhắc lời', 40, 150);
  p.fillStyle = '#bfa293'; p.font = '400 26px '+FONT; p.fillText(now ? 'Đứng gần mic để xem lời' : 'Video hiện ở đây khi có bài', 40, 210);
  promptTex.t.needsUpdate = true;
  // máy chọn bài
  const k = kioTex.c.getContext('2d');
  k.fillStyle = '#120a14'; k.fillRect(0,0,512,360);
  k.fillStyle = '#e8b04a'; k.font = '800 54px '+FONT; k.fillText('Chọn bài', 40, 110);
  k.fillStyle = '#fff6ea'; k.font = '400 30px '+FONT; k.fillText(queue.length+' bài đang chờ', 40, 170);
  k.fillStyle = now ? '#e0577a' : '#6fd19c'; k.fillText(now ? 'Đang có người hát' : 'Sân khấu trống', 40, 220);
  k.fillStyle = '#bfa293'; k.font = '400 24px '+FONT; k.fillText('Đứng trong vòng sáng', 40, 300);
  kioTex.t.needsUpdate = true;
}
if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawAll);
drawAll();

/* ================= người chơi, nhảy, điều khiển ================= */
const player = { x:0, z:-10.5, y:0, vy:0, ground:true };
let camY = 1.6, yaw = 0, pitch = 0.05;
let thirdPerson = LS.get('kara.view') === '3', tpDist = 3.6, selfAv = null;
function setView(tp){
  thirdPerson = tp; LS.set('kara.view', tp ? '3' : '1');
  $('#viewBtn').textContent = tp ? 'Góc nhìn thứ nhất (V)' : 'Góc nhìn thứ ba (V)';
  if (tp) pitch = clamp(pitch, -0.9, 0.45);
}
function ensureSelfAvatar(){
  if (selfAv && (selfAv.name !== me.name || selfAv.color !== me.color)){ scene.remove(selfAv.g); selfAv = null; }
  if (!selfAv) selfAv = makeAvatar(me.name || 'Bạn', me.color);
}
function floorY(x,z){
  if (z < STAGE_Z) return STAGE_H;
  const ax = Math.abs(x);
  if (z < STAGE_Z+2 && ax >= 8 && ax <= 11){ const t = STAGE_Z+2-z; return Math.min(3, Math.floor(t/(2/3))+1)*STAGE_H/3; }
  if (z >= ROW0) return Math.min(ROWS, Math.floor((z-ROW0)/ROWD)+1)*ROWH;
  return 0;
}
function blocked(x,z){
  if (Math.hypot(x-KIOSK.x, z-KIOSK.z) < 0.65) return true;
  if (Math.abs(x) < 0.9 && z > STAGE_Z-0.75 && z < STAGE_Z) return true;   // khối màn hình nhắc lời
  return false;
}
function tryMove(nx,nz){
  nx = clamp(nx, -HW+0.5, HW-0.5); nz = clamp(nz, Z_FRONT+1.2, Z_BACK-0.5);
  if (blocked(nx,nz)) return;
  if (floorY(nx,nz) - player.y > 0.45) return;   // quá cao: phải nhảy mới lên được
  player.x = nx; player.z = nz;
}
function teleport(x,z,lookX,lookZ,pt){
  player.x = x; player.z = z; player.y = floorY(x,z); player.vy = 0; player.ground = true; camY = player.y+1.6;
  yaw = Math.atan2(-(lookX-x), -(lookZ-z)); pitch = pt || 0;
}
function jump(){ if (player.ground){ player.vy = 4.8; player.ground = false; } }
$('#goStage').onclick = () => teleport(KIOSK.x-0.6, KIOSK.z+1.6, KIOSK.x, KIOSK.z);
$('#goSeat').onclick = () => teleport(0.3, -3.5, 0, -18);
$('#copyLink').onclick = async () => {
  try{ await navigator.clipboard.writeText(location.href); toast('Đã sao chép link phòng. Gửi cho bạn bè để vào cùng.'); }
  catch(e){ prompt('Sao chép link này:', location.href); }
};

const keys = {};
const modalOpen = () => document.querySelector('.modal.on');
window.addEventListener('keydown', e => {
  if (e.key === 'Alt'){ e.preventDefault(); if (e.repeat || modalOpen()) return; if (locked || freeLook) stopLook(); else startLook(false); return; }
  if (e.target && e.target.tagName === 'INPUT'){ if (e.key === 'Escape') closeKiosk(); return; }
  if (e.key === 'Escape'){ closeKiosk(); return; }
  if (modalOpen()) return;
  const k = e.key.toLowerCase(); keys[k] = true; keys.shift = e.shiftKey;
  if (k === ' '){ jump(); e.preventDefault(); }
  if (k === 'e' && nearKiosk()) openKiosk();
  if (k === 'f' && !e.repeat) toggleMic();
  if (k === 'v' && !e.repeat) setView(!thirdPerson);
  if (k.startsWith('arrow')) e.preventDefault();
});
window.addEventListener('keyup', e => { if (e.key === 'Alt') e.preventDefault(); keys[e.key.toLowerCase()] = false; keys.shift = e.shiftKey; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let drag = null;
const lookPitch = d => { pitch = thirdPerson ? clamp(pitch-d, -0.9, 0.45) : clamp(pitch-d, -1.2, 1.2); };
// Chuột: bấm vào màn hình để khoá chuột, rồi chỉ cần di chuột là quay. Alt để hiện/ẩn con trỏ.
let locked = false, freeLook = false, lockBroken = false, lockFromClick = false;
function updateLookUI(){
  const on = locked || freeLook;
  $('#crosshair').classList.toggle('on', on && !modalOpen());
  canvas.style.cursor = on ? 'none' : 'pointer';
  $('#hint').textContent = on ? 'Di chuột để nhìn, WASD đi, Space nhảy, Shift chạy, V đổi góc nhìn, F cầm mic, Alt hiện chuột'
                              : 'Bấm vào màn hình (hoặc Alt) để điều khiển góc nhìn bằng chuột';
}
function lockFailed(){
  if (lockFromClick){ lockBroken = true; freeLook = true; updateLookUI(); toast('Trình duyệt không cho khoá chuột. Vẫn quay được bằng cách di chuột; bấm Alt để hiện chuột.'); }
  else toast('Bấm vào màn hình để điều khiển lại.');
}
function startLook(fromClick){
  if (modalOpen() || locked || freeLook) return;
  if (lockBroken || !canvas.requestPointerLock){ freeLook = true; updateLookUI(); return; }
  lockFromClick = fromClick;
  try{ const r = canvas.requestPointerLock(); if (r && typeof r.catch === 'function') r.catch(lockFailed); }catch(e){ lockFailed(); }
}
function stopLook(){ freeLook = false; if (document.pointerLockElement === canvas) document.exitPointerLock(); locked = false; updateLookUI(); }
document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; updateLookUI(); });
document.addEventListener('pointerlockerror', lockFailed);
document.addEventListener('mousemove', e => {
  if (!(locked || freeLook) || modalOpen()) return;
  const mx = clamp(e.movementX || 0, -200, 200), my = clamp(e.movementY || 0, -200, 200);
  yaw -= mx*0.0024; lookPitch(my*0.0024);
});
canvas.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse'){ if (e.button === 0) startLook(true); return; }
  drag = { id:e.pointerId, x:e.clientX, y:e.clientY }; canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  yaw -= (e.clientX-drag.x)*0.006; lookPitch((e.clientY-drag.y)*0.006);
  drag.x = e.clientX; drag.y = e.clientY;
});
canvas.addEventListener('wheel', e => { if (thirdPerson){ tpDist = clamp(tpDist + Math.sign(e.deltaY)*0.4, 1.5, 7); e.preventDefault(); } }, { passive:false });
$('#viewBtn').onclick = () => setView(!thirdPerson);
setView(thirdPerson);
const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
const joy = $('#joy'), knob = joy.querySelector('i'); let jx = 0, jy = 0, joyId = null;
function joyMove(e){
  const r = joy.getBoundingClientRect(); let dx = e.clientX-(r.left+r.width/2), dy = e.clientY-(r.top+r.height/2);
  const d = Math.hypot(dx,dy), m = 45; if (d > m){ dx *= m/d; dy *= m/d; }
  jx = dx/m; jy = -dy/m; knob.style.transform = `translate(${dx}px,${dy}px)`;
}
joy.addEventListener('pointerdown', e => { joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId === joyId){ joyId = null; jx = jy = 0; knob.style.transform = ''; } };
joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
$('#jumpBtn').addEventListener('pointerdown', e => { e.preventDefault(); jump(); });

const onStage = () => player.y >= STAGE_H-0.01 && player.z < STAGE_Z;
const nearKiosk = () => onStage() && Math.hypot(player.x-KIOSK.x, player.z-(KIOSK.z+1)) < 1.6;
const nearMic = (r) => onStage() && Math.hypot(player.x-MIC.x, player.z-MIC.z) < r;
$('#kioskBtn').onclick = () => openKiosk();
$('#micBtn').onclick = () => toggleMic();

/* ================= nhân vật người khác ================= */
const avatars = new Map();
function labelSprite(text,color){
  const c = document.createElement('canvas'); c.width = 512; c.height = 112; const x = c.getContext('2d');
  x.font = '600 52px '+FONT; const w = Math.min(500, x.measureText(text).width+56);
  x.fillStyle = 'rgba(20,6,12,.78)'; x.beginPath();
  if (x.roundRect) x.roundRect((512-w)/2,14,w,84,42); else x.rect((512-w)/2,14,w,84); x.fill();
  x.fillStyle = color; x.beginPath(); x.arc((512-w)/2+30,56,10,0,7); x.fill();
  x.fillStyle = '#fff6ea'; x.textAlign = 'center'; x.fillText(text, 266, 74, w-60);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map:t, depthTest:false, transparent:true }));
  s.scale.set(2.3,0.5,1); s.position.y = 2.2; s.renderOrder = 10; return s;
}
function makeAvatar(name,color){
  const g = new THREE.Group(), mat = std(color,{roughness:.5});
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.32,1.15,20), mat); body.position.y = 0.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23,20,16), mat); head.position.y = 1.45;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.09,0.08), glow(0x20121a)); visor.position.set(0,1.48,-0.2);
  const handMic = new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.025,0.25,10), micHeadMat);
  handMic.position.set(0.22,1.3,-0.28); handMic.rotation.x = -0.6; handMic.visible = false;
  g.add(body, head, visor, handMic, labelSprite(name,color));
  scene.add(g);
  return { g, handMic, name, color, tx:0, ty:0, tz:0, tr:0, init:false };
}
function upsertAvatar(id, d){
  if (!d || !Array.isArray(d.p) || d.p.length !== 3 || !d.p.every(Number.isFinite)) return;
  const name = clean(d.n,24) || 'Khách', color = safeColor(d.c);
  let a = avatars.get(id);
  if (a && (a.name !== name || a.color !== color)){ scene.remove(a.g); a = null; }
  if (!a){ a = makeAvatar(name,color); avatars.set(id,a); }
  a.tx = clamp(d.p[0],-HW,HW); a.ty = clamp(d.p[1],0,8); a.tz = clamp(d.p[2],Z_FRONT,Z_BACK); a.tr = Number.isFinite(d.r) ? d.r : 0;
  if (!a.init){ a.g.position.set(a.tx,a.ty,a.tz); a.g.rotation.y = a.tr; a.init = true; }
}
function removeAvatar(id){ const a = avatars.get(id); if (a){ scene.remove(a.g); avatars.delete(id); } }

/* ================= giao diện ================= */
function renderPeople(){
  const list = $('#peopleList'); list.textContent = '';
  const rows = [{ name:(me.name||'Bạn')+' (bạn)', color:me.color, mic: mic && mic.uid === uid }];
  users.forEach((d,id) => { if (id !== uid) rows.push({ name:clean(d.n,24)||'Khách', color:safeColor(d.c), mic: mic && mic.uid === id }); });
  rows.forEach(r => {
    const li = document.createElement('li'), dot = document.createElement('span');
    dot.className = 'dot'; dot.style.background = r.color;
    li.append(dot, document.createTextNode(r.name + (r.mic ? '  🎤' : ''))); list.appendChild(li);
  });
  $('#peopleCount').textContent = rows.length + ' người trong phòng';
}
const isSinger = () => now && now.uid === uid;
function renderUI(){
  drawAll();
  $('#nowbar').classList.toggle('on', !!now);
  if (now){
    $('#nowTitle').textContent = now.title; $('#nowWho').textContent = 'Đang hát: '+now.name+(now.state === 'paused' ? ' (tạm dừng)' : '');
    $('#nowDot').style.background = now.color;
    $('#pauseBtn').style.display = isSinger() ? '' : 'none';
    $('#pauseBtn').textContent = now.state === 'paused' ? 'Tiếp tục' : 'Tạm dừng';
  }
  // mic
  $('#micbar').classList.toggle('on', !!mic);
  if (mic) $('#micText').textContent = mic.uid === uid ? '🎤 Bạn đang cầm mic. Cả phòng nghe thấy giọng bạn.' : '🎤 '+mic.name+' đang cầm mic';
  avatars.forEach((a,id) => { a.handMic.visible = !!(mic && mic.uid === id); });
  standMic.visible = !mic;
  // hàng chờ
  const ql = $('#queueList'); ql.textContent = '';
  if (!queue.length){ const li = document.createElement('li'); li.className = 'empty'; li.textContent = 'Chưa có bài nào. Thêm bài đầu tiên ở bước 2.'; ql.appendChild(li); }
  queue.forEach((q,i) => {
    const li = document.createElement('li');
    const pos = document.createElement('span'); pos.className = 'pos'; pos.textContent = i+1;
    const t = document.createElement('div'); t.className = 't';
    const b = document.createElement('b'); b.textContent = q.title;
    const s = document.createElement('span'); s.textContent = q.name; t.append(b,s); li.append(pos,t);
    if (q.uid === uid){
      const sing = document.createElement('button'); sing.className = 'primary'; sing.textContent = now ? 'Chờ lượt' : 'Hát ngay';
      sing.disabled = !!now; if (now) sing.title = 'Chờ bài đang hát kết thúc';
      sing.onclick = () => startSong(q);
      const rm = document.createElement('button'); rm.textContent = 'Xoá'; rm.onclick = () => net.send({ t:'remove', id:q.id });
      li.append(sing, rm);
    }
    ql.appendChild(li);
  });
    const sn = $('#singNowBtn'); sn.disabled = !!now; sn.textContent = now ? 'Đang có người hát' : 'Hát ngay';
  renderPeople();
}

/* ================= máy chọn bài ================= */
function openKiosk(){ stopLook(); $('#kioskModal').classList.add('on'); renderUI(); setTimeout(() => $('#q').focus(), 30); }
function closeKiosk(){ $('#kioskModal').classList.remove('on'); }
$('#closeKiosk').onclick = closeKiosk;
$('#kioskModal').addEventListener('pointerdown', e => { if (e.target.id === 'kioskModal') closeKiosk(); });
$('#searchBtn').onclick = () => {
  const q = clean($('#q').value,80); if (!q){ $('#q').focus(); return; }
  if (!$('#title').value) $('#title').value = q;
  window.open('https://www.youtube.com/results?search_query='+encodeURIComponent(q+' karaoke'), '_blank', 'noopener');
};
$('#q').addEventListener('keydown', e => { if (e.key === 'Enter') $('#searchBtn').click(); });
function readForm(){
  const msg = $('#addMsg'); msg.className = 'note';
  if (!netReady){ msg.className = 'note err'; msg.textContent = 'Chưa kết nối phòng, đợi vài giây rồi thử lại.'; return null; }
  const vid = ytId($('#url').value);
  if (!vid){ msg.className = 'note err'; msg.textContent = 'Link chưa đúng. Hãy dán link video YouTube, ví dụ https://www.youtube.com/watch?v=… hoặc https://youtu.be/…'; return null; }
  const title = clean($('#title').value,80) || clean($('#q').value,80) || 'Bài hát';
  return { title, vid };
}
function clearForm(){ $('#url').value = ''; $('#title').value = ''; $('#q').value = ''; }
$('#addBtn').onclick = () => {
  const item = readForm(); if (!item) return;
  net.send({ t:'add', item });
  const msg = $('#addMsg'); msg.className = 'note ok'; msg.textContent = 'Đã thêm “'+item.title+'” vào hàng chờ.'; clearForm();
};
$('#singNowBtn').onclick = () => { const item = readForm(); if (!item) return; clearForm(); startSong(null, item); };

function startSong(q, item){
  if (now){ toast('Đang có bài hát, chờ bài này kết thúc nhé.'); return; }
  net.send(q ? { t:'start', id:q.id } : { t:'start', item });
  closeKiosk();
  teleport(MIC.x, MIC.z+0.3, MIC.x, MIC.z+10, -0.42);   // đứng ở mic, quay mặt về khán giả
  if (!holding) grabMic();
}
function endSong(){ if (now) net.send({ t:'stop', key: now.vid + ':' + now.startedAt }); }
$('#endBtn').onclick = endSong;
$('#pauseBtn').onclick = () => { if (isSinger()) net.send({ t: now.state === 'paused' ? 'resume' : 'pause' }); };

/* ================= video YouTube đồng bộ ================= */
let ytBig = null, ytPrompt = null, musicVol = 80, voiceVol = 1;
const playTime = () => !now ? 0 : now.state === 'paused' ? (now.pos||0) : Math.max(0, (serverNow()-now.startedAt)/1000);
function makePlayer(elId, w, h, isBig){
  return new Promise(resolve => {
    const p = new YT.Player(elId, {
      width:w, height:h,
      playerVars:{ controls:0, disablekb:1, fs:0, iv_load_policy:3, modestbranding:1, playsinline:1, rel:0, origin:location.origin },
      events:{
        onReady: () => { if (isBig) p.setVolume(musicVol); else p.mute(); resolve(p); },
        onStateChange: e => {
          if (isBig && e.data === YT.PlayerState.ENDED && now && p._vid === now.vid) endSong();
          if (isBig && e.data === YT.PlayerState.PLAYING) $('#unlock').classList.remove('on');
        },
        onError: e => {
          if (!isBig || !now) return;
          videoError = (e.data === 101 || e.data === 150) ? 'Chủ video không cho phát trong trang khác. Hãy chọn bản khác.' : 'Video không tồn tại hoặc bị lỗi. Hãy chọn bản khác.';
          if (isSinger()){ toast(videoError); endSong(); }
          renderUI();
        }
      }
    });
  });
}
function syncPlayer(p, want){
  if (!p || typeof p.getPlayerState !== 'function') return;
  if (!want){
    if (p._vid && (!now || now.vid !== p._vid)){ p.stopVideo(); p._vid = null; }
    else if (p._vid && p.getPlayerState() === 1) p.pauseVideo();
    return;
  }
  const t = playTime();
  if (p._vid !== now.vid){
    p._vid = now.vid; p._started = Date.now();
    p.loadVideoById({ videoId:now.vid, startSeconds:t });
    return;
  }
  const st = p.getPlayerState(), cur = p.getCurrentTime() || 0;
  if (now.state === 'paused'){
    if (st === 1 || st === 3) p.pauseVideo();
    if (Math.abs(cur-t) > 1) p.seekTo(t, true);
    return;
  }
  if (st === 0) return;                                 // đã hết bài
  if (st !== 3 && Math.abs(cur-t) > 1.5) p.seekTo(t, true);
  if (st !== 1 && st !== 3) p.playVideo();
  if (p === ytBig && st !== 1 && Date.now()-p._started > 4000) $('#unlock').classList.add('on');
}
let lastNear = false;
function syncVideo(){
  const playing = !!now && !videoError;
  bigCss.visible = playing; screenHole.visible = playing; screenIdle.visible = !playing;
  syncPlayer(ytBig, playing);
  const near = playing && nearMic(3.5);       // chỉ người đứng gần mic mới thấy màn hình nhắc lời
  promptCss.visible = near; promptHole.visible = near; promptIdle.visible = !near;
  syncPlayer(ytPrompt, near);
  lastNear = near;
}
setInterval(syncVideo, 1000);
$('#unlock').onclick = () => { if (ytBig){ ytBig.unMute(); ytBig.setVolume(musicVol); ytBig.playVideo(); } audios().forEach(a => a.play().catch(() => {})); $('#unlock').classList.remove('on'); };
$('#musicVol').oninput = e => { musicVol = +e.target.value; if (ytBig && ytBig.setVolume) ytBig.setVolume(musicVol); };
$('#voiceVol').oninput = e => { voiceVol = +e.target.value/100; audios().forEach(a => a.volume = voiceVol); };

/* ================= mic: truyền giọng hát (WebRTC qua PeerJS) ================= */
const outCalls = new Map(), inCalls = new Map();   // id đối phương -> cuộc gọi
let localStream = null, holding = false, pendingMic = null, pendingT = 0;
let actx = null, monSrc = null, monGain = null;
const audios = () => [...inCalls.values()].map(e => e.audio).filter(Boolean);
function callPeer(id){
  if (!holding || !localStream || !peer || id === uid || outCalls.has(id)) return;
  let call; try{ call = peer.call(id, localStream); }catch(e){ return; }
  if (!call) return;
  outCalls.set(id, call);
  const drop = () => { if (outCalls.get(id) === call) outCalls.delete(id); };
  call.on('close', drop); call.on('error', drop);
}
function callAll(){ users.forEach((_, id) => { if (id !== uid) callPeer(id); }); }
function onCall(call){
  const old = inCalls.get(call.peer);
  if (old){ try{ old.call.close(); }catch(_){} if (old.audio) old.audio.remove(); }
  const e = { call, audio:null }; inCalls.set(call.peer, e);
  call.answer();
  call.on('stream', st => {
    if (!e.audio){ e.audio = document.createElement('audio'); e.audio.autoplay = true; e.audio.style.display = 'none'; document.body.appendChild(e.audio); }
    e.audio.srcObject = st; e.audio.volume = voiceVol; e.audio.muted = !(mic && mic.uid === call.peer);
    e.audio.play().catch(() => $('#unlock').classList.add('on'));
  });
  call.on('close', () => { if (inCalls.get(call.peer) === e){ if (e.audio){ e.audio.srcObject = null; e.audio.remove(); } inCalls.delete(call.peer); } });
}
function updateVoiceMute(){ inCalls.forEach((e, id) => { if (e.audio) e.audio.muted = !(mic && mic.uid === id); }); }
function applyMonitor(){
  try{
    const want = holding && localStream && $('#monitor').checked;
    if (!want){ if (monSrc){ monSrc.disconnect(); monGain.disconnect(); monSrc = monGain = null; } return; }
    if (!actx){ const AC = window.AudioContext || window.webkitAudioContext; actx = new AC(); }
    if (actx.state === 'suspended') actx.resume();
    if (!monSrc){ monSrc = actx.createMediaStreamSource(localStream); monGain = actx.createGain(); monSrc.connect(monGain); monGain.connect(actx.destination); }
    monGain.gain.value = voiceVol;
  }catch(e){}
}
$('#monitor').onchange = () => { applyMonitor(); if ($('#monitor').checked && !holding) toast('Cầm mic (F) ở cây mic trên sân khấu để nghe giọng mình.'); };
async function grabMic(){
  if (!netReady){ toast('Chưa kết nối phòng.'); return; }
  if (holding || pendingMic) return;
  if (mic && mic.uid !== uid && users.has(mic.uid)){ toast(mic.name+' đang cầm mic.'); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ toast('Trình duyệt này không hỗ trợ mic. Hãy dùng Chrome hoặc Edge.'); return; }
  let stream;
  try{ stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:true, noiseSuppression:true, autoGainControl:true } }); }
  catch(e){ toast('Chưa dùng được mic. Bấm biểu tượng ổ khoá cạnh địa chỉ trang và cho phép Micro.'); return; }
  pendingMic = stream; net.send({ t:'mic', on:true });
  clearTimeout(pendingT);
  pendingT = setTimeout(() => { if (pendingMic){ pendingMic.getTracks().forEach(t => t.stop()); pendingMic = null; toast('Chưa cầm được mic, thử lại nhé.'); } }, 5000);
  checkMic();
}
function checkMic(){            // gọi sau mỗi lần trạng thái phòng thay đổi
  if (pendingMic && mic){
    if (mic.uid === uid){
      localStream = pendingMic; pendingMic = null; clearTimeout(pendingT); holding = true;
      applyMonitor(); toast('Bạn đã cầm mic. Cả phòng đang nghe giọng bạn. Bấm F để trả mic.');
    } else if (users.has(mic.uid)){
      pendingMic.getTracks().forEach(t => t.stop()); pendingMic = null; clearTimeout(pendingT); toast(mic.name+' vừa cầm mic trước bạn.');
    }
  }
  if (holding && (!mic || mic.uid !== uid)) stopHolding();
  if (holding) callAll();
  updateVoiceMute();
}
function stopHolding(){
  holding = false;
  outCalls.forEach(c => { try{ c.close(); }catch(_){} }); outCalls.clear();
  if (localStream){ localStream.getTracks().forEach(t => t.stop()); localStream = null; }
  applyMonitor();
}
function releaseMic(){
  if (pendingMic){ pendingMic.getTracks().forEach(t => t.stop()); pendingMic = null; }
  if (holding) stopHolding();
  net.send({ t:'mic', on:false });
}
function toggleMic(){
  if (holding) releaseMic();
  else if (nearMic(1.4)) grabMic();
  else toast('Hãy đứng trong vòng sáng ở cây mic trên sân khấu.');
}
window.addEventListener('pagehide', () => { try{ if (peer) peer.destroy(); }catch(_){} });

/* ================= kết nối phòng (PeerJS) ================= */
const sw = $('#swatches');
COLORS.forEach(c => {
  const b = document.createElement('button'); b.style.background = c; b.setAttribute('aria-label','Màu '+c);
  b.setAttribute('aria-pressed', String(c === me.color));
  b.onclick = () => { me.color = c; sw.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); };
  sw.appendChild(b);
});
$('#nameIn').value = me.name;
function setStatus(t){ $('#status').textContent = t; }
$('#inviteUrl').value = inviteLink();
async function copyInvite(){
  try{ await navigator.clipboard.writeText(inviteLink()); toast('Đã sao chép link mời. Gửi cho bạn bè để vào cùng phòng.'); }
  catch(e){ $('#inviteUrl').select(); toast('Bấm Ctrl + C để sao chép link.'); }
}
$('#copyLink').onclick = copyInvite; $('#copyInvite').onclick = copyInvite;

const PCONF = { debug:0, config:{ iceServers:[ { urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302'] } ] } };
const conns = new Map();           // (chủ phòng) id -> kết nối
const lastSeen = new Map();
let posDirty = false;
const rid = () => Math.random().toString(36).slice(2,10);
const validP = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);

// gửi một yêu cầu: chủ phòng tự xử lý, khách gửi lên chủ phòng
const net = {
  send(m){
    if (!netReady) return;
    if (isHost) hostHandle(uid, m);
    else if (hostConn && hostConn.open){ try{ hostConn.send(m); }catch(_){} }
  }
};

/* ----- chủ phòng ----- */
function stateMsg(){
  return { t:'state', queue, now, mic, users:[...users].map(([id,d]) => [id, d.n, d.c]), h:Date.now() };
}
function broadcast(m){ conns.forEach(c => { if (c.open) try{ c.send(m); }catch(_){} }); }
function changed(){ applyState(stateMsg()); broadcast(stateMsg()); }
function hostHandle(from, m){
  if (!m || typeof m !== 'object') return;
  lastSeen.set(from, Date.now());
  const u = users.get(from), who = { name: u ? u.n : 'Khách', color: u ? u.c : '#cccccc' };
  switch (m.t){
    case 'me': {
      const d = { n: clean(m.n,24) || 'Khách', c: safeColor(m.c), p: validP(m.p) ? m.p : [0,0,0], r: Number.isFinite(m.r) ? m.r : 0 };
      const isNew = !u || u.n !== d.n || u.c !== d.c;
      users.set(from, d); posDirty = true;
      if (from !== uid) upsertAvatar(from, d);
      if (isNew) changed();
      break;
    }
    case 'add': {
      const it = m.item; if (!it || !validVid(it.vid) || queue.length >= 50) return;
      queue.push({ id:rid(), vid:it.vid, title:clean(it.title,80) || 'Bài hát', uid:from, name:who.name, color:who.color, ts:Date.now() });
      changed(); break;
    }
    case 'remove': queue = queue.filter(q => !(q.id === m.id && q.uid === from)); changed(); break;
    case 'start': {
      if (now) return;
      let q = null;
      if (m.id){ q = queue.find(x => x.id === m.id && x.uid === from); if (!q) return; queue = queue.filter(x => x !== q); }
      else if (m.item && validVid(m.item.vid)) q = { vid:m.item.vid, title:clean(m.item.title,80) || 'Bài hát' };
      else return;
      now = { vid:q.vid, title:q.title, uid:from, name:who.name, color:who.color, startedAt:Date.now(), state:'playing', pos:0 };
      changed(); break;
    }
    case 'stop': if (now && (!m.key || m.key === now.vid + ':' + now.startedAt)){ now = null; changed(); } break;
    case 'pause': if (now && now.uid === from && now.state !== 'paused'){ now.pos = (Date.now()-now.startedAt)/1000; now.state = 'paused'; changed(); } break;
    case 'resume': if (now && now.uid === from && now.state === 'paused'){ now.startedAt = Date.now() - now.pos*1000; now.state = 'playing'; changed(); } break;
    case 'mic':
      if (m.on){ if (!mic || mic.uid === from || !users.has(mic.uid)){ mic = { uid:from, name:who.name, color:who.color }; changed(); } }
      else if (mic && mic.uid === from){ mic = null; changed(); }
      break;
  }
}
function hostDrop(id){
  conns.delete(id); lastSeen.delete(id);
  if (!users.has(id)) return;
  users.delete(id); removeAvatar(id);
  if (mic && mic.uid === id) mic = null;
  if (now && now.uid === id) now = null;          // người hát rời phòng
  changed();
}
function onHostConn(c){
  c.on('open', () => { conns.set(c.peer, c); lastSeen.set(c.peer, Date.now()); try{ c.send(stateMsg()); }catch(_){} });
  c.on('data', m => {
    if (m && m.t === 'ping'){ lastSeen.set(c.peer, Date.now()); try{ c.send({ t:'pong', c:m.c, h:Date.now() }); }catch(_){} return; }
    hostHandle(c.peer, m);
  });
  c.on('close', () => hostDrop(c.peer));
  c.on('error', () => hostDrop(c.peer));
}
setInterval(() => {                      // chủ phòng: gửi vị trí mọi người 10 lần/giây
  if (!isHost || !posDirty) return; posDirty = false;
  const u = {}; users.forEach((d, id) => { u[id] = [d.p[0], d.p[1], d.p[2], d.r]; });
  broadcast({ t:'pos', u });
}, 100);
setInterval(() => {                      // chủ phòng: loại người mất kết nối
  if (!isHost) return;
  const t = Date.now();
  lastSeen.forEach((v, id) => { if (id !== uid && t - v > 12000){ const c = conns.get(id); try{ c && c.close(); }catch(_){} hostDrop(id); } });
}, 3000);

/* ----- áp dụng trạng thái (chủ phòng và khách) ----- */
function applyState(st){
  if (!st || typeof st !== 'object') return;
  queue = Array.isArray(st.queue) ? st.queue.filter(q => q && validVid(q.vid)).map(q => ({
    id:String(q.id), vid:q.vid, title:clean(q.title,80) || 'Bài hát', uid:String(q.uid), name:clean(q.name,24) || 'Khách', color:safeColor(q.color), ts:Number(q.ts) || 0 })) : [];
  const v = st.now, prevKey = now ? now.vid + now.startedAt : '';
  now = v && validVid(v.vid) ? { vid:v.vid, title:clean(v.title,80) || 'Bài hát', uid:String(v.uid), name:clean(v.name,24) || 'Khách', color:safeColor(v.color),
    startedAt:Number(v.startedAt) || serverNow(), state: v.state === 'paused' ? 'paused' : 'playing', pos:Number(v.pos) || 0 } : null;
  if ((now ? now.vid + now.startedAt : '') !== prevKey) videoError = '';
  mic = st.mic && typeof st.mic.uid === 'string' ? { uid:st.mic.uid, name:clean(st.mic.name,24) || 'Khách', color:safeColor(st.mic.color) } : null;
  if (Array.isArray(st.users) && !isHost){
    const seen = new Set();
    st.users.forEach(row => {
      if (!Array.isArray(row)) return;
      const [id, n, c] = row; if (typeof id !== 'string') return; seen.add(id);
      const d = users.get(id) || { p:[0,0,0], r:0 }; d.n = clean(n,24) || 'Khách'; d.c = safeColor(c); users.set(id, d);
      if (id !== uid && validP(d.p) && (d.p[0] || d.p[2])) upsertAvatar(id, d);
    });
    [...users.keys()].forEach(id => { if (!seen.has(id)){ users.delete(id); removeAvatar(id); } });
  }
  renderUI(); syncVideo(); checkMic();
}
function applyPos(u){
  if (!u || typeof u !== 'object') return;
  Object.keys(u).forEach(id => {
    if (id === uid) return; const a = u[id]; if (!Array.isArray(a) || a.length !== 4 || !a.every(Number.isFinite)) return;
    const d = users.get(id); if (!d) return;
    d.p = [a[0], a[1], a[2]]; d.r = a[3]; upsertAvatar(id, d);
  });
}

/* ----- vào phòng: thử làm chủ phòng, nếu đã có chủ thì vào làm khách ----- */
let lastSent = '', lastSentAt = 0, joined = false, starting = false;
function pushPresence(force){
  if (!netReady || !joined) return;
  const p = [+player.x.toFixed(2), +player.y.toFixed(2), +player.z.toFixed(2)], r = +yaw.toFixed(2);
  const sig = p.join(',') + r + me.name + me.color, t = Date.now();
  if (!force && sig === lastSent && t - lastSentAt < 3000) return;
  lastSent = sig; lastSentAt = t;
  net.send({ t:'me', n:me.name, c:me.color, p, r });
}
setInterval(() => pushPresence(false), 100);
function attachPeer(p){
  p.on('call', onCall);
  p.on('disconnected', () => { try{ if (!p.destroyed) p.reconnect(); }catch(_){} });
}
function netFail(e){
  console.error(e);
  setStatus('Không kết nối được máy chủ phòng (' + ((e && e.type) || 'lỗi mạng') + '). Kiểm tra mạng rồi tải lại trang.');
}
function becomeHost(seed){
  if (typeof Peer !== 'function'){ setStatus('Không tải được thư viện kết nối. Kiểm tra mạng rồi tải lại trang (Ctrl + F5).'); return; }
  setStatus('Đang mở phòng…');
  const p = new Peer(HOST_ID, PCONF);
  p.on('open', id => {
    peer = p; uid = id; isHost = true; netReady = true; serverOffset = 0; starting = false;
    users.clear(); avatars.forEach((_, k) => removeAvatar(k));
    if (seed){ queue = seed.queue || []; now = seed.now || null; } mic = null;
    attachPeer(p); p.on('connection', onHostConn);
    pushPresence(true); changed();
    if (holding || pendingMic){ const had = holding; stopHolding(); if (had) grabMic(); }
    setStatus('Bạn là chủ phòng. Gửi link mời để bạn bè vào cùng.');
  });
  p.on('error', e => {
    if (e.type === 'unavailable-id'){ try{ p.destroy(); }catch(_){} joinAsGuest(); }
    else if (!netReady) netFail(e);
  });
}
function joinAsGuest(){
  setStatus('Đang vào phòng…');
  const p = new Peer(PCONF);
  p.on('open', id => {
    peer = p; uid = id; isHost = false; attachPeer(p);
    const c = p.connect(HOST_ID, { reliable:true });
    hostConn = c;
    c.on('open', () => { netReady = true; starting = false; setStatus('Đã vào phòng. Gửi link mời để rủ thêm bạn bè.'); pushPresence(true); ping(); });
    c.on('data', m => {
      if (!m || typeof m !== 'object') return;
      if (m.t === 'state') applyState(m);
      else if (m.t === 'pos') applyPos(m.u);
      else if (m.t === 'pong' && Number.isFinite(m.c) && Number.isFinite(m.h)){ const rtt = Date.now() - m.c; serverOffset = m.h + rtt/2 - Date.now(); }
    });
    c.on('close', hostLost);
    c.on('error', hostLost);
  });
  p.on('error', e => {
    if (e.type === 'peer-unavailable'){ try{ p.destroy(); }catch(_){} hostLost(); }   // chủ phòng đã rời: thử làm chủ phòng
    else if (!netReady) netFail(e);
  });
}
function ping(){ if (!isHost && hostConn && hostConn.open){ try{ hostConn.send({ t:'ping', c:Date.now() }); }catch(_){} } }
setInterval(ping, 5000);
function hostLost(){
  if (starting) return; starting = true;
  const seed = { queue, now };
  netReady = false; hostConn = null;
  try{ if (peer) peer.destroy(); }catch(_){}
  peer = null; inCalls.forEach(e => { try{ e.call.close(); }catch(_){} }); inCalls.clear();
  setStatus('Chủ phòng đã rời. Đang mở lại phòng…');
  setTimeout(() => becomeHost(seed), 400 + Math.random()*1600);
}
function connect(){ starting = true; becomeHost(null); }

/* ----- trình phát YouTube (màn hình lớn có tiếng, màn hình nhắc lời tắt tiếng) ----- */
async function initPlayers(){
  bigCss.visible = true; promptCss.visible = true;
  cssRenderer.render(cssScene, camera);
  await window.__ytReady;
  [ytBig, ytPrompt] = await Promise.all([ makePlayer('ytBig',1280,720,true), makePlayer('ytPrompt',640,360,false) ]);
  syncVideo();
}

function doJoin(){
  me.name = clean($('#nameIn').value,24) || 'Khách';
  LS.set('kara.name', me.name); LS.set('kara.color', me.color);
  $('#joinModal').classList.remove('on'); joined = true; updateLookUI();
  ensureSelfAvatar();
  renderPeople(); connect(); initPlayers();
}
$('#joinBtn').onclick = doJoin;
$('#nameIn').addEventListener('keydown', e => { if (e.key === 'Enter') doJoin(); });

/* ================= vòng lặp ================= */
let last = performance.now();
const tpTarget = new THREE.Vector3(), tpDir = new THREE.Vector3(), tpPos = new THREE.Vector3();
function frame(t){
  const dt = Math.min(0.05, (t-last)/1000); last = t;
  if (!modalOpen()){
    let fx = 0, fz = 0;
    if (keys.w || keys.arrowup) fz += 1; if (keys.s || keys.arrowdown) fz -= 1;
    if (keys.a || keys.arrowleft) fx -= 1; if (keys.d || keys.arrowright) fx += 1;
    fx += jx; fz += jy;
    const len = Math.hypot(fx,fz); if (len > 1){ fx /= len; fz /= len; }
    if (len > 0.05){
      const sp = (keys.shift ? 6 : 3.2)*dt, sn = Math.sin(yaw), cs = Math.cos(yaw);
      tryMove(player.x + (-sn*fz + cs*fx)*sp, player.z);
      tryMove(player.x, player.z + (-cs*fz - sn*fx)*sp);
    }
  }
  // trọng lực và nhảy
  const fl = floorY(player.x, player.z);
  if (player.ground && fl < player.y - 0.01 && player.y - fl > 0.45) player.ground = false;   // bước khỏi mép cao
  if (player.ground){ player.y = fl; }
  else {
    player.vy -= 14*dt; player.y += player.vy*dt;
    if (player.y <= fl){ player.y = fl; player.vy = 0; player.ground = true; }
  }
  camY += (player.y+1.6 - camY) * Math.min(1, dt*(player.ground ? 14 : 40));
  if (selfAv){
    selfAv.g.visible = thirdPerson;
    selfAv.g.position.set(player.x, player.y, player.z); selfAv.g.rotation.y = yaw;
    selfAv.handMic.visible = holding;
  }
  if (thirdPerson){
    tpTarget.set(player.x, camY-0.05, player.z);
    const cp = Math.cos(pitch);
    tpDir.set(-Math.sin(yaw)*cp, Math.sin(pitch), -Math.cos(yaw)*cp);
    let d = tpDist;
    for (; d > 0.6; d -= 0.2){                         // kéo camera lại gần nếu chạm tường, trần, sàn
      tpPos.copy(tpTarget).addScaledVector(tpDir, -d);
      if (Math.abs(tpPos.x) < HW-0.3 && tpPos.z > Z_FRONT+0.5 && tpPos.z < Z_BACK-0.3 && tpPos.y < H-0.3 && tpPos.y > floorY(tpPos.x,tpPos.z)+0.25) break;
    }
    camera.position.copy(tpPos); camera.lookAt(tpTarget);
  } else {
    camera.position.set(player.x, camY, player.z);
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
  }

  const showKiosk = nearKiosk() && !modalOpen();
  $('#kioskBtn').classList.toggle('on', showKiosk);
  const showMic = !modalOpen() && (holding || (nearMic(1.4) && (!mic || !users.has(mic.uid))));
  $('#micBtn').classList.toggle('on', showMic);
  $('#micBtn').textContent = holding ? 'Bỏ mic (F)' : 'Cầm mic (F)';
  if (now && nearMic(3.5) !== lastNear) syncVideo();

  ring.material.opacity = 0.45 + Math.sin(t/300)*0.25;
  micRing.material.opacity = mic ? 0.15 : 0.4 + Math.sin(t/350)*0.2;
  kioLight.intensity = 1 + Math.sin(t/400)*0.3;
  screenLight.intensity = now ? 1.1 + Math.sin(t/220)*0.25 : 0.8;
  const k = 1 - Math.pow(0.001, dt);
  avatars.forEach(a => {
    a.g.position.x += (a.tx-a.g.position.x)*k*3; a.g.position.y += (a.ty-a.g.position.y)*k*4; a.g.position.z += (a.tz-a.g.position.z)*k*3;
    let dr = a.tr - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.g.rotation.y += dr*k*3;
  });
  renderer.render(scene, camera);
  cssRenderer.render(cssScene, camera);
  requestAnimationFrame(frame);
}
renderUI();
requestAnimationFrame(frame);
window.__appLoaded = true;
