import React from "react";

// Terms of use and privacy policy in the three interface languages.
// Last updated date is shown on the page; update it whenever the text changes.
const UPDATED = "2026-10-11";

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
          "يلتزم المستخدم بنقل بضائع مشروعة فقط، وبتقديم وصف ورمز HS ووثائق صحيحة، وبالالتزام بأنظمة الجمارك والتصدير والاستيراد في بلدان المنشأ والعبور والوصول. يتحمّل صاحب الشحنة مسؤولية صحة بيانات بضاعته.",
        ],
        [
          "العروض والاتفاق",
          "عند قبول صاحب الشحنة عرض ناقل يصبح الاتفاق بينهما مباشرة بالسعر والمدة المذكورين. يستطيع صاحب الشحنة إلغاءها قبل الدفع، ويستطيع الناقل سحب عرضه قبل قبوله.",
        ],
        [
          "الدفع والعمولة",
          "يتم الدفع إما بتحويل بنكي إلى حساب المنصة ليُحفظ كضمان حتى تأكيد الاستلام، أو مباشرة للناقل. تقتطع المنصة عمولة 3٪ من المبالغ المدفوعة عبرها. في الدفع المباشر لا تحفظ المنصة أي مبلغ ولا تتحمّل مسؤولية تحصيله أو استرداده.",
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
          "Users may ship lawful goods only, must give a correct description, HS code and documents, and must comply with customs, export and import rules in the countries of origin, transit and destination. Shipment owners are responsible for the accuracy of their cargo data.",
        ],
        [
          "Offers and agreement",
          "When a shipment owner accepts a carrier's offer, the two parties agree directly on the stated price and time. The owner may cancel before payment, and a carrier may withdraw an offer before it is accepted.",
        ],
        [
          "Payment and commission",
          "Payment is made either by bank transfer to the platform, held as escrow until delivery is confirmed, or directly to the carrier. The platform keeps a 3% commission on amounts paid through it. With direct payment the platform holds no money and is not responsible for collecting or refunding it.",
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
          "Yalnızca yasal ürünler taşınabilir; doğru tanım, HS kodu ve belgeler verilmeli, çıkış, transit ve varış ülkelerinin gümrük, ihracat ve ithalat kurallarına uyulmalıdır. Yük bilgilerinin doğruluğundan sevkiyat sahibi sorumludur.",
        ],
        [
          "Teklifler ve anlaşma",
          "Sevkiyat sahibi bir taşıyıcının teklifini kabul ettiğinde taraflar belirtilen fiyat ve süre üzerinde doğrudan anlaşmış olur. Sevkiyat sahibi ödemeden önce iptal edebilir; taşıyıcı teklifini kabul edilmeden önce geri çekebilir.",
        ],
        [
          "Ödeme ve komisyon",
          "Ödeme, teslim onayına kadar emanette tutulmak üzere platforma banka havalesiyle veya doğrudan taşıyıcıya yapılır. Platform üzerinden ödenen tutarlardan %3 komisyon alınır. Doğrudan ödemede platform para tutmaz ve tahsilat veya iadeden sorumlu değildir.",
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
          "البيانات التي نجمعها",
          "الاسم أو اسم الشركة، البريد الإلكتروني، الهاتف، البلد والمدينة، الرقم الضريبي، بيانات النشاط (البضائع، رخصة النقل، الأسطول، المعدات)، وثائق التوثيق (السجل التجاري أو صفحة الجواز)، بيانات الشحنات والعروض والمدفوعات والرسائل، ومواقع التتبع التي يشاركها الناقل أو السائق.",
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
          "يظهر للمستخدمين الآخرين اسمك وتعريفك وخدماتك وتقييمك فقط. تفاصيل المرسل والمستلم والعنوان تظهر للناقل المكلّف بالشحنة فقط. بريدك ورقمك الضريبي ووثائقك لا تظهر في الدليل.",
        ],
        [
          "مزوّدو الخدمة",
          "تُستضاف المنصة وبياناتها لدى Netlify، وتُرسل الرسائل الإلكترونية عبر Resend. لا نبيع بياناتك ولا نشاركها لأغراض تسويقية.",
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
          "Data we collect",
          "Name or company name, email, phone, country and city, tax number, business details (goods, transport licence, fleet, equipment), verification documents (trade registry or passport page), shipment, offer, payment and message data, and tracking locations shared by a carrier or driver.",
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
          "Other users see only your name, introduction, services and rating. Sender, recipient and address details are visible only to the carrier assigned to the shipment. Your email, tax number and documents never appear in the directory.",
        ],
        [
          "Service providers",
          "The platform and its data are hosted on Netlify, and emails are sent through Resend. We do not sell your data or share it for marketing.",
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
          "Topladığımız veriler",
          "Ad veya şirket adı, e-posta, telefon, ülke ve şehir, vergi numarası, faaliyet bilgileri (ürünler, taşıma yetki belgesi, filo, ekipman), doğrulama belgeleri (ticaret sicili veya pasaport sayfası), sevkiyat, teklif, ödeme ve mesaj verileri ile taşıyıcı veya sürücünün paylaştığı takip konumları.",
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
          "Diğer kullanıcılar yalnızca adınızı, tanıtımınızı, hizmetlerinizi ve puanınızı görür. Gönderici, alıcı ve adres bilgileri yalnızca sevkiyata atanan taşıyıcıya görünür. E-posta, vergi numarası ve belgeleriniz rehberde yer almaz.",
        ],
        [
          "Hizmet sağlayıcılar",
          "Platform ve verileri Netlify'da barındırılır, e-postalar Resend üzerinden gönderilir. Verilerinizi satmayız ve pazarlama amacıyla paylaşmayız.",
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
};

export default function Legal({ page, t, lang, langSelect }) {
  const doc = content[page][lang] || content[page].en;
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
        <p className="legal-links">
          <a href={page === "terms" ? "/privacy" : "/terms"}>
            {t(page === "terms" ? "privacyPolicy" : "termsOfUse")}
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
      <a href="/privacy">{t("privacyPolicy")}</a>
    </span>
  );
}
