# 포트폴리오 백엔드

프론트엔드(`../frontend`)의 연락처 폼을 받기 위한 Node.js + Express API 서버입니다.
**아직 실제 데이터베이스는 연결되어 있지 않습니다.** 지금은 제출된 메시지를 로컬 JSON
파일(`backend/data/messages.local.json`, git에는 커밋되지 않음)에 임시로 저장하고,
나중에 DB를 붙이면 코드 한 곳(`src/db/index.js`)만 바꿔서 교체할 수 있도록 구성했습니다.

## 폴더 구조

```
backend/
├── src/
│   ├── server.js       # 앱 진입점 (Express 설정, 라우터 연결)
│   ├── config.js        # 환경 변수를 한 곳에서 읽는 설정 모듈
│   ├── db/
│   │   └── index.js     # 데이터 저장 계층 (지금은 로컬 파일, 나중에 실제 DB로 교체)
│   └── routes/
│       └── contact.js   # POST /api/contact
├── .env.example          # 필요한 환경 변수 목록 (복사해서 .env로 사용)
├── package.json
└── README.md
```

## 실행 방법

Node.js가 설치되어 있어야 합니다 (18 버전 이상 권장).

```bash
cd backend
npm install
cp .env.example .env
npm start        # http://localhost:4000
# 또는 파일 변경 시 자동 재시작: npm run dev
```

정상적으로 뜨면 `GET http://localhost:4000/api/health` 요청 시 아래처럼 응답합니다.

```json
{ "status": "ok", "databaseConnected": false }
```

## 나중에 데이터베이스를 연결하려면

1. 원하는 DB(PostgreSQL, MySQL 등)를 준비하고 `.env`의 `DATABASE_URL`을 채웁니다.
2. `src/db/index.js`의 `saveContactMessage()` 안에 있는 "DB 미연결" 분기를 실제 DB
   드라이버 연결 + INSERT 로직으로 교체합니다 (파일 안에 PostgreSQL 예시 주석이 있습니다).
3. `routes/contact.js`나 프론트엔드 코드는 전혀 건드릴 필요가 없습니다 — 저장 방식은
   `db/index.js` 뒤에 숨겨져 있기 때문입니다.

## 다른 프로그램/서비스를 연결하려면

- 새 엔드포인트가 필요하면 `src/routes/`에 라우터 파일을 추가하고 `server.js`에서
  `app.use('/api', ...)`로 연결하면 됩니다.
- 환경 변수가 늘어나면 `config.js`에만 추가하면, 다른 코드는 `require('./config')`로
  가져다 쓰기만 하면 됩니다.

## 프론트엔드 연결

프론트엔드(`frontend/script.js`)는 이 서버가 켜져 있으면 연락처 폼 제출 시
`POST /api/contact`로 실제 데이터를 보내고, 서버가 꺼져 있거나 응답이 없으면
기존처럼 화면상 성공 메시지만 보여주는 방식으로 동작합니다 (배포된 정적 사이트가
백엔드 없이도 깨지지 않도록 하기 위함입니다).
