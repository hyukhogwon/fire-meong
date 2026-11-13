# 불멍

React로 구현한 1인용 캠프파이어. 별 아래의 캠퍼와 골든 리트리버, 연못, 장작과 풀벌레 소리가 있는 정적 웹 앱입니다.

## 실행

Node.js 24 이상과 Corepack을 사용합니다.

```sh
corepack enable
pnpm install
pnpm dev
```

브라우저에서 http://127.0.0.1:5173 을 열고 **불 피우기**를 누르세요.

```sh
pnpm test
pnpm build
pnpm preview
```

`dist/`를 정적 호스팅에 올리면 됩니다. Vite `base: './'`를 사용해 하위 경로에서도 실행됩니다. 로그인·서버·DB가 없습니다.

## 구성

- React 19.3.1, Vite 8.3.8, TypeScript 7.0.2, Three.js 0.187.0, pnpm 12.18.0.
- `src/App.tsx`: React 컨트롤, 모달, 저장 상태와 오디오/장면 연결.
- `src/scene`: 셰이더와 절차적 3D 장면. 천문 목록 5,044개 사용.
- `src/core`: 쿨타임, 신원, 소원, 볼륨, 천문 계산 등 DOM과 분리된 로직.
- `src/audio`: Web Audio API, 3초 동일 파워 크로스페이드, 두 회차 선예약, 리미터 및 장작 부스트.

장작은 10분, 소원은 3시간 쿨타임이며 새로고침 후에도 유지됩니다. 마시멜로는 60초, 오로라는 30초 지속합니다. 이름·모습, 볼륨과 소원 기록은 localStorage에 저장됩니다. 저장소를 사용할 수 없으면 현재 세션 메모리로 동작합니다.

## 에셋과 음질

현재 포함된 음원은 Freesound **HQ MP3 미리듣기**입니다. 원본 WAV/AIFF를 게인·리미터로 인코딩한 음원과 같은 음질이라고 보장하지 않습니다. `CREDITS.md`에 출처가 있습니다. 음원과 별 데이터가 저장소에 포함되어 실행 중 외부 서비스에 연결할 필요가 없습니다.

원본 음원을 확보했다면 `assets/raw/729396__heckfricker__campfire-02.wav`와 `assets/raw/333221__hdfreema__night-crickets-back-porch.aiff`로 저장하고, ffmpeg와 Python/numpy가 있는 환경에서 `pnpm encode-audio`를 실행하세요. 원본 파일은 Git에서 제외됩니다. 생성된 M4A를 사용하려면 `.env.local`에 `VITE_AUDIO_FORMAT=m4a`를 넣고 다시 빌드합니다. 기본은 포함된 MP3입니다. 장작에 `loudnorm`을 사용하지 않습니다.

## 검증

`pnpm test`로 코어 계약과 손상된 저장 데이터 복구를 검사합니다. `pnpm build`는 strict TypeScript 검사 후 배포 파일을 생성합니다.

`scripts/browser-check.mjs`, `audio-recovery-check.mjs`, `long-audio-check.mjs`, `storage-recovery-check.mjs`, `subpath-check.mjs`는 Playwright 기반 통합 확인용입니다. 먼저 `pnpm dev`를 실행하세요. 브라우저 경로는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` 환경변수로 지정하거나, `pnpm exec playwright install chromium`으로 기본 브라우저를 설치할 수 있습니다. 긴 테스트는 `pnpm preview --port 4173` 서버에서 실행하며 약 4분 35초가 걸립니다. 이는 오디오 시계와 루프 예약의 연속성을 검사합니다. Headless Chromium은 다른 탭을 열어도 문서를 visible로 유지할 수 있으므로 실제 백그라운드 탭 제한과 사람의 청취에 의한 음질 판정은 별도로 확인해야 합니다.

데스크톱용이며 WebGL과 Web Audio 지원 브라우저가 필요합니다. 운영체제 절전이나 브라우저에 의한 탭 폐기는 오디오를 중단할 수 있으며, 재개 버튼으로 복구할 수 있습니다.

자동 배포 구성과 최초 AWS Role 생성 방법은 [배포 안내](docs/DEPLOYMENT.md)를 참고하세요. master push에서 S3와 CloudFront로 배포합니다.

## 모바일 오디오

Audio Session API를 지원하는 브라우저에서는 불 피우기를 누르는 사용자 동작 안에서 `navigator.audioSession.type = 'playback'`을 요청합니다. Web Audio가 일반 미디어 재생으로 처리되도록 지정하며, 종료와 초기화 실패 시 이전 세션으로 복원합니다. API 미지원/설정 거절 시 기존 재생 경로를 유지합니다.

이 설정은 무음 모드 및 화면 잠금 중 재생을 개선하기 위한 것이며, OS 버전·브라우저·앱 내 WebView·절전 정책에 따른 동작을 보장하지 않습니다. 실기기에서 무음 상태 시작, 홈 화면 전환, 화면 잠금 후 5분 이상 재생, 전화/다른 미디어 후 복귀를 확인해야 합니다. Chromium 에뮬레이션은 iOS의 오디오 정책을 재현하지 못합니다.
