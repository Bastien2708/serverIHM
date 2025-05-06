import { openai } from '../config/openai';
import { recipeSchema } from '../validators/recipes.schema';

export const parseAIRecipeJSON = (raw: string) => {
  const jsonMatch = raw.match(/{[\s\S]*}/);
  if ( !jsonMatch ) return null;

  try {
    const json = JSON.parse(jsonMatch[0]);
    const result = recipeSchema.safeParse(json);

    if ( !result.success ) {
      console.warn('Invalid recipe format:', result.error.format());
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
    console.error('Image fetch error:', err);
    return 'https://via.placeholder.com/600x400?text=No+Image';
  }
};

export const aiPrompt = `
You are a professional chef and certified nutritionist.

Your task is to generate one complete, creative, and healthy recipe using only the ingredients listed below.

❗ You are absolutely forbidden from inventing or assuming any ingredients not listed.
❗ You must exclude any invalid, non-edible, or irrelevant items from the list, such as packaging materials, categories, or tools.
❗ If any listed item is not a real ingredient or is not edible, you must ignore it completely.

You do not have to use all the ingredients, but you must use only valid, edible ones from the provided list.

⚠️ You must return a valid **JSON object only**, with no extra text, no Markdown, and no explanations.
⚠️ If your response includes anything other than valid JSON, it will be rejected.

Here is the required JSON structure:

{
  "title": "Name of the recipe",
  "description": "A short, enticing description of the dish.",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", "..."],
  "steps": ["Step 1", "Step 2", "..."],
  "kcal": number,
  "carbs": number,
  "protein": number,
  "fat": number
}

All units must be in metric (g, ml, etc.). Nutrition values must be realistic (kcal and grams).
All fields must be written in English.

Available ingredients (use only valid, edible items from this list): `;


export const generateRecipeWithRetry = async (ingredients: string, maxRetries = 3, delayMs = 500) => {
  for ( let attempt = 1; attempt <= maxRetries; attempt++ ) {
    try {
      const completion = await openai.chat.completions.create({
        model: 'deepseek/deepseek-prover-v2:free',
        messages: [
          {
            role: 'user',
            content: aiPrompt + ingredients,
          },
        ],
      });

      const rawContent = completion.choices?.[0]?.message?.content || '';
      const recipe = parseAIRecipeJSON(rawContent);

      if ( recipe ) return recipe;

      console.warn(`⏳ Attempt ${attempt} failed: invalid recipe. Retrying...`);
      await new Promise((res) => setTimeout(res, delayMs));
    } catch ( error ) {
      console.error(`❌ Attempt ${attempt} failed with error:`, error);
      if ( attempt === maxRetries ) throw error;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }

  throw new Error('❌ All attempts to generate a valid recipe failed.');
};
