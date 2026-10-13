import React, { useEffect, useState } from "react";
import { crossings, crossingKeys } from "../shared/crossings";

// Türkiye–Syria border and customs rules that shape how shipments run on the platform.
// Each rule has its date and public source. Update REVIEWED and the list when rules change;
// urgent day-to-day changes are posted by the administration as notices instead.
const REVIEWED = "2026-10-12";

const rules = [
  {
    date: "2026-02-06",
    level: "warning",
    sources: [
      "https://english.enabbaladi.net/archives/2026/02/syria-bans-entry-of-non-syrian-trucks-except-transit/",
      "https://tcf.org/content/report/road-warriors-how-a-fight-over-trucking-explains-the-new-syria/",
    ],
    ar: [
      "منع دخول الشاحنات غير السورية (القرار 31)",
      "قررت الهيئة العامة للمنافذ البرية والبحرية عدم السماح للشاحنات غير السورية بدخول الأراضي السورية عبر المعابر البرية، باستثناء شاحنات الترانزيت بمرافقة الضابطة الجمركية بين نقطتي الدخول والخروج. تُنقل البضائع بين الشاحنات داخل الساحة الجمركية في المعبر (التبّون)، ولا تدخل الشاحنات السورية المعابر للتحميل أو التفريغ إلا بإيصال رسمي من مكتب نقل البضائع. على الحدود التركية كانت المناقلة مطبّقة أصلًا، لذلك يقسم الموقع كل شحنة تركيا⇄سوريا إلى ثلاث مراحل.",
    ],
    en: [
      "Non-Syrian trucks may not enter Syria (Decision 31)",
      "The General Authority for Land and Sea Ports decided that non-Syrian trucks may not enter Syria through land crossings, except transit trucks escorted by customs police between entry and exit. Goods are moved between trucks inside the crossing's customs yard (al-Tabbun), and Syrian trucks may enter crossings to load or unload only with an official receipt from the cargo transport office. Transshipment was already the practice at the Turkish border, so the platform splits every Türkiye⇄Syria shipment into three stages.",
    ],
    tr: [
      "Suriyeli olmayan tırlar Suriye'ye giremez (Karar 31)",
      "Kara ve Deniz Limanları Genel İdaresi, gümrük muhafaza refakatindeki transit araçlar dışında Suriyeli olmayan tırların kara kapılarından Suriye'ye girişine izin vermeme kararı aldı. Yük, kapının gümrük sahasında (Tabbun) araçtan araca aktarılır; Suriyeli tırlar yükleme/boşaltma için kapılara ancak yük taşıma bürosundan resmi makbuzla girebilir. Türkiye sınırında aktarma zaten uygulanıyordu; bu yüzden platform her Türkiye⇄Suriye sevkiyatını üç aşamaya böler.",
    ],
  },
  {
    date: "2026-03-01",
    level: "info",
    sources: [
      "https://tcf.org/content/report/road-warriors-how-a-fight-over-trucking-explains-the-new-syria/",
    ],
    ar: [
      "استثناء البضائع التي لا تُنقل بأمان",
      "أعلنت الهيئة في أوائل آذار 2026 إعفاء بعض الشاحنات من المناقلة إذا كانت البضاعة لا يمكن نقلها بأمان، مثل الزجاج والإلكترونيات والسوائل. اذكر ذلك في وصف الشحنة وتأكد من المخلّص قبل الحجز.",
    ],
    en: [
      "Exemption for cargo that cannot be moved safely",
      "In early March 2026 the authority said some trucks are exempt from transshipment when the cargo cannot be moved safely, such as glass, electronics and liquids. Say so in the shipment description and confirm with your customs broker before booking.",
    ],
    tr: [
      "Güvenle aktarılamayan yükler için istisna",
      "Mart 2026 başında idare, cam, elektronik ve sıvılar gibi güvenle aktarılamayan yüklerde bazı araçların aktarmadan muaf tutulacağını açıkladı. Bunu sevkiyat açıklamasına yazın ve rezervasyondan önce gümrük müşavirinizle teyit edin.",
    ],
  },
  {
    date: "2026-05-18",
    level: "warning",
    sources: ["https://english.enabbaladi.net/archives/2026/05/syria-issues-new-customs-law/"],
    ar: [
      "قانون الجمارك العام الجديد (المرسوم 109) والتعرفة (المرسوم 110)",
      "حلّ القانون الجديد (264 مادة) محل قانون الجمارك رقم 38 لعام 2006. صدرت معه جداول التعرفة المنسقة بالمرسوم 110 وتطبّق من بداية حزيران 2026. غرامات التهريب مضاعفات من القيمة أو الرسوم (مثلًا 6 إلى 8 أضعاف القيمة للبضائع الممنوعة)، ويجوز مصادرة وسيلة النقل المستخدمة في التهريب، لذلك على الناقل التأكد من أوراق الحمولة قبل التحميل.",
    ],
    en: [
      "New General Customs Law (Decree 109) and tariff (Decree 110)",
      "The new 264-article law replaces Customs Law No. 38 of 2006. The harmonized tariff schedule issued with it (Decree 110) applies from the start of June 2026. Smuggling fines are multiples of the value or duties (for example 6 to 8 times the value for prohibited goods), and vehicles used in smuggling may be confiscated, so carriers should check the cargo papers before loading.",
    ],
    tr: [
      "Yeni Genel Gümrük Kanunu (Kararname 109) ve tarife (Kararname 110)",
      "264 maddelik yeni kanun, 2006 tarihli 38 sayılı Gümrük Kanunu'nun yerini aldı. Birlikte çıkan uyumlaştırılmış tarife cetveli (Kararname 110) Haziran 2026 başından itibaren uygulanıyor. Kaçakçılık cezaları değerin veya vergilerin katları (ör. yasaklı mallarda değerin 6–8 katı) olup kaçakçılıkta kullanılan araçlara el konulabilir; taşıyıcılar yüklemeden önce evrakı kontrol etmeli.",
    ],
  },
  {
    date: "2026-05-17",
    level: "info",
    sources: [
      "https://english.enabbaladi.net/archives/2026/05/presidential-decree-waives-customs-fines-in-syria/",
    ],
    ar: [
      "إعفاء من الغرامات الجمركية القديمة (المرسوم 117)",
      "يُعفى من الغرامات الجمركية عن المخالفات المرتكبة قبل 8 كانون الأول 2024 إذا سُددت الرسوم المستحقة خلال ستة أشهر من صدور المرسوم. لا يشمل الإعفاء قضايا المخدرات والأحكام القضائية المبرمة.",
    ],
    en: [
      "Waiver of old customs fines (Decree 117)",
      "Customs fines for violations committed before 8 December 2024 are waived if the duties owed are paid within six months of the decree. Drug cases and final court judgments are excluded.",
    ],
    tr: [
      "Eski gümrük cezalarının affı (Kararname 117)",
      "8 Aralık 2024'ten önce işlenen ihlallerin gümrük cezaları, borçlu vergiler kararnameden itibaren altı ay içinde ödenirse affedilir. Uyuşturucu davaları ve kesinleşmiş mahkeme kararları kapsam dışıdır.",
    ],
  },
  {
    date: "2025-07-01",
    level: "info",
    sources: [
      "https://english.enabbaladi.net/archives/2025/07/import-without-complications-in-syria-ambiguity-remains-an-obstacle/",
    ],
    ar: [
      "الاستيراد إلى سوريا: الوثائق المطلوبة",
      "أُوقف العمل بإجازات الاستيراد وطلبات الموافقة المسبقة. تحتاج كل شحنة عادةً: فاتورة تجارية، شهادة منشأ، بوليصة شحن أو CMR، قائمة تعبئة، وشهادة تأمين إن كانت البضاعة مؤمّنة. قد تخضع البضائع لتفتيش بعد التخليص ولمطابقة المواصفات، والتخليص يستغرق عادةً 2–3 أيام عمل، وقد يُوقف استيراد بعض المنتجات الزراعية موسميًا.",
    ],
    en: [
      "Importing into Syria: required documents",
      "Import licences and pre-approval forms were suspended. A shipment usually needs a commercial invoice, certificate of origin, bill of lading or CMR, packing list, and an insurance certificate if the goods are insured. Goods may face post-clearance inspection and standards checks; clearance usually takes 2–3 working days, and some agricultural imports are halted seasonally.",
    ],
    tr: [
      "Suriye'ye ithalat: gerekli belgeler",
      "İthalat lisansları ve ön onay formları kaldırıldı. Bir sevkiyat genellikle ticari fatura, menşe şahadetnamesi, konşimento veya CMR, çeki listesi ve sigortalıysa sigorta poliçesi gerektirir. Mallar gümrük sonrası denetim ve standart kontrolüne tabi olabilir; gümrükleme genellikle 2–3 iş günü sürer ve bazı tarım ürünlerinin ithalatı mevsimsel olarak durdurulabilir.",
    ],
  },
  {
    date: "2025-12-17",
    level: "info",
    sources: [
      "https://www.iru.org/news-resources/newsroom/tir-operations-turkiye-syria-resume-restoring-key-trade-route",
    ],
    ar: [
      "عودة عبور TIR من تركيا عبر سوريا",
      "عادت عمليات النقل بنظام TIR من تركيا عبر سوريا إلى الأردن ودول الخليج. شحنات الترانزيت هذه لا تُفرّغ في سوريا وتمر بمرافقة جمركية، أما الشحنات المتجهة إلى داخل سوريا فتبقى بثلاث مراحل.",
    ],
    en: [
      "TIR transit from Türkiye through Syria resumed",
      "TIR movements from Türkiye through Syria to Jordan and the Gulf have restarted. Such transit loads are not unloaded in Syria and move under customs escort; shipments destined for Syria itself still run in three stages.",
    ],
    tr: [
      "Türkiye'den Suriye üzerinden TIR transiti yeniden başladı",
      "Türkiye'den Suriye üzerinden Ürdün ve Körfez'e TIR taşımaları yeniden başladı. Bu transit yükler Suriye'de boşaltılmaz ve gümrük refakatinde geçer; Suriye'ye giden sevkiyatlar ise üç aşamalı kalır.",
    ],
  },
];

const crossingSources = [
  "https://logcluster.org/en/alerts/syria-border-crossings-airports-and-ports-updates-9-march-2026",
  "https://english.enabbaladi.net/archives/2026/08/turkey-continues-upgrading-syria-border-crossings/",
];

const host = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// Wait levels used by congestion reports.
const waitLevels = [0, 1, 2, 3, 4];
const hoursAgo = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 3600000));

export function BorderRules({ t, lang, notices = [], reports = [], admin, canReport, run, busy }) {
  const latest = (k) => reports.find((r) => r.crossing === k);
  const pick = (r) => r[lang] || r.en;
  return (
    <div className="border-rules">
      <p className="notice">
        {t("borderRulesIntro")}{" "}
        <span className="muted small">
          {t("lastUpdated")}: <span dir="ltr">{REVIEWED}</span>
        </span>
      </p>
      {(notices.length > 0 || admin) && (
        <section className="panel">
          <h2>{t("borderNotices")}</h2>
          {notices.map((n) => (
            <article key={n.id} className={`rule-card ${n.level}`}>
              <small dir="ltr">{n.date}</small>
              <h3>
                {n.title}
                {n.crossing && <span className="tag">{t(n.crossing)}</span>}
              </h3>
              <p>{n.body}</p>
              {n.source && (
                <a href={n.source} target="_blank" rel="noopener noreferrer" dir="ltr">
                  ↗ {host(n.source)}
                </a>
              )}
              {admin && (
                <button
                  className="button ghost small-button danger"
                  disabled={busy}
                  onClick={() =>
                    window.confirm(t("deleteNoticeConfirm")) &&
                    run(`/admin/border-notices/${n.id}`, undefined, "DELETE")
                  }
                >
                  {t("deleteNotice")}
                </button>
              )}
            </article>
          ))}
          {!notices.length && <p className="muted">{t("noBorderNotices")}</p>}
          {admin && <NoticeForm t={t} run={run} busy={busy} />}
        </section>
      )}
      <section className="panel">
        <h2>{t("crossingStatus")}</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("crossing")}</th>
                <th>{t("turkishSide")}</th>
                <th>{t("syrianSide")}</th>
                <th>{t("status")}</th>
                <th>{t("queueNow")}</th>
              </tr>
            </thead>
            <tbody>
              {crossingKeys.map((k) => (
                <tr key={k}>
                  <td>{t(k)}</td>
                  <td dir="ltr">{crossings[k].tr}</td>
                  <td dir="ltr">{crossings[k].sy}</td>
                  <td>
                    <span className={`badge crossing-${crossings[k].status}`}>
                      {t("crossing_" + crossings[k].status)}
                    </span>
                  </td>
                  <td>
                    {latest(k) ? (
                      <>
                        <span className={`badge wait-${latest(k).level}`}>
                          {t("wait_" + latest(k).level)}
                        </span>
                        <small className="muted">
                          {" "}
                          {hoursAgo(latest(k).createdAt) < 1
                            ? t("justNow")
                            : t("reportedAgo").replace("{h}", hoursAgo(latest(k).createdAt))}{" "}
                          · {t(latest(k).role === "gps" ? "autoGps" : latest(k).role)}
                        </small>
                        {latest(k).note && <small className="report-note">{latest(k).note}</small>}
                      </>
                    ) : (
                      <small className="muted">{t("noReportsYet")}</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          {t("crossingStatusNote")}{" "}
          {crossingSources.map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer" dir="ltr" className="source-link">
              ↗ {host(u)}
            </a>
          ))}
        </p>
        {canReport && <ReportForm t={t} run={run} busy={busy} />}
        {!canReport && <p className="muted small">{t("reportsByProviders")}</p>}
      </section>
      <section className="panel">
        <h2>{t("customsRules")}</h2>
        {rules.map((r) => (
          <article key={r.date + r.en[0]} className={`rule-card ${r.level}`}>
            <small dir="ltr">{r.date}</small>
            <h3>{pick(r)[0]}</h3>
            <p>{pick(r)[1]}</p>
            <p className="small">
              {t("source")}:{" "}
              {r.sources.map((u) => (
                <a
                  key={u}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  dir="ltr"
                  className="source-link"
                >
                  ↗ {host(u)}
                </a>
              ))}
            </p>
          </article>
        ))}
        <p className="muted small">{t("borderDisclaimer")}</p>
      </section>
    </div>
  );
}

function ReportForm({ t, run, busy }) {
  return (
    <form
      className="form-stack notice-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const ok = await run("/crossing-reports", Object.fromEntries(new FormData(form)), "POST", {
          success: "reportThanks",
        });
        if (ok) form.reset();
      }}
    >
      <h3>{t("reportQueue")}</h3>
      <p className="muted small">{t("reportQueueNote")}</p>
      <div className="two-cols">
        <label className="field">
          <span>{t("crossing")}</span>
          <select name="crossing" required>
            {crossingKeys.map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{t("queueNow")}</span>
          <select name="level" required>
            {waitLevels.map((l) => (
              <option key={l} value={l}>
                {t("wait_" + l)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>{t("reportNote")}</span>
        <input name="note" maxLength="280" placeholder={t("reportNotePlaceholder")} />
      </label>
      <button className="button" disabled={busy}>
        {t("sendReport")}
      </button>
    </form>
  );
}

function NoticeForm({ t, run, busy }) {
  return (
    <form
      className="form-stack notice-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const ok = await run("/admin/border-notices", {
          ...Object.fromEntries(f),
          notify: f.has("notifyMembers"),
        });
        if (ok) form.reset();
      }}
    >
      <h3>{t("addBorderNotice")}</h3>
      <div className="two-cols">
        <label className="field">
          <span>{t("noticeDate")}</span>
          <input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
        </label>
        <label className="field">
          <span>{t("crossing")}</span>
          <select name="crossing" defaultValue="">
            <option value="">{t("allCrossings")}</option>
            {crossingKeys.map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span>{t("noticeTitle")}</span>
        <input name="title" required maxLength="160" />
      </label>
      <label className="field">
        <span>{t("noticeBody")}</span>
        <textarea name="body" rows="3" required maxLength="1500" />
      </label>
      <div className="two-cols">
        <label className="field">
          <span>{t("sourceLink")}</span>
          <input name="source" type="url" maxLength="300" dir="ltr" placeholder="https://" />
        </label>
        <label className="field">
          <span>{t("importance")}</span>
          <select name="level" defaultValue="info">
            <option value="info">{t("levelInfo")}</option>
            <option value="warning">{t("levelWarning")}</option>
          </select>
        </label>
      </div>
      <label className="consent">
        <input type="checkbox" name="notifyMembers" defaultChecked />
        <span>{t("notifyMembers")}</span>
      </label>
      <button className="button" disabled={busy}>
        {t("publishNotice")}
      </button>
    </form>
  );
}

// Public page at /border, readable before signing in.
export default function BorderPage({ t, lang, langSelect }) {
  const [notices, setNotices] = useState([]),
    [reports, setReports] = useState([]);
  useEffect(() => {
    fetch("/api/border")
      .then((r) => (r.ok ? r.json() : { notices: [] }))
      .then((v) => {
        setNotices(v.notices || []);
        setReports(v.reports || []);
      })
      .catch(() => {});
  }, []);
  return (
    <div className="legal-page">
      <header className="access-header">
        <a href="/" className="brand">
          <span className="brand-icon">⇄</span>LogiBridge
        </a>
        <div>{langSelect}</div>
      </header>
      <main className="legal-content border-page">
        <h1>{t("borderRulesTitle")}</h1>
        <BorderRules t={t} lang={lang} notices={notices} reports={reports} />
        <p className="legal-links">
          <a href="/accounts">{t("borderStart")}</a>
          {" · "}
          <a href="/">{t("siteHome")}</a>
        </p>
      </main>
    </div>
  );
}
