# 협업 규칙

프론트와 백엔드는 레포가 나뉘어 있습니다. 이 레포는 **frontend** 입니다.
(프론트: [Vinus-Frontend](https://github.com/vinus-spaceapps/Vinus-Frontend) · 백엔드: [Vinus-Backend](https://github.com/vinus-spaceapps/Vinus-Backend))

| 대상 | 형식 | 예 |
|---|---|---|
| 이슈 제목 | 설명만 (레포가 이미 영역을 나눔) | `조립기 계산 API 구현` |
| 라벨 | 타입 1개 | `Feat` |
| 브랜치 | `type/이슈번호-설명` (소문자) | `feat/3-assembler-api` |
| 커밋 | `Type: 설명` | `Feat: 연도별 집계 함수 추가` |
| PR 제목 | `Type: 설명` (범위를 적고 싶으면 `Type(범위): 설명`) | `Feat: 조립기 계산 API 구현` |

Type: `Feat` `Fix` `Refactor` `Chore` `Docs` `Test`

## 작업 순서

1. 이슈를 만듭니다(템플릿 선택, 라벨·Assignee 지정).
2. 최신 `develop`에서 이슈 번호로 브랜치를 땁니다.
3. `develop`으로 PR을 올리고 본문에 `close #이슈번호`를 적습니다.

## 머지

| 방향 | 방식 | 승인 | 필수 체크 |
|---|---|---|---|
| 작업 브랜치 → `develop` | Squash | 0명 | `ci-frontend` `pr-title` |
| `develop` → `main` | Merge commit | 0명 | 위 2개 + `main-source` |

- 해커톤(48시간)이라 승인은 0명으로 둡니다. 대신 CI 가 통과해야 머지됩니다.
- 급한 수정은 레포 관리자(Admin)가 규칙을 우회할 수 있습니다.
- 필수 체크 워크플로에는 `paths` 필터를 걸지 않습니다. 걸면 체크가 "대기 중"으로 남아 머지가 막힙니다.
- 시크릿(API 키, Earthdata 비밀번호)은 절대 커밋하지 않습니다. `.env` 는 `.gitignore` 에 들어 있습니다.
