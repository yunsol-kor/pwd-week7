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
