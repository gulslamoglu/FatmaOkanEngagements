# Nişan uygulaması — yayın notları

Videolar açık: gönderimde 1 video (50 MB), veya 5 fotoğraf (girdi başına 15 MB). Fotoğraflar 1600 piksele küçültülür, büyük kalanlar 1280 piksele tekrar işlenir. Ayrı 480 piksel önizleme üretilir. Eski fotoğraflar otomatik dönüştürülmez. HEIC dosyaları desteklenmiyor; MOV kabul edilir ancak oynatma telefondaki codec desteğine bağlıdır.

Yüklemeler sırayla çalışır. Eksik dosya varsa başarı ekranı gösterilmez. Aynı açık sayfada yeniden deneme, başarılı dosyaları atlar ve sabit dosya/kayıt kimlikleriyle mükerrer kaydı önler. Video yüklemesi henüz parçalı/kaldığı yerden devam eden aktarım değildir. Sayfa kapatılırsa yükleme durumu korunmaz. Dosya aktarımı ve veritabanı kaydı ayrı işlemlerdir; bağlantı kaybında tamamlanmamış kayıt/dosyalar kalabilir.

## Veritabanı adımı

supabase/migrations/20260917120000_event_guide.sql dosyasını Supabase SQL Editor veya projenin migration süreciyle uygulayın. Bu, yönetim panelindeki rehber düzenleyicisinin kaydetmesi için gereklidir. Migration uygulanmadan da Fatma & Okan rehberi verilen gerçek saat, adres ve menüyü gösterir. Bu çalışma canlı veritabanına migration uygulamaz ve yayın yapmaz.

## Etkinlik öncesi doğrulama

- Supabase Storage alanı ve egress kullanımını panelden kontrol edin. Ücretsiz kota garantisi veya toplam kota engeli bu değişiklikte yoktur. Videolar alanı hızla tüketebilir.
- 5 fotoğraf yükleyip galeride hepsini açın; 6. fotoğrafın ve ikinci videonun sınırlandığını kontrol edin.
- Aktarım sırasında bağlantıyı kesip tekrar deneyin; çift kayıt oluşmadığını kontrol edin.
- iPhone Safari ve Android Chrome ile fotoğraf, MOV/MP4 ve ses kayıtlarını deneyin.
- Rehberdeki harita adresini ve 19.00 başlangıcını doğrulayın; diğer saatleri yönetim panelinden ekleyin.
- Mevcut anonim veritabanı/storage izinleri geniştir. Canlı policy denetimi ve sahiplik tabanlı yetkilendirme ayrıca gerekir; bu sürüm erişim modelini değiştirmez.
- Etkinlik öncesi temsili eşzamanlı yükleme testi ve etkinlik sonrası bağımsız yedek alın.

## Misafir hakları ve albüm güncellemesi

- Her yeni fotoğraf/video ayrı anı kaydıdır; eski toplu kayıtlar galeride dosya başına ayrı kart olarak gösterilir. Eski kayıtlardaki beğeniler toplu anıya aittir; yeni dosyaların beğenileri bağımsızdır.
- Toplam 20 fotoğraf, 5 video, 2 ses kaydı; metin mesaj adedi sınırsızdır (mesaj başına 1.000 karakter). Tek seferde 5 fotoğraf veya 1 video sınırı korunur.
- Kimlik mevcut tarayıcı oturumuna dayanır. Ad değiştirmek hakları sıfırlamaz. Başka cihaz/tarayıcı veya temizlenen site verisi yeni kimlik oluşturur; gerçek kişi doğrulaması yoktur.
- Kullanım, tüm onay durumlarındaki kayıtlı medya üzerinden hesaplanır. Silinen medya hakları geri açar. Başarısız yükleme ve kayıtsız dosya kullanım sayacına eklenmez; depolamada kalmış dosyalar ayrıca temizlenmelidir.
- Canlıda **supabase/migrations/20260918120000_guest_media_limits.sql** uygulanmalı. İstemci kontrolleri migration olmadan çalışır, ama eşzamanlı sekmelerin limiti aşmasını engelleyen veritabanı kuralı ancak migration sonrasında etkinleşir. Mevcut anonim erişim modeli kişi doğrulaması sağlamaz.
- Test: npm run test:guest-limits. Testler gerçek verileri değiştirmeden PGlite içinde SQL migration'ını çalıştırır. Son hak, limiti aşma, toplu işlemin geri alınması, kayıt tekrarları, aynı oturumdaki birden fazla misafir kaydı, etkinlik ayrımı ve eski çoklu fotoğraf kartları doğrulanır. Gerçek ayrı PostgreSQL bağlantılarıyla eşzamanlı yük testi ayrıca yapılmalıdır.

## Özel mesajlar, paylaşım onayı ve çift fotoğrafları

- Misafir galerisi, ana sayfa, canlı duvar ve zaman çizelgesi yalnızca fotoğraf/video gösterir. Metin ve ses kayıtları yönetim panelindeki etkinlik sahibine özeldir.
- **supabase/APPLY_PRIVACY.sql** dosyasını Supabase SQL Editor'da uygulayın. Kota ve gizlilik değişikliklerini tek işlemde uygular. Bu çalışma canlı SQL uygulaması yapmaz. Dosya uygulanmadan eski mesajlar ve ses bağlantıları gerçek anlamda korunmuş sayılmaz. Yeni gönderimler, gizlilik hazırlığı doğrulanmadan başlatılmaz.
- Etkinliğin weddings.user_id alanı çiftin yönetici hesabına bağlı olmalı. Rastgele bir hesabın boş sahiplik alanını ele geçirebilmesi kaldırıldı; boşsa yetkili operatör SQL Editor'dan doğru kullanıcıyı atamalı.
- wedding-media kovası private olur; fotoğraflar/videolar için misafirler, özel ses için yalnızca sahip hesabı kısa süreli imzalı bağlantı alır. Eski public bağlantılar artık kullanılmaz. Daha önce indirilmiş kopyalar geri alınamaz; mevcut imzalı bağlantılar süreleri dolana kadar çalışabilir (yeni bağlantılar 10 dakika).
- Medya onayı varsayılan olarak kapalıdır. Fotoğraf/video onayı misafir albümünü, ses onayı yalnızca çiftin erişimini kapsar. Onay sürümü ve sunucu zamanı kaydedilir. Fotoğraf başlığı/hikâyesi açık albümün parçasıdır.
- Dosya penceresinden dönünce hak sorgusunun yenilenmesi seçilen dosyaları reddetmez; seçimin kopyası alınır ve devam eden sorgu beklenir.
- Çift fotoğraflarını public/couple klasörüne koyun (en fazla 6 JPG/PNG/WebP/AVIF). npm run dev yeniden başlatılınca veya npm run build sırasında liste hazırlanır. Bu fotoğraflar Supabase alanı kullanmaz, siteyle birlikte herkese açık sunulur. Misafir fotoğrafları otomatik seçilmez.
- Kontroller: npm run test:privacy ve npm run test:guest-limits. Gizlilik testi anonim, farklı yönetici, etkinlik sahibi, özel dosyanın açık kayda bağlanması, izinsiz tür değiştirme ve onaysız yükleme senaryolarını yerel PostgreSQL içinde sınar.

## Galeri ve mikrofon erişimi düzeltmesi

Paylaşım onay kutusu kaldırıldı. Dosya seçicisi yalnızca seçilen dosyalara erişim verir; mikrofon için getUserMedia tarayıcı izni kullanılır. Medya ancak Gönder ile yüklenir. Eski sharing_consent alanları gönderim akışının sürümünü/zamanını kaydeder; tarayıcı izni veya ayrı bir onay kutusu kanıtı değildir. Çift fotoğrafları kapak yerine aşağı kaydırınca görülen küçük albümdedir.

## Kapak konumu ve fotoğraf kalitesi

Yeni kapak seçimi önce cihazda önizlenir; telefon/masaüstü çerçeveleri ve yatay/dikey sürgülerle odak ayarlanır. Orijinal kapak yeniden kodlanmaz. cover_position migration birleşik APPLY_PRIVACY.sql içine eklendi; önceden uygulayanlar yalnızca 20260920120000_cover_position.sql dosyasını çalıştırabilir. Misafir fotoğraflarında iki aşamalı 1280px/%65 sıkıştırma kaldırıldı; orijinalden tek geçiş 2560px/%88 WebP, daha büyük sonuç çıkarsa orijinal korunur. Küçük önizleme orijinalden 800px/%82 üretilir. Eski sıkıştırılmış dosyalar yeniden yüklenmeden iyileşmez.

## Genel kontrol

Canlı Supabase yalnızca okunarak kontrol edildi: rehber/kapak alanları mevcut, paylaşım hazır, anonim metin/ses sorgularında görünür kayıt yok, kapak için imzalı bağlantı alınabiliyor. Yerel test artık birleşik APPLY_PRIVACY.sql dosyasını iki kez uygulayarak rehber/kapak alanlarını ve tekrar uygulanabilirliği de denetliyor. Ana sayfa/admin sayaçları dosya bazında düzeltildi; admin listeleme ve indirme sorguları sayfalara ayrıldı. Başarısız yönetici işlemlerindeki yanıltıcı başarı, metin çift tıklaması, kapak seçimini iptal edince konumun değişmesi ve sayfadan ayrılırken bekleyen mikrofon erişimi temizliği düzeltildi.

390px Edge tarayıcı testinde iki kapak önizlemesi doğal genişliği 1536px olan yerel fotoğrafla yüklendi. Sahte verilerle eski üçlü fotoğraf grubu üç ayrı kart gösterdi; tek silme sonrası iki kart kaldı ve ana kayıt silinmedi. Bu test canlı yazma isteği göndermedi. Gerçek telefon/iOS kamera ve 150–200 eşzamanlı misafir yük testi yapılmadı.
