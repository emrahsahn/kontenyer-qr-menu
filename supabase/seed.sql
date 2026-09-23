-- ==============================================================================
-- KONTEYNER CAFE - SUPABASE SEED DATA (KATEGORİLER VE ÜRÜNLER)
-- Bu SQL dosyasını Supabase SQL Editor üzerinden doğrudan çalıştırabilirsiniz.
-- ==============================================================================

-- 1. KATEGORİLERİ YÜKLE
INSERT INTO public.categories (id, ad_tr, ad_en, sira) VALUES
('cat-espresso', 'Espresso & Klasikler', 'Espresso & Classics', 1),
('cat-filter', 'Nitelikli Demlemeler & Filtre', 'Specialty Brews & Filter', 2),
('cat-cold', 'Soğuk Kahveler & Cold Brew', 'Iced Coffees & Cold Brew', 3),
('cat-tea', 'Sıcak İçecekler & Bitki Çayları', 'Hot Drinks & Artisan Teas', 4),
('cat-bakery', 'Fırından Taze & Tatlılar', 'Fresh Bakery & Desserts', 5),
('cat-breakfast', 'Kahvaltı & Gurme Sandviçler', 'Breakfast & Gourmet Sandwiches', 6)
ON CONFLICT (id) DO UPDATE SET
    ad_tr = EXCLUDED.ad_tr,
    ad_en = EXCLUDED.ad_en,
    sira = EXCLUDED.sira;

-- 2. ÜRÜNLERİ YÜKLE
INSERT INTO public.products (id, kategori_id, ad_tr, ad_en, aciklama_tr, aciklama_en, fiyat, porsiyonlar, gorsel_url, ozellikler, aktif) VALUES
('k-p1', 'cat-espresso', 'Espresso Single / Double', 'Espresso Single / Double', 'Konteyner House Blend çekirdeklerinden yoğun gövdeli, fındık ve çikolata notalı taze çekim espresso.', 'Freshly pulled intense espresso with hazelnut and dark chocolate notes from Konteyner House Blend.', 95, '[{"id":"p1-opt1","ad_tr":"Single Shot","ad_en":"Single Shot","fiyat":95},{"id":"p1-opt2","ad_tr":"Double Shot","ad_en":"Double Shot","fiyat":130}]'::jsonb, 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vegan":true,"vejetaryen":true,"sef_onerisi":true,"alerjenler":[],"kalori":5,"gramaj":"30-60 ml"}'::jsonb, true),

('k-p2', 'cat-espresso', 'Cortado', 'Cortado', 'Eşit oranda çift shot espresso ve kadifemsi ipeksi sıcak süt köpüğü dengesi.', 'Perfect 1:1 balance of double shot espresso and velvety microfoam milk.', 140, '[]'::jsonb, 'https://images.unsplash.com/photo-1534778101976-62847782c213?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vejetaryen":true,"alerjenler":["Süt"],"kalori":75,"gramaj":"130 ml"}'::jsonb, true),

('k-p3', 'cat-espresso', 'Flat White', 'Flat White', 'Çift shot ristretto üzerine ince mikro köpüklü buharda ısıtılmış tam yağlı süt.', 'Double ristretto poured over finely textured velvety steamed whole milk.', 155, '[]'::jsonb, 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vejetaryen":true,"sef_onerisi":true,"alerjenler":["Süt"],"kalori":120,"gramaj":"180 ml"}'::jsonb, true),

('k-p4', 'cat-espresso', 'Caffe Latte', 'Caffe Latte', 'Hafif espresso aroması, bol sıcak süt ve üzerinde zarif latte art köpük dokusu.', 'Smooth espresso layered with steamed milk and delicate latte art foam.', 150, '[{"id":"p4-opt1","ad_tr":"Standart (Tam Yağlı Süt)","ad_en":"Standard (Whole Milk)","fiyat":150},{"id":"p4-opt2","ad_tr":"Yulaf Sütü ile (Oat)","ad_en":"With Oat Milk","fiyat":175},{"id":"p4-opt3","ad_tr":"Badem Sütü ile (Almond)","ad_en":"With Almond Milk","fiyat":175}]'::jsonb, 'https://images.unsplash.com/photo-1570968915860-54d5c301fc9f?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vejetaryen":true,"alerjenler":["Süt"],"kalori":145,"gramaj":"240 ml"}'::jsonb, true),

('k-p5', 'cat-espresso', 'Salted Caramel Macchiato', 'Salted Caramel Macchiato', 'Vanilya şurubu, sıcak buharlı süt, duble espresso ve ev yapımı deniz tuzlu karamel sosu.', 'Vanilla syrup, steamed milk, double espresso topped with homemade sea salted caramel drizzle.', 175, '[]'::jsonb, 'https://images.unsplash.com/photo-1595928642581-f50f4f3453a5?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vejetaryen":true,"sef_onerisi":true,"alerjenler":["Süt"],"kalori":210,"gramaj":"260 ml"}'::jsonb, true),

('k-p6', 'cat-filter', 'V60 Hand Drip (Ethiopia Yirgacheffe)', 'V60 Hand Drip (Ethiopia Yirgacheffe)', 'Yasemin çiçeği, bergamot ve şeftali notaları taşıyan, elle demlenen nitelikli açık kavrum çekirdek.', 'Light roast single origin beans hand-dripped with delicate notes of jasmine, bergamot, and peach.', 165, '[]'::jsonb, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vegan":true,"vejetaryen":true,"sef_onerisi":true,"alerjenler":[],"kalori":2,"gramaj":"250 ml"}'::jsonb, true),

('k-p7', 'cat-filter', 'Chemex Demleme (Colombia Supremo)', 'Chemex Brew (Colombia Supremo)', 'Kalın filtresiyle berrak ve pürüzsüz içim; esmer şeker, karamel ve kırmızı elma notaları.', 'Exceptionally clean and bright cup with notes of brown sugar, caramel, and red apple.', 170, '[]'::jsonb, 'https://images.unsplash.com/photo-1521302200778-33500795e128?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vegan":true,"vejetaryen":true,"alerjenler":[],"kalori":2,"gramaj":"300 ml"}'::jsonb, true),

('k-p8', 'cat-filter', 'Aeropress (Guatemala Antigua)', 'Aeropress (Guatemala Antigua)', 'Basınçlı demleme tekniğiyle zengin kakao gövdesi, narenciye asiditesi ve dolgun bitiş.', 'Air-pressured brew technique revealing rich cocoa body, citrus brightness, and full finish.', 160, '[]'::jsonb, 'https://images.unsplash.com/photo-1518832553480-cd0e625ed3e6?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vegan":true,"vejetaryen":true,"alerjenler":[],"kalori":2,"gramaj":"220 ml"}'::jsonb, true),

('k-p9', 'cat-cold', '24 Saat Yavaş Damıtım Cold Brew', '24-Hour Slow Drip Cold Brew', 'Buzlu suyla 24 saat boyunca damla damla demlenen, düşük asiditeli, yoğun gövdeli ferahlatıcı soğuk kahve.', 'Steeped for 24 hours in cold filtered water; ultra-smooth, low-acidity refreshing cold coffee.', 170, '[]'::jsonb, 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"soğuk":true,"vegan":true,"vejetaryen":true,"sef_onerisi":true,"alerjenler":[],"kalori":5,"gramaj":"300 ml"}'::jsonb, true),

('k-p10', 'cat-cold', 'Iced Spanish Latte', 'Iced Spanish Latte', 'Duble espresso, yoğunlaştırılmış tatlı süt, taze soğuk süt ve bol buzun mükemmel uyumu.', 'Double espresso blended with sweetened condensed milk, cold whole milk and crushed ice.', 175, '[]'::jsonb, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"soğuk":true,"vejetaryen":true,"sef_onerisi":true,"alerjenler":["Süt"],"kalori":240,"gramaj":"350 ml"}'::jsonb, true),

('k-p11', 'cat-cold', 'Espresso Tonic', 'Espresso Tonic', 'Premium tonik, çift shot espresso, taze biberiye dalı ve kurutulmuş portakal dilimi.', 'Premium tonic water topped with double shot espresso, fresh rosemary sprig and dried orange.', 165, '[]'::jsonb, 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"soğuk":true,"vegan":true,"vejetaryen":true,"alerjenler":[],"kalori":60,"gramaj":"320 ml"}'::jsonb, true),

('k-p12', 'cat-tea', 'Matcha Latte (Seremoniyel Uji)', 'Matcha Latte (Ceremonial Uji)', 'Japonya Uji bölgesinden 1. sınıf seremoniyel organik matcha tozu ve buharda ısıtılmış yulaf sütü.', 'Grade A ceremonial organic Japanese matcha hand-whisked with steamed oat milk.', 180, '[]'::jsonb, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vegan":true,"vejetaryen":true,"sef_onerisi":true,"alerjenler":["Gluten"],"kalori":110,"gramaj":"250 ml"}'::jsonb, true),

('k-p13', 'cat-tea', 'Chai Tea Latte', 'Chai Tea Latte', 'Kakule, zencefil, tarçın ve karanfil baharatlarıyla demlenen siyah çay özütü ve köpüklü süt.', 'Black tea infused with cardamom, ginger, cinnamon, and cloves mixed with foamy milk.', 160, '[]'::jsonb, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80', '{"kafein":true,"vejetaryen":true,"alerjenler":["Süt"],"kalori":180,"gramaj":"260 ml"}'::jsonb, true),

('k-p14', 'cat-bakery', 'San Sebastian Cheesecake', 'San Sebastian Cheesecake', 'İçi akışkan ve kremsi, dışı karamelize yanık kabuklu; sıcak Belçika çikolatası eşliğinde.', 'Basque burnt cheesecake with a rich molten center, served with warm Belgian chocolate sauce.', 220, '[{"id":"p14-opt1","ad_tr":"Sade / Karamel","ad_en":"Plain / Caramel","fiyat":220},{"id":"p14-opt2","ad_tr":"Belçika Çikolatalı","ad_en":"With Belgian Chocolate","fiyat":250}]'::jsonb, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&auto=format&fit=crop&q=80', '{"vejetaryen":true,"sef_onerisi":true,"alerjenler":["Süt","Yumurta","Gluten"],"kalori":420,"gramaj":"190 gr"}'::jsonb, true),

('k-p15', 'cat-bakery', 'Konteyner Kruvasan (Tereyağlı)', 'Konteyner Butter Croissant', 'Fransız tereyağı ile 72 kat katlanan, dışı çıtır içi puf taze fırın kruvasanı.', 'Flaky, buttery authentic French croissant baked fresh every morning with 72 layers.', 120, '[]'::jsonb, 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800&auto=format&fit=crop&q=80', '{"vejetaryen":true,"alerjenler":["Süt","Gluten","Yumurta"],"kalori":310,"gramaj":"110 gr"}'::jsonb, true),

('k-p16', 'cat-bakery', 'Fıstıklı Brownie & Dondurma', 'Pistachio Brownie & Gelato', '%70 Callebaut bitter çikolata, Antep fıstığı parçaları ve vanilyalı artisan dondurma.', '70% dark Callebaut chocolate fudge brownie topped with Antep pistachios and vanilla gelato.', 210, '[]'::jsonb, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=800&auto=format&fit=crop&q=80', '{"vejetaryen":true,"alerjenler":["Süt","Gluten","Yumurta","Fıstık"],"kalori":460,"gramaj":"180 gr"}'::jsonb, true),

('k-p17', 'cat-breakfast', 'Avokado & Poşe Yumurtalı Ekşi Maya', 'Avocado & Poached Egg on Sourdough', 'Kızarmış artisan ekşi mayalı ekmek üzerine taze ezilmiş avokado, çift organik poşe yumurta ve çörek otu.', 'Artisan toasted sourdough topped with smashed avocado, two organic poached eggs, and seeds.', 260, '[]'::jsonb, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80', '{"vejetaryen":true,"sef_onerisi":true,"alerjenler":["Gluten","Yumurta"],"kalori":380,"gramaj":"240 gr"}'::jsonb, true),

('k-p18', 'cat-breakfast', 'Füme Kaburga & Cheddar Kruvasan Sandviç', 'Smoked Rib & Cheddar Croissant', 'Tereyağlı çıtır kruvasan arasında 8 saat dinlendirilmiş dana füme kaburga, erimiş cheddar ve hardal mayonez.', 'Buttery croissant stuffed with 8-hour slow smoked beef ribs, melted aged cheddar, and mustard mayo.', 295, '[]'::jsonb, 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800&auto=format&fit=crop&q=80', '{"sef_onerisi":true,"alerjenler":["Gluten","Süt","Hardal","Yumurta"],"kalori":520,"gramaj":"260 gr"}'::jsonb, true)
ON CONFLICT (id) DO UPDATE SET
    kategori_id = EXCLUDED.kategori_id,
    ad_tr = EXCLUDED.ad_tr,
    ad_en = EXCLUDED.ad_en,
    aciklama_tr = EXCLUDED.aciklama_tr,
    aciklama_en = EXCLUDED.aciklama_en,
    fiyat = EXCLUDED.fiyat,
    porsiyonlar = EXCLUDED.porsiyonlar,
    gorsel_url = EXCLUDED.gorsel_url,
    ozellikler = EXCLUDED.ozellikler,
    aktif = EXCLUDED.aktif;
