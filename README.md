# SiYu Universe — Netlify + Supabase starter

This project is a fan-made SiYu tarot-card gacha site. It includes:
- Sequential server-assigned Player IDs: `SY-0001`, `SY-0002`, ...
- Supabase database-backed collection, daily fortune and draw history
- 3 gacha draws per Thailand calendar day, enforced in PostgreSQL
- Four language UI selector (Thai / English / Korean / Japanese; starter text is partly translated)
- Vertical tarot-card frames (2:3) ready for your own artwork
- Netlify Functions so the Supabase service-role key never appears in browser code

## Important limitation
The starter stores a random player token in that browser's Local Storage. If a visitor clears site data or changes device, the same player identity cannot currently be recovered. Add Supabase Auth (email/Google) or a one-time recovery code before promoting the site widely. Sequential IDs are unique in the database, but are not a secure login credential.

## 1. Create Supabase database
1. Create a project at https://supabase.com.
2. Open **SQL Editor** and run all of `supabase-schema.sql`.
3. From **Project Settings → API**, copy the Project URL and `service_role` key. Keep the service-role key private.

## 2. Deploy to Netlify
1. Put this folder in a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project** and connect that repository.
3. Build command can be blank; publish directory is `public`. `netlify.toml` already contains this setup.
4. In Netlify **Site configuration → Environment variables**, add:
   - `SUPABASE_URL` = your Supabase Project URL
   - `SUPABASE_SERVICE_ROLE_KEY` = your Supabase service_role key
5. Redeploy the site after adding variables.

## 3. Add your card art
Upload your own tarot images to `public/cards/`:
- `card-001.jpg`
- `card-002.jpg`
- `card-003.jpg`
- `card-004.jpg`
- `card-005.jpg`

Recommended art ratio: **2:3 vertical**. Change the `image_url` values in `supabase-schema.sql` (or update the rows in Supabase Table Editor) if your filenames differ. The images should be your own artwork or images you have permission to use.

## 4. How Player IDs work
- The browser creates a random token once and sends it to a Netlify Function.
- Supabase assigns a sequential ID using a database sequence, so IDs are unique across visitors.
- Do not use the Player ID itself as authentication.
- If Local Storage is cleared, the browser token is lost. To recover an account across devices, add sign-in or a recovery-code flow.

## 5. Daily rules
- Daily fortune: one per player per date in `Asia/Bangkok`.
- Gacha: three cards per player per date, after the fortune is opened.
- The PostgreSQL function locks the player's draw operation so concurrent requests cannot exceed the daily limit.

## 6. Local preview
Install Node.js, then from this folder run:
```bash
npm install
npx netlify dev
```
Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in a local `.env` file (never commit `.env` to GitHub).

## Before public launch
- Add proper account recovery / sign-in.
- Consider bot protection/rate limiting on Netlify Functions.
- Translate card titles/captions into all four languages if desired.
- Replace example card records and images with your actual card set.
- Test one fortune and all three draws with multiple test browsers.
