import {Request, Response} from 'express';
import {supabase} from '../config/supabase';
import {sendError, sendSuccess} from '../middlewares/httpResponses';
import {openai} from '../config/openai';
import {Recipe} from "../types/recipes";
import {util} from "zod";
import jsonStringifyReplacer = util.jsonStringifyReplacer;


export const getRecipes = async (req: Request, res: Response) => {
    try {
        const {data, error} = await supabase
            .from('recipes')
            .select('*');

        if (error) {
            return sendError(res, 400, error.message);
        }

        return sendSuccess(res, 200, 'Recipes retrieved successfully', {recipes: data});
    } catch (error) {
        return sendError(res, 500, `Failed to retrieve recipes: ${error}`);
    }
};
export const getRecipe = async (req: Request, res: Response) => {
    const {id} = req.params;
    try {
        const {data, error} = await supabase
            .from('recipes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return sendError(res, 400, error.message);
        }

        return sendSuccess(res, 200, 'Recipe retrieved successfully', {recipe: data});
    } catch (error) {
        return sendError(res, 500, `Failed to retrieve recipe: ${error}`);
    }
};

export const getFavorites = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return sendError(res, 401, 'Missing authorization header');

        const token = authHeader.split(' ')[1];
        if (!token) return sendError(res, 401, 'Missing token');

        const {data: {user}, error: userError} = await supabase.auth.getUser(token);
        if (userError || !user) return sendError(res, 401, 'Invalid token or user not found');

        const {data: favorites, error: favError} = await supabase
            .from('favorites')
            .select('added_at, recipes(*)')
            .eq('user_id', user.id);

        if (favError) return sendError(res, 500, 'Erreur récupération favoris');

        return sendSuccess(res, 200, 'User retrieved successfully', {
            favorites: favorites?.map(fav => ({
                ...fav.recipes,
                added_at: fav.added_at
            })) || []
        });
    } catch (error) {
        return sendError(res, 500, `Failed to retrieve user: ${error}`);
    }
};
export const addToFavorites = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return sendError(res, 401, 'Missing authorization header');

        const token = authHeader.split(' ')[1];
        if (!token) return sendError(res, 401, 'Missing token');

        const {data: {user}, error: userError} = await supabase.auth.getUser(token);
        if (userError || !user) return sendError(res, 401, 'Invalid token or user not found');

        const {recipe_id} = req.params;
        if (!recipe_id) return sendError(res, 400, 'Missing id in request body');

        const {data, error: insertError} = await supabase
            .from('favorites')
            .insert({
                user_id: user.id,
                recipe_id
            }).select();

        if (insertError) {
            if (insertError.code === '23505') // unique_violation
                return sendError(res, 409, 'Recipe already in favorites');
            return sendError(res, 500, `Erreur ajout favori : ${insertError.message}`);
        }

        return sendSuccess(res, 201, 'Recette ajoutée aux favoris', data);
    } catch (error) {
        return sendError(res, 500, `Erreur serveur : ${error}`);
    }
};
export const suppFromFavorites = async (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return sendError(res, 401, 'Missing authorization header');

        const token = authHeader.split(' ')[1];
        if (!token) return sendError(res, 401, 'Missing token');

        const {data: {user}, error: userError} = await supabase.auth.getUser(token);
        if (userError || !user) return sendError(res, 401, 'Invalid token or user not found');

        const {recipe_id} = req.params;
        if (!recipe_id) return sendError(res, 400, 'Missing recipe_id in request params');

        const {data, error: deleteError} = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('recipe_id', recipe_id)
            .select();

        if (deleteError) {
            return sendError(res, 500, `Erreur suppression favori : ${deleteError.message}`);
        }
        return sendSuccess(res, 200, 'Recette supprimée des favoris', data);
    } catch (error) {
        return sendError(res, 500, `Erreur serveur : ${error}`);
    }
};

export const generateRecipe = async (req: Request, res: Response) => {
    const {ingredients} = req.body;

    // 1. Authentification utilisateur
    const authHeader = req.headers.authorization;
    if (!authHeader) return sendError(res, 401, 'Missing authorization header');

    const token = authHeader.split(' ')[1];
    if (!token) return sendError(res, 401, 'Missing token');

    const {data: {user}, error: userError} = await supabase.auth.getUser(token);
    if (userError || !user) return sendError(res, 401, 'Invalid token');

    // 2. Réponse immédiate au client
    sendSuccess(res, 202, 'Recipe generation started', {});

    (async () => callDeepSeek(ingredients))();

};

const callDeepSeek = async (ingredients: string[]) => {
    try {
        const completion = await openai.chat.completions.create({
            model: 'deepseek/deepseek-prover-v2:free',
            messages: [
                {
                    role: 'user',
                    content: `
You are a professional chef and certified nutritionist.

Your task is to generate a complete, creative, and healthy recipe using only the ingredients listed below.  
Absolutely no additional ingredients are allowed.  
You do not have to use all the ingredients, but you must not invent or include any that are not listed.

Your response must be a valid JSON object in the following format, with no extra text:

{
  "title": "Name of the recipe",
  "description": "A short, enticing description of the dish.",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", "..."],
  "steps": ["Step 1", "Step 2", "..."],
  "nutrition": {
    "kcal": 0,
    "carbs": 0,
    "protein": 0,
    "fat": 0
  }
}

All ingredient quantities must be realistic and in metric units (g, ml, etc.).
Nutritional values must be realistic (kcal in kcal, others in grams).
The recipe and all fields must be written in English, even if the input ingredients are not.
Do not include any text outside the JSON.

Again: Do not use any ingredient that is not explicitly listed below.

Available ingredients: ${ingredients}`
                }
            ]
        });

        const rawContent = completion.choices?.[0]?.message?.content || '';

        const jsonMatch = rawContent.match(/{[\s\S]*}/); // match tout ce qui commence et finit par { ... }


        let recipe;
        try {
            if (jsonMatch) {
                recipe = JSON.parse(jsonMatch[0]);
            }
        } catch (error) {
            console.error('Erreur parsing JSON:', error);
        }

        if (!recipe.title || !recipe.ingredients || !recipe.steps || !recipe.nutrition) {
            console.error('Recipe incomplete, skipping insert.');
            return;
        }

        const {data, error: insertError} = await supabase
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
            .select();

        if (insertError || !data || data.length === 0) {
            console.error('Erreur enregistrement recette :', insertError?.message);
            return;
        }

        const inserted = data[0];

        (async () => callPixabay(recipe.title, inserted.id))();

    } catch (err) {
        console.error('Erreur async DeepSeek:', err);
    }
};

const callPixabay = async (title: string, id: string) => {
    try {
        const params = new URLSearchParams({
            query: title
        });

        const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
            method: 'GET',
            headers: {
                Authorization: process.env.PEXELS_API_KEY || '',
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
            console.error('Erreur lors de l’appel à Pixabay:', response.statusText);
            return;
        }

        const data = await response.json();
        const imageUrl = data.photos[0].src.original;

        // Mettre à jour la recette dans Supabase
        const {error: updateError} = await supabase
            .from('recipes')
            .update({image_url: imageUrl})
            .eq('id', id);

        if (updateError) {
            console.error('Erreur mise à jour image_url :', updateError.message);
        } else {
            console.log('Image ajoutée à la recette', id);
        }
    } catch (err) {
        console.error('Erreur fetch Pixabay:', err);
    }
};