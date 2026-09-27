-- ==============================================================================
-- KONTEYNER CAFE - GÜVENLİK SIKILAŞTIRMA (MEVCUT VERİTABANI İÇİN TEK SEFERLİK)
-- Supabase Dashboard > SQL Editor üzerinden bir kez çalıştırın.
--
-- Etkisi:
--  1) loyalty_store (müşteri adı/telefonu/KVKK verisi) üzerindeki TÜM politikalar
--     kaldırılır ve anon/authenticated yetkileri geri alınır -> anon anahtarıyla
--     okuma/yazma tamamen kapanır. Erişim yalnızca sunucudaki service-role anahtarıyla.
--  2) categories ve products: RLS açılır, herkese açık YALNIZCA okuma izni verilir.
--     Yazma işlemleri service-role ile yapılır.
-- ==============================================================================

-- 1) loyalty_store: isimden bağımsız olarak tüm politikaları kaldır
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'loyalty_store'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.loyalty_store', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.loyalty_store ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.loyalty_store FROM anon, authenticated;

-- 2) categories: RLS aç + herkese açık okuma
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Kategoriler herkese açık okunur" ON public.categories;
CREATE POLICY "Kategoriler herkese açık okunur"
  ON public.categories FOR SELECT USING (true);

-- 3) products: RLS aç + herkese açık okuma
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ürünler herkese açık okunur" ON public.products;
CREATE POLICY "Ürünler herkese açık okunur"
  ON public.products FOR SELECT USING (true);

-- Doğrulama: aşağıdaki sorgular çalıştırıldığında
--  1. sorgu 0 satır dönmelidir (loyalty_store üzerinde policy kalmadı)
--  2. sorgu 2 satır dönmelidir (categories + products SELECT policy)
-- SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename='loyalty_store';
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename IN ('categories','products');
