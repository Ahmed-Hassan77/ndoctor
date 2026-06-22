/**
 * Health articles shown on the home page and /blog routes.
 * @typedef {{ slug: string; image: string; category: { en: string; ar: string }; date: { en: string; ar: string }; readTime: { en: string; ar: string }; title: { en: string; ar: string }; excerpt: { en: string; ar: string }; author: { en: string; ar: string }; authorRole: { en: string; ar: string }; content: { en: string; ar: string } }} Article
 */

/** @type {Article[]} */
export const ARTICLES = [
  {
    slug: "heart-health",
    image: "/blog/heart-health.jpg",
    category: { en: "Heart health", ar: "صحة القلب" },
    date: { en: "Jan 12, 2026", ar: "12 يناير 2026" },
    readTime: { en: "5 min read", ar: "5 دقائق" },
    title: {
      en: "How to keep your heart healthy",
      ar: "كيف تحافظ على صحة قلبك؟",
    },
    excerpt: {
      en: "Medical tips to protect your heart and prevent chronic disease in everyday life.",
      ar: "نصائح طبية للحفاظ على صحة القلب والوقاية من الأمراض المزمنة.",
    },
    author: { en: "Dr. Ahmed Mohamed", ar: "د. أحمد محمد" },
    authorRole: {
      en: "Cardiology consultant",
      ar: "استشاري القلب والأوعية الدموية",
    },
    content: {
      en: `<p>Heart disease remains one of the leading health concerns worldwide. The good news is that many risk factors can be reduced with consistent daily habits.</p>
<h2>Balanced nutrition</h2>
<p>Eat plenty of fruits and vegetables, limit salt and saturated fats, and include fatty fish rich in omega-3 when possible.</p>
<h2>Regular activity</h2>
<p>Thirty minutes of brisk walking most days strengthens the heart muscle and improves circulation.</p>
<h2>Quit smoking</h2>
<p>Stopping smoking quickly lowers the risk of heart attack and supports long-term recovery.</p>
<h2>Manage stress</h2>
<p>Chronic stress affects the heart. Try relaxation techniques, good sleep, and time away from screens.</p>`,
      ar: `<p>تعتبر أمراض القلب من أكثر المخاوف الصحية شيوعاً. الخبر الجيد أن كثيراً من عوامل الخطر يمكن تقليلها بعادات يومية بسيطة.</p>
<h2>تغذية متوازنة</h2>
<p>تناول الفواكه والخضروات، وقلل الملح والدهون المشبعة، وأضف أسماكاً غنية بأوميغا 3 عند الإمكان.</p>
<h2>نشاط منتظم</h2>
<p>ثلاثون دقيقة من المشي السريع معظم الأيام تقوي عضلة القلب وتحسن الدورة الدموية.</p>
<h2>التوقف عن التدخين</h2>
<p>الإقلاع عن التدخين يخفض خطر النوبة القلبية ويدعم التعافي على المدى الطويل.</p>
<h2>إدارة التوتر</h2>
<p>التوتر المزمن يؤثر على القلب. جرّب الاسترخاء والنوم الجيد والابتعاد عن الشاشات قبل النوم.</p>`,
    },
  },
  {
    slug: "healthy-nutrition",
    image: "/blog/nutrition.jpg",
    category: { en: "Nutrition", ar: "تغذية" },
    date: { en: "Jan 10, 2026", ar: "10 يناير 2026" },
    readTime: { en: "4 min read", ar: "4 دقائق" },
    title: {
      en: "The importance of good nutrition",
      ar: "أهمية التغذية السليمة",
    },
    excerpt: {
      en: "A practical guide to balanced eating that supports immunity and daily energy.",
      ar: "دليل لنظام غذائي متوازن يعزز المناعة والنشاط.",
    },
    author: { en: "Dr. Sara Ali", ar: "د. سارة علي" },
    authorRole: {
      en: "Clinical nutrition specialist",
      ar: "أخصائية التغذية العلاجية",
    },
    content: {
      en: `<p>Good nutrition is not only about weight — it is how you fuel energy, immunity, and long-term wellbeing.</p>
<h2>Build a healthy plate</h2>
<ul><li>Half the plate: vegetables and salad</li><li>Lean protein: fish, poultry, or legumes</li><li>Complex carbs: brown rice, oats, whole grains</li></ul>
<h2>Stay hydrated</h2>
<p>Aim for enough water through the day. Dehydration can cause fatigue and poor concentration.</p>`,
      ar: `<p>التغذية السليمة ليست للوزن فقط — بل هي طاقتك ومناعتك وصحتك على المدى الطويل.</p>
<h2>طبق صحي متوازن</h2>
<ul><li>نصف الطبق: خضروات وسلطة</li><li>بروتين قليل الدهن: سمك أو دواجن أو بقوليات</li><li>كربوهيدرات معقدة: أرز بني وشوفان وحبوب كاملة</li></ul>
<h2>اشرب الماء</h2>
<p>احرص على شرب كمية كافية من الماء يومياً. الجفاف يسبب التعب وضعف التركيز.</p>`,
    },
  },
  {
    slug: "mental-health",
    image: "/blog/mental-health.jpg",
    category: { en: "Mental health", ar: "صحة نفسية" },
    date: { en: "Jan 8, 2026", ar: "8 يناير 2026" },
    readTime: { en: "6 min read", ar: "6 دقائق" },
    title: {
      en: "Mental health and daily life",
      ar: "الصحة النفسية والحياة",
    },
    excerpt: {
      en: "How mental wellbeing affects your day and practical ways to manage stress.",
      ar: "كيف تؤثر الصحة النفسية على يومك وطرق إدارة الضغط.",
    },
    author: { en: "Mr. Mohamed Karim", ar: "أ. محمد كريم" },
    authorRole: { en: "Psychologist", ar: "أخصائي نفسي" },
    content: {
      en: `<p>Mental health is as important as physical health. Caring for your emotions is part of self-care.</p>
<h2>Signs to watch</h2>
<p>Persistent poor sleep, excessive worry, or loss of interest may mean you need rest or professional support.</p>
<h2>Small steps that help</h2>
<ul><li>Talk to someone you trust</li><li>Make time for hobbies</li><li>Seek specialist help when needed</li></ul>`,
      ar: `<p>الصحة النفسية لا تقل أهمية عن الجسدية. الاهتمام بمشاعرك جزء من الرعاية الذاتية.</p>
<h2>علامات تستحق الانتباه</h2>
<p>الأرق المستمر أو القلق الزائد أو فقدان الشغف قد يعني أنك بحاجة لراحة أو مساعدة متخصصة.</p>
<h2>خطوات بسيطة تساعد</h2>
<ul><li>تحدث مع شخص تثق به</li><li>خصص وقتاً لهواية تحبها</li><li>لا تتردد في زيارة مختص عند الحاجة</li></ul>`,
    },
  },
  {
    slug: "diabetes-care",
    image: "/blog/diabetes.jpg",
    category: { en: "Chronic conditions", ar: "أمراض مزمنة" },
    date: { en: "Jan 5, 2026", ar: "5 يناير 2026" },
    readTime: { en: "7 min read", ar: "7 دقائق" },
    title: {
      en: "Diabetes: prevention and daily management",
      ar: "السكري: الوقاية والتعايش",
    },
    excerpt: {
      en: "Golden tips for people at risk and those living with diabetes every day.",
      ar: "نصائح ذهبية للوقاية ولمرضى السكري في الحياة اليومية.",
    },
    author: { en: "Dr. Khaled Omar", ar: "د. خالد عمر" },
    authorRole: {
      en: "Endocrinology consultant",
      ar: "استشاري الغدد الصماء",
    },
    content: {
      en: `<p>Diabetes is manageable with the right plan. Small, steady habits make the biggest difference over time.</p>
<h2>Know your numbers</h2>
<p>Check blood sugar as your doctor advises, keep a simple log, and attend regular follow-ups.</p>
<h2>Food and movement</h2>
<p>Choose high-fibre foods, limit sugary drinks, and walk after meals when you can.</p>
<h2>Medication matters</h2>
<p>Take prescribed medicines on time and discuss any side effects early with your care team.</p>`,
      ar: `<p>يمكن إدارة السكري بخطة مناسبة. العادات البسيطة والثابتة هي الأهم على المدى الطويل.</p>
<h2>اعرف أرقامك</h2>
<p>قِس السكر حسب توجيه الطبيب، وسجّل القراءات، واحضر المتابعة الدورية.</p>
<h2>الغذاء والحركة</h2>
<p>اختر أطعمة غنية بالألياف، قلل المشروبات السكرية، وامشِ بعد الوجبات عند الإمكان.</p>
<h2>الالتزام بالعلاج</h2>
<p>التزم بالأدوية في وقتها وناقش أي أعراض مبكراً مع فريق الرعاية.</p>`,
    },
  },
  {
    slug: "child-winter-health",
    image: "/blog/child-health.jpg",
    category: { en: "Pediatrics", ar: "طب أطفال" },
    date: { en: "Jan 1, 2026", ar: "1 يناير 2026" },
    readTime: { en: "3 min read", ar: "3 دقائق" },
    title: {
      en: "Keeping children healthy in winter",
      ar: "صحة الطفل في الشتاء",
    },
    excerpt: {
      en: "How to protect kids from colds and flu as school season peaks.",
      ar: "كيف تحمي طفلك من نزلات البرد والأنفلونزا في موسم المدارس.",
    },
    author: { en: "Dr. Mona Saeed", ar: "د. منى سعيد" },
    authorRole: { en: "Pediatrician", ar: "أخصائية طب الأطفال" },
    content: {
      en: `<p>Children catch viruses more easily in crowded indoor spaces. Prevention starts at home.</p>
<h2>Strong immunity basics</h2>
<p>Balanced meals, enough sleep, and hand washing before meals reduce spread.</p>
<h2>When to see a doctor</h2>
<p>High fever, breathing difficulty, or refusing fluids need prompt medical review.</p>
<h2>Vaccines and hygiene</h2>
<p>Keep routine vaccinations up to date and teach children to cover coughs and avoid sharing cups.</p>`,
      ar: `<p>الأطفال أكثر عرضة للعدوى في الأماكن المغلقة والمزدحمة. الوقاية تبدأ في المنزل.</p>
<h2>أساسيات المناعة</h2>
<p>وجبات متوازنة، نوم كافٍ، وغسل اليدين قبل الأكل يقلل الانتشار.</p>
<h2>متى تزور الطبيب</h2>
<p>حمى شديدة أو صعوبة في التنفس أو رفض السوائل تستدعي مراجعة طبية سريعة.</p>
<h2>التطعيم والنظافة</h2>
<p>حافظ على التطعيمات الروتينية وعلّم الطفل تغطية السعال وعدم مشاركة الأكواب.</p>`,
    },
  },
  {
    slug: "better-sleep",
    image: "/blog/sleep.jpg",
    category: { en: "Wellness", ar: "عافية" },
    date: { en: "Dec 28, 2025", ar: "28 ديسمبر 2025" },
    readTime: { en: "5 min read", ar: "5 دقائق" },
    title: {
      en: "Better sleep for a healthier body",
      ar: "نوم أفضل لجسم أكثر صحة",
    },
    excerpt: {
      en: "Simple evening habits that improve rest, focus, and recovery.",
      ar: "عادات مسائية بسيطة تحسّن الراحة والتركيز والتعافي.",
    },
    author: { en: "Dr. Nadia Hassan", ar: "د. نادية حسن" },
    authorRole: { en: "Family medicine", ar: "طب الأسرة" },
    content: {
      en: `<p>Sleep affects mood, immunity, blood pressure, and concentration. Most adults need seven to nine hours.</p>
<h2>Evening routine</h2>
<p>Dim lights an hour before bed, avoid heavy meals late, and limit caffeine after mid-afternoon.</p>
<h2>Screen boundaries</h2>
<p>Put phones away thirty minutes before sleep. Blue light delays melatonin release.</p>
<h2>Consistent schedule</h2>
<p>Wake and sleep at similar times, even on weekends, to stabilise your body clock.</p>`,
      ar: `<p>النوم يؤثر على المزاج والمناعة وضغط الدم والتركيز. معظم البالغين يحتاجون سبع إلى تسع ساعات.</p>
<h2>روتين مسائي</h2>
<p>خفف الإضاءة قبل النوم بساعة، تجنب وجبات ثقيلة متأخرة، وقلل الكافيين بعد الظهر.</p>
<h2>حدود الشاشات</h2>
<p>ابتعد عن الهاتف قبل النوم بنصف ساعة. الضوء الأزرق يؤخر الميلاتونين.</p>
<h2>مواعيد ثابتة</h2>
<p>استيقظ ونم في أوقات قريبة حتى في العطلة لتثبيت ساعة الجسم.</p>`,
    },
  },
  {
    slug: "online-consultation-guide",
    image: "/blog/telemedicine.jpg",
    category: { en: "Digital health", ar: "صحة رقمية" },
    date: { en: "Dec 22, 2025", ar: "22 ديسمبر 2025" },
    readTime: { en: "4 min read", ar: "4 دقائق" },
    title: {
      en: "How to prepare for an online consultation",
      ar: "كيف تستعد لاستشارة أونلاين؟",
    },
    excerpt: {
      en: "Get the most from your video visit with doctors on MediMeet.",
      ar: "استفد أكثر من زيارتك بالفيديو مع أطباء ميدي ميت.",
    },
    author: { en: "Dr. Youssef Ibrahim", ar: "د. يوسف إبراهيم" },
    authorRole: {
      en: "General practice",
      ar: "طب عام",
    },
    content: {
      en: `<p>Online visits save travel time and work well for follow-ups, results review, and many common concerns.</p>
<h2>Before the call</h2>
<p>Test camera and microphone, sit in a quiet, well-lit room, and list symptoms with dates.</p>
<h2>Have documents ready</h2>
<p>Upload lab results or photos of prescriptions through your medical profile when possible.</p>
<h2>During the visit</h2>
<p>Speak clearly, ask about treatment options, and confirm follow-up steps before you end the call.</p>`,
      ar: `<p>الاستشارة أونلاين توفر الوقت وتناسب المتابعات ومراجعة التحاليل والكثير من الحالات الشائعة.</p>
<h2>قبل المكالمة</h2>
<p>اختبر الكاميرا والميكروفون، اجلس في مكان هادئ ومضاء جيداً، واكتب الأعراض مع تواريخها.</p>
<h2>جهّز المستندات</h2>
<p>ارفع نتائج التحاليل أو صور الوصفات عبر ملفك الطبي عند الإمكان.</p>
<h2>أثناء الزيارة</h2>
<p>تحدث بوضوح، اسأل عن خيارات العلاج، وتأكد من خطوات المتابعة قبل إنهاء المكالمة.</p>`,
    },
  },
  {
    slug: "daily-exercise",
    image: "/blog/exercise.jpg",
    category: { en: "Fitness", ar: "لياقة" },
    date: { en: "Dec 18, 2025", ar: "18 ديسمبر 2025" },
    readTime: { en: "5 min read", ar: "5 دقائق" },
    title: {
      en: "Moving more without a gym membership",
      ar: "الحركة اليومية دون اشتراك نادي",
    },
    excerpt: {
      en: "Safe ways to add activity at home or work for heart and joint health.",
      ar: "طرق آمنة لزيادة النشاط في المنزل أو العمل لصحة القلب والمفاصل.",
    },
    author: { en: "Dr. Hana Mostafa", ar: "د. هناء مصطفى" },
    authorRole: {
      en: "Sports medicine",
      ar: "طب رياضي",
    },
    content: {
      en: `<p>You do not need intense training to benefit. Regular light movement adds up across the week.</p>
<h2>Start small</h2>
<p>Ten-minute walks after meals, stairs instead of elevators, and stretching breaks during desk work.</p>
<h2>Stay safe</h2>
<p>Warm up, wear supportive shoes, and stop if you feel chest pain, dizziness, or sharp joint pain.</p>
<h2>Build the habit</h2>
<p>Pair activity with something you already do daily — morning coffee, lunch break, or evening news.</p>`,
      ar: `<p>لا تحتاج تدريباً شاقاً للاستفادة. الحركة الخفيفة المنتظمة تتراكم خلال الأسبوع.</p>
<h2>ابدأ بخطوات صغيرة</h2>
<p>مشي عشر دقائق بعد الوجبات، السلالم بدل المصعد، وتمدد أثناء العمل المكتبي.</p>
<h2>السلامة أولاً</h2>
<p>سخّن العضلات، ارتدِ حذاءً مريحاً، وتوقف عند ألم صدر أو دوخة أو ألم مفصل حاد.</p>
<h2>ثبّت العادة</h2>
<p>اربط النشاط بعادة يومية — قهوة الصباح، استراحة الغداء، أو أخبار المساء.</p>`,
    },
  },
  {
    slug: "womens-health-checkups",
    image: "/blog/womens-health.jpg",
    category: { en: "Women's health", ar: "صحة المرأة" },
    date: { en: "Dec 12, 2025", ar: "12 ديسمبر 2025" },
    readTime: { en: "6 min read", ar: "6 دقائق" },
    title: {
      en: "Essential checkups every woman should know",
      ar: "فحوصات مهمة كل امرأة يجب أن تعرفها",
    },
    excerpt: {
      en: "Screening timelines for breast, cervical, bone, and metabolic health.",
      ar: "مواعيد الكشف عن صحة الثدي والعنق والعظام والتمثيل الغذائي.",
    },
    author: { en: "Dr. Layla Farouk", ar: "د. ليلى فاروق" },
    authorRole: {
      en: "Obstetrics & gynecology",
      ar: "نساء وتوليد",
    },
    content: {
      en: `<p>Preventive visits catch problems early when treatment is most effective.</p>
<h2>Regular gynecology visits</h2>
<p>Discuss cycle changes, family planning, and screening tests recommended for your age.</p>
<h2>Breast awareness</h2>
<p>Know what is normal for you and report lumps, skin changes, or discharge promptly.</p>
<h2>Bone and metabolic health</h2>
<p>Vitamin D, calcium intake, and periodic labs help protect bones and detect diabetes risk.</p>`,
      ar: `<p>الزيارات الوقائية تكتشف المشاكل مبكراً عندما يكون العلاج أفعَل.</p>
<h2>متابعة نسائية دورية</h2>
<p>ناقشي تغيرات الدورة والتخطيط الأسري والفحوصات المناسبة لعمرك.</p>
<h2>وعي بصحة الثدي</h2>
<p>اعرفي ما هو طبيعي لديكِ وأبلغي عن أي كتلة أو تغير جلدي أو إفرازات.</p>
<h2>صحة العظام والتمثيل الغذائي</h2>
<p>فيتامين د والكالسيوم والتحاليل الدورية تحمي العظام وتكشف مخاطر السكري.</p>`,
    },
  },
];

/** @param {string} slug */
export function getArticleBySlug(slug) {
  return ARTICLES.find((a) => a.slug === slug) ?? null;
}

/**
 * @param {string} locale
 * @param {number} [limit] — newest first; omit for all articles
 */
export function getFeaturedArticles(locale, limit) {
  const loc = locale === "ar" ? "ar" : "en";
  const list = ARTICLES.map((article) => ({
    slug: article.slug,
    image: article.image,
    category: article.category[loc],
    date: article.date[loc],
    readTime: article.readTime[loc],
    title: article.title[loc],
    excerpt: article.excerpt[loc],
    author: article.author[loc],
    authorRole: article.authorRole[loc],
  }));
  if (limit != null && limit > 0) return list.slice(0, limit);
  return list;
}

/** @param {string} slug @param {string} locale */
export function getLocalizedArticle(slug, locale) {
  const article = getArticleBySlug(slug);
  if (!article) return null;
  const loc = locale === "ar" ? "ar" : "en";
  return {
    slug: article.slug,
    image: article.image,
    category: article.category[loc],
    date: article.date[loc],
    readTime: article.readTime[loc],
    title: article.title[loc],
    excerpt: article.excerpt[loc],
    author: article.author[loc],
    authorRole: article.authorRole[loc],
    content: article.content[loc],
  };
}
