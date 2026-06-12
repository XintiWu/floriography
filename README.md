# Floriography

This is a floriography themed application built with Next.js, React 19, and Tailwind CSS.

### 🚀 Getting Started Guide

Follow these steps to set up and run the project locally:

#### 1. Install Dependencies

Ensure you have [Node.js](https://nodejs.org/) installed. Then, run the following command in your terminal to install the required dependencies:

```bash
npm install
```

#### 2. Set Up Environment Variables

The project requires certain environment variables to function properly (e.g., database and AI services). Copy the `.env.example` file and rename it to `.env`:

```bash
cp .env.example .env
```

Next, open the `.env` file in your IDE or text editor and fill in the following required information:
- **`GEMINI_API_KEY`**: Your Gemini API Key (used for the flower recognition service)
- **`NEXT_PUBLIC_SUPABASE_URL`**: Your Supabase project URL (paste ours, provided in .zip file)
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**: Your Supabase project Anon Key (paste ours, provided in .zip file)
- *(If you need to use local AI, ensure Ollama is installed and set the `OLLAMA_MODEL` variable!!!!)*

#### 3. Start the Development Server

Once the environment variables are set and dependencies are installed, you can run the following command to start the project:

```bash
npm run dev
```

Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to view the application.

#### 🛠 Other Available Commands

- `npm run build`: Build the production version
- `npm run lint`: Run code style checks
- `npm run build:catalog`: Rebuild the flower catalog data
