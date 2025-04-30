# SupaExpress

A clean and minimal Node.js + Express + TypeScript + Supabase starter template, ready to deploy on **Vercel**.
Built for scalability, speed, and simplicity — perfect for production-ready backend applications.

## 🛠️ Available Scripts

- `npm run dev` — Start the server in development mode.
- `npm run lint` — Lint the code using ESLint.
- `npm run lint:fix` — Lint the code and automatically fix issues.

## How to clone and start the project

1. Clone the repository:
   ```bash
   git clone https://github.com/henchoznoe/SupaExpress.git
    ```
2. Go to the project directory:
   ```bash
   cd SupaExpress
    ```
3. Install dependencies:
   ```bash
    npm install
    ```
4. Create a [supabase](https://supabase.com/) project and copy the environement variables.
5. Rename `.env.example` to `.env` and fill in the required environment variables.
6. Run the development server:
   ```bash
   npm run dev
   ```
7. Open your browser and go to `http://localhost:<PORT>`.
8. You can now start developing your Express application with TypeScript!

## 📦 How to deploy on Vercel

1. Create an account on [vercel.com](https://vercel.com).
2. Create a `.env.production` file in the root directory and fill in the required environment variables for production.
3. Make sure to add this new file to your `.gitignore` file to avoid pushing sensitive information to your repository.
4. Push your project to your GitHub repository.
5. On [vercel.com](https://vercel.com), create a new project → Import your repository.
6. Configure :
    - **Framework Preset**: `Other`
    - **Root Directory**: `./`"
7. Paste in `Environment Variables` all your file `.env.production`.
8. Deploy!
