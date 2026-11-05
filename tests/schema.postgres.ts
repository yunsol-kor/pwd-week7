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

test('초기 데이터는 6주차 JSON과 모든 필드가 같고 재실행해도 기존 행을 보존한다', async () => {
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
