// In-app user guide: the steps each account type follows, in order, with the page that does each step.
// Text is [Arabic, English, Turkish]. Keep steps short: one action each.
const S = (tab, title, text) => ({ tab, title, text });

const profile = S(
  "profile",
  ["أكمل ملفك", "Complete your profile", "Profilinizi tamamlayın"],
  [
    "اكتب نبذة عنك وخدماتك وإيميل وهاتف التواصل وارفع شعارك. هذا ما تراه الشركات الأخرى في صفحتك.",
    "Add an introduction, your services, a contact email and phone, and your logo. This is what other companies see on your page.",
    "Tanıtım, hizmetler, iletişim e-postası ve telefonu ile logonuzu ekleyin. Diğer şirketler sayfanızda bunu görür.",
  ],
);
const verify = S(
  "kyb",
  ["وثّق حسابك", "Verify your account", "Hesabınızı doğrulayın"],
  [
    "ارفع السجل التجاري (أو جواز السفر للأفراد). بعد موافقة الإدارة تُفتح كل الخدمات ويبدأ عدّاد الشهور المجانية.",
    "Upload your trade registry (or passport for individuals). After approval all services open and your free months start.",
    "Ticaret sicilini (bireyler için pasaport) yükleyin. Onaydan sonra tüm hizmetler açılır ve ücretsiz aylar başlar.",
  ],
);
const hub = S(
  "hub",
  ["تواصل مع الشركات", "Talk to companies", "Şirketlerle konuşun"],
  [
    "من «دليل الشركات» ابحث وفلتر حسب النوع والبلد والمعبر، ثم راسلهم من «غرفة التواصل» أو على واتساب. الرسائل تُترجم تلقائيًا.",
    "In the directory, search and filter by type, country and crossing, then message them in the hub or on WhatsApp. Messages are translated automatically.",
    "Rehberde türe, ülkeye ve kapıya göre arayıp filtreleyin; mesaj merkezinden veya WhatsApp'tan yazın. Mesajlar otomatik çevrilir.",
  ],
);
const border = S(
  "border",
  ["تابع قوانين الحدود", "Follow the border rules", "Sınır kurallarını izleyin"],
  [
    "قرارات المعابر والجمارك الحديثة، وحالة كل معبر، والزحمة الآن، وتنبيهات الإدارة. تصلك التنبيهات المهمة بإشعار وإيميل.",
    "Latest crossing and customs decisions, each crossing's status, current queues and administration notices. Important notices also reach you by notification and email.",
    "Güncel kapı ve gümrük kararları, kapı durumları, anlık kuyruklar ve yönetim duyuruları. Önemli duyurular bildirim ve e-postayla da gelir.",
  ],
);

const documents = S(
  "documents",
  ["الوثائق: ارفع واطلب", "Documents: upload and request", "Belgeler: yükleyin ve isteyin"],
  [
    "لكل شحنة ملف وثائق خاص. اختر نوع الوثيقة من الخيارات وارفعها بضغطة، أو اطلب من الطرف الآخر وثائق معيّنة (يمكن اختيار أكثر من وثيقة). المنصة لا تفرض أي وثيقة: المطلوب هو ما تطلبه الشركات فقط. يصل الطلب كإشعار، ولا يُرسل طلب الشحنة قبل رفع ما طُلب من صاحبها.",
    "Each shipment has its own documents folder. Pick the document type from the options and upload in one tap, or ask the other party for specific documents (several at once). The platform imposes no documents: only what the companies ask for is required. Requests arrive as notifications, and a shipment request is sent only after its owner uploads what was requested.",
    "Her sevkiyatın kendi belge klasörü vardır. Seçeneklerden belge türünü seçip tek dokunuşla yükleyin veya karşı taraftan belirli belgeleri isteyin (birden fazla seçilebilir). Platform belge dayatmaz: yalnızca şirketlerin istedikleri gereklidir. İstekler bildirim olarak gelir; sevkiyat talebi, sahibi istenenleri yüklemeden gönderilmez.",
  ],
);
const docsPrivacy = S(
  "documents",
  [
    "البضائع الممنوعة ومراجعة الوثائق",
    "Prohibited goods and document review",
    "Yasaklı ürünler ve belge incelemesi",
  ],
  [
    "المنصة لا تقبل البضائع الممنوعة (أسلحة، ذخائر، متفجرات، مخدرات، مواد مشعة…): يُرفض الطلب تلقائيًا إذا دلّ رمز HS أو الوصف عليها. إدارة المنصة تطّلع على وثائق الشحنات للتأكد، ويحق لها رفض أي طلب مع ذكر السبب.",
    "The platform does not accept prohibited goods (arms, ammunition, explosives, narcotics, radioactive materials…): a request is refused automatically when its HS code or description points to them. The administration reviews shipment documents to check, and may refuse any request with a stated reason.",
    "Platform yasaklı ürünleri kabul etmez (silah, mühimmat, patlayıcı, uyuşturucu, radyoaktif madde…): HS kodu veya tanım bunlara işaret ederse talep otomatik reddedilir. Yönetim kontrol için sevkiyat belgelerini inceler ve gerekçesini belirterek her talebi reddedebilir.",
  ],
);
const adminDocs = S(
  "documents",
  [
    "مراجعة الوثائق والبضائع الممنوعة",
    "Reviewing documents and prohibited goods",
    "Belge incelemesi ve yasaklı ürünler",
  ],
  [
    "في «رفع الوثائق» تفتح وثائق كل شحنة وترى متى رُفعت ومن رفعها. إذا دلّت على بضاعة ممنوعة، اضغط «رفض الطلب» على بطاقة الشحنة واكتب السبب. قائمة رموز HS والكلمات الممنوعة تعدّلها من «إعدادات الموقع»، ويصلك إشعار بكل محاولة رُفضت تلقائيًا.",
    "In 'Upload documents' open each shipment's documents and see when and by whom they were uploaded. If they show prohibited goods, press 'Refuse request' on the shipment card and give the reason. Edit the prohibited HS codes and words in 'Site settings'; you are notified of every attempt refused automatically.",
    "'Belge yükleme' bölümünde her sevkiyatın belgelerini açıp ne zaman ve kimin yüklediğini görün. Yasaklı ürün varsa sevkiyat kartında 'Talebi reddet'e basıp gerekçeyi yazın. Yasaklı HS kodlarını ve kelimeleri 'Site ayarları'ndan düzenleyin; otomatik reddedilen her girişim için bildirim alırsınız.",
  ],
);

const feedback = S(
  "feedback",
  ["قيّم المنصة أو اشتكِ أو اقترح", "Rate, complain or suggest", "Değerlendirin, şikâyet edin veya önerin"],
  [
    "من «تقييم وشكاوى واقتراحات» أعطِ المنصة من 1 إلى 5 نجوم، أو أرسل شكوى (يمكن ربطها بشحنة أو شركة)، أو اقترح فكرة. تصل للإدارة فقط، ويصلك إشعار بالرد.",
    "In 'Ratings, complaints & ideas' give the platform 1 to 5 stars, send a complaint (linked to a shipment or company if you like) or suggest an idea. Only the administration sees it, and you are notified of the reply.",
    "'Değerlendirme, şikâyet ve öneri' bölümünde platforma 1-5 yıldız verin, şikâyet gönderin (isterseniz bir sevkiyat veya şirkete bağlayın) ya da fikir önerin. Yalnızca yönetim görür; yanıtta bildirim alırsınız.",
  ],
);
const feedbackAdminStep = S(
  "feedbackAdmin",
  ["التقييمات والشكاوى", "Ratings and complaints", "Değerlendirme ve şikâyetler"],
  [
    "كل تقييمات المنصة والشكاوى والاقتراحات بمكان واحد: متوسط التقييم، الشكاوى المفتوحة، فلترة حسب النوع والحالة، وردّ يصل للحساب كإشعار.",
    "All platform ratings, complaints and suggestions in one place: average rating, open complaints, filters by type and status, and replies that reach the account as notifications.",
    "Tüm platform değerlendirmeleri, şikâyetler ve öneriler tek yerde: ortalama puan, açık şikâyetler, türe ve duruma göre filtreler ve hesaba bildirim olarak giden yanıtlar.",
  ],
);

const prices = S(
  "prices",
  ["مؤشر الأسعار", "Price index", "Fiyat endeksi"],
  [
    "أسعار حقيقية من العروض المقبولة لكل طريق: الوسيط والمجال المعتاد وسعر الطن والمدة والتغير الشهري. استعمله لتعرف إذا العرض منيح أو لتسعّر عرضك.",
    "Real prices from accepted offers on each route: median, usual range, price per ton, duration and monthly change. Use it to judge an offer or to price your own.",
    "Her güzergâh için kabul edilen tekliflerden gerçek fiyatlar: medyan, olağan aralık, ton fiyatı, süre ve aylık değişim. Bir teklifi değerlendirmek veya kendinizinkini fiyatlamak için kullanın.",
  ],
);
const returnTripsTrader = S(
  "returnTrips",
  ["رحلات العودة الأرخص", "Cheaper return trips", "Daha ucuz dönüş seferleri"],
  [
    "شاحنات راجعة فاضية بأسعار أقل. اطلب الرحلة أو راسل الناقل، ويصلك إشعار إذا ظهرت رحلة على طريق شحنتك.",
    "Trucks going back empty at lower prices. Ask for a trip or message the carrier; you are notified when one appears on your shipment's route.",
    "Boş dönen araçlar daha düşük fiyatla. Seferi isteyin veya taşıyıcıya yazın; sevkiyatınızın güzergâhında sefer çıkınca bildirim alırsınız.",
  ],
);
const returnTripsCarrier = S(
  "returnTrips",
  ["اعرض رحلة العودة", "Offer your return trip", "Dönüş seferinizi sunun"],
  [
    "راجع فاضي؟ انشر رحلة العودة بسعر الشاحنة كاملة. التجار على نفس الطريق يصلهم إشعار، وتقبل أو ترفض طلباتهم من نفس الصفحة.",
    "Going back empty? Post the return trip with a whole-truck price. Traders on the route are notified and you accept or decline their requests on the same page.",
    "Boş mu dönüyorsunuz? Dönüş seferini tüm araç fiyatıyla yayınlayın. Güzergâhtaki tüccarlar bilgilendirilir; isteklerini aynı sayfadan kabul veya reddedersiniz.",
  ],
);
const commercial = S(
  "documents",
  [
    "الفاتورة وقائمة التعبئة بضغطة",
    "Invoice and packing list in one go",
    "Tek seferde fatura ve çeki listesi",
  ],
  [
    "في ملف الشحنة اكتب الأصناف مرة واحدة، فتُنشأ فاتورة مبدئية (Proforma) وقائمة تعبئة متطابقتان، ونفحص الوزن ورمز HS قبل الحفظ. الفاتورة الرسمية تصدرها من نظامك بنفس الأرقام وترفعها.",
    "In the shipment folder enter the items once to get a matching proforma invoice and packing list, checked for weight and HS code before saving. Issue the official invoice from your own system with the same figures and upload it.",
    "Sevkiyat klasöründe ürünleri bir kez girin; uyumlu proforma fatura ve çeki listesi oluşur, kaydetmeden önce ağırlık ve HS kodu kontrol edilir. Resmî faturayı kendi sisteminizden aynı rakamlarla düzenleyip yükleyin.",
  ],
);
const repeat = S(
  "shipments",
  [
    "كرّر الشحنة واقتراحات العناوين",
    "Repeat a shipment, address suggestions",
    "Sevkiyatı tekrarla, adres önerileri",
  ],
  [
    "زر «🔁 كرّر الشحنة» على بطاقة أي شحنة يفتح طلبًا جديدًا معبّأ بنفس البيانات. المدن والأسماء والعناوين السابقة تظهر كاقتراحات أثناء الكتابة.",
    "The '🔁 Repeat shipment' button on any shipment card opens a new request filled with the same details. Earlier cities, names and addresses appear as suggestions while you type.",
    "Herhangi bir sevkiyat kartındaki '🔁 Sevkiyatı tekrarla' düğmesi aynı bilgilerle doldurulmuş yeni bir talep açar. Önceki şehirler, adlar ve adresler yazarken öneri olarak görünür.",
  ],
);
const compare = S(
  "shipments",
  ["قارن العروض", "Compare offers", "Teklifleri karşılaştırın"],
  [
    "عند وصول أكثر من عرض اضغط «قارن العروض بجدول»: السعر والمدة والتقييم ونسبة الالتزام بالمواعيد المحسوبة من وصول الشاحنات الفعلي، مع علامات الأرخص والأسرع والأكثر التزامًا.",
    "With more than one offer, press 'Compare offers in a table': price, days, rating and the on-time share measured from real truck arrivals, with cheapest, fastest and most punctual badges.",
    "Birden fazla teklif varsa 'Teklifleri tabloda karşılaştır'a basın: fiyat, süre, puan ve gerçek varışlardan ölçülen zamanında teslim oranı; en ucuz, en hızlı ve en dakik işaretleriyle.",
  ],
);
const install = S(
  "dashboard",
  ["ثبّت المنصة على موبايلك", "Install the platform on your phone", "Platformu telefonunuza kurun"],
  [
    "من زر «📲 ثبّت التطبيق» في القائمة الجانبية (أو «إضافة للشاشة الرئيسية» من المتصفح) تصير المنصة أيقونة على الشاشة وتفتح كتطبيق.",
    "With the '📲 Install the app' button in the side menu (or 'Add to home screen' in the browser) the platform becomes an icon on your screen and opens like an app.",
    "Yan menüdeki '📲 Uygulamayı kurun' düğmesiyle (veya tarayıcıdan 'Ana ekrana ekle') platform ekranınızda bir simge olur ve uygulama gibi açılır.",
  ],
);

const referral = S(
  "dashboard",
  ["ادعُ شركة واربح شهرًا", "Invite a company, earn a month", "Şirket davet et, bir ay kazan"],
  [
    "في لوحتك بطاقة «ادعُ شركة» فيها رابطك. كل شركة تسجّل منه وتتم الموافقة عليها تضيف لك شهرًا مجانيًا (حتى 12 شهرًا).",
    "Your dashboard has an 'Invite a company' card with your link. Every company that signs up through it and is approved adds a free month for you (up to 12).",
    "Panonuzda bağlantınızı içeren 'Şirket davet et' kartı var. Bağlantınızla kaydolup onaylanan her şirket size bir ay ücretsiz ekler (en fazla 12).",
  ],
);
const whatsappStep = S(
  "profile",
  ["إشعارات واتساب", "WhatsApp notices", "WhatsApp bildirimleri"],
  [
    "فعّل «إشعارات واتساب» في ملفك لتصلك الأحداث المهمة على رقمك: عرض جديد، وثيقة مطلوبة، وصول الشاحنة للمعبر أو للتسليم، إغلاق العملية.",
    "Turn on 'WhatsApp notices' in your profile to get the important events on your number: new offer, requested document, truck at the crossing or delivery point, operation closed.",
    "Önemli olayları numaranıza almak için profilinizde 'WhatsApp bildirimleri'ni açın: yeni teklif, istenen belge, araç kapıda veya teslim noktasında, işlem kapandı.",
  ],
);
const bestTime = S(
  "border",
  ["أحسن وقت للعبور", "Best time to cross", "Geçiş için en iyi zaman"],
  [
    "في صفحة الحدود جدول لكل معبر يبيّن الأيام والأوقات التي يكون فيها الانتظار أقل عادة، من كل تقارير الزحمة ومواقع الشاحنات.",
    "The border page has a chart for each crossing showing the days and times when the wait is usually shortest, from every queue report and truck position.",
    "Sınır sayfasında her kapı için beklemenin genellikle en kısa olduğu günleri ve saatleri gösteren bir tablo var.",
  ],
);
const driversStep = S(
  "drivers",
  ["وثّق سائقيك وشاحناتك", "Verify your drivers and trucks", "Sürücü ve araçlarınızı doğrulatın"],
  [
    "سجّل السائق مع اللوحة وصورة الرخصة والشاحنة. بعد التوثيق يظهر «سائق موثّق» على الشحنة عندما تختاره لها من بطاقة الشحنة.",
    "Register the driver with the plate, licence and truck photos. Once verified, 'Verified driver' shows on the shipment when you choose the driver on its card.",
    "Sürücüyü plaka, ehliyet ve araç fotoğraflarıyla kaydedin. Doğrulandıktan sonra sevkiyat kartında seçtiğinizde 'Doğrulanmış sürücü' görünür.",
  ],
);
const guaranteeStep = S(
  "jobs",
  [
    "ضمان التأخير وحاسبة التكلفة",
    "Delay guarantee and cost calculator",
    "Gecikme garantisi ve maliyet hesaplayıcı",
  ],
  [
    "في نموذج العرض: «احسب تكلفة الرحلة» يعطيك أقل سعر بدون خسارة، و«ضمان التأخير» يميّز عرضك بخصم عن كل يوم تأخير يُحسب تلقائيًا من الوصول الفعلي.",
    "In the offer form: 'Work out the trip cost' gives your lowest price without a loss, and the 'Delay guarantee' makes your offer stand out with a discount per late day, worked out from the real arrival.",
    "Teklif formunda: 'Sefer maliyetini hesapla' zarar etmeden en düşük fiyatınızı verir; 'Gecikme garantisi' gerçek varıştan hesaplanan günlük indirimle teklifinizi öne çıkarır.",
  ],
);
const trustStep = S(
  "directory",
  ["مستويات الثقة", "Trust levels", "Güven seviyeleri"],
  [
    "🥉🥈🥇 تُحسب تلقائيًا من العمليات المكتملة والتقييم والالتزام بالمواعيد وسرعة الدفع، وتظهر في الدليل وعلى العروض. فلتر الدليل حسب المستوى.",
    "🥉🥈🥇 are worked out automatically from completed operations, rating, punctuality and payment speed, and show in the directory and on offers. Filter the directory by level.",
    "🥉🥈🥇 tamamlanan işlemler, puan, dakiklik ve ödeme hızından otomatik hesaplanır; rehberde ve tekliflerde görünür. Rehberi seviyeye göre filtreleyin.",
  ],
);
const sharedStep = S(
  "shipments",
  ["شارك الشاحنة ووفّر", "Share a truck and save", "Aracı paylaş, tasarruf et"],
  [
    "إذا كانت شحنتك صغيرة وفي شحنة أخرى على نفس الطريق بنفس الأسبوع يصلك إشعار. فعّل «أقبل مشاركة الشاحنة» ليراها الناقلون ويقدّموا سعرًا أقل.",
    "If your shipment is small and another one is on the same route in the same week, you are notified. Turn on 'I accept sharing the truck' so carriers see it and offer a lower price.",
    "Sevkiyatınız küçükse ve aynı hafta aynı güzergâhta başka biri varsa bildirim alırsınız. Taşıyıcılar görsün ve daha düşük fiyat versin diye 'Araç paylaşımını kabul ediyorum'u açın.",
  ],
);

export const guide = {
  merchant: [
    profile,
    verify,
    S(
      "newShipment",
      ["انشر شحنتك", "Post your shipment", "Sevkiyatınızı yayınlayın"],
      [
        "اكتب المسار ونوع البضاعة والوزن ورمز HS. شحنات تركيا⇄سوريا تُقسم تلقائيًا إلى ثلاث مراحل: نقل إلى المعبر، تخليص ومناقلة، نقل من المعبر.",
        "Enter the route, goods, weight and HS code. Türkiye⇄Syria shipments are split automatically into three stages: haul to the crossing, clearance and transfer, haul from the crossing.",
        "Güzergâh, yük, ağırlık ve HS kodunu girin. Türkiye⇄Suriye sevkiyatları otomatik üç aşamaya bölünür: kapıya taşıma, gümrükleme ve aktarma, kapıdan taşıma.",
      ],
    ),
    S(
      "shipments",
      ["قارن العروض واقبل", "Compare offers and accept", "Teklifleri karşılaştırıp kabul edin"],
      [
        "تصلك عروض من ناقلين ومخلّصين موثّقين لكل مرحلة. افتح صفحة الشركة وتقييمها، ثم اقبل العرض المناسب.",
        "Verified carriers and brokers send offers for each stage. Open the company's page and rating, then accept the best offer.",
        "Her aşama için doğrulanmış taşıyıcı ve müşavirlerden teklif gelir. Şirket sayfasına ve puanına bakıp uygun teklifi kabul edin.",
      ],
    ),
    S(
      "shipments",
      ["ادفع بالطريقة التي تناسبك", "Pay the way that suits you", "Size uygun şekilde ödeyin"],
      [
        "الدفع المحمي: تحوّل للمنصة ويُحفظ المبلغ حتى تؤكد الاستلام. أو الدفع المباشر للناقل. لا توجد عمولة في الحالتين.",
        "Protected payment: you transfer to the platform and the amount is held until you confirm delivery. Or pay the carrier directly. No commission either way.",
        "Korumalı ödeme: platforma aktarırsınız, teslimi onaylayana kadar tutulur. Veya taşıyıcıya doğrudan ödeyin. İkisinde de komisyon yok.",
      ],
    ),
    S(
      "tracking",
      ["تابع الشاحنة", "Follow the truck", "Aracı izleyin"],
      [
        "خريطة بمسار الشاحنة ووقت الوصول وتنبيه عند المعبر. أرسل «رابط تتبع للمستلم» على واتساب، وأعطه «رمز التسليم» ليعطيه للسائق عند الاستلام.",
        "A map of the truck's route, arrival time and crossing alerts. Send the receiver a tracking link on WhatsApp, and give them the delivery code to hand to the driver.",
        "Güzergâh haritası, varış zamanı ve kapı uyarıları. Alıcıya WhatsApp'tan takip bağlantısı gönderin ve sürücüye vermesi için teslim kodunu verin.",
      ],
    ),
    S(
      "tracking",
      ["أكّد الاستلام وقيّم", "Confirm delivery and rate", "Teslimi onaylayıp değerlendirin"],
      [
        "بعد وصول البضاعة أكّد الاستلام لتُغلق العملية، ثم قيّم الناقل. كل عملية مكتملة تقرّبك من 3 شهور مجانية إضافية.",
        "When the goods arrive, confirm delivery to close the operation, then rate the carrier. Each completed operation brings you closer to 3 extra free months.",
        "Yük gelince teslimi onaylayıp işlemi kapatın, sonra taşıyıcıyı değerlendirin. Her tamamlanan işlem sizi 3 ek ücretsiz aya yaklaştırır.",
      ],
    ),
    border,
    documents,
    docsPrivacy,
    compare,
    repeat,
    commercial,
    returnTripsTrader,
    prices,
    install,
    sharedStep,
    trustStep,
    bestTime,
    whatsappStep,
    referral,
    hub,
    feedback,
  ],
  carrier: [
    profile,
    verify,
    S(
      "fleet",
      ["أضف أسطولك", "Add your fleet", "Filonuzu ekleyin"],
      [
        "سجّل شاحناتك وسعتها، ليعرف التجار قدرتك.",
        "Register your trucks and their capacity so traders know what you can carry.",
        "Araçlarınızı ve kapasitelerini kaydedin; tüccarlar neler taşıyabileceğinizi bilsin.",
      ],
    ),
    S(
      "jobs",
      ["قدّم عروضك", "Send offers", "Teklif verin"],
      [
        "في «فرص النقل» ترى الشحنات المفتوحة ومراحل النقل إلى المعبر ومنه. اكتب السعر والمدة وأرسل العرض.",
        "Under jobs you see open shipments and the haul stages to and from the crossings. Enter price and days and send your offer.",
        "İşler bölümünde açık sevkiyatları ve kapıya/kapıdan taşıma aşamalarını görürsünüz. Fiyat ve süre girip teklif gönderin.",
      ],
    ),
    S(
      "jobs",
      ["بعد قبول عرضك", "After your offer is accepted", "Teklifiniz kabul edilince"],
      [
        "إذا اختار التاجر الدفع المباشر، أكّد استلام المبلغ من صفحة الشحنة. بعدها يمكنك بدء النقل.",
        "If the trader chose direct payment, confirm you received the money on the shipment page. Then you can start the trip.",
        "Tüccar doğrudan ödemeyi seçtiyse, ödemeyi aldığınızı sevkiyat sayfasında onaylayın. Sonra yola çıkabilirsiniz.",
      ],
    ),
    S(
      "drivers",
      ["أرسل رابط السائق", "Send the driver link", "Sürücü bağlantısını gönderin"],
      [
        "أنشئ رابطًا لكل رحلة وأرسله للسائق على واتساب مع رابط تطبيق السائق. التطبيق يرسل الموقع حتى والشاشة مطفأة.",
        "Create a link for each trip and send it to the driver on WhatsApp with the driver app link. The app sends the position even with the screen off.",
        "Her sefer için bağlantı oluşturup sürücü uygulamasıyla birlikte WhatsApp'tan gönderin. Uygulama ekran kapalıyken bile konum gönderir.",
      ],
    ),
    S(
      "tracking",
      ["الرحلة والتسليم", "Trip and delivery", "Sefer ve teslim"],
      [
        "ابدأ النقل، وأرسل صور التحميل والختم والمعبر، وعند الوصول خذ توقيع المستلم ورمز التسليم كإثبات.",
        "Start the trip, send photos of loading, the seal and the crossing, and at arrival take the receiver's signature and delivery code as proof.",
        "Seferi başlatın; yükleme, mühür ve kapı fotoğrafları gönderin; varışta alıcının imzasını ve teslim kodunu kanıt olarak alın.",
      ],
    ),
    S(
      "border",
      ["بلّغ عن الزحمة", "Report the queue", "Kuyruğu bildirin"],
      [
        "وأنت على المعبر، اكتب مدة الانتظار ليستفيد الجميع. تقريرك يظهر بدون اسمك.",
        "When you are at a crossing, report the waiting time so everyone benefits. Your report appears without your name.",
        "Kapıdayken bekleme süresini bildirin, herkes faydalansın. Raporunuz adınız olmadan görünür.",
      ],
    ),
    S(
      "groups",
      ["رحلات مشتركة", "Shared trips", "Ortak seferler"],
      [
        "اعرض المساحة الفارغة في شاحنتك لرحلة قادمة، والتجار والأفراد يحجزون جزءًا منها.",
        "Offer the free space in your truck for an upcoming trip; traders and individuals book part of it.",
        "Yaklaşan bir sefer için aracınızdaki boş alanı sunun; tüccarlar ve bireyler bir kısmını ayırtır.",
      ],
    ),
    documents,
    docsPrivacy,
    returnTripsCarrier,
    prices,
    install,
    driversStep,
    guaranteeStep,
    trustStep,
    bestTime,
    whatsappStep,
    referral,
    hub,
    feedback,
  ],
  broker: [
    S(
      "profile",
      ["أكمل ملفك ومعابرك", "Complete your profile and crossings", "Profilinizi ve kapılarınızı tamamlayın"],
      [
        "اكتب خدماتك ورقم رخصتك والمعابر التي تعمل عليها. شركات النقل تبحث عنك حسب المعبر.",
        "Add your services, licence number and the crossings you work at. Carriers find you by crossing.",
        "Hizmetlerinizi, yetki numaranızı ve çalıştığınız kapıları ekleyin. Taşıyıcılar sizi kapıya göre bulur.",
      ],
    ),
    verify,
    S(
      "jobs",
      ["قدّم عروض التخليص", "Send clearance offers", "Gümrükleme teklifi verin"],
      [
        "ترى مراحل «التخليص والمناقلة» المفتوحة على المعابر. اكتب سعرك والمدة.",
        "You see open clearance and transfer stages at the crossings. Enter your price and time.",
        "Kapılardaki açık gümrükleme ve aktarma aşamalarını görürsünüz. Fiyat ve süre girin.",
      ],
    ),
    S(
      "tracking",
      ["ابدأ عند وصول الشاحنة", "Start when the truck arrives", "Araç gelince başlayın"],
      [
        "يصلك تنبيه عندما تصل شاحنة المرحلة الأولى إلى المعبر. ابدأ التخليص، وعند الانتهاء اضغط «تم التخليص» لتبدأ المرحلة التالية.",
        "You get an alert when the first-stage truck reaches the crossing. Start clearance, and when done press 'cleared' so the next stage can begin.",
        "İlk aşamanın aracı kapıya varınca uyarı alırsınız. Gümrüklemeyi başlatın, bitince 'gümrüklendi'ye basın ki sonraki aşama başlasın.",
      ],
    ),
    S(
      "border",
      [
        "بلّغ عن الزحمة وتابع القرارات",
        "Report queues and follow decisions",
        "Kuyruk bildirin, kararları izleyin",
      ],
      [
        "أنت على المعبر يوميًا: تقاريرك عن الانتظار تساعد الجميع، وتصلك القرارات الجديدة أولًا بأول.",
        "You are at the crossing daily: your waiting reports help everyone, and new decisions reach you as they happen.",
        "Her gün kapıdasınız: bekleme raporlarınız herkese yardım eder, yeni kararlar size anında ulaşır.",
      ],
    ),
    documents,
    docsPrivacy,
    prices,
    install,
    trustStep,
    bestTime,
    whatsappStep,
    referral,
    hub,
    feedback,
  ],
  supplier: [
    profile,
    verify,
    S(
      "inventory",
      ["اعرض معداتك", "List your equipment", "Ekipmanınızı listeleyin"],
      [
        "أضف المعدات للبيع أو الإيجار مع السعر والتوفر.",
        "Add equipment for sale or rent with price and availability.",
        "Satılık veya kiralık ekipmanı fiyat ve müsaitlikle ekleyin.",
      ],
    ),
    S(
      "orders",
      ["أكّد الطلبات", "Confirm orders", "Siparişleri onaylayın"],
      [
        "تصلك طلبات الشراء والحجز بإشعار. أكّدها ثم علّمها «مكتمل» بعد التسليم.",
        "Purchase and booking requests reach you as notifications. Confirm them, then mark them completed after delivery.",
        "Satın alma ve rezervasyon talepleri bildirim olarak gelir. Onaylayın, teslimden sonra tamamlandı olarak işaretleyin.",
      ],
    ),
    S(
      "calendar",
      ["تقويم الحجوزات", "Booking calendar", "Rezervasyon takvimi"],
      [
        "شاهد متى تكون كل قطعة محجوزة حتى لا يتكرر الحجز.",
        "See when each item is booked so bookings never overlap.",
        "Çakışma olmasın diye her ekipmanın ne zaman dolu olduğunu görün.",
      ],
    ),
    documents,
    docsPrivacy,
    install,
    whatsappStep,
    referral,
    hub,
    feedback,
  ],
  individual: [
    profile,
    verify,
    S(
      "newShipment",
      ["اطلب شحن أغراضك", "Request shipping for your goods", "Eşyalarınız için taşıma isteyin"],
      [
        "اكتب من أين وإلى أين وحجم الأغراض، وتصلك عروض من ناقلين.",
        "Enter where from, where to and the size of your goods, and carriers send you offers.",
        "Nereden, nereye ve eşyaların boyutunu yazın; taşıyıcılar teklif gönderir.",
      ],
    ),
    S(
      "groups",
      ["أو احجز مساحة في رحلة", "Or book space on a trip", "Veya bir seferde yer ayırtın"],
      [
        "إذا كانت أغراضك قليلة، احجز جزءًا من شاحنة مسافرة بسعر أقل.",
        "For small loads, book part of a truck that is already travelling, for less.",
        "Az yük için yola çıkacak bir araçta daha ucuza yer ayırtın.",
      ],
    ),
    S(
      "shipments",
      ["اقبل العرض وادفع", "Accept an offer and pay", "Teklifi kabul edip ödeyin"],
      [
        "اختر العرض المناسب، وادفع بالطريقة المحمية أو مباشرة للناقل.",
        "Choose the right offer and pay with protected payment or directly to the carrier.",
        "Uygun teklifi seçin; korumalı ödemeyle veya doğrudan taşıyıcıya ödeyin.",
      ],
    ),
    S(
      "tracking",
      ["تابع وأكّد الاستلام", "Follow and confirm delivery", "İzleyin ve teslimi onaylayın"],
      [
        "تابع الشاحنة على الخريطة، وبعد الوصول أكّد الاستلام وقيّم الناقل.",
        "Follow the truck on the map, and after arrival confirm delivery and rate the carrier.",
        "Aracı haritada izleyin; varınca teslimi onaylayıp taşıyıcıyı değerlendirin.",
      ],
    ),
    documents,
    docsPrivacy,
    compare,
    repeat,
    returnTripsTrader,
    prices,
    install,
    sharedStep,
    trustStep,
    bestTime,
    whatsappStep,
    hub,
    feedback,
  ],
  admin: [
    S(
      "companies",
      ["راجع الحسابات الجديدة", "Review new accounts", "Yeni hesapları inceleyin"],
      [
        "افتح تفاصيل كل حساب وصفحته ووثائقه. وافق أو ارفض مع سبب واضح، وأرسل السبب على واتساب. من نفس المكان: الاشتراك والأشهر المدفوعة ورابط إعادة كلمة المرور.",
        "Open each account's details, page and documents. Approve, or reject with a clear reason and send it on WhatsApp. Same place: subscription, paid months and password reset link.",
        "Her hesabın ayrıntılarını, sayfasını ve belgelerini açın. Onaylayın veya net bir gerekçeyle reddedip WhatsApp'tan gönderin. Aynı yerde: abonelik, ödenen aylar ve şifre sıfırlama bağlantısı.",
      ],
    ),
    S(
      "kyb",
      ["وثائق التوثيق", "Verification documents", "Doğrulama belgeleri"],
      [
        "طابق السجل التجاري أو الجواز مع بيانات الحساب، وسجّل مرجع قرارك.",
        "Match the trade registry or passport with the account details and record the reference for your decision.",
        "Ticaret sicili veya pasaportu hesap bilgileriyle eşleştirip kararınızın dayanağını kaydedin.",
      ],
    ),
    S(
      "border",
      ["انشر تنبيهات الحدود", "Post border notices", "Sınır duyurusu yayınlayın"],
      [
        "إغلاق معبر أو قرار جديد؟ انشره مع مصدره، ويصل لكل الشركات بإشعار وإيميل وواتساب لمن فعّله.",
        "A crossing closed or a new decision? Post it with its source; it reaches every company by notification, email and WhatsApp for those who opted in.",
        "Kapı kapandı mı, yeni karar mı var? Kaynağıyla yayınlayın; tüm şirketlere bildirim, e-posta ve açanlara WhatsApp ile ulaşır.",
      ],
    ),
    adminDocs,
    feedbackAdminStep,
    prices,
    S(
      "admin",
      ["إعدادات الموقع", "Site settings", "Site ayarları"],
      [
        "الحسابات التجريبية، إيميل وواتساب التنبيهات، أسعار الاشتراك (إظهار أو إخفاء)، إيقاف الحسابات المنتهي اشتراكها، الدفعات البنكية، وتنزيل نسخة احتياطية.",
        "Demo accounts, alert email and WhatsApp, subscription prices (show or hide), blocking expired subscriptions, bank payments and downloading a backup.",
        "Demo hesaplar, uyarı e-postası ve WhatsApp, abonelik fiyatları (göster/gizle), süresi dolan abonelikleri engelleme, banka ödemeleri ve yedek indirme.",
      ],
    ),
    S(
      "shipments",
      ["راقب الشحنات والنزاعات", "Watch shipments and disputes", "Sevkiyatları ve itirazları izleyin"],
      [
        "كل الشحنات والعروض، والنزاعات التي صعّدها الطرفان للإدارة.",
        "All shipments and offers, and disputes escalated to the administration.",
        "Tüm sevkiyatlar ve teklifler ile yönetime iletilen itirazlar.",
      ],
    ),
  ],
};

export const guideTips = [
  [
    "الإشعارات (الجرس أعلى الصفحة) تخبرك بكل جديد: عرض، دفعة، وصول، قرار.",
    "Notifications (the bell at the top) tell you everything new: offers, payments, arrivals, decisions.",
    "Bildirimler (üstteki zil) her yeniliği söyler: teklif, ödeme, varış, karar.",
  ],
  [
    "غيّر اللغة والعملة من أعلى الصفحة في أي وقت.",
    "Change language and currency at the top of the page at any time.",
    "Dili ve para birimini istediğiniz zaman sayfanın üstünden değiştirin.",
  ],
  [
    "فعّل التحقق بخطوتين من «الأمان» لحماية حسابك.",
    "Turn on two-step verification under Security to protect your account.",
    "Hesabınızı korumak için Güvenlik'ten iki adımlı doğrulamayı açın.",
  ],
];
