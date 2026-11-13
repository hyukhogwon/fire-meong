# 불멍 React 구현 계획

목표: REBUILD.md의 장면과 동작을 React UI로 재현한다.
구조: React는 UI와 사용자 상태를 관리하고, Three Stage는 ref로 연결한다. 오디오는 React 렌더링과 분리한 Web Audio 서비스로 실행한다.
스택: Node 24+, pnpm, React, Vite, TypeScript, Three.js, Vitest.

1. 최신 안정 패키지 설치, 상대 base와 strict TypeScript 설정.
2. 순수 로직의 쿨타임, 저장 실패, 소원 검증, 효과 종료 및 오디오 예약 테스트를 먼저 작성하고 실패 확인.
3. 문서의 장면 및 천문 코드 추출, 코어 계약 구현.
4. 미리듣기 CC0 음원 및 BSD 별 데이터 확보, 출처/라이선스 기록.
5. Web Audio 크로스페이드 서비스와 복구 처리 구현.
6. React 액션, 접근 가능한 dialog, 저장 상태, 시작 오버레이 연결.
7. 단위 테스트, 빌드, 브라우저 동작 및 장면 확인. 사용 방법과 제한 기록.
