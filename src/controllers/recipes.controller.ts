import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendError, sendSuccess } from '../middlewares/httpResponses';
import { fetchImageForRecipe, generateRecipeWithRetry } from '../utils/ai';

export const getRecipes = async (_: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from('recipes').select('*');
    if ( error ) return sendError(res, 400, error.message);
    return sendSuccess(res, 200, 'Recipes retrieved successfully', data);
  } catch ( error ) {
    return sendError(res, 500, `Failed to retrieve recipes: ${error}`);
  }
};

export const getRecipeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing id in request params');
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();
    if ( error ) return sendError(res, 400, error.message);
    return sendSuccess(res, 200, 'Recipe retrieved successfully', data);
  } catch ( error ) {
    return sendError(res, 500, `Failed to retrieve recipe: ${error}`);
  }
};

export const addToFavorites = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing id in request params');
  try {
    const { user } = req;
    if ( !user ) return sendError(res, 401, 'User not found');

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        recipe_id: id
      }).select();

    if ( error ) {
      if ( error.code === '23505' )
        return sendError(res, 409, 'Recipe already in favorites');
      return sendError(res, 500, `Error adding to favorites: ${error.message}`);
    }

    return sendSuccess(res, 201, 'Recipe added to favorites', data);
  } catch ( error ) {
    return sendError(res, 500, `Failed to add to favorites: ${error}`);
  }
};

export const deleteFromFavorites = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing id in request params');
  try {
    const { user } = req;
    if ( !user ) return sendError(res, 401, 'User not found');

    const { data, error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', id)
      .select();
    if ( !data || data.length === 0 ) return sendError(res, 404, 'Recipe not found in favorites');

    if ( error ) return sendError(res, 500, `Error deleting from favorites: ${error}`);
    return sendSuccess(res, 200, 'Recipe removed from favorites', data);
  } catch ( error ) {
    return sendError(res, 500, `Failed to delete from favorites: ${error}`);
  }
};

export const generateRecipe = async (req: Request, res: Response) => {
  const { ingredients } = req.body;

  const { user } = req;
  if ( !user ) return sendError(res, 401, 'User not found');

  try {
    // 1. Generate recipe with retry
    const recipe = await generateRecipeWithRetry(ingredients);

    // 2. Save to Supabase
    const { data: insertedRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        kcal: recipe.nutrition.kcal,
        carbs: recipe.nutrition.carbs,
        protein: recipe.nutrition.protein,
        fat: recipe.nutrition.fat,
      })
      .select()
      .single();

    if ( insertError ) {
      return sendError(res, 500, `Database insertion error: ${insertError.message}`);
    }

    // 3. Fetch image
    const searchQuery = `${recipe.title} ${ingredients}`;
    const imageUrl = await fetchImageForRecipe(searchQuery);

    // 4. Update recipe with image
    await supabase
      .from('recipes')
      .update({ image_url: imageUrl })
      .eq('id', insertedRecipe.id);

    return sendSuccess(res, 201, 'Recipe generated and saved successfully', {
      recipe: {
        ...insertedRecipe,
        image_url: imageUrl,
      },
    });
  } catch ( error ) {
    console.error('💥 Unexpected error:', error);
    return sendError(res, 500, 'Server error during recipe generation');
  }
};

