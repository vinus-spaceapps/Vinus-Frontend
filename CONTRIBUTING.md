# 협업 규칙

Vinus 팀(NASA Space Apps Challenge 2026 Seoul)의 Git·GitHub 작업 규칙입니다.
프론트와 백엔드는 레포가 나뉘어 있고, 이 레포는 **frontend** 입니다.
([Vinus-Frontend](https://github.com/vinus-spaceapps/Vinus-Frontend) · [Vinus-Backend](https://github.com/vinus-spaceapps/Vinus-Backend))

## 한눈에 보기

| 대상 | 형식 | 예 |
|---|---|---|
| 이슈 제목 | 설명만 (레포가 이미 영역을 나눔) | `판정 카드 화면 구현` |
| 라벨 | 타입 1개 | `Feat` |
| 브랜치 | `type/이슈번호-설명` (소문자, 하이픈) | `feat/3-verdict-card` |
| 커밋 | `Type: 설명` | `Feat: 판정 카드 컴포넌트 추가` |
| PR 제목 | `Type: 설명` (범위를 적고 싶으면 `Type(범위): 설명`) | `Feat: 판정 카드 화면 구현` |

Type 은 아래 6개만 씁니다. 라벨 이름도 같습니다.

| Type | 언제 |
|---|---|
| `Feat` | 새 기능 |
| `Fix` | 버그 수정 |
| `Refactor` | 동작은 그대로, 구조만 개선 |
| `Chore` | 빌드·설정·의존성 |
| `Docs` | 문서 |
| `Test` | 테스트 |

## 브랜치 전략

- 브랜치는 **`main` 하나**만 씁니다. `develop` 은 없습니다.
- 모든 작업은 `main` 에서 브랜치를 따서 **PR 로 `main` 에 머지**합니다.
- `main` 은 보호되어 있어서 직접 push, force push, 브랜치 삭제가 막혀 있습니다.

```
main ──●───────────●───────────●──→
        \         / \         /
         feat/3-…─┘   fix/7-…─┘      (squash 머지 후 자동 삭제)
```

## 작업 순서 (복붙용)

### 1. 이슈 만들기

GitHub → Issues → New issue → 템플릿(Feature / Bug / Task) 선택 → 라벨·Assignee 지정.
이슈 번호(예: `#3`)를 기억해 둡니다.

### 2. 최신 main 에서 브랜치 따기

```bash
git switch main
git pull origin main
git switch -c feat/3-verdict-card
```

### 3. 작업하고 커밋

```bash
git add .
git commit -m "Feat: 판정 카드 컴포넌트 추가"
```

커밋은 작게 여러 번 해도 됩니다. 머지할 때 하나로 합쳐집니다(squash).

### 4. push 하고 PR 올리기

```bash
git push -u origin feat/3-verdict-card
```

push 하면 터미널이나 GitHub 화면에 PR 만들기 링크가 뜹니다.

- base: `main` ← compare: 내 브랜치
- 제목: `Feat: 판정 카드 화면 구현` (형식이 틀리면 `pr-title` 체크가 실패합니다)
- 본문: 템플릿대로 쓰고 `close #3` 처럼 이슈 번호를 적습니다. 머지되면 이슈가 자동으로 닫힙니다.
- 오른쪽에서 Assignee 와 라벨을 지정합니다.

### 5. 체크 통과 확인 후 머지

PR 아래에 체크 2개가 돕니다.

| 체크 | 하는 일 | 실패하면 |
|---|---|---|
| `ci-frontend` | lint(있으면)와 build | Details 로그를 보고 고쳐서 다시 push |
| `pr-title` | PR 제목 형식 검사 | PR 제목만 고치면 자동으로 다시 검사 |

둘 다 초록색이 되면 **Squash and merge** 를 누릅니다. 승인(리뷰)은 필요 없습니다.
머지 커밋 메시지는 PR 제목이 그대로 들어갑니다. 머지된 원격 브랜치는 자동으로 삭제됩니다.

### 6. 로컬 정리

```bash
git switch main
git pull origin main
git branch -d feat/3-verdict-card
```

## 자주 생기는 상황

**PR 에 충돌(conflict)이 났어요**

```bash
git switch feat/3-verdict-card
git pull origin main        # 충돌 파일을 열어서 고친 뒤
git add .
git commit -m "Fix: main 충돌 해결"
git push
```

**main 에 직접 push 했더니 거절됐어요**

정상입니다. 브랜치를 따서 PR 로 올리세요. 이미 main 에서 커밋했다면:

```bash
git switch -c feat/3-verdict-card    # 지금 커밋을 그대로 들고 새 브랜치로
git push -u origin feat/3-verdict-card
git branch -f main origin/main   # 로컬 main 은 원격과 맞춰 둠
```

**급해서 규칙을 건너뛰어야 해요**

레포 관리자(Admin)는 보호 규칙을 우회할 수 있습니다. 관리자에게 요청하세요. 그래도 가능하면 PR 로 올립니다.

## 하지 말 것

- 시크릿(Earthdata 비밀번호, LLM API 키 등)을 커밋하지 않습니다. `.env` 는 `.gitignore` 에 들어 있고, 공유가 필요하면 `.env.example` 에 키 이름만 적습니다.
- `git push --force` 를 쓰지 않습니다. 남이 볼 브랜치라면 특히.
- 필수 체크 워크플로(`ci-frontend`, `pr-title`)에 `paths` 필터를 걸지 않습니다. 걸면 체크가 "대기 중"으로 남아 머지가 막힙니다.

## 레포 설정 (참고)

| 항목 | 설정 |
|---|---|
| 기본 브랜치 | `main` |
| 머지 방식 | Squash 만 허용, 커밋 메시지 = PR 제목 |
| 머지 후 브랜치 | 자동 삭제 |
| `main` 보호 (룰셋 `protect-main`) | PR 필수(승인 0명), 필수 체크 `ci-frontend` `pr-title`, 삭제·force push 금지, Admin 우회 가능 |
