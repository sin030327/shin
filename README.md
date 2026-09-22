# 신재훈 | Portfolio (Monorepo)

프론트엔드와 백엔드를 분리한 구조입니다. 현재 배포된 사이트는 `frontend/`만으로도
완전히 동작하는 정적 사이트이며, `backend/`는 연락처 폼 등을 위한 API 서버로 아직
실제 데이터베이스는 연결되어 있지 않은 초기 뼈대입니다.

```
portfolio/
├── frontend/   # 정적 포트폴리오 사이트 (Vercel 배포 대상)
└── backend/    # Node.js + Express API 서버 (로컬 개발/향후 배포용, DB 미연결)
```

## 빠른 시작

```bash
# 프론트엔드만 보기 (백엔드 없이도 정상 동작)
cd frontend
start index.html      # 또는: python -m http.server 8000

# 백엔드까지 함께 실행하고 싶다면 (연락처 폼이 실제로 저장됨)
cd backend
npm install
cp .env.example .env
npm start
```

각 폴더의 자세한 내용은 [frontend/README.md](frontend/README.md), [backend/README.md](backend/README.md)를 참고하세요.

## 왜 나눴나요

- `frontend/`는 지금처럼 Vercel에 정적 사이트로 계속 배포합니다 (빌드 과정 없음).
- `backend/`는 나중에 데이터베이스(연락처 메시지 저장 등)나 다른 프로그램을 연결할
  자리로 미리 분리해 둔 것입니다. 지금 당장 DB가 없어도 프론트엔드는 그대로
  동작하고, 백엔드가 켜져 있을 때만 실제로 데이터가 저장됩니다.
