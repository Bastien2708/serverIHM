import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendError, sendSuccess } from '../middlewares/httpResponses';
import { fetchImageForRecipe, generateRecipeWithRetry } from '../utils/ai';
import { rolePriority, Roles } from '../types/role';
import { UpdateRecipePayload } from '../types/recipes';

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

export const updateRecipeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing id in request params');

  const requester = req.user;
  if ( !requester ) return sendError(res, 401, 'Unauthorized');

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('user_id')
    .eq('id', id)
    .single();

  if ( recipeError || !recipe ) return sendError(res, 404, 'Recipe not found');

  const isAuthor = recipe.user_id === requester.id;
  const requesterPriority = rolePriority[requester.role];

  if ( !isAuthor && requesterPriority < rolePriority[Roles.ADMIN] ) {
    return sendError(res, 403, 'You can only update your own recipes unless you have higher privileges');
  }

  const {
    title, description, ingredients, steps,
    kcal, carbs, protein, fat, image_url
  } = req.body as UpdateRecipePayload;

  const recipeUpdates: Partial<UpdateRecipePayload> = {};

  if ( title ) recipeUpdates.title = title;
  if ( description ) recipeUpdates.description = description;
  if ( ingredients ) recipeUpdates.ingredients = ingredients;
  if ( steps ) recipeUpdates.steps = steps;
  if ( typeof kcal === 'number' ) recipeUpdates.kcal = kcal;
  if ( typeof carbs === 'number' ) recipeUpdates.carbs = carbs;
  if ( typeof protein === 'number' ) recipeUpdates.protein = protein;
  if ( typeof fat === 'number' ) recipeUpdates.fat = fat;
  if ( image_url ) recipeUpdates.image_url = image_url;

  try {
    const { error: updateError } = await supabase
      .from('recipes')
      .update(recipeUpdates)
      .eq('id', id);

    if ( updateError ) return sendError(res, 500, `Failed to update recipe: ${updateError.message}`);

    const { data: updatedRecipe, error: fetchError } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if ( fetchError || !updatedRecipe ) return sendError(res, 500, 'Failed to fetch updated recipe');

    return sendSuccess(res, 200, 'Recipe updated successfully', updatedRecipe);
  } catch ( error ) {
    return sendError(res, 500, `Unexpected error during recipe update: ${error}`);
  }
};

export const deleteRecipeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const requester = req.user;

  if ( !id ) return sendError(res, 400, 'Missing recipe ID');
  if ( !requester ) return sendError(res, 401, 'Unauthorized');

  try {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select('*')
      .eq('id', id)
      .single();

    if ( error || !recipe ) {
      return sendError(res, 404, 'Recipe not found');
    }

    const isOwner = recipe.user_id === requester.id;
    const requesterPriority = rolePriority[requester.role];

    if ( !isOwner && requesterPriority < rolePriority[Roles.ADMIN] ) {
      return sendError(res, 403, 'You are not allowed to delete this recipe');
    }

    const { error: deleteError } = await supabase
      .from('recipes')
      .delete()
      .eq('id', id);

    if ( deleteError ) {
      return sendError(res, 500, `Failed to delete recipe: ${deleteError.message}`);
    }

    return sendSuccess(res, 200, 'Recipe deleted successfully', recipe);
  } catch ( err ) {
    return sendError(res, 500, `Unexpected error: ${err}`);
  }
};

export const addToFavorites = async (req: Request, res: Response) => {
  const { id: recipe_id } = req.params;
  const user = req.user;

  if ( !recipe_id ) return sendError(res, 400, 'Missing recipe ID in request');
  if ( !user ) return sendError(res, 401, 'Unauthorized');

  try {
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', recipe_id)
      .single();

    if ( recipeError || !recipe ) {
      return sendError(res, 404, 'Recipe not found');
    }

    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .single();

    if ( checkError === null && existing ) {
      return sendError(res, 400, 'Recipe is already in favorites');
    }

    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        recipe_id
      })
      .select()
      .single();

    if ( error ) return sendError(res, 500, `Failed to add to favorites: ${error.message}`);

    return sendSuccess(res, 201, 'Recipe added to favorites', data);
  } catch ( err ) {
    return sendError(res, 500, `Unexpected error: ${err}`);
  }
};

export const deleteFromFavorites = async (req: Request, res: Response) => {
  const { id: recipe_id } = req.params;
  const user = req.user;

  if ( !recipe_id ) return sendError(res, 400, 'Missing recipe ID in request');
  if ( !user ) return sendError(res, 401, 'Unauthorized');

  try {
    const { data: existing, error: checkError } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .single();

    if ( checkError === null && !existing ) {
      return sendError(res, 404, 'Recipe not in favorites');
    }

    const { data, error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('recipe_id', recipe_id)
      .select()
      .single();

    if ( error ) return sendError(res, 500, `Error deleting from favorites: ${error.message}`);

    return sendSuccess(res, 200, 'Recipe removed from favorites', data);
  } catch ( err ) {
    return sendError(res, 500, `Failed to delete from favorites: ${err}`);
  }
};

export const generateRecipe = async (req: Request, res: Response) => {
  const { ingredients } = req.body;

  const { user } = req;
  if ( !user ) return sendError(res, 401, 'User not found');

  try {
    const recipe = await generateRecipeWithRetry(ingredients);

    const { data: insertedRecipe, error: insertError } = await supabase
      .from('recipes')
      .insert({
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        kcal: recipe.kcal,
        carbs: recipe.carbs,
        protein: recipe.protein,
        fat: recipe.fat,
        user_id: user.id
      })
      .select()
      .single();

    if ( insertError ) return sendError(res, 500, `Database insertion error: ${insertError.message}`);

    const imageUrl = await fetchImageForRecipe(recipe.imageSearch);

    await supabase
      .from('recipes')
      .update({ image_url: imageUrl })
      .eq('id', insertedRecipe.id);

    return sendSuccess(res, 201, 'Recipe generated and saved successfully', {
      ...insertedRecipe,
      image_url: imageUrl,
    });
  } catch ( error ) {
    return sendError(res, 500, 'Server error during recipe generation' + error);
  }
};

export const rateRecipe = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing recipe ID in request params');

  const { rating, comment } = req.body;

  const { user } = req;
  if ( !user ) return sendError(res, 401, 'User not found');

  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

  if ( recipeError || !recipe ) return sendError(res, 404, 'Recipe not found');

  try {
    const { data: existingReview, error: existingReviewError } = await supabase
      .from('recipe_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('recipe_id', id)
      .maybeSingle();
    if ( existingReviewError ) return sendError(res, 500, `Failed to check existing review: ${existingReviewError.message}`);

    if ( existingReview ) {
      const { error: updateError } = await supabase
        .from('recipe_reviews')
        .update({
          rating,
          comment: comment !== undefined ? comment : existingReview.comment,
          updated_at: new Date()
        })
        .eq('id', existingReview.id);
      if ( updateError ) return sendError(res, 500, `Failed to update review: ${updateError.message}`);
      return sendSuccess(res, 200, 'Review updated successfully', recipe);
    }

    const { error } = await supabase
      .from('recipe_reviews')
      .insert({
        user_id: user.id,
        recipe_id: id,
        rating,
        comment,
      })
      .select();

    if ( error ) return sendError(res, 500, `Failed to add review: ${error.message}`);

    return sendSuccess(res, 201, 'Review added successfully', recipe);
  } catch ( error ) {
    return sendError(res, 500, `Error: ${error}`);
  }
};

export const getRecipeReviews = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing recipe ID in request params');

  try {
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .select('id')
      .eq('id', id)
      .single();

    if ( recipeError || !recipe ) return sendError(res, 404, 'Recipe not found');

    const { data: reviews, error: reviewsError } = await supabase
      .from('recipe_reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        updated_at,
        profiles ( id, name )
      `)
      .eq('recipe_id', id)
      .order('created_at', { ascending: false });

    if ( reviewsError ) return sendError(res, 500, `Failed to fetch reviews: ${reviewsError.message}`);

    return sendSuccess(res, 200, 'Reviews fetched successfully', reviews);
  } catch ( error ) {
    return sendError(res, 500, `Error: ${error}`);
  }
};
