import { Router } from 'express';
import {
  addToFavorites, generateRecipe,
  getRecipeById,
  getRecipes,
  deleteFromFavorites, updateRecipeById, deleteRecipeById, rateRecipe, getRecipeReviews
} from '../controllers/recipes.controller';
import { checkMinRole } from '../middlewares/checkMinRole';
import { validateFields } from '../middlewares/fieldsValidation';
import { ingredientsSchema, recipeReviewSchema, updateRecipeSchema } from '../validators/recipes.schema';

const router = Router();

router.get(
  '/',
  getRecipes
);

router.post(
  '/generate',
  checkMinRole('user'),
  validateFields(ingredientsSchema),
  generateRecipe
);

router.post(
  '/:id/favorites',
  checkMinRole('user'),
  addToFavorites
);

router.post(
  '/:id/rate',
  checkMinRole('user'),
  validateFields(recipeReviewSchema),
  rateRecipe
);

router.get(
  '/:id/reviews',
  checkMinRole('user'),
  getRecipeReviews
);

router.delete(
  '/:id/favorites',
  checkMinRole('user'),
  deleteFromFavorites
);

router.patch(
  '/:id',
  checkMinRole('user'),
  validateFields(updateRecipeSchema),
  updateRecipeById
);

router.delete(
  '/:id',
  checkMinRole('user'),
  deleteRecipeById
);

router.get(
  '/:id',
  getRecipeById
);

export default router;
