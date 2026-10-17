// Help-centre answers in Arabic, English and Turkish. Used by the Support page, by the quick
// answer search when no AI service is configured, and as the knowledge given to the AI assistant.
// Keep them true to how the platform works today; update when a feature changes.

export const faq = [
  {
    id: "register",
    k: "تسجيل حساب جديد موافقة توثيق انتظار register sign up account approval pending kayıt hesap onay",
    q: [
      "كيف أسجّل حسابًا ومتى يُفعَّل؟",
      "How do I register and when is my account activated?",
      "Nasıl kayıt olurum, hesabım ne zaman açılır?",
    ],
    a: [
      "اختر نوع حسابك (تاجر، ناقل، مخلّص جمركي، مورّد معدات أو فرد) وأدخل بياناتك ووافق على الشروط. كل حساب تراجعه إدارة المنصة يدويًا: أكمل صفحة التعريف ثم ارفع وثائق التوثيق (السجل التجاري أو الهوية) من «توثيق الشركات». يصلك القرار بإشعار، وإذا رُفض الطلب يظهر السبب ويمكنك التعديل وإعادة التقديم.",
      "Choose your account type (trader, carrier, customs broker, equipment supplier or individual), fill in your details and accept the terms. Every account is reviewed by the platform team: complete your profile, then upload your verification documents (trade registry or ID) under “Company verification”. You get a notice with the decision; if it is rejected you see the reason and can correct and resubmit.",
      "Hesap türünüzü seçin (tüccar, taşıyıcı, gümrük müşaviri, ekipman tedarikçisi veya bireysel), bilgilerinizi girin ve koşulları kabul edin. Her hesabı platform ekibi inceler: profilinizi tamamlayın, ardından “Şirket doğrulama” bölümünden belgelerinizi (ticaret sicili veya kimlik) yükleyin. Karar bildirimle gelir; reddedilirse nedeni görünür, düzeltip yeniden başvurabilirsiniz.",
    ],
  },
  {
    id: "post",
    k: "طلب شحن جديد نشر شحنة رمز HS عروض post shipment request new offers hs code sevkiyat talep teklif gtip",
    q: [
      "كيف أنشر طلب شحن وأستقبل العروض؟",
      "How do I post a shipment and get offers?",
      "Sevkiyat talebi nasıl yayınlanır, teklif nasıl alınır?",
    ],
    a: [
      "من «طلب شحن جديد» أدخل البضاعة ورمز HS (6–12 رقمًا) والوزن والحجم والمدن والتاريخ، والمعبر إذا كانت الشحنة بين تركيا وسوريا. بعد النشر تصلك عروض من الناقلين والمخلّصين مع السعر والمدة وتقييمهم والتزامهم بالمواعيد. قارن العروض واقبل الأنسب من «الشحنات والعروض».",
      "In “New shipment” enter the goods, HS code (6–12 digits), weight, volume, cities and date, and the crossing for a Türkiye–Syria shipment. After publishing, carriers and brokers send offers with price, days, rating and on-time record. Compare them and accept the best one under “Shipments & offers”.",
      "“Yeni sevkiyat” bölümünde malı, GTİP kodunu (6–12 hane), ağırlığı, hacmi, şehirleri, tarihi ve Türkiye–Suriye sevkiyatı için sınır kapısını girin. Yayından sonra taşıyıcı ve müşavirler fiyat, süre, puan ve zamanında teslim geçmişiyle teklif verir. Karşılaştırıp en uygununu “Sevkiyatlar ve teklifler”den kabul edin.",
    ],
  },
  {
    id: "stages",
    k: "معبر تركيا سوريا مراحل ثلاث تخليص نقل بين الشاحنات crossing border stages syria turkey clearance transfer sınır kapı aşama aktarma",
    q: [
      "لماذا تُقسم الشحنة بين تركيا وسوريا إلى 3 مراحل؟",
      "Why is a Türkiye–Syria shipment split into 3 stages?",
      "Türkiye–Suriye sevkiyatı neden 3 aşamaya ayrılır?",
    ],
    a: [
      "منذ 6 شباط 2026 لا تدخل الشاحنات غير السورية إلى سوريا عبر المعابر البرية (باستثناء الترانزيت المرافَق)، فتُنقل البضاعة بين الشاحنات في ساحة الجمرك. لذلك تنشئ المنصة 3 مراحل: نقل حتى المعبر، تخليص جمركي ونقل بين الشاحنات، ثم نقل من المعبر إلى الوجهة. لكل مرحلة مزوّدها وعروضها، وتتابع الكل من مكان واحد.",
      "Since 6 February 2026 non-Syrian trucks do not enter Syria through land crossings (escorted transit excepted), so goods are moved between trucks in the customs yard. The platform therefore creates 3 stages: transport to the crossing, customs clearance and transfer, then transport to the destination. Each stage has its own provider and offers, and you follow them all in one place.",
      "6 Şubat 2026'dan beri Suriyeli olmayan tırlar kara kapılarından Suriye'ye girmiyor (refakatli transit hariç); mal gümrük sahasında araçlar arasında aktarılır. Bu yüzden platform 3 aşama oluşturur: kapıya taşıma, gümrükleme ve aktarma, kapıdan varış yerine taşıma. Her aşamanın kendi sağlayıcısı ve teklifleri vardır; hepsini tek yerden izlersiniz.",
    ],
  },
  {
    id: "documents",
    k: "وثائق رفع فاتورة قائمة تعبئة مطلوبة علامة مائية documents upload invoice packing watermark belge yükleme fatura filigran",
    q: [
      "كيف أرفع الوثائق ومن يراها؟",
      "How do I upload documents and who sees them?",
      "Belgeleri nasıl yüklerim, kimler görür?",
    ],
    a: [
      "من «رفع الوثائق» اختر العملية ثم نوع الوثيقة وارفع ملف PDF أو صورة حتى 2 ميغابايت. المنصة لا تفرض وثائق؛ المطلوب هو ما يطلبه الطرف الآخر منك. يرى الوثيقة أطراف الشحنة وإدارة المنصة (للتأكد من أن البضاعة مسموحة). أي وثيقة يفتحها غير صاحبها تصله نسخة PDF عليها علامة مائية باسمه وإيميله ووقت الفتح، وصاحب الوثيقة يرى من فتحها.",
      "In “Documents” pick the operation, then the document type, and upload a PDF or image up to 2 MB. The platform imposes no documents; what is required is what the other party asks you for. The parties of the shipment and the platform team (to check the goods are allowed) can see it. Anyone other than the uploader gets a PDF copy watermarked with their name, email and the time, and the uploader sees who opened it.",
      "“Belgeler” bölümünde işlemi ve belge türünü seçip 2 MB'a kadar PDF veya görsel yükleyin. Platform belge dayatmaz; gerekli olan karşı tarafın istediğidir. Sevkiyatın tarafları ve platform ekibi (malın izinli olduğunu kontrol için) görür. Yükleyen dışındaki herkes adı, e-postası ve saatiyle filigranlı bir PDF kopyası alır; yükleyen kimin açtığını görür.",
    ],
  },
  {
    id: "tracking",
    k: "تتبع موقع الشاحنة GPS سائق رمز الاستلام تسليم إغلاق tracking gps driver delivery code close takip teslim kodu",
    q: [
      "كيف أتابع الشاحنة وكيف تُغلق العملية؟",
      "How do I track the truck and how does an operation close?",
      "Tırı nasıl takip ederim, işlem nasıl kapanır?",
    ],
    a: [
      "الناقل أو السائق يشارك موقعه من الموبايل فتراه على الخريطة مع الوصول للمعبر وعبوره. لكل شحنة رمز استلام تعطيه للمستلم: عند إدخاله وقت التسليم تُغلق العملية فورًا، وإلا تُغلق تلقائيًا بعد 24 ساعة من إثبات الوصول بالموقع أو بإثبات التسليم. ويمكنك مشاركة رابط تتبع مع المستلم.",
      "The carrier or driver shares their location from the phone, so you see it on the map, including reaching and crossing the border. Every shipment has a delivery code you give to the receiver: entered at delivery, it closes the operation at once; otherwise it closes automatically 24 hours after arrival is proven by GPS or a delivery proof. You can also share a tracking link with the receiver.",
      "Taşıyıcı veya sürücü konumunu telefondan paylaşır; kapıya varış ve geçiş dahil haritada görürsünüz. Her sevkiyatın alıcıya verdiğiniz bir teslim kodu vardır: teslimde girilirse işlem hemen kapanır; aksi halde GPS veya teslim kanıtıyla varış kanıtlandıktan 24 saat sonra otomatik kapanır. Alıcıyla takip bağlantısı da paylaşabilirsiniz.",
    ],
  },
  {
    id: "payment",
    k: "دفع الناقل تحويل بنكي مباشر عمولة payment pay carrier bank transfer direct commission ödeme taşıyıcı havale komisyon",
    q: [
      "كيف أدفع للناقل؟ وهل تأخذ المنصة عمولة؟",
      "How do I pay the carrier? Does the platform take a commission?",
      "Taşıyıcıya nasıl öderim? Platform komisyon alır mı?",
    ],
    a: [
      "لا عمولة على الشحنات. بعد قبول العرض تدفع للناقل مباشرة ويؤكد هو الاستلام على المنصة، أو بتحويل بنكي للمنصة إذا كان مفعّلًا وتؤكده الإدارة. المنصة تربح من الاشتراك الشهري فقط.",
      "There is no commission on shipments. After accepting an offer you pay the carrier directly and they confirm receipt on the platform, or by bank transfer to the platform when enabled, confirmed by the team. The platform only earns from the monthly subscription.",
      "Sevkiyatlardan komisyon alınmaz. Teklifi kabul ettikten sonra taşıyıcıya doğrudan ödersiniz ve o platformda teyit eder; ya da etkinse platforma havale yaparsınız ve ekip onaylar. Platform yalnızca aylık abonelikten gelir elde eder.",
    ],
  },
  {
    id: "subscription",
    k: "اشتراك سعر مجاني فترة دفع بطاقة شهر سنة تجديد استرجاع subscription price free trial card monthly yearly refund abonelik fiyat ücretsiz kart iade",
    q: [
      "كم الاشتراك وما الفترة المجانية؟",
      "How much is the subscription and what is the free period?",
      "Abonelik ne kadar, ücretsiz dönem nedir?",
    ],
    a: [
      "كل حساب موافق عليه يحصل على 3 أشهر مجانية من تاريخ الموافقة، و3 أشهر إضافية إذا أكمل 7 عمليات خلالها، وشهر مجاني عن كل شركة يدعوها وتُقبل (حتى 12 شهرًا). بعدها اشتراك شهري حسب نوع الحساب (الأسعار في الصفحة الرئيسية). الدفع بالبطاقة من بطاقة الاشتراك في لوحتك: شهر، أو سنة بسعر 10 أشهر، بدون تجديد تلقائي. شروط الاسترجاع في صفحة «شروط البيع والاسترجاع».",
      "Every approved account gets 3 free months from approval, 3 more if it completes 7 operations in that time, and one free month for every company it invites that gets approved (up to 12). After that there is a monthly subscription by account type (prices on the home page). Pay by card from the subscription card on your dashboard: one month, or one year for the price of 10, with no automatic renewal. Refund rules are on the “Sales & refund terms” page.",
      "Onaylanan her hesap onaydan itibaren 3 ay ücretsiz, bu sürede 7 işlem tamamlarsa 3 ay daha ve davet ettiği her onaylı şirket için bir ay (12'ye kadar) kazanır. Sonrasında hesap türüne göre aylık abonelik vardır (fiyatlar ana sayfada). Panelinizdeki abonelik kartından kartla ödeyin: bir ay veya 10 ay fiyatına bir yıl, otomatik yenileme yok. İade kuralları “Satış ve iade koşulları” sayfasındadır.",
    ],
  },
  {
    id: "prohibited",
    k: "بضاعة ممنوعة مرفوض رفض أسلحة prohibited goods rejected weapons yasaklı mal reddedildi",
    q: [
      "لماذا رُفض طلبي؟ ما البضائع الممنوعة؟",
      "Why was my request refused? What goods are prohibited?",
      "Talebim neden reddedildi? Yasaklı mallar nelerdir?",
    ],
    a: [
      "المنصة لا تقبل البضائع الممنوعة مثل الأسلحة والذخائر والمتفجرات والمخدرات والمواد المشعة. يُرفض الطلب تلقائيًا إذا دلّ رمز HS أو الوصف عليها، وقد ترفض الإدارة طلبًا بعد مراجعة الوثائق مع ذكر السبب. إذا كان الرفض خطأ، راسل الدعم مع رقم الطلب.",
      "The platform does not accept prohibited goods such as weapons, ammunition, explosives, drugs and radioactive material. A request is refused automatically when its HS code or description points to them, and the team may refuse a request after reviewing documents, giving the reason. If you think it is a mistake, contact support with the request number.",
      "Platform silah, mühimmat, patlayıcı, uyuşturucu ve radyoaktif madde gibi yasaklı malları kabul etmez. GTİP kodu veya açıklama bunlara işaret ederse talep otomatik reddedilir; ekip belgeleri inceledikten sonra nedenini belirterek reddedebilir. Hata olduğunu düşünüyorsanız talep numarasıyla destekle iletişime geçin.",
    ],
  },
  {
    id: "carrier",
    k: "ناقل عروض فرص نقل تنبيه طريق رحلة عودة سائق carrier jobs offer route alert return trip driver taşıyıcı iş teklif rota uyarı dönüş",
    q: [
      "أنا ناقل: كيف أجد الطلبات وأقدّم عروضي؟",
      "I am a carrier: how do I find requests and send offers?",
      "Taşıyıcıyım: talepleri nasıl bulur, teklif veririm?",
    ],
    a: [
      "من «فرص النقل» ترى الطلبات المفتوحة وتقدّم سعرك والمدة، ويمكنك إضافة ضمان تأخير. احفظ طرقك في «تنبيهات الطرق» أعلى الصفحة ليصلك إشعار (وواتساب إذا فعّلته) فور نشر طلب عليها. أضف أسطولك وسائقيك ووثّقهم، وانشر رحلات العودة الفارغة بسعر أقل.",
      "Under “Jobs” you see open requests and send your price and days; you can add a delay guarantee. Save your routes in “Route alerts” at the top of the page to get a notice (and WhatsApp if enabled) as soon as a request is posted on them. Add and verify your fleet and drivers, and post empty return trips at a lower price.",
      "“İşler” bölümünde açık talepleri görür, fiyat ve süre teklif edersiniz; gecikme garantisi ekleyebilirsiniz. Sayfanın üstündeki “Rota uyarıları”na rotalarınızı kaydedin; talep yayınlanınca hemen bildirim (açıksa WhatsApp) gelir. Filonuzu ve sürücülerinizi ekleyip doğrulayın, boş dönüş seferlerini daha uygun fiyata yayınlayın.",
    ],
  },
  {
    id: "team",
    k: "فريق موظف حساب صلاحية دعوة team employee member role invite ekip çalışan rol davet",
    q: [
      "كيف أضيف موظفين لحساب شركتي؟",
      "How do I add employees to my company account?",
      "Şirket hesabıma çalışan nasıl eklerim?",
    ],
    a: [
      "من «فريق العمل» (لصاحب الحساب) أضف اسم الموظف وإيميله وصلاحيته: مدير، عمليات، أو مشاهدة فقط. تحصل على رابط دعوة ترسله له بنفسك، يصلح 7 أيام لمرة واحدة، ومنه يختار كلمة مروره. يمكنك إيقافه أو حذفه أو إنشاء رابط جديد في أي وقت.",
      "In “Team” (account owner only) add the employee's name, email and role: manager, operations or view only. You get an invite link to send yourself; it works once for 7 days and they choose their password with it. You can disable or remove them, or create a new link, at any time.",
      "“Ekip” bölümünde (yalnızca hesap sahibi) çalışanın adını, e-postasını ve rolünü ekleyin: yönetici, operasyon veya yalnızca görüntüleme. Kendiniz göndereceğiniz bir davet bağlantısı alırsınız; 7 gün boyunca bir kez çalışır ve şifresini bununla belirler. İstediğiniz zaman devre dışı bırakabilir, silebilir veya yeni bağlantı oluşturabilirsiniz.",
    ],
  },
  {
    id: "recurring",
    k: "شحنة متكررة كل أسبوع شهر جدول recurring weekly monthly schedule tekrarlayan haftalık aylık",
    q: [
      "أشحن نفس البضاعة كل أسبوع، هل يمكن أتمتة ذلك؟",
      "I ship the same goods every week; can it be automated?",
      "Her hafta aynı malı gönderiyorum; otomatik yapılabilir mi?",
    ],
    a: [
      "نعم، من «شحنات متكررة» اختر شحنة سابقة وحدد التكرار (أسبوع، أسبوعين، شهر) وتاريخ أول شحنة. تنشر المنصة الطلب تلقائيًا قبل موعده بعدد الأيام الذي تختاره، وتبلّغ ناقلك المفضّل بالسعر المتفق عليه ليقدّم عرضه أولًا.",
      "Yes. In “Recurring shipments” choose an earlier shipment and set the repeat (weekly, every two weeks, monthly) and the first date. The platform publishes the request automatically the number of days you choose before its date, and tells your preferred carrier the agreed price so they can offer first.",
      "Evet. “Tekrarlayan sevkiyatlar”da önceki bir sevkiyatı seçin, tekrarı (haftalık, iki haftada bir, aylık) ve ilk tarihi belirleyin. Platform talebi seçtiğiniz gün kadar önce otomatik yayınlar ve tercih ettiğiniz taşıyıcıya anlaşılan fiyatı bildirir.",
    ],
  },
  {
    id: "password",
    k: "كلمة المرور نسيت دخول تحقق بخطوتين password forgot login two factor 2fa şifre unuttum giriş iki adımlı",
    q: [
      "نسيت كلمة المرور أو لا أستطيع الدخول",
      "I forgot my password or cannot sign in",
      "Şifremi unuttum veya giriş yapamıyorum",
    ],
    a: [
      "استخدم «نسيت كلمة المرور» في صفحة الدخول. إذا لم يصلك البريد، تواصل مع الدعم عبر واتساب. ننصح بتفعيل التحقق بخطوتين من «الأمان وكلمة المرور» وحفظ الرموز الاحتياطية. لن نطلب منك كلمة المرور أبدًا عبر الرسائل.",
      "Use “Forgot password” on the sign-in page. If no email arrives, contact support on WhatsApp. We recommend turning on two-step verification under “Security & password” and keeping the backup codes. We will never ask you for your password in a message.",
      "Giriş sayfasında “Şifremi unuttum”u kullanın. E-posta gelmezse WhatsApp'tan destekle iletişime geçin. “Güvenlik ve şifre” bölümünden iki adımlı doğrulamayı açmanızı ve yedek kodları saklamanızı öneririz. Şifrenizi asla mesajla istemeyiz.",
    ],
  },
  {
    id: "whatsapp",
    k: "واتساب إشعارات تنبيه رسائل whatsapp notifications alerts bildirim",
    q: [
      "كيف تصلني الإشعارات على واتساب؟",
      "How do I get notifications on WhatsApp?",
      "Bildirimleri WhatsApp'tan nasıl alırım?",
    ],
    a: [
      "أضف رقم هاتفك الدولي في بياناتك، ثم فعّل «إشعارات واتساب» من «التعريف والخدمات». تصلك الأحداث المهمة: وثيقة مطلوبة، وصول الشاحنة للمعبر أو للتسليم، إغلاق العملية، طلبات على طرقك المحفوظة وغيرها.",
      "Add your international phone number in your details, then turn on “WhatsApp notifications” under “Profile & services”. You get the important events: a document requested, the truck reaching the crossing or the delivery place, the operation closing, requests on your saved routes and more.",
      "Bilgilerinize uluslararası telefon numaranızı ekleyin, ardından “Profil ve hizmetler”den “WhatsApp bildirimleri”ni açın. Önemli olaylar gelir: belge talebi, tırın kapıya veya teslim yerine varması, işlemin kapanması, kayıtlı rotalarınızdaki talepler ve diğerleri.",
    ],
  },
  {
    id: "complaint",
    k: "شكوى مشكلة نزاع تقييم اقتراح دعم بشري complaint problem dispute rating suggestion human support şikayet sorun anlaşmazlık destek",
    q: [
      "عندي مشكلة مع طرف آخر أو شكوى",
      "I have a problem with another party or a complaint",
      "Karşı tarafla sorunum veya şikâyetim var",
    ],
    a: [
      "اكتب شكواك من «التقييم والشكاوى» واختر النوع «شكوى» مع رقم الشحنة، فتصل لإدارة المنصة وتتابع الرد هناك. للأمور العاجلة تواصل معنا مباشرة على واتساب من زر الواتساب. بعد إغلاق كل عملية يمكنك تقييم الطرف الآخر.",
      "Write it in “Feedback & complaints”, choose “Complaint” and add the shipment, so it reaches the platform team and you follow the reply there. For urgent matters contact us directly on WhatsApp with the WhatsApp button. After every operation closes you can rate the other party.",
      "“Geri bildirim ve şikâyetler” bölümünde “Şikâyet” seçip sevkiyatı ekleyerek yazın; platform ekibine ulaşır ve yanıtı orada izlersiniz. Acil durumlarda WhatsApp düğmesiyle doğrudan bize yazın. Her işlem kapandıktan sonra karşı tarafı değerlendirebilirsiniz.",
    ],
  },
  {
    id: "public",
    k: "صفحة عامة رابط الشركة مشاركة public page company link share herkese açık sayfa paylaş",
    q: [
      "ما هي الصفحة العامة لشركتي؟",
      "What is my company's public page?",
      "Şirketimin herkese açık sayfası nedir?",
    ],
    a: [
      "صفحة يمكن لأي أحد فتحها بدون حساب: الاسم والنبذة والخدمات والتقييم وعدد العمليات. لا تظهر فيها أرقام الهاتف أو الإيميل أو الرقم الضريبي. رابطها في «التعريف والخدمات» ويمكنك إيقافها من هناك. شاركها مع زبائنك ليتعاملوا معك عبر المنصة.",
      "A page anyone can open without an account: name, summary, services, rating and number of operations. Phone, email and tax number are not shown. Its link is in “Profile & services”, where you can also turn it off. Share it with your customers so they work with you through the platform.",
      "Herkesin hesapsız açabileceği bir sayfa: ad, özet, hizmetler, puan ve işlem sayısı. Telefon, e-posta ve vergi numarası görünmez. Bağlantısı “Profil ve hizmetler”dedir, oradan kapatabilirsiniz. Müşterilerinizle paylaşın.",
    ],
  },
];

const L = (lang) => Math.max(0, ["ar", "en", "tr"].indexOf(lang));
const words = (v) =>
  String(v || "")
    .toLocaleLowerCase("tr")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);

// Best matching answers for a question (simple word overlap), used without an AI service.
export function searchFaq(question, lang = "ar", limit = 2) {
  const q = words(question);
  if (!q.length) return [];
  const i = L(lang);
  return faq
    .map((f) => {
      const hay = new Set(words(`${f.k} ${f.q.join(" ")}`));
      let score = 0;
      for (const w of q)
        if (hay.has(w) || [...hay].some((h) => h.length > 3 && (h.startsWith(w) || w.startsWith(h)))) score++;
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ f }) => ({ id: f.id, q: f.q[i], a: f.a[i] }));
}

// Plain-text knowledge for the AI assistant (one language is enough; it answers in the user's).
export const faqKnowledge = () => faq.map((f) => `س: ${f.q[0]}\nج: ${f.a[0]}`).join("\n\n");
