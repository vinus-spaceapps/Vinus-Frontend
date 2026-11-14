# vintage-detective

Wine climate trend detective - NASA Space Apps Challenge 2026 (Be An Earth System Trend Detective!)

와인 생산자가 NASA 위성·모델 데이터로 **우리 산지의 기후 변화가 우연이 아닌지** 확인하는 웹 툴의 프론트엔드입니다.
흐름: 랜딩 → ① 변수 고르기 → ② 지역 설정 → ③ 분석 (+ AI 패널 두 곳)

## 실행

백엔드([Vinus-Backend](https://github.com/vinus-spaceapps/Vinus-Backend))를 먼저 8000번 포트로 켭니다.

```bash
npm install
npm run dev        # http://localhost:5173  (/api 요청은 8000번으로 프록시)
npm run build      # CI와 같은 타입 검사 + 빌드
```

배포할 때는 `.env.example`을 참고해 `VITE_API_URL`에 백엔드 주소를 넣습니다.

## 화면

| 경로 | 화면 | 핵심 |
|---|---|---|
| `/` | 랜딩 | 헤드라인, 3단계 설명, 시연 예시 카드 3개 (누르면 분석 페이지로 바로) |
| `/variables` | ① 변수 고르기 | 카테고리 탭, 카드 hover 소개, 분석 바구니(최대 3), 변수 담기 AI |
| `/region` | ② 지역 설정 | 지도·검색, 연도 범위, 데이터 시작 연도 안내, (선택) 생육 단계 날짜 |
| `/analyze?v=..&r=..&s=..&e=..` | ③ 분석 | 요약 칩(바로 수정), 산지 추세 지도, 그래프+추세선, 판정 카드, 내 기록 겹치기, 인사이트 AI |

분석 페이지는 URL이 상태라서 링크를 그대로 공유하거나 시연에 쓸 수 있습니다.
예: `/analyze?v=harvest_smoke_days&r=rogue_valley&s=2003&e=2025&t=harvest_smoke_days:2`

## 구조

```
src/
  App.tsx                헤더(진행 단계·AI 상태)와 라우트
  pages/                 Landing, VariablePicker, RegionSetup, Analysis
  components/            ChatPanel, VariableCard, RegionMap, TrendChart, VerdictCard, InsightPanel
  lib/api.ts             백엔드 호출
  lib/types.ts           응답 타입
  lib/catalog.tsx        변수·산지·AI 상태 (앱 시작 때 1회)
  lib/selection.tsx      바구니·지역·기간 선택 상태, 분석 URL 변환
```

- 차트: Recharts, 지도: Leaflet + OpenStreetMap 타일
- 지금 결과는 백엔드의 예시 데이터(목업)라 화면에 "예시 데이터" 배지가 붙습니다.
