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
