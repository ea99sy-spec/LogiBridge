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
  ["خصوصية وثائقك", "Your documents' privacy", "Belgelerinizin gizliliği"],
  [
    "أنت تختار: إدارة المنصة ترى دائمًا أن الوثيقة رُفعت ومتى ومن رفعها، لكنها لا تفتح محتواها إلا إذا فعّلت «السماح لإدارة المنصة بفتح محتوى وثائقي» في أعلى صفحة الوثائق. الشركات العاملة معك على الشحنة ترى الوثائق دائمًا.",
    "You choose: the platform administration always sees that a document was uploaded, when and by whom, but opens its content only if you turn on 'Let the platform administration open my documents' at the top of the documents page. Companies working with you on the shipment always see the documents.",
    "Siz seçersiniz: platform yönetimi belgenin yüklendiğini, ne zaman ve kimin yüklediğini her zaman görür; içeriği ise yalnızca belgeler sayfasının üstündeki 'Platform yönetimi belgelerimi açabilsin' seçeneğini açarsanız açabilir. Sevkiyatta sizinle çalışan şirketler belgeleri her zaman görür.",
  ],
);
const adminDocs = S(
  "documents",
  ["متابعة الوثائق", "Following documents", "Belgeleri takip"],
  [
    "في «رفع الوثائق» ترى لكل عملية: أي وثيقة رُفعت، ومتى، ومن رفعها، وما هو مطلوب وما زال ناقصًا. المحتوى يُفتح فقط إذا سمحت الشركة (🔒 = خاص). يمكنك أيضًا طلب وثيقة من أي طرف على العملية.",
    "In 'Upload documents' you see for every operation which document was uploaded, when and by whom, and what is requested and still missing. Content opens only if the company allows it (🔒 = private). You can also request a document from any party on the operation.",
    "'Belge yükleme' bölümünde her işlem için hangi belgenin ne zaman ve kim tarafından yüklendiğini, nelerin istendiğini ve eksik kaldığını görürsünüz. İçerik yalnızca şirket izin verirse açılır (🔒 = gizli). İşlemdeki herhangi bir taraftan belge de isteyebilirsiniz.",
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
    hub,
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
    hub,
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
    hub,
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
    hub,
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
    hub,
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
