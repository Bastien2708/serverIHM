import { z } from 'zod';

const ingredients = z.string({ required_error: 'ingredients is required.' })
  .nonempty('ingredients cannot be empty.');

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

export const updateRecipeSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  steps: z.array(z.string()).optional(),
  kcal: z.number().min(0).optional(),
  carbs: z.number().min(0).optional(),
  protein: z.number().min(0).optional(),
  fat: z.number().min(0).optional(),
  image_url: z.string().optional()
}).refine(data => {
  return Object.values(data).some(value => value !== undefined);
}, {
  message: 'At least one field must be provided for update.',
});

const ratingSchema = z.number({ required_error: 'Rating cannot be empty' })
  .min(1, 'Rating must be between 1 and 5.')
  .max(5, 'Rating must be between 1 and 5.');

const commentSchema = z.string().min(1, 'Review cannot be empty.').optional();

export const recipeReviewSchema = z.object({
  rating: ratingSchema,
  comment: commentSchema
});
