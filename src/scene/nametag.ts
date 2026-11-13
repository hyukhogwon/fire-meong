import * as THREE from "three";

const FONT =
  '600 40px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

/** Rounded pill label above the character (approved mockup: orange "me" tag). */
export function createNametag(name: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d")!;
  g.font = FONT;
  const padX = 28;
  const h = 68;
  const w = Math.ceil(g.measureText(name).width) + padX * 2;
  canvas.width = w;
  canvas.height = h;
  g.font = FONT;
  g.fillStyle = "#ffb02e";
  g.beginPath();
  g.roundRect(0, 0, w, h, h / 2);
  g.fill();
  g.fillStyle = "#1a1a1a";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(name, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: tex, depthWrite: false }),
  );
  const scale = 0.0042;
  sprite.scale.set(w * scale, h * scale, 1);
  return sprite;
}
