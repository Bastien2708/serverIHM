import { z } from 'zod';

const ingredients = z.string({ required_error: 'ingredients is required.' })
  .nonempty('Email cannot be empty.');

export const ingredientsSchema = z.object({
  ingredients: ingredients,
});

export const recipeSchema = z.object({
  title: z.string(),
  description: z.string(),
  ingredients: z.array(z.string()),
  steps: z.array(z.string()),
  kcal: z.number().min(0),
  carbs: z.number().min(0),
  protein: z.number().min(0),
  fat: z.number().min(0),
});
