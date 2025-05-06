import { Router } from 'express';
import {
  addToFavorites, generateRecipe,
  getRecipeById,
  getRecipes,
  deleteFromFavorites
} from '../controllers/recipes.controller';
import { checkToken } from '../middlewares/checkToken';
import { validateFields } from '../middlewares/fieldsValidation';
import { ingredientsSchema } from '../validators/recipes.schema';

const router = Router();

router.get(
  '/',
  getRecipes
);

router.post(
  '/generate',
  checkToken(),
  validateFields(ingredientsSchema),
  generateRecipe
);

router.post(
  '/favorites/:id',
  checkToken(),
  addToFavorites
);

router.delete(
  '/favorites/:id',
  checkToken(),
  deleteFromFavorites
);

router.get(
  '/:id',
  getRecipeById
);


export default router;
