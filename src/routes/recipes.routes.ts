import { Router } from 'express';
import {
  addToFavorites, generateRecipe,
  getFavorites,
  getRecipe,
  getRecipes,
  suppFromFavorites
} from '../controllers/recipes.controller';
import { checkToken } from '../middlewares/checkToken';
import { validateFields } from '../middlewares/fieldsValidation';
import { ingredientsSchema } from '../validators/recipes.schema';

const router = Router();

router.get('/', getRecipes);
router.post('/generateRecipe', checkToken(), validateFields(ingredientsSchema), generateRecipe);
router.get(
  '/favorites',
  checkToken(),
  getFavorites
);
router.post('/favorites/:recipe_id', checkToken(), addToFavorites);
router.delete('/favorites/:recipe_id', checkToken(), suppFromFavorites);
router.get('/:id', getRecipe);


export default router;
