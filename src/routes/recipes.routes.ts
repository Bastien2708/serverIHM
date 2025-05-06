import { Router } from 'express';
import {
  addToFavorites, generateRecipe,
  getRecipeById,
  getRecipes,
  deleteFromFavorites
} from '../controllers/recipes.controller';
import { checkMinRole } from '../middlewares/checkMinRole';
import { validateFields } from '../middlewares/fieldsValidation';
import { ingredientsSchema } from '../validators/recipes.schema';

const router = Router();

/**
 * @swagger
 * /api/recipes:
 *   get:
 *     summary: Retrieve all recipes
 *     tags: [Recipes]
 *     description: Fetch a list of all recipes in the database.
 *     responses:
 *       '200':
 *         description: A list of recipes.
 *       '500':
 *         description: Server error while fetching recipes.
 */
router.get(
  '/',
  getRecipes
);

/**
 * @swagger
 * /api/recipes/generate:
 *   post:
 *     summary: Generate a new recipe based on the provided ingredients
 *     tags: [Recipes]
 *     description: Generate a recipe using the provided ingredients and save it to the database.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ingredients:
 *                 type: string
 *                 description: A list of ingredients to generate a recipe from.
 *                 example: "chicken, broccoli, garlic, olive oil"
 *     responses:
 *       '201':
 *         description: Recipe generated and saved successfully.
 *       '400':
 *         description: Invalid input (ingredients).
 *       '500':
 *         description: Server error while generating the recipe.
 */
router.post(
  '/generate',
  checkMinRole('user'),
  validateFields(ingredientsSchema),
  generateRecipe
);

/**
 * @swagger
 * /api/recipes/favorites/{id}:
 *   post:
 *     summary: Add a recipe to the user's favorites
 *     tags: [Recipes]
 *     description: Add the recipe with the specified ID to the user's favorites list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the recipe to be added to favorites.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Recipe successfully added to favorites.
 *       '401':
 *         description: Unauthorized. User not logged in.
 *       '500':
 *         description: Server error while adding the recipe to favorites.
 */
router.post(
  '/favorites/:id',
  checkMinRole('user'),
  addToFavorites
);

/**
 * @swagger
 * /api/recipes/favorites/{id}:
 *   delete:
 *     summary: Remove a recipe from the user's favorites
 *     tags: [Recipes]
 *     description: Remove the recipe with the specified ID from the user's favorites list.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the recipe to be removed from favorites.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: Recipe successfully removed from favorites.
 *       '401':
 *         description: Unauthorized. User not logged in.
 *       '500':
 *         description: Server error while removing the recipe from favorites.
 */
router.delete(
  '/favorites/:id',
  checkMinRole('user'),
  deleteFromFavorites
);

/**
 * @swagger
 * /api/recipes/{id}:
 *   get:
 *     summary: Retrieve a single recipe by its ID
 *     tags: [Recipes]
 *     description: Fetch a single recipe from the database by its unique ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the recipe to be fetched.
 *         schema:
 *           type: integer
 *     responses:
 *       '200':
 *         description: The recipe data.
 *       '404':
 *         description: Recipe not found.
 *       '500':
 *         description: Server error while fetching the recipe.
 */
router.get(
  '/:id',
  getRecipeById
);

export default router;
