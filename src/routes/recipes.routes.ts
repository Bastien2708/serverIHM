import { Router } from 'express';
import {
  addToFavorites, generateRecipe,
  getRecipeById,
  getRecipes,
  deleteFromFavorites,
  updateRecipeById,
  deleteRecipeById,
  rateRecipe,
  getRecipeReviews,
  getFavoritesRecipes
} from '../controllers/recipes.controller';
import { checkMinRole } from '../middlewares/checkMinRole';
import { validateFields } from '../middlewares/fieldsValidation';
import { ingredientsSchema, recipeReviewSchema, updateRecipeSchema } from '../validators/recipes.schema';
import { optionalAuth } from '../middlewares/optionalAuth';

const router = Router();

router.get('/favorites', checkMinRole('user'), getFavoritesRecipes);
router.post('/:id/favorites', checkMinRole('user'), addToFavorites);
router.delete('/:id/favorites', checkMinRole('user'), deleteFromFavorites);
router.get('/:id/reviews', checkMinRole('user'), getRecipeReviews);
router.post('/:id/rate', checkMinRole('user'), validateFields(recipeReviewSchema), rateRecipe);

router.get('/', optionalAuth, getRecipes);
router.post('/generate', checkMinRole('user'), validateFields(ingredientsSchema), generateRecipe);

router.get('/:id', optionalAuth, getRecipeById);
router.patch('/:id', checkMinRole('user'), validateFields(updateRecipeSchema), updateRecipeById);
router.delete('/:id', checkMinRole('user'), deleteRecipeById);

export default router;
