// Additional interface texts: [Arabic, English, Turkish].
export const extraRows = {
  // Registration details per account type
  residenceCountry: ["بلد الإقامة", "Country of residence", "İkamet ülkesi"],
  registrationCountry: ["بلد تسجيل الشركة", "Company registration country", "Şirketin kayıtlı olduğu ülke"],
  countryLabel: ["البلد", "Country", "Ülke"],
  city: ["المدينة", "City", "Şehir"],
  phone: ["رقم الهاتف", "Phone number", "Telefon numarası"],
  choose: ["اختر", "Choose", "Seçin"],
  taxIdHint: [
    "تركيا: رقم ضريبي من 10 أرقام (VKN) أو رقم هوية من 11 رقمًا للمؤسسات الفردية — يتم التحقق منه تلقائيًا. دول الاتحاد الأوروبي: رقم VAT ويُفحص عبر VIES.",
    "Türkiye: 10-digit tax number (VKN) or 11-digit ID for sole traders — checked automatically. EU: VAT number, checked with VIES.",
    "Türkiye: 10 haneli VKN veya şahıs şirketleri için 11 haneli TCKN — otomatik kontrol edilir. AB: KDV numarası, VIES ile kontrol edilir.",
  ],
  tradeActivity: ["نوع النشاط التجاري", "Trade activity", "Ticari faaliyet"],
  activity_import: ["استيراد", "Import", "İthalat"],
  activity_export: ["تصدير", "Export", "İhracat"],
  activity_both: ["استيراد وتصدير", "Import and export", "İthalat ve ihracat"],
  mainProducts: ["أهم البضائع التي تتعامل بها", "Main goods you trade", "Başlıca ticaret ürünleri"],
  mainProductsHint: [
    "مثال: أقمشة، مواد غذائية، آلات",
    "e.g. fabrics, food, machinery",
    "örn. kumaş, gıda, makine",
  ],
  transportLicense: ["رقم رخصة النقل", "Transport licence number", "Taşıma yetki belgesi no"],
  fleetSize: ["عدد الشاحنات", "Number of trucks", "Araç sayısı"],
  serviceRoutes: ["الخطوط التي تخدمها", "Routes you serve", "Hizmet verilen güzergâhlar"],
  serviceRoutesHint: ["مثال: غازي عنتاب ⇄ حلب", "e.g. Gaziantep ⇄ Aleppo", "örn. Gaziantep ⇄ Halep"],
  equipmentTypes: ["أنواع المعدات التي تقدمها", "Equipment you offer", "Sunduğunuz ekipmanlar"],
  equipmentTypesHint: [
    "مثال: حاويات، أجهزة تتبع، منصات",
    "e.g. containers, trackers, pallets",
    "örn. konteyner, takip cihazı, palet",
  ],
  warehouseLocation: [
    "موقع المستودع (اختياري)",
    "Warehouse location (optional)",
    "Depo konumu (isteğe bağlı)",
  ],

  // Tax check results
  tax_valid: ["رقم ضريبي صحيح", "Tax number valid", "Vergi numarası geçerli"],
  tax_invalid: ["رقم ضريبي غير صحيح", "Tax number invalid", "Vergi numarası geçersiz"],
  tax_format_ok: ["يحتاج تحقق يدوي", "Needs manual check", "Elle kontrol gerekli"],
  taxMethod_tr_vkn_checksum: [
    "(فحص خانة التحقق لرقم VKN التركي)",
    "(Turkish VKN check digit)",
    "(VKN kontrol hanesi)",
  ],
  taxMethod_tr_tckn_checksum: [
    "(فحص خانة التحقق لرقم TCKN التركي)",
    "(Turkish TCKN check digit)",
    "(TCKN kontrol hanesi)",
  ],
  taxMethod_tr_length: [
    "(الرقم التركي يجب أن يكون 10 أو 11 رقمًا)",
    "(Turkish number must have 10 or 11 digits)",
    "(10 veya 11 hane olmalı)",
  ],
  taxMethod_eu_vies: [
    "(تم التحقق عبر نظام VIES الأوروبي)",
    "(verified with EU VIES)",
    "(AB VIES ile doğrulandı)",
  ],
  taxMethod_eu_vies_unavailable: [
    "(خدمة VIES لم ترد — أعد الفحص لاحقًا)",
    "(VIES did not answer — check again later)",
    "(VIES yanıt vermedi — sonra tekrar deneyin)",
  ],
  taxMethod_eu_vies_pending: ["(بانتظار فحص VIES)", "(VIES check pending)", "(VIES kontrolü bekleniyor)"],
  taxMethod_manual: [
    "(لا يوجد سجل إلكتروني عام لهذا البلد — طابقه مع وثيقة السجل التجاري)",
    "(no public online register for this country — compare with the registry document)",
    "(bu ülke için açık çevrimiçi kayıt yok — sicil belgesiyle karşılaştırın)",
  ],
  taxMethod_format: ["(صيغة غير صالحة)", "(invalid format)", "(geçersiz biçim)"],
  recheckTax: ["إعادة فحص الرقم الضريبي", "Check tax number again", "Vergi numarasını tekrar kontrol et"],
  gibCheck: ["التحقق من بوابة الضرائب التركية GİB", "Verify on Turkish GİB portal", "GİB üzerinden doğrula"],

  // Admin approval
  approveAccount: ["موافقة", "Approve", "Onayla"],
  rejectAccount: ["رفض", "Reject", "Reddet"],
  approveAccountConfirm: [
    "الموافقة على هذا الحساب تسمح له باستخدام المنصة فورًا. متابعة؟",
    "Approving lets this account use the platform immediately. Continue?",
    "Onay bu hesabın platformu hemen kullanmasına izin verir. Devam edilsin mi?",
  ],
  rejectionReasonPrompt: [
    "اكتب سبب الرفض (سيصل لصاحب الحساب):",
    "Write the reason for rejection (sent to the account owner):",
    "Ret nedenini yazın (hesap sahibine gönderilir):",
  ],
  rejectionReason: ["سبب الرفض", "Reason", "Ret nedeni"],

  // Site settings
  siteSettings: ["إعدادات الموقع", "Site settings", "Site ayarları"],
  showDemoAccounts: ["إظهار الحسابات التجريبية", "Show demo accounts", "Demo hesapları göster"],
  showDemoAccountsNote: [
    "يظهر زر «تجربة» تحت كل صفحة دخول. بيانات التجربة منفصلة تمامًا عن الحسابات الحقيقية. إخفاؤه يُخرج كل جلسات التجربة.",
    "Shows a “Try demo” button under every sign-in page. Demo data is fully separate from real accounts. Hiding it ends all demo sessions.",
    "Her giriş sayfasının altında “Demo dene” düğmesi gösterir. Demo verileri gerçek hesaplardan tamamen ayrıdır. Gizlemek tüm demo oturumlarını kapatır.",
  ],
  activityEmails: [
    "إرسال عمليات الموقع إلى بريدي",
    "Email me site activity",
    "Site etkinliğini bana e-postayla gönder",
  ],
  activityEmailsNote: [
    "تسجيل حساب، طلب توثيق، شحنة جديدة، قبول عرض، دفع، انطلاق، اكتمال عملية، نزاع، إلغاء، طلبات وحجوزات.",
    "New accounts, verification requests, shipments, accepted offers, payments, dispatch, completed operations, disputes, cancellations, orders and bookings.",
    "Yeni hesaplar, doğrulama talepleri, sevkiyatlar, kabul edilen teklifler, ödemeler, çıkışlar, tamamlanan işlemler, ihtilaflar, iptaller, siparişler ve rezervasyonlar.",
  ],
  notifyEmail: ["بريد استلام التقارير", "Activity email address", "Etkinlik e-posta adresi"],
  activityRecipient: ["تصل الرسائل حاليًا إلى", "Currently sent to", "Şu adrese gönderiliyor"],

  // Payment methods and completion
  choosePayment: ["اختر طريقة الدفع:", "Choose how to pay:", "Ödeme yöntemini seçin:"],
  payDirect: ["الدفع مباشرة للناقل", "Pay the carrier directly", "Taşıyıcıya doğrudan öde"],
  payDirectConfirm: [
    "ستدفع المبلغ للناقل مباشرة (نقدًا أو تحويلًا) خارج المنصة، ولن يكون محفوظًا كضمان. يبدأ النقل بعد أن يؤكد الناقل استلام المبلغ. متابعة؟",
    "You will pay the carrier directly (cash or transfer) outside the platform, without escrow protection. Transport starts after the carrier confirms receipt. Continue?",
    "Taşıyıcıya platform dışında doğrudan ödeyeceksiniz (nakit veya havale), emanet koruması olmadan. Taşıyıcı ödemeyi onayladıktan sonra taşıma başlar. Devam edilsin mi?",
  ],
  paymentMethodsNote: [
    "التحويل البنكي للمنصة يحفظ المبلغ كضمان حتى تأكيد الاستلام (أكثر أمانًا). الدفع المباشر أسرع لكنه بدون ضمان.",
    "Bank transfer to the platform keeps the money in escrow until you confirm delivery (safer). Direct payment is faster but has no escrow.",
    "Platforma banka havalesi, teslimatı onaylayana kadar parayı emanette tutar (daha güvenli). Doğrudan ödeme daha hızlıdır ama emanet yoktur.",
  ],
  waitingCarrierPayment: [
    "اخترت الدفع المباشر. بانتظار تأكيد الناقل استلام المبلغ.",
    "You chose direct payment. Waiting for the carrier to confirm receipt.",
    "Doğrudan ödeme seçtiniz. Taşıyıcının onayı bekleniyor.",
  ],
  confirmPaymentReceived: ["أكّد استلام المبلغ", "Confirm payment received", "Ödemenin alındığını onayla"],
  confirmPaymentConfirm: [
    "هل استلمت مبلغ الشحنة كاملًا من صاحبها؟",
    "Did you receive the full shipment payment from the owner?",
    "Sevkiyat ödemesinin tamamını aldınız mı?",
  ],
  confirmDeliveryConfirm: [
    "تأكيد الاستلام يغلق العملية ويحرر المبلغ للناقل. هل وصلت الشحنة سليمة؟",
    "Confirming receipt closes the operation and releases payment to the carrier. Did the shipment arrive in good condition?",
    "Teslim onayı işlemi kapatır ve ödemeyi taşıyıcıya bırakır. Sevkiyat sağlam ulaştı mı?",
  ],
  direct_pending: ["بانتظار تأكيد الدفع المباشر", "Direct payment pending", "Doğrudan ödeme bekleniyor"],
  direct_paid: ["مدفوع مباشرة للناقل", "Paid directly to carrier", "Taşıyıcıya doğrudan ödendi"],
  paidDirect: ["دُفع مباشرة للناقل", "paid directly to the carrier", "taşıyıcıya doğrudan ödendi"],
  operationComplete: [
    "العملية مكتملة ومغلقة",
    "Operation completed and closed",
    "İşlem tamamlandı ve kapandı",
  ],
  completedOn: ["تاريخ الإغلاق:", "Closed on", "Kapanış:"],
  operationSummary: ["ملخص العملية", "Operation summary", "İşlem özeti"],
  event_order_update: ["تحديث على طلب الشراء", "Purchase order update", "Sipariş güncellemesi"],
  event_pay_direct: ["اختير الدفع المباشر", "Direct payment chosen", "Doğrudan ödeme seçildi"],
  event_confirm_payment: [
    "أكّد الناقل استلام الدفع",
    "Carrier confirmed payment",
    "Taşıyıcı ödemeyi onayladı",
  ],

  "err_Invalid phone number": ["رقم الهاتف غير صالح.", "Invalid phone number.", "Geçersiz telefon numarası."],
  "err_Choose the trade activity": [
    "اختر نوع النشاط التجاري.",
    "Choose the trade activity.",
    "Ticari faaliyeti seçin.",
  ],
  "err_Invalid fleet size": ["عدد الشاحنات غير صالح.", "Invalid number of trucks.", "Geçersiz araç sayısı."],
  "err_Rejection reason required": [
    "اكتب سبب الرفض.",
    "Write the reason for rejection.",
    "Ret nedenini yazın.",
  ],
  "err_Account has no tax number": [
    "لا يوجد رقم ضريبي لهذا الحساب.",
    "This account has no tax number.",
    "Bu hesabın vergi numarası yok.",
  ],

  // Notifications added with the new features
  event_bid_withdrawn: ["سحب ناقل عرضه", "A carrier withdrew an offer", "Bir taşıyıcı teklifini geri çekti"],
  event_cancel: ["أُلغيت شحنة", "A shipment was cancelled", "Bir sevkiyat iptal edildi"],
  event_group_reserved: [
    "حجز جديد في رحلتك المشتركة",
    "New booking on your shared trip",
    "Ortak seferinize yeni rezervasyon",
  ],
  event_order_received: ["طلب شراء جديد", "New purchase order", "Yeni satın alma siparişi"],
  event_message_received: ["وصلتك رسالة جديدة", "New message", "Yeni mesaj"],
  event_location_update: ["تحديث موقع الشحنة", "Shipment location update", "Sevkiyat konum güncellemesi"],

  // Shipment and offer actions
  cancelShipment: ["إلغاء الشحنة", "Cancel shipment", "Sevkiyatı iptal et"],
  cancelShipmentConfirm: [
    "هل تريد إلغاء هذه الشحنة؟ سيتم إبلاغ الناقلين ولا يمكن التراجع.",
    "Cancel this shipment? Carriers will be notified and this cannot be undone.",
    "Bu sevkiyat iptal edilsin mi? Taşıyıcılar bilgilendirilir ve geri alınamaz.",
  ],
  withdrawBid: ["سحب عرضي", "Withdraw my offer", "Teklifimi geri çek"],
  withdrawBidConfirm: ["هل تريد سحب عرضك؟", "Withdraw your offer?", "Teklifiniz geri çekilsin mi?"],
  yourOffer: ["عرضك", "Your offer", "Teklifiniz"],
  acceptBidConfirm: [
    "قبول هذا العرض يغلق الشحنة أمام باقي العروض. متابعة؟",
    "Accepting this offer closes the shipment to other offers. Continue?",
    "Bu teklifi kabul etmek diğer teklifleri kapatır. Devam edilsin mi?",
  ],
  noteOptional: ["ملاحظة (اختياري)", "Note (optional)", "Not (isteğe bağlı)"],
  commentOptional: ["تعليق (اختياري)", "Comment (optional)", "Yorum (isteğe bağlı)"],
  departed: ["انطلقت", "Departed", "Hareket etti"],
  noGroups: [
    "لا توجد رحلات مشتركة قادمة حاليًا",
    "No upcoming shared trips right now",
    "Şu anda yaklaşan ortak sefer yok",
  ],

  // Account and password
  demoBanner: [
    "حساب تجريبي · بيانات توضيحية منفصلة عن الحسابات الحقيقية · لا مدفوعات حقيقية",
    "Demo account · sample data kept apart from real accounts · no real payments",
    "Demo hesap · gerçek hesaplardan ayrı örnek veriler · gerçek ödeme yok",
  ],
  logout: ["تسجيل الخروج", "Sign out", "Çıkış yap"],
  security: ["الأمان وكلمة المرور", "Security & password", "Güvenlik ve parola"],
  accountSecurity: ["أمان الحساب", "Account security", "Hesap güvenliği"],
  accountSecurityIntro: [
    "غيّر كلمة المرور. سيتم تسجيل خروج أي جهاز آخر مسجّل في حسابك.",
    "Change your password. Any other device signed in to your account will be signed out.",
    "Parolanızı değiştirin. Hesabınızdaki diğer cihazların oturumu kapatılır.",
  ],
  currentPassword: ["كلمة المرور الحالية", "Current password", "Mevcut parola"],
  newPassword: ["كلمة المرور الجديدة", "New password", "Yeni parola"],
  changePassword: ["تغيير كلمة المرور", "Change password", "Parolayı değiştir"],
  passwordChanged: ["تم تغيير كلمة المرور", "Password changed", "Parola değiştirildi"],
  demoNoPassword: [
    "الحسابات التجريبية لا تملك كلمة مرور.",
    "Demo accounts have no password.",
    "Demo hesapların parolası yoktur.",
  ],
  forgotPassword: ["نسيت كلمة المرور؟", "Forgot your password?", "Parolanızı mı unuttunuz?"],
  forgotIntro: [
    "أدخل بريدك المسجّل وسنرسل رابطًا لاختيار كلمة مرور جديدة، صالحًا لمدة ساعة.",
    "Enter your registered email and we will send a link to choose a new password. It is valid for one hour.",
    "Kayıtlı e-postanızı girin, yeni parola seçmeniz için bir saat geçerli bir bağlantı gönderelim.",
  ],
  sendResetLink: ["إرسال رابط الاستعادة", "Send reset link", "Sıfırlama bağlantısı gönder"],
  resetSent: [
    "إذا كان البريد مسجّلًا لدينا فستصلك رسالة خلال دقائق. تحقق أيضًا من مجلد الرسائل غير المرغوبة.",
    "If this email is registered, a message will arrive within minutes. Also check your spam folder.",
    "Bu e-posta kayıtlıysa birkaç dakika içinde bir mesaj gelecek. Spam klasörünü de kontrol edin.",
  ],
  resetNoEmail: [
    "إرسال البريد غير مفعّل في المنصة حاليًا. تواصل مع الإدارة لاستعادة حسابك:",
    "Email sending is not enabled on the platform yet. Contact the administration to recover your account:",
    "Platformda e-posta gönderimi henüz etkin değil. Hesabınızı kurtarmak için yönetimle iletişime geçin:",
  ],
  resetTitle: ["اختيار كلمة مرور جديدة", "Choose a new password", "Yeni parola seçin"],
  resetDone: [
    "تم تعيين كلمة المرور الجديدة. يمكنك تسجيل الدخول الآن.",
    "Your new password is set. You can sign in now.",
    "Yeni parolanız ayarlandı. Şimdi giriş yapabilirsiniz.",
  ],
  backToSignIn: ["العودة لتسجيل الدخول", "Back to sign in", "Girişe dön"],
  alreadySignedIn: ["أنت مسجّل الدخول باسم", "You are signed in as", "Şu hesapla giriş yaptınız:"],
  openWorkspace: ["فتح مساحة العمل", "Open workspace", "Çalışma alanını aç"],
  signedOut: ["تم تسجيل الخروج", "Signed out", "Çıkış yapıldı"],
  suspendAccount: ["إيقاف الحساب", "Suspend account", "Hesabı askıya al"],
  restoreAccount: ["إعادة تفعيل الحساب", "Restore account", "Hesabı yeniden etkinleştir"],
  suspendConfirm: [
    "إيقاف هذا الحساب يسجّل خروجه فورًا ويمنعه من الدخول. متابعة؟",
    "Suspending this account signs it out immediately and blocks sign-in. Continue?",
    "Bu hesabı askıya almak oturumunu hemen kapatır ve girişi engeller. Devam edilsin mi?",
  ],
  suspended: ["موقوف", "Suspended", "Askıda"],
  sessionExpired: [
    "انتهت جلستك. سجّل الدخول من جديد.",
    "Your session ended. Please sign in again.",
    "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.",
  ],
  offline: [
    "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مجددًا.",
    "Could not reach the server. Check your connection and try again.",
    "Sunucuya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
  ],
  menu: ["القائمة", "Menu", "Menü"],

  // Server error messages, shown in the visitor's language
  "err_Required field missing": [
    "يرجى تعبئة جميع الحقول المطلوبة.",
    "Please fill in all required fields.",
    "Lütfen tüm zorunlu alanları doldurun.",
  ],
  "err_Text too long": [
    "أحد النصوص أطول من المسموح.",
    "One of the texts is too long.",
    "Metinlerden biri çok uzun.",
  ],
  "err_Invalid credentials or account type": [
    "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
    "Incorrect email or password.",
    "E-posta veya parola hatalı.",
  ],
  "err_Email already registered": [
    "هذا البريد مسجّل مسبقًا. سجّل الدخول أو استخدم «نسيت كلمة المرور».",
    "This email is already registered. Sign in or use “Forgot your password?”.",
    "Bu e-posta zaten kayıtlı. Giriş yapın veya “Parolanızı mı unuttunuz?” seçeneğini kullanın.",
  ],
  "err_Invalid email": ["البريد الإلكتروني غير صالح.", "Invalid email address.", "Geçersiz e-posta adresi."],
  "err_Password must contain 12 to 128 characters": [
    "كلمة المرور يجب أن تكون بين 12 و128 حرفًا.",
    "The password must be 12 to 128 characters.",
    "Parola 12 ile 128 karakter arasında olmalıdır.",
  ],
  "err_Invalid company tax number": [
    "الرقم الضريبي غير صحيح. تحقق من الأرقام (للأرقام التركية يتم فحص خانة التحقق).",
    "The tax number is not valid. Check the digits (Turkish numbers are checked automatically).",
    "Vergi numarası geçersiz. Rakamları kontrol edin (Türk numaraları otomatik kontrol edilir).",
  ],
  "err_Too many attempts. Try again later.": [
    "محاولات كثيرة. انتظر عشر دقائق ثم حاول مجددًا.",
    "Too many attempts. Wait ten minutes and try again.",
    "Çok fazla deneme. On dakika bekleyip tekrar deneyin.",
  ],
  "err_Account disabled": [
    "هذا الحساب موقوف. تواصل مع إدارة المنصة.",
    "This account is suspended. Contact the platform administration.",
    "Bu hesap askıya alındı. Platform yönetimiyle iletişime geçin.",
  ],
  "err_Current password is incorrect": [
    "كلمة المرور الحالية غير صحيحة.",
    "The current password is incorrect.",
    "Mevcut parola hatalı.",
  ],
  "err_New password must be different": [
    "اختر كلمة مرور مختلفة عن الحالية.",
    "Choose a password different from the current one.",
    "Mevcut paroladan farklı bir parola seçin.",
  ],
  "err_Reset link invalid or expired": [
    "رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.",
    "The reset link is invalid or expired. Request a new one.",
    "Sıfırlama bağlantısı geçersiz veya süresi dolmuş. Yenisini isteyin.",
  ],
  "err_Demo login disabled": [
    "الحسابات التجريبية غير مفعّلة على هذا الموقع.",
    "Demo accounts are not enabled on this site.",
    "Bu sitede demo hesaplar etkin değil.",
  ],
  "err_Sign in required": [
    "انتهت جلستك. سجّل الدخول من جديد.",
    "Your session ended. Please sign in again.",
    "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.",
  ],
  "err_Account approval required": [
    "هذه الخدمة تتطلب اعتماد حسابك أولًا. أكمل طلب التوثيق.",
    "This service requires an approved account. Complete your verification first.",
    "Bu hizmet onaylı hesap gerektirir. Önce doğrulamanızı tamamlayın.",
  ],
  err_Forbidden: [
    "لا تملك صلاحية لهذه العملية.",
    "You do not have permission for this action.",
    "Bu işlem için yetkiniz yok.",
  ],
  "err_A registered administrator is required": [
    "هذه العملية متاحة لمسؤول مسجّل فقط.",
    "Only a registered administrator can do this.",
    "Bunu yalnızca kayıtlı bir yönetici yapabilir.",
  ],
  "err_HS Code is required and must contain 6 to 12 digits": [
    "رمز HS مطلوب ويجب أن يتكون من 6 إلى 12 رقمًا.",
    "HS Code is required and must have 6 to 12 digits.",
    "HS kodu zorunludur ve 6–12 haneli olmalıdır.",
  ],
  "err_Invalid shipment details": [
    "تحقق من نوع البضاعة والتاريخ (يجب أن يكون اليوم أو بعده).",
    "Check the category and date (it must be today or later).",
    "Kategori ve tarihi kontrol edin (bugün veya sonrası olmalı).",
  ],
  "err_Border crossing required": [
    "اختر المعبر الحدودي.",
    "Choose a border crossing.",
    "Bir sınır kapısı seçin.",
  ],
  "err_Invalid route country": ["اختر دولة صحيحة.", "Choose a valid country.", "Geçerli bir ülke seçin."],
  "err_Invalid volume": ["الحجم غير صالح.", "Invalid volume.", "Geçersiz hacim."],
  "err_Invalid weight": ["الوزن غير صالح.", "Invalid weight.", "Geçersiz ağırlık."],
  "err_Invalid price": ["السعر غير صالح.", "Invalid price.", "Geçersiz fiyat."],
  "err_Invalid days": [
    "مدة التوصيل يجب أن تكون عددًا صحيحًا من الأيام (1 إلى 365).",
    "Delivery time must be a whole number of days (1–365).",
    "Teslim süresi tam gün olmalıdır (1–365).",
  ],
  "err_Invalid capacity": ["السعة غير صالحة.", "Invalid capacity.", "Geçersiz kapasite."],
  "err_Invalid quantity": ["الكمية غير صالحة.", "Invalid quantity.", "Geçersiz miktar."],
  "err_Shipment closed": [
    "الشحنة لم تعد تستقبل عروضًا.",
    "This shipment no longer accepts offers.",
    "Bu sevkiyat artık teklif kabul etmiyor.",
  ],
  "err_Shipment unavailable": ["الشحنة غير متاحة.", "Shipment unavailable.", "Sevkiyat kullanılamıyor."],
  "err_Unknown shipment": ["الشحنة غير متاحة.", "Shipment unavailable.", "Sevkiyat kullanılamıyor."],
  "err_Shipment already assigned": [
    "تم إسناد الشحنة لناقل مسبقًا.",
    "The shipment is already assigned.",
    "Sevkiyat zaten atanmış.",
  ],
  "err_You already submitted an offer": [
    "قدّمت عرضًا على هذه الشحنة مسبقًا.",
    "You already submitted an offer for this shipment.",
    "Bu sevkiyata zaten teklif verdiniz.",
  ],
  "err_Bid unavailable": ["العرض غير متاح.", "Offer unavailable.", "Teklif kullanılamıyor."],
  "err_Invalid transition or actor": [
    "لا يمكن تنفيذ هذا الإجراء في حالة الشحنة الحالية.",
    "This action is not possible in the shipment’s current state.",
    "Bu işlem sevkiyatın mevcut durumunda yapılamaz.",
  ],
  "err_Insufficient capacity": [
    "المساحة المتبقية لا تكفي.",
    "Not enough remaining space.",
    "Kalan alan yetersiz.",
  ],
  "err_Group departed": ["انطلقت هذه الرحلة.", "This trip already departed.", "Bu sefer hareket etti."],
  "err_Unknown group": ["الرحلة غير متاحة.", "Trip unavailable.", "Sefer kullanılamıyor."],
  "err_Invalid departure date": [
    "تاريخ الانطلاق يجب أن يكون اليوم أو بعده.",
    "The departure date must be today or later.",
    "Kalkış tarihi bugün veya sonrası olmalıdır.",
  ],
  "err_Invalid recipient": ["المستلم غير متاح.", "Recipient unavailable.", "Alıcı kullanılamıyor."],
  "err_Invalid document": ["الملف غير صالح.", "Invalid file.", "Geçersiz dosya."],
  "err_Invalid file type or signature": [
    "نوع الملف غير مدعوم. استخدم PDF أو PNG أو JPEG.",
    "Unsupported file type. Use PDF, PNG or JPEG.",
    "Desteklenmeyen dosya türü. PDF, PNG veya JPEG kullanın.",
  ],
  "err_Document must be under 2 MB": [
    "حجم الملف يجب أن يكون أقل من 2 ميغابايت.",
    "The file must be under 2 MB.",
    "Dosya 2 MB'tan küçük olmalıdır.",
  ],
  "err_Application pending": [
    "لديك طلب توثيق قيد المراجعة.",
    "You already have a verification request under review.",
    "İncelenmekte olan bir doğrulama talebiniz var.",
  ],
  "err_Valid country required": ["اختر الدولة.", "Choose the country.", "Ülkeyi seçin."],
  "err_Valid passport expiry required": [
    "تاريخ انتهاء الجواز يجب أن يكون في المستقبل.",
    "The passport expiry date must be in the future.",
    "Pasaport bitiş tarihi gelecekte olmalıdır.",
  ],
  "err_Upload shipment documents first": [
    "ارفع وثائق الشحنة أولًا.",
    "Upload the shipment documents first.",
    "Önce sevkiyat belgelerini yükleyin.",
  ],
  "err_Feature disabled": [
    "هذه الخدمة غير مفعّلة حاليًا.",
    "This service is currently disabled.",
    "Bu hizmet şu anda kapalı.",
  ],
  "err_Equipment dates overlap": [
    "المعدات محجوزة في هذه التواريخ.",
    "The equipment is booked on these dates.",
    "Ekipman bu tarihlerde rezerve.",
  ],
  "err_Invalid rental dates": [
    "تواريخ الاستئجار غير صالحة.",
    "Invalid rental dates.",
    "Geçersiz kiralama tarihleri.",
  ],
  "err_Website must use https:// or http://": [
    "رابط الموقع يجب أن يبدأ بـ https://",
    "The website must start with https://",
    "Web sitesi https:// ile başlamalıdır",
  ],
  "err_Payment already submitted": [
    "أرسلت إيصال الدفع لهذه الشحنة مسبقًا.",
    "A payment receipt was already submitted for this shipment.",
    "Bu sevkiyat için ödeme dekontu zaten gönderildi.",
  ],
  "err_Bank payment unavailable": [
    "الدفع البنكي غير متاح لهذه الشحنة حاليًا.",
    "Bank payment is not available for this shipment right now.",
    "Bu sevkiyat için banka ödemesi şu anda kullanılamıyor.",
  ],
  "err_Plan changes are not available yet": [
    "تغيير خطة الاشتراك غير متاح بعد.",
    "Plan changes are not available yet.",
    "Plan değişikliği henüz mevcut değil.",
  ],
  "err_Concurrent update. Please retry.": [
    "تم تعديل البيانات في نفس اللحظة. أعد المحاولة.",
    "The data changed at the same moment. Please retry.",
    "Veriler aynı anda değişti. Lütfen tekrar deneyin.",
  ],
  "err_Unexpected server error": [
    "حدث خطأ غير متوقع في الخادم. حاول بعد قليل.",
    "Unexpected server error. Please try again shortly.",
    "Beklenmeyen sunucu hatası. Lütfen biraz sonra tekrar deneyin.",
  ],
  "err_Invalid request": ["الطلب غير صالح.", "Invalid request.", "Geçersiz istek."],
  "err_Delivered shipment required": [
    "التقييم متاح بعد تسليم الشحنة فقط.",
    "Ratings are available only after delivery.",
    "Değerlendirme yalnızca teslimattan sonra yapılabilir.",
  ],
  "err_Invalid or duplicate rating": [
    "التقييم غير صالح أو قيّمت هذه الشحنة مسبقًا.",
    "Invalid rating, or you already rated this shipment.",
    "Geçersiz değerlendirme veya bu sevkiyatı zaten değerlendirdiniz.",
  ],
};
