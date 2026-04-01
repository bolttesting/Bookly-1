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
- `VITE_SITE_URL` (optional) – public site origin, e.g. `https://bookly.my` (defaults to that in code if unset)

The app runs without these (using placeholders) so the UI loads, but auth, data, and real booking will not work until you configure a real Supabase project and run the required migrations/Edge Functions.

### Production domain (`bookly.my`)

- Deploy the Vite build behind **HTTPS** at `https://bookly.my` (and configure DNS).
- In **Supabase → Authentication → URL configuration**, add `https://bookly.my` (and any OAuth redirect URLs you use).
- In **Supabase Edge Function secrets**, set **`SITE_URL`** to `https://bookly.my` (or rely on the function default, which matches that URL). For local Edge testing, set `SITE_URL=http://localhost:8081`.
- Configure **SPF/DKIM** for `noreply@bookly.my` (and `support@bookly.my`) if you send mail from those addresses.

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
