import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { sendError, sendSuccess } from '../middlewares/httpResponses';
import { fetchImageForRecipe, generateRecipeWithRetry } from '../utils/ai';
import { rolePriority, Roles } from '../types/role';
import { UpdateRecipePayload } from '../types/recipes';
import { signRecipe } from '../middlewares/verifyRecipeToken';

export const getRecipes = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id ?? null;

    const { limit, sort } = req.query;

    const parsedLimit = limit ? parseInt(limit as string, 10) : null;
    const safeLimit = parsedLimit && parsedLimit > 0 && parsedLimit <= 100 ? parsedLimit : null;

    const sortField = sort ? (sort as string).replace('-', '') : 'created_at';
    const sortOrder = sort?.toString().startsWith('-') ? 'desc' : 'asc';

    let query = supabase
      .from('recipes')
      .select(`
        id,
        title,
        description,
        ingredients,
        steps,
        kcal,
        carbs,
        protein,
        fat,
        image_url,
        created_at,

        user_id,
        user_id ( id, name ),

        recipe_reviews (
          id,
          user_id ( id, name ),
          rating,
          comment,
          created_at,
          updated_at
        ),

        favorites!left(user_id)
      `)
      .order(sortField, { ascending: sortOrder === 'asc' });

    if ( safeLimit ) query = query.limit(safeLimit);

    const { data, error } = await query;
    if ( error ) return sendError(res, 400, error.message);

    const enrichedRecipes = data.map(recipe => {
      const { recipe_reviews = [], favorites = [], user_id: creatorProfile } = recipe;

      const averageRating =
        recipe_reviews.length > 0
          ? recipe_reviews.reduce((sum, r) => sum + r.rating, 0) / recipe_reviews.length
          : null;

      const isFavorite = userId ? favorites.some(fav => fav.user_id === userId) : false;

      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description,
        ingredients: recipe.ingredients,
        steps: recipe.steps,
        kcal: recipe.kcal,
        carbs: recipe.carbs,
        protein: recipe.protein,
        fat: recipe.fat,
        image_url: recipe.image_url,
        created_at: recipe.created_at,

        creator: {
          id: creatorProfile?.id,
          name: creatorProfile?.name,
        },

        average_rating: averageRating,
        reviews: recipe_reviews.map(r => {
          const authorData = Array.isArray(r.user_id) ? r.user_id[0] : r.user_id;

          return {
            author: {
              id: authorData?.id ?? '',
              name: authorData?.name ?? '',
            },
            id: r.id,
            recipe_id: recipe.id,
            comment: r.comment,
            rating: r.rating,
            updated_at: r.updated_at,
          };
        }),

        is_favorite: isFavorite,
      };
    });

    return sendSuccess(res, 200, 'Recipes retrieved successfully', enrichedRecipes);
  } catch ( error ) {
    return sendError(res, 500, `Failed to retrieve recipes: ${error}`);
  }
};

export const getRecipeById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if ( !id ) return sendError(res, 400, 'Missing id in request params');

  try {
    const userId = req.user?.id ?? null;

    const recipe = await getEnrichedRecipeById(id, userId);
    return sendSuccess(res, 200, 'Recipe retrieved successfully', recipe);

  } catch ( error ) {
    return sendError(res, 500, `Failed to retrieve recipe: ${error instanceof Error ? error.message : error}`);
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

export const generateRecipes = async (req: Request, res: Response) => {
  const { ingredients, mealType, dietType } = req.body;
  try {
    const sanitizeIngredient = (ingredient: string) =>
      ingredient
        .replace(/ignore.*?$/i, '')
        .replace(/[^a-zA-Z0-9À-ÿ, \-']/g, '')
        .trim();
    const sanitizedIngredients = ingredients.map(sanitizeIngredient).filter(Boolean);
    if ( sanitizedIngredients.length === 0 )
      return sendError(res, 400, 'No valid ingredients provided');

    const result = await generateRecipeWithRetry(sanitizedIngredients, mealType, dietType);

    if ( result.status === 'ai_error' ) {
      return sendError(res, 400, result.message);
    }

    if ( result.status === 'invalid_format' ) {
      return sendError(res, 500, 'Invalid response from AI');
    }
    const recipes = result.data;

    const recipesWithImagesAndTokens = await Promise.all(
      recipes.map(async (recipe) => {
        const image_url = await fetchImageForRecipe(recipe.imageSearch);
        const fullRecipe = { ...recipe, image_url };
        const token = signRecipe(fullRecipe);
        return { recipe: fullRecipe, token };
      })
    );

    return sendSuccess(res, 200, 'Recipes generated successfully', recipesWithImagesAndTokens);
  } catch ( error ) {
    return sendError(res, 500, 'Server error during recipe generation: ' + error);
  }
};

export const saveGeneratedRecipe = async (req: Request, res: Response) => {
  const recipe = req.body;
  const { user } = req;
  if ( !user ) return sendError(res, 401, 'User not found');

  try {
    const token = signRecipe(recipe);

    const { data: existingRecipes, error: selectError } = await supabase
      .from('recipes')
      .select('id')
      .eq('user_id', user.id)
      .eq('hash', token)
      .maybeSingle();

    if (selectError) {
      return sendError(res, 500, 'Database lookup error: ' + selectError.message);
    }

    if (existingRecipes) {
      return sendError(res, 409, 'Recipe already exists');
    }

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
        image_url: recipe.image_url,
        user_id: user.id,
        hash: token,
      })
      .select()
      .single();

    if (insertError) {
      return sendError(res, 500, 'Database insertion error: ' + insertError.message);
    }

    const recipeAdded = await getEnrichedRecipeById(insertedRecipe.id, user.id);
    return sendSuccess(res, 201, 'Recipe saved successfully', recipeAdded);
  } catch ( error ) {
    return sendError(res, 500, 'Server error during recipe save: ' + error);
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
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if ( recipeError || !recipe ) return sendError(res, 404, 'Recipe not found');

  try {
    const { data: existingReview, error: existingReviewError } = await supabase
      .from('recipe_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('recipe_id', id)
      .maybeSingle();

    if ( existingReviewError )
      return sendError(res, 500, `Failed to check existing review: ${existingReviewError.message}`);

    if ( existingReview ) {
      // Construction dynamique de l'objet d'update
      const updatePayload: any = { rating, updated_at: new Date() };
      if ( 'comment' in req.body ) {
        updatePayload.comment = comment;
      }
      const { error: updateError } = await supabase
        .from('recipe_reviews')
        .update(updatePayload)
        .eq('id', existingReview.id);

      if ( updateError ) return sendError(res, 500, `Failed to update review: ${updateError.message}`);
    } else {
      const { error } = await supabase
        .from('recipe_reviews')
        .insert({
          user_id: user.id,
          recipe_id: id,
          rating,
          comment: 'comment' in req.body ? comment : null
        });

      if ( error ) return sendError(res, 500, `Failed to add review: ${error.message}`);
    }

    const enrichedRecipe = await getEnrichedRecipeById(id, user.id);
    return sendSuccess(res, 200, 'Review saved successfully', enrichedRecipe);

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

export const getFavoritesRecipes = async (req: Request, res: Response) => {
  console.log('Fetching favorite recipes');
  const user = req.user;
  if ( !user ) return sendError(res, 401, 'User not found');

  try {
    const { data: favorites, error: favoritesError } = await supabase
      .from('favorites')
      .select('recipe_id')
      .eq('user_id', user.id);

    if ( favoritesError ) return sendError(res, 500, `Failed to fetch favorites: ${favoritesError.message}`);

    const recipeIds = favorites.map((favorite) => favorite.recipe_id);

    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds);

    if ( recipesError ) return sendError(res, 500, `Failed to fetch recipes: ${recipesError.message}`);

    return sendSuccess(res, 200, 'Favorites fetched successfully', recipes);
  } catch ( error ) {
    return sendError(res, 500, `Unexpected error: ${error}`);
  }
};


export async function getEnrichedRecipeById(recipeId: string, userId?: string | null) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      id,
      title,
      description,
      ingredients,
      steps,
      kcal,
      carbs,
      protein,
      fat,
      image_url,
      created_at,

      user_id,
      user_id ( id, name ),

      recipe_reviews (
        id,
        user_id ( id, name ),
        rating,
        comment,
        created_at,
        updated_at
      ),

      favorites!left(user_id)
    `)
    .eq('id', recipeId)
    .single();

  if ( error || !data ) throw new Error(error?.message || 'Recipe not found');

  const {
    recipe_reviews = [],
    favorites = [],
    user_id: creatorProfile,
  } = data;

  const averageRating =
    recipe_reviews.length > 0
      ? recipe_reviews.reduce((sum, r) => sum + r.rating, 0) / recipe_reviews.length
      : null;

  const isFavorite = userId ? favorites.some(fav => fav.user_id === userId) : false;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    ingredients: data.ingredients,
    steps: data.steps,
    kcal: data.kcal,
    carbs: data.carbs,
    protein: data.protein,
    fat: data.fat,
    image_url: data.image_url,
    created_at: data.created_at,

    creator: {
      id: creatorProfile?.id,
      name: creatorProfile?.name,
    },

    average_rating: averageRating,
    reviews: recipe_reviews.map(r => {
      const authorData = Array.isArray(r.user_id) ? r.user_id[0] : r.user_id;
      return {
        author: {
          id: authorData?.id ?? '',
          name: authorData?.name ?? '',
        },
        id: r.id,
        recipe_id: data.id,
        comment: r.comment,
        rating: r.rating,
        updated_at: r.updated_at,
      };
    }),

    is_favorite: isFavorite,
  };
}
