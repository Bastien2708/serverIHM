import { Router } from 'express';
import {
  addToFavorites, generateRecipes,
  getRecipeById,
  getRecipes,
  deleteFromFavorites,
  updateRecipeById,
  deleteRecipeById,
  rateRecipe,
  getRecipeReviews,
  getFavoritesRecipes, saveGeneratedRecipe
} from '../controllers/recipes.controller';
import { checkMinRole } from '../middlewares/checkMinRole';
import { validateFields } from '../middlewares/fieldsValidation';
import { generateSchema, recipeReviewSchema, recipeSchema, updateRecipeSchema } from '../validators/recipes.schema';
import { optionalAuth } from '../middlewares/optionalAuth';
import { verifyRecipeToken } from '../middlewares/verifyRecipeToken';

const router = Router();

router.get('/favorites', checkMinRole('user'), getFavoritesRecipes);
router.post('/:id/favorites', checkMinRole('user'), addToFavorites);
router.delete('/:id/favorites', checkMinRole('user'), deleteFromFavorites);
router.get('/:id/reviews', checkMinRole('user'), getRecipeReviews);
router.post('/:id/rate', checkMinRole('user'), validateFields(recipeReviewSchema), rateRecipe);

router.get('/', optionalAuth, getRecipes);
router.post('/generate', checkMinRole('user'), validateFields(generateSchema), generateRecipes);
router.post('/save', checkMinRole('user'), validateFields(recipeSchema), verifyRecipeToken, saveGeneratedRecipe);

router.get('/:id', optionalAuth, getRecipeById);
router.patch('/:id', checkMinRole('user'), validateFields(updateRecipeSchema), updateRecipeById);
router.delete('/:id', checkMinRole('user'), deleteRecipeById);

export default router;
