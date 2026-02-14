# Bookly

A booking and business management app for service businesses. Business owners can manage services, staff, appointments, and customers; customers can book and manage appointments via a business’s booking page or “My Appointments”.

## Run the project

```bash
npm install
npm run dev
```

Open the URL shown (e.g. `http://localhost:5173`).

## Environment variables

For full functionality you need a [Supabase](https://supabase.com) project. Create a `.env` in the project root with:

- `VITE_SUPABASE_URL` – your Supabase project URL  
- `VITE_SUPABASE_PUBLISHABLE_KEY` – your Supabase anon/public key  

The app runs without these (using placeholders) so the UI loads, but auth, data, and real booking will not work until you configure a real Supabase project and run the required migrations/Edge Functions.

## Build

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Tech stack

- React, TypeScript, Vite  
- React Router, TanStack Query  
- Supabase (auth, database, storage, Edge Functions)  
- Tailwind CSS, shadcn/ui  

## License

Private / unlicensed unless otherwise stated.
