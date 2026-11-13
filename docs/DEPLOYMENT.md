# GitHub master 자동 배포

`master` push → Node 24/pnpm 설치 → 테스트 → 빌드 → S3 업로드 → CloudFront 캐시 무효화 완료 대기 순서입니다. `main` push는 배포하지 않습니다. 수동 실행도 master를 선택해야 합니다.

대상은 서울 리전(ap-northeast-2)의 S3 `fire-meong` 버킷 루트와 CloudFront `E3EYSTS6TN32K0`입니다. 이 워크플로는 기존 버킷/배포를 생성하거나 그 정책을 변경하지 않습니다.

## 현재 연결

배포 Role은 AWS 콘솔에서 수동 생성한 `fire-meong-github-deploy`를 사용합니다. GitHub 저장소 변수 `AWS_ROLE_ARN`과 `AWS_ACCOUNT_ID`로 연결합니다. 아래 CloudFormation은 새 환경을 구성할 때 선택할 수 있는 대안이며, 수동 생성한 Role이 있는 현재 환경에서는 추가로 실행하지 않습니다.

## 1. AWS에 배포 Role 생성 (새 환경에서만)

1. 서울 리전 AWS 콘솔에서 **CloudFormation → 스택 생성 → 새 리소스 사용(표준)** 을 엽니다.
2. **템플릿 파일 업로드**로 이 저장소의 `infra/github-deploy.yaml` 파일을 선택합니다.
3. 스택 이름은 `fire-meong-github-deploy`로 입력합니다.
4. `ExistingOidcProviderArn`은 IAM → 자격 증명 공급자에 `token.actions.githubusercontent.com`이 없으면 비웁니다. 이미 있다면 해당 공급자의 ARN을 복사합니다. 공급자를 중복 생성하지 않습니다.
5. 검토 화면에서 IAM 리소스 생성 확인 항목을 체크하고 스택을 생성합니다. 이 작업은 GitHub의 이 저장소 master에 AWS 배포 권한을 부여합니다.
6. `CREATE_COMPLETE`가 되면 **출력(Outputs) → DeploymentRoleArn** 값을 복사합니다.

이 Role은 `repo:hyukhogwon/fire-meong:ref:refs/heads/master`만 신뢰합니다. 권한은 해당 버킷 조회·파일 업로드와 해당 CF 배포의 invalidation 생성·상태 조회입니다. 삭제, ACL 변경, 다른 리소스 관리는 허용하지 않습니다. 액세스 키는 필요하지 않습니다.

## 2. GitHub 변수 설정

저장소 **Settings → Secrets and variables → Actions → Variables → New repository variable** 에 다음을 추가합니다.

| 이름           | 값                                                 |
| -------------- | -------------------------------------------------- |
| AWS_ROLE_ARN   | CloudFormation 출력의 DeploymentRoleArn            |
| AWS_ACCOUNT_ID | AWS 12자리 계정 ID (선택, 인증된 계정 일치 확인용) |

Role ARN은 비밀번호가 아니며 저장소 변수로 관리합니다. `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`는 사용하지 않습니다. GitHub Environment를 추가하면 OIDC sub가 달라지므로 Role 신뢰 정책도 함께 바꿔야 합니다.

## 3. master와 첫 배포

현재 배포 브랜치와 기본 브랜치는 master를 사용합니다. 새 환경에서 Role ARN을 연결한 후 다음 명령으로 master를 생성할 수 있습니다.

```sh
git switch -c master
git push -u origin master
```

이미 master가 있다면 그 브랜치를 체크아웃하고 변경을 병합해서 push합니다. 기본 브랜치도 master로 사용할 경우 GitHub 저장소 Settings에서 기본 브랜치를 master로 변경합니다. main은 자동으로 삭제하지 않습니다.

Actions의 **Deploy to S3 and CloudFront** 실행이 성공하면 새 배포가 반영됩니다. 실패 시 각 단계 로그에서 설치/테스트/빌드/AWS 인증/S3/캐시 갱신 중 어느 단계인지 확인할 수 있습니다.

## 캐시와 기존 AWS 설정

- 해시가 있는 `assets/*`는 1년 immutable 캐시로 먼저 올립니다.
- 고정 이름인 음원과 public 파일은 5분 캐시로 올립니다.
- `index.html`은 마지막에 올리고 매번 재검증하도록 설정합니다.
- CloudFront `/*` invalidation 완료까지 기다립니다. 기존 배포가 같은 CF를 공유하면 전체 캐시가 함께 갱신됩니다.
- S3의 오래된 파일은 삭제하지 않으므로 이전 페이지가 참조하는 해시 파일도 유지됩니다. 버킷 루트의 같은 이름 파일은 덮어씁니다. 다른 앱이 같은 경로를 쓰면 배포 전에 전용 prefix로 수정해야 합니다.
- CF Default root object가 `index.html`이고 S3 원본이 해당 버킷 루트를 향하는지 확인합니다. 비공개 S3라면 기존 OAC와 버킷 정책이 CF 읽기를 허용해야 합니다.
- index 경로의 CloudFront 캐시 정책은 Minimum TTL=0이어야 Cache-Control 재검증 지시를 존중합니다. 버킷의 기본 암호화가 고객 관리 KMS 키라면 Role에 해당 키의 업로드용 KMS 권한이 별도로 필요합니다.
- 이 앱에는 클라이언트 라우팅이 없으므로 SPA 에러 페이지 재작성은 필요하지 않습니다.

공식 문서: [GitHub OIDC와 AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws), [CloudFormation OIDC Provider](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-oidcprovider.html), [CloudFront 캐시](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).
