# S3 / CloudFront 자동 배포 구현 계획

목표: master 푸시에서 검증 후 fire-meong 버킷(ap-northeast-2)에 업로드하고 E3EYSTS6TN32K0 캐시를 갱신한다.
구조: 빌드 job과 배포 job을 나누고, 배포 job만 OIDC 권한을 갖는다. 배포는 직렬화하며 기존 S3 파일을 삭제하지 않는다. 해시 assets는 장기 캐시, index.html은 재검증을 요구하고 마지막에 업로드한다.
인증: CloudFormation으로 GitHub OIDC와 master 전용 Role을 준비한다. 이미 OIDC Provider가 있으면 ARN을 재사용한다. AWS 리소스 생성은 사용자가 콘솔에서 수행한다.

1. 공식 액션 최신 릴리스와 AWS/GitHub OIDC 계약 확인.
2. `.github/workflows/deploy.yml`: pnpm 고정 설치, Node 24, frozen lockfile, test/build, artifact 전달, OIDC, S3, invalidation 완료 대기.
3. `infra/github-deploy.yaml`: 단일 저장소 master 신뢰, 단일 S3 버킷 업로드, 단일 CF 배포 invalidation 권한. Role ARN 출력.
4. `docs/DEPLOYMENT.md`: 콘솔 생성, GitHub 변수 및 캐시 정책 안내.
5. YAML 구문 검사와 애플리케이션 테스트/빌드.
6. GitHub main에 설정 게시. Role ARN 확보 후 master 배포 브랜치 생성 및 실제 Actions 배포 확인.
