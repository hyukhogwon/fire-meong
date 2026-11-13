# 불멍 (fire-mung) 재현 문서

이 파일 하나만 가지고 같은 서비스를 다시 만들기 위한 문서다. 읽는 쪽은 저장소도, 음원도, 별 데이터도 없다고 가정한다.

- **코드 블록에 `원본 그대로`라고 적힌 것**은 실제 소스에서 기계로 복사한 것이다. 고치지 말고 그대로 쓴다. 화면 모양과 소리 끊김 수정이 여기 들어 있다.
- **표와 목록**은 그 코드를 읽기 쉽게 풀어 쓴 설명이다. 장면(`src/scene`)은 모든 파일의 원문이 실려 있으니, 설명과 원문이 다르면 **원문이 맞다.**
- 원문이 실리지 않은 것은 `src/core`의 작은 모듈들, `src/ui/controls.ts`, `src/main.ts`, 테스트다. 이들은 5장과 13장의 표·계약대로 새로 짠다.

## 1. 무엇을 만드는가

회사 동료가 **백그라운드 탭으로 열어두고 일하는** 1인용 불멍 웹페이지. 장작 타는 소리와 풀벌레 소리가 끊기지 않고 계속 나고, 화면에는 3D 캠프파이어 밤 풍경이 보인다.

- 서버·DB·로그인 없음. 정적 파일만. 상태는 브라우저 `localStorage`.
- 1인용. 다른 접속자는 없다.
- 데스크톱 브라우저 대상. 모바일 최적화는 범위 밖.
- 언어는 한국어.

화면 구성: 가운데 모닥불, 왼쪽 뒤에 통나무에 앉아 손을 쬐는 캠퍼(머리 위 주황색 이름표), 그 옆에 엎드려 조는 골든 리트리버, 오른쪽 뒤에 연못, 둘레에 풀·소나무·산 능선, 위로 실제 별자리 하늘.

할 수 있는 것 6가지:

| 기능 | 동작 | 지속/쿨타임 |
|---|---|---|
| 🔥 불 피우기 | 첫 클릭으로 소리 시작(브라우저 자동재생 정책 때문에 시작 오버레이가 필요) | - |
| 🪵 장작 넣기 | 장작 소리가 커지고 불꽃·불티·불빛이 커짐 | 효과 30초(3초 상승, 12초 유지, 15초 감쇠), 쿨타임 10분 |
| 🍡 마시멜로 굽기 | 캠퍼가 꼬치를 불에 대고, 마시멜로가 흰색→노릇→갈색으로 변한 뒤 사라짐 | 60초 |
| 🌠 소원 빌기 | 100자 이내 소원을 적으면 유성우 12초. 소원은 기록되고 📜에서 다시 봄 | 쿨타임 3시간 |
| 🌈 오로라 가루 | 색 1~2개를 골라 넣으면 불꽃 바깥 가장자리가 그 색으로 탐. 불꽃 중심은 주황 유지 | 30초(2초 페이드인, 5초 페이드아웃) |
| 🎲 다시 뽑기 | 이름과 모습을 무작위로 다시 뽑음 | - |

그 외: 🔊 볼륨 슬라이더(저장됨).

## 2. 기술 스택

| 항목 | 값 |
|---|---|
| 패키지 매니저 | pnpm (lockfile `pnpm-lock.yaml`) |
| 런타임 의존성 | `three` 0.187.0 (이것 하나) |
| 개발 의존성 | `vite` 8.3.8, `vitest` 5.1.0, `typescript` ~5.9, `@types/three` ^0.187.0 |
| 언어 | TypeScript, 프레임워크 없음. DOM은 `document.createElement` + `textContent`만 사용(`innerHTML` 금지) |
| 빌드 | `tsc --noEmit && vite build` → `dist/` |
| Vite 설정 | `defineConfig({ base: './' })` — 하위 경로에 올려도 동작해야 함 |
| 오디오 | Web Audio API 직접 사용 |
| 후처리 | `three/addons/postprocessing/` 의 `EffectComposer`, `RenderPass`, `UnrealBloomPass`, `OutputPass` |

`package.json` scripts: `dev: vite`, `build: tsc --noEmit && vite build`, `preview: vite preview`, `test: vitest run`, `encode-audio: bash scripts/encode-audio.sh`. `"type": "module"`, `"private": true`.

`tsconfig.json` compilerOptions: `target ES2022`, `module ESNext`, `moduleResolution bundler`, `lib [ES2022, DOM, DOM.Iterable]`, `types [vite/client]`, `strict`, `noUnusedLocals`, `noUnusedParameters`, `skipLibCheck`, `isolatedModules`, `noEmit`. include `src`, `vite.config.ts`.

`index.html`: `<html lang="ko">`, `<title>불멍</title>`, viewport 메타, `<body>` 안에 `<script type="module" src="/src/main.ts">`만. 캔버스와 UI는 전부 스크립트가 만든다.

three r187 주의: `Clock` 대신 `THREE.Timer`를 쓴다. 그림자는 `shadowMap.enabled = true`만 켜고 타입은 지정하지 않는다(r187에서 `PCFSoftShadowMap`을 지정하면 제거됐다는 경고가 나고 `PCFShadowMap`으로 바뀐다).

## 3. 에셋

코드로 그리지 않는 것은 음원 2개와 별 목록 1개뿐이다. 텍스처·3D 모델·폰트 파일은 없다(텍스처는 캔버스로 그려서 만든다).

### 3.1 음원 (둘 다 CC0 1.0)

| 용도 | 장작 | 풀벌레 |
|---|---|---|
| 원본 | "Campfire 02" by HECKFRICKER | "Night Crickets Back Porch.aiff" by hdfreema |
| 소리 페이지 | https://freesound.org/people/HECKFRICKER/sounds/729396/ | https://freesound.org/people/hdfreema/sounds/333221/ |
| 원본 다운로드(로그인 필요) | https://freesound.org/people/HECKFRICKER/sounds/729396/download/729396__heckfricker__campfire-02.wav | https://freesound.org/people/hdfreema/sounds/333221/download/333221__hdfreema__night-crickets-back-porch.aiff |
| 저장 위치 | `assets/raw/729396__heckfricker__campfire-02.wav` (47,206,948 바이트) | `assets/raw/333221__hdfreema__night-crickets-back-porch.aiff` (42,251,118 바이트) |
| 미리듣기 MP3(로그인 없이 열림) | https://cdn.freesound.org/previews/729/729396_12863902-hq.mp3 | https://cdn.freesound.org/previews/333/333221_2098408-hq.mp3 |

- 원본 다운로드 주소는 로그인하지 않으면 로그인 페이지로 넘어간다(2026-11-13 확인: 302 → `/home/login/`). **Freesound 계정으로 로그인한 사람이 브라우저에서 받아 `assets/raw/`에 넣는다.** 소리 페이지의 Download 버튼과 같은 주소다.
- 원본을 받을 수 없을 때만 미리듣기 MP3를 대신 쓴다. 이미 손실 압축된 파일이고, 이 프로젝트는 원본 WAV/AIFF로만 인코딩했다. 미리듣기로 만든 결과가 같은 음질·길이인지는 확인하지 않았다. 쓰려면 `encode-audio.sh`의 `SRC`, `CSRC` 경로만 바꾼다.
- 음원은 이 문서에 담을 수 없으므로 **이 단계는 건너뛸 수 없다.** `assets/raw/*.wav`, `*.aiff`는 `.gitignore`에 넣는다(각 40MB대).

인코딩 결과(실측값, 이 값과 비슷하면 맞게 된 것):

| 파일 | 길이 | 형식 | 크기 |
|---|---|---|---|
| `public/audio/campfire.m4a` | 267.61초 | AAC, 44.1kHz, 스테레오, 약 212kbps | 7,096,968 바이트 |
| `public/audio/crickets.m4a` | 220.06초 | AAC, 48kHz, 스테레오, 약 130kbps | 3,571,378 바이트 |

`scripts/encode-audio.sh` (원본 그대로). ffmpeg과 python3 + numpy가 필요하다.

```bash
#!/usr/bin/env bash
# Encode the CC0 campfire recording to AAC for the web build.
#
# The raw recording is very quiet (-35.6 LUFS, bed around -52 dB) with 0 dBFS
# crackle peaks. A static gain lifts the bed and a fast peak limiter shaves
# only the crackle transients. Do NOT use loudnorm here: its dynamic mode
# ducks the whole signal after every crackle, which is heard as dropouts
# (scripts/check-dropouts.py found 384 such windows vs 0 in the raw file).
set -euo pipefail
cd "$(dirname "$0")/.."
SRC=assets/raw/729396__heckfricker__campfire-02.wav
OUT=public/audio/campfire.m4a
GAIN_DB=24

ffmpeg -hide_banner -loglevel error -y -i "$SRC" \
  -af "volume=${GAIN_DB}dB,alimiter=limit=0.6:attack=0.5:release=5:level=false" \
  -c:a aac -b:a 192k "$OUT"

# Regression check: the encode must not add dropouts beyond the raw file's own.
raw=$(python3 -I scripts/check-dropouts.py "$SRC" 10 | head -1 | sed 's/.*: //')
enc=$(python3 -I scripts/check-dropouts.py "$OUT" 10 | head -1 | sed 's/.*: //')
echo "dropout windows: raw=$raw encoded=$enc"
if [ "$enc" -gt "$raw" ]; then
  echo "encode added dropouts" >&2
  exit 1
fi

# Crickets (CC0, Freesound 333221): an even bed at -48.2 LUFS, LRA 1.7 LU,
# peaks far below 0 dBFS, so a plain static gain is enough (-30.2 LUFS,
# peak -17.5 dBFS). The in-app mix level is CRICKET_MIX in fire-audio.ts.
CSRC=assets/raw/333221__hdfreema__night-crickets-back-porch.aiff
COUT=public/audio/crickets.m4a
ffmpeg -hide_banner -loglevel error -y -i "$CSRC" -af "volume=18dB" -c:a aac -b:a 128k "$COUT"
craw=$(python3 -I scripts/check-dropouts.py "$CSRC" 10 | head -1 | sed 's/.*: //')
cenc=$(python3 -I scripts/check-dropouts.py "$COUT" 10 | head -1 | sed 's/.*: //')
echo "cricket dropout windows: raw=$craw encoded=$cenc"
if [ "$cenc" -gt "$craw" ]; then
  echo "cricket encode added dropouts" >&2
  exit 1
fi
```

**`loudnorm`을 쓰면 안 된다.** 장작 원본은 바탕 소리가 아주 작고 탁탁 튀는 소리만 0dBFS다. `loudnorm`은 튈 때마다 전체 음량을 눌러서 "소리가 뚝뚝 끊긴다"로 들린다. 고정 게인 + 빠른 리미터가 답이다. 스크립트 주석의 LUFS 수치는 당시 측정을 적어둔 것이고 이 문서를 쓰며 다시 재지는 않았다.

`scripts/check-dropouts.py` (원본 그대로) — 20ms 창의 RMS가 주변 2초 중앙값보다 N dB 넘게 꺼지는 곳을 센다.

```python
"""Find dropouts: 20ms windows whose RMS falls >DROP dB below the median of the surrounding 2s."""
import subprocess, sys, numpy as np
DROP = float(sys.argv[2]) if len(sys.argv) > 2 else 20
raw = subprocess.run(['ffmpeg','-v','error','-i',sys.argv[1],'-ac','1','-ar','44100','-f','f32le','-'],capture_output=True).stdout
x = np.frombuffer(raw, dtype=np.float32)
W = 882  # 20ms
n = len(x)//W
rms = np.sqrt(np.mean(x[:n*W].reshape(n,W)**2, axis=1)) + 1e-9
db = 20*np.log10(rms)
hits = []
for i in range(n):
    lo, hi = max(0,i-50), min(n,i+50)
    med = np.median(db[lo:hi])
    if med - db[i] > DROP:
        hits.append((i*0.02, med-db[i], db[i], med))
print(f"{sys.argv[1]}: {n} windows, overall median {np.median(db):.1f} dB, dropouts(>{DROP}dB below local median): {len(hits)}")
# group consecutive
groups=[]
for t,d,l,m in hits:
    if groups and t-groups[-1][1] <= 0.021: groups[-1][1]=t; groups[-1][2]=max(groups[-1][2],d)
    else: groups.append([t,t,d,l,m])
for g in groups[:30]: print(f"  {g[0]:7.2f}s-{g[1]+0.02:7.2f}s  depth {g[2]:.1f} dB (level {g[3]:.1f}, local median {g[4]:.1f})")
print(f"  groups: {len(groups)}")
```

### 3.2 별 목록 (BSD-3-Clause)

d3-celestial의 `data/stars.6.json` (https://github.com/ofrohn/d3-celestial, Copyright (c) 2015 Olaf Frohn). 6등급 이하 별. 로그인 없이 바로 받는 주소: https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json (656,721 바이트). 받아서 아래 스크립트로 `src/scene/sky-data.ts`를 만든다. 결과는 별 **5,044개**, 파일 약 125KB, `[적경°, 적위°, 등급, B-V, ...]` 평면 배열이다.

`scripts/build-sky.py` (원본 그대로):

```python
"""Build src/scene/sky-data.ts from d3-celestial's stars.6.json
(Hipparcos-based, mag <= 6; BSD-3-Clause, (c) 2015 Olaf Frohn).

usage: python3 -I scripts/build-sky.py <stars.6.json> > src/scene/sky-data.ts
"""
import json, sys

MAX_MAG = 6.0

stars = json.load(open(sys.argv[1], encoding="utf-8"))["features"]
flat = []
for s in stars:
    mag = s["properties"]["mag"]
    if mag > MAX_MAG:
        continue
    ra, dec = s["geometry"]["coordinates"]
    try:
        bv = float(s["properties"].get("bv") or 0.6)
    except ValueError:
        bv = 0.6
    flat += [round(ra % 360, 3), round(dec, 3), round(mag, 2), round(bv, 2)]

print("// Generated by scripts/build-sky.py from d3-celestial stars.6.json")
print("// (BSD-3-Clause, (c) 2015 Olaf Frohn). Do not edit.")
print(f"/** Flat [raDeg, decDeg, mag, bv, ...] for stars with mag <= {MAX_MAG}. */")
print("export const STARS: number[] = " + json.dumps(flat, separators=(",", ":")) + ";")
```

### 3.3 CREDITS.md에 적을 내용

- Campfire sound: "Campfire 02" by HECKFRICKER — https://freesound.org/s/729396/ — CC0 1.0
- Cricket sound: "Night Crickets Back Porch.aiff" by hdfreema — https://freesound.org/s/333221/ — CC0 1.0
- Star catalogue: d3-celestial by Olaf Frohn — `data/stars.6.json`, BSD-3-Clause, Copyright (c) 2015 Olaf Frohn
- three.js — MIT

## 4. 파일 구조

```
index.html
vite.config.ts  tsconfig.json  package.json  CREDITS.md
public/audio/campfire.m4a  crickets.m4a
scripts/encode-audio.sh  check-dropouts.py  build-sky.py
src/main.ts            조립: 저장소, 신원, Stage, 오디오, UI 연결, 1초 타이머
src/style.css
src/core/              순수 로직. three·DOM을 모른다. 전부 단위 테스트 대상
  rng.ts names.ts appearance.ts identity.ts storage.ts settings.ts
  cooldown.ts log-book.ts wish-book.ts marshmallow.ts meteors.ts
  aurora.ts pond.ts sky.ts
src/audio/schedule.ts  루프·부스트 시각 계산(순수)
src/audio/fire-audio.ts  Web Audio 그래프
src/scene/             three.js
  stage.ts             렌더러, 카메라, 조명, 후처리, 프레임 루프
  fire.ts              불꽃 셰이더, 숯, 장작, 불티, 연기, 불빛
  environment.ts       하늘 돔, 능선, 땅, 풀, 소나무, 반딧불
  pond.ts              물 셰이더, 갈대, 연잎, 돌
  sky.ts sky-data.ts   별, 은하수
  meteors.ts           유성우
  character.ts dog.ts parts.ts nametag.ts marshmallow.ts soft-points.ts
src/ui/controls.ts     버튼, 다이얼로그
```

테스트는 `src/core/*.test.ts`와 `src/audio/schedule.test.ts`에 둔다(원본은 13개 파일, 92개 테스트). 순수 로직만 테스트하고 화면은 브라우저에서 확인한다.

## 5. 규칙과 상수 (src/core)

모든 시간 효과는 **벽시계(`Date.now()`) 기준**으로 계산한다. 숨긴 탭은 프레임이 멈추므로, 프레임 누적으로 세면 탭으로 돌아왔을 때 효과가 밀린다.

| 상수 | 값 | 위치 |
|---|---|---|
| `COOLDOWN_MS` (장작) | 10분 = 600,000 | cooldown.ts |
| `WISH_COOLDOWN_MS` | 3시간 = 10,800,000 | wish-book.ts |
| `WISH_MAX_LENGTH` | 100 | wish-book.ts |
| `TOAST_MS` | 60,000 | marshmallow.ts |
| `SHOWER_MS` / 유성 수 | 12,000 / 40 | meteors.ts |
| `AURORA_MS` / 최대 선택 / 페이드인 / 페이드아웃 | 30,000 / 2 / 2,000 / 5,000 | aurora.ts |
| `DEFAULT_VOLUME` | 0.95 (슬라이더 위치) | settings.ts |
| `POND` | `{ x: 4.5, z: -3.3, rx: 2.5, rz: 1.75 }` | pond.ts |
| `OBSERVER` | 북위 38°, 동경 127° | sky.ts |

`localStorage` 키 4개:

| 키 | 내용 |
|---|---|
| `fire-mung:identity` | `{ id, name, appearance: { shirt, skin, hat, hatColor } }` JSON |
| `fire-mung:volume` | 0~1 숫자 문자열 |
| `fire-mung:lastLogAt` | 마지막 장작 시각(ms) |
| `fire-mung:wishes` | `[{ text, at }, ...]` JSON, 최신이 앞 |

마시멜로와 오로라 진행 상태는 저장하지 않는다(새로고침하면 사라짐).

모듈별 계약:

- **rng.ts** — `type Rng = () => number` ([0,1)). `pick(rng, items)`는 `Math.min(len-1, floor(rng()*len))` 번째.
- **storage.ts** — `safeStore(backing?: Storage): { get, set }`. `localStorage`가 없거나 예외를 던져도 동작한다. 쓰기는 항상 메모리 Map에도 넣고, 읽기는 이번 세션에 쓴 메모리 값을 먼저 본다.
- **names.ts** — `randomName(rng)` = `"형용사 명사"`.
  - 형용사 15개: 포근한, 느긋한, 다정한, 조용한, 따뜻한, 씩씩한, 수줍은, 반짝이는, 졸린, 상냥한, 명랑한, 차분한, 보송한, 꼼꼼한, 산뜻한
  - 명사 18개: 다람쥐, 수달, 고슴도치, 너구리, 펭귄, 부엉이, 사슴, 토끼, 해달, 참새, 들꽃, 민들레, 해바라기, 동백, 수선화, 은방울꽃, 코스모스, 개나리
- **appearance.ts** — `randomAppearance(rng)`, `isValidAppearance(x)`(목록에 있는 값인지 검사).
  - 모자 종류: `none`, `beanie`, `cap`, `straw`
  - 옷 색 8: `#6c8ef5 #e46b6b #7bc47f #c79bf2 #f2b84b #4fc1c9 #f28fb8 #a3a8b8`
  - 피부 6: `#f6d2b0 #f2c9a0 #e8b98e #d49e74 #b07a52 #8a5a3b`
  - 모자 색 6: `#3b4a6b #c0392b #e8d8b0 #2e7d4f #f5f0e6 #7a4e2d`
- **identity.ts** — `loadOrCreateIdentity(store, rng, newId)`: 저장값이 유효하면 그대로, 깨졌거나 없으면 새로 만들어 저장. `rerollIdentity(store, current, rng)`: `id`는 유지하고 이름·모습만 새로. `newId`는 `crypto.randomUUID()`(없으면 시각+난수).
- **settings.ts** — `loadVolume`(숫자가 아니면 기본값, 0~1로 자름), `saveVolume`, `volumeToGain(v) = v*v`.
- **cooldown.ts** — `remainingMs(lastAt, now, cooldownMs = COOLDOWN_MS)` = `min(cooldownMs, max(0, lastAt + cooldownMs - now))`, `lastAt`이 null이면 0. 시계를 뒤로 돌려도 쿨타임보다 길게 나오지 않게 양쪽으로 자른다. `formatRemaining(ms)`: 초는 올림, `mm:ss`, 1시간 이상이면 `h:mm:ss`.
- **log-book.ts** — `LogBook(store)`: `lastLogAt()`, `addLog(now)` → 쿨타임 중이면 `{ ok: false, remainingMs }`, 아니면 시각을 저장하고 `{ ok: true }`.
- **wish-book.ts** — `WishBook(store)`: `list()`(최신순, 깨진 항목은 버림), `remainingMs(now)`(가장 최근 소원 기준), `wish(text, now)` → 앞뒤 공백 제거 후 100자로 자름. 비면 `{ ok:false, reason:'empty' }`, 쿨타임이면 `{ ok:false, reason:'cooldown', remainingMs }`.
- **marshmallow.ts** — `toastProgress(startedAt, now)`: 0~1, 시작 전이나 60초 뒤에는 null. `marshmallowColor(p)`: 색 정지점 `0 → #fbf6ec`, `0.6 → #d9963e`, `1 → #a8652a` 사이 선형 보간.
- **aurora.ts** — 색 6개(id / 라벨 / hex): `green 초록 #3dff6e`, `teal 청록 #2ee6d6`, `blue 파랑 #3d7bff`, `purple 보라 #a45cff`, `pink 분홍 #ff5fc8`, `red 빨강 #ff3b3b`. `togglePick(picked, id)`: 이미 있으면 빼고, 2개가 찼으면 무시. `auroraRemainingMs(startedAt, now)`. `auroraLevel(startedAt, now)` = `min(1, elapsed/2000, (30000-elapsed)/5000)`, 범위 밖이면 0.
- **pond.ts** — `pondDistance(x, z) = hypot((x-POND.x)/POND.rx, (z-POND.z)/POND.rz)`. 가운데 0, 물가 1.
- **meteors.ts** — `showerElapsed(startedAt, now)`: 초 단위, 범위 밖 null. `planShower(rand)`: 유성 40개. 각 유성은 `life = 0.6 + rand*0.7`초, `u = (i + rand)/40`, `delay = min(12 - life, (0.5 - cos(πu)/2) * (12 - 1.4) + 0.2)`(가운데가 촘촘), 시작점 `from = [-0.95 + rand*1.9, 0.55 + rand*0.43]`(화면 좌표 -1~1, 위쪽 1/3만), 방사점 `(1.3, 1.6)`에서 멀어지는 방향으로 `0.25 + rand*0.3`만큼 이동. `meteorFrame(m, elapsed)`: `t = (elapsed - delay)/life`, 머리 `t`, 꼬리 `max(0, t - 0.35)`, 밝기 `sin(πt)`.
- **sky.ts** — 천문 계산. 틀리면 별자리가 어긋나므로 원본 그대로 쓴다.

```ts
/** Where the sky is drawn from: 38°N, 127°E (central Korea). */
export const OBSERVER = { latDeg: 38, lonDeg: 127 } as const;

const DEG = Math.PI / 180;
const DAY_MS = 86_400_000;
const KST_OFFSET_MS = 9 * 3_600_000;
/** Before this local hour the previous midnight still counts as "tonight". */
const NIGHT_ENDS_HOUR = 6;

const mod360 = (x: number) => ((x % 360) + 360) % 360;

/** Greenwich mean sidereal time in degrees (IAU 1982 expression). */
export function greenwichSiderealDeg(date: Date): number {
  const jd = date.getTime() / DAY_MS + 2440587.5;
  const d = jd - 2451545.0;
  const t = d / 36525;
  return mod360(280.46061837 + 360.98564736629 * d + 0.000387933 * t * t - (t * t * t) / 38710000);
}

/** Altitude and azimuth (from north, through east) in degrees. */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  lstDeg: number,
  latDeg: number,
): { alt: number; az: number } {
  const h = (lstDeg - raDeg) * DEG;
  const dec = decDeg * DEG;
  const lat = latDeg * DEG;
  const sinAlt = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(h);
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const az = Math.atan2(
    -Math.cos(dec) * Math.sin(h),
    Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.cos(h) * Math.sin(lat),
  );
  return { alt: alt / DEG, az: mod360(az / DEG) };
}

/**
 * Unit direction in scene space for a horizontal position, with due south
 * straight ahead (-z), west to the right (+x) and the zenith up (+y).
 */
export function horizontalToScene(altDeg: number, azDeg: number): [number, number, number] {
  const a = (azDeg - 180) * DEG;
  const alt = altDeg * DEG;
  return [Math.sin(a) * Math.cos(alt), Math.sin(alt), -Math.cos(a) * Math.cos(alt)];
}

/** The 00:00 KST that belongs to tonight (the previous one until 06:00). */
export function tonightMidnightKst(now: Date): Date {
  const local = now.getTime() + KST_OFFSET_MS;
  const dayStart = Math.floor(local / DAY_MS) * DAY_MS;
  const hour = (local - dayStart) / 3_600_000;
  const midnight = hour < NIGHT_ENDS_HOUR ? dayStart : dayStart + DAY_MS;
  return new Date(midnight - KST_OFFSET_MS);
}

/** North galactic pole (J2000) and the galactic longitude of the celestial pole. */
const NGP = { ra: 192.85948, dec: 27.12825, lonOfNcp: 122.93192 } as const;

/** Galactic longitude/latitude (degrees) to right ascension/declination (degrees, J2000). */
export function galacticToEquatorial(lDeg: number, bDeg: number): { ra: number; dec: number } {
  const b = bDeg * DEG;
  const d = (NGP.lonOfNcp - lDeg) * DEG;
  const pole = NGP.dec * DEG;
  const sinDec = Math.sin(b) * Math.sin(pole) + Math.cos(b) * Math.cos(pole) * Math.cos(d);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const ra =
    NGP.ra +
    Math.atan2(Math.cos(b) * Math.sin(d), Math.sin(b) * Math.cos(pole) - Math.cos(b) * Math.sin(pole) * Math.cos(d)) /
      DEG;
  return { ra: mod360(ra), dec: dec / DEG };
}
```

## 6. 오디오

구조: `장작 루프 → boostGain ─┐`, `풀벌레 루프 → cricketGain(0.9) ─┴→ master(볼륨) → limiter → destination`.

- `AudioContext({ latencyHint: 'playback' })`를 **첫 클릭 안에서** 만든다.
- limiter는 `DynamicsCompressor`: threshold -3, knee 0, ratio 20, attack 0.003, release 0.25. 장작 부스트 때 클리핑을 막는다.
- 볼륨: `master.gain.setTargetAtTime(volumeToGain(v), now, 0.05)`.
- 장작 부스트: `boostGain`을 `1 → 1.8`(3초) → 유지(12초) → `1`(15초)로 `linearRampToValueAtTime`. 시작 전에 `cancelAndHoldAtTime`(없으면 `cancelScheduledValues` + 현재 값 `setValueAtTime`). 풀벌레는 부스트하지 않는다.
- 풀벌레 로딩 실패는 무시하고 장작만 재생한다.
- `statechange`로 컨텍스트가 스스로 멈추면(절전, 장치 변경) `resume()`을 시도하고, 안 되면 시작 오버레이를 "🔥 소리 다시 켜기"로 다시 띄운다.
- 파일 경로는 `` `${import.meta.env.BASE_URL}audio/campfire.m4a` `` 형태로 쓴다.

루프는 `loop = true`를 쓰지 않고 **파일 끝과 처음을 3초 겹쳐 동일 파워 크로스페이드**한다. 이렇게 하면 파일 양 끝의 인코더 패딩이 들리지 않는다. 모든 예약은 오디오 시계로 하고 JS 타이머는 쓰지 않는다. 숨긴 탭에서 타이머는 느려지지만 오디오 시계는 정확하다. 항상 재생 2개를 미리 예약해두고, 하나가 끝나면(`onended`) 다다음 것을 예약한다. `onended`가 늦게 와서 시작 시각이 이미 지났으면 기준점을 다시 잡는다.

`src/audio/schedule.ts` (원본 그대로):

```ts
/** Seconds two consecutive plays of the loop overlap. */
export const CROSSFADE_S = 3;

export interface LoopPlay {
  start: number;
  fadeInEnd: number;
  fadeOutStart: number;
  stop: number;
}

/** The i-th play of a crossfaded loop, in AudioContext time. */
export function loopPlay(bufferDuration: number, startAt: number, i: number): LoopPlay {
  const step = bufferDuration - CROSSFADE_S;
  const start = startAt + i * step;
  return {
    start,
    fadeInEnd: start + CROSSFADE_S,
    fadeOutStart: start + step,
    stop: start + bufferDuration,
  };
}

export function loopSchedule(bufferDuration: number, startAt: number, count: number): LoopPlay[] {
  return Array.from({ length: count }, (_, i) => loopPlay(bufferDuration, startAt, i));
}

export const BOOST = { gain: 1.8, riseS: 3, holdS: 12, decayS: 15 } as const;

export function boostRamps(now: number): Array<{ value: number; at: number }> {
  const { gain, riseS, holdS, decayS } = BOOST;
  return [
    { value: 1, at: now },
    { value: gain, at: now + riseS },
    { value: gain, at: now + riseS + holdS },
    { value: 1, at: now + riseS + holdS + decayS },
  ];
}

/** Seconds of lead time given to a play that had to be re-anchored. */
export const LATE_LEAD_S = 0.1;

/**
 * If the i-th play would start in the past (e.g. the main thread was frozen
 * and `onended` arrived late), returns a new anchor so it starts just after
 * `now`; otherwise returns `startAt` unchanged.
 */
export function reanchorIfLate(startAt: number, bufferDuration: number, i: number, now: number): number {
  if (loopPlay(bufferDuration, startAt, i).start >= now + LATE_LEAD_S) return startAt;
  return now + LATE_LEAD_S - i * (bufferDuration - CROSSFADE_S);
}
```

`src/audio/fire-audio.ts`의 루프 부분 (원본 그대로). `FireAudio` 클래스는 위 설명대로 `LoopLayer` 두 개를 같은 시각(`ctx.currentTime + 0.05`)에 시작시킨다.

```ts
const CURVE_POINTS = 64;
const FADE_IN = Float32Array.from({ length: CURVE_POINTS }, (_, i) =>
  Math.sin(((i / (CURVE_POINTS - 1)) * Math.PI) / 2),
);
const FADE_OUT = Float32Array.from({ length: CURVE_POINTS }, (_, i) =>
  Math.cos(((i / (CURVE_POINTS - 1)) * Math.PI) / 2),
);

/** Crickets just under the fire (about 3 dB quieter), set by ear. */
export const CRICKET_MIX = 0.9;

/**
 * One recording looped forever with equal-power crossfades between repeats,
 * so encoder padding at the file edges is never heard. Everything is
 * scheduled on the audio clock — no JS timers — so a hidden, throttled tab
 * keeps looping correctly.
 */
class LoopLayer {
  private startAt = 0;
  /** Start times of scheduled plays, exposed for verification. */
  readonly playStarts: number[] = [];

  constructor(
    private readonly ctx: AudioContext,
    private readonly buffer: AudioBuffer,
    private readonly output: AudioNode,
  ) {}

  start(at: number): void {
    this.startAt = at;
    this.schedule(0);
    this.schedule(1);
  }

  private schedule(i: number): void {
    const buffer = this.buffer;
    this.startAt = reanchorIfLate(this.startAt, buffer.duration, i, this.ctx.currentTime);
    const play = loopPlay(buffer.duration, this.startAt, i);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const fade = this.ctx.createGain();
    try {
      fade.gain.setValueCurveAtTime(FADE_IN, play.start, CROSSFADE_S);
      fade.gain.setValueCurveAtTime(FADE_OUT, play.fadeOutStart, CROSSFADE_S);
    } catch (err) {
      // Never let an automation error break the loop chain; play unfaded.
      console.warn('fade scheduling failed', err);
    }
    source.connect(fade).connect(this.output);
    source.onended = () => {
      source.disconnect();
      fade.disconnect();
      this.schedule(i + 2);
    };
    source.start(play.start);
    source.stop(play.stop);
    this.playStarts.push(play.start);
  }
}
```

## 7. 무대 (src/scene/stage.ts)

| 항목 | 값 |
|---|---|
| 렌더러 | `WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })`, pixelRatio `min(devicePixelRatio, 1.5)`, `toneMapping = ACESFilmicToneMapping`, `shadowMap.enabled = true` |
| 후처리 | `EffectComposer(renderer, new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 }))` → `RenderPass` → `UnrealBloomPass(size, 0.32, 0.6, 1.0)` (strength, radius, threshold) → `OutputPass` |
| 배경·안개 | `scene.background = #131f38`, `Fog(#131f38, 9, 24)` |
| 카메라 | `PerspectiveCamera(42, aspect, 0.1, 200)`, 위치 `(0.7, 2.6, 7.2)`, `lookAt(0, 1.55, -0.6)` |
| 좁은 창 | 가로세로비가 1.4보다 작으면 수평 시야를 유지하도록 fov를 키움: `fov = min(100, 2·atan(tan(21°)·1.4/aspect))` |
| 조명 | `HemisphereLight(0x4a5f8a, 0x0e140e, 0.55)`, 달빛 `DirectionalLight(0x8fa6d6, 0.35)` 위치 `(-6, 10, -4)`, 불빛은 8장 |
| 프레임 | `renderer.setAnimationLoop`. 30fps로 제한(누적 시간이 `1/30 - 0.002`초 미만이면 건너뜀). dt는 0.1초로 자름. `THREE.Timer`를 `timer.connect(document)`로 연결 |
| 좌석 | `SEAT = (-1.35, 0, -1.74)`(불에서 2.2 거리), `rotation.y = atan2(-SEAT.x, -SEAT.z)`로 불을 봄 |
| 강아지 | 좌석 기준 `ox = -1.45, oz = -0.15`, `turn = 좌석 rotation.y`. 위치 `x = SEAT.x + ox·cos(turn) + oz·sin(turn)`, `z = SEAT.z - ox·sin(turn) + oz·cos(turn)`. `rotation.y = atan2(-x, -z) + 0.35` |
| 이름표 높이 | 좌석 원점에서 y 2.2 |

`src/scene/stage.ts` 원문은 이 장 끝에 있다.

- 불은 원점에 있다. 정남이 -z(화면 안쪽), +x가 서쪽(화면 오른쪽).
- 캠퍼, 강아지: 모든 메시 `castShadow`, `receiveShadow`. 마시멜로 꼬치: `castShadow`.
- 다시 뽑기 때는 좌석 그룹의 자식만 지우고(`geometry`, `material`, 텍스처 dispose) 새로 만든다. 마시멜로 꼬치는 좌석과 같은 변환을 가진 별도 그룹이라 그대로 남는다.
- 리사이즈 때 `pxPerUnit = 버퍼높이 / (2·tan(fov/2))`를 계산해 입자 크기 유니폼(`uPx`)에 넣는다.
- 매 프레임 순서: 불 → 환경(연못, 반딧불) → 캠퍼 → 강아지 → 마시멜로 진행 → 오로라 레벨 → 유성 → `composer.render()`.
- 별 하늘은 시작할 때 만들고 1시간마다 다시 만든다(오늘 밤이 바뀌면 따라감).
- 개발 서버에서만 `window.__fire = { audio, identity, stage }`를 노출한다(`import.meta.env.DEV`).

`src/scene/stage.ts` (원본 그대로):

```ts
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Identity } from '../core/identity';
import { NAMETAG_Y, createCharacter } from './character';
import { createDog } from './dog';
import { HORIZON, createEnvironment } from './environment';
import { createFire } from './fire';
import type { Actor } from './parts';
import { createSky } from './sky';
import { createMarshmallowStick } from './marshmallow';
import { toastProgress } from '../core/marshmallow';
import { createNametag } from './nametag';
import { MeteorShower } from './meteors';
import { auroraLevel } from '../core/aurora';

const MAX_FPS = 30;
const MAX_PIXEL_RATIO = 1.5;
const BASE_FOV = 42;
const CAMERA_POS = new THREE.Vector3(0.7, 2.6, 7.2);
const CAMERA_TARGET = new THREE.Vector3(0, 1.55, -0.6);
/** The dog lies at the camper's side nearer the camera (seat-local x, z). */
const DOG_OFFSET = { x: -1.45, z: -0.15, turn: 0.35 };
const FRAME_ASPECT = 1.4;
/** Seat: 2.2 from the fire, behind-left as seen from the camera, facing the fire. */
const SEAT = new THREE.Vector3(-1.35, 0, -1.74);

function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material;
    (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => {
      (x as THREE.SpriteMaterial).map?.dispose();
      x.dispose();
    });
  });
}

export class Stage {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 200);
  private readonly fire = createFire();
  private readonly environment = createEnvironment();
  private readonly dog = createDog();
  private self: Actor | null = null;
  private readonly seat = new THREE.Group();
  private readonly marshmallow = createMarshmallowStick();
  private toastStartedAt: number | null = null;
  private readonly timer = new THREE.Timer();
  private sinceRender = 0;
  private sky: THREE.Group | null = null;
  private readonly meteors = new MeteorShower();
  private aurora: { startedAt: number; colors: readonly string[] } | null = null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;

    // HDR pipeline: scene → bloom (only the fire's over-bright parts) → tone mapping.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.6, 1.0));
    this.composer.addPass(new OutputPass());

    this.scene.background = HORIZON;
    this.scene.fog = new THREE.Fog(HORIZON, 9, 24);

    // Pulled back and tilted up a little so more of the night sky shows.
    this.camera.position.set(CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z);
    this.camera.lookAt(CAMERA_TARGET);

    this.scene.add(new THREE.HemisphereLight(0x4a5f8a, 0x0e140e, 0.55));
    const moon = new THREE.DirectionalLight(0x8fa6d6, 0.35);
    moon.position.set(-6, 10, -4);
    this.scene.add(moon);

    this.scene.add(this.environment.group);
    this.updateSky(new Date());
    this.scene.add(this.fire.group);
    this.scene.add(this.meteors.mesh);

    this.seat.position.copy(SEAT);
    this.seat.rotation.y = Math.atan2(-SEAT.x, -SEAT.z);
    this.scene.add(this.seat);
    // Separate rig with the seat's transform so rerolling the character keeps it.
    this.marshmallow.group.position.copy(SEAT);
    this.marshmallow.group.rotation.y = this.seat.rotation.y;
    this.scene.add(this.marshmallow.group);

    // The dog lies beside the seat, nose toward the fire.
    const turn = this.seat.rotation.y;
    this.dog.group.position.set(
      SEAT.x + DOG_OFFSET.x * Math.cos(turn) + DOG_OFFSET.z * Math.sin(turn),
      0,
      SEAT.z - DOG_OFFSET.x * Math.sin(turn) + DOG_OFFSET.z * Math.cos(turn),
    );
    const d = this.dog.group.position;
    this.dog.group.rotation.y = Math.atan2(-d.x, -d.z) + DOG_OFFSET.turn;
    this.dog.group.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    this.scene.add(this.dog.group);
    this.marshmallow.group.traverse((o) => (o.castShadow = true));

    this.timer.connect(document);
    this.resize();
    window.addEventListener('resize', this.resize);
    // rAF-backed: pauses automatically while the tab is hidden.
    this.renderer.setAnimationLoop(this.tick);
  }

  setSelf(identity: Identity): void {
    this.seat.children.slice().forEach((c) => {
      this.seat.remove(c);
      disposeTree(c);
    });
    this.self = createCharacter(identity.appearance);
    this.self.group.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    this.seat.add(this.self.group);
    const tag = createNametag(identity.name);
    tag.position.y = NAMETAG_Y;
    this.seat.add(tag);
  }

  /** Rebuilds the star field for the night that `now` belongs to. */
  updateSky(now: Date): void {
    if (this.sky) {
      this.scene.remove(this.sky);
      disposeTree(this.sky);
    }
    this.sky = createSky(now);
    this.scene.add(this.sky);
  }

  flare(): void {
    this.fire.flare();
  }

  /** Starts toasting; progress follows wall-clock time so a hidden tab catches up. */
  startToast(startedAt: number): void {
    this.toastStartedAt = startedAt;
  }

  /** Starts a short meteor shower; timed by wall clock like the marshmallow. */
  startWish(startedAt: number): void {
    this.meteors.start(startedAt, Math.random);
  }

  /** Throws aurora powder on the fire: coloured flames for a while, by wall clock. */
  startAurora(startedAt: number, colors: readonly string[]): void {
    this.aurora = { startedAt, colors };
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.timer.dispose();
    window.removeEventListener('resize', this.resize);
    disposeTree(this.scene);
    this.composer.dispose();
    this.renderer.dispose();
  }

  private readonly resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Keep the fire and the seat in frame on narrow/portrait windows by
    // holding the horizontal field of view at what BASE_FOV gives at FRAME_ASPECT.
    const half = THREE.MathUtils.degToRad(BASE_FOV / 2);
    this.camera.fov =
      aspect >= FRAME_ASPECT
        ? BASE_FOV
        : Math.min(100, THREE.MathUtils.radToDeg(2 * Math.atan((Math.tan(half) * FRAME_ASPECT) / aspect)));
    this.camera.updateProjectionMatrix();
    const bufferH = h * this.renderer.getPixelRatio();
    const pxPerUnit = bufferH / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.fire.setPointScale(pxPerUnit);
    this.environment.setPointScale(pxPerUnit);
  };

  private readonly tick = (timestamp: number) => {
    this.timer.update(timestamp);
    // Clamp so returning from a hidden tab doesn't jump the simulation.
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.sinceRender += dt;
    if (this.sinceRender < 1 / MAX_FPS - 0.002) return;
    this.fire.update(this.sinceRender);
    const elapsed = this.timer.getElapsed();
    this.environment.update(elapsed, this.fire.light);
    this.self?.update(elapsed);
    this.dog.update(elapsed);
    const p = toastProgress(this.toastStartedAt, Date.now());
    if (p === null) this.toastStartedAt = null;
    this.marshmallow.setProgress(p);
    if (this.aurora) {
      const level = auroraLevel(this.aurora.startedAt, Date.now());
      this.fire.setAurora(this.aurora.colors, level);
      // Keep it through the first frame (level 0 at the very start), drop it once burnt out.
      if (level === 0 && Date.now() > this.aurora.startedAt) this.aurora = null;
    }
    this.meteors.update(Date.now(), this.camera, this.canvas.clientHeight || window.innerHeight);
    this.sinceRender = 0;
    this.composer.render();
  };
}
```

## 8. 불 (src/scene/fire.ts)

불꽃은 **카메라를 보는 사각형 4장**에 노이즈 셰이더를 입힌 것이다. 가산 혼합 + HDR 색이라 겹친 중심이 밝아져 블룸을 탄다.

```ts
const FLAME_LAYERS = [
  { x: 0, z: 0, w: 1.7, h: 2.0, seed: 0, tint: 1 },
  { x: -0.17, z: 0.1, w: 1.3, h: 1.5, seed: 7.3, tint: 0.3 },
  { x: 0.18, z: -0.08, w: 1.25, h: 1.35, seed: 13.9, tint: 0.3 },
  { x: 0.02, z: 0.18, w: 1.0, h: 1.05, seed: 21.1, tint: 0 },
];
```

지오메트리는 `PlaneGeometry(1, 1).translate(0, 0.5, 0)` 하나를 공유하고, 각 메시는 `(x, 0.12, z)`에 두며 `frustumCulled = false`. `tint`는 그 장이 오로라 색을 얼마나 받는지다(`uAurora = level × tint`). 안쪽 장일수록 덜 받아 중심이 주황으로 남는다.

**오로라 색을 별도의 색 불꽃 장으로 겹치면 안 된다.** 가산 혼합에서 주황과 섞여 하얗게 날아간다. 같은 셰이더 안에서 불꽃 바깥 테두리(mantle)에만 색을 넣는다.

`src/scene/fire.ts` 전체 (원본 그대로). 노이즈, 불꽃 머티리얼, 숯불 바닥, 장작, 불티, 연기, 불빛이 모두 들어 있다.

```ts
import * as THREE from 'three';
import { BOOST } from '../audio/schedule';
import { softPoints } from './soft-points';

const SPARKS = 60;
const SMOKE = 26;
/** `tint`: how much of the aurora colour a sheet takes; inner sheets take less so the core stays orange. */
const FLAME_LAYERS: Array<{ x: number; z: number; w: number; h: number; seed: number; tint: number }> = [
  { x: 0, z: 0, w: 1.7, h: 2.0, seed: 0, tint: 1 },
  { x: -0.17, z: 0.1, w: 1.3, h: 1.5, seed: 7.3, tint: 0.3 },
  { x: 0.18, z: -0.08, w: 1.25, h: 1.35, seed: 13.9, tint: 0.3 },
  { x: 0.02, z: 0.18, w: 1.0, h: 1.05, seed: 21.1, tint: 0 },
];
const FIRE_LIGHT = new THREE.Color(0xff7a2e);

const NOISE = /* glsl */ `
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * vnoise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}
`;

/** 0..1 flare level following the same rise/hold/decay timing as the audio boost. */
function flareLevel(t: number): number {
  const { riseS, holdS, decayS } = BOOST;
  if (t < 0) return 0;
  if (t < riseS) return t / riseS;
  if (t < riseS + holdS) return 1;
  if (t < riseS + holdS + decayS) return 1 - (t - riseS - holdS) / decayS;
  return 0;
}

/**
 * One sheet of flame: an upright quad that turns to face the camera, shaded
 * with scrolling noise into a teardrop of licking tongues. Colours are HDR so
 * the hot core feeds the bloom pass.
 */
function flameMaterial(seed: number, w: number, h: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSeed: { value: seed },
      uFlare: { value: 0 },
      uSize: { value: new THREE.Vector2(w, h) },
      // Aurora powder: two colours burning in drifting patches along the flame's edge.
      uA: { value: new THREE.Color() },
      uB: { value: new THREE.Color() },
      uAurora: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform vec2 uSize;
      uniform float uFlare;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
        vec3 right = normalize(cross(up, vec3(0.0, 0.0, 1.0)));
        vec3 p = center.xyz
          + right * position.x * uSize.x * (1.0 + 0.2 * uFlare)
          + up * position.y * uSize.y * (1.0 + 0.45 * uFlare);
        gl_Position = projectionMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uSeed, uFlare, uAurora;
      uniform vec3 uA, uB;
      varying vec2 vUv;
      ${NOISE}
      void main() {
        float y = vUv.y;
        float x = vUv.x - 0.5;
        float t = uTime * (1.0 + 0.25 * uFlare);
        // Turbulence pushes the flame sideways more the higher it gets.
        float n1 = fbm(vec2(x * 2.4 + uSeed, y * 1.7 - t * 1.25));
        float n2 = fbm(vec2(x * 6.5 - uSeed, y * 4.2 - t * 2.7));
        x += (n1 - 0.5) * 0.42 * y + (n2 - 0.5) * 0.14 * y;
        // Teardrop: pinched at the wood, widest low down, tapering to a tip.
        float w = 0.31 * (1.0 - pow(y, 1.35)) * smoothstep(0.0, 0.1, y) + 0.015;
        float body = 1.0 - smoothstep(w * 0.25, w, abs(x));
        // Rising noise eats holes into the upper flame so it breaks into tongues.
        float erosion = fbm(vec2(x * 5.5 + uSeed * 3.0, y * 3.2 - t * 3.3));
        float v = body * (1.2 - y) - erosion * (0.3 + y * 1.05);
        v = clamp(v * 2.1, 0.0, 1.0);
        vec3 c = mix(vec3(0.55, 0.035, 0.0), vec3(1.0, 0.3, 0.02), smoothstep(0.0, 0.35, v));
        c = mix(c, vec3(1.0, 0.68, 0.2), smoothstep(0.3, 0.7, v));
        c = mix(c, vec3(1.0, 0.88, 0.55), smoothstep(0.8, 1.0, v));
        float a = smoothstep(0.0, 0.22, v);
        vec3 col = c * a * (0.62 + 0.25 * uFlare);
        if (uAurora > 0.0) {
          // Metal salts burn cooler than the core, so their colour shows in the
          // outer mantle: a slightly wider flame whose inside is left to the orange.
          float body2 = 1.0 - smoothstep(w * 0.3, w * 1.45 + 0.03, abs(x));
          float v2 = clamp((body2 * (1.3 - y) - erosion * (0.3 + y * 1.0)) * 2.1, 0.0, 1.0);
          float mantle = smoothstep(0.0, 0.3, v2) * (1.0 - smoothstep(0.05, 0.38, v));
          // Colour comes and goes in patches that rise with the flame.
          float patches = smoothstep(0.3, 0.62, n2) * 0.75 + 0.25;
          vec3 tint = mix(uA, uB, smoothstep(0.42, 0.58, n1));
          float k = mantle * patches * uAurora;
          col = col * (1.0 - 0.7 * k) + tint * k * (0.35 + 0.45 * v2);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    fog: false,
  });
}

/** Glowing coal bed under the logs: dark crust with slowly breathing orange cracks. */
function emberBed(): THREE.Mesh<THREE.CircleGeometry, THREE.ShaderMaterial> {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uFlare: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime, uFlare;
        varying vec2 vUv;
        ${NOISE}
        void main() {
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          float cells = fbm(p * 9.0 + 3.0);
          float breathe = fbm(p * 4.0 + vec2(uTime * 0.25, -uTime * 0.18));
          float glow = smoothstep(0.42, 0.72, cells * 0.6 + breathe * 0.6);
          glow *= 1.0 - smoothstep(0.35, 1.0, r);
          vec3 hot = mix(vec3(1.6, 0.22, 0.02), vec3(3.2, 1.3, 0.25), glow * glow);
          vec3 c = vec3(0.012, 0.009, 0.008) + hot * glow * (0.9 + 0.6 * uFlare);
          gl_FragColor = vec4(c, 1.0 - smoothstep(0.75, 1.0, r));
        }
      `,
      transparent: true,
      depthWrite: false,
      fog: false,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.012;
  return mesh;
}

/** Charred-bark emissive map: mostly black with thin glowing seams. */
function charTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, size, size);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    let x = rand() * size;
    let y = rand() * size;
    g.strokeStyle = `rgba(255,${90 + Math.floor(rand() * 90)},20,${0.35 + rand() * 0.5})`;
    g.lineWidth = 0.8 + rand() * 1.8;
    g.beginPath();
    g.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (rand() - 0.5) * 14;
      y += 4 + rand() * 12;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeLogs(): { group: THREE.Group; glow: THREE.MeshStandardMaterial[] } {
  const group = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({
    color: 0x2b1b12,
    roughness: 0.95,
    emissive: 0xffffff,
    emissiveMap: charTexture(),
    emissiveIntensity: 1.6,
  });
  const ends = new THREE.MeshStandardMaterial({ color: 0x1a100a, emissive: 0xff5a14, emissiveIntensity: 0.9 });
  // A teepee of five burning logs over two crossed base logs.
  for (let i = 0; i < 5; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.1, 1.0, 10), [bark, ends, ends]);
    const a = (i / 5) * Math.PI * 2 + 0.3;
    log.position.set(Math.cos(a) * 0.2, 0.26, Math.sin(a) * 0.2);
    log.rotation.set(0, -a, Math.PI / 2 - 0.85);
    group.add(log);
  }
  for (let i = 0; i < 2; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.95, 10), [bark, ends, ends]);
    log.position.set(0, 0.09, 0);
    log.rotation.set(0, 0.5 + i * 1.45, Math.PI / 2);
    group.add(log);
  }
  const stone = new THREE.MeshStandardMaterial({ color: 0x6f6a66, roughness: 1, flatShading: true });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13 + (i % 3) * 0.02, 0), stone);
    s.position.set(Math.cos(a) * 0.66, 0.07, Math.sin(a) * 0.66);
    s.rotation.set(i, i * 2, 0);
    group.add(s);
  }
  // Only the stone ring casts: the logs sit under the light and would black out the pit.
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.receiveShadow = true;
    mesh.castShadow = mesh.material === stone;
  });
  return { group, glow: [bark, ends] };
}

interface Particle {
  life: number;
  rate: number;
  x: number;
  z: number;
  phase: number;
  reach: number;
}

export interface Fire {
  group: THREE.Group;
  /** The firelight, for things that reflect it. */
  light: THREE.PointLight;
  update(dt: number): void;
  flare(): void;
  /** Coloured flames: `colors` are one or two sRGB hex strings, `level` is 0..1. */
  setAurora(colors: readonly string[], level: number): void;
  /** `pxPerUnit`: drawing-buffer pixels one world unit covers at distance 1. */
  setPointScale(pxPerUnit: number): void;
}

export function createFire(): Fire {
  const group = new THREE.Group();
  const logs = makeLogs();
  group.add(logs.group);
  const bed = emberBed();
  group.add(bed);

  const quad = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const flames = FLAME_LAYERS.map((l) => {
    const m = new THREE.Mesh(quad, flameMaterial(l.seed, l.w, l.h));
    m.position.set(l.x, 0.12, l.z);
    m.frustumCulled = false;
    group.add(m);
    return m.material;
  });
  const auroraTint = new THREE.Color();
  let auroraLevel = 0;
  let auroraKey = '';

  const smoke = softPoints(SMOKE, THREE.NormalBlending);
  const sparks = softPoints(SPARKS, THREE.AdditiveBlending);
  smoke.points.renderOrder = 1;
  sparks.points.renderOrder = 2;
  group.add(smoke.points, sparks.points);

  const light = new THREE.PointLight(0xff7a2e, 20, 0, 1.7);
  light.position.set(0, 0.75, 0);
  light.castShadow = true;
  light.shadow.mapSize.set(512, 512);
  light.shadow.camera.near = 0.15;
  light.shadow.camera.far = 16;
  light.shadow.bias = -0.012;
  light.shadow.normalBias = 0.03;
  group.add(light);

  const respawn = (p: Particle, spread: number) => {
    const r = Math.sqrt(Math.random()) * spread;
    const a = Math.random() * Math.PI * 2;
    p.x = Math.cos(a) * r;
    p.z = Math.sin(a) * r;
    p.rate = 0.6 + Math.random() * 0.8;
    p.phase = Math.random() * Math.PI * 2;
    p.reach = 0.6 + Math.random() * 0.8;
  };
  const make = (count: number, spread: number): Particle[] =>
    Array.from({ length: count }, () => {
      const p: Particle = { life: Math.random(), rate: 1, x: 0, z: 0, phase: 0, reach: 1 };
      respawn(p, spread);
      return p;
    });
  const sparkState = make(SPARKS, 0.22);
  const smokeState = make(SMOKE, 0.18);

  let time = 0;
  let flareStart = -Infinity;

  function update(dt: number) {
    time += dt;
    const level = flareLevel(time - flareStart);

    for (const m of flames) {
      m.uniforms.uTime.value = time;
      m.uniforms.uFlare.value = level;
    }
    bed.material.uniforms.uTime.value = time;
    bed.material.uniforms.uFlare.value = level;

    // Sparks: shoot up, wobble, and die out; more and higher while a new log catches.
    for (let i = 0; i < SPARKS; i++) {
      const p = sparkState[i];
      p.life += dt * p.rate * (0.22 + 0.2 * level);
      if (p.life >= 1) {
        p.life -= 1;
        respawn(p, 0.22);
      }
      const l = p.life;
      const wob = 0.12 + 0.5 * l;
      sparks.pos[i * 3] = p.x + Math.sin(time * 2.1 + p.phase) * wob * l + l * l * 0.35;
      sparks.pos[i * 3 + 1] = 0.35 + l * (2.2 + 1.6 * level) * p.reach;
      sparks.pos[i * 3 + 2] = p.z + Math.cos(time * 1.7 + p.phase * 1.3) * wob * l;
      const fade = Math.pow(1 - l, 1.6) * (0.55 + 0.45 * Math.sin(time * 14 + p.phase * 5));
      sparks.size[i] = 0.035 + 0.03 * p.reach;
      sparks.color.set([3.2 * fade, 1.25 * fade, 0.28 * fade, 1], i * 4);
    }
    sparks.geo.attributes.position.needsUpdate = true;
    sparks.geo.attributes.aSize.needsUpdate = true;
    sparks.geo.attributes.aColor.needsUpdate = true;

    // Smoke: faint grey puffs that swell and drift downwind above the flame tip.
    for (let i = 0; i < SMOKE; i++) {
      const p = smokeState[i];
      p.life += dt * p.rate * 0.11;
      if (p.life >= 1) {
        p.life -= 1;
        respawn(p, 0.18);
      }
      const l = p.life;
      smoke.pos[i * 3] = p.x + l * l * 1.3 + Math.sin(time * 0.6 + p.phase) * 0.25 * l;
      smoke.pos[i * 3 + 1] = 1.25 + l * 4.2 * p.reach;
      smoke.pos[i * 3 + 2] = p.z + Math.cos(time * 0.5 + p.phase) * 0.25 * l;
      smoke.size[i] = 0.55 + l * 1.9;
      // Lit warm from below near the flame, cooling to grey as it rises.
      const warm = Math.max(0, 1 - l * 3);
      const alpha = Math.sin(Math.PI * Math.min(1, l * 1.15)) * 0.085 * (1 + 0.6 * level);
      smoke.color.set([0.09 + 0.35 * warm, 0.085 + 0.12 * warm, 0.085 + 0.02 * warm, alpha], i * 4);
    }
    smoke.geo.attributes.position.needsUpdate = true;
    smoke.geo.attributes.aSize.needsUpdate = true;
    smoke.geo.attributes.aColor.needsUpdate = true;

    // The light breathes and wanders a little so shadows dance.
    const flicker = Math.sin(time * 11) * 0.6 + Math.sin(time * 17.3) * 0.4 + Math.sin(time * 5.1);
    light.intensity = (20 + flicker * 2.6) * (1 + 0.7 * level);
    light.color.copy(FIRE_LIGHT).lerp(auroraTint, 0.3 * auroraLevel);
    light.position.set(Math.sin(time * 7.3) * 0.035, 0.75 + Math.sin(time * 9.1) * 0.03, Math.cos(time * 5.9) * 0.035);
    const pulse = 1 + flicker * 0.08 + 0.5 * level;
    logs.glow[0].emissiveIntensity = 1.6 * pulse;
    logs.glow[1].emissiveIntensity = 0.9 * pulse;
  }

  return {
    group,
    light,
    update,
    flare() {
      flareStart = time;
    },
    setAurora(colors, level) {
      auroraLevel = colors.length === 0 ? 0 : level;
      flames.forEach((m, i) => (m.uniforms.uAurora.value = auroraLevel * FLAME_LAYERS[i].tint));
      const key = colors.join();
      if (auroraLevel === 0 || key === auroraKey) return;
      auroraKey = key;
      const last = colors[colors.length - 1];
      for (const m of flames) {
        m.uniforms.uA.value.set(colors[0]);
        m.uniforms.uB.value.set(last);
      }
      auroraTint.set(colors[0]).lerp(new THREE.Color(last), 0.5);
    },
    setPointScale(pxPerUnit) {
      smoke.points.material.uniforms.uPx.value = pxPerUnit;
      sparks.points.material.uniforms.uPx.value = pxPerUnit;
    },
  };
}
```

위 코드를 풀어 쓴 설명:

- **flare 레벨**: 장작을 넣은 뒤 경과 시간 t에 대해 `0→1`(3초), 1 유지(12초), `1→0`(15초). 오디오 부스트와 같은 `BOOST` 상수를 쓴다. `uFlare`로 불꽃·숯에 넣는다.
- **장작**: 나무껍질 `MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.95, emissive: 0xffffff, emissiveMap: 숯 텍스처, emissiveIntensity: 1.6 })`, 단면 `{ color: 0x1a100a, emissive: 0xff5a14, emissiveIntensity: 0.9 }`.
  - 세운 장작 5개: `CylinderGeometry(0.075, 0.1, 1.0, 10)`, `a = i/5·2π + 0.3`, 위치 `(cos a·0.2, 0.26, sin a·0.2)`, 회전 `(0, -a, π/2 - 0.85)`.
  - 바닥 장작 2개: `CylinderGeometry(0.09, 0.1, 0.95, 10)`, 위치 `(0, 0.09, 0)`, 회전 `(0, 0.5 + i·1.45, π/2)`.
  - 돌 12개: `DodecahedronGeometry(0.13 + (i%3)·0.02, 0)`, 반지름 0.66 원 위, y 0.07, 회전 `(i, i·2, 0)`, `{ color: 0x6f6a66, roughness: 1, flatShading: true }`.
  - **그림자는 돌만 드리운다.** 장작은 불빛 바로 아래라 그림자를 드리우면 화덕이 까맣게 된다.
- **숯 텍스처**: 128×128 캔버스, 검은 바탕에 주황 금 26줄. LCG(`seed = seed·16807 % 2147483647`, 초기 11). 줄마다 색 `rgba(255, 90+rand·90, 20, 0.35+rand·0.5)`, 굵기 `0.8 + rand·1.8`, 5마디(`x += (rand-0.5)·14`, `y += 4 + rand·12`). `SRGBColorSpace`, `RepeatWrapping`.
- **불빛**: `PointLight(0xff7a2e, 20, 0, 1.7)`, 위치 `(0, 0.75, 0)`, `castShadow`, 그림자 맵 512, near 0.15, far 16, bias -0.012, normalBias 0.03. 매 프레임:
  - `flicker = sin(11t)·0.6 + sin(17.3t)·0.4 + sin(5.1t)`
  - `intensity = (20 + flicker·2.6)·(1 + 0.7·flare)`
  - 위치 `(sin(7.3t)·0.035, 0.75 + sin(9.1t)·0.03, cos(5.9t)·0.035)`
  - 색 `0xff7a2e`를 오로라 색(두 색의 중간) 쪽으로 `0.3 × 오로라 레벨`만큼 섞음
  - 장작 발광 `1.6·pulse`, `0.9·pulse`, `pulse = 1 + flicker·0.08 + 0.5·flare`
- **불티** 60개(가산 혼합, renderOrder 2). 입자마다 `life`(0~1), `rate = 0.6+rand·0.8`, `phase`, `reach = 0.6+rand·0.8`, 반지름 `sqrt(rand)·0.22` 원 안의 x, z.
  - `life += dt·rate·(0.22 + 0.2·flare)`, 1 넘으면 다시 태어남
  - `wob = 0.12 + 0.5·l`; x `= p.x + sin(2.1t + phase)·wob·l + l²·0.35`; y `= 0.35 + l·(2.2 + 1.6·flare)·reach`; z `= p.z + cos(1.7t + phase·1.3)·wob·l`
  - 크기 `0.035 + 0.03·reach`, 색 `(3.2, 1.25, 0.28) × (1-l)^1.6 × (0.55 + 0.45·sin(14t + phase·5))`
- **연기** 26개(보통 혼합, renderOrder 1), 퍼짐 0.18.
  - `life += dt·rate·0.11`
  - x `= p.x + l²·1.3 + sin(0.6t + phase)·0.25·l`; y `= 1.25 + l·4.2·reach`; z `= p.z + cos(0.5t + phase)·0.25·l`
  - 크기 `0.55 + l·1.9`; `warm = max(0, 1 - 3l)`; 색 `(0.09 + 0.35·warm, 0.085 + 0.12·warm, 0.085 + 0.02·warm)`; 알파 `sin(π·min(1, 1.15·l))·0.085·(1 + 0.6·flare)`
- **`setAurora(colors, level)`**: `uA = colors[0]`, `uB = 마지막 색`(한 색이면 둘이 같음), 각 장의 `uAurora = level × tint`.

입자 공용 `src/scene/soft-points.ts` (원본 그대로). 불티, 연기, 반딧불이 쓴다.

```ts
import * as THREE from 'three';

/** Round soft points with per-particle size and colour (rgb premultiplied by fade). */
function pointsMaterial(blending: THREE.Blending): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uPx: { value: 400 } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute vec4 aColor;
      uniform float uPx;
      varying vec4 vColor;
      void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPx / -mv.z;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec4 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = (1.0 - smoothstep(0.0, 1.0, d));
        gl_FragColor = vec4(vColor.rgb, vColor.a * a * a);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending,
    fog: false,
  });
}

export function softPoints(count: number, blending: THREE.Blending) {
  const pos = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const color = new Float32Array(count * 4);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.BufferAttribute(color, 4).setUsage(THREE.DynamicDrawUsage));
  const points = new THREE.Points(geo, pointsMaterial(blending));
  points.frustumCulled = false;
  return { points, pos, size, color, geo };
}
```

## 9. 환경 (src/scene/environment.ts)

LCG 난수 `seeded(seed)`: `s = s·16807 % 2147483647`, 반환 `s / 2147483647`. 환경 배치는 seed 7.

- **하늘 돔**: `SphereGeometry(150, 32, 16)`, 안쪽 면, 깊이 쓰기·검사 끔, 안개 끔, renderOrder -10. 색 `mix(#131f38, #04070f, pow(smoothstep(0, 0.42, dir.y), 0.6))`.
- **산 능선** 2겹(`MeshBasicMaterial`, 안개 끔, 양면): `ridge(반지름 78, 바닥 3.2, 봉우리 9.5, '#0c1528', seed 5)`, `ridge(62, 2.6, 5.2, '#080e1c', seed 23)`. 둘레 240칸의 띠이고 아래는 y -2. 높이는 사인파 6개 합: `f = 2 + i·3 + floor(rand·3)`, `p = rand·6.28`, `a = 1/(i+1.5)`; `h = base + (0.5 + 0.5·n/Σa)·peak`. 별 구(반지름 90)보다 안쪽이라 지평선 아래 별을 가린다.
- **땅**: `PlaneGeometry(70, 70, 160, 160)`을 눕힘. `MeshStandardMaterial({ vertexColors: true, roughness: 1 })`, `receiveShadow`. 높이 함수:

```ts
export function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const k = THREE.MathUtils.smoothstep(r, 4, 10);
  const rolling = (Math.sin(x * 0.35 + 1.3) * Math.cos(z * 0.31 - 0.7) * 0.5 + Math.sin(x * 0.9 + z * 0.7) * 0.15) * k * 0.9;
  // The pond: level the bank, then dig a shallow basin below the water line.
  const d = pondDistance(x, z);
  const bank = THREE.MathUtils.smoothstep(d, 1.3, 2.0);
  const basin = 1 - THREE.MathUtils.smoothstep(d, 0.75, 1.3);
  return rolling * bank - basin * 0.4;
}
```

  정점 색: 풀 `#1c2e1f`, 이끼 `#263320`, 흙 `#2a241b`, 진흙 `#1d1a15`. `n = sin(1.7x + 0.3)·cos(1.3z + 1.1)·0.5 + 0.5`, `m = sin(0.6x - 0.8z)·0.5 + 0.5`. `풀.lerp(이끼, n).lerp(흙, m·0.35).lerp(진흙, 1 - smoothstep(pondDistance, 1.05, 1.5))`.
- **화덕 흙바닥**: `CircleGeometry(1.2, 40)`, `0x33261a`, y 0.006, `receiveShadow`.
- **풀** 260포기(`InstancedMesh`, `{ color: 0xffffff, roughness: 1, vertexColors: true, side: DoubleSide }`, `receiveShadow`). 사용자가 "지저분하다"고 두 번 고친 부분이라 **짧고 곧고 성기게** 유지한다.
  - 한 포기 = 납작한 잎 4장, 단위 높이. seed 97. 잎마다 `yaw = b/4·2π + rand·0.8`, `lean = 0.03 + rand·0.06`, `height = 0.6 + rand·0.4`, `width = 0.03 + rand·0.015`. 4칸으로 나눠 `t`에서 폭 `width·(1 - t²)`, 바깥으로 `0.02 + lean·t²`. 정점 색 `0.45 + 0.75t`(밑동이 어두움). 법선은 `(dx·0.35, 0.9, dz·0.35)`로 거의 위를 향하게 직접 넣는다(불빛을 고르게 받음).
  - 배치: 각도 무작위, 반지름 `2.7 + rand·9`. 버리는 조건: `z > 3.4`(카메라 앞), `pondDistance < 1.3`, 빈터 안. 빈터 `[x, z, 반지름]`: `[-1.35, -1.74, 0.8]`(좌석), `[-2.7, -1.0, 1.0]`(강아지), `[-1.7, -0.8, 0.95]`(강아지 주둥이 앞).
  - 크기: 높이 `(0.07 + rand·0.05) × (z > 1.5 ? 0.7 : 1)`, 폭 `0.6 + rand·0.25`, y는 `groundHeight - 0.01`. 색 `#3a6b33`을 `#6b6a32` 쪽으로 `rand·0.25` 섞고 `0.8 + rand·0.25`배.
- **소나무** 72그루(`InstancedMesh` 2개: 잎, 줄기). 잎은 원뿔 3단을 합친 단위 높이 지오메트리: `ConeGeometry(r, h, 8)`을 y로 올림 — `(1, 0.5, y 0.25)`, `(0.76, 0.46, 0.55)`, `(0.5, 0.44, 0.82)`. `{ color: 0xffffff, roughness: 1, flatShading: true }`, 인스턴스 색 `#15281c × (0.75 + rand·0.5)`. 줄기 `CylinderGeometry(0.1, 0.15, 1, 6)`을 y 0.5 올림, `0x2a1c12`, 스케일 `(1, 0.7, 1)`.
  - 가까운 고리 26그루: 반지름 `8 + rand·4`, 높이 `1.5 + rand·1.5`, 폭 `0.6 + rand·0.35`
  - 먼 고리 46그루: 반지름 `13 + rand·7`, 높이 `2.2 + rand·2.2`, 폭 `0.8 + rand·0.5`
  - 각도 `0.82π + i/count·1.36π + (rand-0.5)·0.18` — 뒤쪽 반원에만 서고 카메라 쪽은 비운다.
  - `pondDistance < 1.7`이면 y -50으로 내려 숨긴다. 잎은 `groundHeight - 0.05 + 0.45`부터. `castShadow`.
- **반딧불** 18마리(가산 혼합 soft points). 집: 반지름 `3.2 + rand·6`, 높이 `0.35 + rand·1.1`, `speed = 0.25 + rand·0.35`. `p = t·speed + phase`; x `+ sin(p)·0.7 + sin(2.3p)·0.2`; y `= 집 높이 + max(WATER_Y, groundHeight) + sin(1.7p)·0.25`; z `+ cos(0.8p)·0.7`. 깜박임 `max(0, sin(0.9t + 3·phase))³`, 색 `(0.9, 1.5, 0.3) × 깜박임`, 크기 0.07.

`src/scene/environment.ts` 전체 (원본 그대로):

```ts
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { pondDistance } from '../core/pond';
import { type Pond, WATER_Y, createPond } from './pond';
import { softPoints } from './soft-points';

/** Sky colour at the horizon; the fog uses it too so far ground melts into the sky. */
export const HORIZON = new THREE.Color('#131f38');
const ZENITH = new THREE.Color('#04070f');

const FIREFLIES = 18;

/** Gentle rolling ground that stays flat around the fire and the seat. */
export function groundHeight(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const k = THREE.MathUtils.smoothstep(r, 4, 10);
  const rolling = (Math.sin(x * 0.35 + 1.3) * Math.cos(z * 0.31 - 0.7) * 0.5 + Math.sin(x * 0.9 + z * 0.7) * 0.15) * k * 0.9;
  // The pond: level the bank, then dig a shallow basin below the water line.
  const d = pondDistance(x, z);
  const bank = THREE.MathUtils.smoothstep(d, 1.3, 2.0);
  const basin = 1 - THREE.MathUtils.smoothstep(d, 0.75, 1.3);
  return rolling * bank - basin * 0.4;
}

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Dome with a soft glow near the horizon fading to near-black overhead. */
function skyDome(): THREE.Mesh {
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(150, 32, 16),
    new THREE.ShaderMaterial({
      uniforms: { uHorizon: { value: HORIZON }, uZenith: { value: ZENITH } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uHorizon, uZenith;
        varying vec3 vDir;
        void main() {
          float t = smoothstep(0.0, 0.42, normalize(vDir).y);
          gl_FragColor = vec4(mix(uHorizon, uZenith, pow(t, 0.6)), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
      fog: false,
    }),
  );
  dome.renderOrder = -10;
  dome.frustumCulled = false;
  return dome;
}

/** A ring of ridge silhouettes; `peak` is how far the tallest summit rises. */
function ridge(radius: number, base: number, peak: number, color: string, seed: number): THREE.Mesh {
  const rand = seeded(seed);
  const waves = Array.from({ length: 6 }, (_, i) => ({ f: 2 + i * 3 + Math.floor(rand() * 3), p: rand() * 6.28, a: 1 / (i + 1.5) }));
  const total = waves.reduce((s, w) => s + w.a, 0);
  const SEG = 240;
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= SEG; i++) {
    const a = (i / SEG) * Math.PI * 2;
    let n = 0;
    for (const w of waves) n += Math.sin(a * w.f + w.p) * w.a;
    const h = base + (0.5 + (0.5 * n) / total) * peak;
    const x = Math.cos(a) * radius;
    const z = Math.sin(a) * radius;
    pos.push(x, -2, z, x, h, z);
    if (i < SEG) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, fog: false, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  return mesh;
}

function ground(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(70, 70, 160, 160).rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const grass = new THREE.Color('#1c2e1f');
  const moss = new THREE.Color('#263320');
  const soil = new THREE.Color('#2a241b');
  const mud = new THREE.Color('#1d1a15');
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setY(i, groundHeight(x, z));
    const n = Math.sin(x * 1.7 + 0.3) * Math.cos(z * 1.3 + 1.1) * 0.5 + 0.5;
    const m = Math.sin(x * 0.6 - z * 0.8) * 0.5 + 0.5;
    c.copy(grass).lerp(moss, n).lerp(soil, m * 0.35);
    // Bare, damp earth along the water's edge.
    c.lerp(mud, 1 - THREE.MathUtils.smoothstep(pondDistance(x, z), 1.05, 1.5));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
  mesh.receiveShadow = true;
  return mesh;
}

/** Three stacked cones, unit height, so one instanced draw makes a whole pine. */
function pineGeometry(): THREE.BufferGeometry {
  const tiers = [
    { r: 1, h: 0.5, y: 0.25 },
    { r: 0.76, h: 0.46, y: 0.55 },
    { r: 0.5, h: 0.44, y: 0.82 },
  ].map((t) => new THREE.ConeGeometry(t.r, t.h, 8).translate(0, t.y, 0));
  const merged = mergeGeometries(tiers);
  tiers.forEach((t) => t.dispose());
  return merged;
}

/**
 * A tuft of four flat blades standing close together, unit height. Blades
 * taper to a point, lean out only a little and are darker at the base, so a
 * field of them reads as short neat grass rather than spikes.
 */
function tuftGeometry(): THREE.BufferGeometry {
  const rand = seeded(97);
  const pos: number[] = [];
  const col: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const SEG = 4;
  for (let b = 0; b < 4; b++) {
    const yaw = (b / 4) * Math.PI * 2 + rand() * 0.8;
    const lean = 0.03 + rand() * 0.06;
    const height = 0.6 + rand() * 0.4;
    const width = 0.03 + rand() * 0.015;
    const dx = Math.cos(yaw);
    const dz = Math.sin(yaw);
    const base = pos.length / 3;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const w = width * (1 - t * t);
      const out = 0.02 + lean * t * t;
      // Blade faces outward; its width runs across (perpendicular to the lean).
      for (const sgn of [-1, 1]) {
        pos.push(dx * out - dz * w * sgn, height * t, dz * out + dx * w * sgn);
        const shade = 0.45 + 0.75 * t;
        col.push(shade, shade, shade);
        // Mostly upward normals: blades take the firelight evenly from either side.
        nor.push(dx * 0.35, 0.9, dz * 0.35);
      }
      if (i < SEG) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

/** Trampled ground where nothing grows: around the seat and where the dog lies (x, z, radius). */
const CLEARINGS: Array<[number, number, number]> = [
  [-1.35, -1.74, 0.8],
  [-2.7, -1.0, 1.0],
  // In front of the dog's nose and paws.
  [-1.7, -0.8, 0.95],
];

export interface Environment {
  group: THREE.Group;
  update(time: number, fire: THREE.PointLight): void;
  setPointScale(pxPerUnit: number): void;
}

export function createEnvironment(): Environment {
  const group = new THREE.Group();
  group.add(skyDome());
  // Ridges sit inside the star sphere so they hide stars below the skyline.
  group.add(ridge(78, 3.2, 9.5, '#0c1528', 5));
  group.add(ridge(62, 2.6, 5.2, '#080e1c', 23));
  group.add(ground());

  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 40),
    new THREE.MeshStandardMaterial({ color: 0x33261a, roughness: 1 }),
  );
  dirt.rotation.x = -Math.PI / 2;
  dirt.position.y = 0.006;
  dirt.receiveShadow = true;
  group.add(dirt);

  const rand = seeded(7);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const c = new THREE.Color();

  // Grass: short tufts, thicker near the camp and thinning out with distance.
  const TUFTS = 260;
  const blades = new THREE.InstancedMesh(
    tuftGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, vertexColors: true, side: THREE.DoubleSide }),
    TUFTS,
  );
  const green = new THREE.Color('#3a6b33');
  const dry = new THREE.Color('#6b6a32');
  for (let i = 0; i < TUFTS; ) {
    const a = rand() * Math.PI * 2;
    // The camp itself is trodden bare; grass starts a little way out.
    const r = 2.7 + rand() * 9;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    // Keep the foreground between the camera and the fire low and open.
    if (z > 3.4) continue;
    if (pondDistance(x, z) < 1.3) continue;
    if (CLEARINGS.some(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) < cr)) continue;
    const near = z > 1.5 ? 0.7 : 1;
    const h = (0.07 + rand() * 0.05) * near;
    const w = 0.6 + rand() * 0.25;
    q.setFromEuler(e.set(0, rand() * 6.28, 0));
    m.compose(pos.set(x, groundHeight(x, z) - 0.01, z), q, scl.set(w, h, w));
    blades.setMatrixAt(i, m);
    blades.setColorAt(i, c.copy(green).lerp(dry, rand() * 0.25).multiplyScalar(0.8 + rand() * 0.25));
    i++;
  }
  blades.receiveShadow = true;
  group.add(blades);

  // Pines: a near ring that catches the firelight and a denser far ring of silhouettes.
  const rings = [
    { count: 26, r0: 8, dr: 4, h0: 1.5, dh: 1.5, w0: 0.6, dw: 0.35 },
    { count: 46, r0: 13, dr: 7, h0: 2.2, dh: 2.2, w0: 0.8, dw: 0.5 },
  ];
  const total = rings.reduce((s, r) => s + r.count, 0);
  const tops = new THREE.InstancedMesh(
    pineGeometry(),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }),
    total,
  );
  const trunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.1, 0.15, 1, 6).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1 }),
    total,
  );
  const pine = new THREE.Color('#15281c');
  let t = 0;
  q.identity();
  for (const ring of rings) {
    for (let i = 0; i < ring.count; i++, t++) {
      const a = Math.PI * 0.82 + (i / ring.count) * Math.PI * 1.36 + (rand() - 0.5) * 0.18;
      const r = ring.r0 + rand() * ring.dr;
      const h = ring.h0 + rand() * ring.dh;
      const w = ring.w0 + rand() * ring.dw;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // No tree stands in the pond or right on its bank.
      const y = pondDistance(x, z) < 1.7 ? -50 : groundHeight(x, z) - 0.05;
      q.setFromEuler(e.set(0, rand() * 6.28, 0));
      m.compose(pos.set(x, y + 0.45, z), q, scl.set(w, h, w));
      tops.setMatrixAt(t, m);
      tops.setColorAt(t, c.copy(pine).multiplyScalar(0.75 + rand() * 0.5));
      m.compose(pos.set(x, y, z), q, scl.set(1, 0.7, 1));
      trunks.setMatrixAt(t, m);
    }
  }
  tops.castShadow = trunks.castShadow = true;
  group.add(tops, trunks);

  // Fireflies drifting low among the grass, blinking slowly.
  const flies = softPoints(FIREFLIES, THREE.AdditiveBlending);
  const homes = Array.from({ length: FIREFLIES }, () => {
    const a = rand() * Math.PI * 2;
    const r = 3.2 + rand() * 6;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0.35 + rand() * 1.1, phase: rand() * 6.28, speed: 0.25 + rand() * 0.35 };
  });
  group.add(flies.points);

  const pond: Pond = createPond(HORIZON, ZENITH);
  group.add(pond.group);

  return {
    group,
    update(time, fire) {
      pond.update(time, fire);
      homes.forEach((h, i) => {
        const p = time * h.speed + h.phase;
        flies.pos[i * 3] = h.x + Math.sin(p) * 0.7 + Math.sin(p * 2.3) * 0.2;
        flies.pos[i * 3 + 1] = h.y + Math.max(WATER_Y, groundHeight(h.x, h.z)) + Math.sin(p * 1.7) * 0.25;
        flies.pos[i * 3 + 2] = h.z + Math.cos(p * 0.8) * 0.7;
        const blink = Math.pow(Math.max(0, Math.sin(time * 0.9 + h.phase * 3)), 3);
        flies.size[i] = 0.07;
        flies.color.set([0.9 * blink, 1.5 * blink, 0.3 * blink, 1], i * 4);
      });
      flies.geo.attributes.position.needsUpdate = true;
      flies.geo.attributes.aSize.needsUpdate = true;
      flies.geo.attributes.aColor.needsUpdate = true;
    },
    setPointScale(pxPerUnit) {
      flies.points.material.uniforms.uPx.value = pxPerUnit;
    },
  };
}
```

## 10. 연못 (src/scene/pond.ts)

`WATER_Y = -0.07`, `REACH = 1.2`(물 메시가 물가보다 조금 넓고 가장자리에서 투명해짐). 배치 난수 seed 41.

- 물: `CircleGeometry(1.2, 64)`을 눕히고 `position (4.5, -0.07, -3.3)`, `scale (2.5, 1, 1.75)`, renderOrder -1. 단위 원을 늘인 것이라 셰이더에서 `length(position.xz)`가 곧 물가 거리다.
- 이 카메라 위치에서는 불이 물에 직접 비치지 않는다. 그래서 불빛은 **잔물결 마루에 얹는 따뜻한 빛**으로 그린다. `uFire`(불빛 월드 위치), `uFireColor`(불빛 색), `uFireLevel = intensity / 20`을 매 프레임 넣어 깜박임과 오로라 색을 따라가게 한다.

`src/scene/pond.ts` 전체 (원본 그대로, 셰이더 안의 `${REACH.toFixed(2)}`는 `1.20`):

```ts
import * as THREE from 'three';
import { POND } from '../core/pond';

/** Water surface height; the ground is dug below this inside the shoreline. */
export const WATER_Y = -0.07;
/** The water mesh reaches a little past the shoreline and fades out there. */
const REACH = 1.2;

function seeded(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/**
 * Still, dark water: it mirrors the night sky, more so at grazing angles, and
 * its small ripples catch the firelight.
 */
function waterMaterial(horizon: THREE.Color, zenith: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uHorizon: { value: horizon },
      uZenith: { value: zenith },
      uFire: { value: new THREE.Vector3(0, 0.9, 0) },
      uFireColor: { value: new THREE.Color(0xff7a2e) },
      uFireLevel: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec2 vP;
      void main() {
        vP = position.xz;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFireLevel;
      uniform vec3 uHorizon, uZenith, uFire, uFireColor;
      varying vec3 vWorld;
      varying vec2 vP;
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
      }
      void main() {
        float d = length(vP);
        vec2 q = vWorld.xz;
        // Two ripple fields sliding past each other tilt the surface a little.
        float a = vnoise(q * 3.1 + vec2(uTime * 0.21, uTime * 0.13)) + 0.5 * vnoise(q * 7.3 - uTime * 0.3);
        float b = vnoise(q * 3.1 + vec2(4.7 - uTime * 0.17, 9.2 + uTime * 0.19)) + 0.5 * vnoise(q * 7.3 + 3.3 + uTime * 0.27);
        vec3 n = normalize(vec3((a - 0.75) * 0.22, 1.0, (b - 0.75) * 0.22));
        vec3 v = normalize(cameraPosition - vWorld);
        vec3 r = reflect(-v, n);
        vec3 sky = mix(uHorizon, uZenith, pow(clamp(r.y, 0.0, 1.0), 0.6));
        float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = mix(vec3(0.006, 0.012, 0.02), sky * 1.5, 0.3 + 0.7 * fresnel);
        // The fire is too low and too far to mirror in the pond from here, so its
        // light shows as a warm wash that catches on the ripple crests nearest to it.
        vec3 l = uFire - vWorld;
        float fall = 1.0 / (1.0 + 0.12 * dot(l, l));
        float crest = pow(clamp(a * 0.72, 0.0, 1.0), 7.0) + pow(clamp(b * 0.72, 0.0, 1.0), 7.0);
        col += uFireColor * uFireLevel * fall * (0.1 + 1.1 * crest);
        gl_FragColor = vec4(col, 1.0 - smoothstep(1.0, ${REACH.toFixed(2)}, d));
      }
    `,
    transparent: true,
    depthWrite: false,
    fog: false,
  });
}

export interface Pond {
  group: THREE.Group;
  /** `fire`: the campfire's light, so the glow on the water follows its colour and flicker. */
  update(time: number, fire: THREE.PointLight): void;
}

export function createPond(horizon: THREE.Color, zenith: THREE.Color): Pond {
  const group = new THREE.Group();
  const rand = seeded(41);

  // Unit disc stretched to the pond's ellipse, so the shader sees shoreline distance directly.
  const water = new THREE.Mesh(new THREE.CircleGeometry(REACH, 64).rotateX(-Math.PI / 2), waterMaterial(horizon, zenith));
  water.position.set(POND.x, WATER_Y, POND.z);
  water.scale.set(POND.rx, 1, POND.rz);
  water.renderOrder = -1;
  group.add(water);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();
  const c = new THREE.Color();
  /** A point at shoreline distance `d` and angle `a` around the pond. */
  const at = (a: number, d: number) => pos.set(POND.x + Math.cos(a) * POND.rx * d, 0, POND.z + Math.sin(a) * POND.rz * d);

  // Reeds stand in clumps in the shallows, thickest on the far bank so the water stays in view.
  const REEDS = 150;
  const reeds = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.02, 1, 4).translate(0, 0.5, 0),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
    REEDS,
  );
  const HEADS = 22;
  const heads = new THREE.InstancedMesh(
    new THREE.CapsuleGeometry(0.022, 0.1, 3, 8),
    new THREE.MeshStandardMaterial({ color: 0x3a2416, roughness: 1 }),
    HEADS,
  );
  const green = new THREE.Color('#3f6a34');
  const straw = new THREE.Color('#77703a');
  let headCount = 0;
  for (let i = 0; i < REEDS; ) {
    // sin(a) < 0 is the far bank; keep most clumps there and a few at the sides.
    const a = rand() < 0.75 ? Math.PI + rand() * Math.PI : rand() * Math.PI;
    const d = 0.93 + rand() * 0.2;
    const clump = 4 + Math.floor(rand() * 6);
    const { x: cx, z: cz } = at(a, d);
    for (let k = 0; k < clump && i < REEDS; k++, i++) {
      const x = cx + (rand() - 0.5) * 0.3;
      const z = cz + (rand() - 0.5) * 0.3;
      const h = 0.45 + rand() * 0.55;
      const lean = e.set((rand() - 0.5) * 0.3, rand() * 6.28, (rand() - 0.5) * 0.3);
      q.setFromEuler(lean);
      m.compose(pos.set(x, WATER_Y - 0.05, z), q, scl.set(1, h, 1));
      reeds.setMatrixAt(i, m);
      reeds.setColorAt(i, c.copy(green).lerp(straw, rand() * 0.7).multiplyScalar(0.7 + rand() * 0.5));
      if (headCount < HEADS && k < 2 && rand() < 0.6) {
        // A cattail head rides near the tip of a taller stalk.
        const tip = new THREE.Vector3(0, h * 0.86, 0).applyQuaternion(q);
        m.compose(tip.add(pos), q, scl.set(1, 1, 1));
        heads.setMatrixAt(headCount++, m);
      }
    }
  }
  heads.count = headCount;
  reeds.castShadow = heads.castShadow = true;
  group.add(reeds, heads);

  // Lily pads drift in place on the surface.
  const PADS = 9;
  const pads = new THREE.InstancedMesh(
    new THREE.CircleGeometry(1, 14, 0.35, Math.PI * 2 - 0.7).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
    PADS,
  );
  const padHomes = Array.from({ length: PADS }, () => {
    const p = at(rand() * Math.PI * 2, 0.25 + rand() * 0.6);
    return { x: p.x, z: p.z, size: 0.1 + rand() * 0.09, turn: rand() * 6.28, phase: rand() * 6.28 };
  });
  const padGreen = new THREE.Color('#2f5f33');
  padHomes.forEach((_, i) => pads.setColorAt(i, c.copy(padGreen).multiplyScalar(0.7 + rand() * 0.6)));
  pads.receiveShadow = true;
  group.add(pads);

  // A few stones sit half in the water along the near bank.
  const stone = new THREE.MeshStandardMaterial({ color: 0x5f5d5a, roughness: 1, flatShading: true });
  for (let i = 0; i < 7; i++) {
    const p = at(0.15 + rand() * (Math.PI - 0.3), 1.0 + rand() * 0.12);
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09 + rand() * 0.1, 0), stone);
    s.position.set(p.x, WATER_Y + 0.01, p.z);
    s.rotation.set(rand() * 6, rand() * 6, 0);
    s.scale.y = 0.6;
    s.castShadow = s.receiveShadow = true;
    group.add(s);
  }

  return {
    group,
    update(time, fire) {
      const u = water.material.uniforms;
      u.uTime.value = time;
      fire.getWorldPosition(u.uFire.value);
      u.uFireColor.value.copy(fire.color);
      u.uFireLevel.value = fire.intensity / 20;
      padHomes.forEach((p, i) => {
        q.setFromEuler(e.set(0, p.turn + Math.sin(time * 0.2 + p.phase) * 0.25, 0));
        pos.set(p.x + Math.sin(time * 0.3 + p.phase) * 0.03, WATER_Y + 0.006, p.z + Math.cos(time * 0.24 + p.phase) * 0.03);
        pads.setMatrixAt(i, m.compose(pos, q, scl.set(p.size, 1, p.size)));
      });
      pads.instanceMatrix.needsUpdate = true;
    },
  };
}
```

위 코드의 배치를 풀어 쓴 설명:

- **갈대** 150줄기: `ConeGeometry(0.02, 1, 4)`를 y 0.5 올림. 4~9줄기씩 무리. 무리 중심은 75% 확률로 먼 물가(`a = π + rand·π`), 아니면 `rand·π`; 물가 거리 `0.93 + rand·0.2`. 줄기는 중심에서 ±0.15, 높이 `0.45 + rand·0.55`, 기울기 ±0.15rad, y `WATER_Y - 0.05`. 색 `#3f6a34`→`#77703a`로 `rand·0.7`, 밝기 `0.7 + rand·0.5`.
- **부들 머리** 최대 22개: `CapsuleGeometry(0.022, 0.1, 3, 8)`, `0x3a2416`. 무리의 앞 2줄기에 60% 확률, 줄기 높이의 0.86 지점.
- **연잎** 9장: `CircleGeometry(1, 14, 0.35, 2π - 0.7)`(쐐기가 빠진 원), 크기 `0.1 + rand·0.09`, 물가 거리 `0.25 + rand·0.6`, y `WATER_Y + 0.006`, 색 `#2f5f33 × (0.7 + rand·0.6)`. 제자리에서 ±0.03 떠다니고 ±0.25rad 돈다(주기 `0.3t`, `0.24t`, `0.2t`).
- **돌** 7개: `DodecahedronGeometry(0.09 + rand·0.1, 0)`, 가까운 물가(`a = 0.15 + rand·(π - 0.3)`, 거리 `1.0 + rand·0.12`), y 스케일 0.6, `{ color: 0x5f5d5a, flatShading: true }`.

## 11. 하늘 (src/scene/sky.ts, meteors.ts)

- **실제 하늘**이다. 북위 38° 동경 127°에서 **오늘 밤 자정(KST)** 의 정남쪽. 06시 전에는 지난 자정을 "오늘 밤"으로 본다. `lst = greenwichSiderealDeg(tonightMidnightKst(now)) + 127`. 별마다 `equatorialToHorizontal` → 고도 0 미만은 버림 → `horizontalToScene` × 반지름 90.
- 별은 등급 구간 6개로 나눠 `Points` 6개로 그린다. 크기(픽셀, `sizeAttenuation: false`): 1.5등급까지 12, 2.5까지 9, 3.5까지 7, 4.5까지 5, 5.3까지 3.8, 나머지 3. `PointsMaterial({ vertexColors, map, transparent, depthWrite: false, blending: AdditiveBlending, fog: false, toneMapped: false })`.
- 별 텍스처: 32×32 방사형 그라디언트 흰색 알파 `1 → 0.9(0.25) → 0.35(0.5) → 0(1)`.
- 별 색: `bv < 0.6`이면 `#a9bcff → #fff6ec`를 `max(0, (bv + 0.3)/0.9)`로, 아니면 `#fff6ec → #ffc580`를 `min(1, (bv - 0.6)/1.0)`로. 밝기 `clamp(1.3 - 등급·0.1, 0.7, 1)`.
- **은하수**: 점 2,600개, seed 4242. `l = rand·360`, `core = exp(-(min(l, 360-l)/55)²)`, `b = gauss·(5 + 6·core)`(`gauss = (rand×4의 합 - 2)·1.7`), `galacticToEquatorial` 후 같은 변환. 크기 `(22 + rand·34) × min(devicePixelRatio, 1.5)`픽셀, 밝기 `a = (0.012 + 0.03·core)·(0.5 + rand)`, 색 `((0.75 + 0.25·core)·a, 0.8·a, (1 - 0.25·core)·a)`. 가산 혼합, 원형 감쇠 `(1 - smoothstep(0, 1, d))²`. 실제 위치라서 은하수가 남쪽 하늘에 없는 달에는 화면에 안 보인다(정상).
- **유성우**: 유성마다 삼각형 1개(꼬리 한 점, 머리 양옆 두 점). `MeshBasicMaterial({ vertexColors, transparent, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false, toneMapped: false })`. 화면 좌표를 `unproject`해서 카메라에서 80 떨어진 곳에 둔다. 머리 폭 2.2픽셀(화면 높이 기준, 가로세로비 보정). 머리 색 `#e8f0ff × 밝기`, 꼬리 점은 검정.

`src/scene/sky.ts` (원본 그대로):

```ts
import * as THREE from 'three';
import {
  OBSERVER,
  equatorialToHorizontal,
  galacticToEquatorial,
  greenwichSiderealDeg,
  horizontalToScene,
  tonightMidnightKst,
} from '../core/sky';
import { STARS } from './sky-data';

const RADIUS = 90;
/** Pixel sizes per magnitude bucket (brightest first). */
const BUCKETS: Array<{ maxMag: number; size: number }> = [
  { maxMag: 1.5, size: 12 },
  { maxMag: 2.5, size: 9 },
  { maxMag: 3.5, size: 7 },
  { maxMag: 4.5, size: 5 },
  { maxMag: 5.3, size: 3.8 },
  { maxMag: 99, size: 3 },
];

function starTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const MILKY_POINTS = 2600;

/**
 * The Milky Way as a haze of big, very faint points scattered around the
 * galactic plane (denser and warmer toward the galactic centre). It follows
 * the same real-sky transform as the stars, so it is only in view on nights
 * when the plane actually crosses the southern sky.
 */
function milkyWay(toScene: (ra: number, dec: number) => [number, number, number] | null): THREE.Points {
  let seed = 4242;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => (rand() + rand() + rand() + rand() - 2) * 1.7;
  const pos: number[] = [];
  const size: number[] = [];
  const color: number[] = [];
  for (let i = 0; i < MILKY_POINTS; i++) {
    const l = rand() * 360;
    const fromCentre = Math.min(l, 360 - l);
    const core = Math.exp(-((fromCentre / 55) ** 2));
    const b = gauss() * (5 + 6 * core);
    const { ra, dec } = galacticToEquatorial(l, b);
    const p = toScene(ra, dec);
    const sz = 22 + rand() * 34;
    const a = (0.012 + 0.03 * core) * (0.5 + rand());
    if (!p) continue;
    pos.push(...p);
    size.push(sz);
    color.push((0.75 + 0.25 * core) * a, 0.8 * a, (1 - 0.25 * core) * a);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
  geo.setAttribute('aColor', new THREE.Float32BufferAttribute(color, 3));
  const points = new THREE.Points(
    geo,
    new THREE.ShaderMaterial({
      uniforms: { uDpr: { value: Math.min(window.devicePixelRatio, 1.5) } },
      vertexShader: /* glsl */ `
        attribute float aSize;
        attribute vec3 aColor;
        uniform float uDpr;
        varying vec3 vColor;
        void main() {
          vColor = aColor;
          gl_PointSize = aSize * uDpr;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = 1.0 - smoothstep(0.0, 1.0, d);
          gl_FragColor = vec4(vColor * a * a, 1.0);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    }),
  );
  points.frustumCulled = false;
  return points;
}

const BLUE = new THREE.Color('#a9bcff');
const WHITE = new THREE.Color('#fff6ec');
const ORANGE = new THREE.Color('#ffc580');

function starColor(bv: number, mag: number, out: THREE.Color): THREE.Color {
  if (bv < 0.6) out.copy(BLUE).lerp(WHITE, Math.max(0, (bv + 0.3) / 0.9));
  else out.copy(WHITE).lerp(ORANGE, Math.min(1, (bv - 0.6) / 1.0));
  // Fainter stars dimmer so the sky has depth.
  return out.multiplyScalar(THREE.MathUtils.clamp(1.3 - mag * 0.1, 0.7, 1));
}

/**
 * The real sky over 38°N 127°E at tonight's midnight (KST), drawn so that due
 * south is straight ahead. Stars below the horizon are skipped.
 */
export function createSky(now: Date): THREE.Group {
  const group = new THREE.Group();
  const lst = greenwichSiderealDeg(tonightMidnightKst(now)) + OBSERVER.lonDeg;
  const toScene = (ra: number, dec: number): [number, number, number] | null => {
    const { alt, az } = equatorialToHorizontal(ra, dec, lst, OBSERVER.latDeg);
    if (alt < 0) return null;
    const [x, y, z] = horizontalToScene(alt, az);
    return [x * RADIUS, y * RADIUS, z * RADIUS];
  };

  group.add(milkyWay(toScene));

  const positions: number[][] = BUCKETS.map(() => []);
  const colors: number[][] = BUCKETS.map(() => []);
  const c = new THREE.Color();
  for (let i = 0; i < STARS.length; i += 4) {
    const p = toScene(STARS[i], STARS[i + 1]);
    if (!p) continue;
    const mag = STARS[i + 2];
    const b = BUCKETS.findIndex((x) => mag <= x.maxMag);
    positions[b].push(...p);
    starColor(STARS[i + 3], mag, c);
    colors[b].push(c.r, c.g, c.b);
  }
  const map = starTexture();
  BUCKETS.forEach((bucket, b) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions[b], 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors[b], 3));
    const points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: bucket.size,
        sizeAttenuation: false,
        vertexColors: true,
        fog: false,
        map,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    points.frustumCulled = false;
    group.add(points);
  });

  return group;
}
```

`src/core/meteors.ts` (원본 그대로):

```ts
import type { Rng } from './rng';

/** How long the meteor shower after a wish lasts. */
export const SHOWER_MS = 12_000;
const COUNT = 40;

/**
 * One meteor in view coordinates (x, y in -1..1, like NDC): it streaks from
 * `from` to `to` starting `delay` seconds into the shower and lasting `life`.
 */
export interface Meteor {
  delay: number;
  life: number;
  from: [number, number];
  to: [number, number];
}

/** Seconds since the shower started, or null when none is running. */
export function showerElapsed(startedAt: number | null, now: number): number | null {
  if (startedAt === null) return null;
  const ms = now - startedAt;
  if (ms < 0 || ms >= SHOWER_MS) return null;
  return ms / 1000;
}

/** Meteors fanning out from a radiant above the top-right of the view. */
export function planShower(rand: Rng): Meteor[] {
  const total = SHOWER_MS / 1000;
  const meteors: Meteor[] = [];
  for (let i = 0; i < COUNT; i++) {
    const life = 0.6 + rand() * 0.7;
    // Denser in the middle of the shower, sparse at the edges.
    const u = (i + rand()) / COUNT;
    const delay = Math.min(total - life, (0.5 - Math.cos(Math.PI * u) / 2) * (total - 1.4) + 0.2);
    // Only the top third of the view is open sky (lower rays hit ground or trees).
    const from: [number, number] = [-0.95 + rand() * 1.9, 0.55 + rand() * 0.43];
    // Direction away from the radiant (1.3, 1.6), with a little scatter.
    const dx = from[0] - 1.3;
    const dy = from[1] - 1.6;
    const len = Math.hypot(dx, dy);
    const travel = 0.25 + rand() * 0.3;
    const to: [number, number] = [from[0] + (dx / len) * travel, from[1] + (dy / len) * travel];
    meteors.push({ delay, life, from, to });
  }
  return meteors;
}

/** Where the head and tail are along the path (0..1) and how bright, or null if not visible. */
export function meteorFrame(m: Meteor, elapsed: number): { head: number; tail: number; alpha: number } | null {
  const t = (elapsed - m.delay) / m.life;
  if (t < 0 || t > 1) return null;
  const head = t;
  const tail = Math.max(0, t - 0.35);
  return { head, tail, alpha: Math.sin(Math.PI * t) };
}
```

`src/scene/meteors.ts` (원본 그대로):

```ts
import * as THREE from 'three';
import { type Meteor, meteorFrame, planShower, showerElapsed } from '../core/meteors';
import type { Rng } from '../core/rng';

const MAX = 40;
const DISTANCE = 80;
/** Streak width at the head, in pixels. */
const HEAD_PX = 2.2;
const HEAD = new THREE.Color('#e8f0ff');

/**
 * Meteor streaks drawn as thin triangles (bright head, fading tail) placed on
 * the sky behind the trees. Paths are planned in view coordinates so every
 * meteor lands where the camera is looking.
 */
export class MeteorShower {
  readonly mesh: THREE.Mesh;
  private readonly positions = new Float32Array(MAX * 3 * 3);
  private readonly colors = new Float32Array(MAX * 3 * 3);
  private plan: Meteor[] = [];
  private startedAt: number | null = null;
  private readonly v = new THREE.Vector3();

  constructor() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  start(startedAt: number, rand: Rng): void {
    this.startedAt = startedAt;
    this.plan = planShower(rand).slice(0, MAX);
  }

  update(now: number, camera: THREE.PerspectiveCamera, viewportHeight: number): void {
    const elapsed = showerElapsed(this.startedAt, now);
    if (elapsed === null) {
      this.startedAt = null;
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    this.colors.fill(0);
    const halfW = HEAD_PX / Math.max(1, viewportHeight);
    this.plan.forEach((m, i) => {
      const f = meteorFrame(m, elapsed);
      const base = i * 9;
      if (!f) {
        this.positions.fill(0, base, base + 9);
        return;
      }
      const [fx, fy] = m.from;
      const dx = m.to[0] - fx;
      const dy = m.to[1] - fy;
      // Perpendicular measured in pixels so the streak is even on wide screens.
      const px = -dy;
      const py = dx * camera.aspect;
      const pl = Math.hypot(px, py) || 1;
      const ox = ((px / pl) * halfW) / camera.aspect;
      const oy = (py / pl) * halfW;
      const hx = fx + dx * f.head;
      const hy = fy + dy * f.head;
      this.put(base, fx + dx * f.tail, fy + dy * f.tail, camera);
      this.put(base + 3, hx + ox, hy + oy, camera);
      this.put(base + 6, hx - ox, hy - oy, camera);
      for (const k of [3, 6]) {
        this.colors[base + k] = HEAD.r * f.alpha;
        this.colors[base + k + 1] = HEAD.g * f.alpha;
        this.colors[base + k + 2] = HEAD.b * f.alpha;
      }
    });
    const geo = this.mesh.geometry;
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }

  /** View coordinates → a point on the sky DISTANCE away along that ray. */
  private put(offset: number, x: number, y: number, camera: THREE.PerspectiveCamera) {
    this.v.set(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
    this.v.multiplyScalar(DISTANCE).add(camera.position);
    this.positions[offset] = this.v.x;
    this.positions[offset + 1] = this.v.y;
    this.positions[offset + 2] = this.v.z;
  }
}
```

## 12. 캠퍼, 강아지, 소품

공용 도우미 `src/scene/parts.ts` (원본 그대로). `tube`는 곡선을 따라 타원 단면을 쓸어 만든 매끈한 몸통이다.

```ts
import * as THREE from 'three';

/** Something in the scene that moves a little on its own (breathing, blinking…). */
export interface Actor {
  group: THREE.Group;
  update(time: number): void;
}

export const mat = (color: THREE.ColorRepresentation, roughness = 0.8) =>
  new THREE.MeshStandardMaterial({ color, roughness });

type V3 = [number, number, number];

const UP = new THREE.Vector3(0, 1, 0);

/** A rounded limb segment running from `a` to `b`. */
export function limb(a: V3, b: V3, radius: number, material: THREE.Material): THREE.Mesh {
  const from = new THREE.Vector3(...a);
  const dir = new THREE.Vector3(...b).sub(from);
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, dir.length(), 4, 12), material);
  mesh.position.copy(from).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
  return mesh;
}

/** A sphere, optionally squashed, at a position. */
export function blob(radius: number, at: V3, material: THREE.Material, scale: V3 = [1, 1, 1]): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), material);
  mesh.position.set(...at);
  mesh.scale.set(...scale);
  return mesh;
}

export interface TubeOptions {
  /** Vertex colour by position along the path (0..1) and height on the ring (-1 bottom .. 1 top). */
  color?: (t: number, up: number) => THREE.Color;
  segments?: number;
  radial?: number;
  /** Fraction of the length at each end that rounds off to a point. */
  cap?: number;
}

/**
 * A smooth organic shape swept along a curve through `points`, with an
 * elliptical cross-section `[halfWidth, halfHeight]` that can change along
 * the way and rounded ends. Used for bodies, necks, legs and tails.
 */
export function tube(
  points: V3[],
  radius: (t: number) => [number, number],
  material: THREE.Material,
  { color, segments = 36, radial = 18, cap = 0.1 }: TubeOptions = {},
): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const pos: number[] = [];
  const uv: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const p = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const side = new THREE.Vector3();
  const up = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    curve.getPoint(t, p);
    curve.getTangent(t, tan);
    side.crossVectors(UP, tan);
    if (side.lengthSq() < 1e-4) side.set(1, 0, 0);
    side.normalize();
    up.crossVectors(tan, side).normalize();
    // Round the ends off like half an ellipsoid.
    const edge = Math.min(t, 1 - t) / cap;
    const round = edge >= 1 ? 1 : Math.sqrt(1 - (1 - edge) * (1 - edge));
    const [rx, ry] = radius(t);
    for (let k = 0; k < radial; k++) {
      // Start underneath so the texture seam is out of sight.
      const a = (k / radial) * Math.PI * 2 - Math.PI / 2;
      const cx = Math.cos(a) * rx * round;
      const cy = Math.sin(a) * ry * round;
      pos.push(p.x + side.x * cx + up.x * cy, p.y + side.y * cx + up.y * cy, p.z + side.z * cx + up.z * cy);
      uv.push(t, k / radial);
      if (color) {
        const c = color(t, Math.sin(a));
        col.push(c.r, c.g, c.b);
      }
      if (i < segments) {
        const a0 = i * radial + k;
        const a1 = i * radial + ((k + 1) % radial);
        idx.push(a0, a1, a0 + radial, a1, a1 + radial, a0 + radial);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (color) geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}
```

### 12.1 강아지 `src/scene/dog.ts` (원본 그대로)

엎드려 앞발에 턱을 괴고 조는 골든 리트리버. 원통·구를 이어 붙이면 "나무토막 같다"는 말을 듣는다. 몸통·목·다리·주둥이·꼬리를 `tube`로 만든 것이 핵심이다.

```ts
import * as THREE from 'three';
import { type Actor, blob, mat, tube } from './parts';

const FUR = new THREE.Color('#c98f45');
const BACK = new THREE.Color('#a8702f');
const CREAM = new THREE.Color('#ecd3a2');

/** Fine streaks running along the body, used as a bump map so the coat reads as fur. */
function furTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#808080';
  g.fillRect(0, 0, size, size);
  let seed = 29;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const v = 70 + Math.floor(rand() * 130);
    g.strokeStyle = `rgba(${v},${v},${v},0.55)`;
    g.lineWidth = 0.6 + rand() * 1.2;
    const x = rand() * size;
    const y = rand() * size;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 8 + rand() * 16, y + (rand() - 0.5) * 3);
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 4);
  return tex;
}

/** Golden on top shading to cream underneath, like a retriever's coat. */
const coat = (_t: number, up: number) => {
  const c = CREAM.clone().lerp(FUR, THREE.MathUtils.smoothstep(up, -0.9, -0.1));
  return c.lerp(BACK, THREE.MathUtils.smoothstep(up, 0.35, 1) * 0.7);
};

/**
 * A big golden dog lying on its belly with its chin on its paws, dozing by
 * the fire. It breathes slowly, flicks an ear now and then, and thumps its
 * tail once in a while. Local +z is where the nose points; the origin is on
 * the ground under its belly.
 */
export function createDog(): Actor {
  const root = new THREE.Group();
  const bump = furTexture();
  const fur = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, bumpMap: bump, bumpScale: 1.6 });
  const plain = new THREE.MeshStandardMaterial({ color: FUR, roughness: 0.95, bumpMap: bump, bumpScale: 1.6 });
  const light = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.95, bumpMap: bump, bumpScale: 1.6 });
  const shade = new THREE.MeshStandardMaterial({ color: BACK, roughness: 0.95, bumpMap: bump, bumpScale: 1.6 });
  const dark = mat('#17120f', 0.45);
  const lerp = THREE.MathUtils.lerp;

  // Trunk: one skin from rump to shoulders — full hips, a tucked waist, a deep chest.
  const trunk = new THREE.Group();
  const profile: Array<[number, number, number]> = [
    [0, 0.2, 0.17],
    [0.2, 0.275, 0.215],
    [0.5, 0.235, 0.19],
    [0.8, 0.285, 0.245],
    [1, 0.21, 0.2],
  ];
  const trunkRadius = (t: number): [number, number] => {
    const i = Math.min(profile.length - 2, profile.findIndex((p, k) => k > 0 && t <= p[0]) - 1);
    const [t0, x0, y0] = profile[Math.max(0, i)];
    const [t1, x1, y1] = profile[Math.max(0, i) + 1];
    const k = THREE.MathUtils.smoothstep(t, t0, t1);
    return [lerp(x0, x1, k), lerp(y0, y1, k)];
  };
  trunk.add(
    tube(
      [
        [0, 0.19, -0.68],
        [0, 0.225, -0.4],
        [0, 0.2, -0.05],
        [0, 0.255, 0.3],
        [0, 0.27, 0.58],
      ],
      trunkRadius,
      fur,
      { color: coat, segments: 48, radial: 24, cap: 0.14 },
    ),
  );
  // A soft ruff of paler fur under the neck.
  trunk.add(blob(0.17, [0, 0.17, 0.5], light, [1.15, 0.8, 0.9]));
  root.add(trunk);

  for (const side of [-1, 1]) {
    // Haunch folded against the flank, with the hind foot lying forward along the belly.
    root.add(blob(0.2, [0.215 * side, 0.19, -0.33], plain, [0.72, 0.95, 1.3]));
    root.add(
      tube(
        [
          [0.27 * side, 0.1, -0.5],
          [0.31 * side, 0.065, -0.3],
          [0.325 * side, 0.055, -0.02],
        ],
        (t) => [lerp(0.075, 0.055, t), lerp(0.07, 0.05, t)],
        fur,
        { color: coat, segments: 14, radial: 12, cap: 0.2 },
      ),
    );
    // Front leg: elbow tucked at the chest, forearm stretched out ahead.
    root.add(
      tube(
        [
          [0.2 * side, 0.2, 0.36],
          [0.215 * side, 0.1, 0.5],
          [0.19 * side, 0.075, 0.78],
          [0.165 * side, 0.065, 1.0],
        ],
        (t) => [lerp(0.1, 0.062, t), lerp(0.095, 0.058, t)],
        fur,
        { color: coat, segments: 20, radial: 12, cap: 0.16 },
      ),
    );
    // Paws: a pad with three toes.
    for (const [x, z, s] of [
      [0.325 * side, 0.03, 0.85],
      [0.165 * side, 1.04, 1],
    ]) {
      root.add(blob(0.075 * s, [x, 0.05, z], light, [1.05, 0.72, 1.3]));
      for (const toe of [-1, 0, 1]) root.add(blob(0.03 * s, [x + toe * 0.04 * s, 0.04, z + 0.075 * s], light, [1, 0.9, 1.3]));
    }
  }

  // Neck flows down from the shoulders to the head on the paws.
  root.add(
    tube(
      [
        [0, 0.28, 0.42],
        [0.005, 0.27, 0.62],
        [0.02, 0.22, 0.86],
      ],
      (t) => [lerp(0.2, 0.15, t), lerp(0.185, 0.14, t)],
      fur,
      { color: coat, segments: 16, radial: 18, cap: 0.2 },
    ),
  );
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.172, 0.024, 8, 28), mat('#b3362c', 0.7));
  collar.position.set(0.008, 0.262, 0.66);
  collar.rotation.x = 0.2;
  root.add(collar, blob(0.028, [0.008, 0.1, 0.7], mat('#d9b24a', 0.4), [1, 1, 0.5]));

  // Head rests on the paws, tipped a little to one side.
  const head = new THREE.Group();
  head.position.set(0.02, 0.21, 0.93);
  head.rotation.set(0.06, 0.16, 0.1);
  head.add(blob(0.175, [0, 0.005, 0], plain, [1.08, 0.9, 1.05]));
  // Brow and cheeks give the skull some shape before it narrows into the muzzle.
  head.add(blob(0.1, [0, 0.07, 0.07], plain, [1.25, 0.6, 0.9]));
  head.add(
    tube(
      [
        [0, -0.02, 0.06],
        [0, -0.045, 0.22],
        [0, -0.06, 0.37],
      ],
      (t) => [lerp(0.12, 0.078, t), lerp(0.095, 0.062, t)],
      fur,
      { color: (_t, up) => CREAM.clone().lerp(FUR, THREE.MathUtils.smoothstep(up, 0.2, 1) * 0.6), segments: 14, radial: 14, cap: 0.22 },
    ),
  );
  head.add(blob(0.04, [0, -0.035, 0.37], dark, [1.2, 0.85, 0.8]));
  const ears: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    head.add(blob(0.055, [0.06 * side, -0.075, 0.26], light, [1, 0.8, 1.25]));
    // Closed, content eyes: a small downward arc under a soft brow.
    const lid = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0075, 6, 12, Math.PI), dark);
    lid.position.set(0.09 * side, 0.04, 0.15);
    lid.rotation.set(-0.25, 0.5 * side, Math.PI);
    head.add(lid);
    // Long soft ears hanging down past the jaw.
    const ear = blob(0.12, [0.185 * side, -0.035, -0.035], shade, [0.3, 1.25, 0.95]);
    ear.rotation.set(0.15, 0, 0.3 * side);
    ears.push(ear);
    head.add(ear);
  }
  root.add(head);

  // A feathered tail lying curled on the ground.
  const tail = new THREE.Group();
  tail.position.set(0, 0.17, -0.62);
  tail.add(
    tube(
      [
        [0, 0, 0.06],
        [0.03, -0.07, -0.2],
        [0.14, -0.1, -0.42],
        [0.32, -0.1, -0.56],
      ],
      (t) => {
        const r = lerp(0.07, 0.1, Math.sin(Math.min(1, t * 1.5) * Math.PI * 0.5)) * (1 - 0.55 * t * t);
        return [r, r * 0.75];
      },
      fur,
      { color: coat, segments: 22, radial: 12, cap: 0.25 },
    ),
  );
  root.add(tail);

  return {
    group: root,
    update(t) {
      const breath = Math.sin(t * 1.05);
      trunk.scale.set(1 + breath * 0.018, 1 + breath * 0.03, 1);
      head.position.y = 0.21 + breath * 0.004;
      // One ear flick every ~9 s, alternating sides.
      const cycle = t / 9;
      const flick = cycle % 1 < 0.04 ? Math.sin(((cycle % 1) / 0.04) * Math.PI) : 0;
      const which = Math.floor(cycle) % 2;
      ears.forEach((ear, i) => (ear.rotation.z = 0.3 * (i === 0 ? -1 : 1) * (1 + (i === which ? flick * 1.3 : 0))));
      // A lazy tail thump for ~1.5 s out of every 14.
      const lap = t % 14;
      tail.rotation.y = lap < 1.5 ? Math.sin(lap * 9) * 0.28 * Math.sin((lap / 1.5) * Math.PI) : 0;
    },
  };
}
```

### 12.2 캠퍼 `src/scene/character.ts`

통나무에 앉아 불에 손을 쬐는 사람. `blob`, `limb`와 기본 도형을 조립한다. 로컬 +z가 얼굴 방향. `Actor`(`group`, `update(t)`)를 반환한다.

머티리얼(`mat(색, roughness)`): 피부 `a.skin` 0.65, 옷 `a.shirt` 0.9, 옷 장식 = 옷 색 × 0.7, 목도리 `a.hatColor` 0.95, 바지 `#343a4d`, 부츠 `#4a3324` 0.7, 밑창 `#16110d`, 머리카락 `#33241b`, 눈·입 `#141414` 0.35.

| 부위 | 도형 |
|---|---|
| 앉은 통나무 | `CylinderGeometry(0.2, 0.22, 0.95, 14)`, z로 90° 눕힘, y 0.2, 껍질 `#5c3a22`, 단면 `#b08a5a` |
| 엉덩이 | `blob(0.25, [0, 0.5, 0.02], 바지, [1.15, 0.72, 1])` |
| 몸통(숨 쉬는 그룹) | `CapsuleGeometry(0.27, 0.34, 6, 18)` y 0.82 · 밑단 `Torus(0.255, 0.04)` y 0.58 · 후드 `blob(0.2, [0, 1.1, -0.2], 옷, [1.25, 0.8, 0.75])` · 주머니 `blob(0.13, [0, 0.72, 0.23], 장식, [1.3, 0.7, 0.4])` · 목도리 `Torus(0.17, 0.065)` y 1.13 + 늘어진 끝 `limb([0.12, 1.1, 0.14], [0.15, 0.86, 0.25], 0.05)` |
| 팔(좌우 `side = ±1`) | `limb([0.3s, 1.0, 0.02], [0.35s, 0.76, 0.16], 0.085)`, `limb([0.35s, 0.76, 0.16], [0.26s, 0.63, 0.32], 0.075)`, 소매 `Torus(0.07, 0.022)` at `(0.255s, 0.625, 0.325)` 회전 `(0.9, 0.5s, 0)`, 손 `blob(0.078, [0.24s, 0.6, 0.36], 피부, [1, 1.05, 0.8])` |
| 다리 | `limb([0.13s, 0.5, 0.05], [0.15s, 0.5, 0.42], 0.105)`, `limb([0.15s, 0.48, 0.44], [0.15s, 0.2, 0.52], 0.09)`, 부츠 `blob(0.115, [0.15s, 0.1, 0.57], 부츠, [1, 0.85, 1.45])`, 밑창 `blob(0.115, [0.15s, 0.035, 0.575], 밑창, [1.05, 0.3, 1.5])` |
| 머리(그룹 y 1.42) | `blob(0.34, 피부, [1, 0.95, 0.97])` · 머리카락 반구 `Sphere(0.352, …, 0, 0.52π)` x로 -0.42 기울임 · 코 `blob(0.03, [0, -0.045, 0.335])` · 미소 `Torus(0.055, 0.011, 6, 14, π)` at `(0, -0.115, 0.312)` 회전 `(-0.15, 0, π)` |
| 얼굴(좌우) | 귀 `blob(0.075, [0.325s, -0.01, 0], [0.5, 1, 0.8])` · 눈 `blob(0.042, [0.115s, 0.025, 0.305], 검정, [1, 1.25, 0.55])` + 흰 하이라이트 `blob(0.012)` · 볼 `Circle(0.05)` `#f08a8a` 투명도 0.5 at `(0.19s, -0.075, 0.292)` |

모자(머리 그룹에 붙임):

- `beanie`: 반구 `Sphere(0.36)` + 테 `Torus(0.34, 0.06)` + 방울 `Sphere(0.09)` `#f5f0e6` y 0.36. 그룹 y 0.08.
- `cap`: 반구 `Sphere(0.35)` + 챙 `Cylinder(0.22, 0.22, 0.03, 20, 1, false, -π/2, π)` at `(0, 0, 0.3)` 스케일 `(1.1, 1, 1.3)`. 그룹 y 0.1.
- `straw`: 챙 `Cylinder(0.62, 0.62, 0.03)` + 운두 `Cylinder(0.27, 0.32, 0.22)` y 0.12 + 띠 `Cylinder(0.325, 0.325, 0.06)` `#7a4e2d` y 0.04. 그룹 y 0.2.

움직임: `breath = sin(1.5t)`; 몸통 스케일 `(1 + 0.012b, 1 + 0.008b, 1 + 0.02b)`; 머리 y `1.42 + 0.006b`; 머리 회전 `(0.12 + sin(0.21t)·0.03, sin(0.13t)·0.14, sin(0.17t)·0.02)`; 눈 깜박임 `t % 4.7 < 0.13`이면 눈 y 스케일 × 0.12.

`src/scene/character.ts` (원본 그대로):

```ts
import * as THREE from 'three';
import type { Appearance } from '../core/appearance';
import { type Actor, blob, limb, mat } from './parts';


function hat(kind: Appearance['hat'], color: string): THREE.Object3D | null {
  const m = mat(color, 0.9);
  const g = new THREE.Group();
  switch (kind) {
    case 'none':
      return null;
    case 'beanie': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.06, 8, 24), m);
      rim.rotation.x = Math.PI / 2;
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat('#f5f0e6', 1));
      pom.position.y = 0.36;
      g.add(dome, rim, pom);
      g.position.y = 0.08;
      return g;
    }
    case 'cap': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), m);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20, 1, false, -Math.PI / 2, Math.PI), m);
      brim.position.set(0, 0.0, 0.3);
      brim.scale.set(1.1, 1, 1.3);
      g.add(dome, brim);
      g.position.y = 0.1;
      return g;
    }
    case 'straw': {
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.03, 28), m);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.22, 20), m);
      crown.position.y = 0.12;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.325, 0.325, 0.06, 20), mat('#7a4e2d'));
      band.position.y = 0.04;
      g.add(brim, crown, band);
      g.position.y = 0.2;
      return g;
    }
  }
}

/**
 * A seated camper warming their hands: hoodie, scarf, boots, a face that
 * blinks, and a slow breath. Local +z is the face direction.
 */
export function createCharacter(a: Appearance): Actor {
  const root = new THREE.Group();
  const skin = mat(a.skin, 0.65);
  const shirt = mat(a.shirt, 0.9);
  const trim = mat(new THREE.Color(a.shirt).multiplyScalar(0.7), 0.9);
  const scarf = mat(a.hatColor, 0.95);
  const pants = mat('#343a4d', 0.9);
  const boot = mat('#4a3324', 0.7);
  const sole = mat('#16110d', 0.9);
  const hair = mat('#33241b', 0.95);
  const dark = mat('#141414', 0.35);

  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.95, 14), [
    mat('#5c3a22', 0.95),
    mat('#b08a5a', 0.9),
    mat('#b08a5a', 0.9),
  ]);
  seat.rotation.z = Math.PI / 2;
  seat.position.y = 0.2;
  root.add(seat);

  root.add(blob(0.25, [0, 0.5, 0.02], pants, [1.15, 0.72, 1]));

  // Torso breathes as one piece.
  const torso = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.34, 6, 18), shirt);
  body.position.y = 0.82;
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.04, 8, 24), trim);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = 0.58;
  const hood = blob(0.2, [0, 1.1, -0.2], shirt, [1.25, 0.8, 0.75]);
  const pocket = blob(0.13, [0, 0.72, 0.23], trim, [1.3, 0.7, 0.4]);
  const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.065, 10, 24), scarf);
  wrap.rotation.x = Math.PI / 2;
  wrap.position.y = 1.13;
  const tail = limb([0.12, 1.1, 0.14], [0.15, 0.86, 0.25], 0.05, scarf);
  torso.add(body, hem, hood, pocket, wrap, tail);
  root.add(torso);

  for (const side of [-1, 1]) {
    // Arms reach forward, palms to the fire.
    torso.add(limb([0.3 * side, 1.0, 0.02], [0.35 * side, 0.76, 0.16], 0.085, shirt));
    torso.add(limb([0.35 * side, 0.76, 0.16], [0.26 * side, 0.63, 0.32], 0.075, shirt));
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 6, 14), trim);
    cuff.position.set(0.255 * side, 0.625, 0.325);
    cuff.rotation.set(0.9, 0.5 * side, 0);
    torso.add(cuff, blob(0.078, [0.24 * side, 0.6, 0.36], skin, [1, 1.05, 0.8]));

    root.add(limb([0.13 * side, 0.5, 0.05], [0.15 * side, 0.5, 0.42], 0.105, pants));
    root.add(limb([0.15 * side, 0.48, 0.44], [0.15 * side, 0.2, 0.52], 0.09, pants));
    root.add(blob(0.115, [0.15 * side, 0.1, 0.57], boot, [1, 0.85, 1.45]));
    root.add(blob(0.115, [0.15 * side, 0.035, 0.575], sole, [1.05, 0.3, 1.5]));
  }

  const head = new THREE.Group();
  head.position.y = 1.42;
  head.add(blob(0.34, [0, 0, 0], skin, [1, 0.95, 0.97]));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.352, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hair);
  cap.rotation.x = -0.42;
  head.add(cap, blob(0.03, [0, -0.045, 0.335], skin, [1, 0.9, 1]));
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.011, 6, 14, Math.PI), dark);
  smile.position.set(0, -0.115, 0.312);
  smile.rotation.set(-0.15, 0, Math.PI);
  head.add(smile);
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    head.add(blob(0.075, [0.325 * side, -0.01, 0], skin, [0.5, 1, 0.8]));
    const eye = blob(0.042, [0.115 * side, 0.025, 0.305], dark, [1, 1.25, 0.55]);
    eye.add(blob(0.012, [0.012, 0.014, 0.04], new THREE.MeshBasicMaterial({ color: '#fff' })));
    eyes.push(eye);
    const cheek = new THREE.Mesh(
      new THREE.CircleGeometry(0.05, 12),
      new THREE.MeshBasicMaterial({ color: '#f08a8a', transparent: true, opacity: 0.5 }),
    );
    cheek.position.set(0.19 * side, -0.075, 0.292);
    cheek.lookAt(cheek.position.clone().multiplyScalar(2));
    head.add(eye, cheek);
  }
  const h = hat(a.hat, a.hatColor);
  if (h) head.add(h);
  root.add(head);

  return {
    group: root,
    update(t) {
      const breath = Math.sin(t * 1.5);
      torso.scale.set(1 + breath * 0.012, 1 + breath * 0.008, 1 + breath * 0.02);
      head.position.y = 1.42 + breath * 0.006;
      // Mostly watches the fire, drifting now and then.
      head.rotation.set(0.12 + Math.sin(t * 0.21) * 0.03, Math.sin(t * 0.13) * 0.14, Math.sin(t * 0.17) * 0.02);
      const blink = t % 4.7 < 0.13 ? 0.12 : 1;
      for (const eye of eyes) eye.scale.y = 1.25 * blink;
    },
  };
}

/** Height above the character origin where the name tag sits. */
export const NAMETAG_Y = 2.2;
```

### 12.3 이름표 `nametag.ts`

캔버스에 그린 `Sprite`. 폰트 `600 40px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`, 좌우 여백 28, 높이 68, 완전히 둥근 알약 모양, 배경 `#ffb02e`, 글자 `#1a1a1a`. 스프라이트 스케일 `픽셀 × 0.0042`, `depthWrite: false`.

`src/scene/nametag.ts` (원본 그대로):

```ts
import * as THREE from 'three';

const FONT = '600 40px -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif';

/** Rounded pill label above the character (approved mockup: orange "me" tag). */
export function createNametag(name: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d')!;
  g.font = FONT;
  const padX = 28;
  const h = 68;
  const w = Math.ceil(g.measureText(name).width) + padX * 2;
  canvas.width = w;
  canvas.height = h;
  g.font = FONT;
  g.fillStyle = '#ffb02e';
  g.beginPath();
  g.roundRect(0, 0, w, h, h / 2);
  g.fill();
  g.fillStyle = '#1a1a1a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, w / 2, h / 2 + 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  const scale = 0.0042;
  sprite.scale.set(w * scale, h * scale, 1);
  return sprite;
}
```

### 12.4 마시멜로 꼬치 `scene/marshmallow.ts`

좌석 기준 좌표. 손 `(-0.24, 0.6, 0.36)`에서 끝 `(-0.44, 0.8, 2.0)`까지 꼬치 `Cylinder(0.018, 0.022, 길이, 6)` `0x8a6a45`. 끝에서 0.08 안쪽에 마시멜로 `Cylinder(0.09, 0.09, 0.16, 16)` roughness 0.6. `setProgress(p)`: null이면 숨김, 아니면 `marshmallowColor(p)`로 색 변경.

`src/scene/marshmallow.ts` (원본 그대로):

```ts
import * as THREE from 'three';
import { marshmallowColor } from '../core/marshmallow';

// Seat-local coordinates (+z faces the fire, which is 2.2 ahead).
const HAND = new THREE.Vector3(-0.24, 0.6, 0.36);
const TIP = new THREE.Vector3(-0.44, 0.8, 2.0);

/** A stick held toward the fire with a marshmallow that browns as it toasts. */
export function createMarshmallowStick(): { group: THREE.Group; setProgress(p: number | null): void } {
  const group = new THREE.Group();
  const dir = TIP.clone().sub(HAND);
  const stick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, dir.length(), 6),
    new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 }),
  );
  stick.position.copy(HAND).addScaledVector(dir, 0.5);
  stick.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

  const puffMat = new THREE.MeshStandardMaterial({ color: 0xfbf6ec, roughness: 0.6 });
  const puff = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16), puffMat);
  puff.position.copy(TIP).addScaledVector(dir.clone().normalize(), -0.08);
  puff.quaternion.copy(stick.quaternion);

  group.add(stick, puff);
  group.visible = false;

  return {
    group,
    setProgress(p) {
      group.visible = p !== null;
      if (p !== null) puffMat.color.set(marshmallowColor(p));
    },
  };
}
```

`src/core/marshmallow.ts` (원본 그대로):

```ts
/** How long a marshmallow takes from white to toasted before it is eaten. */
export const TOAST_MS = 60_000;

/** 0..1 while toasting; null when nothing is on the stick (never started or eaten). */
export function toastProgress(startedAt: number | null, now: number): number | null {
  if (startedAt === null) return null;
  const p = (now - startedAt) / TOAST_MS;
  if (p >= 1) return null;
  return Math.max(0, p);
}

const STOPS: Array<[number, [number, number, number]]> = [
  [0, [0xfb, 0xf6, 0xec]], // raw white
  [0.6, [0xd9, 0x96, 0x3e]], // golden (darker so it reads under the orange firelight)
  [1, [0xa8, 0x65, 0x2a]], // toasted brown
];

const hex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

export function marshmallowColor(progress: number): string {
  const p = Math.min(1, Math.max(0, progress));
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    if (p <= p1) {
      const [p0, c0] = STOPS[i - 1];
      const k = (p - p0) / (p1 - p0);
      return `#${c0.map((v, j) => hex(v + (c1[j] - v) * k)).join('')}`;
    }
  }
  return '#a8652a';
}
```

`src/core/aurora.ts` (원본 그대로):

```ts
/** How long a pinch of aurora powder keeps the fire coloured. */
export const AURORA_MS = 30_000;
export const AURORA_MAX_PICK = 2;
const FADE_IN_MS = 2_000;
const FADE_OUT_MS = 5_000;

export interface AuroraColor {
  id: string;
  label: string;
  /** sRGB `#rrggbb`, shared by the swatch and the flame. */
  hex: string;
}

export const AURORA_COLORS: readonly AuroraColor[] = [
  { id: 'green', label: '초록', hex: '#3dff6e' },
  { id: 'teal', label: '청록', hex: '#2ee6d6' },
  { id: 'blue', label: '파랑', hex: '#3d7bff' },
  { id: 'purple', label: '보라', hex: '#a45cff' },
  { id: 'pink', label: '분홍', hex: '#ff5fc8' },
  { id: 'red', label: '빨강', hex: '#ff3b3b' },
];

/** Picks or unpicks a colour; a pick beyond the limit is ignored. */
export function togglePick(picked: readonly string[], id: string): string[] {
  if (picked.includes(id)) return picked.filter((p) => p !== id);
  if (picked.length >= AURORA_MAX_PICK) return [...picked];
  return [...picked, id];
}

/** Milliseconds of coloured flame left; 0 when nothing is burning. */
export function auroraRemainingMs(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  return Math.min(AURORA_MS, Math.max(0, AURORA_MS - (now - startedAt)));
}

/** 0..1 strength of the coloured flame: fades in, holds, fades out. */
export function auroraLevel(startedAt: number | null, now: number): number {
  if (startedAt === null) return 0;
  const elapsed = now - startedAt;
  if (elapsed <= 0 || elapsed >= AURORA_MS) return 0;
  return Math.min(1, elapsed / FADE_IN_MS, (AURORA_MS - elapsed) / FADE_OUT_MS);
}
```

## 13. UI (src/ui/controls.ts, style.css)

`document.body`에 붙는 순서: 볼륨, 액션 줄, 🎲, 📜, 시작 오버레이, 다이얼로그 3개(`<dialog>` + `showModal()`). 캔버스(`.scene`)는 그보다 먼저 붙인다.

| 요소 | class | 문구 / 동작 |
|---|---|---|
| 시작 오버레이 | `.start-overlay` > `.start`, `.start-hint` | 버튼 `🔥 불 피우기`, 안내 `탭을 열어두고 일하세요. 장작 소리가 계속 납니다.` 로딩 중 `🔥 불 붙이는 중…`(비활성), 실패 `🔥 다시 시도`, 오디오가 멈췄을 때 `🔥 소리 다시 켜기`. 성공하면 `.hidden` 추가 |
| 볼륨 | `label.volume` > `.volume-icon` `🔊`, `input.volume-range` | range 0~1, step 0.01, `aria-label="볼륨"` |
| 장작 | `.log` | `🪵 장작 넣기` / 쿨타임 중 `🪵 장작 넣기 (mm:ss 후)` 비활성 |
| 마시멜로 | `.toast` | `🍡 마시멜로 굽기` / 굽는 중 `🍡 굽는 중…` 비활성 |
| 소원 | `.wish` | `🌠 소원 빌기` / 쿨타임 중 `🌠 소원 빌기 (h:mm:ss 후)` 비활성 |
| 오로라 | `.aurora` | `🌈 오로라 가루` / 타는 중 `🌈 타는 중 (mm:ss)` 비활성 |
| 다시 뽑기 | `.reroll` | `🎲`, title·aria-label `이름·모습 다시 뽑기` |
| 소원 목록 | `.history` | `📜`, title·aria-label `내 소원 보기` |

위 네 개 액션 버튼은 `.actions` 안에 이 순서로 넣는다.

다이얼로그(`dialog.dialog`, 제목 `h2.dialog-title`, 아래 줄 `.dialog-row`, 버튼 `.dialog-primary` / `.dialog-secondary`). 어두운 배경을 누르면 닫힌다(`e.target === dialog`).

- **소원 쓰기**: 제목 `🌠 소원을 적어주세요`, `textarea.wish-text`(maxLength 100, rows 3, placeholder `별똥별에게 빌 소원`, aria-label `소원`), 글자 수 `.wish-count` `0/100`, 버튼 `취소`, `빌기`(내용이 비면 비활성). Enter로 제출, Shift+Enter는 줄바꿈, 한글 조합 중(`e.isComposing`)에는 제출하지 않는다. 열 때마다 내용을 비운다. 소원이 받아들여지면 닫고 유성우를 시작한다.
- **내 소원**: 제목 `📜 내 소원`, `ul.wish-list` > `li.wish-item` > `time.wish-date` + `p.wish-body`. 날짜는 `Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })`. 없으면 `li.wish-empty` `아직 빈 소원이 없어요.` 버튼 `닫기`.
- **오로라 색 고르기**: 제목 `🌈 불꽃 색을 골라주세요`, `.aurora-swatches`(3열 격자) 안에 `button.aurora-swatch` 6개(각각 `--swatch` CSS 변수에 hex, 안에 `.aurora-dot` + `.aurora-label`). 고른 것은 `aria-pressed="true"`. 2개를 고르면 나머지는 비활성. 개수 표시 `0/2`, 버튼 `취소`, `넣기`(0개면 비활성). 열 때마다 선택을 비운다.

`main.ts`: 1초마다 네 버튼의 남은 시간을 갱신한다. 장작을 넣으면 `audio.boost()` + `stage.flare()`. 마시멜로·오로라는 진행 중이면 다시 누를 수 없다.

`src/style.css` — 빌드된 압축본 원문(한 줄). 그대로 붙여 쓰거나 풀어 써도 된다. 색 토큰: 배경 `#0b1220`, 글자 `#f5efe6`, 강조 `#ffb02e`, 강조 위 글자 `#1a1a1a`, 유리 `rgba(0,0,0,0.42)`.

```css
:root{--bg:#0b1220;--ink:#f5efe6;--accent:#ffb02e;--accent-ink:#1a1a1a;--glass:#0000006b;--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark}*{box-sizing:border-box}html,body{background:var(--bg);height:100%;color:var(--ink);margin:0;font-family:-apple-system,Apple SD Gothic Neo,Noto Sans KR,sans-serif;overflow:hidden}.scene{width:100%;height:100%;display:block;position:fixed;inset:0}button{font:inherit;cursor:pointer;border:0}.volume{background:var(--glass);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);border-radius:999px;align-items:center;gap:10px;padding:8px 16px;display:flex;position:fixed;top:16px;right:16px}.volume-range{width:120px;accent-color:var(--accent)}.actions{flex-wrap:wrap;justify-content:center;gap:12px;width:max-content;max-width:calc(100vw - 256px);display:flex;position:fixed;bottom:28px;left:50%;transform:translate(-50%)}.log,.toast,.wish,.aurora{background:var(--accent);color:var(--accent-ink);white-space:nowrap;border-radius:999px;padding:12px 24px;font-weight:600;transition:opacity .2s,background .2s;box-shadow:0 0 24px #ff8c2859}.log:disabled,.toast:disabled,.wish:disabled,.aurora:disabled{cursor:default;background:var(--glass);color:var(--ink);box-shadow:none;opacity:.85}.reroll{background:var(--glass);border-radius:50%;width:44px;height:44px;font-size:20px;position:fixed;bottom:28px;left:16px}.history{background:var(--glass);border-radius:50%;width:44px;height:44px;font-size:20px;position:fixed;bottom:28px;left:68px}.dialog{width:min(360px,100vw - 32px);color:var(--ink);background:#151c2b;border:0;border-radius:16px;padding:20px;box-shadow:0 12px 48px #0009}.dialog::backdrop{background:#05080e80}.dialog-title{margin:0 0 12px;font-size:17px}.wish-text{width:100%;color:var(--ink);font:inherit;resize:none;background:#0000004d;border:1px solid #ffffff26;border-radius:10px;padding:10px 12px}.wish-text:focus{outline:2px solid var(--accent);outline-offset:1px}.dialog-row{justify-content:flex-end;align-items:center;gap:8px;margin-top:12px;display:flex}.wish-count{opacity:.6;margin-right:auto;font-size:12px}.dialog-primary,.dialog-secondary{border-radius:999px;padding:8px 18px;font-weight:600}.dialog-primary{background:var(--accent);color:var(--accent-ink)}.dialog-primary:disabled{cursor:default;opacity:.4}.dialog-secondary{color:var(--ink);background:#ffffff1a}.wish-list{max-height:50vh;margin:0;padding:0;list-style:none;overflow-y:auto}.wish-item+.wish-item{border-top:1px solid #ffffff14}.wish-item{padding:10px 0}.wish-date{opacity:.6;font-size:12px}.wish-body{white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0 0}.wish-empty{opacity:.7;padding:12px 0}.start-overlay{-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);background:#05080e8c;flex-direction:column;justify-content:center;align-items:center;gap:16px;transition:opacity .6s;display:flex;position:fixed;inset:0}.start-overlay.hidden{opacity:0;pointer-events:none}.start{background:var(--accent);color:var(--accent-ink);border-radius:999px;padding:16px 36px;font-size:20px;font-weight:700;box-shadow:0 0 40px #ff8c2880}.start:disabled{cursor:progress;opacity:.8}.start-hint{opacity:.75;margin:0;font-size:14px}.aurora-swatches{grid-template-columns:repeat(3,1fr);gap:8px;display:grid}.aurora-swatch{color:var(--ink);background:#ffffff0f;border-radius:12px;outline:2px solid #0000;flex-direction:column;align-items:center;gap:6px;padding:12px 4px 10px;transition:opacity .2s,outline-color .2s;display:flex}.aurora-swatch[aria-pressed=true]{outline-color:var(--swatch);background:#ffffff1f}.aurora-swatch:disabled{cursor:default;opacity:.35}.aurora-dot{background:var(--swatch);width:30px;height:30px;box-shadow:0 0 14px var(--swatch);border-radius:50%}.aurora-label{font-size:13px}
```

## 14. 이미 겪은 함정

1. 음원에 `loudnorm` 금지(3.1).
2. 루프는 `loop = true` 대신 3초 크로스페이드 + 오디오 시계 예약 + 2개 선예약 + 늦으면 재기준(6장).
3. 효과 시간은 벽시계로(5장). 숨긴 탭에서 rAF가 멈춘다.
4. 오로라 색은 별도 불꽃으로 겹치지 말고 같은 셰이더의 바깥 테두리에(8장).
5. 장작은 그림자를 드리우지 않는다(8장).
6. 풀은 짧고 성기게, 캠퍼·강아지 자리는 비운다(9장).
7. 강아지는 `tube` 곡면으로(12.1). `tube`의 삼각형 감는 방향이 뒤집히면 몸이 까맣게 나온다. 위 코드의 인덱스 순서를 그대로 쓴다.
8. 연못의 불빛은 반사가 아니라 물결 마루의 빛으로(10장).
9. 소리는 사용자 클릭 뒤에만 시작할 수 있다. 시작 오버레이를 없애지 않는다.
10. `innerHTML`을 쓰지 않는다.
11. 버튼 4개가 좁은 창에서 🎲·📜와 겹치지 않게 `.actions`는 `flex-wrap` + `max-width: calc(100vw - 256px)`.
12. 화면을 자동으로 확인할 때, 브라우저 창이 가려져 있으면 rAF와 `Timer`가 멈춰 검은 화면이 찍힌다. 창이 보이는 상태에서 확인한다.

## 15. 다 됐는지 확인

- `pnpm test` 통과, `pnpm build` 성공(번들 약 757KB, gzip 약 216KB. three가 대부분이라 500KB 경고는 정상).
- `🔥 불 피우기`를 누르면 장작과 풀벌레 소리가 나고, 4분 넘게 틀어도 이음새에서 끊기지 않는다.
- 탭을 숨겼다가 돌아와도 소리가 이어지고, 쿨타임·마시멜로·오로라 시간이 실제 시간만큼 흘러 있다.
- 장작: 누른 뒤 버튼이 `(10:00 후)`부터 줄어든다. 새로고침해도 유지된다.
- 소원: 등록 후 버튼이 `(3:00:00 후)`부터 줄어들고 📜에 보인다.
- 오로라: 세 번째 색은 눌리지 않고, 넣으면 버튼이 `(00:30)`부터 줄어들며 불꽃 가장자리만 색이 든다. 30초 뒤 색이 완전히 사라진다.
- 🎲를 누르면 이름표와 옷·모자가 바뀌고 새로고침해도 유지된다.
- 창을 세로로 좁혀도 불과 캠퍼가 화면 안에 있다.

## 16. 배포

`dist/` 폴더를 아무 정적 호스팅에 올리면 된다. `base: './'`라서 하위 경로에서도 동작한다. `public/audio/*.m4a` 두 파일이 `dist/audio/`에 함께 나가는지 확인한다. 서버 설정, 환경 변수, 비밀 값은 없다.
