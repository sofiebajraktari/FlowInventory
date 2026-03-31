# Multi-Tenancy Test Guide - FlowInventory

## Step 1: Create Companies in Supabase SQL Editor

1. Shko në **Supabase Dashboard** → **SQL Editor**
2. Kliko **New query**
3. Ekzekuto këtë SQL për të krijuar 2 kompani:

```sql
INSERT INTO public.companies (name, code)
VALUES 
  ('Kompania Test 1', 'test-company-1'),
  ('Kompania Test 2', 'test-company-2')
ON CONFLICT (code) DO NOTHING;

-- Zgjidh ID-të për shënimin
SELECT id, name, code FROM public.companies WHERE code LIKE 'test-company%';
```

Pas ekzekutimit, shënoji ID-të e dy kompanive (do duhen më vonë).

---

## Step 2: Create Admin Users (Manually in Database)

Duke përdorur Supabase **SQL Editor**, ekzekuto këtë për secilën kompani:

### Admin 1 - Kompania Test 1:
```sql
-- Replace {COMPANY_1_ID} me ID-në e Kompanisë 1
SELECT public.admin_create_user(
  p_username := 'admin1',
  p_password := 'Password123',
  p_role := 'OWNER'
);
```

### Admin 2 - Kompania Test 2:
```sql
-- Replace {COMPANY_2_ID} me ID-në e Kompanisë 2
SELECT public.admin_create_user(
  p_username := 'admin2',
  p_password := 'Password123',
  p_role := 'OWNER'
);
```

**SHËNIM:** Pas ekzekutimit, SQL-i do të kthejë `user_id`. Shënoji këto IDs.

---

## Step 3: Verify Admins Created

Në SQL Editor, ekzekuto:
```sql
SELECT id, email, username, role, company_id, is_active 
FROM public.profiles 
WHERE role = 'OWNER' AND company_id IN (
  SELECT id FROM public.companies WHERE code LIKE 'test-company%'
)
ORDER BY created_at DESC;
```

Duhet të shohësh 2 OWNER users, secili në kompaninë e tij.

---

## Step 4: Test Admin Login

1. Shko në aplikacion dhe kliko **Login**
2. Kyçu me e-mailin `admin1@flowinventory.local` dhe password `Password123`
3. Duhet të hyjë në dashboard-in e **Kompanisë Test 1**

---

## Step 5: Create Test Users (From FlowInventory UI)

Duke qenë i kyçur si `admin1`:

1. Shko në **Settings**
2. Në seksionin "Krijo përdorues të ri", shtoj:
   - Username: `worker1`
   - Password: `Password123`
   - Role: `WORKER`
3. Kliko **Krijo përdorues**
4. Përsërite për `manager1` (Role: MANAGER)

Përsërite të njëjtin proces si `admin2` me usernames `worker2`, `manager2`.

---

## Step 6: Create Test Data

**Si Admin 1:**
1. Shto furnitor: "Furnitor Kompania 1"
2. Shto produkt: "Produkt Test 1" (lidhur me furnitorin)
3. Shto mungese: 10 njësi të produktit

**Si Admin 2:**
1. Shto furnitor: "Furnitor Kompania 2"
2. Shto produkt: "Produkt Test 2" (lidhur me furnitorin)
3. Shto mungese: 5 njësi të produktit

---

## Step 7: Test Data Isolation

### Test 1: Verify Admins Only See Own Company Data
- Kyçu si `admin1` → Duhet të shohësh vetëm "Produkt Test 1" dhe "Furnitor Kompania 1"
- Kyçu si `admin2` → Duhet të shohësh vetëm "Produkt Test 2" dhe "Furnitor Kompania 2"
- **Nëse shohësh produktet e tjetrit, RLS nuk punon!**

### Test 2: Verify Team Members Belong to Own Company
- Kyçu si `admin1` → Në **Ekipa**, duhet të shohësh: admin1, worker1, manager1 (3 përdorues)
- Kyçu si `admin2` → Në **Ekipa**, duhet të shohësh: admin2, worker2, manager2 (3 përdorues)
- **Nëse shohësh adminë/usera të kompanisë tjetër, problem!**

### Test 3: Verify Workers Can't Create/Delete Data
- Kyçu si `worker1`
- Provo të shtosh produkt → **Duhet të dështojë** (nuk ka përmi)
- Provo të shtosh mungese → **Duhet të funksionojë** (WORKER mund të shtojë mungesat)

### Test 4: Verify Dashboard Shows Correct Company Insights
- Kyçu si `admin1` → Dashboard duhet të tregojë insight-e të "Produk Test 1" dhe "Furnitor Kompania 1"
- Kyçu si `admin2` → Dashboard duhet të tregojë insight-e të "Produk Test 2" dhe "Furnitor Kompania 2"

---

## Step 8: Check Browser Console for Errors

Shitje F12 (Developer Tools) dhe:
1. Shko në **Console**
2. Shto produktin
3. Nëse ka error sa përmes Supabase RLS, do të shohësh error message
4. Nëse vrajos, mund të shohësh `PERMISSION_DENIED` ose `row-level security`

---

## Troubleshooting

### "Nuk ka të dhëna" / "Shoh të dhëna të tjera"
- Verifikoje nëse `current_company_id()` funcion-i punon:
  ```sql
  SELECT public.current_company_id();
  ```
  Duhet të kthejë company_id të user-it të logurit.

### "Nuk mund të krijohet user"
- Verifiko nëse `admin_create_user_v2` RPC ekziston
- Nëse jo, përdor migracionin `20260327110000_admin_create_user_and_login_lookup_fix.sql`

### Dashboard nuk shfaqet sipas kompanisë
- Kontrollo në [src/lib/data.ts](src/lib/data.ts) nëse `getDashboardInsights()` filtron sipas `company_id`

---

## Key Points to Verify

✅ Admin 1 sheh vetëm produktet e Kompanisë 1  
✅ Admin 2 sheh vetëm produktet e Kompanisë 2  
✅ Worker 1 nuk mund të shtoj produkt (Permission denied)  
✅ Dashboard-i tregon insight-e të Kompanisë 1 për Admin 1  
✅ Team lista tregon vetëm userat e Kompanisë 1 për Admin 1  
