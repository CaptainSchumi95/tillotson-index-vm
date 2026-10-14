-- Tillotson Index – motohodiny v servisnej knižke.
-- Pri výmene oleja je rozhodujúci stav motohodín (T4: výmena každé 3 h).

alter table public.service_log
  add column engine_hours numeric(7, 2) check (engine_hours is null or engine_hours >= 0);
