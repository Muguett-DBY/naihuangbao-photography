import type { BeautySettings } from "../types/photo-editor";
import type { Landmarks } from "./editor-utils";
import { applyWarp, isSkin } from "./editor-utils";

// ── Face Effects (extracted from PhotoEditorPage render pipeline) ──

export function applyFaceEffects(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  lm: Landmarks,
  s: BeautySettings,
) {
  const jaw = lm.slice(0, 17);
  const lEye = lm.slice(36, 42);
  const rEye = lm.slice(42, 48);
  const nose = lm.slice(27, 36);
  const mouth = lm.slice(48, 68);
  const lBrow = lm.slice(17, 22);
  const rBrow = lm.slice(22, 27);
  const fL = Math.max(0, Math.floor(Math.min(...lm.map((p) => p.x))));
  const fR = Math.min(w, Math.ceil(Math.max(...lm.map((p) => p.x))));
  const fT = Math.max(0, Math.floor(Math.min(...lm.map((p) => p.y))));
  const fB = Math.min(h, Math.ceil(Math.max(...lm.map((p) => p.y))));
  const fCX = (fL + fR) / 2;
  const fCY = (fT + fB) / 2;

  // 1. Skin smoothing
  if (s.smooth > 0) {
    const r = Math.floor(s.smooth / 8) + 1;
    const out = new Uint8ClampedArray(d);
    for (let y = fT; y < fB; y++) {
      for (let x = fL; x < fR; x++) {
        if (!isSkin(x, y, lEye, rEye, mouth, jaw)) continue;
        const idx = (y * w + x) * 4;
        let sr = 0, sg = 0, sb = 0, c = 0;
        const cr = d[idx], cg = d[idx + 1], cb = d[idx + 2];
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
            const ni = (ny * w + nx) * 4;
            if (Math.abs(d[ni] - cr) + Math.abs(d[ni + 1] - cg) + Math.abs(d[ni + 2] - cb) > 80) continue;
            sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; c++;
          }
        }
        if (c > 0) { out[idx] = sr / c; out[idx + 1] = sg / c; out[idx + 2] = sb / c; }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = out[i];
  }

  // 2. Face slim
  if (s.slim > 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, (s.slim / 100) * 0.15, "horizontal"); }
  if (s.faceWidth !== 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, (-s.faceWidth / 100) * 0.2, "horizontal"); }
  if (s.faceLength !== 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, (s.faceLength / 100) * 0.15, "vertical"); }

  // 3. Eye enlargement
  if (s.bigeye > 0) {
    const eyes = [...lEye, ...rEye];
    const eCX = eyes.reduce((a, p) => a + p.x, 0) / eyes.length;
    const eCY = eyes.reduce((a, p) => a + p.y, 0) / eyes.length;
    const eR =
      Math.max(
        Math.max(...lEye.map((p) => p.x)) - Math.min(...lEye.map((p) => p.x)),
        Math.max(...rEye.map((p) => p.x)) - Math.min(...rEye.map((p) => p.x)),
      ) / 2;
    const st = (s.bigeye / 100) * 0.3;
    const tmp = new Uint8ClampedArray(d);
    for (let y = Math.floor(Math.max(0, eCY - eR * 2)); y < Math.ceil(Math.min(h, eCY + eR * 2)); y++) {
      for (let x = Math.floor(Math.max(0, eCX - eR * 2)); x < Math.ceil(Math.min(w, eCX + eR * 2)); x++) {
        const dx = x - eCX, dy = y - eCY, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < eR * 1.5) {
          const f = 1 + st * Math.max(0, 1 - dist / (eR * 1.5));
          const sx = Math.round(eCX + dx / f), sy = Math.round(eCY + dy / f);
          if (sx >= 0 && sx < w && sy >= 0 && sy < h) {
            const di = (y * w + x) * 4, si = (sy * w + sx) * 4;
            tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
          }
        }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = tmp[i];
  }

  // 4. Eye distance
  if (s.eyeDistance !== 0) {
    const eMidX = (lEye.reduce((a, p) => a + p.x, 0) / 6 + rEye.reduce((a, p) => a + p.x, 0) / 6) / 2;
    const st = (s.eyeDistance / 100) * 0.15;
    const tmp = new Uint8ClampedArray(d);
    for (let y = fT; y < fB; y++) {
      for (let x = fL; x < fR; x++) {
        const dist = (x - eMidX) / ((fR - fL) / 2);
        const warp = 1 + st * Math.exp(-dist * dist * 4);
        const sx = Math.round(eMidX + (x - eMidX) / warp);
        if (sx >= 0 && sx < w) {
          const di = (y * w + x) * 4, si = (y * w + sx) * 4;
          tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
        }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = tmp[i];
  }

  // 5. Nose slimming
  if (s.nose > 0) {
    const nCX = nose.reduce((a, p) => a + p.x, 0) / nose.length;
    const nCY = nose.reduce((a, p) => a + p.y, 0) / nose.length;
    const nR = 30, st = (s.nose / 100) * 0.2;
    const tmp = new Uint8ClampedArray(d);
    for (let y = Math.floor(Math.max(0, nCY - nR)); y < Math.ceil(Math.min(h, nCY + nR)); y++) {
      for (let x = Math.floor(Math.max(0, nCX - nR)); x < Math.ceil(Math.min(w, nCX + nR)); x++) {
        const dx = x - nCX, dy = y - nCY, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < nR) {
          const f = 1 + st * Math.max(0, 1 - dist / nR);
          const sx = Math.round(nCX + dx / f);
          if (sx >= 0 && sx < w) {
            const di = (y * w + x) * 4, si = (y * w + sx) * 4;
            tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
          }
        }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = tmp[i];
  }

  // 6. Lip enhancement
  if (s.lip > 0) {
    const lipCY = mouth.reduce((a, p) => a + p.y, 0) / mouth.length;
    const lipL = Math.min(...mouth.map((p) => p.x));
    const lipR = Math.max(...mouth.map((p) => p.x));
    const st = (s.lip / 100) * 30;
    for (let y = Math.floor(Math.max(0, lipCY - 15)); y < Math.ceil(Math.min(h, lipCY + 15)); y++) {
      for (let x = Math.floor(lipL); x < Math.ceil(lipR); x++) {
        const idx = (y * w + x) * 4;
        d[idx] = Math.min(255, d[idx] + st * 1.2);
        d[idx + 1] = Math.max(0, d[idx + 1] - st * 0.3);
        d[idx + 2] = Math.max(0, d[idx + 2] - st * 0.2);
      }
    }
  }

  // 7. Teeth whitening
  if (s.teeth > 0) {
    const mouthTop = Math.min(...mouth.map((p) => p.y));
    const mouthBot = Math.max(...mouth.map((p) => p.y));
    const mouthL = Math.min(...mouth.map((p) => p.x));
    const mouthR = Math.max(...mouth.map((p) => p.x));
    const teethCY = (mouthTop + mouthBot) / 2;
    const st = (s.teeth / 100) * 50;
    for (let y = Math.floor(teethCY); y < Math.ceil(mouthBot); y++) {
      for (let x = Math.floor(mouthL + 5); x < Math.ceil(mouthR - 5); x++) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        const idx = (y * w + x) * 4;
        const r = d[idx], g = d[idx + 1], b = d[idx + 2];
        const brightness = (r + g + b) / 3;
        if (brightness > 100) {
          d[idx] = Math.min(255, r + st);
          d[idx + 1] = Math.min(255, g + st * 0.9);
          d[idx + 2] = Math.min(255, b + st * 0.8);
        }
      }
    }
  }

  // 8. Forehead smoothing
  if (s.forehead > 0) {
    const bCY = Math.min(...lBrow.map((p) => p.y), ...rBrow.map((p) => p.y));
    const r = Math.floor(s.forehead / 8) + 1;
    for (let y = Math.floor(Math.max(0, bCY - 40)); y < Math.ceil(bCY); y++) {
      for (let x = fL; x < fR; x++) {
        const idx = (y * w + x) * 4;
        let sr = 0, sg = 0, sb = 0, c = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const ni = (ny * w + nx) * 4;
              sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; c++;
            }
          }
        }
        if (c > 0) { d[idx] = sr / c; d[idx + 1] = sg / c; d[idx + 2] = sb / c; }
      }
    }
  }

  // 9. Eye bag removal
  if (s.eyebag > 0) {
    const lEY = lEye.reduce((a, p) => a + p.y, 0) / 6 + 10;
    const rEY = rEye.reduce((a, p) => a + p.y, 0) / 6 + 10;
    const r = Math.floor(s.eyebag / 8) + 1;
    for (const ey of [lEY, rEY]) {
      for (let y = Math.floor(ey - 12); y < Math.ceil(ey + 12); y++) {
        for (let x = fL; x < fR; x++) {
          if (y < 0 || y >= h) continue;
          const idx = (y * w + x) * 4;
          let sr = 0, sg = 0, sb = 0, c = 0;
          for (let dy = -r; dy <= r; dy++) {
            const ny = y + dy;
            if (ny >= 0 && ny < h) {
              const ni = (ny * w + x) * 4;
              sr += d[ni]; sg += d[ni + 1]; sb += d[ni + 2]; c++;
            }
          }
          if (c > 0) { d[idx] = sr / c; d[idx + 1] = sg / c; d[idx + 2] = sb / c; }
        }
      }
    }
  }

  // 10. Dark circles
  if (s.darkcircle > 0) {
    const lEY = lEye.reduce((a, p) => a + p.y, 0) / 6;
    const rEY = rEye.reduce((a, p) => a + p.y, 0) / 6;
    const st = (s.darkcircle / 100) * 25;
    for (const ey of [lEY, rEY]) {
      for (let y = Math.floor(ey); y < Math.ceil(ey + 15); y++) {
        for (let x = fL; x < fR; x++) {
          if (y >= 0 && y < h) {
            const idx = (y * w + x) * 4;
            d[idx] = Math.min(255, d[idx] + st);
            d[idx + 1] = Math.min(255, d[idx + 1] + st * 0.8);
            d[idx + 2] = Math.min(255, d[idx + 2] + st * 0.6);
          }
        }
      }
    }
  }

  // 11. Whitening
  if (s.whiten > 0) {
    const st = (s.whiten / 100) * 40;
    for (let y = fT; y < fB; y++) {
      for (let x = fL; x < fR; x++) {
        if (!isSkin(x, y, lEye, rEye, mouth, jaw)) continue;
        const idx = (y * w + x) * 4;
        d[idx] = Math.min(255, d[idx] + st);
        d[idx + 1] = Math.min(255, d[idx + 1] + st);
        d[idx + 2] = Math.min(255, d[idx + 2] + st * 0.8);
      }
    }
  }

  // 12. Face lift
  if (s.facelift > 0) { applyWarp(d, w, h, fCX, fCY, fL, fR, fT, fB, (s.facelift / 100) * 0.1, "vertical"); }

  // 13. Jawline
  if (s.jawline > 0) {
    const st = (s.jawline / 100) * 0.12;
    const tmp = new Uint8ClampedArray(d);
    for (let y = fT; y < fB; y++) {
      for (let x = fL; x < fR; x++) {
        const dist = Math.abs(x - fCX) / ((fR - fL) / 2);
        if (dist > 0.6) {
          const warp = 1 - st * (dist - 0.6);
          const sx = Math.round(fCX + (x - fCX) * warp);
          if (sx >= 0 && sx < w) {
            const di = (y * w + x) * 4, si = (y * w + sx) * 4;
            tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
          }
        }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = tmp[i];
  }

  // 14. Cheekbone
  if (s.cheekbone !== 0) {
    const lCX = (lEye[0].x + jaw[0].x) / 2;
    const rCX = (rEye[3].x + jaw[16].x) / 2;
    const cY = (lEye[0].y + jaw[8].y) / 2;
    const st = (s.cheekbone / 100) * 0.1, r = 25;
    const tmp = new Uint8ClampedArray(d);
    for (const cx of [lCX, rCX]) {
      for (let y = Math.floor(cY - r); y < Math.ceil(cY + r); y++) {
        for (let x = Math.floor(cx - r); x < Math.ceil(cx + r); x++) {
          if (x < 0 || x >= w || y < 0 || y >= h) continue;
          const dx = x - cx, dy = y - cY, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < r) {
            const f = 1 + st * Math.max(0, 1 - dist / r);
            const sx = Math.round(cx + dx / f);
            if (sx >= 0 && sx < w) {
              const di = (y * w + x) * 4, si = (y * w + sx) * 4;
              tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
            }
          }
        }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = tmp[i];
  }

  // 15. Chin
  if (s.chin !== 0) {
    const chinY = jaw[8].y;
    const st = (s.chin / 100) * 0.15, r = 20;
    const tmp = new Uint8ClampedArray(d);
    for (let y = Math.floor(chinY - r); y < Math.ceil(chinY + r); y++) {
      for (let x = fL; x < fR; x++) {
        if (y < 0 || y >= h || x < 0 || x >= w) continue;
        const dy = y - chinY;
        const f = 1 + st * Math.max(0, 1 - Math.abs(dy) / r);
        const sy = Math.round(chinY + dy / f);
        if (sy >= 0 && sy < h) {
          const di = (y * w + x) * 4, si = (sy * w + x) * 4;
          tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
        }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = tmp[i];
  }

  // 16. Philtrum
  if (s.philtrum !== 0) {
    const pTop = nose[6].y, pBot = mouth[0].y, pCY = (pTop + pBot) / 2;
    const st = (s.philtrum / 100) * 0.12;
    const tmp = new Uint8ClampedArray(d);
    for (let y = Math.floor(pTop); y < Math.ceil(pBot); y++) {
      for (let x = fL; x < fR; x++) {
        const dy = y - pCY;
        const f = 1 + st * Math.max(0, 1 - Math.abs(dy) / ((pBot - pTop) / 2));
        const sy = Math.round(pCY + dy / f);
        if (sy >= 0 && sy < h) {
          const di = (y * w + x) * 4, si = (sy * w + x) * 4;
          tmp[di] = d[si]; tmp[di + 1] = d[si + 1]; tmp[di + 2] = d[si + 2];
        }
      }
    }
    for (let i = 0; i < d.length; i++) d[i] = tmp[i];
  }
}
