# Si ta lidhësh FlowInventory me Supabase

## 1. Projekt në Supabase (e ke bërë)

Ke krijuar tashmë projektin në [Supabase](https://supabase.com/dashboard).

## 2. Merr API keys nga Supabase

1. Hap [Supabase Dashboard](https://supabase.com/dashboard) dhe zgjidh projektin tënd.
2. Shko te **Project Settings** (ikonë ingranazh) → **API**.
3. Kopjo:
   - **Project URL** → do të përdoret si `VITE_SUPABASE_URL`
   - **anon public** key → do të përdoret si `VITE_SUPABASE_ANON_KEY`  
     (jo **service_role** – atë përdor vetëm serveri dhe nuk duhet në frontend.)

## 3. Konfigurim në projekt (lokalisht)

1. Në rrënjën e projektit krijo një skedar **`.env`** (nuk duhet ngarkuar në GitHub):

   ```bash
   cp .env.example .env
   ```

2. Hap **`.env`** dhe vendos vlerat e tua:

   ```
   VITE_SUPABASE_URL=https://PROJEKT_ID_JOT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
   ```

3. Ruaj skedarin. Aplikacioni do të lidhet me Supabase kur e ekzekuton lokalisht.

## 4. Përdorimi në kod

Në aplikacion përdor klientin e Supabase:

```javascript
import { supabase } from './src/lib/supabase'

// Shembull: lexim nga një tabelë
const { data, error } = await supabase.from('emri_tabeles').select('*')
```

## 5. GitHub

- Repo e projektit: **https://github.com/sofiebajraktari/FlowInventory**
- **Mos vendos kurrë** `VITE_SUPABASE_ANON_KEY` ose URL të plotë në kod ose në fajlla që ngarkohen në GitHub.
- Përdor vetëm **`.env`** lokalisht dhe sigurohu që **`.env`** është në **`.gitignore`** (është shtuar tashmë).

Nëse e deploy-on në Vercel/Netlify etj., vendos të njëjtat variabla (**VITE_SUPABASE_URL** dhe **VITE_SUPABASE_ANON_KEY**) te **Environment Variables** në dashboard-in e shërbimit, jo në kod.

---

**Përmbledhje:** Supabase e ke krijuar; GitHub e ke për kod. Lidhja “me Supabase” bëhet duke vendosur URL dhe anon key në `.env` dhe duke përdorur `src/lib/supabase.js` në aplikacion.
