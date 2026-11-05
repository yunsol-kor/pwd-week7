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
