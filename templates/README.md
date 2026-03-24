# Import CSV / Excel – kolonat

Skedari shembull: **`import-template.csv`**.

| Kolona | Detyrueshme | Shembull | Përdorimi |
|--------|-------------|----------|-----------|
| `name` | Po | AUGMENTIN 1g TAB 14 | Emri i produktit; përputhje / krijim |
| `supplier_name` | Po | DONIKA | Furnitori (distributori) për porosi; përputhje ose krijim |
| `producer_name` | Jo | GSK | Informacion (opsional); **nuk** zëvendëson furnitorin |
| `last_paid_price` | Jo | 8.90 | Çmimi i fundit i paguar (referencë) |
| `last_price_date` | Jo | 2026-03-01 | Data `YYYY-MM-DD` ose format i parse-ueshëm |
| `default_order_qty` | Jo | 2 | Fallback për sugjerim sasie kur s’ka histori porosie |
| `aliases` | Jo | augmentin, amoksiklav | Kërkim tolerant (presje ose ` \| ` në CSV me thonjëza) |
| `category` | Jo | barna | `barna` (default) ose `front` |

**Rregull praktik:** Në gojë “prodhuesi” shpesh është furnitori për porosi — në sistem **`supplier_name`** është burimi i porosisë; `producer_name` mbetet fushë opsionale.

Gabime në fusha opsionale (çmim/data/qty e pavlefshme) raportohen në **preview** para **Apliko importin**.
