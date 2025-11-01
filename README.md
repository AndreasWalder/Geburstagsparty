# Geburstagsparty RSVP

Diese App verwaltet Zusagen für die Geburtstagsfeier. Die API speichert inzwischen auch die anfragende IP-Adresse, damit doppelte Registrierungen innerhalb von zehn Minuten verhindert werden können.

## Supabase-Anpassung

Führe das folgende SQL-Statement in deinem Supabase-Projekt aus, um die notwendige Spalte sowie den Index für die IP-Prüfung anzulegen:

```sql
ALTER TABLE public.rsvps
ADD COLUMN IF NOT EXISTS ip text;
CREATE INDEX IF NOT EXISTS rsvps_ip_created_at_idx
  ON public.rsvps (ip, created_at DESC);
```

Die Datei [`supabase/add_ip_column.sql`](supabase/add_ip_column.sql) enthält das Statement ebenfalls, damit es in Deployments oder Migrationen wiederverwendet werden kann.
