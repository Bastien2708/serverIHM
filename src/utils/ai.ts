import { log } from '../config/logger';
import { openai } from '../config/openai';
import { recipeSchema } from '../validators/recipes.schema';
import { ParsedRecipes } from '../types/recipes';

const AI_MODELS = [
  'gpt-3.5-turbo',
  'microsoft/phi-3-medium-128k-instruct',
  'deepseek/deepseek-prover-v2:free',
] as const;

export const generateRecipeWithRetry = async (
  originalIngredients: string[],
  mealType: string = 'NOT SPECIFIED',
  dietType: string = 'NOT SPECIFIED',
  maxRetriesPerModel = 5,
  delayMs = 1000
): Promise<ParsedRecipes> => {
  const validIngredients = await translateAndValidateIngredients(originalIngredients);
  if ( !validIngredients || validIngredients.length === 0 ) {
    throw new Error('Ingredient translation or validation failed.');
  }

  for ( const model of AI_MODELS ) {
    for ( let attempt = 1; attempt <= maxRetriesPerModel; attempt++ ) {
      try {
        const completion = await openai.chat.completions.create({
          model,
          messages: [
            {
              role: 'user',
              content: `
You are a professional chef and certified nutritionist. Your task is to create 4 unique recipes using only the validated ingredients below:

✅ Ingredients to use (ONLY these):
[${validIngredients.join(', ')}]

✅ Optional basics (if needed):
["salt", "pepper", "water", "olive oil", "butter", "garlic", "onion", "herbs", "vinegar", "sugar", "lemon juice", "mustard", "honey"]

🚫 Do NOT invent or substitute any ingredient not listed above.

🍳 Rules:
- Create **exactly 4 DIFFERENT and CREATIVE recipes**
- Each recipe is for **1 single serving**
- All recipes must be **realistic, easy to prepare, and well-balanced**
- Use a **subset** of allowed ingredients per recipe
- Every recipe must be unique in taste, preparation, and ingredients

📏 Use **metric units** (g, ml, etc.)
🧠 Write in **English** only

🍽️ Meal type: ${mealType}
🥗 Diet type: ${dietType}

📦 Output format (strict JSON, 4 objects in an array):
[
  {
    "title": "Name of the recipe",
    "description": "Short, enticing description (2–3 sentences)",
    "ingredients": ["ingredient with quantity", "..."],
    "steps": ["Step 1", "Step 2", "..."],
    "kcal": number,
    "carbs": number,
    "protein": number,
    "fat": number,
    "imageSearch": "Phrase to find an image (e.g., 'mushroom pasta')"
  },
  ...
]

🛑 Return only the JSON array. No explanations, no markdown.
`,
            },
          ],
        });

        const rawContent = completion.choices?.[0]?.message.content || '';
        const parsed = parseAIRecipeJSON(rawContent);

        if ( parsed.status === 'ok' && parsed.data.length === 4 ) {
          return parsed;
        } else {
          log.warn(`Model ${model} - Attempt ${attempt} failed. Status: ${parsed.status}`);
        }

        await new Promise((res) => setTimeout(res, delayMs));
      } catch ( error ) {
        if ( attempt === maxRetriesPerModel ) log.warn(`${error} Giving up on this model.`);
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
  }

  throw new Error('All models failed to generate a valid recipe.');
};

const translateAndValidateIngredients = async (ingredients: string[]): Promise<string[]> => {
  for ( const model of AI_MODELS ) {
    try {
      const prompt = `
You are a multilingual culinary assistant. 

You MUST immediately return an error and STOP the entire process if **any** ingredient is:

❌ immoral, offensive, unsafe, inedible or inappropriate (e.g., "blood", "poison", "semen", "urine", "feces", "violence", "knife", "drugs")  
❌ fictional or non-existent (e.g., "unicorn", "magic", "happiness", "love", "soul", "dream")  
❌ not a real food item or not used in cooking (e.g., "rock", "plastic", "soap", "glass", "wood", "metal")  
❌ related to bodily fluids, chemicals, or dangerous items

Your job is to:
1. Translate each of the following ingredients to English, maintaining accuracy.
2. Remove anything that is not a food ingredient (e.g., brand names, kitchen tools).
3. Normalize the format (e.g., lowercase, no duplicates).
4. Return a JSON array of cleaned English ingredient names only (no quantities).

Original ingredients:
[${ingredients.join(', ')}]

If the ingredients are ok, return only the cleaned array. No extra content, no explanation.
Otherwise, return ONLY the following JSON, and nothing else:
{
  "error": "No valid recipe can be created with the given ingredients."
}

      `;

      const completion = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const raw = completion.choices?.[0]?.message.content?.trim() || '';
      const match = raw.match(/\[.*\]/s);
      if ( !match ) throw new Error('No valid array found in translation response.');

      const translated = JSON.parse(match[0]);
      if ( !Array.isArray(translated) ) throw new Error('Parsed ingredient list is not an array.');

      return translated.map((i) => i.toLowerCase().trim()).filter(Boolean);
    } catch ( err ) {
      log.warn(`Ingredient translation failed with model ${model}: ${err}`);
    }
  }
  return [];
};

export const parseAIRecipeJSON = (raw: string): ParsedRecipes => {
  try {
    const trimmed = raw.trim();

    if ( trimmed.startsWith('{') && trimmed.includes('"error"') ) {
      const parsed = JSON.parse(trimmed);
      if ( typeof parsed === 'object' && 'error' in parsed ) {
        return { status: 'ai_error', message: parsed.error };
      }
    }

    const jsonMatch = trimmed.match(/\[[\s\S]*]/);
    if ( !jsonMatch ) return { status: 'invalid_format', raw };

    const parsed = JSON.parse(jsonMatch[0]);
    if ( !Array.isArray(parsed) ) return { status: 'invalid_format', raw };

    const results = parsed.map(recipe => recipeSchema.safeParse(recipe));
    const valid = results
      .filter(r => r.success)
      .map(r => (r as any).data)
      .filter(Boolean);

    if ( valid.length === 0 ) {
      log.error('No valid recipes in array');
      return { status: 'invalid_format', raw };
    }

    return { status: 'ok', data: valid };
  } catch ( e ) {
    log.error('Failed to parse AI response:', e);
    return { status: 'invalid_format', raw };
  }
};

export const fetchImageForRecipe = async (query: string): Promise<string> => {
  try {
    const params = new URLSearchParams({ query, per_page: '1' });
    const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
      headers: {
        Authorization: process.env.PEXELS_API_KEY || '',
        'Content-Type': 'application/json',
      },
    });
    const imageData = await response.json();
    return imageData.photos?.[0]?.src?.original || 'https://recsports.utk.edu/wp-content/uploads/sites/46/2018/05/Image-not-available_1-800x800.jpg';
  } catch ( err ) {
    log.error('Error fetching image:', err);
    return 'https://recsports.utk.edu/wp-content/uploads/sites/46/2018/05/Image-not-available_1-800x800.jpg';
  }
};
