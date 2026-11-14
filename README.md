# vintage-detective

Wine climate trend detective - NASA Space Apps Challenge 2026 (Be An Earth System Trend Detective!)

와인 생산자가 NASA 위성·모델 데이터로 **우리 산지의 기후 변화가 우연이 아닌지** 확인하는 웹 툴의 프론트엔드입니다.
흐름: 첫 화면 → ① 변수 고르기 → ② 산지·기간 → ③ 결과 (+ AI 패널 두 곳)

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # CI와 같은 타입 검사 + 빌드
```

백엔드는 둘 중 하나를 씁니다.

- 로컬: [Vinus-Backend](https://github.com/vinus-spaceapps/Vinus-Backend)를 8000번 포트로 켜면 `/api` 요청이 vite 프록시로 넘어갑니다.
- 실서버: `.env.local`에 `VITE_API_URL=https://vinus-backend-production.up.railway.app` (AI 켜짐). `.env.*`는 커밋되지 않습니다.

배포할 때도 `.env.example`을 참고해 `VITE_API_URL`에 백엔드 주소를 넣습니다.

## 화면

| 경로 | 화면 | 핵심 |
|---|---|---|
| `/` | 첫 화면 | 실제 값 기후 줄무늬 배경, 계산 4단계와 결과 미리 보기, 산지 7곳 좌표, 지표 묶음 4가지, 예시 분석 3개, 자주 묻는 질문 |
| `/variables` | ① 변수 고르기 | 지표 949개 검색, 묶음·카테고리 칩, 핵심 지표는 카드(마우스를 올리면 정의), 나머지는 목록 + 더 보기, 고른 변수 바(최대 3), 변수 추천 AI |
| `/region` | ② 산지·기간 | 산지 7곳 목록과 어두운 지도(점선 네모 = 분석 범위), 2001–2026 기간, (선택) 생육 단계 날짜 |
| `/analyze?v=..&r=..&s=..&e=..` | ③ 결과 | 지표 줄무늬 머리, 판정 문장, 핵심 숫자 4개, 연도별 값 + 추세선, 검정 상세, 산지별 비교, 해마다 값, 판정 분포, 지도, 관측소·위성 검증, 내 기록 겹치기, 인사이트 AI |

결과 페이지는 URL이 상태라서 링크를 그대로 공유하거나 시연에 쓸 수 있습니다.
예: `/analyze?v=hot_humid_days,tropical_nights&r=yeongdong&s=2001&e=2026`

## 구조

```
src/
  App.tsx                라우트, 하위 화면 왼쪽 위 로고(처음으로)
  pages/                 Landing, VariablePicker, RegionSetup, Analysis
  components/            DashCards(결과 카드들), TrendChart, VerdictCard, RegionMap, Stripes(기후 줄무늬),
                         VariableCard, ChatPanel, InsightPanel, Icon
  lib/api.ts             백엔드 호출
  lib/types.ts           응답 타입 (지표 묶음, 산지 bbox, 관측소·위성 검증 포함)
  lib/catalog.tsx        지표·묶음·산지·AI 상태 (앱 시작 때 1회)
  lib/selection.tsx      고른 변수·산지·기간, 결과 URL 변환
  theme.ts               그래프용 색 토큰
  tone.ts                판정 → 데이터 색 (나빠짐·좋아짐·엇갈림·뚜렷하지 않음)
  styles.css             디자인 토큰과 전체 스타일
```

- 화면: 어두운 테마 하나(#121212 바탕, 장미색 #F399B3), 글꼴은 Pretendard 하나, 버튼 6px 모서리. 공식 로고는 어두운 바탕용 장미·흰색으로 씀
- 그림은 장식 대신 실제 값: 기후 줄무늬(한 줄 = 한 해, 밝을수록 값이 큰 해), 예시 카드 막대, 산지 좌표
- 차트: Recharts, 지도: Leaflet + Esri 다크 그레이 베이스맵(키 불필요)
- 결과는 실제 자료(2001–2026)입니다. 연기 지표 2개(AIRS·OMI)만 아직 예시 값이라 화면에 "예시 데이터"가 붙습니다.
- 움직임 줄이기·투명 줄이기·대비 높이기 설정과 터치(누를 곳 44px)를 따릅니다.
