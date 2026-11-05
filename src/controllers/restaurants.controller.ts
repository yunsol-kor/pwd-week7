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
