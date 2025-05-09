import { log } from '../config/logger';
import { openai } from '../config/openai';
import { recipeSchema } from '../validators/recipes.schema';

const AI_MODELS = [
  'gpt-3.5-turbo',
  'microsoft/phi-3-medium-128k-instruct',
  'deepseek/deepseek-prover-v2:free',
] as const;

export const parseAIRecipeJSON = (raw: string) => {
  const jsonMatch = raw.match(/{[\s\S]*}/);
  if ( !jsonMatch ) return null;

  try {
    const json = JSON.parse(jsonMatch[0]);
    const result = recipeSchema.safeParse(json);

    if ( !result.success ) {
      log.warn('Invalid recipe format:', result.error.format());
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
};

export const fetchImageForRecipe = async (query: string): Promise<string> => {
  try {
    const params = new URLSearchParams({
      query,
      per_page: '1',
    });

    const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: process.env.PEXELS_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });

    const imageData = await response.json();
    return imageData.photos?.[0]?.src?.original || 'https://via.placeholder.com/600x400?text=No+Image';
  } catch ( err ) {
    log.error('Image fetch error:', err);
    return 'https://via.placeholder.com/600x400?text=No+Image';
  }
};

export const aiPrompt = `
You are a professional chef and certified nutritionist.

Your task is to generate one complete, creative, and healthy recipe using the ingredients listed below as the primary base.

✅ You are allowed to add a few very basic and common ingredients that almost everyone has (e.g., salt, pepper, water, olive oil, herbs, etc.) — but do not add any uncommon or complex ingredients not provided.

❗ You are not required to use all the listed ingredients, but you must use at least one or two if they make sense in the recipe.

❌ You must exclude any invalid, non-edible, or irrelevant items from the list, such as packaging materials, categories, or tools.

You must return a valid **JSON object only**, with no extra text, no Markdown, and no explanations.

⚠️ The response must follow this exact JSON structure:

{
  "title": "Name of the recipe",
  "description": "A short, enticing description of the dish.",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", "..."],
  "steps": ["Step 1", "Step 2", "..."],
  "kcal": number,
  "carbs": number,
  "protein": number,
  "fat": number,
  "imageSearch": "A short, clear and relevant keyword string to search for a matching image"
}

All units must be in metric (g, ml, etc.).
Nutrition values must be realistic (kcal and grams).
All fields must be written in English.

Available base ingredients (use as many as needed, but only if they fit naturally): `;


export const generateRecipeWithRetry = async (
  ingredients: string,
  maxRetriesPerModel = 3,
  delayMs = 500
) => {
  for ( const model of AI_MODELS ) {
    log.info(`Trying model: ${model}`);
    for ( let attempt = 1; attempt <= maxRetriesPerModel; attempt++ ) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: aiPrompt + ingredients,
            },
          ],
        });

        const rawContent = completion.choices?.[0]?.message.content || '';
        const recipe = parseAIRecipeJSON(rawContent);

        if ( recipe ) {
          console.log(`Success with model ${model} on attempt ${attempt}`);
          return recipe;
        }

        log.warn(`Model ${model} - Attempt ${attempt} failed: invalid JSON.`);
        await new Promise((res) => setTimeout(res, delayMs));
      } catch ( error ) {
        if ( attempt === maxRetriesPerModel ) {
          log.warn(`${error} Giving up on this model.`);
        }
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  throw new Error('All models failed to generate a valid recipe.');
};
