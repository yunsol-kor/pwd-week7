# 7주차 실습 — 기존 FoodMap 서버의 Supabase 영구 저장

이 실습은 6주차 Express 서버의 **맛집 저장 위치를 메모리에서 Supabase PostgreSQL로 변경**한다. 기존 React 클라이언트가 사용하던 API 경로·요청·응답을 유지하면서, 등록한 맛집이 서버 종료 후에도 남는지 확인한다. 준비·실행 명령과 Render 설정값은 [프로젝트 README](../README.md)에 있다.

## 1. 학습 목표와 완료 범위

실습을 마치면 다음을 설명할 수 있어야 한다.

1. 브라우저·Express·Supabase가 각각 어떤 일을 하는가.
2. `schema.sql`의 테이블·자료형·제약조건·권한·함수가 무엇을 정의하는가.
3. `seed.sql`이 언제 원본 3건을 입력하고 언제 기존 데이터를 유지하는가.
4. API를 바꾸지 않고 저장소를 교체할 수 있는 이유는 무엇인가.
5. 서버 재시작과 DB·API·화면 대조로 영구 저장을 어떻게 확인하는가.

| 대상 | 6주차까지 | 이번 실습 완료 상태 |
| --- | --- | --- |
| 맛집 목록·상세·인기 | 원본 JSON에서 준비한 서버 메모리 | 매 요청 시 Supabase `restaurants` 조회 |
| 맛집 등록 | 서버 메모리에 추가 | DB에 INSERT, 생성된 행 반환 |
| 서버 재시작 | 메모리에 추가한 행 소멸 | DB에 저장한 행 유지 |
| 기존 초기화 데모 | 메모리의 원본 3건 복원 | DB의 원본 3건과 다음 ID 복원 |
| 제보·승인 상태·화면 좋아요 | 브라우저 LocalStorage | 기존 동작 유지 |
| 이미지 | 외부 URL 표시 | DB에 URL 문자열 저장, 파일은 기존 외부 서버 |

DB에는 `Restaurant`의 기존 10개 필드만 저장한다. `likes` 열이 있다는 사실은 브라우저 좋아요 상태를 DB와 동기화했다는 뜻이 아니다. 제보 테이블·사용자 인증·이미지 업로드·맛집 수정/삭제 API를 이번 실습에 추가하지 않는다. 강의 앞부분의 제보–맛집 관계 SQL은 별도의 설계 예제이며, 여기서 실행한 스키마와 구별한다.

## 2. Supabase를 사용하는 이유

Supabase는 PostgreSQL을 중심으로 데이터 접근 API와 관리 도구 등을 제공하는 오픈 소스 개발 플랫폼이다. 2020년 1월 개발을 시작했고, 2024년 4월 15일 GA를 발표했다. 2026년 4월 2일에는 GitHub 별 10만 개 달성을 발표했다. 이는 커뮤니티 관심 지표이며 DB 시장 점유율을 뜻하지 않는다. [개발 초기 기록](https://supabase.com/blog/supabase-how-we-launch), [GA 발표](https://supabase.com/ga), [2026년 커뮤니티 발표](https://supabase.com/blog/100000-github-stars)

2026년 11월 2일 확인한 공식 문서는 Database, Data API, Auth, Storage, Realtime 등 서비스를 안내한다. 이번 실습에서는 **Database와 Data API**를 사용한다. SQL로 저장 구조와 데이터 규칙을 정의하고, Express에서 기존 입력 검증과 응답 형식을 유지한다. DB 운영을 관리형 서비스에 맡겨도 애플리케이션의 데이터 모델과 API 설계는 개발자의 역할이다. [Database](https://supabase.com/docs/guides/database/overview), [Data API](https://supabase.com/docs/guides/api)

## 3. 서버 코드로 따라가는 Supabase 통신

**연결에 사용할 URL·키와 SDK를 준비하는 파일은 `src/config/supabase.ts`, 실제 조회·등록 요청을 보내는 파일은 `src/services/restaurants.service.ts`다.** 다음 순서로 파일을 열면 한 번의 목록 요청을 끝까지 따라갈 수 있다. 아래 코드는 현재 프로젝트 원문에서 발췌했으며, 예시를 위해 새 연결 함수를 만든 것이 아니다.

### 3-1. 먼저 열어 볼 파일과 역할

| 읽는 순서 | 실제 파일 | 찾을 코드 | 하는 일 |
| --- | --- | --- | --- |
| 1 | [server.ts](../server.ts) | `import 'dotenv/config'` 1행 | 로컬 `.env`를 읽어 환경변수 준비 |
| 2 | [src/config/supabase.ts](../src/config/supabase.ts) | `getSupabase()` 7행 · `createClient(...)` 16행 | Project URL·Secret key로 SDK 객체 준비·재사용 |
| 3 | [src/app.ts](../src/app.ts) | `app.use('/api/restaurants', restaurantsRouter)` 18행 | 맛집 요청을 라우터에 연결 |
| 4 | [src/routes/restaurants.routes.ts](../src/routes/restaurants.routes.ts) | `router.get('/', ...)` 6행 | 메서드·경로에 맞는 컨트롤러 선택 |
| 5 | [src/controllers/restaurants.controller.ts](../src/controllers/restaurants.controller.ts) | `getRestaurants` 22행 | 서비스 호출을 기다린 뒤 HTTP 응답 작성 |
| 6 | [src/services/restaurants.service.ts](../src/services/restaurants.service.ts) | `getAllRestaurants()` 28행 | SDK로 Supabase에 실제 데이터 요청 |
| 7 | [src/models/restaurant.model.ts](../src/models/restaurant.model.ts) | `Restaurant.fromDatabase(...)` 40행 | DB 열 이름을 기존 클라이언트 필드로 변환 |

`@supabase/supabase-js`는 Supabase 요청을 만드는 JavaScript 라이브러리, 즉 SDK다. Express가 `select()`·`insert()` 등을 사용하면 SDK가 Supabase Data API에 HTTP 요청을 보낸다. 프로젝트 URL은 HTTPS이므로 실제 배포 통신은 HTTPS다. Data API는 PostgreSQL 위에서 동작하는 PostgREST 기반 REST API다. [공식 Data API 설명](https://supabase.com/docs/guides/api)

```text
브라우저: GET /api/restaurants
  → src/app.ts: /api/restaurants 라우터 연결
  → routes/restaurants.routes.ts: getRestaurants 선택
  → controllers/restaurants.controller.ts: getAllRestaurants() 호출
  → services/restaurants.service.ts: getSupabase().from(...).select(...)
  → config/supabase.ts: 준비된 SDK 반환, 처음이면 생성
  → SDK가 Supabase Data API에 HTTPS 요청
  → PostgreSQL의 public.restaurants 조회
  → 서비스가 DB 행을 Restaurant으로 변환
  → 컨트롤러가 { data: restaurants } 응답
```

### 3-2. server.ts — 환경변수를 먼저 준비

[server.ts](../server.ts)의 첫 부분이다.

```ts
import 'dotenv/config';
import createApp from './src/app';

const PORT = Number(process.env.PORT) || 3000;
const app = createApp();
```

프로젝트 루트에서 실행하면 `dotenv/config`가 로컬 `.env`를 읽어 `process.env`에서 사용할 수 있게 한다. 이후 연결 설정 파일이 `process.env.SUPABASE_URL`과 `process.env.SUPABASE_SECRET_KEY`를 읽는다. Render에서는 대시보드에 저장한 환경변수를 실행 환경이 제공한다. 실제 값은 각자의 `.env` 또는 Render 설정에 두며 안내서에 복사하지 않는다.

### 3-3. src/config/supabase.ts — 요청에 사용할 SDK 객체 생성

[src/config/supabase.ts](../src/config/supabase.ts)의 연결 설정 코드다.

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
```

| 코드 | 읽는 방법 |
| --- | --- |
| `createClient` import | 설치한 Supabase SDK의 생성 함수를 가져옴 |
| `let client ...` | 생성한 SDK 객체를 보관할 변수 |
| `if (client) return client` | 이미 생성했다면 같은 SDK 객체 반환 |
| `process.env.SUPABASE_URL` | 요청할 Supabase 프로젝트의 기본 URL |
| `process.env.SUPABASE_SECRET_KEY` | 이 서버가 요청에 사용할 서버용 키 |
| 값 검사와 `throw new Error(...)` | 환경변수가 없거나 예시 값이면 요청 준비 중단 |
| `createClient<Database>(url, key, ...)` | URL·키·옵션을 가진 SDK 객체 생성 |
| `auth`의 세 옵션 `false` | 사용자 세션 저장·자동 갱신·URL의 로그인 세션 감지 기능 사용 안 함 |
| `return client` | 서비스를 호출한 쪽에 SDK 객체 전달 |

여기서 보관하는 `client`는 **요청 설정을 가진 SDK 객체**다. 조회한 맛집 배열이나 PostgreSQL에 직접 연결한 커넥션을 보관하는 변수가 아니다. `createClient(...)` 실행만으로 `restaurants`를 조회하거나 실제 DB 연결 성공을 검증하지 않는다. 아래 서비스의 요청을 `await`할 때 DB 접근 결과를 받는다. [SDK 초기화](https://supabase.com/docs/reference/javascript/initializing)

`<Database>`는 [src/types/database.types.ts](../src/types/database.types.ts)에 선언한 TypeScript 타입이다. 테이블·열·함수 이름과 값의 타입을 코드 작성·검사에 사용한다. 이 타입 파일이 실제 테이블을 생성하지는 않는다. 실제 구조는 SQL Editor에서 실행한 `supabase/schema.sql`로 만든다.

### 3-4. 라우터와 컨트롤러 — 목록 요청을 서비스로 전달

[src/app.ts](../src/app.ts)에서 다음 코드가 맛집 API의 공통 경로를 지정한다.

```ts
app.use('/api/restaurants', restaurantsRouter);
```

[src/routes/restaurants.routes.ts](../src/routes/restaurants.routes.ts)에서 GET의 하위 경로 `/`를 연결한다.

```ts
router.get('/', restaurantsController.getRestaurants);
```

두 경로가 합쳐져 **`GET /api/restaurants`**가 된다. 선택된 [src/controllers/restaurants.controller.ts](../src/controllers/restaurants.controller.ts)의 코드는 다음과 같다.

```ts
export const getRestaurants = asyncHandler<NoParams, RestaurantListResponse>(async (req, res) => {
  const restaurants = await restaurantService.getAllRestaurants();
  res.json({ data: restaurants });
});
```

컨트롤러는 `getAllRestaurants()`의 결과를 기다리고, 그 결과를 기존 `{ data: ... }` 형식으로 보낸다. Supabase URL·키·테이블 질의는 이 컨트롤러에 적지 않고 서비스와 연결 설정 파일에서 처리한다. `asyncHandler`는 이 비동기 처리에서 발생한 예외를 기존 오류 미들웨어로 넘긴다.

### 3-5. src/services/restaurants.service.ts — 실제 목록 조회

[src/services/restaurants.service.ts](../src/services/restaurants.service.ts)의 `getAllRestaurants()`가 Supabase에 목록을 요청한다. `RESTAURANT_COLUMNS`도 같은 파일에 정의되어 있다.

```ts
const RESTAURANT_COLUMNS = 'id,name,category,location,price_range,rating,description,recommended_menu,likes,image';
```

```ts
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
```

| 코드 | Supabase 요청에서의 의미 |
| --- | --- |
| `getSupabase()` | 앞 절의 설정 파일에서 SDK 객체 받기 |
| `.from('restaurants')` | 기본 `public` 스키마의 restaurants 테이블 선택 |
| `.select(RESTAURANT_COLUMNS)` | 기존 Restaurant의 10개 열 요청 |
| `.order('id', { ascending: true })` | DB에 id 오름차순 정렬 요청 |
| `await` | 요청의 결과가 준비될 때까지 이 함수의 후속 처리를 기다림 |
| `{ data, error }` | SDK가 제공하는 조회 데이터와 오류를 각각 받기 |
| `if (error) ...` | 오류가 있으면 정상 데이터 처리 대신 오류 전달 |
| `(data ?? []).map(...)` | 반환된 DB 행들을 기존 Restaurant 객체 배열로 변환 |
| `synchronousDemoSnapshot = ...` | 기존 동기 비교 데모가 읽을 마지막 결과 복사 |
| `return restaurants` | 컨트롤러에 변환한 목록 반환 |

`await`는 이 요청을 처리하는 함수의 후속 작업을 기다리게 한다. 6주차의 동기 파일 읽기처럼 네트워크 대기 동안 Node.js 전체를 멈추는 의미가 아니다. 동기 데모용 스냅샷을 갱신해도 일반 목록의 저장소는 매번 조회하는 실제 DB다.

### 3-6. src/models/restaurant.model.ts — DB 응답을 기존 필드로 변환

[src/models/restaurant.model.ts](../src/models/restaurant.model.ts)의 변환 코드다.

```ts
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
```

DB는 `price_range`, `recommended_menu`를 반환하지만 기존 React는 `priceRange`, `recommendedMenu`를 사용한다. 이 메서드가 이름을 맞춘다. 서비스에서 변환한 배열이 컨트롤러로 돌아오고, 앞서 본 `res.json({ data: restaurants })`가 HTTP 응답을 완성한다. 모델은 여기서 별도의 DB 요청을 보내지 않는다.

SDK가 반환하는 객체의 `data`는 **DB 요청 결과**다. 컨트롤러가 응답에 사용하는 `{ data: restaurants }`는 **우리 Express API의 기존 응답 형식**이다. 이름이 같지만 서로 다른 단계에서 만들어진다.

### 3-7. 상세와 인기 — 같은 연결 객체를 사용하는 다른 조회

상세 조회는 같은 [서비스 파일](../src/services/restaurants.service.ts)의 `getRestaurantById()`에서 수행한다. 아래는 요청 부분 발췌다.

```ts
const { data, error } = await getSupabase()
  .from('restaurants')
  .select(RESTAURANT_COLUMNS)
  .eq('id', numericId)
  .maybeSingle();
```

`.eq('id', numericId)`는 id가 같은 행이라는 조건이다. `.maybeSingle()`은 0행 또는 1행 결과를 다룬다. 행이 없으면 서비스가 `null`을 반환하고 기존 컨트롤러가 404를 응답한다. 질의 전에 ID가 안전한 양의 정수인지 검사하는 코드도 같은 함수에 있다.

인기 조회의 `getPopularRestaurants()`는 `getAllRestaurants()`로 DB 목록을 받은 다음, **기존처럼 Express 안에서** `rating` 내림차순 정렬과 `slice(0, limit)`를 수행한다. 목록의 DB 정렬인 id 오름차순과 인기 기준을 혼동하지 않는다.

### 3-8. 맛집 등록 — 입력 변환 후 INSERT 요청

등록 요청은 `POST /api/restaurants` → 라우터의 `createRestaurant` → 컨트롤러의 메뉴 정리 → 서비스의 `createRestaurant(payload)` 순서다. 서비스는 기존 필수 값 검사를 한 뒤 다음 객체를 만든다.

```ts
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
```

`row`는 기존 요청을 DB 열 이름으로 옮긴 입력 객체다. **id를 넣지 않으므로 DB의 IDENTITY가 생성한다.** 이어지는 실제 요청과 결과 처리다.

```ts
const { data, error } = await getSupabase()
  .from('restaurants')
  .insert(row)
  .select(RESTAURANT_COLUMNS)
  .single();
if (error) throwDatabaseError(error);
const restaurant = Restaurant.fromDatabase(data!);
synchronousDemoSnapshot = [...synchronousDemoSnapshot, new Restaurant(restaurant)];
return restaurant;
```

`.insert(row)`는 입력 객체로 새 행을 만든다. 뒤의 `.select(...)`는 **같은 INSERT 요청에서 저장된 행도 반환받겠다**는 뜻이다. INSERT 다음에 별도의 목록 GET 요청을 하나 더 보내는 코드는 아니다. `.single()`은 한 행 객체를 결과로 받겠다는 지정이다. `data!`의 `!`는 TypeScript의 non-null 단언이며 DB 요청이나 값 변환을 수행하지 않는다. [INSERT와 결과 반환](https://supabase.com/docs/reference/javascript/insert)

DB가 만든 id를 포함한 행을 모델로 변환해 반환하면, 컨트롤러의 다음 코드가 기존 성공 응답을 보낸다.

```ts
const restaurant = await restaurantService.createRestaurant(payload);
res.status(201).json({ data: restaurant });
```

### 3-9. 실제 HTTP 경로 — Express API와 Supabase Data API 구별

클라이언트가 호출하는 `/api/restaurants`는 우리가 만든 Express API다. 서버의 SDK가 호출하는 주소는 `SUPABASE_URL` 아래의 `/rest/v1/...`이다. 아래 표는 설치된 SDK의 기본 요청을 설명하기 위한 것으로, 실제 키나 프로젝트 식별자를 표시하지 않았다.

| 기존 클라이언트 → Express | Express의 서비스 코드 | SDK → Supabase Data API |
| --- | --- | --- |
| `GET /api/restaurants` | `.from('restaurants').select(...).order(...)` | `GET /rest/v1/restaurants` · 열·정렬은 쿼리 매개변수 |
| `GET /api/restaurants/4` | `.eq('id', 4).maybeSingle()` | `GET /rest/v1/restaurants` · `id=eq.4` 조건 |
| `POST /api/restaurants` | `.insert(row).select(...).single()` | `POST /rest/v1/restaurants` · JSON 본문에 row |
| `POST /api/restaurants/reset-demo` | `.rpc('reset_restaurant_demo_data')` | `POST /rest/v1/rpc/reset_restaurant_demo_data` |

예를 들어 목록 조회에는 다음과 같은 조회 조건이 들어간다. 실제 URL에서는 필요한 문자가 인코딩될 수 있다.

```text
GET {SUPABASE_URL}/rest/v1/restaurants
  ?select=id,name,category,location,price_range,rating,description,recommended_menu,likes,image
  &order=id.asc
```

SDK가 프로젝트 키를 포함한 요청 헤더와 URL·JSON 본문을 구성하고, Data API가 DB 역할·권한을 적용해 PostgreSQL에서 처리한다. Express가 `SELECT ...` SQL 문자열을 PostgreSQL 연결 드라이버로 직접 전송하는 구조는 아니다. SQL Editor에서 실행한 schema·seed와, 실행 중 SDK를 통해 보내는 데이터 요청을 구별한다. [Data API와 PostgREST](https://supabase.com/docs/guides/api)

초기화의 `rpc(...)`는 DB에 **이미 정의한 함수**를 원격 호출한다. 서비스 원문은 다음과 같다.

```ts
export async function resetStore(): Promise<void> {
  // 기존 reset-demo의 동작을 유지합니다. SQL 함수 안에서 전체 초기화를 처리합니다.
  const { error } = await getSupabase().rpc('reset_restaurant_demo_data');
  if (error) throwDatabaseError(error);
  synchronousDemoSnapshot = loadRestaurantsSync();
}
```

이 함수의 본문과 권한은 아래 SQL 해설에서 읽는다. 호출 시 추가 DB 맛집도 삭제되므로 통신 확인이나 영구 저장 확인을 위해 실행하지 않는다.

### 3-10. 오류와 연결 성공을 확인하는 위치

서비스의 `if (error) throwDatabaseError(error)`가 호출하는 함수도 [src/config/supabase.ts](../src/config/supabase.ts)에 있다.

```ts
export function throwDatabaseError(error: { code?: string; message: string }): never {
  console.error('[Supabase]', error.code ?? 'request', error.message);
  throw new HttpError(503, 'Supabase DB 요청에 실패했습니다.');
}
```

SDK 응답에 오류가 있으면 서버 로그에 코드·메시지를 기록하고 503 오류를 만든다. 컨트롤러의 `asyncHandler` → `next(error)` → [error.middleware.ts](../src/middleware/error.middleware.ts) 순서로 기존 `{ error: { message: ... } }` 응답을 보낸다. 환경변수 누락은 이 DB 응답 처리보다 앞의 `getSupabase()` 검사에서 발생하는 별도 설정 오류다.

실제 읽기 통신을 점검하는 코드는 [scripts/check-db.ts](../scripts/check-db.ts)에 있다. `npm run db:check`는 같은 `getSupabase()`로 10개 열을 `select`하고 `.limit(1)`로 최대 한 행만 요청한다. 데이터 등록·초기화를 수행하지 않는다. `/health`는 이 코드를 호출하지 않으므로 서버 실행 여부만 알려준다.

코드를 설명할 때는 다음 질문에 답할 수 있는지 확인한다. “URL·키는 어디서 읽는가?”는 `src/config/supabase.ts`, “실제 목록 요청은 어디인가?”는 서비스의 `await ...select(...)`, “기존 JSON 응답은 어디서 만드는가?”는 컨트롤러의 `res.json(...)`에서 찾는다.

## 4. 6주차 실습에서 Supabase 연동으로 바뀐 부분

비교 기준은 6주차 API를 완성한 `pwd-week7-server`의 커밋 **`1a5f9b2`**, 연동 결과는 `pwd-week7`의 **`7b76fdd`**다. 같은 메서드 이름 안의 저장 처리를 비교한다. 새 기능을 개발하는 목록이 아니라 이미 완료한 변경을 이해하기 위한 설명이다.

### 4-1. 파일별 변경 지도

| 파일 | 6주차 완료 코드 | Supabase 연동 코드 |
| --- | --- | --- |
| [server.ts](../server.ts) | Express 실행 | 첫 줄에 `import 'dotenv/config'` 추가 |
| [src/config/supabase.ts](../src/config/supabase.ts) | 없음 | URL·키를 읽어 SDK 생성, DB 오류 전달 |
| [src/services/restaurants.service.ts](../src/services/restaurants.service.ts) | JSON으로 준비한 `restaurantCache` 조회·추가 | SDK로 DB 조회·등록, 초기화 RPC |
| [src/models/restaurant.model.ts](../src/models/restaurant.model.ts) | 기존 Restaurant 생성자 | `fromDatabase()` 추가, DB 열 이름을 기존 필드로 변환 |
| [src/controllers/restaurants.controller.ts](../src/controllers/restaurants.controller.ts) | 초기화 함수 바로 호출 | `await restaurantService.resetStore()`로 DB 초기화 완료 대기 |
| [src/types/database.types.ts](../src/types/database.types.ts) | 없음 | DB 행·입력·함수의 TypeScript 타입 추가 |
| [supabase/schema.sql](../supabase/schema.sql) | 없음 | 테이블·권한·기존 초기화용 함수 정의 |
| [supabase/seed.sql](../supabase/seed.sql) | 없음 | 빈 테이블에만 원본 3건 입력 |
| [.env.example](../.env.example) · [.gitignore](../.gitignore) | 실제 `.env` 제외 | 서버 연결 변수 예시 추가, `.env.example`만 추적 허용 |
| [package.json](../package.json) · [package-lock.json](../package-lock.json) | Express·CORS 중심 의존성 | `@supabase/supabase-js`, `dotenv`와 연결 점검 명령 추가 |
| [scripts/check-db.ts](../scripts/check-db.ts) | 없음 | 같은 SDK로 실제 DB를 읽는 점검 코드 추가 |

자동 검증도 저장소 변경에 맞춰 조정했다. 서비스·라우트 검사는 [tests/helpers/supabase.ts](../tests/helpers/supabase.ts)의 가짜 DB 응답을 사용하고, [tests/schema.postgres.ts](../tests/schema.postgres.ts)는 로컬 PGlite에서 실제 SQL을 검증한다. PGlite·Emscripten 타입 의존성, `test:sql` 명령과 [tsconfig.json](../tsconfig.json)의 `emscripten` 타입은 이 **로컬 검사**를 위한 설정이다. 배포 서버가 PGlite를 DB로 사용하는 것은 아니다.

### 4-2. 목록 조회 — 메모리 복사에서 실제 DB 요청으로

6주차의 `src/services/restaurants.service.ts`는 시작할 때 JSON을 읽어 배열을 만들었다.

```ts
let restaurantCache: Restaurant[] = loadRestaurantsSync();
```

목록 메서드는 다음과 같았다.

```ts
export async function getAllRestaurants(): Promise<Restaurant[]> {
  await ensureCache();
  await simulateLatency();
  return cloneCollection(restaurantCache);
}
```

`ensureCache()`는 필요하면 원본 JSON으로 캐시를 준비하고, `simulateLatency()`는 비동기·동기 비교를 위한 대기 시간을 흉내 냈다. 결과는 서버 프로세스 안의 배열을 복사한 것이었다.

연동 후 같은 메서드의 핵심 부분은 다음 코드로 바뀌었다.

```ts
const { data, error } = await getSupabase()
  .from('restaurants')
  .select(RESTAURANT_COLUMNS)
  .order('id', { ascending: true });
if (error) throwDatabaseError(error);
const restaurants = (data ?? []).map(Restaurant.fromDatabase);
```

가짜 지연과 캐시 조회를 실제 네트워크 요청으로 바꿨다. 서비스 메서드는 계속 `Promise<Restaurant[]>`를 반환하므로 컨트롤러의 `await getAllRestaurants()`와 응답 형식은 유지된다.

상세도 `restaurantCache.find(...)`로 배열을 찾던 부분이 `.eq('id', numericId).maybeSingle()` DB 조건 조회로 바뀌었다. DB 결과가 없을 때 기존 404 응답을 보내는 컨트롤러 흐름은 유지한다.

### 4-3. 등록과 ID — 배열에 추가하던 값을 DB 행으로 저장

6주차에는 다음 함수가 메모리 배열에서 최대 ID를 구했다.

```ts
function nextRestaurantId(): number {
  return restaurantCache.reduce((max, restaurant) => Math.max(max, restaurant.id), 0) + 1;
}
```

`createRestaurant()`는 이 ID로 Restaurant을 만든 후 다음 코드로 배열에 추가했다. 아래는 원문 끝부분 발췌다.

```ts
restaurantCache = [...restaurantCache, restaurant];
return new Restaurant(restaurant);
```

연동 후에는 `nextRestaurantId()`를 제거했다. 서비스의 `row` 객체에는 id가 없고, SQL의 다음 정의가 값을 생성한다.

```sql
id bigint generated by default as identity primary key
```

저장하는 코드는 배열 대입에서 다음 DB 요청으로 바뀌었다.

```ts
const { data, error } = await getSupabase()
  .from('restaurants')
  .insert(row)
  .select(RESTAURANT_COLUMNS)
  .single();
```

`priceRange`·`recommendedMenu`를 DB의 `price_range`·`recommended_menu`로 바꾸어 입력하고, DB가 반환한 행은 `Restaurant.fromDatabase()`로 원래 필드명에 맞춘다. 기존 필수 값 검사와 등록 성공 시 `201`, `{ data: restaurant }` 응답은 유지했다. 서버가 재시작되어도 PostgreSQL에 이미 저장된 행은 남는다.

### 4-4. 초기화 — 동기 메모리 초기화를 비동기 RPC로 변경

6주차의 서비스는 JSON을 다시 읽어 배열을 바꾸는 동기 함수였다.

```ts
export function resetStore(): void {
  restaurantCache = loadRestaurantsSync();
}
```

지금은 앞 절의 `async resetStore(): Promise<void>`가 DB 함수 `reset_restaurant_demo_data`를 RPC로 호출한다. 처리 대상이 DB이므로 컨트롤러도 완료를 기다리도록 **한 줄** 바뀌었다.

6주차 컨트롤러:

```ts
restaurantService.resetStore();
```

연동 후 컨트롤러:

```ts
await restaurantService.resetStore();
```

이후의 `await getAllRestaurants()`는 초기화가 끝난 DB를 읽는다. 현재 초기화는 메모리만 비우는 동작이 아니며 DB의 추가 행까지 지운다.

### 4-5. 그대로 유지한 부분과 JSON 파일이 남아 있는 이유

비교 기준 커밋과 현재 소스를 대조하면 [src/app.ts](../src/app.ts), [라우터](../src/routes/restaurants.routes.ts), [기존 Restaurant 타입](../src/types/restaurant.types.ts), [오류 미들웨어](../src/middleware/error.middleware.ts), [asyncHandler](../src/utils/asyncHandler.ts)는 같다. 기존 경로·상태 코드·클라이언트 응답 계약을 이 구조 안에서 유지한다. 인기 목록의 평점 정렬 코드도 동일하며, 그 앞의 목록 조회가 DB를 사용하게 되었다.

[src/data/restaurants.json](../src/data/restaurants.json)도 원본 3건 그대로 남아 있다. `loadRestaurantsSync()`·`loadRestaurantsAsync()`는 6주차의 파일 읽기 비교를 위해 보존했다. 일반 목록·상세·인기의 저장소가 JSON이라는 뜻은 아니다.

동기 비교 API의 저장 변수는 `restaurantCache`에서 `synchronousDemoSnapshot`으로 바뀌었다. 서버 시작 시 JSON으로 준비한 뒤 일반 목록·등록 결과를 복사한다. **일반 API는 실제 DB, sync-demo는 마지막 결과의 메모리 스냅샷**이라는 차이를 설명해야 한다. 새 프로세스의 sync-demo를 DB의 최신 상태를 증명하는 용도로 사용하지 않는다.

6주차와의 핵심 차이는 “컨트롤러가 호출하는 서비스의 이름은 유지하면서, 그 안의 메모리 조회·추가를 Supabase 요청으로 교체하고, 서버 메모리 대신 DB에 데이터 수명을 맡겼다”는 것이다.


## 5. 실행 파일의 순서

Supabase 프로젝트를 생성하고 Data API를 활성화한 뒤 SQL Editor에서 아래 두 파일을 순서대로 실행한다. 이미 실행한 프로젝트는 상태를 확인하며 이어서 진행한다.

| 순서 | 원본 파일 | 실행 결과 |
| --- | --- | --- |
| 1 | [supabase/schema.sql](../supabase/schema.sql) | 테이블·객체 권한·기존 데모용 함수 정의 |
| 2 | [supabase/seed.sql](../supabase/seed.sql) | 테이블이 비어 있을 때만 원본 3건 입력 |
| 3 | 아래 확인용 SELECT | 현재 저장된 행 조회 |

`schema.sql`에서 함수를 **정의**하는 것과 그 함수를 **호출**하는 것은 다르다. 서버 시작·빌드·Render 재배포가 이 SQL 파일들을 자동 실행하지 않는다.

## 6. schema.sql 읽기 — 테이블과 열

### 저장 구조

```sql
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
```

- `public.restaurants`: `public` 스키마 안의 `restaurants` 테이블이다. 스키마는 DB 객체를 이름으로 구분하는 영역이다.
- `CREATE TABLE`: 열 이름·자료형·제약조건으로 테이블을 만든다.
- `IF NOT EXISTS`: 같은 이름의 테이블이 있으면 생성을 생략한다. 기존 열이나 제약조건을 수정하는 마이그레이션 명령은 아니다.
- `;`: SQL 문장의 끝이다. 열 정의 사이의 `,`는 항목을 구분한다.

### 열과 기존 응답의 대응

| DB 열 | 자료형 | 의미·기본값 | API 필드 |
| --- | --- | --- | --- |
| `id` | `bigint` | 자동 생성 식별자·기본 키 | `id` |
| `name` | `text` | 이름·기본값 없음 | `name` |
| `category` | `text` | 분류·기본값 없음 | `category` |
| `location` | `text` | 위치·기본값 없음 | `location` |
| `price_range` | `text` | 가격대·`정보 없음` | `priceRange` |
| `rating` | `numeric` | 소수 평점·`0` | `rating` |
| `description` | `text` | 설명·빈 문자열 | `description` |
| `recommended_menu` | `text[]` | 메뉴 문자열 배열·빈 배열 | `recommendedMenu` |
| `likes` | `integer` | 기존 Restaurant 필드·`0` | `likes` |
| `image` | `text` | 이미지 URL·빈 문자열 | `image` |

`text`는 문자열, `integer`와 `bigint`는 정수, `numeric`은 정확한 십진수, `text[]`는 문자열 배열이다. `image`는 이미지 파일의 바이너리가 아니다. [PostgreSQL 자료형](https://www.postgresql.org/docs/current/datatype.html)

### 자동 ID와 기본 키

`GENERATED BY DEFAULT AS IDENTITY`는 ID를 생략하면 연결된 시퀀스로 값을 만든다. `BY DEFAULT`이므로 원본 입력처럼 ID `1`, `2`, `3`을 명시할 수도 있다. `PRIMARY KEY`는 식별자의 중복과 NULL을 막는다. 값 자동 생성과 고유성 검사는 서로 다른 역할이며, ID가 빈 번호 없이 연속한다는 보장은 없다. [IDENTITY](https://www.postgresql.org/docs/current/ddl-identity-columns.html)

### NOT NULL과 DEFAULT

`NOT NULL`은 SQL NULL 저장을 금지한다. `''`는 길이 0의 문자열이며 NULL과 다르다. 따라서 이름·분류·위치의 공백 검사는 기존 Express 로직에서도 수행한다. `DEFAULT`는 열을 생략하거나 DEFAULT를 지정했을 때 적용한다. 명시적으로 NULL을 보내면 기본값으로 바뀌는 것이 아니라 NOT NULL 위반이 된다. [제약조건](https://www.postgresql.org/docs/current/ddl-constraints.html), [기본값](https://www.postgresql.org/docs/current/ddl-default.html)

`recommended_menu`의 `'{}'`는 빈 배열이다. 초기 데이터의 `array['떡볶이', '튀김', '순대', '어묵']::text[]`는 원소를 나열하고 `text[]` 타입을 지정한 표현이다. `::`는 PostgreSQL의 타입 변환 표기다. [배열](https://www.postgresql.org/docs/current/arrays.html)

## 7. schema.sql 읽기 — 접근 권한

```sql
alter table public.restaurants enable row level security;
revoke all on table public.restaurants from anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, delete on table public.restaurants to service_role;
grant usage, select, update on sequence public.restaurants_id_seq to service_role;
```

| 구문·대상 | 역할 |
| --- | --- |
| `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | 기존 테이블에 RLS 활성화 |
| `REVOKE ... FROM anon, authenticated` | 두 역할의 테이블 권한 회수 |
| `GRANT USAGE ON SCHEMA` | 해당 스키마의 객체를 사용할 기반 권한 |
| `GRANT SELECT, INSERT, DELETE ON TABLE` | 조회·등록·초기화 삭제 허용 |
| `GRANT ... ON SEQUENCE` | 별도 객체인 ID 시퀀스의 사용·조회·재설정 권한 |
| `TO service_role` | 권한을 받는 DB 역할 지정 |

`GRANT`와 `REVOKE`는 객체의 접근 권한을 바꾸며 데이터 행을 추가·삭제하지 않는다. 스키마·테이블·시퀀스는 권한 대상이 각각 다르다. 시퀀스의 UPDATE는 `setval`에 필요하다. 테이블 DELETE는 기존 초기화 데모를 유지하기 위한 것이며 맛집 삭제 API를 새로 추가한 것이 아니다. [권한](https://www.postgresql.org/docs/current/ddl-priv.html), [GRANT](https://www.postgresql.org/docs/current/sql-grant.html)

RLS는 일반 역할이 접근할 **행**을 정책으로 제한한다. 객체 권한을 주는 GRANT와 별도의 계층이다. 이번 실습은 브라우저의 DB 직접 접근을 열지 않는다. 로그인 없는 Publishable key 요청의 `anon`과 사용자 인증 요청의 `authenticated`에 테이블 권한을 주지 않고, 서버 Secret key의 `service_role`로 접근한다. `service_role`은 RLS를 우회하지만 객체의 SQL 권한은 필요하다. SQL Editor 관리자 조회 성공만으로 서버의 DB 연결 성공을 판정할 수 없다. [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [API 키와 역할](https://supabase.com/docs/guides/getting-started/api-keys)

## 8. schema.sql 읽기 — 기존 초기화 데모용 함수

함수 원문은 [schema.sql](../supabase/schema.sql)에 있다. 긴 INSERT의 외부 이미지 주소를 바꾸거나 생략한 SQL을 실행하지 않고 원본 파일을 사용한다.

### 함수 선언

| 표현 | 의미 |
| --- | --- |
| `CREATE OR REPLACE FUNCTION` | DB에 함수를 생성하거나 같은 함수의 정의 교체 |
| `public.reset_restaurant_demo_data()` | 스키마·함수 이름, 입력 인자 없음 |
| `RETURNS void` | 호출자에게 의미 있는 데이터 값을 반환하지 않음 |
| `LANGUAGE plpgsql` | SQL에 조건·블록 등을 더한 PostgreSQL 절차 언어 사용 |
| `SECURITY INVOKER` | 함수 소유자가 아닌 호출한 역할의 권한으로 실행 |
| `SET search_path = ''` | 접두어 없는 이름의 검색 경로를 비우고 사용할 객체를 명시 |
| `AS $$ ... $$` | 함수 본문 문자열의 시작·끝 |
| `BEGIN ... END;` | PL/pgSQL 문장 블록의 시작·끝 |

`public.restaurants`와 `pg_catalog.setval`처럼 스키마를 명시한다. `pg_catalog`는 PostgreSQL 시스템 객체의 스키마다. `BEGIN/END` 블록은 트랜잭션을 시작·커밋하는 SQL 명령 `BEGIN/COMMIT`과 구별한다. [함수 정의](https://www.postgresql.org/docs/current/sql-createfunction.html), [블록 구조](https://www.postgresql.org/docs/current/plpgsql-structure.html)

### 함수 본문의 처리 순서

1. `LOCK TABLE ... IN EXCLUSIVE MODE`: 트랜잭션이 끝날 때까지 다른 쓰기 작업 등을 제한한다. 보통의 SELECT는 가능하다.
2. `DELETE FROM public.restaurants`: WHERE가 없으므로 추가한 행을 포함해 모두 지운다. 열 구조는 남는다.
3. `INSERT INTO ... (열 목록) VALUES ...`: 지정한 열 순서대로 송림식당·별미떡볶이·SOGO의 원본 3행을 입력한다. 원본 JSON과 모든 필드가 같다.
4. `PERFORM pg_catalog.setval(...)`: 다음 자동 ID가 원본 3개 뒤에서 시작하도록 번호 상태를 맞춘다.

함수 호출은 호출한 SQL의 트랜잭션 안에서 실행된다. 처리하지 않은 오류가 발생하면 삭제와 INSERT의 **행 변경은 함께 롤백**된다. 시퀀스의 `setval` 변경은 PostgreSQL에서 롤백되지 않으므로 모든 상태가 롤백된다고 설명하지 않는다. 실패 검사는 INSERT 단계에서 오류를 발생시켜 기존 행의 보존을 확인한 것이다. [트랜잭션](https://www.postgresql.org/docs/current/tutorial-transactions.html), [잠금](https://www.postgresql.org/docs/current/explicit-locking.html)

### 다음 ID를 4로 맞추는 구문

```sql
perform pg_catalog.setval(
  pg_catalog.pg_get_serial_sequence('public.restaurants', 'id'),
  3,
  true
);
```

`pg_get_serial_sequence`는 해당 열에 연결된 시퀀스의 이름을 구한다. `setval(..., 3, true)`는 3을 이미 사용한 상태로 설정하므로, 기본 증가폭 1인 이 시퀀스의 다음 값은 4다. 원본 ID를 직접 INSERT하는 것만으로 시퀀스가 3으로 조정되지는 않는다. `PERFORM`은 PL/pgSQL에서 반환값을 받지 않고 함수를 실행하는 문장이다. [시퀀스 함수](https://www.postgresql.org/docs/current/functions-sequence.html), [PERFORM](https://www.postgresql.org/docs/current/plpgsql-statements.html)

### 함수 실행 권한

```sql
revoke all on function public.reset_restaurant_demo_data()
  from public, anon, authenticated;
grant execute on function public.reset_restaurant_demo_data()
  to service_role;
```

`ON FUNCTION`은 권한 대상, `EXECUTE`는 호출 권한이다. `FROM public`의 PUBLIC은 **모든 역할**을 뜻하며, `public.restaurants`의 스키마 이름과 다르다. Express의 기존 `POST /api/restaurants/reset-demo`는 SDK `rpc('reset_restaurant_demo_data')`로 이 함수를 호출한다. INVOKER이므로 호출자는 EXECUTE뿐 아니라 본문에서 사용하는 테이블·시퀀스 권한도 필요하다.

**이 API는 추가한 DB 맛집까지 삭제한다. 영구 저장 검증에서 호출하지 않는다.** 최초 시딩이 끝난 뒤 배포·재시작에 맞춰 반복 호출하는 기능도 아니다.

## 9. seed.sql 읽기 — 비어 있을 때만 입력

```sql
do $$
begin
  if not exists (select 1 from public.restaurants) then
    perform public.reset_restaurant_demo_data();
  end if;
end;
$$;
```

`DO $$ ... $$`는 이름을 DB에 저장하지 않고 한 번 실행하는 블록이다. 이 경우 기본 언어는 PL/pgSQL이다. `SELECT 1 FROM ...`은 각 행에 대해 상수 1을 반환하며, `EXISTS`는 결과 행이 있는지 검사한다. `NOT EXISTS`이므로 **행이 없을 때만** THEN 아래 함수를 호출한다. `END IF`는 조건문의 끝, `END`는 블록의 끝이다. [DO](https://www.postgresql.org/docs/current/sql-do.html), [EXISTS](https://www.postgresql.org/docs/current/functions-subquery.html)

| 실행 전 | seed.sql 실행 후 |
| --- | --- |
| 0건 | 함수 호출 → 원본 3건·다음 ID 4 준비 |
| 원본 3건 | 함수 호출 생략 → 기존 값 유지 |
| 추가 등록 포함 4건 | 함수 호출 생략 → 추가 데이터도 유지 |

테이블 생성문의 `IF NOT EXISTS`는 **테이블 객체**, seed의 `IF NOT EXISTS (...)`는 **조회 결과 행**을 확인한다. 이 스크립트의 순차 재실행은 기존 데이터를 보존하지만, 임의의 잘못된 스키마를 복구하는 도구는 아니다.

## 10. SQL → 서버 → 화면 검증 절차

### 저장 상태 조회

아래 SQL은 조회만 수행한다. 이미 추가한 데이터가 있으면 원본 3건보다 많을 수 있다.

```sql
select id, name, price_range, rating, recommended_menu
from public.restaurants
order by id;
```

서버 루트에서 `npm run db:check`로 연결·열 이름을 확인한 뒤 실행한다. 이 명령은 실제 Supabase에 쓰지 않는다. 로컬 Express와 배포된 Express가 같은 DB에 연결되면 로컬 등록도 그 DB에 남는다.

### 영구 저장 확인

이 절차는 앞서 실제 프로젝트에서 완료한 검증을 재현할 때 사용한다. 다시 실행하면 새로운 행이 추가된다. 결과 ID는 4라고 가정하지 않고 응답 값을 사용한다.

1. 로컬 서버의 기존 `POST /api/restaurants`에 이름·분류·위치·메뉴를 보내 등록한다. 요청 예시는 README에 있다.
2. 응답이 `201`이고 `data.id`가 있는지 확인한다. 그 ID의 상세 응답과 Table Editor 행의 값이 같은지 비교한다.
3. Express 프로세스를 완전히 종료하고 같은 환경변수로 새로 실행한다. 단순 브라우저 새로고침과 구별한다.
4. 같은 ID의 상세와 목록을 조회해 모든 필드가 유지되는지 확인한다. 원본 3건도 그대로인지 비교한다.
5. 초기화 API를 호출하지 않는다. 배포된 기존 DB를 정리하려고 임의로 reset하지 않는다.

### 배포와 클라이언트 확인

Render의 기존 서비스는 `pwd-week7/main`을 빌드하고, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`를 서버 환경변수로 사용한다. Vercel은 기존 `VITE_API_BASE_URL=https://ajou-food-map.onrender.com`으로 Express를 호출한다. 실제 키는 `.env`와 Render에만 설정한다.

1. `/health` 200으로 Express 실행을 확인한다. 이 응답만으로 DB 연결이 증명되지는 않는다.
2. `/api/restaurants`와 실제 Supabase의 ID·값·행 수를 비교한다.
3. `/api/restaurants/:id`와 `/api/restaurants/popular?limit=2`를 확인한다. 인기는 기존 `rating` 내림차순이다.
4. 기존 Vercel의 목록·분류 필터·상세·인기 화면이 같은 데이터를 표시하는지 확인한다.
5. 이미지 URL이 빈 문자열인 상세에서 이미지 요소가 생기지 않고 콘솔 오류가 없는지 확인한다.

## 11. 완료한 실제 검증 결과

2026년 11월 2일 한국 시간 기준, 앞서 수행한 실제 Supabase 검증과 배포 연동 결과다. 현재 데이터가 이후 변경되면 행 수와 ID는 달라질 수 있다.

| 검사 | 관찰 결과 |
| --- | --- |
| 실제 DB 등록 | `201` · `id=4` · `DB 영구 저장 검증 9179fe62` |
| 로컬 서버 프로세스 변경 | PID `6336 → 6337`, 같은 포트에서 재실행 |
| 재시작 후 데이터 | 상세 응답·DB 행의 모든 필드 동일, 원본 3건 유지 |
| 초기화 호출 | 호출하지 않음, 검증용 행 유지 |
| 실제 Supabase ↔ Render | 4건 모두 일치, 상세도 DB와 일치 |
| 목록·상세·인기·동기 데모 | 기존 경로 200, 없는 ID 404 |
| 브라우저 요청 허용 | OPTIONS 204, 기존 CORS 동작 유지 |
| Vercel 클라이언트 | 목록 4건·한식 필터 2건·상세 재조회·평점순 인기 정상 |
| 이미지 없는 상세 | 이미지 요소 0개, 콘솔 오류 없음 |
| 관리자 화면 | 목록 4건, 기존 수정·삭제 비활성 유지 |

`sync-demo`는 동기 실행을 비교하는 메모리 스냅샷이다. 서버 시작 시 원본 JSON을 읽고 이후 목록·등록 결과를 반영한다. **DB를 동기로 조회하는 API가 아니며** 일반 목록·상세·인기는 DB에서 읽는다. 또한 공개 API는 배포 SHA를 반환하지 않으므로, 커밋 SHA 확인과 기능 검증은 구별한다.

실제 DB 재시작 검증, 배포 API 조회, 브라우저 확인은 서로 다른 증거다. 자동 검사는 가짜 DB 응답 기반 서비스·라우트 28건과 로컬 PostgreSQL(PGlite) SQL 6건이며, 실제 Supabase를 쓰는 검사와 혼동하지 않는다. SQL 검사는 원본 초기 데이터 일치·seed 재실행 보존·자동 ID와 기본값·배열·DB 재개방 후 유지·초기화·실패 시 행 롤백·역할 권한을 검증한다.

## 12. 실제 오류에서 확인한 점

| 증상 | 확인한 원인·해결 |
| --- | --- |
| Publishable key로 `42501` | 서버가 anon 권한으로 테이블에 접근. 서버용 `sb_secret_` Secret key로 교체 |
| 로컬 연결은 되지만 Render 오류 | 해당 Render 서비스에 두 SUPABASE 변수가 빠짐. 추가 후 재배포 |
| 공개 API 3건·실제 DB 4건 | 배포 소스가 원래 `pwd-week7-server`인지 `pwd-week7`인지와 Live 상태 확인 |

완료 기준은 SQL 구문을 설명하고, 기존 API로 등록한 같은 데이터가 서버 재시작 후 DB·API·화면에 남는 것을 확인하는 것이다.
