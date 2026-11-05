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
