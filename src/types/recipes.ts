export type UpdateRecipePayload = {
  title?: string;
  description?: string;
  ingredients?: string[];
  steps?: string[];
  kcal?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  image_url?: string;
}

export type RecipeType = {
  title: string;
  description: string;
  ingredients: string[];
  steps: string[];
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  imageSearch: string;
  image_url: string;
};
