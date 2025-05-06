import { openai } from '../config/openai';


export const parseAIRecipeJSON = (raw: string) => {
  const jsonMatch = raw.match(/{[\s\S]*}/);
  if ( !jsonMatch ) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.title !== 'string' ||
      !Array.isArray(parsed.ingredients) ||
      !Array.isArray(parsed.steps) ||
      typeof parsed.nutrition !== 'object'
    ) return null;

    return parsed;
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

Your task is to generate one complete, creative, and healthy recipe using **only** the ingredients listed below.  
⚠️ You are absolutely forbidden from inventing, assuming, or including any ingredients that are not strictly listed.  
Do **not** use salt, pepper, oil, spices, or water unless they are explicitly included in the list.

You must return a **valid JSON object only**, with no extra text, no explanation, and no formatting outside of JSON.  
⚠️ If your response includes anything outside of the JSON (e.g. comments, Markdown, prose), it will be considered invalid.

You do not need to use all the ingredients, but you are forbidden from using any that are not listed.

The recipe must be complete and realistic.

Here is the required JSON structure:

{
  "title": "Name of the recipe",
  "description": "A short, enticing description of the dish.",
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", "..."],
  "steps": ["Step 1", "Step 2", "..."],
  "nutrition": {
    "kcal": number,
    "carbs": number,
    "protein": number,
    "fat": number
  }
}

All units must be in metric (g, ml, etc.). Nutrition values are in kcal and grams.  
All fields must be in English.

Available ingredients: `;


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
