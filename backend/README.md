# 포트폴리오 백엔드

프론트엔드(`../frontend`)의 연락처 폼과 관리자 페이지(`../frontend/admin.html`)를
위한 Node.js + Express API 서버입니다.
**아직 실제 데이터베이스는 연결되어 있지 않습니다.** 지금은 데이터를 로컬 JSON
파일(`backend/data/*.local.json`, git에는 커밋되지 않음)에 임시로 저장하고,
나중에 DB를 붙이면 코드 한 곳(`src/db/index.js`)만 바꿔서 교체할 수 있도록 구성했습니다.

## 폴더 구조

```
backend/
├── src/
│   ├── server.js            # 앱 진입점 (Express 설정, 라우터 연결)
│   ├── config.js            # 환경 변수를 한 곳에서 읽는 설정 모듈
│   ├── auth.js              # 관리자 로그인 세션(JWT + httpOnly 쿠키) 처리
│   ├── db/
│   │   └── index.js         # 데이터 저장 계층 (지금은 로컬 파일, 나중에 실제 DB로 교체)
│   ├── routes/
│   │   ├── contact.js       # POST /api/contact (공개)
│   │   ├── projects.js      # GET  /api/projects (공개, 공개 상태 프로젝트만)
│   │   ├── adminAuth.js     # POST /api/admin/login, /logout, GET /session
│   │   └── adminProjects.js # /api/admin/projects (전체 CRUD, 로그인 필요)
│   └── scripts/
│       └── hashPassword.js  # 관리자 비밀번호 해시 생성 도구
├── .env.example              # 필요한 환경 변수 목록 (복사해서 .env로 사용)
├── package.json
└── README.md
```

## 실행 방법

Node.js가 설치되어 있어야 합니다 (18 버전 이상 권장).

```bash
cd backend
npm install
cp .env.example .env

# 관리자 비밀번호 해시 생성 (원하는 비밀번호로 바꿔서 실행)
npm run hash-password -- "원하는비밀번호"
# 출력된 값을 .env의 ADMIN_PASSWORD_HASH에 붙여넣고,
# JWT_SECRET도 아무 임의의 긴 문자열로 바꿔주세요.

npm start        # http://localhost:4000
# 또는 파일 변경 시 자동 재시작: npm run dev
```

정상적으로 뜨면 `GET http://localhost:4000/api/health` 요청 시 아래처럼 응답합니다.

```json
{ "status": "ok", "databaseConnected": false }
```

## 관리자 페이지 (`frontend/admin.html`)

> ⚠️ 로그인 쿠키가 정상적으로 오가려면 `admin.html`을 파일 더블클릭(`file://`)이
> 아니라 로컬 서버로 열어야 합니다: `cd frontend && python -m http.server 8000` 후
> `http://localhost:8000/admin.html` 접속. 이때 백엔드 `.env`의 `CORS_ORIGIN`이
> 이 주소(`http://localhost:8000`)와 정확히 일치해야 합니다.

- `frontend/admin.html`을 열면 비밀번호 로그인 화면이 먼저 뜹니다. `.env`에 설정한
  비밀번호를 입력하면 프로젝트 목록/등록/수정/삭제 화면으로 넘어갑니다.
- **비밀번호는 절대 원문으로 저장하지 않습니다.** `.env`에는 bcrypt 해시만 저장하고,
  로그인 성공 시 서버가 서명한 JWT를 httpOnly 쿠키로 내려줍니다. 프론트엔드 JS는
  이 토큰 값을 읽거나 저장할 수 없습니다 (httpOnly). `.env`는 `.gitignore`에 포함되어
  있어 git 이력 어디에도 올라간 적이 없습니다.
- **로그인 시도 횟수 제한**: 같은 IP에서 10분 안에 비밀번호를 5번 연속 틀리면
  이후 로그인 요청 자체를 429로 막습니다 (`src/loginRateLimiter.js`, 메모리 기반).
  성공적으로 로그인하면 카운트가 초기화되므로 평소 사용에는 영향이 없습니다.
  짧은 숫자 비밀번호도 무차별 대입으로 뚫리지 않도록 하기 위한 최소한의 장치입니다.
  (리버스 프록시 뒤에 배포한다면 `req.ip`가 프록시 주소로 잡히지 않도록
  `app.set('trust proxy', ...)` 설정이 별도로 필요할 수 있습니다.)
- 프로젝트 항목: 제목 / 내가 한 역할 / 설명 / 날짜 / 참여인원 수 / 참고사항(선택).
- 상태는 **초안**(나만 볼 수 있음, 빈 항목 허용) / **공개**(사이트에 표시됨, 참고사항
  제외 전부 필수)로 나뉘며, 이 규칙은 프론트엔드와 백엔드 양쪽에서 모두 검증합니다
  (백엔드 쪽 검증이 최종 기준입니다).
- 공개(published) 상태인 프로젝트만 `GET /api/projects`로 노출되어 실제 포트폴리오
  사이트(`index.html`)의 프로젝트 목록에 자동으로 표시됩니다.

### API 요약

| 메서드 | 경로 | 인증 | 설명 |
| --- | --- | --- | --- |
| GET | `/api/health` | - | 서버/DB 연결 상태 확인 |
| POST | `/api/contact` | - | 연락처 폼 제출 |
| GET | `/api/projects` | - | 공개된 프로젝트 목록 (사이트에서 사용) |
| POST | `/api/admin/login` | - | 관리자 로그인 (비밀번호) |
| POST | `/api/admin/logout` | - | 로그아웃 |
| GET | `/api/admin/session` | ✅ | 로그인 상태 확인 |
| GET | `/api/admin/projects` | ✅ | 초안 포함 전체 프로젝트 목록 |
| GET/POST/PUT/DELETE | `/api/admin/projects[/:id]` | ✅ | 프로젝트 조회/등록/수정/삭제 |

## 나중에 데이터베이스를 연결하려면

1. 원하는 DB(PostgreSQL, MySQL 등)를 준비하고 `.env`의 `DATABASE_URL`을 채웁니다.
2. `src/db/index.js`의 각 함수 안에 있는 "DB 미연결" 분기(`isDatabaseConnected()`가
   true일 때)를 실제 DB 드라이버 연결 + 쿼리로 교체합니다 (PostgreSQL 예시 주석 포함).
3. `routes/*.js`나 프론트엔드 코드는 전혀 건드릴 필요가 없습니다 — 저장 방식은
   `db/index.js` 뒤에 숨겨져 있기 때문입니다.

## 다른 프로그램/서비스를 연결하려면

- 새 엔드포인트가 필요하면 `src/routes/`에 라우터 파일을 추가하고 `server.js`에서
  연결하면 됩니다.
- 환경 변수가 늘어나면 `config.js`에만 추가하면, 다른 코드는 `require('./config')`로
  가져다 쓰기만 하면 됩니다.

## 프론트엔드 연결

- 연락처 폼(`frontend/script.js`)은 이 서버가 켜져 있으면 실제로 `POST /api/contact`를
  호출하고, 꺼져 있으면 기존처럼 화면상 성공 메시지만 보여주는 방식으로 폴백합니다.
- 프로젝트 목록(`frontend/script.js`)도 마찬가지로 서버가 켜져 있을 때만
  `GET /api/projects` 결과를 카드로 추가하고, 꺼져 있으면 조용히 건너뜁니다.
- 즉, 배포된 정적 사이트는 백엔드 없이도 항상 깨지지 않고 정상 동작합니다.
