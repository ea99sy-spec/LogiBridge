import React, { useEffect, useState } from "react";
import { TERMS_VERSION } from "../shared/legal";

// Legal details of the company running the platform, set by the administrator.
export function useCompany() {
  const [company, setCompany] = useState(null);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((r) => setCompany(r.company || null))
      .catch(() => {});
  }, []);
  return company;
}

// "Service provider" box (Turkish e-commerce law asks for the provider's details on the site).
export function CompanyInfo({ company, t, compact = false }) {
  if (!company?.legalName) return null;
  const rows = [
    ["mersis", company.mersis],
    [
      "taxOffice",
      company.taxOffice && company.taxNumber
        ? `${company.taxOffice} · ${company.taxNumber}`
        : company.taxOffice || company.taxNumber,
    ],
    ["address", company.address],
    ["kep", company.kep],
  ].filter(([, v]) => v);
  if (compact)
    return (
      <span className="company-line" dir="auto">
        {company.legalName}
        {company.mersis ? ` · MERSIS ${company.mersis}` : ""}
        {company.address ? ` · ${company.address}` : ""}
      </span>
    );
  return (
    <section className="company-info">
      <h2>{t("serviceProvider")}</h2>
      <p>
        <b dir="auto">{company.legalName}</b>
      </p>
      <dl>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{t("company_" + k)}</dt>
            <dd dir="auto">{v}</dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}

// Terms of use and privacy policy in the three interface languages.
// Last updated date is shown on the page; update it whenever the text changes.
const UPDATED = TERMS_VERSION.slice(0, 10);

const content = {
  terms: {
    ar: {
      title: "الشروط والأحكام",
      sections: [
        [
          "تعريف المنصة",
          "LogiBridge منصة إلكترونية تربط التجار والمستوردين والمصدّرين والأفراد بشركات النقل والشحن ومزوّدي المعدات. المنصة وسيط تقني فقط، وليست ناقلًا ولا وكيلًا جمركيًا ولا طرفًا في عقد النقل بين المستخدمين.",
        ],
        [
          "الحسابات والموافقة",
          "يجب أن تكون البيانات المقدّمة عند التسجيل صحيحة وكاملة، بما فيها الرقم الضريبي ووثائق السجل أو الهوية. تراجع إدارة المنصة كل حساب، ويحق لها قبوله أو رفضه أو إيقافه في أي وقت إذا ثبت تقديم معلومات غير صحيحة أو استخدام مخالف.",
        ],
        [
          "التزامات المستخدم",
          "يلتزم المستخدم بنقل بضائع مشروعة فقط، وبتقديم وصف ورمز HS ووثائق صحيحة، وبالالتزام بأنظمة الجمارك والتصدير والاستيراد في بلدان المنشأ والعبور والوصول. يتحمّل صاحب الشحنة مسؤولية صحة بيانات بضاعته. لا تقبل المنصة البضائع الممنوعة (مثل الأسلحة والذخائر والمتفجرات والمخدرات والمواد المشعة): يُرفض الطلب تلقائيًا إذا دلّ رمز HS أو الوصف عليها، وتراجع إدارة المنصة وثائق الشحنات ويحق لها رفض أي طلب مع ذكر السبب وإيقاف الحساب المخالف.",
        ],
        [
          "العروض والاتفاق",
          "عند قبول صاحب الشحنة عرض ناقل يصبح الاتفاق بينهما مباشرة بالسعر والمدة المذكورين. يستطيع صاحب الشحنة إلغاءها قبل الدفع، ويستطيع الناقل سحب عرضه قبل قبوله.",
        ],
        [
          "الاشتراك والدفع",
          "استخدام المنصة باشتراك شهري، وأول 3 أشهر مجانية لكل حساب جديد، تبدأ من تاريخ الموافقة على الحساب، وتمتد إلى 6 أشهر للحسابات التي تكمل 7 عمليات خلال الأشهر الثلاثة الأولى. يُعلن سعر الاشتراك في الموقع قبل انتهاء الفترة المجانية. يتم الدفع إما بتحويل بنكي إلى حساب المنصة ليُحفظ كضمان حتى تأكيد الاستلام، أو مباشرة للناقل. لا تأخذ المنصة أي عمولة على الشحنات، ويصل المبلغ المتفق عليه كاملًا للناقل. في الدفع المباشر لا تحفظ المنصة أي مبلغ ولا تتحمّل مسؤولية تحصيله أو استرداده.",
        ],
        [
          "إغلاق العملية والنزاعات",
          "تُغلق العملية عند تأكيد صاحب الشحنة الاستلام، ويُحرَّر المبلغ للناقل بعدها. عند حدوث مشكلة قبل التأكيد يمكن فتح نزاع واقتراح تسوية، ويمكن تصعيده لإدارة المنصة التي تقرّر في المبالغ المحفوظة لديها فقط.",
        ],
        [
          "حدود المسؤولية",
          "لا تضمن المنصة أداء أي مستخدم، ولا تتحمّل مسؤولية تلف البضائع أو تأخيرها أو مصادرتها أو أي قرار جمركي. التأمين على البضائع مسؤولية الطرفين ما لم يُتفق على غير ذلك كتابيًا.",
        ],
        [
          "الإيقاف وإنهاء الحساب",
          "يحق لإدارة المنصة إيقاف أي حساب يخالف هذه الشروط أو يسيء الاستخدام أو يقدّم وثائق مزوّرة، مع الاحتفاظ بالسجلات اللازمة قانونيًا.",
        ],
        [
          "التعديلات والقانون",
          "قد تُحدَّث هذه الشروط ويُعلن ذلك في الموقع. يخضع استخدام المنصة لقوانين الجمهورية التركية، وتختص محاكم إسطنبول بأي نزاع مع إدارة المنصة.",
        ],
      ],
    },
    en: {
      title: "Terms of Use",
      sections: [
        [
          "About the platform",
          "LogiBridge is an online platform connecting traders, importers, exporters and individuals with carriers, freight companies and equipment suppliers. The platform is a technology intermediary only. It is not a carrier, a customs broker or a party to the transport agreement between users.",
        ],
        [
          "Accounts and approval",
          "Registration details must be true and complete, including tax numbers and registry or identity documents. The administration reviews every account and may approve, reject or suspend it at any time if information proves false or the platform is misused.",
        ],
        [
          "User obligations",
          "Users may ship lawful goods only, must give a correct description, HS code and documents, and must comply with customs, export and import rules in the countries of origin, transit and destination. Shipment owners are responsible for the accuracy of their cargo data. The platform does not accept prohibited goods (such as arms, ammunition, explosives, narcotics and radioactive materials): a request is refused automatically when its HS code or description points to them, and the administration reviews shipment documents and may refuse any request with a stated reason and suspend the account concerned.",
        ],
        [
          "Offers and agreement",
          "When a shipment owner accepts a carrier's offer, the two parties agree directly on the stated price and time. The owner may cancel before payment, and a carrier may withdraw an offer before it is accepted.",
        ],
        [
          "Subscription and payment",
          "The platform is used with a monthly subscription; the first 3 months are free for every new account starting on the account's approval date, and extend to 6 months for accounts that complete 7 operations in the first 3 months. The subscription price is announced on the site before the free period ends. Payment is made either by bank transfer to the platform, held as escrow until delivery is confirmed, or directly to the carrier. The platform takes no commission on shipments; the agreed amount reaches the carrier in full. With direct payment the platform holds no money and is not responsible for collecting or refunding it.",
        ],
        [
          "Closing operations and disputes",
          "An operation closes when the shipment owner confirms receipt; payment is then released to the carrier. If a problem occurs before confirmation, a dispute and settlement can be opened and escalated to the administration, which decides only on amounts it holds.",
        ],
        [
          "Limitation of liability",
          "The platform does not guarantee any user's performance and is not liable for damage, delay or seizure of goods, or for any customs decision. Cargo insurance is the parties' responsibility unless agreed otherwise in writing.",
        ],
        [
          "Suspension",
          "The administration may suspend any account that breaches these terms, misuses the platform or submits forged documents, while keeping records required by law.",
        ],
        [
          "Changes and governing law",
          "These terms may be updated and changes will be announced on the site. Use of the platform is governed by the laws of the Republic of Türkiye, and the courts of Istanbul have jurisdiction over disputes with the platform.",
        ],
      ],
    },
    tr: {
      title: "Kullanım Koşulları",
      sections: [
        [
          "Platform hakkında",
          "LogiBridge; tüccarları, ithalatçıları, ihracatçıları ve bireyleri taşıyıcılar, nakliye şirketleri ve ekipman tedarikçileriyle buluşturan çevrimiçi bir platformdur. Platform yalnızca teknik bir aracıdır; taşıyıcı, gümrük müşaviri veya kullanıcılar arasındaki taşıma sözleşmesinin tarafı değildir.",
        ],
        [
          "Hesaplar ve onay",
          "Kayıt bilgileri, vergi numarası ve sicil veya kimlik belgeleri dahil, doğru ve eksiksiz olmalıdır. Yönetim her hesabı inceler; bilgilerin yanlış olduğu veya kötüye kullanım tespit edilirse hesabı onaylayabilir, reddedebilir veya askıya alabilir.",
        ],
        [
          "Kullanıcı yükümlülükleri",
          "Yalnızca yasal ürünler taşınabilir; doğru tanım, HS kodu ve belgeler verilmeli, çıkış, transit ve varış ülkelerinin gümrük, ihracat ve ithalat kurallarına uyulmalıdır. Yük bilgilerinin doğruluğundan sevkiyat sahibi sorumludur. Platform yasaklı ürünleri (silah, mühimmat, patlayıcı, uyuşturucu ve radyoaktif maddeler gibi) kabul etmez: HS kodu veya tanım bunlara işaret ederse talep otomatik reddedilir; yönetim sevkiyat belgelerini inceler, gerekçesini belirterek her talebi reddedebilir ve ilgili hesabı askıya alabilir.",
        ],
        [
          "Teklifler ve anlaşma",
          "Sevkiyat sahibi bir taşıyıcının teklifini kabul ettiğinde taraflar belirtilen fiyat ve süre üzerinde doğrudan anlaşmış olur. Sevkiyat sahibi ödemeden önce iptal edebilir; taşıyıcı teklifini kabul edilmeden önce geri çekebilir.",
        ],
        [
          "Abonelik ve ödeme",
          "Platform aylık abonelikle kullanılır; her yeni hesap için ilk 3 ay ücretsizdir hesap onay tarihinden başlar ve ilk 3 ayda 7 işlem tamamlayan hesaplarda 6 aya uzar. Abonelik ücreti ücretsiz dönem bitmeden sitede duyurulur. Ödeme, teslim onayına kadar emanette tutulmak üzere platforma banka havalesiyle veya doğrudan taşıyıcıya yapılır. Platform sevkiyatlardan komisyon almaz; anlaşılan tutar taşıyıcıya eksiksiz ulaşır. Doğrudan ödemede platform para tutmaz ve tahsilat veya iadeden sorumlu değildir.",
        ],
        [
          "İşlemin kapanması ve ihtilaflar",
          "Sevkiyat sahibi teslimi onayladığında işlem kapanır ve ödeme taşıyıcıya bırakılır. Onaydan önce sorun çıkarsa ihtilaf ve uzlaşma başlatılabilir ve yönetime iletilebilir; yönetim yalnızca elinde tuttuğu tutarlar hakkında karar verir.",
        ],
        [
          "Sorumluluğun sınırı",
          "Platform hiçbir kullanıcının performansını garanti etmez; malların hasarı, gecikmesi veya el konulması ile gümrük kararlarından sorumlu değildir. Aksi yazılı olarak kararlaştırılmadıkça yük sigortası tarafların sorumluluğundadır.",
        ],
        [
          "Askıya alma",
          "Yönetim, bu koşulları ihlal eden, platformu kötüye kullanan veya sahte belge sunan hesapları, yasal olarak gerekli kayıtları saklayarak askıya alabilir.",
        ],
        [
          "Değişiklikler ve uygulanacak hukuk",
          "Bu koşullar güncellenebilir ve değişiklikler sitede duyurulur. Platformun kullanımı Türkiye Cumhuriyeti kanunlarına tabidir; platformla ilgili uyuşmazlıklarda İstanbul mahkemeleri yetkilidir.",
        ],
      ],
    },
  },
  privacy: {
    ar: {
      title: "سياسة الخصوصية",
      sections: [
        [
          "المسؤول عن البيانات",
          "الشركة المشغّلة للمنصة والمذكورة في قسم «مقدّم الخدمة» أسفل هذه الصفحة هي المسؤولة عن بياناتك (veri sorumlusu). نحتفظ أيضًا بتاريخ ونسخة موافقتك على الشروط وسياسة الخصوصية، ونطلب موافقتك من جديد عند كل تحديث.",
        ],
        [
          "البيانات التي نجمعها",
          "الاسم أو اسم الشركة، البريد الإلكتروني، الهاتف، البلد والمدينة، الرقم الضريبي، بيانات النشاط (البضائع، رخصة النقل، الأسطول، المعدات)، وثائق التوثيق (السجل التجاري أو صفحة الجواز)، بيانات الشحنات والعروض والمدفوعات والرسائل، ومواقع التتبع التي يشاركها الناقل أو السائق (من الموقع أو تطبيق السائق)، وصور مراحل الشحنة، واسم المستلم وتوقيعه عند التسليم، وتقارير الزحمة على المعابر.",
        ],
        [
          "لماذا نجمعها",
          "لتشغيل الحساب ومراجعته والتحقق من هوية الشركات والأفراد، وتنفيذ عمليات الشحن والدفع، وإرسال إشعارات العمليات، ومنع الاحتيال، والالتزام بالمتطلبات القانونية.",
        ],
        [
          "حماية الوثائق",
          "تُشفَّر الوثائق المرفوعة (السجلات والجوازات وإيصالات الدفع) بتشفير AES-256 قبل حفظها، ولا يطّلع عليها إلا مسؤول المنصة المخوّل. تُحفظ كلمات المرور باشتقاق scrypt ولا يمكن لأحد قراءتها.",
        ],
        [
          "من يرى بياناتك",
          "يظهر للمستخدمين الآخرين اسمك وتعريفك وخدماتك وتقييمك فقط. تفاصيل المرسل والمستلم والعنوان تظهر للناقل المكلّف بالشحنة فقط. بريدك ورقمك الضريبي ووثائقك لا تظهر في الدليل. صور الشحنة وإثبات التسليم يراها صاحب الشحنة والناقل والإدارة فقط. وثائق الشحنات يراها الأطراف العاملون على الشحنة، وتطّلع عليها إدارة المنصة للتحقق من أن البضاعة مسموحة. رابط التتبع الذي ينشئه صاحب الشحنة للمستلم يعرض المرحلة وموقعًا تقريبيًا (نحو كيلومتر) لكل من يملك الرابط، ويمكن إيقافه في أي وقت. تقارير الزحمة تظهر بدون اسم من أرسلها.",
        ],
        [
          "مزوّدو الخدمة",
          "تُستضاف المنصة وبياناتها لدى Netlify، وتُرسل الرسائل الإلكترونية عبر Resend، ورسائل واتساب عبر Meta إذا فعّلتها، وتُحمَّل الخرائط من OpenStreetMap، ويُنشر تطبيق السائق عبر GitHub. قد تُحفظ بياناتك وتُعالج على خوادم هؤلاء المزوّدين خارج تركيا. لا نبيع بياناتك ولا نشاركها لأغراض تسويقية.",
        ],
        [
          "مدة الاحتفاظ",
          "نحتفظ ببيانات الحساب ما دام نشطًا، وبسجلات العمليات والمدفوعات للمدة التي يفرضها القانون. يمكنك طلب حذف حسابك ووثائقك ما لم يكن الاحتفاظ بها مطلوبًا قانونيًا.",
        ],
        [
          "حقوقك",
          "وفق قانون حماية البيانات الشخصية التركي (KVKK) واللائحة الأوروبية (GDPR) حيث تنطبق: يحق لك معرفة بياناتك وتصحيحها وطلب حذفها والاعتراض على معالجتها. تواصل معنا عبر بريد الدعم الظاهر في الموقع.",
        ],
        [
          "ملفات تعريف الارتباط",
          "نستخدم ملف تعريف ارتباط واحدًا ضروريًا لإبقاء جلسة الدخول (HttpOnly وSecure)، ونحفظ في متصفحك اللغة والعملة المختارتين فقط. لا نستخدم ملفات تتبع إعلانية.",
        ],
      ],
    },
    en: {
      title: "Privacy Policy",
      sections: [
        [
          "Data controller",
          "The company running the platform, named in the “Service provider” section at the bottom of this page, is responsible for your data (data controller). We also keep the date and version of your acceptance of the terms and privacy policy, and ask you to accept again after every update.",
        ],
        [
          "Data we collect",
          "Name or company name, email, phone, country and city, tax number, business details (goods, transport licence, fleet, equipment), verification documents (trade registry or passport page), shipment, offer, payment and message data, tracking locations shared by a carrier or driver (on the site or in the driver app), photos of shipment stages, the receiver's name and signature at delivery, and crossing queue reports.",
        ],
        [
          "Why we collect it",
          "To run and review accounts, verify companies and individuals, carry out shipments and payments, send operation notifications, prevent fraud and meet legal requirements.",
        ],
        [
          "Document protection",
          "Uploaded documents (registries, passports, payment receipts) are encrypted with AES-256 before storage and are visible only to an authorised administrator. Passwords are stored as scrypt hashes and cannot be read by anyone.",
        ],
        [
          "Who sees your data",
          "Other users see only your name, introduction, services and rating. Sender, recipient and address details are visible only to the carrier assigned to the shipment. Your email, tax number and documents never appear in the directory. Shipment photos and proof of delivery are visible only to the shipment owner, the carrier and the administration. Shipment documents are seen by the parties working on the shipment, and the platform administration reviews them to check that the goods are allowed. A tracking link the owner creates for the receiver shows the stage and an approximate position (about one kilometre) to anyone who has the link, and can be turned off at any time. Queue reports appear without the sender's name.",
        ],
        [
          "Service providers",
          "The platform and its data are hosted on Netlify; emails are sent through Resend, WhatsApp messages through Meta if you turn them on, maps load from OpenStreetMap, and the driver app is published on GitHub. Your data may be stored and processed on these providers' servers outside Türkiye. We do not sell your data or share it for marketing.",
        ],
        [
          "Retention",
          "Account data is kept while the account is active, and operation and payment records for as long as the law requires. You can ask us to delete your account and documents unless keeping them is legally required.",
        ],
        [
          "Your rights",
          "Under the Turkish Personal Data Protection Law (KVKK) and the EU GDPR where it applies, you may access, correct or request deletion of your data and object to its processing. Contact us at the support email shown on the site.",
        ],
        [
          "Cookies",
          "We use one essential cookie to keep you signed in (HttpOnly, Secure) and store only your chosen language and currency in your browser. We use no advertising trackers.",
        ],
      ],
    },
    tr: {
      title: "Gizlilik Politikası",
      sections: [
        [
          "Veri sorumlusu",
          "Bu sayfanın altındaki «Hizmet sağlayıcı» bölümünde belirtilen ve platformu işleten şirket, verilerinizin veri sorumlusudur. Koşulları ve gizlilik politikasını kabul ettiğiniz tarih ile sürümü de saklarız ve her güncellemeden sonra onayınızı yeniden isteriz.",
        ],
        [
          "Topladığımız veriler",
          "Ad veya şirket adı, e-posta, telefon, ülke ve şehir, vergi numarası, faaliyet bilgileri (ürünler, taşıma yetki belgesi, filo, ekipman), doğrulama belgeleri (ticaret sicili veya pasaport sayfası), sevkiyat, teklif, ödeme ve mesaj verileri ile taşıyıcı veya sürücünün (sitede veya sürücü uygulamasında) paylaştığı takip konumları, sevkiyat aşaması fotoğrafları, teslimde alıcının adı ve imzası ve kapı kuyruk raporları.",
        ],
        [
          "Neden topluyoruz",
          "Hesapları işletmek ve incelemek, şirket ve kişileri doğrulamak, sevkiyat ve ödemeleri yürütmek, işlem bildirimleri göndermek, dolandırıcılığı önlemek ve yasal yükümlülükleri yerine getirmek için.",
        ],
        [
          "Belgelerin korunması",
          "Yüklenen belgeler (siciller, pasaportlar, ödeme dekontları) saklanmadan önce AES-256 ile şifrelenir ve yalnızca yetkili yönetici tarafından görülebilir. Parolalar scrypt ile saklanır ve kimse tarafından okunamaz.",
        ],
        [
          "Verilerinizi kim görür",
          "Diğer kullanıcılar yalnızca adınızı, tanıtımınızı, hizmetlerinizi ve puanınızı görür. Gönderici, alıcı ve adres bilgileri yalnızca sevkiyata atanan taşıyıcıya görünür. E-posta, vergi numarası ve belgeleriniz rehberde yer almaz. Sevkiyat fotoğraflarını ve teslim kanıtını yalnızca sevkiyat sahibi, taşıyıcı ve yönetim görür. Sevkiyat belgelerini sevkiyatta çalışan taraflar görür; platform yönetimi de ürünlerin izinli olduğunu doğrulamak için inceler. Sevkiyat sahibinin alıcı için oluşturduğu takip bağlantısı, bağlantıya sahip herkese aşamayı ve yaklaşık konumu (yaklaşık bir kilometre) gösterir ve her an kapatılabilir. Kuyruk raporları gönderenin adı olmadan görünür.",
        ],
        [
          "Hizmet sağlayıcılar",
          "Platform ve verileri Netlify'da barındırılır; e-postalar Resend, açarsanız WhatsApp mesajları Meta üzerinden gönderilir, haritalar OpenStreetMap'ten yüklenir ve sürücü uygulaması GitHub'da yayımlanır. Verileriniz bu sağlayıcıların Türkiye dışındaki sunucularında saklanabilir ve işlenebilir. Verilerinizi satmayız ve pazarlama amacıyla paylaşmayız.",
        ],
        [
          "Saklama süresi",
          "Hesap verileri hesap aktif olduğu sürece, işlem ve ödeme kayıtları kanunun gerektirdiği süre boyunca saklanır. Yasal zorunluluk yoksa hesabınızın ve belgelerinizin silinmesini isteyebilirsiniz.",
        ],
        [
          "Haklarınız",
          "6698 sayılı KVKK ve uygulanabildiği durumlarda AB GDPR kapsamında verilerinize erişme, düzeltme, silinmesini isteme ve işlenmesine itiraz etme hakkınız vardır. Sitede gösterilen destek e-postasından bize ulaşın.",
        ],
        [
          "Çerezler",
          "Oturumunuzu sürdürmek için yalnızca bir zorunlu çerez (HttpOnly, Secure) kullanırız ve tarayıcınızda yalnızca seçtiğiniz dil ve para birimini saklarız. Reklam takip çerezi kullanılmaz.",
        ],
      ],
    },
  },
  // Online subscription purchase: pre-information, distance service contract, cancellation and refunds.
  sales: {
    ar: {
      title: "شروط البيع عن بُعد والاسترجاع",
      sections: [
        [
          "البائع",
          "مقدّم الخدمة هو الشركة المشغّلة للمنصة، وبياناتها (الاسم التجاري، رقم MERSIS، الرقم الضريبي، العنوان، البريد الإلكتروني المسجّل KEP) مذكورة في قسم «مقدّم الخدمة» أسفل هذه الصفحة.",
        ],
        [
          "الخدمة",
          "اشتراك رقمي في منصة LogiBridge لمدة شهر أو سنة حسب اختيارك، يتيح استخدام خدمات المنصة لحساب الشركة: نشر طلبات الشحن وتقديم العروض والوثائق والتتبع والرسائل. المنصة وسيط تقني وليست ناقلًا أو وكيلًا جمركيًا، والاتفاق على النقل يكون بين المستخدمين مباشرة كما في الشروط والأحكام.",
        ],
        [
          "السعر والدفع",
          "السعر الظاهر قبل الدفع بالدولار الأمريكي هو المبلغ الذي تدفعه، والاشتراك السنوي بسعر 10 أشهر. الدفع بالبطاقة عبر PayTR، ولا تصل بيانات البطاقة إلى LogiBridge. تصدر الفاتورة وفق التشريعات المعمول بها في تركيا. لا يوجد تجديد تلقائي: لا يُسحب أي مبلغ إضافي إلا إذا دفعت أنت مرة أخرى.",
        ],
        [
          "بدء الخدمة",
          "تبدأ الخدمة فور تأكيد الدفع من PayTR، وتُضاف المدة المدفوعة بعد نهاية اشتراكك الحالي أو الفترة المجانية إن وُجدت، ويظهر تاريخ الانتهاء الجديد في لوحة حسابك.",
        ],
        [
          "حق الانسحاب",
          "الخدمة رقمية وتُقدَّم إلكترونيًا فورًا وتبدأ بموافقتك عند الدفع، لذلك لا ينطبق عليها حق الانسحاب خلال 14 يومًا وفق المادة 15 من لائحة العقود عن بُعد التركية. وبالنسبة للحسابات التجارية يُعد الشراء معاملة بين شركات.",
        ],
        [
          "الإلغاء والاسترجاع",
          "يُرد المبلغ كاملًا إذا سُحب منك خطأً أو مرتين، أو إذا لم يُفعَّل الاشتراك بعد الدفع ولم نتمكن من تفعيله. وإذا أوقفت المنصة الخدمة نهائيًا أو أوقفت حسابك دون مخالفة منك، يُرد الجزء غير المستخدم من المدة. لا يُرد المبلغ عند إيقاف الحساب بسبب مخالفة الشروط. اطلب الاسترجاع خلال 14 يومًا من الدفع عبر بريد الدعم أو قسم الدعم في حسابك مع رقم الطلب، ويُعاد المبلغ إلى البطاقة نفسها عبر PayTR، وتختلف مدة ظهوره حسب البنك.",
        ],
        [
          "الشكاوى والنزاعات",
          "تواصل معنا أولًا عبر قسم الدعم. يخضع هذا العقد لقوانين الجمهورية التركية. للمستهلكين حق التقدّم إلى لجان التحكيم الخاصة بالمستهلك أو محاكم المستهلك ضمن الحدود القانونية، وفي غير ذلك تختص محاكم إسطنبول.",
        ],
        [
          "الموافقة",
          "بالضغط على زر الدفع بعد وضع علامة الموافقة، تقرّ بأنك قرأت هذه المعلومات المسبقة وعقد الخدمة عن بُعد ووافقت عليهما. نحفظ تاريخ موافقتك ونسختها مع طلب الدفع.",
        ],
      ],
    },
    en: {
      title: "Distance sales and refund terms",
      sections: [
        [
          "Seller",
          "The service provider is the company operating the platform. Its details (trade name, MERSIS number, tax number, address and registered electronic mail KEP) are in the “Service provider” section at the bottom of this page.",
        ],
        [
          "Service",
          "A digital LogiBridge subscription for one month or one year, as you choose, letting the company account use the platform: posting shipment requests, sending offers, documents, tracking and messages. The platform is a technical intermediary, not a carrier or customs agent; transport is agreed directly between users as set out in the terms of use.",
        ],
        [
          "Price and payment",
          "The US dollar price shown before payment is the amount you pay; the yearly plan costs 10 months. Payment is by card through PayTR, and card details never reach LogiBridge. Invoices are issued under the legislation in force in Türkiye. There is no automatic renewal: nothing more is charged unless you pay again.",
        ],
        [
          "Start of service",
          "The service starts as soon as PayTR confirms the payment. The paid period is added after the end of your current subscription or free period, and the new end date is shown on your dashboard.",
        ],
        [
          "Right of withdrawal",
          "The service is digital, performed electronically at once and started with your approval when you pay, so the 14-day right of withdrawal does not apply, under article 15 of the Turkish Distance Contracts Regulation. For business accounts the purchase is a business-to-business transaction.",
        ],
        [
          "Cancellation and refunds",
          "You get a full refund if you were charged by mistake or twice, or if the subscription was not activated after payment and we could not activate it. If the platform ends the service for good, or suspends your account without any breach on your part, the unused part of the period is refunded. No refund is given when an account is suspended for breaching the terms. Ask for a refund within 14 days of payment through the support email or the Support section of your account, with the order number. The money goes back to the same card through PayTR; how long it takes to appear depends on your bank.",
        ],
        [
          "Complaints and disputes",
          "Please contact us first through Support. This contract is governed by the laws of the Republic of Türkiye. Consumers may apply to consumer arbitration committees or consumer courts within the legal limits; otherwise the courts of Istanbul have jurisdiction.",
        ],
        [
          "Acceptance",
          "By pressing the payment button after ticking the acceptance box you confirm that you have read and accept this pre-contract information and the distance service contract. We keep the date and version of your acceptance with the payment order.",
        ],
      ],
    },
    tr: {
      title: "Mesafeli satış, ön bilgilendirme ve iade koşulları",
      sections: [
        [
          "Satıcı",
          "Hizmet sağlayıcı, platformu işleten şirkettir. Ticaret unvanı, MERSIS numarası, vergi numarası, adresi ve KEP adresi bu sayfanın altındaki “Hizmet sağlayıcı” bölümünde yer alır.",
        ],
        [
          "Hizmet",
          "Seçiminize göre bir aylık veya bir yıllık dijital LogiBridge aboneliği. Şirket hesabının platform hizmetlerini kullanmasını sağlar: sevkiyat talebi yayınlama, teklif verme, belgeler, takip ve mesajlaşma. Platform teknik bir aracıdır; taşıyıcı veya gümrük müşaviri değildir. Taşıma, kullanım koşullarında belirtildiği gibi kullanıcılar arasında doğrudan kararlaştırılır.",
        ],
        [
          "Fiyat ve ödeme",
          "Ödemeden önce ABD doları olarak gösterilen fiyat ödeyeceğiniz tutardır; yıllık plan 10 aylık fiyattır. Ödeme PayTR üzerinden kartla yapılır; kart bilgileri LogiBridge'e ulaşmaz. Fatura Türkiye'de yürürlükteki mevzuata göre düzenlenir. Otomatik yenileme yoktur: siz tekrar ödeme yapmadıkça ek tutar tahsil edilmez.",
        ],
        [
          "Hizmetin başlaması",
          "Hizmet, PayTR ödemeyi onayladığı anda başlar. Ödenen süre mevcut aboneliğinizin veya ücretsiz dönemin bitiminden sonra eklenir ve yeni bitiş tarihi panelinizde görünür.",
        ],
        [
          "Cayma hakkı",
          "Hizmet dijitaldir, elektronik ortamda anında ifa edilir ve ödeme sırasında onayınızla başlar. Bu nedenle Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesi uyarınca 14 günlük cayma hakkı uygulanmaz. Ticari hesaplar için satın alma, işletmeler arası bir işlemdir.",
        ],
        [
          "İptal ve iade",
          "Hatalı veya mükerrer tahsilatta ya da ödeme sonrası abonelik etkinleşmediği ve etkinleştiremediğimiz durumda tutarın tamamı iade edilir. Platform hizmeti tamamen sonlandırırsa veya hesabınızı sizden kaynaklanan bir ihlal olmadan askıya alırsa kullanılmayan süre iade edilir. Kullanım koşullarının ihlali nedeniyle askıya alınan hesaplara iade yapılmaz. İadeyi ödemeden itibaren 14 gün içinde, sipariş numarasıyla destek e-postasından veya hesabınızdaki Destek bölümünden isteyin. Tutar PayTR üzerinden aynı karta iade edilir; hesabınıza yansıma süresi bankanıza göre değişir.",
        ],
        [
          "Şikâyet ve uyuşmazlıklar",
          "Lütfen önce Destek bölümünden bize ulaşın. Bu sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Tüketiciler yasal sınırlar içinde tüketici hakem heyetlerine veya tüketici mahkemelerine başvurabilir; diğer durumlarda İstanbul mahkemeleri yetkilidir.",
        ],
        [
          "Onay",
          "Onay kutusunu işaretleyip ödeme düğmesine bastığınızda bu ön bilgilendirmeyi ve mesafeli hizmet sözleşmesini okuduğunuzu ve kabul ettiğinizi onaylarsınız. Onay tarihiniz ve sürümü ödeme siparişiyle birlikte saklanır.",
        ],
      ],
    },
  },
};

export default function Legal({ page, t, lang, langSelect }) {
  const doc = content[page][lang] || content[page].en;
  const company = useCompany();
  return (
    <div className="legal-page">
      <header className="access-header">
        <a href="/" className="brand">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <div>{langSelect}</div>
      </header>
      <main className="legal-content panel">
        <h1>{doc.title}</h1>
        <p className="muted small">
          {t("lastUpdated")}: <span dir="ltr">{UPDATED}</span>
        </p>
        {doc.sections.map(([heading, text], i) => (
          <section key={heading}>
            <h2>
              {i + 1}. {heading}
            </h2>
            <p>{text}</p>
          </section>
        ))}
        <CompanyInfo company={company} t={t} />
        <p className="legal-links">
          <a href={page === "terms" ? "/privacy" : "/terms"}>
            {t(page === "terms" ? "privacyPolicy" : "termsOfUse")}
          </a>
          {" · "}
          <a href={page === "sales" ? "/terms" : "/sales-terms"}>
            {t(page === "sales" ? "termsOfUse" : "salesTerms")}
          </a>
          {" · "}
          <a href="/">{t("siteHome")}</a>
        </p>
      </main>
    </div>
  );
}

export function LegalLinks({ t }) {
  return (
    <span className="legal-footer-links">
      <a href="/border">{t("borderRulesTitle")}</a> · <a href="/terms">{t("termsOfUse")}</a> ·{" "}
      <a href="/privacy">{t("privacyPolicy")}</a> · <a href="/sales-terms">{t("salesTerms")}</a>
    </span>
  );
}

// Shown once after the terms or privacy policy change: the account reads and accepts the new
// version before starting new business on the platform.
export function TermsUpdateDialog({ t, run, busy }) {
  const [agree, setAgree] = useState(false);
  return (
    <div className="terms-dialog-backdrop">
      <section
        className="terms-dialog panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-dialog-title"
      >
        <h2 id="terms-dialog-title">{t("termsUpdatedTitle")}</h2>
        <p>{t("termsUpdatedText")}</p>
        <p className="terms-dialog-links">
          <a href="/terms" target="_blank" rel="noopener">
            {t("termsOfUse")} ↗
          </a>
          <a href="/privacy" target="_blank" rel="noopener">
            {t("privacyPolicy")} ↗
          </a>
        </p>
        <label className="consent">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>{t("termsUpdatedAgree")}</span>
        </label>
        <div className="actions">
          <button
            className="button"
            disabled={!agree || busy}
            onClick={() =>
              run("/account/accept-terms", { accept: true }, "POST", { success: "termsAccepted" })
            }
          >
            {t("acceptAndContinue")}
          </button>
          <button className="button ghost" disabled={busy} onClick={() => run("/logout", {})}>
            {t("logout")}
          </button>
        </div>
      </section>
    </div>
  );
}
