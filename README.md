# Ajou FoodMap API - Supabase 데이터베이스 구축

> TypeScript·Express로 맛집 API를 구현하고 Supabase PostgreSQL에 데이터를 저장합니다.

## 프로젝트 소개와 완료 목표

Node.js 프로젝트를 생성하고 TypeScript·Express로 맛집 API를 구현합니다. 서버는 Supabase JS SDK로 Data API에 요청하고 PostgreSQL 테이블에 맛집을 저장합니다.

```text
기존 React 클라이언트 → Express의 기존 /api/restaurants
                    → Supabase JS SDK → Data API(HTTPS)
                    → PostgreSQL의 public.restaurants
```

실습을 마치면 다음을 설명하고 확인할 수 있어야 합니다.

- 서버의 어떤 파일이 URL·키를 읽고, 어떤 코드가 실제 DB 요청을 보내는가.
- 테이블·열·제약조건·권한·초기화 함수·시딩 SQL이 각각 어떤 역할을 하는가.
- 메모리 저장과 DB 저장은 조회·등록·ID 생성 방식에서 어떤 차이가 있는가.
- 등록한 같은 ID의 맛집이 서버를 완전히 종료한 뒤에도 남아 있는가.
- 기존 Render 주소와 Vercel 클라이언트에서 같은 DB 데이터가 보이는가.

| 기능·정보 | 실습 결과 |
| --- | --- |
| 맛집 목록·상세·인기 목록 | Supabase의 `restaurants` 조회 |
| 기존 맛집 등록 | `POST /api/restaurants`로 DB에 저장 |
| API 경로·응답 | 기존 경로, `{ data: ... }`, camelCase 필드 유지 |
| 인기 기준 | 기존 `rating` 내림차순, 기본 최대 5개 |
| 제보·승인 상태·화면 좋아요 | 기존 브라우저 LocalStorage 유지 |
| 맛집 수정·삭제 | 기존 관리자 버튼 비활성 유지 |
| 이미지 | DB에는 기존 URL 문자열 저장, 파일은 기존 외부 서버 |

사용 기술은 Node.js 24.x, TypeScript, Express, `@supabase/supabase-js`, PostgreSQL입니다. 자동 검사는 Jest와 로컬 PostgreSQL인 PGlite로 실행합니다.

## 사전 준비

**작업 위치:** 프로젝트를 생성할 상위 폴더. 셸 명령은 macOS·Linux 터미널 또는 Windows Git Bash에서 실행합니다.

```bash
node --version
npm --version
git --version
```

Node.js **24.22.1**, GitHub·Supabase·Render·Vercel 계정, 에디터, 브라우저 개발자 도구를 준비합니다. 연동할 React 클라이언트와 배포할 Render·Vercel 프로젝트를 준비합니다.

| 작업 대상 | 이름 |
| --- | --- |
| 생성할 서버 프로젝트 | `pwd-week7` |
| 기존 API 연동이 끝난 React 클라이언트 | `pwd-week7-client` |
| 서버를 배포할 서비스 | Render Web Service |
| 클라이언트를 배포할 프로젝트 | 기존 Vercel 프로젝트 |

**파일** 표시가 있는 코드 블록은 지정한 파일의 전체 내용입니다. Step 1부터 순서대로 작성하고, Step 7의 검사를 마친 뒤 서버를 실행합니다.

## Step 1. 프로젝트 생성과 GitHub 저장소 연결

**목적:** Node.js 프로젝트와 서버 폴더 구조를 생성합니다. **작업 위치:** 프로젝트를 생성할 상위 폴더.

### 1-1. 프로젝트 폴더와 package.json 생성

상위 폴더에서 다음 명령을 실행합니다.

```bash
mkdir pwd-week7
cd pwd-week7
npm init -y
```

- `mkdir pwd-week7`: 서버 프로젝트 폴더를 만듭니다.
- `cd pwd-week7`: 이후 모든 서버 파일·명령의 기준 위치로 이동합니다.
- `npm init -y`: 기본값으로 `package.json`을 생성합니다. Step 2에서 의존성과 실행 명령을 설정합니다.

**정상 결과:** 현재 폴더 이름이 `pwd-week7`이고 루트에 `package.json`이 있습니다. 다음 명령의 출력은 `"pwd-week7"`입니다.

```bash
npm pkg get name
```

### 1-2. 서버 폴더 구조 생성

**작업 위치:** 방금 만든 `pwd-week7` 루트.

```bash
mkdir -p src/controllers src/services src/models src/routes
mkdir -p src/middleware src/utils src/types src/data src/config
mkdir -p scripts tests/helpers supabase
```

| 폴더 | 작성할 내용 |
| --- | --- |
| `src/controllers`, `src/routes` | 기존과 같은 요청 경로·HTTP 응답 처리 |
| `src/services`, `src/models` | Supabase 데이터 요청·기존 응답 필드 변환 |
| `src/middleware`, `src/utils`, `src/types` | 오류 처리·공통 타입 |
| `src/data` | 동기 비교 데모와 초기 데이터 대조에 사용할 원본 JSON |
| `src/config` | 서버용 Supabase SDK 설정 |
| `scripts` | 빌드 데이터 복사·실제 DB 연결 점검 |
| `tests`, `tests/helpers` | 서비스·API·로컬 SQL 검사 |
| `supabase` | 테이블 정의·초기 데이터 SQL |

**정상 결과:** 에디터에서 위 폴더들이 보입니다.

### 1-3. 본인의 GitHub 저장소 연결

GitHub에서 본인 소유의 **빈 `pwd-week7` 저장소**를 만듭니다. 생성 폼에서 README·라이선스·`.gitignore`는 추가하지 않습니다. `README.md`를 프로젝트 루트에 저장합니다.

다음 명령은 **로컬 `pwd-week7` 루트**에서 실행하며, `YOUR_GITHUB_ID`만 본인의 아이디로 바꿉니다.

```bash
git init
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_ID/pwd-week7.git
git remote -v
```

**정상 결과:** `origin`의 fetch·push 주소가 본인 계정의 `pwd-week7`을 가리킵니다. 여기까지는 Git 연결만 준비하며, 최종 커밋·푸시는 모든 파일 작성과 로컬 검증을 마친 Step 11에서 진행합니다.

## Step 2. 의존성·설정·폴더 구조 준비

**목적:** 새 프로젝트에 TypeScript·Express 실행 환경과 Supabase SDK·검사 도구를 설정합니다. **작업 위치:** Step 1에서 생성한 `pwd-week7` 루트.

`npm init -y`가 만든 `package.json`을 아래 전체 내용으로 교체합니다. 나머지 설정 파일은 지정한 경로에 새로 작성합니다. Express·TypeScript, Supabase SDK, dotenv를 설정합니다. PGlite와 Emscripten 타입은 로컬 SQL 검사에 사용합니다.

**파일: `package.json` — 전체 내용으로 작성**

```json
{
  "name": "pwd-week7",
  "version": "1.0.0",
  "private": true,
  "type": "commonjs",
  "main": "dist/server.js",
  "engines": {
    "node": "24.x"
  },
  "scripts": {
    "dev": "tsx watch server.ts",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.build.json && tsx scripts/copy-data.ts",
    "start": "node dist/server.js",
    "test": "jest --runInBand && npm run test:sql",
    "test:watch": "jest --watch --runInBand",
    "test:sql": "node --import tsx --test tests/schema.postgres.ts",
    "db:check": "tsx scripts/check-db.ts"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.1.0",
    "@supabase/supabase-js": "2.118.0",
    "dotenv": "17.2.2"
  },
  "devDependencies": {
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/jest": "^29.5.14",
    "@types/node": "^22.20.5",
    "@types/supertest": "^6.0.3",
    "jest": "^29.7.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.4.15",
    "tsx": "^4.23.15",
    "typescript": "^5.9.3",
    "@electric-sql/pglite": "0.5.14",
    "@types/emscripten": "1.41.6"
  },
  "description": "Foodmap API with Supabase restaurant persistence"
}
```

**파일: `tsconfig.json` — 전체 내용으로 작성**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "rootDir": ".",
    "outDir": "dist",
    "strict": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "noEmitOnError": true,
    "sourceMap": true,
    "types": [
      "node",
      "jest",
      "emscripten"
    ]
  },
  "include": [
    "server.ts",
    "src/**/*.ts",
    "tests/**/*.ts",
    "scripts/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "coverage"
  ]
}
```

빌드·테스트 설정 파일을 작성합니다.

**파일: `tsconfig.build.json` — 전체 내용으로 작성**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["server.ts", "src/**/*.ts"],
  "exclude": ["node_modules", "dist", "coverage", "tests", "scripts"]
}
```

서버 코드만 `dist/`에 컴파일하고 검사·빌드용 스크립트는 배포 결과에서 제외합니다. 빌드 진입점은 `dist/server.js`입니다.

**파일: `jest.config.cjs` — 전체 내용으로 작성**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts'],
  coveragePathIgnorePatterns: ['node_modules', 'src/data'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};
```

Jest는 `tests/**/*.test.ts`를 실행합니다. 별도의 SQL 검사 파일은 package.json의 `test:sql` 명령으로 실행합니다.

**파일: `scripts/copy-data.ts` — 전체 내용으로 작성**

```ts
import { copyFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const source = path.join(__dirname, '..', 'src', 'data', 'restaurants.json');
const destination = path.join(__dirname, '..', 'dist', 'src', 'data');

// tsc는 파일 경로로 읽는 JSON을 복사하지 않으므로 빌드 결과에 함께 넣습니다.
mkdirSync(destination, { recursive: true });
copyFileSync(source, path.join(destination, 'restaurants.json'));
```

TypeScript 컴파일만으로는 파일 경로로 읽는 JSON이 복사되지 않으므로 빌드 후 원본 JSON을 `dist/src/data/`로 옮깁니다. 원본 JSON은 Step 6에서 직접 작성합니다. 위 `tsconfig.json`의 `emscripten` 타입은 PGlite 검사에 필요합니다.

**파일: `.node-version` — 전체 내용으로 작성**

```text
24.22.1
```

**파일: `.gitignore` — 전체 내용으로 작성**

```gitignore
node_modules/
dist/
coverage/
.env
.env.*
!.env.example
*.log
*.tsbuildinfo
.DS_Store
```

실제 `.env`는 제외하고 `.env.example`만 Git에 포함합니다. 위 파일을 모두 저장한 뒤 **새 `pwd-week7` 프로젝트 루트**에서 실행합니다.

```bash
npm install --include=dev
npm ls @supabase/supabase-js dotenv
```

`npm install --include=dev`는 런타임·개발 의존성을 설치하고 이 프로젝트의 `package-lock.json`을 생성합니다. 이후 같은 프로젝트를 잠금 파일대로 다시 설치하거나 Render에서 빌드할 때는 `npm ci --include=dev`를 사용합니다. 이는 동일한 프로젝트의 재설치 명령입니다.

**정상 결과:** `@supabase/supabase-js@2.118.0`, `dotenv@17.2.2`가 표시됩니다. 새로 생성한 `package-lock.json`은 나중에 `package.json`과 함께 커밋합니다. 설치가 끝났다는 사실은 아직 DB 연결 성공을 의미하지 않습니다.

작성할 프로젝트의 최종 구조입니다.

```text
pwd-week7/
├── server.ts                             # dotenv 로딩
├── src/
│   ├── app.ts                            # Express·CORS·라우터 연결
│   ├── config/supabase.ts                # SDK 설정과 DB 오류 전달
│   ├── controllers/restaurants.controller.ts # DB 초기화 await
│   ├── services/restaurants.service.ts    # DB 조회·등록·RPC
│   ├── models/restaurant.model.ts         # DB 행 변환
│   ├── types/database.types.ts            # DB 타입
│   ├── types/restaurant.types.ts          # 기존 API 필드
│   ├── routes/restaurants.routes.ts       # 기존 경로
│   ├── middleware/                       # 오류 응답 처리
│   ├── utils/                            # 오류 클래스·비동기 오류 전달
│   └── data/restaurants.json              # 동기 비교 데모 원본
├── supabase/schema.sql                   # 테이블·권한·함수
├── supabase/seed.sql                     # 조건부 원본 입력
├── scripts/check-db.ts                   # 실제 DB 읽기 점검
├── scripts/copy-data.ts                  # 빌드 시 원본 JSON 복사
├── tests/helpers/supabase.ts             # 테스트용 DB 응답
├── tests/schema.postgres.ts              # 로컬 SQL 검사
├── tests/restaurants.service.test.ts     # DB 응답을 사용한 검사
├── tests/restaurants.routes.test.ts      # 기존 API 검사
├── .env.example                         # 연결 변수 예시
├── .env                                 # 본인 값, Git 제외
├── .node-version                        # Node 24.22.1
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.build.json                   # 직접 작성할 설정
├── jest.config.cjs                       # 직접 작성할 설정
└── README.md
```

## Step 3. Supabase 프로젝트 만들기

**목적:** 서버 메모리와 독립적으로 유지되는 PostgreSQL DB를 준비합니다. **작업 위치:** 브라우저의 Supabase Dashboard.

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인합니다.
2. 사용할 Organization을 선택하고 **New project**를 누릅니다.
3. 이름 `pwd-week7`, DB 비밀번호, 사용할 지역을 정하고 프로젝트를 생성합니다. DB 비밀번호는 보관하되 이번 SDK 설정값으로 사용하지 않습니다.
4. 프로젝트 준비가 끝나면 **SQL Editor**와 **Table Editor**를 찾습니다.
5. **Integrations → Data API**에서 Data API 활성화를 확인합니다. 실제 접근 권한은 다음 단계의 SQL로 정합니다.
6. 프로젝트의 **Connect**에서 기본 Project URL을 확인합니다. 형식은 `https://프로젝트식별자.supabase.co`입니다.
7. **Settings → API Keys**에서 서버용 **Secret key**를 준비합니다. 없는 경우 생성합니다. 값은 `sb_secret_`로 시작합니다.

**정상 결과:** 사용할 프로젝트의 SQL Editor를 열 수 있고, 기본 URL과 서버용 Secret key를 확보했습니다. React에 넣는 Publishable key와 구별합니다. 실제 값은 Step 5에서 로컬 서버에만 입력합니다.

[프로젝트 생성 안내](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs#create-a-supabase-project), [API 키 구분](https://supabase.com/docs/guides/getting-started/api-keys)

## Step 4. 테이블·권한·초기 데이터를 SQL로 준비

**목적:** 저장 구조와 서버 권한을 정의하고 원본 맛집 3건을 입력합니다. **파일 작성 위치:** `pwd-week7/supabase/`. **실행 위치:** 사용할 Supabase 프로젝트의 SQL Editor.

### 4-1. schema.sql 작성 후 실행

아래 전체 내용을 새 파일로 저장합니다. 이어서 **파일 전체**를 SQL Editor의 새 쿼리에 붙여넣고 **Run**을 누릅니다.

**파일: `supabase/schema.sql` — 전체 내용으로 작성**

```sql
-- Restaurant 데이터를 저장합니다.
create table if not exists public.restaurants (
  id bigint generated by default as identity primary key,
  name text not null,
  category text not null,
  location text not null,
  price_range text not null default '정보 없음',
  rating numeric not null default 0,
  description text not null default '',
  recommended_menu text[] not null default '{}',
  likes integer not null default 0,
  image text not null default ''
);

-- DB에 직접 접근하는 것은 Express의 서버용 키뿐입니다.
alter table public.restaurants enable row level security;
revoke all on table public.restaurants from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, delete on table public.restaurants to service_role;
grant usage, select, update on sequence public.restaurants_id_seq to service_role;

-- 기존 POST /api/restaurants/reset-demo 전용입니다.
-- 실행하면 추가된 맛집을 지우고 아래 원본 3건과 다음 ID=4를 복원합니다.
-- 하나의 트랜잭션이므로 중간 실패 시 삭제와 입력이 함께 롤백됩니다.
create or replace function public.reset_restaurant_demo_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  lock table public.restaurants in exclusive mode;
  delete from public.restaurants;
  insert into public.restaurants
    (id, name, category, location, price_range, rating, description, recommended_menu, likes, image)
  values
    (1, '송림식당', '한식', '경기 수원시 영통구 월드컵로193번길 21 원천동', '7,000-13,000원', 4.99, '최고의 한식 맛집입니다.', array['순두부', '김치찌개', '소불고기', '제육볶음']::text[], 0, 'https://mblogthumb-phinf.pstatic.net/MjAyMjA2MTJfODEg/MDAxNjU0OTYzNTM3MjE1.1BfmrmOsz_B6DBHAnhQSs6qfNIDnssofR-DrzMfigIIg.JHHDheG6ifJjtfKUqLss_mLXWFE9fNJ5BmepNUVXSOog.PNG.cary63/image.png?type=w966'),
    (2, '별미떡볶이', '분식', '경기 수원시 영통구 아주로 42 아카데미빌딩', '7,000-10,000원', 4.92, '바삭한 튀김과 함께하는 행복한 한입', array['떡볶이', '튀김', '순대', '어묵']::text[], 0, 'https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA4MTJfMjcg%2FMDAxNzU0OTQ5ODk1Mjg0.GR6i3mNpJJXyqQrozGEJ65InCDBGlEmxc0aCeVHncJgg.sduDPX67J8hhoGxq4vLohpS4dXk1w-706dQLPfVs1iwg.JPEG%2Foutput%25A3%25DF1564208956.jpg'),
    (3, 'SOGO', '일식', '경기 수원시 영통구 월드컵로193번길 7', '10,000-16,000원', 4.89, '일식 맛집, 구 허수아비,', array['냉모밀', '김치돈까스나베', '코돈부르']::text[], 0, 'https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20190707_63%2F1562462598960nPDMy_JPEG%2FW7iKQEhTMzCF3flC1t0pzgzF.jpeg.jpg');
  perform pg_catalog.setval(pg_catalog.pg_get_serial_sequence('public.restaurants', 'id'), 3, true);
end;
$$;

revoke all on function public.reset_restaurant_demo_data() from public, anon, authenticated;
grant execute on function public.reset_restaurant_demo_data() to service_role;
```

각 구문의 역할을 확인합니다.

| 구문 | 이번 실습에서의 의미 |
| --- | --- |
| `CREATE TABLE IF NOT EXISTS public.restaurants` | public 스키마에 테이블 생성. 이미 있으면 생성 생략 |
| `bigint` · `integer` · `numeric` | 식별자·정수 개수·소수 평점의 자료형 |
| `text` · `text[]` | 문자열과 문자열 배열. image는 URL 텍스트 |
| `GENERATED BY DEFAULT AS IDENTITY` | 생략한 ID를 DB가 생성. 원본 입력의 명시적 ID도 허용 |
| `PRIMARY KEY` | 식별자의 중복과 NULL 금지 |
| `NOT NULL` | NULL 금지. 빈 문자열 검사는 서버 로직과 별개 |
| `DEFAULT` | 생략한 열의 기본값. 명시적 NULL을 바꾸는 규칙은 아님 |
| `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | 일반 역할의 행 접근 정책 사용을 활성화 |
| `REVOKE ... FROM anon, authenticated` | 브라우저 역할의 테이블 권한 회수 |
| `GRANT ... TO service_role` | 서버 역할에 스키마·테이블·시퀀스의 필요한 권한 부여 |
| `CREATE OR REPLACE FUNCTION` | 기존 초기화 데모를 위한 DB 함수 정의 |
| `SECURITY INVOKER` | 호출한 역할의 권한으로 함수 본문 실행 |
| `SET search_path = ''` | 객체 검색 경로를 비우고 public·pg_catalog 이름을 명시 |
| `AS $$ ... $$` · `BEGIN ... END` | 함수 본문 문자열과 PL/pgSQL 문장 블록의 경계 |
| `LOCK TABLE ... IN EXCLUSIVE MODE` | 초기화 동안 다른 쓰기 등을 제한. 일반 SELECT는 가능 |
| `DELETE` → `INSERT` | 현재 행을 지우고 원본 3행 복원 |
| `ARRAY[...]::text[]` | 메뉴 문자열을 text[] 배열 값으로 구성 |
| `setval(..., 3, true)` | 3을 이미 사용한 번호로 지정해 다음 자동 ID를 4로 준비 |
| `GRANT EXECUTE ON FUNCTION` | 서버 역할의 함수 호출 허용 |

**함수 정의와 실행은 다릅니다.** 이 파일을 실행해 함수를 정의하는 것만으로 초기화 본문이 실행되지는 않습니다. `RETURNS void`는 반환할 데이터 값이 없다는 뜻입니다. 함수의 `BEGIN/END`는 트랜잭션 시작·종료 명령인 `BEGIN/COMMIT`과 구별합니다.

초기화 중 처리되지 않은 오류가 발생하면 DELETE와 INSERT의 행 변경은 함께 롤백됩니다. 시퀀스 `setval` 변경은 PostgreSQL에서 롤백되지 않으므로 행 변경과 구별합니다. 함수 권한의 `FROM public`은 모든 역할을 뜻하는 PUBLIC이며, `public.restaurants`의 스키마 이름과 다릅니다.

서버용 Secret key의 `service_role`은 RLS를 우회하지만 객체 권한은 필요합니다. 이번 실습은 브라우저에서 DB로 직접 접근하는 정책을 추가하지 않습니다. `IF NOT EXISTS`는 기존 테이블을 새 정의에 맞게 수정하는 명령도 아닙니다.

**정상 결과:** SQL 실행 오류가 없고 Table Editor에 `restaurants`의 10개 열이 보입니다. 아직 빈 테이블이어도 정상입니다. 기존 테이블에 데이터가 있었다면 행이 그대로인지 확인합니다.

### 4-2. seed.sql 작성 후 실행

다음 파일을 저장하고 SQL Editor의 새 쿼리에서 전체 실행합니다.

**파일: `supabase/seed.sql` — 전체 내용으로 작성**

```sql
-- 최초 한 번, 비어 있는 실습 테이블에만 원본 맛집 3건을 입력합니다.
-- 다시 실행해도 기존 맛집을 삭제하거나 덮어쓰지 않습니다.
do $$
begin
  if not exists (select 1 from public.restaurants) then
    perform public.reset_restaurant_demo_data();
  end if;
end;
$$;
```

- `DO $$ ... $$`는 이름을 저장하지 않고 한 번 실행하는 PL/pgSQL 블록입니다.
- `SELECT 1 FROM ...`에 결과 행이 있는지 `EXISTS`로 검사합니다. 앞의 `NOT` 때문에 **행이 없을 때만** THEN 아래를 실행합니다.
- `PERFORM`은 반환값을 받지 않고 함수를 호출합니다. 빈 테이블이면 원본을 입력하고, 행이 있으면 호출하지 않습니다.

같은 SQL Editor에서 아래 **확인용 SELECT**를 실행합니다.

```sql
select id, name, price_range, rating, recommended_menu
from public.restaurants
order by id;
```

**정상 결과:** 새 DB는 `1 송림식당`, `2 별미떡볶이`, `3 SOGO`가 보이고 메뉴가 배열로 저장됩니다. 이미 등록한 데이터가 있는 프로젝트는 3건보다 많을 수 있습니다. seed를 다시 실행해도 그 행들은 유지됩니다.

**Integrations → Data API**에서 `public` 스키마의 `restaurants`와 `reset_restaurant_demo_data` 함수가 API 대상으로 노출되도록 설정합니다. 새 테이블 자동 노출 옵션이 있다면 현재 실습에 필요한 대상이 포함되는지 확인합니다.

이제 DB 구조와 초기 데이터가 준비되었습니다. 이후 서버 시작·재시작·Render 배포 때 schema·seed를 다시 실행할 필요는 없습니다. `reset_restaurant_demo_data()`를 직접 호출하거나 `reset-demo` API를 호출하면 추가 행도 삭제되므로 영구 저장 확인에는 사용하지 않습니다.

## Step 5. 서버 환경변수 작성

**목적:** 서버에 연결 대상과 자격 증명을 전달합니다. **작업 위치:** `pwd-week7` 루트.

먼저 공유할 예시 파일을 작성합니다.

**파일: `.env.example` — 전체 내용으로 작성**

```dotenv
# 서버 프로젝트 루트의 .env로 복사한 뒤 실제 값을 입력합니다.
PORT=3000
NODE_ENV=development

# 프로젝트 기본 URL. /rest/v1은 붙이지 않습니다.
SUPABASE_URL=https://your-project-ref.supabase.co
# Supabase Settings > API Keys의 서버용 Secret key. VITE_*에 넣지 않습니다.
SUPABASE_SECRET_KEY=sb_secret_replace_with_your_real_key
```

루트에 `.env`가 **없는 경우에만** 복사합니다. `-n`은 기존 파일을 덮어쓰지 않는 옵션입니다.

```bash
cp -n .env.example .env
```

에디터에서 `.env`를 열고 예시 URL과 키를 Step 3에서 확인한 실제 값으로 교체합니다. 기존 `.env`가 있으면 두 SUPABASE 값만 확인·수정합니다.

| Key | 입력할 값 |
| --- | --- |
| `PORT` | 로컬에서는 `3000` |
| `NODE_ENV` | 로컬에서는 `development` |
| `SUPABASE_URL` | 본인 프로젝트의 기본 URL. `/rest/v1`을 붙이지 않음 |
| `SUPABASE_SECRET_KEY` | 본인 프로젝트의 서버용 `sb_secret_...` 키 |

**정상 결과:** 두 SUPABASE 변수에 예시 값이 아닌 본인 값이 저장되어 있습니다. 값은 채팅·README·Git에 올리지 않습니다. 다음 명령은 키 값을 출력하지 않고 Git 제외 여부만 확인합니다.

```bash
git check-ignore .env
```

출력에 `.env`가 보이면 정상입니다. React나 Vercel의 `VITE_*` 변수에는 Supabase Secret key를 넣지 않습니다. 별도의 관리자 토큰·CORS 환경변수는 추가하지 않습니다.

## Step 6. 서버 파일을 Supabase 통신 코드로 변경

**목적:** 서버의 요청·응답 처리와 Supabase 조회·등록을 구현합니다. **작업 위치:** `pwd-week7` 루트. 각 파일을 지정한 경로에 작성합니다.

### 6-1. 서버 공통 코드 작성

**작업 위치:** `pwd-week7` 루트. 데이터 타입 → 오류 처리 → 라우터·Express 앱 → 원본 JSON 순서로 파일을 작성합니다.

#### 공통 데이터·응답 타입

**파일: `src/types/restaurant.types.ts` — 전체 내용으로 작성**

```ts
export interface RestaurantData {
  id: number;
  name: string;
  category: string;
  location: string;
  priceRange: string;
  rating: number;
  description: string;
  recommendedMenu: string[];
  likes: number;
  image: string;
}

// 모델은 숫자로 전달되거나 문자열로 전달된 값을 모두 숫자로 정규화합니다.
export interface RestaurantInput {
  id: number | string;
  name: string;
  category: string;
  location: string;
  priceRange: string;
  rating: number | string;
  description: string;
  recommendedMenu?: string[];
  likes?: number | string;
  image?: string;
}

export interface CreateRestaurantInput {
  name: string;
  category: string;
  location: string;
  priceRange?: string;
  rating?: number | string;
  description?: string;
  recommendedMenu?: string[];
  image?: string;
}

// HTTP 요청에는 필드가 빠질 수 있으므로 서비스에서 필수 값을 확인합니다.
export type CreateRestaurantBody = Omit<Partial<CreateRestaurantInput>, 'recommendedMenu'> & {
  recommendedMenu?: unknown;
};
```

**파일: `src/types/api.types.ts` — 전체 내용으로 작성**

```ts
export interface DataResponse<T> {
  data: T;
  meta?: {
    execution: 'synchronous';
  };
}

export interface ErrorResponse {
  error: {
    message: string;
    stack?: string;
  };
}
```

이 타입은 클라이언트와 주고받는 기존 데이터 형태입니다. DB의 열 이름을 나타낼 타입은 다음 절에서 별도로 작성합니다. `recommendedMenu`는 배열이며, HTTP 입력의 메뉴 형태는 기존 컨트롤러에서 정리합니다.

#### 오류 클래스와 비동기 오류 전달

**파일: `src/utils/httpError.ts` — 전체 내용으로 작성**

```ts
export default class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}
```

**파일: `src/utils/asyncHandler.ts` — 전체 내용으로 작성**

```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';

export default function asyncHandler<
  Params = Record<string, string>,
  ResponseBody = unknown,
  RequestBody = unknown,
  Query = Request['query'],
>(
  handler: (
    req: Request<Params, ResponseBody, RequestBody, Query>,
    res: Response<ResponseBody>,
    next: NextFunction,
  ) => Promise<void>,
): RequestHandler<Params, ResponseBody, RequestBody, Query> {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
```

`HttpError`는 HTTP 상태 코드를 가진 오류를 표현합니다. `asyncHandler`는 컨트롤러의 비동기 처리에서 발생한 오류를 Express의 `next`로 넘깁니다.

#### 오류 응답과 없는 경로 처리

**파일: `src/middleware/error.middleware.ts` — 전체 내용으로 작성**

```ts
import type { ErrorRequestHandler } from 'express';
import type { ErrorResponse } from '../types/api.types';

const errorHandler: ErrorRequestHandler<Record<string, string>, ErrorResponse> = (err: unknown, req, res, next) => {
  const error = err instanceof Error ? err : new Error('Internal Server Error');
  const status = 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : 500;
  const payload: ErrorResponse = {
    error: {
      message: error.message || 'Internal Server Error'
    }
  };

  if (process.env.NODE_ENV !== 'production' && error.stack) {
    payload.error.stack = error.stack;
  }

  res.status(status).json(payload);
};

export default errorHandler;
```

**파일: `src/middleware/notFound.middleware.ts` — 전체 내용으로 작성**

```ts
import type { RequestHandler } from 'express';
import type { ErrorResponse } from '../types/api.types';

const notFound: RequestHandler<Record<string, string>, ErrorResponse> = (req, res) => {
  res.status(404).json({ error: { message: 'Resource not found' } });
};

export default notFound;
```

기존 `{ error: { message: ... } }` 형태를 유지합니다. `NODE_ENV=production`이면 오류 스택을 응답에 포함하지 않습니다.

#### 라우터와 Express 앱

**파일: `src/routes/restaurants.routes.ts` — 전체 내용으로 작성**

```ts
import { Router } from 'express';
import * as restaurantsController from '../controllers/restaurants.controller';

const router = Router();

router.get('/', restaurantsController.getRestaurants);
router.get('/sync-demo', restaurantsController.getRestaurantsSync);
router.get('/popular', restaurantsController.getPopularRestaurants);
router.get('/:id', restaurantsController.getRestaurant);
router.post('/', restaurantsController.createRestaurant);
router.post('/reset-demo', restaurantsController.resetDemoData);

export default router;
```

**파일: `src/app.ts` — 전체 내용으로 작성**

```ts
import express, { type Express } from 'express';
import cors from 'cors';
import restaurantsRouter from './routes/restaurants.routes';
import notFound from './middleware/notFound.middleware';
import errorHandler from './middleware/error.middleware';

export default function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/restaurants', restaurantsRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

`express.json()`은 등록 요청의 JSON 본문을 읽고, `cors()`는 기존 브라우저 요청을 허용합니다. 앱의 `/api/restaurants`와 라우터의 `/`가 합쳐져 목록·등록 경로가 됩니다. 오류 미들웨어는 라우터 뒤에 둡니다.

#### 원본 맛집 JSON

**파일: `src/data/restaurants.json` — 전체 내용으로 작성**

```json
[
  {
    "id": 1,
    "name": "송림식당",
    "category": "한식",
    "location": "경기 수원시 영통구 월드컵로193번길 21 원천동",
    "priceRange": "7,000-13,000원",
    "rating": 4.99,
    "description": "최고의 한식 맛집입니다.",
    "recommendedMenu": ["순두부", "김치찌개","소불고기", "제육볶음"],
    "likes": 0,
    "image": "https://mblogthumb-phinf.pstatic.net/MjAyMjA2MTJfODEg/MDAxNjU0OTYzNTM3MjE1.1BfmrmOsz_B6DBHAnhQSs6qfNIDnssofR-DrzMfigIIg.JHHDheG6ifJjtfKUqLss_mLXWFE9fNJ5BmepNUVXSOog.PNG.cary63/image.png?type=w966"
  },
  {
    "id": 2,
    "name": "별미떡볶이",
    "category": "분식",
    "location": "경기 수원시 영통구 아주로 42 아카데미빌딩",
    "priceRange": "7,000-10,000원",
    "rating": 4.92,
    "description": "바삭한 튀김과 함께하는 행복한 한입",
    "recommendedMenu": ["떡볶이", "튀김", "순대", "어묵"],
    "likes": 0,
    "image": "https://search.pstatic.net/common/?src=http%3A%2F%2Fblogfiles.naver.net%2FMjAyNTA4MTJfMjcg%2FMDAxNzU0OTQ5ODk1Mjg0.GR6i3mNpJJXyqQrozGEJ65InCDBGlEmxc0aCeVHncJgg.sduDPX67J8hhoGxq4vLohpS4dXk1w-706dQLPfVs1iwg.JPEG%2Foutput%25A3%25DF1564208956.jpg"
  },
  {
    "id": 3,
    "name": "SOGO",
    "category": "일식",
    "location": "경기 수원시 영통구 월드컵로193번길 7",
    "priceRange": "10,000-16,000원",
    "rating": 4.89,
    "description": "일식 맛집, 구 허수아비,",
    "recommendedMenu": ["냉모밀", "김치돈까스나베", "코돈부르"],
    "likes": 0,
    "image": "https://search.pstatic.net/common/?src=https%3A%2F%2Fldb-phinf.pstatic.net%2F20190707_63%2F1562462598960nPDMy_JPEG%2FW7iKQEhTMzCF3flC1t0pzgzF.jpeg.jpg"
  }
]
```

이 파일도 새 프로젝트에 직접 작성합니다. 동기·비동기 파일 읽기 비교와 초기 데이터 대조에 사용하며, 일반 목록·상세·인기는 이어서 작성할 서비스가 실제 Supabase에서 조회합니다. **확인:** 위 공통 파일 9개를 모두 저장한 뒤 다음 절의 DB 타입과 연결 코드를 작성합니다.


### 6-2. DB 타입 추가

**파일: `src/types/database.types.ts` — 전체 내용으로 작성**

```ts
// DB 열 이름은 snake_case, 기존 HTTP 응답은 camelCase를 유지합니다.
export type RestaurantRow = {
  id: number;
  name: string;
  category: string;
  location: string;
  price_range: string;
  rating: number;
  description: string;
  recommended_menu: string[];
  likes: number;
  image: string;
};

export type RestaurantInsert = Pick<RestaurantRow, 'name' | 'category' | 'location'> &
  Partial<Omit<RestaurantRow, 'id' | 'name' | 'category' | 'location'>>;

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: RestaurantRow;
        Insert: RestaurantInsert;
        Update: Partial<RestaurantInsert>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      reset_restaurant_demo_data: { Args: Record<never, never>; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}
```

`RestaurantRow`는 DB 열 이름, `RestaurantInsert`는 등록할 값의 타입입니다. `Database`는 SDK에 public 스키마의 테이블·함수 타입을 알려줍니다. 타입 선언만으로 실제 DB 테이블이 만들어지지는 않습니다. 테이블은 앞에서 실행한 SQL로 만들었습니다.

### 6-3. URL·키를 읽고 SDK를 준비하는 파일 추가

**파일: `src/config/supabase.ts` — 전체 내용으로 작성**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database.types';
import HttpError from '../utils/httpError';

let client: SupabaseClient<Database> | undefined;

export function getSupabase(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key || url.includes('your-project-ref') || key.includes('replace_with')) {
    throw new Error('SUPABASE_URL과 SUPABASE_SECRET_KEY를 서버 .env 또는 Render 환경변수에 설정하세요.');
  }

  client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}

export function throwDatabaseError(error: { code?: string; message: string }): never {
  console.error('[Supabase]', error.code ?? 'request', error.message);
  throw new HttpError(503, 'Supabase DB 요청에 실패했습니다.');
}
```

| 코드 | 역할 |
| --- | --- |
| `process.env.SUPABASE_URL` · `SUPABASE_SECRET_KEY` | 서버 환경변수에서 연결 대상·키 읽기 |
| `if (client) return client` | 만들어 둔 SDK 객체 재사용 |
| `createClient<Database>(url, key, ...)` | 요청에 사용할 SDK 객체 생성 |
| `auth`의 세 값 `false` | 사용자 로그인 세션 저장·자동 갱신·URL 세션 감지 사용 안 함 |
| `throwDatabaseError(...)` | SDK 응답 오류를 서버에 기록하고 기존 미들웨어에 503 오류 전달 |

여기서 `client`는 요청 설정을 가진 SDK 객체입니다. PostgreSQL 직접 접속 드라이버나 맛집 배열이 아닙니다. `createClient()`만으로 DB 조회 성공이 증명되지는 않습니다. 실제 요청은 다음 서비스의 `await`에서 처리합니다.

### 6-4. DB 행을 기존 Restaurant 응답으로 변환

`fromDatabase()`로 DB 행을 API 응답 필드에 맞게 변환합니다.

**파일: `src/models/restaurant.model.ts` — 전체 내용으로 작성**

```ts
import type { RestaurantRow } from '../types/database.types';
import type { RestaurantData, RestaurantInput } from '../types/restaurant.types';

export default class Restaurant implements RestaurantData {
  id: number;
  name: string;
  category: string;
  location: string;
  priceRange: string;
  rating: number;
  description: string;
  recommendedMenu: string[];
  likes: number;
  image: string;

  constructor({
    id,
    name,
    category,
    location,
    priceRange,
    rating,
    description,
    recommendedMenu = [],
    likes = 0,
    image = ''
  }: RestaurantInput) {
    this.id = Number(id);
    this.name = name;
    this.category = category;
    this.location = location;
    this.priceRange = priceRange;
    this.rating = Number(rating);
    this.description = description;
    this.recommendedMenu = [...recommendedMenu];
    this.likes = Number(likes);
    this.image = image;
  }

  static fromDatabase(row: RestaurantRow): Restaurant {
    return new Restaurant({
      id: row.id,
      name: row.name,
      category: row.category,
      location: row.location,
      priceRange: row.price_range,
      rating: row.rating,
      description: row.description,
      recommendedMenu: row.recommended_menu,
      likes: row.likes,
      image: row.image,
    });
  }

  updateLikes(likes: number | string): this {
    this.likes = Number(likes);
    return this;
  }
}
```

DB의 `price_range`와 `recommended_menu`를 기존 `priceRange`, `recommendedMenu`로 맞춥니다. 생성자와 기존 응답 필드를 유지하므로 React가 DB 열 이름에 맞춰 바뀔 필요가 없습니다.

### 6-5. 메모리 조회·등록을 DB 요청으로 교체

Supabase에서 맛집을 조회·등록하고 결과를 Restaurant 모델로 반환하는 서비스를 작성합니다.

**파일: `src/services/restaurants.service.ts` — 전체 내용으로 작성**

```ts
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import Restaurant from '../models/restaurant.model';
import type { CreateRestaurantInput, RestaurantInput } from '../types/restaurant.types';
import type { RestaurantInsert } from '../types/database.types';
import { getSupabase, throwDatabaseError } from '../config/supabase';
import HttpError from '../utils/httpError';

const DATA_PATH = path.join(__dirname, '..', 'data', 'restaurants.json');
const RESTAURANT_COLUMNS = 'id,name,category,location,price_range,rating,description,recommended_menu,likes,image';
// 일반 API의 저장소가 아니라 기존 sync-demo가 동기로 읽을 마지막 조회 결과입니다.
let synchronousDemoSnapshot: Restaurant[] = loadRestaurantsSync();

// 파일 읽기·동기 실행 비교용입니다. 일반 맛집 API는 DB를 사용합니다.
export function loadRestaurantsSync(): Restaurant[] {
  const raw = readFileSync(DATA_PATH, 'utf8');
  const parsed: RestaurantInput[] = JSON.parse(raw);
  return parsed.map((item) => new Restaurant(item));
}

export async function loadRestaurantsAsync(): Promise<Restaurant[]> {
  const raw = await readFile(DATA_PATH, 'utf8');
  const parsed: RestaurantInput[] = JSON.parse(raw);
  return parsed.map((item) => new Restaurant(item));
}

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await getSupabase()
    .from('restaurants')
    .select(RESTAURANT_COLUMNS)
    .order('id', { ascending: true });
  if (error) throwDatabaseError(error);
  const restaurants = (data ?? []).map(Restaurant.fromDatabase);
  synchronousDemoSnapshot = restaurants.map((item) => new Restaurant(item));
  return restaurants;
}

export function getAllRestaurantsSync(): Restaurant[] {
  return synchronousDemoSnapshot.map((item) => new Restaurant(item));
}

export async function getRestaurantById(id: number | string): Promise<Restaurant | null> {
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId) || numericId <= 0) return null;

  const { data, error } = await getSupabase()
    .from('restaurants')
    .select(RESTAURANT_COLUMNS)
    .eq('id', numericId)
    .maybeSingle();
  if (error) throwDatabaseError(error);
  return data ? Restaurant.fromDatabase(data) : null;
}

export async function getPopularRestaurants(limit = 5): Promise<Restaurant[]> {
  const restaurants = await getAllRestaurants();
  return restaurants
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

export async function createRestaurant(payload: Partial<CreateRestaurantInput>): Promise<Restaurant> {
  const { name, category, location } = payload;
  if (!name || !category || !location) {
    const missingField = !name ? 'name' : !category ? 'category' : 'location';
    throw new HttpError(400, `'${missingField}' is required`);
  }

  const row: RestaurantInsert = {
    name,
    category,
    location,
    price_range: payload.priceRange ?? '정보 없음',
    rating: Number(payload.rating ?? 0),
    description: payload.description ?? '',
    recommended_menu: payload.recommendedMenu ?? [],
    likes: 0,
    image: payload.image ?? '',
  };
  // id는 PostgreSQL identity가 생성합니다. 서버 메모리로 계산하지 않습니다.
  const { data, error } = await getSupabase()
    .from('restaurants')
    .insert(row)
    .select(RESTAURANT_COLUMNS)
    .single();
  if (error) throwDatabaseError(error);
  const restaurant = Restaurant.fromDatabase(data!);
  synchronousDemoSnapshot = [...synchronousDemoSnapshot, new Restaurant(restaurant)];
  return restaurant;
}

export async function resetStore(): Promise<void> {
  // 기존 reset-demo의 동작을 유지합니다. SQL 함수 안에서 전체 초기화를 처리합니다.
  const { error } = await getSupabase().rpc('reset_restaurant_demo_data');
  if (error) throwDatabaseError(error);
  synchronousDemoSnapshot = loadRestaurantsSync();
}
```

메모리 저장과 Supabase 저장 방식을 비교합니다.

| 작업 | 메모리 저장 방식 | Supabase 저장 방식 |
| --- | --- | --- |
| 목록 | `restaurantCache` 복사 | `.from('restaurants').select(...).order(...)` |
| 상세 | 배열의 `find(...)` | `.eq('id', numericId).maybeSingle()` |
| 등록 | 새 Restaurant을 배열에 추가 | `row` 객체를 `.insert(row)`로 DB에 입력 |
| ID | 메모리 최대 ID + 1 | ID를 생략해 PostgreSQL IDENTITY가 생성 |
| 출력 | 기존 Restaurant | `Restaurant.fromDatabase(...)`로 기존 필드 유지 |
| 초기화 | JSON을 읽어 배열 복원 | `.rpc('reset_restaurant_demo_data')` |
| 비동기 대기 | `simulateLatency()` | 실제 Data API 요청 결과를 `await` |

목록 코드의 `.select(RESTAURANT_COLUMNS)`는 열을 고르고 `.order(...)`는 DB 정렬을 지정합니다. `{ data, error }`는 SDK의 결과입니다. `error`가 없으면 DB 행을 모델로 변환해 컨트롤러에 반환합니다.

등록 코드에서 `row`는 DB 열 이름으로 구성한 입력값이며 id가 없습니다. `.insert(row).select(...).single()`은 한 번의 INSERT 요청에서 저장된 한 행도 반환받는 지정입니다. 별도 목록 GET을 한 번 더 보내는 코드가 아닙니다.

`getPopularRestaurants()`는 목록을 DB에서 받은 뒤 기존처럼 Express에서 rating 내림차순으로 정렬합니다. `loadRestaurantsSync()`·`loadRestaurantsAsync()`와 원본 JSON은 파일 읽기 비교에 사용합니다. `synchronousDemoSnapshot`은 마지막 결과를 복사한 동기 데모용 메모리이며 일반 목록·상세·인기는 매번 실제 DB에서 읽습니다.

### 6-6. 서버 시작 전에 .env를 읽기

**파일: `server.ts` — 전체 내용으로 작성**

```ts
import 'dotenv/config';
import createApp from './src/app';

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;
```

`import 'dotenv/config'`가 로컬 `.env`를 읽습니다. 로딩된 값은 설정 파일의 `process.env`에서 사용합니다. Render에서는 대시보드 환경변수가 실행 환경에 제공됩니다.

### 6-7. 컨트롤러에서 DB 초기화 완료 대기

컨트롤러에서 입력값을 정리하고 서비스를 호출한 뒤 HTTP 응답을 반환합니다.

**파일: `src/controllers/restaurants.controller.ts` — 전체 내용으로 작성**

```ts
import type { RequestHandler } from 'express';
import * as restaurantService from '../services/restaurants.service';
import type { DataResponse, ErrorResponse } from '../types/api.types';
import type { CreateRestaurantBody, RestaurantData } from '../types/restaurant.types';
import asyncHandler from '../utils/asyncHandler';

type NoParams = Record<string, never>;
type RestaurantListResponse = DataResponse<RestaurantData[]>;

const normaliseMenu = (menu: unknown): string[] => {
  if (!menu) return [];
  if (Array.isArray(menu)) return menu.filter((item): item is string => typeof item === 'string');
  if (typeof menu === 'string') {
    return menu
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const getRestaurants = asyncHandler<NoParams, RestaurantListResponse>(async (req, res) => {
  const restaurants = await restaurantService.getAllRestaurants();
  res.json({ data: restaurants });
});

export const getRestaurantsSync: RequestHandler<NoParams, RestaurantListResponse> = (req, res) => {
  const restaurants = restaurantService.getAllRestaurantsSync();
  res.json({
    data: restaurants,
    meta: {
      execution: 'synchronous'
    }
  });
};

export const getRestaurant = asyncHandler<{ id: string }, DataResponse<RestaurantData> | ErrorResponse>(async (req, res) => {
  const restaurant = await restaurantService.getRestaurantById(req.params.id);

  if (!restaurant) {
    res.status(404).json({ error: { message: 'Restaurant not found' } });
    return;
  }

  res.json({ data: restaurant });
});

export const getPopularRestaurants = asyncHandler<NoParams, RestaurantListResponse, unknown, { limit?: string }>(async (req, res) => {
  const limit = req.query.limit ? Number(req.query.limit) : 5;
  const restaurants = await restaurantService.getPopularRestaurants(limit);
  res.json({ data: restaurants });
});

export const createRestaurant = asyncHandler<NoParams, DataResponse<RestaurantData>, CreateRestaurantBody | undefined>(async (req, res) => {
  const payload = {
    ...req.body,
    recommendedMenu: normaliseMenu(req.body?.recommendedMenu)
  };

  const restaurant = await restaurantService.createRestaurant(payload);
  res.status(201).json({ data: restaurant });
});

export const resetDemoData = asyncHandler<NoParams, RestaurantListResponse>(async (req, res) => {
  await restaurantService.resetStore();
  const restaurants = await restaurantService.getAllRestaurants();
  res.json({ data: restaurants });
});
```

`await restaurantService.resetStore()`로 DB 초기화를 기다린 뒤 목록을 읽습니다. 목록은 `{ data: ... }`, 등록 성공은 `201`과 `{ data: restaurant }`로 응답합니다.

### 6-8. 한 번의 요청을 파일 순서로 확인

요청이 라우터·컨트롤러·서비스를 거쳐 DB에 도달하고 응답으로 돌아오는 순서를 확인합니다.

| 순서 | 파일·찾을 코드 | 역할 |
| --- | --- | --- |
| 1 | `src/app.ts`의 `app.use('/api/restaurants', restaurantsRouter)` | API 공통 경로 연결 |
| 2 | `src/routes/restaurants.routes.ts`의 `router.get('/', ...)` | GET 목록 컨트롤러 선택 |
| 3 | `src/controllers/restaurants.controller.ts`의 `getRestaurants` | 목록 서비스 호출을 await |
| 4 | `src/services/restaurants.service.ts`의 `getAllRestaurants` | 설정 파일에서 SDK를 받아 실제 조회 |
| 5 | `src/config/supabase.ts`의 `getSupabase` | URL·키로 준비한 SDK 반환 |
| 6 | 서비스의 `Restaurant.fromDatabase` | DB 행을 기존 필드로 변환 |
| 7 | 컨트롤러의 `res.json({ data: restaurants })` | 클라이언트에 기존 형식으로 응답 |

브라우저와 서버 사이의 `/api/restaurants`는 우리 API입니다. SDK는 `SUPABASE_URL` 아래의 `/rest/v1/...` Data API에 HTTPS 요청을 만들고, Data API가 PostgreSQL에서 처리합니다.

| 서비스 코드 | SDK의 기본 HTTP 요청 |
| --- | --- |
| `.from('restaurants').select(...).order(...)` | `GET /rest/v1/restaurants` · 열·정렬은 쿼리 매개변수 |
| `.eq('id', numericId).maybeSingle()` | 같은 GET에 id 조건 추가 |
| `.insert(row).select(...).single()` | `POST /rest/v1/restaurants` · JSON 본문에 row |
| `.rpc('reset_restaurant_demo_data')` | `POST /rest/v1/rpc/reset_restaurant_demo_data` |

**이 단계 확인:** 서버 공통 파일 9개와 Supabase 통신을 구성하는 파일 6개를 모두 작성·저장했습니다. API 경로와 공통 응답 타입을 바꾸지 않았고, URL·키는 코드 문자열에 직접 적지 않았습니다. [Data API 설명](https://supabase.com/docs/guides/api), [SDK 초기화](https://supabase.com/docs/reference/javascript/initializing), [등록 결과 반환](https://supabase.com/docs/reference/javascript/insert)

## Step 7. 검사 파일을 준비하고 로컬 검사 통과

**목적:** 서비스·API 응답·SQL 동작을 검사합니다. **작업 위치:** `pwd-week7` 루트.

먼저 실제 DB를 읽는 점검 스크립트를 작성합니다. 실행은 Step 8에서 합니다.

**파일: `scripts/check-db.ts` — 전체 내용으로 작성**

```ts
import 'dotenv/config';
import { getSupabase, throwDatabaseError } from '../src/config/supabase';

async function main(): Promise<void> {
  const { error } = await getSupabase()
    .from('restaurants')
    .select('id,name,category,location,price_range,rating,description,recommended_menu,likes,image')
    .limit(1);
  if (error) throwDatabaseError(error);
  console.log('[Supabase] restaurants 테이블 연결 확인 성공');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'DB 연결 확인 실패');
  process.exitCode = 1;
});
```

서비스·라우트 자동 검사는 실제 Supabase를 수정하지 않도록 테스트용 SDK 응답을 사용합니다. 아래 네 파일을 전체 내용으로 새로 작성합니다. `jest.config.cjs`는 Step 2에서 작성한 설정을 사용합니다.

### 7-1. 서비스·라우트 검사에 사용할 DB 응답

**파일: `tests/helpers/supabase.ts` — 전체 내용으로 작성**

```ts
import fs from 'node:fs';
import path from 'node:path';
import type { RestaurantInsert, RestaurantRow } from '../../src/types/database.types';
import type { RestaurantInput } from '../../src/types/restaurant.types';

type Result<T> = { data: T; error: { code: string; message: string } | null };

function seedRows(): RestaurantRow[] {
  const seed: RestaurantInput[] = JSON.parse(fs.readFileSync(
    path.join(__dirname, '../../src/data/restaurants.json'), 'utf8',
  ));
  return seed.map((item) => ({
    id: Number(item.id), name: item.name, category: item.category, location: item.location,
    price_range: item.priceRange, rating: Number(item.rating), description: item.description,
    recommended_menu: item.recommendedMenu ?? [], likes: Number(item.likes ?? 0), image: item.image ?? '',
  }));
}

let rows = seedRows();

// Supabase 자격증명 없이 서비스·HTTP 계약을 검사합니다.
// 실제 PostgreSQL 스키마와 영구 저장은 schema.postgres.ts에서 별도로 검증합니다.
export const databaseClient = {
  from(table: string) {
    if (table !== 'restaurants') throw new Error(`Unexpected table: ${table}`);
    return {
      select() {
        return {
          async order(): Promise<Result<RestaurantRow[]>> {
            return { data: structuredClone(rows), error: null };
          },
          eq(column: string, id: number) {
            if (column !== 'id') throw new Error(`Unexpected filter: ${column}`);
            return {
              async maybeSingle(): Promise<Result<RestaurantRow | null>> {
                return { data: structuredClone(rows.find((row) => row.id === id) ?? null), error: null };
              },
            };
          },
        };
      },
      insert(input: RestaurantInsert) {
        return {
          select() {
            return {
              async single(): Promise<Result<RestaurantRow>> {
                const row: RestaurantRow = {
                  id: Math.max(0, ...rows.map((item) => item.id)) + 1,
                  name: input.name, category: input.category, location: input.location,
                  price_range: input.price_range ?? '정보 없음', rating: input.rating ?? 0,
                  description: input.description ?? '', recommended_menu: input.recommended_menu ?? [],
                  likes: input.likes ?? 0, image: input.image ?? '',
                };
                rows.push(structuredClone(row));
                return { data: structuredClone(row), error: null };
              },
            };
          },
        };
      },
    };
  },
  async rpc(name: string): Promise<Result<null>> {
    if (name !== 'reset_restaurant_demo_data') throw new Error(`Unexpected function: ${name}`);
    rows = seedRows();
    return { data: null, error: null };
  },
};

export function getSupabase() {
  return databaseClient;
}
```

### 7-2. 서비스 검사

**파일: `tests/restaurants.service.test.ts` — 전체 내용으로 작성**

```ts
jest.mock('../src/config/supabase', () => ({
  ...jest.requireActual('../src/config/supabase'),
  ...require('./helpers/supabase'),
}));

import * as restaurantService from '../src/services/restaurants.service';
import { databaseClient } from './helpers/supabase';

describe('RestaurantService', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await restaurantService.resetStore();
  });

  test('getAllRestaurants resolves with data', async () => {
    const restaurants = await restaurantService.getAllRestaurants();
    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBeGreaterThan(0);
  });

  test('getAllRestaurantsSync returns data immediately', () => {
    const restaurants = restaurantService.getAllRestaurantsSync();
    expect(Array.isArray(restaurants)).toBe(true);
    expect(restaurants.length).toBeGreaterThan(0);
  });

  test('async and sync file loaders read the same seed data', async () => {
    expect(await restaurantService.loadRestaurantsAsync()).toEqual(restaurantService.loadRestaurantsSync());
  });

  test('returned collections do not expose cached menu arrays', async () => {
    const restaurants = await restaurantService.getAllRestaurants();
    restaurants[0].recommendedMenu.push('외부 변경');
    const fresh = restaurantService.getAllRestaurantsSync();
    expect(fresh[0].recommendedMenu).not.toContain('외부 변경');
  });

  test('createRestaurant appends a new entry', async () => {
    const payload = {
      name: '테스트 식당',
      category: '테스트',
      location: '가상 캠퍼스',
      rating: 4.5,
    };

    const created = await restaurantService.createRestaurant(payload);
    expect(created.id).toBeDefined();
    expect(created.name).toBe(payload.name);

    const all = await restaurantService.getAllRestaurants();
    const found = all.find((item) => item.id === created.id);
    expect(found).toBeTruthy();
  });

  test('createRestaurant rejects invalid payloads', async () => {
    await expect(
      restaurantService.createRestaurant({ name: '누락된 식당' })
    ).rejects.toThrow("'category' is required");
  });
});


describe('Supabase storage contract', () => {
  afterEach(async () => {
    jest.restoreAllMocks();
    await restaurantService.resetStore();
  });

  test('DB 행을 기존 필드명과 숫자 타입으로 반환한다', async () => {
    const created = await restaurantService.createRestaurant({
      name: 'DB 등록', category: '한식', location: '캠퍼스',
      priceRange: '7,000원', rating: '4.75', recommendedMenu: ['김밥', '라면'],
    });
    expect(created).toMatchObject({ id: 4, priceRange: '7,000원', rating: 4.75, recommendedMenu: ['김밥', '라면'], image: '' });
    expect(created).not.toHaveProperty('price_range');
    expect(created).not.toHaveProperty('recommended_menu');
    expect(await restaurantService.getRestaurantById(created.id)).toEqual(created);
    expect(restaurantService.getAllRestaurantsSync()).toHaveLength(4);
  });

  test.each(['abc', '1.5', '-1', '0'])('잘못된 ID %s는 없는 맛집으로 처리한다', async (id) => {
    expect(await restaurantService.getRestaurantById(id)).toBeNull();
  });

  test('DB 초기화 실패를 숨기지 않고 오류 처리로 전달한다', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(databaseClient, 'rpc').mockResolvedValueOnce({
      data: null, error: { code: 'PGRST202', message: 'Function not found' },
    });
    await expect(restaurantService.resetStore()).rejects.toThrow('Supabase DB 요청에 실패했습니다.');
  });
});
```

### 7-3. 기존 HTTP 경로·상태 코드 검사

**파일: `tests/restaurants.routes.test.ts` — 전체 내용으로 작성**

```ts
jest.mock('../src/config/supabase', () => ({
  ...jest.requireActual('../src/config/supabase'),
  ...require('./helpers/supabase'),
}));

import type { Express } from 'express';
import request from 'supertest';
import createApp from '../src/app';
import * as restaurantService from '../src/services/restaurants.service';

describe('Restaurant routes', () => {
  let app: Express;

  beforeEach(async () => {
    await restaurantService.resetStore();
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('GET /health reports server status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  test('GET /api/restaurants returns a list', async () => {
    const response = await request(app).get('/api/restaurants');
    expect(response.status).toBe(200);
    expect(response.body.data).toBeInstanceOf(Array);
    expect(response.body.data).toEqual(JSON.parse(JSON.stringify(restaurantService.loadRestaurantsSync())));
  });

  test('GET /api/restaurants/sync-demo flags synchronous execution', async () => {
    const response = await request(app).get('/api/restaurants/sync-demo');
    expect(response.status).toBe(200);
    expect(response.body.meta.execution).toBe('synchronous');
  });

  test('GET /api/restaurants/:id returns an item', async () => {
    const response = await request(app).get('/api/restaurants/1');
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(1);
  });

  test('GET /api/restaurants/:id handles missing items', async () => {
    const response = await request(app).get('/api/restaurants/999');
    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain('not found');
  });

  test('POST /api/restaurants validates payload', async () => {
    const response = await request(app)
      .post('/api/restaurants')
      .send({ name: '테스트' })
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('category');
  });

  test('POST /api/restaurants creates a restaurant', async () => {
    const payload = {
      name: '새로운 식당',
      category: '카페',
      location: '캠퍼스 타운',
    };

    const response = await request(app)
      .post('/api/restaurants')
      .send(payload)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body.data.name).toBe(payload.name);
  });

  test('GET /api/restaurants/popular respects the limit and rating order', async () => {
    const response = await request(app).get('/api/restaurants/popular?limit=2');
    const expectedIds = restaurantService.getAllRestaurantsSync()
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 2)
      .map((restaurant) => restaurant.id);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data.map((restaurant: { id: number }) => restaurant.id)).toEqual(expectedIds);
  });

  test.each([
    ['김밥, 라면, ', ['김밥', '라면']],
    [['김밥', '라면'], ['김밥', '라면']],
    [['김밥', 123], ['김밥']],
    [null, []],
  ])('POST /api/restaurants normalises menu %j', async (menu, expected) => {
    const response = await request(app).post('/api/restaurants').send({
      name: '메뉴 테스트 식당',
      category: '분식',
      location: '캠퍼스',
      recommendedMenu: menu,
    });

    expect(response.status).toBe(201);
    expect(response.body.data.recommendedMenu).toEqual(expected);
  });

  test('POST /api/restaurants handles an absent request body', async () => {
    const response = await request(app).post('/api/restaurants');
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("'name' is required");
  });

  test('POST /api/restaurants/reset-demo restores seed data', async () => {
    const original = restaurantService.getAllRestaurantsSync();
    await request(app).post('/api/restaurants').send({
      name: '임시 식당', category: '한식', location: '캠퍼스',
    }).expect(201);

    const response = await request(app).post('/api/restaurants/reset-demo');
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(JSON.parse(JSON.stringify(original)));
  });

  test('unknown routes return the standard 404 response', async () => {
    const response = await request(app).get('/unknown');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { message: 'Resource not found' } });
  });

  test('async failures reach error middleware without exposing stacks in production', async () => {
    jest.replaceProperty(process, 'env', { ...process.env, NODE_ENV: 'production' });
    jest.spyOn(restaurantService, 'getAllRestaurants').mockRejectedValueOnce(new Error('Read failed'));

    const response = await request(app).get('/api/restaurants');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: { message: 'Read failed' } });
  });
});
```

### 7-4. 로컬 PostgreSQL로 실제 SQL 검사

**파일: `tests/schema.postgres.ts` — 전체 내용으로 작성**

```ts
import { PGlite } from '@electric-sql/pglite';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { test, before, beforeEach, after, afterEach } from 'node:test';
import Restaurant from '../src/models/restaurant.model';
import type { RestaurantRow } from '../src/types/database.types';

const schema = readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf8');
const seed = readFileSync(path.join(__dirname, '../supabase/seed.sql'), 'utf8');
const original = JSON.parse(readFileSync(path.join(__dirname, '../src/data/restaurants.json'), 'utf8'));
let db: PGlite;
let directory: string;

before(async () => {
  directory = mkdtempSync(path.join(tmpdir(), 'pwd-week7-db-'));
  db = new PGlite(directory);
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(schema);
});

beforeEach(async () => {
  await db.exec('reset role; truncate public.restaurants restart identity;');
});

afterEach(async () => {
  await db.exec('reset role; drop function if exists public.fail_demo_reset() cascade;');
});

after(async () => {
  await db?.close();
  if (directory) rmSync(directory, { recursive: true, force: true });
});

async function restaurants() {
  const { rows } = await db.query<RestaurantRow>('select * from public.restaurants order by id');
  return JSON.parse(JSON.stringify(rows.map(Restaurant.fromDatabase)));
}

test('초기 데이터는 원본 JSON과 모든 필드가 같고 재실행해도 기존 행을 보존한다', async () => {
  await db.exec(seed);
  assert.deepEqual(await restaurants(), original);
  await db.query("update public.restaurants set description='유지할 내용' where id=1");
  await db.exec(seed);
  assert.equal((await restaurants())[0].description, '유지할 내용');
  assert.equal((await restaurants()).length, 3);
});

test('DB가 ID와 기존 기본값을 생성하고 메뉴 배열을 보존한다', async () => {
  await db.exec(seed);
  const { rows } = await db.query<RestaurantRow>(
    'insert into public.restaurants(name,category,location,recommended_menu) values ($1,$2,$3,$4) returning *',
    ['DB 식당', '한식', '아주대', ['김밥', '라면']],
  );
  const item = Restaurant.fromDatabase(rows[0]);
  assert.equal(item.id, 4);
  assert.equal(item.priceRange, '정보 없음');
  assert.equal(item.rating, 0);
  assert.equal(item.likes, 0);
  assert.equal(item.image, '');
  assert.deepEqual(item.recommendedMenu, ['김밥', '라면']);
});

test('DB를 종료하고 다시 열어도 추가한 맛집이 유지된다', async () => {
  await db.exec(seed);
  await db.query("insert into public.restaurants(name,category,location) values ('재시작 확인','한식','캠퍼스')");
  await db.close();
  db = new PGlite(directory);
  assert.equal((await restaurants()).find((item: { id: number }) => item.id === 4).name, '재시작 확인');
});

test('기존 reset-demo용 함수가 초기 3건과 다음 ID를 함께 복원한다', async () => {
  await db.exec(seed);
  await db.query("insert into public.restaurants(name,category,location) values ('추가 맛집','분식','캠퍼스')");
  await db.exec('set role service_role');
  await db.query('select public.reset_restaurant_demo_data()');
  assert.deepEqual(await restaurants(), original);
  const { rows } = await db.query<{ id: number }>("insert into public.restaurants(name,category,location) values ('다음 맛집','한식','캠퍼스') returning id");
  assert.equal(rows[0].id, 4);
});

test('초기화 도중 실패하면 원래 DB 데이터가 삭제되지 않는다', async () => {
  await db.exec(seed);
  await db.query("insert into public.restaurants(name,category,location) values ('보존 확인','한식','캠퍼스')");
  const previous = await restaurants();
  await db.exec(`
    create function public.fail_demo_reset() returns trigger language plpgsql as $$
    begin raise exception 'reset failure'; end; $$;
    create trigger fail_demo_reset before insert on public.restaurants
    for each row when (new.id=1) execute function public.fail_demo_reset();
  `);
  await assert.rejects(db.query('select public.reset_restaurant_demo_data()'), /reset failure/);
  assert.deepEqual(await restaurants(), previous);
});

test('DB 직접 접근은 서버 역할만 허용하며 공개 역할에는 허용하지 않는다', async () => {
  await db.exec(seed);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(db.query('select * from public.restaurants'), { code: '42501' });
    await assert.rejects(db.query('select public.reset_restaurant_demo_data()'), { code: '42501' });
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  assert.equal((await restaurants()).length, 3);
});
```

PGlite 검사는 임시 디렉터리의 로컬 DB에서 원본 SQL을 실행합니다. 실제 Supabase 프로젝트에 테스트 행을 쓰지 않습니다. seed 재실행 보존·자동 ID·기본값·메뉴 배열·DB 재개방 후 유지·초기화·실패 시 행 롤백·역할 권한을 확인합니다.

파일을 모두 저장한 뒤, 서버를 켜지 않은 상태에서 실행합니다.

```bash
npm run typecheck
npm test
npm run build
```

**정상 결과:** 타입 검사 성공, Jest 28건 및 SQL 6건 통과, 빌드 후 `dist/server.js`와 `dist/src/data/restaurants.json` 생성입니다. `npm test`의 성공은 실제 클라우드 연결 성공과 구별합니다.

| 명령 | 수행 작업 |
| --- | --- |
| `npm run typecheck` | 서버·검사·스크립트 타입 확인 |
| `npm test` | 가짜 DB 응답 기반 Jest 후 로컬 PGlite SQL 검사 |
| `npm run build` | TypeScript 컴파일 후 기존 JSON을 dist로 복사 |
| `npm run db:check` | 실제 Supabase를 최대 한 행 읽어 연결·열 확인 |
| `npm run dev` | tsx watch로 소스 실행, 저장 시 서버 재시작 |
| `npm start` | 이미 빌드한 dist/server.js 실행 |

## Step 8. 실제 Supabase 연결과 API 조회 확인

**목적:** 로컬 서버가 실제 프로젝트 DB를 읽는지 확인합니다. **작업 위치:** `pwd-week7` 루트.

```bash
npm run db:check
```

**정상 결과:** `[Supabase] restaurants 테이블 연결 확인 성공`이 출력됩니다. 이 검사는 행 등록·초기화를 수행하지 않습니다. 실패했다면 오류 표를 참고해 URL·서버용 키·SQL·Data API 설정을 확인한 뒤 성공시킵니다.

이어서 서버를 실행합니다.

```bash
npm run dev
```

`Server listening on port 3000` 로그가 보이면, 이 터미널은 켜 둡니다. **같은 서버 프로젝트 루트의 새 터미널**에서 다음 요청을 보냅니다.

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/api/restaurants
curl -i http://localhost:3000/api/restaurants/1
curl -i 'http://localhost:3000/api/restaurants/popular?limit=2'
curl -i http://localhost:3000/api/restaurants/999999999
```

| 요청 | 정상 결과 |
| --- | --- |
| `/health` | 200 · `{"status":"ok"}` |
| 목록 | 200 · `{ data: [...] }`, Table Editor의 같은 맛집 |
| 상세 `/1` | 200 · 송림식당 · 기존 camelCase 필드 |
| 인기 `limit=2` | 200 · 평점이 높은 순서의 최대 2개 |
| 없는 ID | 404 · `{"error":{"message":"Restaurant not found"}}` |

SQL Editor의 확인용 SELECT와 목록의 ID·이름·가격대·메뉴를 비교합니다. SQL은 snake_case, API는 camelCase입니다. `/health` 200만으로 DB 연결 성공을 판정하지 않습니다.

**확인 후:** 서버를 실행한 터미널에서 `Ctrl+C`로 종료합니다. 다른 프로세스가 3000번 포트를 쓰면 종료 후 다시 실행합니다. 포트를 바꾸는 경우에는 서버와 클라이언트의 로컬 주소도 같은 포트로 맞춥니다.

## Step 9. 맛집 등록 후 서버를 재시작해 영구 저장 확인

**목적:** 추가 데이터가 프로세스 메모리 밖에 저장되는지 확인합니다. **작업 위치:** `pwd-week7` 루트의 두 터미널, Supabase Table Editor.

앞에서 빌드한 JavaScript 서버로 확인합니다. 소스를 바꾸었다면 먼저 다시 빌드합니다.

```bash
npm start
```

다른 터미널에서 다음 등록 요청을 **한 번** 실행합니다. 로컬 서버라도 같은 Supabase 프로젝트에 실제 행이 추가됩니다.

```bash
curl -i -X POST http://localhost:3000/api/restaurants \
  -H 'Content-Type: application/json' \
  -d '{"name":"영구 저장 확인 식당","category":"한식","location":"아주대학교 실습","priceRange":"7,000원","rating":4.5,"recommendedMenu":["김밥","라면"]}'
```

1. 응답 상태가 **201**인지 확인합니다.
2. `data.id` 값을 기록합니다. 새 DB라면 보통 4이며, 이미 데이터가 있으면 다른 번호입니다.
3. 반환된 ID의 상세를 조회하고, Table Editor에서 같은 ID·이름·평점·메뉴 배열·빈 image가 보이는지 확인합니다.

아래 `RETURNED_ID`를 방금 받은 숫자로 바꾸어 실행합니다. 예를 들어 id가 4이면 URL 끝을 `/4`로 입력합니다.

```bash
curl -i http://localhost:3000/api/restaurants/RETURNED_ID
```

서버 터미널에서 **Ctrl+C로 프로세스를 완전히 종료**합니다. 같은 폴더에서 다시 실행합니다.

```bash
npm start
```

다른 터미널에서 같은 ID의 상세와 전체 목록을 다시 조회합니다.

```bash
curl -i http://localhost:3000/api/restaurants/RETURNED_ID
curl -i http://localhost:3000/api/restaurants
```

**정상 결과:** 재시작 전후 같은 ID와 모든 필드가 일치합니다. 원본 3건도 유지됩니다. 브라우저 새로고침만 한 경우와 서버 프로세스를 바꾼 경우를 구별합니다. 검증 행을 지우려고 `reset-demo`를 호출하지 않습니다. 검증은 이 행이 DB에 유지된 상태로 마칩니다.

## Step 10. 기존 React 클라이언트와 로컬 연동 확인

**목적:** 기존 API 응답으로 화면이 그대로 동작하는지 확인합니다. **서버:** Step 9의 `pwd-week7` 서버를 켜 둡니다. **새 터미널 작업 위치:** 기존 `pwd-week7-client` 루트.

```bash
cd ../pwd-week7-client
```

API 연동이 구성된 React 클라이언트(HashRouter)를 실행합니다. 클라이언트 루트의 `.env.local`에서 다음 변수를 확인합니다. 다른 설정이 있다면 전체를 덮어쓰지 않고 이 항목만 맞춥니다.

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

필요한 의존성을 설치하고 실행합니다. 잠금 파일이 있는 기존 프로젝트 기준입니다.

```bash
npm ci --include=dev
npm run dev
```

**정상 결과:** 터미널에 표시된 Vite 주소를 열었을 때 다음 항목이 통과합니다.

- `/#/list`에서 DB 목록과 Step 9의 등록 행이 표시됩니다.
- 분류 필터와 `/#/restaurant/반환된ID` 상세에 같은 데이터가 표시됩니다.
- 인기 목록은 기존 평점순이며 최대 5개입니다.
- image가 빈 등록 행의 상세에서 불필요한 이미지 요소·경고가 없습니다.
- 개발자 도구 **Network**의 목록·상세 요청이 `http://localhost:3000/api/restaurants...`로 나가고 200을 받습니다.
- 관리자 수정·삭제 버튼은 기존처럼 비활성입니다. 제보·좋아요는 같은 브라우저 LocalStorage에 남습니다.

환경변수를 바꾸었다면 Vite 개발 서버를 재시작합니다. 클라이언트 확인을 마치면 해당 터미널에서 Ctrl+C로 종료합니다.

## Step 11. 최종 파일 검사 후 GitHub에 커밋·푸시

**목적:** Render가 가져갈 코드를 확정합니다. **작업 위치:** 다시 `pwd-week7` 서버 루트.

```bash
cd ../pwd-week7
npm run typecheck
npm test
npm run build
git status --short
git check-ignore .env
```

**정상 결과:** 검사·빌드가 통과하고 `.env`는 제외됩니다. README를 프로젝트 루트에 저장했는지, 생성한 잠금 파일과 위에서 작성한 소스·SQL·검사 파일이 모두 있는지 확인합니다. Git 작성자 정보가 없다면 `git config user.name`, `git config user.email`을 본인 값으로 설정합니다.

변경이 있는 경우 실행합니다.

```bash
git add .
git diff --cached --name-only
git commit -m "Connect restaurants to Supabase"
git push -u origin main
```

스테이징된 목록에 실제 `.env`가 없고 `.env.example`만 포함되는지 확인합니다.

**배포 전 확인:** GitHub의 본인 `pwd-week7/main`에 `package-lock.json`, `server.ts`, `src/`, `scripts/`, `tests/`, `supabase/`, 설정 파일과 README가 보입니다. `node_modules/`, `dist/`, 실제 `.env`는 포함하지 않습니다.

## Step 12. 기존 Render 서비스에 Supabase 서버 배포

**목적:** 기존 공개 API 주소를 유지하고 서버 소스를 `pwd-week7`로 바꿉니다. **작업 위치:** 브라우저의 Render Dashboard.

### 12-1. 기존 서비스 환경변수 저장

1. [Render Dashboard](https://dashboard.render.com/)에서 배포할 Web Service를 열고 공개 HTTPS 주소를 기록합니다.
2. **Environment → Environment Variables**에서 다음 값을 등록합니다.

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `24.22.1` |
| `SUPABASE_URL` | 로컬에서 검증한 `.env`와 같은 기본 Project URL |
| `SUPABASE_SECRET_KEY` | 로컬에서 검증한 것과 같은 서버용 Secret key |
| `PORT` | 직접 추가하지 않음. Render 제공 값 사용 |

3. 소스 변경 전에는 **Save only**로 저장합니다. 아직 실행 환경에 반영되지 않으며 다음 배포에서 사용됩니다.

환경변수 변경을 적용할 때는 **Save, rebuild, and deploy**를 사용합니다. [Render 환경변수 저장 옵션](https://render.com/docs/configure-environment-variables)

### 12-2. 소스 저장소·빌드 설정 변경

1. 같은 서비스의 **Settings → Build → Source → Edit**를 엽니다.
2. **Update Source**에서 본인의 `pwd-week7` GitHub 저장소를 선택합니다.
3. 아래 설정을 확인하고 변경을 제출합니다. 새 소스로 배포가 시작됩니다.

| 화면 항목 | 값 |
| --- | --- |
| Repository | 본인 계정의 `pwd-week7` |
| Branch | `main` — Step 11에서 푸시한 브랜치 |
| Runtime / Language | `Node` |
| Root Directory | 비워둠 — 루트의 package.json 사용 |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/health` |
| Auto-Deploy | `On Commit` |

저장소가 안 보이면 Render에 연결한 GitHub 앱의 해당 저장소 접근 권한을 확인합니다. [기존 서비스 소스 변경](https://render.com/changelog/change-your-services-backing-repo-or-image-in-the-render-dashboard), [Git provider 연결](https://render.com/docs/git-provider)

### 12-3. Live 커밋과 실제 DB 응답 확인

**Deploys**에서 현재 Live 배포를 열어 Step 11의 커밋과 일치하는지 확인합니다. 로컬 커밋은 서버 폴더에서 `git log -1 --oneline`으로 확인할 수 있습니다. 공개 API 응답은 커밋 SHA를 알려주지 않습니다.

서비스의 실제 HTTPS 주소를 복사합니다. 아래 `YOUR-SERVICE`가 들어간 기본 URL 전체를 본인 주소로 바꿉니다. 따옴표 안의 `?limit=2`는 그대로 사용합니다.

```bash
curl -i --max-time 120 'https://YOUR-SERVICE.onrender.com/health'
curl -i 'https://YOUR-SERVICE.onrender.com/api/restaurants'
curl -i 'https://YOUR-SERVICE.onrender.com/api/restaurants/popular?limit=2'
curl -i 'https://YOUR-SERVICE.onrender.com/api/restaurants/RETURNED_ID'
```

마지막 `RETURNED_ID`도 Step 9의 숫자로 바꿉니다. **정상 결과:** 모두 200이고 로컬에서 등록한 같은 DB 행이 공개 상세·목록에도 보입니다. 목록의 ID와 값을 Table Editor와 대조합니다. `/health` 성공 후 DB API가 실패하면 환경변수·테이블·권한·실제 Live 소스를 따로 점검합니다.

재배포나 서비스 재시작 후에도 이 행이 유지되어야 합니다. 대기 중인 Free 서비스는 먼저 `/health`의 응답을 기다립니다. 단순 **Restart service**는 새 커밋을 빌드하는 동작이 아닙니다. [배포·수동 재배포](https://render.com/docs/deploys)

## Step 13. 기존 Vercel 클라이언트에서 공개 연동 확인

**목적:** 기존 클라이언트가 새 서버 저장소를 그대로 사용하는지 확인합니다. **작업 위치:** 기존 Vercel 프로젝트의 대시보드와 Production 사이트.

1. React 클라이언트의 Vercel 프로젝트를 엽니다.
2. **Environment Variables**에서 `VITE_API_BASE_URL`이 Step 12의 **Render 기본 HTTPS 주소**인지 확인합니다. `/api/restaurants`는 붙이지 않습니다.
3. 적용 환경에 **Production**이 포함되는지 확인합니다. Preview에서도 검사한다면 Preview에도 같은 서버 주소를 적용합니다.
4. 환경변수 값을 변경했다면 저장하고 **Deployments → 해당 배포의 … → Redeploy**를 실행합니다.
5. Production 배포가 **Ready**이면 기존 정식 Production 도메인을 엽니다.

Vite의 `VITE_*` 값은 빌드에 반영되므로 값을 수정했으면 새 빌드·배포가 필요합니다. 로컬의 `.env.local`과 Vercel 설정은 별개입니다. [Vercel 환경변수 관리](https://vercel.com/docs/environment-variables/managing-environment-variables)

**정상 결과:** 실제 Production 사이트에서 다음이 확인됩니다.

- 목록과 상세에 Step 9의 등록 행이 보이고 새로고침 후에도 유지됩니다.
- 인기·분류 필터가 기존처럼 동작합니다.
- Network의 요청 대상이 localhost가 아닌 본인 Render 주소이고 상태는 200입니다.
- 이미지 없는 상세에서 불필요한 이미지 경고가 없습니다.
- Supabase의 행·공개 API 응답·화면의 ID와 정보가 일치합니다.
- 기존 관리자 수정·삭제 비활성과 LocalStorage 제보·좋아요 동작이 유지됩니다.

## 문제 발생 시 확인 순서

**설치·파일 작성 → 로컬 SQL 검사 → 실제 DB 읽기 → 로컬 API → Render API → Vercel 화면** 순서로 원인을 좁힙니다.

| 증상 | 확인·해결 |
| --- | --- |
| `npm ci` 잠금 파일 불일치 | package.json 작성·변경 후 `npm install --include=dev` 했는지 확인. 두 package 파일을 함께 기록 |
| `Cannot find module` 또는 타입 오류 | 지정한 파일·타입·테스트 네 개를 모두 작성했는지, import 경로와 대소문자 확인 |
| SUPABASE 환경변수 설정 오류 | 로컬은 루트 `.env`와 dotenv import, Render는 해당 서비스의 두 SUPABASE 변수 확인 |
| `42501` 권한 오류 | Publishable key 사용 여부, 서버용 Secret key, schema.sql의 GRANT·REVOKE 확인 |
| `PGRST205` 또는 테이블을 못 찾음 | 같은 프로젝트에 public.restaurants가 있는지, Data API와 대상 노출 상태, SQL 실행 결과 확인 |
| `/health`는 되지만 목록 실패 | `/health`는 DB를 읽지 않음. DB 변수·권한·테이블·Data API 점검 |
| `/`에서 404 | API 서버는 루트 화면이 없음. `/health`와 `/api/restaurants` 사용 |
| `EADDRINUSE` | 이전 dev/start 서버를 Ctrl+C로 종료하고 같은 포트에서 하나만 실행 |
| 빌드 후 `dist/server.js`를 못 찾음 | Build Command·Root Directory·빌드 성공 로그 확인 |
| JSON 파일 ENOENT | 직접 작성한 src/data/restaurants.json과 scripts/copy-data.ts, 빌드 데이터 복사 확인 |
| API에는 3건, DB에는 추가 행 | Render 소스가 이전 서버인지, pwd-week7/main의 실제 Live 배포·환경변수인지 확인 |
| 재시작 후 등록 행이 사라짐 | 메모리 서버를 배포했는지, 다른 Supabase 프로젝트에 연결했는지, 초기화 호출 여부 확인 |
| Vercel이 localhost·옛 주소로 요청 | VITE_API_BASE_URL 값·적용 환경·새 배포 여부 확인 |
| 수정한 TS 코드가 npm start에 미반영 | 소스 수정 후 npm run build를 다시 실행하고 서버 재시작 |

## 📝 제출 방법

### 마감일

- 2026년 11월 8일 23:59까지 (한국시간)

### GitHub URL

- Backend GitHub URL: `https://github.com/<username>/pwd-week7`
- Client GitHub URL: `https://github.com/<username>/pwd-week7-client`

### Render Service URL

(예: `https://<service-name>.onrender.com`)

### Vercel App URL

(예: `https://<project-name>.vercel.app`)

### 실습 체크리스트

- GitHub의 최신 커밋에 최종 소스·설정·SQL·`package-lock.json`·README가 포함되어 있는가?
- `npm run typecheck`, `npm test`, `npm run build`가 모두 통과하는가?
- Supabase 테이블에 맛집이 저장되고, 서버 재시작 후에도 같은 데이터가 유지되는가?
- Render에서 목록·상세·인기·등록 API가 정상 동작하는가?
- Vercel Production URL에서 목록·상세·인기 화면이 정상 동작하는가?
- 브라우저 Network 탭에서 실제 Render API 주소와 정상 응답을 확인했는가?
- 실제 `.env`가 Git에 포함되지 않았는가?

## 참고 문서

공식 참고: [Supabase Database](https://supabase.com/docs/guides/database/overview), [API keys](https://supabase.com/docs/guides/getting-started/api-keys), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL IDENTITY](https://www.postgresql.org/docs/current/ddl-identity-columns.html), [시퀀스](https://www.postgresql.org/docs/current/functions-sequence.html), [Render 배포](https://render.com/docs/deploys).
