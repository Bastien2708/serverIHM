export type Recipe = {
    id?: string;
    title: string;
    description: string;
    ingredients: object;
    steps: object;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    created_at?: string;
    image_url?: string;
};