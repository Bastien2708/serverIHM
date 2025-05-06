import { z } from 'zod';

const ingredients = z.string({ required_error: 'ingredients is required.' })
  .nonempty('Email cannot be empty.');

export const ingredientsSchema = z.object({
  ingredients: ingredients,
});
