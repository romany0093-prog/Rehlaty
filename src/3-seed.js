
/* ---------- 3. Seed data (Egyptian demo content) ---------- */
const DB_KEY = 'rehlati_db_v1';
const DB_VERSION = 5;

function seedDB() {
  const R = rng(42);
  const now = new Date();
  const D = (n) => iso(addDays(TODAY, n));
  const T = (n, h) => { const d = addDays(TODAY, n); d.setHours(h == null ? 10 : h, Math.floor(R() * 59)); return d.toISOString(); };

  const destinations = [
    { id: 'hurghada', name: { ar: 'الغردقة', en: 'Hurghada' }, region: { ar: 'البحر الأحمر', en: 'Red Sea' }, art: 'sea', featured: true },
    { id: 'sharm', name: { ar: 'شرم الشيخ', en: 'Sharm El Sheikh' }, region: { ar: 'جنوب سيناء', en: 'South Sinai' }, art: 'sinai', featured: true },
    { id: 'luxor', name: { ar: 'الأقصر', en: 'Luxor' }, region: { ar: 'صعيد مصر', en: 'Upper Egypt' }, art: 'temple', featured: true },
    { id: 'aswan', name: { ar: 'أسوان', en: 'Aswan' }, region: { ar: 'صعيد مصر', en: 'Upper Egypt' }, art: 'nile', featured: true },
    { id: 'dahab', name: { ar: 'دهب', en: 'Dahab' }, region: { ar: 'جنوب سيناء', en: 'South Sinai' }, art: 'sinai', featured: true },
    { id: 'siwa', name: { ar: 'سيوة', en: 'Siwa' }, region: { ar: 'الصحراء الغربية', en: 'Western Desert' }, art: 'oasis', featured: true },
    { id: 'northcoast', name: { ar: 'الساحل الشمالي', en: 'North Coast' }, region: { ar: 'مطروح', en: 'Matrouh' }, art: 'coast', featured: true },
    { id: 'marsaalam', name: { ar: 'مرسى علم', en: 'Marsa Alam' }, region: { ar: 'البحر الأحمر', en: 'Red Sea' }, art: 'sea', featured: false },
    { id: 'whitedesert', name: { ar: 'الصحراء البيضاء', en: 'White Desert' }, region: { ar: 'الواحات البحرية', en: 'Bahariya Oasis' }, art: 'desert', featured: false },
    { id: 'cairo', name: { ar: 'القاهرة والجيزة', en: 'Cairo & Giza' }, region: { ar: 'القاهرة الكبرى', en: 'Greater Cairo' }, art: 'pyramids', featured: false },
    { id: 'fayoum', name: { ar: 'الفيوم', en: 'Fayoum' }, region: { ar: 'الفيوم', en: 'Fayoum' }, art: 'desert', featured: false },
    { id: 'sokhna', name: { ar: 'العين السخنة', en: 'Ain Sokhna' }, region: { ar: 'السويس', en: 'Suez' }, art: 'coast', featured: false }
  ];
  const categories = [
    { id: 'beach', name: { ar: 'شواطئ ومصايف', en: 'Beach holidays' } },
    { id: 'culture', name: { ar: 'تاريخية وثقافية', en: 'History & culture' } },
    { id: 'cruise', name: { ar: 'رحلات نيلية', en: 'Nile cruises' } },
    { id: 'safari', name: { ar: 'سفاري وصحراء', en: 'Safari & desert' } },
    { id: 'diving', name: { ar: 'غوص وسنوركل', en: 'Diving & snorkeling' } },
    { id: 'family', name: { ar: 'عائلية', en: 'Family' } },
    { id: 'honeymoon', name: { ar: 'شهر عسل', en: 'Honeymoon' } },
    { id: 'day', name: { ar: 'رحلات اليوم الواحد', en: 'Day trips' } }
  ];
  const companies = [
    { id: 'c1', name: { ar: 'نيل ستار للسياحة', en: 'Nile Star Travel' }, color: '#8C5A2B', city: { ar: 'القاهرة - مصر الجديدة', en: 'Heliopolis, Cairo' }, phone: '01001234567', email: 'info@nilestar.eg', website: 'nilestar.eg', license: 'ترخيص وزارة السياحة فئة (أ) رقم 1184', founded: 2009, status: 'approved', commission: 8, desc: { ar: 'متخصصون في رحلات الصعيد والبواخر النيلية منذ ٢٠٠٩. مرشدونا حاصلون على ترخيص الإرشاد السياحي، ونتعامل مع بواخر خمس نجوم فقط.', en: 'Upper Egypt and Nile cruise specialists since 2009. Licensed Egyptologist guides and five‑star cruise ships only.' }, createdAt: T(-420), logo: null, cover: 'art:nile:1' },
    { id: 'c2', name: { ar: 'بحر وصحرا للرحلات', en: 'Bahr & Sahra Tours' }, color: '#1F7A8C', city: { ar: 'الغردقة', en: 'Hurghada' }, phone: '01112345678', email: 'hello@bahrsahra.eg', website: 'bahrsahra.eg', license: 'ترخيص وزارة السياحة فئة (أ) رقم 2310', founded: 2014, status: 'approved', commission: null, desc: { ar: 'شركة من أهل البحر الأحمر. نجهز رحلات الغردقة وشرم ودهب بمراكب خاصة ومدربي غوص معتمدين من PADI.', en: 'Red Sea locals running Hurghada, Sharm and Dahab trips with private boats and PADI‑certified instructors.' }, createdAt: T(-380), logo: null, cover: 'art:sea:0' },
    { id: 'c3', name: { ar: 'دروب سيوة', en: 'Siwa Trails' }, color: '#B4532A', city: { ar: 'الجيزة - الدقي', en: 'Dokki, Giza' }, phone: '01223456789', email: 'trips@siwatrails.eg', website: 'siwatrails.eg', license: 'ترخيص وزارة السياحة فئة (ب) رقم 4127', founded: 2017, status: 'approved', commission: null, desc: { ar: 'رحلات الصحراء الغربية بمجموعات صغيرة: سيوة والبحرية والصحراء البيضاء والفيوم، مع أدلاء من أهل الواحات.', en: 'Small‑group Western Desert trips — Siwa, Bahariya, the White Desert and Fayoum — with local Bedouin guides.' }, createdAt: T(-300), logo: null, cover: 'art:oasis:1' },
    { id: 'c4', name: { ar: 'أفق للرحلات', en: 'Ofoq Trips' }, color: '#3B5B92', city: { ar: 'الإسكندرية - سموحة', en: 'Smouha, Alexandria' }, phone: '01534567890', email: 'care@ofoq.eg', website: 'ofoq.eg', license: 'ترخيص وزارة السياحة فئة (أ) رقم 3051', founded: 2012, status: 'approved', commission: null, desc: { ar: 'رحلات عائلية وشبابية للساحل الشمالي ومرسى علم والقاهرة. أتوبيسات حديثة ومشرف مرافق في كل رحلة.', en: 'Family and youth trips to the North Coast, Marsa Alam and Cairo, with modern coaches and a host on every trip.' }, createdAt: T(-260), logo: null, cover: 'art:coast:0' },
    { id: 'c5', name: { ar: 'مرسى للسياحة', en: 'Marsa Tourism' }, color: '#5E7A3A', city: { ar: 'مرسى علم', en: 'Marsa Alam' }, phone: '01098765432', email: 'info@marsa-tours.eg', website: '', license: 'ترخيص وزارة السياحة فئة (ب) رقم 5520', founded: 2021, status: 'pending', commission: null, desc: { ar: 'رحلات غوص وسفاري في مرسى علم وحماطة.', en: 'Diving and safari trips in Marsa Alam and Hamata.' }, createdAt: T(-2), logo: null, cover: 'art:sea:1', docs: [{ name: 'السجل التجاري.pdf' }, { name: 'ترخيص وزارة السياحة.pdf' }, { name: 'البطاقة الضريبية.pdf' }] },
    { id: 'c6', name: { ar: 'واحة الأحلام للسفر', en: 'Dream Oasis Travel' }, color: '#7A4D8C', city: { ar: 'المنصورة', en: 'Mansoura' }, phone: '01276543210', email: 'dream.oasis@mail.eg', website: '', license: 'ترخيص وزارة السياحة فئة (ج) رقم 6011', founded: 2023, status: 'pending', commission: null, desc: { ar: 'رحلات اقتصادية للأقصر وأسوان والغردقة.', en: 'Budget trips to Luxor, Aswan and Hurghada.' }, createdAt: T(-1), logo: null, cover: 'art:temple:0', docs: [{ name: 'السجل التجاري.pdf' }, { name: 'ترخيص وزارة السياحة.pdf' }] }
  ];
  const PR = { c1: 5, c2: 4, c3: 5, c4: 3 };
  companies.forEach((c) => { c.platformRating = PR[c.id] || null; });
  companies.forEach((c) => { c.docs = c.docs || [{ name: 'السجل التجاري.pdf' }, { name: 'ترخيص وزارة السياحة.pdf' }, { name: 'البطاقة الضريبية.pdf' }]; });

  const users = [
    { id: 'u_admin', role: 'admin', name: 'إدارة UTravel', email: 'admin@rehlati.eg', password: 'admin123', phone: '0225550000', status: 'active', createdAt: T(-500) },
    { id: 'u_c1', role: 'company', companyId: 'c1', name: 'هشام عبد الرحيم', email: 'nilestar@demo.eg', password: '123456', phone: '01001234567', status: 'active', createdAt: T(-420) },
    { id: 'u_c2', role: 'company', companyId: 'c2', name: 'ريم الشاذلي', email: 'bahr@demo.eg', password: '123456', phone: '01112345678', status: 'active', createdAt: T(-380) },
    { id: 'u_c3', role: 'company', companyId: 'c3', name: 'عمرو الشناوي', email: 'siwa@demo.eg', password: '123456', phone: '01223456789', status: 'active', createdAt: T(-300) },
    { id: 'u_c4', role: 'company', companyId: 'c4', name: 'دينا رأفت', email: 'ofoq@demo.eg', password: '123456', phone: '01534567890', status: 'active', createdAt: T(-260) },
    { id: 'u_c5', role: 'company', companyId: 'c5', name: 'سيد حماد', email: 'marsa@demo.eg', password: '123456', phone: '01098765432', status: 'active', createdAt: T(-2) },
    { id: 'u_c6', role: 'company', companyId: 'c6', name: 'أيمن الدسوقي', email: 'dream@demo.eg', password: '123456', phone: '01276543210', status: 'active', createdAt: T(-1) }
  ];
  const custNames = ['مريم عادل', 'أحمد سمير', 'نور حسن', 'كريم عادل', 'سلمى فتحي', 'يوسف مجدي', 'هنا مصطفى', 'عمر طارق', 'ليلى إبراهيم', 'مصطفى كمال', 'رنا الحسيني', 'محمود الجمال', 'فرح نبيل', 'خالد منصور'];
  custNames.forEach((n, i) => users.push({ id: 'u_k' + i, role: 'customer', name: n, email: i === 0 ? 'mariam@demo.eg' : `customer${i}@demo.eg`, password: '123456', phone: '01' + ['0', '1', '2', '5'][i % 4] + String(20000000 + i * 1234567).slice(0, 8), city: ['القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا'][i % 5], status: i === 13 ? 'suspended' : 'active', createdAt: T(-200 + i * 9), favorites: i === 0 ? ['t4', 't7'] : [] }));

  // trips --------------------------------------------------------------
  const P = (ar, en) => ({ ar, en });
  const it = (days) => days.map(([ar, en, tar, ten], i) => ({ day: i + 1, title: P(ar, en), text: P(tar, ten) }));
  const STD_POLICY = P('إلغاء مجاني حتى ١٤ يومًا قبل السفر واسترداد كامل المبلغ. من ١٤ إلى ٧ أيام يُسترد ٥٠٪. أقل من ٧ أيام لا يوجد استرداد. يمكن تغيير الاسم مجانًا حتى ٤٨ ساعة قبل السفر.', 'Free cancellation up to 14 days before departure with a full refund. 50% refund between 14 and 7 days. No refund within 7 days. Name changes are free up to 48 hours before departure.');
  const trips = [
    { id: 't1', companyId: 'c2', destId: 'hurghada', catId: 'beach', days: 4, title: P('الغردقة ٤ أيام في منتجع شامل مع رحلة جزيرة الجفتون', 'Hurghada 4 days all‑inclusive with Giftun Island cruise'),
      summary: P('ثلاث ليالٍ في منتجع ٥ نجوم بنظام الإقامة الشاملة ويوم كامل على مركب في جزيرة الجفتون.', 'Three nights in a five‑star all‑inclusive resort plus a full boat day at Giftun Island.'),
      desc: P('رحلة مثالية لمن يريد البحر والراحة بدون تفكير في التفاصيل. الإقامة في منتجع على شاطئ خاص في منطقة السهل حشيش، والوجبات والمشروبات مشمولة طوال اليوم. اليوم الثاني على مركب إلى محمية جزيرة الجفتون للسنوركل بين الشعاب المرجانية، مع غداء سمك على المركب.', 'An easy sea break: a private‑beach resort in Sahl Hasheesh with meals and drinks included all day, and a boat day to the Giftun Island reserve for snorkeling among the reefs, with a fish lunch on board.'),
      itinerary: it([['السفر والوصول', 'Travel & arrival', 'تحرك الأتوبيس من القاهرة ٦ صباحًا، الوصول والتسكين قبل العصر.', 'Coach leaves Cairo 6 am, check‑in by mid‑afternoon.'], ['جزيرة الجفتون', 'Giftun Island', 'مركب خاص، محطتان سنوركل، وغداء سمك.', 'Private boat, two snorkel stops and a fish lunch.'], ['يوم حر', 'Free day', 'استمتع بالمنتجع أو أضف رحلة سفاري اختيارية.', 'Enjoy the resort or add an optional quad safari.'], ['العودة', 'Return', 'تسليم الغرف ١٢ ظهرًا والعودة إلى القاهرة.', 'Check out at noon and return to Cairo.']]),
      accommodation: P('منتجع ٥ نجوم بالسهل حشيش – غرفة مطلة على الحديقة، إقامة شاملة', 'Five‑star resort in Sahl Hasheesh, garden‑view room, all‑inclusive'), transport: P('أتوبيس سياحي مكيف من القاهرة (ميدان التحرير / مول العرب)', 'Air‑conditioned coach from Cairo (Tahrir / Mall of Arabia)'),
      included: [P('الإقامة ٣ ليالٍ شامل', '3 nights all‑inclusive'), P('النقل ذهابًا وعودة', 'Return transport'), P('رحلة الجفتون مع الغداء', 'Giftun trip with lunch'), P('معدات السنوركل', 'Snorkel gear'), P('مشرف من الشركة', 'Company host')], excluded: [P('رسوم المحمية (٥ دولار)', 'Reserve fee (USD 5)'), P('الأنشطة الاختيارية', 'Optional activities'), P('البقشيش', 'Tips')],
      img: ['art:sea:0', 'art:sea:1', 'art:coast:1', 'art:sea:2'], basePrice: 9800, seats: 40, popular: 380 },
    { id: 't2', companyId: 'c2', destId: 'sharm', catId: 'diving', days: 5, title: P('شرم الشيخ ٥ أيام – غوص رأس محمد وخليج نعمة', 'Sharm El Sheikh 5 days – Ras Mohammed diving & Naama Bay'),
      summary: P('أربع ليالٍ نصف إقامة، رحلة غوص في رأس محمد، وسهرة في خليج نعمة.', 'Four nights half‑board, a Ras Mohammed dive day and an evening in Naama Bay.'),
      desc: P('رأس محمد من أجمل مواقع الغوص في العالم. الرحلة مناسبة للمبتدئين لأن مدرب الغوص يرافق كل مجموعة من ٤ أشخاص، ولمن لا يغوص يوجد برنامج سنوركل. الفندق في خليج نعمة قريب من السوق القديم والمطاعم.', 'Ras Mohammed is among the world’s best dive sites. Beginners are welcome: an instructor goes with every group of four, and non‑divers snorkel. The hotel is in Naama Bay, close to the Old Market and restaurants.'),
      itinerary: it([['الوصول', 'Arrival', 'الطيران أو الأتوبيس، التسكين وجولة مسائية.', 'Flight or coach, check‑in and an evening walk.'], ['رأس محمد', 'Ras Mohammed', 'مركب غوص، غطستان مع مدرب أو سنوركل.', 'Dive boat, two guided dives or snorkeling.'], ['جزيرة تيران', 'Tiran Island', 'مركب يوم كامل بين الشعاب.', 'Full boat day among the reefs.'], ['يوم حر وسهرة', 'Free day & evening', 'خليج نعمة والسوق القديم.', 'Naama Bay and the Old Market.'], ['العودة', 'Return', 'تسليم الغرف والعودة.', 'Check out and return.']]),
      accommodation: P('فندق ٤ نجوم في خليج نعمة – نصف إقامة', 'Four‑star hotel in Naama Bay, half‑board'), transport: P('أتوبيس سوبر جيت من القاهرة، أو طيران بفرق سعر', 'Superjet coach from Cairo, flights available at extra cost'),
      included: [P('٤ ليالٍ نصف إقامة', '4 nights half‑board'), P('رحلتا مركب', 'Two boat trips'), P('غطستان مع مدرب', 'Two guided dives'), P('النقل', 'Transport')], excluded: [P('رسوم رأس محمد', 'Ras Mohammed fee'), P('تذاكر الطيران', 'Flights'), P('الغطسات الإضافية', 'Extra dives')],
      img: ['art:sinai:0', 'art:sea:1', 'art:sinai:1', 'art:sea:2'], basePrice: 13500, seats: 30, popular: 290 },
    { id: 't3', companyId: 'c2', destId: 'dahab', catId: 'diving', days: 4, title: P('دهب ٤ أيام – البلو هول وشروق جبل موسى', 'Dahab 4 days – Blue Hole & Mount Sinai sunrise'),
      summary: P('كامب على البحر، سنوركل في البلو هول، وصعود جبل موسى لمشاهدة الشروق.', 'A seafront camp, snorkeling at the Blue Hole and a Mount Sinai sunrise climb.'),
      desc: P('رحلة شبابية بأجواء دهب الهادئة. الإقامة في كامب بيوت خشبية على البحر، اليوم الثاني سنوركل في البلو هول والكانيون، والليلة الثالثة صعود جبل موسى ليلًا للوصول قبل الشروق ثم زيارة دير سانت كاترين.', 'A laid‑back youth trip. Stay in wooden seafront huts, snorkel the Blue Hole and the Canyon, then climb Mount Sinai at night for sunrise and visit St Catherine’s Monastery.'),
      itinerary: it([['الوصول', 'Arrival', 'التسكين وجلسة على البحر في الممشى.', 'Check‑in and an evening on the promenade.'], ['البلو هول', 'Blue Hole', 'سنوركل في البلو هول والكانيون وغداء بدوي.', 'Snorkel the Blue Hole and the Canyon, Bedouin lunch.'], ['جبل موسى', 'Mount Sinai', 'التحرك ١١ مساءً، الشروق على القمة، ثم دير سانت كاترين.', 'Leave 11 pm, sunrise at the summit, then the monastery.'], ['العودة', 'Return', 'إفطار وعودة.', 'Breakfast and return.']]),
      accommodation: P('كامب على البحر – بيوت خشبية لشخصين أو ثلاثة', 'Seafront camp – wooden huts for two or three'), transport: P('ميني باص من القاهرة', 'Minibus from Cairo'),
      included: [P('٣ ليالٍ بالإفطار', '3 nights with breakfast'), P('رحلة البلو هول', 'Blue Hole trip'), P('رحلة جبل موسى بدليل بدوي', 'Mount Sinai with Bedouin guide'), P('النقل', 'Transport')], excluded: [P('العشاء', 'Dinners'), P('رسوم دير سانت كاترين', 'Monastery fee'), P('الجمال على الجبل', 'Camel ride on the mountain')],
      img: ['art:sinai:1', 'art:sinai:2', 'art:sea:0', 'art:desert:2'], basePrice: 7200, seats: 24, popular: 410 },
    { id: 't4', companyId: 'c1', destId: 'luxor', catId: 'cruise', days: 5, title: P('باخرة نيلية ٥ نجوم بين الأقصر وأسوان', 'Five‑star Nile cruise from Luxor to Aswan'),
      summary: P('أربع ليالٍ على باخرة إقامة كاملة، وزيارة الكرنك ووادي الملوك وإدفو وكوم أمبو وفيلة.', 'Four nights full‑board on the river with Karnak, the Valley of the Kings, Edfu, Kom Ombo and Philae.'),
      desc: P('أشهر رحلة في مصر بترتيب مريح: طيران أو قطار نوم إلى الأقصر، ثم أربع ليالٍ على باخرة خمس نجوم تبحر جنوبًا إلى أسوان. كل الزيارات مع مرشد أثري مرخص يتحدث العربية، وتذاكر المزارات مشمولة.', 'Egypt’s classic journey, comfortably arranged: fly or take the sleeper train to Luxor, then four nights on a five‑star ship sailing south to Aswan. Every visit is with a licensed Egyptologist, and entry tickets are included.'),
      itinerary: it([['الأقصر – الضفة الشرقية', 'Luxor East Bank', 'الصعود للباخرة، معبد الكرنك ومعبد الأقصر ليلًا.', 'Board the ship, Karnak and Luxor Temple by night.'], ['الضفة الغربية', 'West Bank', 'وادي الملوك، معبد حتشبسوت، تمثالا ممنون، ثم الإبحار.', 'Valley of the Kings, Hatshepsut, the Colossi, then sail.'], ['إدفو وكوم أمبو', 'Edfu & Kom Ombo', 'معبد حورس بإدفو ومعبد كوم أمبو عند الغروب.', 'Temple of Horus and Kom Ombo at sunset.'], ['أسوان', 'Aswan', 'السد العالي، معبد فيلة، وجولة فلوكة.', 'High Dam, Philae Temple and a felucca ride.'], ['العودة', 'Return', 'إفطار ونزول من الباخرة والعودة.', 'Breakfast, disembark and return.']]),
      accommodation: P('باخرة ٥ نجوم – كابينة مطلة على النيل، إقامة كاملة', 'Five‑star ship, Nile‑view cabin, full board'), transport: P('قطار نوم أو طيران داخلي من القاهرة (حسب الموعد)', 'Sleeper train or domestic flight from Cairo, depending on the date'),
      included: [P('٤ ليالٍ إقامة كاملة', '4 nights full board'), P('تذاكر المزارات', 'Site tickets'), P('مرشد أثري مرخص', 'Licensed Egyptologist'), P('الانتقالات الداخلية', 'Local transfers')], excluded: [P('مقبرة توت عنخ آمون', 'Tutankhamun tomb'), P('رحلة البالون', 'Balloon ride'), P('أبو سمبل', 'Abu Simbel')],
      img: ['art:nile:0', 'art:temple:1', 'art:nile:2', 'art:temple:0'], basePrice: 21500, seats: 36, popular: 520 },
    { id: 't5', companyId: 'c1', destId: 'luxor', catId: 'culture', days: 3, title: P('الأقصر ٣ أيام – البالون والضفة الغربية', 'Luxor 3 days – hot‑air balloon & West Bank'),
      summary: P('ليلتان في فندق على النيل، رحلة بالون عند الشروق، والكرنك ووادي الملوك.', 'Two nights on the Nile, a sunrise balloon flight, Karnak and the Valley of the Kings.'),
      desc: P('رحلة قصيرة مركزة للأقصر في نهاية أسبوع. تبدأ بقطار النوم، ثم زيارة الضفة الشرقية، وفي الصباح التالي رحلة بالون فوق المعابد قبل زيارة وادي الملوك.', 'A focused long‑weekend in Luxor: sleeper train, the East Bank, then a dawn balloon over the temples before the Valley of the Kings.'),
      itinerary: it([['الوصول والضفة الشرقية', 'Arrival & East Bank', 'الكرنك ومتحف الأقصر.', 'Karnak and the Luxor Museum.'], ['بالون والضفة الغربية', 'Balloon & West Bank', 'البالون ٥ صباحًا ثم وادي الملوك وحتشبسوت.', 'Balloon at 5 am, then the Valley of the Kings and Hatshepsut.'], ['العودة', 'Return', 'جولة حنطور وسوق الأقصر ثم القطار.', 'Carriage ride, souk, then the train.']]),
      accommodation: P('فندق ٤ نجوم على الكورنيش – بالإفطار', 'Four‑star Corniche hotel with breakfast'), transport: P('قطار نوم من القاهرة والجيزة', 'Sleeper train from Cairo and Giza'),
      included: [P('ليلتان بالإفطار', '2 nights with breakfast'), P('رحلة البالون', 'Balloon flight'), P('تذاكر المزارات', 'Site tickets'), P('مرشد مرخص', 'Licensed guide')], excluded: [P('الغداء والعشاء', 'Lunch and dinner'), P('التصوير داخل المقابر', 'Photography inside tombs')],
      img: ['art:temple:0', 'art:temple:1', 'art:temple:2'], basePrice: 8900, seats: 20, popular: 260 },
    { id: 't6', companyId: 'c1', destId: 'aswan', catId: 'culture', days: 4, title: P('أسوان وأبو سمبل ٤ أيام مع ليلة في بيت نوبي', 'Aswan & Abu Simbel 4 days with a night in a Nubian house'),
      summary: P('معبد أبو سمبل، فيلة، جزيرة النباتات، وليلة في قرية غرب سهيل النوبية.', 'Abu Simbel, Philae, Kitchener’s Island and a night in the Nubian village of Gharb Soheil.'),
      desc: P('أسوان في الشتاء من أجمل الأماكن في مصر. البرنامج يجمع بين المعابد الكبرى وتجربة الحياة النوبية: ليلة في بيت ملون على النيل، عشاء نوبي، وجولة فلوكة عند الغروب.', 'Aswan is at its best in winter. The program pairs the great temples with Nubian life: a night in a painted riverside house, a Nubian dinner and a sunset felucca.'),
      itinerary: it([['الوصول', 'Arrival', 'السد العالي ومعبد فيلة.', 'High Dam and Philae Temple.'], ['أبو سمبل', 'Abu Simbel', 'التحرك فجرًا إلى أبو سمبل والعودة ظهرًا.', 'Dawn drive to Abu Simbel, back by afternoon.'], ['القرية النوبية', 'Nubian village', 'فلوكة إلى جزيرة النباتات ثم المبيت في غرب سهيل.', 'Felucca to Kitchener’s Island, overnight in Gharb Soheil.'], ['العودة', 'Return', 'إفطار نوبي والعودة.', 'Nubian breakfast and return.']]),
      accommodation: P('ليلتان فندق ٤ نجوم + ليلة بيت ضيافة نوبي', 'Two nights four‑star hotel + one night Nubian guesthouse'), transport: P('طيران داخلي ذهابًا وعودة', 'Return domestic flights'),
      included: [P('٣ ليالٍ', '3 nights'), P('رحلة أبو سمبل', 'Abu Simbel trip'), P('الطيران الداخلي', 'Domestic flights'), P('عشاء نوبي', 'Nubian dinner')], excluded: [P('عرض الصوت والضوء', 'Sound & light show'), P('الغداء', 'Lunches')],
      img: ['art:nile:1', 'art:nile:0', 'art:temple:2'], basePrice: 11400, seats: 22, popular: 205 },
    { id: 't7', companyId: 'c3', destId: 'siwa', catId: 'safari', days: 5, title: P('واحة سيوة ٥ أيام – بحيرات الملح وسفاري بحر الرمال', 'Siwa Oasis 5 days – salt lakes & Great Sand Sea safari'),
      summary: P('إقامة في نُزل من الكرشيف، عين كليوباترا، بحيرات الملح، وسفاري لاند كروزر.', 'A kershef eco‑lodge, Cleopatra’s Spring, the salt lakes and a 4×4 safari.'),
      desc: P('سيوة عالم مختلف. الطريق طويل لكنه يستحق: إقامة في نُزل بيئي مبني من الكرشيف بدون كهرباء صاخبة، سباحة في بحيرات الملح التي تطفو فيها بسهولة، وسفاري في بحر الرمال الأعظم مع غروب على الكثبان.', 'Siwa feels like another world. The drive is long but worth it: an eco‑lodge built from kershef salt‑mud, floating in the salt lakes, and a Great Sand Sea safari ending with sunset on the dunes.'),
      itinerary: it([['السفر', 'Travel', 'تحرك ليلًا من القاهرة، الوصول صباحًا.', 'Overnight drive from Cairo, arrive in the morning.'], ['جولة الواحة', 'Oasis tour', 'قلعة شالي، معبد آمون، جبل الموتى.', 'Shali fortress, Temple of Amun, Mountain of the Dead.'], ['بحيرات الملح', 'Salt lakes', 'بحيرات الملح وعين كليوباترا.', 'Salt lakes and Cleopatra’s Spring.'], ['سفاري', 'Safari', 'لاند كروزر في بحر الرمال، عين ساخنة، وعشاء بدوي.', '4×4 into the sand sea, hot spring and Bedouin dinner.'], ['العودة', 'Return', 'جبل الدكرور والعودة.', 'Dakrour Mountain and return.']]),
      accommodation: P('نُزل بيئي من الكرشيف – غرف مزدوجة وثلاثية', 'Kershef eco‑lodge, double and triple rooms'), transport: P('أتوبيس من القاهرة، ولاند كروزر في الواحة', 'Coach from Cairo, 4×4 in the oasis'),
      included: [P('٣ ليالٍ نصف إقامة', '3 nights half‑board'), P('السفاري', 'Safari'), P('كل الجولات داخل الواحة', 'All oasis tours'), P('دليل سيوي', 'Siwan guide')], excluded: [P('المشتريات', 'Shopping'), P('الوجبات خارج البرنامج', 'Meals outside the program')],
      img: ['art:oasis:0', 'art:oasis:1', 'art:desert:1', 'art:oasis:2'], basePrice: 8400, seats: 26, popular: 340 },
    { id: 't8', companyId: 'c3', destId: 'whitedesert', catId: 'safari', days: 3, title: P('الصحراء البيضاء والبحرية – تخييم تحت النجوم', 'White Desert & Bahariya – camping under the stars'),
      summary: P('يومان في الصحراء السوداء والبيضاء، كريستال ماونتن، وليلة تخييم.', 'Black and White Deserts, Crystal Mountain and a night in camp.'),
      desc: P('تخييم حقيقي بين تشكيلات الطباشير البيضاء. نتحرك صباحًا إلى الواحات البحرية، ثم لاند كروزر عبر الصحراء السوداء وجبل الكريستال حتى نصل للمخيم قبل الغروب. عشاء على النار وسماء مليئة بالنجوم.', 'Real camping among white chalk formations: drive to Bahariya, 4×4 through the Black Desert and Crystal Mountain, reach camp before sunset, dinner by the fire under a sky full of stars.'),
      itinerary: it([['البحرية', 'Bahariya', 'الوصول، غداء، ثم الصحراء السوداء.', 'Arrive, lunch, then the Black Desert.'], ['الصحراء البيضاء', 'White Desert', 'كريستال ماونتن، الأكابات، والمبيت في المخيم.', 'Crystal Mountain, Agabat and camp overnight.'], ['العودة', 'Return', 'الشروق، إفطار، والعودة.', 'Sunrise, breakfast and return.']]),
      accommodation: P('ليلة في إيكولودج بالبحرية + ليلة تخييم', 'One night in a Bahariya eco‑lodge + one night camping'), transport: P('أتوبيس ولاند كروزر', 'Coach and 4×4'),
      included: [P('كل الوجبات', 'All meals'), P('معدات التخييم', 'Camping gear'), P('السفاري', 'Safari')], excluded: [P('أكياس النوم الشخصية (متاحة بالإيجار)', 'Personal sleeping bags (for rent)')],
      img: ['art:desert:2', 'art:desert:0', 'art:desert:1'], basePrice: 4600, seats: 18, popular: 300 },
    { id: 't9', companyId: 'c3', destId: 'fayoum', catId: 'day', days: 1, title: P('يوم في الفيوم – وادي الريان وقرية تونس', 'A day in Fayoum – Wadi El Rayan & Tunis Village'),
      summary: P('شلالات وادي الريان، وادي الحيتان، وورش الفخار في قرية تونس.', 'Wadi El Rayan waterfalls, Whale Valley and the pottery workshops of Tunis Village.'),
      desc: P('هروب من القاهرة ليوم واحد. نبدأ بقرية تونس وورش الفخار، ثم شلالات وادي الريان، ونختم بوادي الحيتان المسجل في التراث العالمي مع غروب على الكثبان.', 'A one‑day escape: Tunis Village pottery, the Wadi El Rayan waterfalls, and the UNESCO‑listed Whale Valley at sunset.'),
      itinerary: it([['يوم كامل', 'Full day', 'تحرك ٧ صباحًا، قرية تونس، وادي الريان، وادي الحيتان، العودة ٩ مساءً.', 'Leave 7 am — Tunis Village, Wadi El Rayan, Whale Valley — back by 9 pm.']]),
      accommodation: P('بدون مبيت', 'No overnight'), transport: P('ميني باص وسيارات دفع رباعي في وادي الحيتان', 'Minibus, plus 4×4 in Whale Valley'),
      included: [P('النقل', 'Transport'), P('غداء ريفي', 'Country lunch'), P('رسوم المحمية', 'Reserve fees')], excluded: [P('ورشة الفخار', 'Pottery class')],
      img: ['art:desert:1', 'art:oasis:1'], basePrice: 1450, seats: 28, popular: 460 },
    { id: 't10', companyId: 'c4', destId: 'northcoast', catId: 'family', days: 4, title: P('العلمين الجديدة ٤ أيام – شتاء على الساحل', 'New Alamein 4 days – a winter break on the coast'),
      summary: P('شقق فندقية للعائلات على الأبراج، ممشى العلمين، ومتحف العلمين الحربي.', 'Family serviced apartments in the towers, the Alamein promenade and the War Museum.'),
      desc: P('الساحل في الشتاء هادئ وجميل. الإقامة في شقق فندقية واسعة تناسب العائلات، مع زيارة ممشى العلمين، المتحف الحربي، ومقابر الكومنولث، ويوم حر على البحر.', 'The coast is calm and lovely in winter. Spacious serviced apartments for families, the Alamein promenade, the War Museum and Commonwealth cemetery, plus a free beach day.'),
      itinerary: it([['الوصول', 'Arrival', 'التحرك من الإسكندرية والقاهرة والتسكين.', 'Depart Alexandria and Cairo, check in.'], ['العلمين التاريخية', 'Historic Alamein', 'المتحف الحربي ومقابر الكومنولث.', 'War Museum and the Commonwealth cemetery.'], ['يوم حر', 'Free day', 'البحر والممشى والمطاعم.', 'Beach, promenade and restaurants.'], ['العودة', 'Return', 'تسليم الشقق والعودة.', 'Check out and return.']]),
      accommodation: P('شقة فندقية غرفتين – حتى ٥ أفراد', 'Two‑bedroom serviced apartment, up to five'), transport: P('أتوبيس من القاهرة والإسكندرية', 'Coach from Cairo and Alexandria'),
      included: [P('٣ ليالٍ بالإفطار', '3 nights with breakfast'), P('النقل', 'Transport'), P('الجولات', 'Tours')], excluded: [P('الغداء والعشاء', 'Lunch and dinner')],
      img: ['art:coast:0', 'art:coast:1', 'art:coast:2'], basePrice: 10900, seats: 40, popular: 230 },
    { id: 't11', companyId: 'c4', destId: 'marsaalam', catId: 'diving', days: 5, title: P('مرسى علم ٥ أيام – الدلافين في صمداي وسلحفاة أبو دباب', 'Marsa Alam 5 days – Samadai dolphins & Abu Dabbab turtles'),
      summary: P('منتجع شامل، رحلة دلافين صمداي، وسنوركل مع السلاحف في أبو دباب.', 'All‑inclusive resort, the Samadai dolphin reef and snorkeling with turtles at Abu Dabbab.'),
      desc: P('مرسى علم لمن يحب البحر الحقيقي بعيدًا عن الزحام. شعاب صمداي المعروفة بالدلافين الدوارة، وخليج أبو دباب حيث السلاحف البحرية وعروس البحر أحيانًا.', 'Marsa Alam is for people who want the real Red Sea without the crowds: Samadai reef with its spinner dolphins, and Abu Dabbab bay with sea turtles and, sometimes, a dugong.'),
      itinerary: it([['الوصول', 'Arrival', 'طيران إلى مرسى علم والتسكين.', 'Fly to Marsa Alam and check in.'], ['صمداي', 'Samadai', 'مركب إلى شعاب الدلافين.', 'Boat to the dolphin reef.'], ['أبو دباب', 'Abu Dabbab', 'سنوركل مع السلاحف.', 'Snorkel with turtles.'], ['يوم حر', 'Free day', 'المنتجع أو سفاري اختيارية.', 'Resort or an optional safari.'], ['العودة', 'Return', 'الطيران للقاهرة.', 'Fly back to Cairo.']]),
      accommodation: P('منتجع ٥ نجوم – إقامة شاملة', 'Five‑star resort, all‑inclusive'), transport: P('طيران مصر للطيران ذهابًا وعودة', 'Return EgyptAir flights'),
      included: [P('٤ ليالٍ شامل', '4 nights all‑inclusive'), P('الطيران', 'Flights'), P('رحلتا البحر', 'Two sea trips')], excluded: [P('رسوم محمية صمداي', 'Samadai reserve fee'), P('الغوص بالأسطوانة', 'Scuba diving')],
      img: ['art:sea:1', 'art:sea:0', 'art:sea:2'], basePrice: 15800, seats: 30, popular: 190 },
    { id: 't12', companyId: 'c4', destId: 'cairo', catId: 'culture', days: 2, title: P('القاهرة يومين – الأهرامات والمتحف المصري الكبير', 'Cairo 2 days – the Pyramids & the Grand Egyptian Museum'),
      summary: P('هضبة الجيزة، المتحف المصري الكبير، وشارع المعز ليلًا.', 'The Giza plateau, the Grand Egyptian Museum and El Moez Street by night.'),
      desc: P('برنامج مصمم للقادمين من المحافظات: ليلة في فندق مطل على الأهرامات، زيارة الهضبة والمتحف المصري الكبير مع مرشد، وجولة مسائية في القاهرة الفاطمية.', 'Designed for visitors from other governorates: a night with a Pyramids view, the plateau and the Grand Egyptian Museum with a guide, and an evening in Fatimid Cairo.'),
      itinerary: it([['الجيزة', 'Giza', 'الأهرامات وأبو الهول ثم المتحف المصري الكبير.', 'Pyramids and Sphinx, then the Grand Egyptian Museum.'], ['القاهرة الإسلامية', 'Islamic Cairo', 'القلعة، شارع المعز، خان الخليلي، والعودة.', 'The Citadel, El Moez Street, Khan El Khalili, and return.']]),
      accommodation: P('فندق ٤ نجوم مطل على الأهرامات', 'Four‑star hotel with a Pyramids view'), transport: P('أتوبيس من الإسكندرية وطنطا', 'Coach from Alexandria and Tanta'),
      included: [P('ليلة بالإفطار', '1 night with breakfast'), P('تذاكر الدخول', 'Entry tickets'), P('مرشد', 'Guide')], excluded: [P('دخول الهرم من الداخل', 'Inside the Great Pyramid')],
      img: ['art:pyramids:0', 'art:pyramids:1', 'art:pyramids:2'], basePrice: 3900, seats: 45, popular: 350 },
    { id: 't13', companyId: 'c2', destId: 'hurghada', catId: 'honeymoon', days: 6, title: P('شهر عسل في الغردقة ٦ أيام – جناح بحري وعشاء خاص', 'Hurghada honeymoon 6 days – sea suite & private dinner'),
      summary: P('خمس ليالٍ في جناح مطل على البحر، عشاء خاص على الشاطئ، ورحلة غواصة.', 'Five nights in a sea‑view suite, a private beach dinner and a submarine trip.'),
      desc: P('رحلة للعرسان بتفاصيل مدروسة: جناح مطل على البحر، تزيين الغرفة عند الوصول، عشاء خاص على الشاطئ، جلسة مساج لشخصين، ورحلة غواصة سندباد.', 'A carefully planned honeymoon: a sea‑view suite decorated on arrival, a private beach dinner, a couples’ massage and a Sindbad submarine trip.'),
      itinerary: it([['الوصول', 'Arrival', 'استقبال خاص وتزيين الجناح.', 'Private welcome and suite decoration.'], ['يوم حر', 'Free day', 'الشاطئ والمسابح.', 'Beach and pools.'], ['الغواصة', 'Submarine', 'غواصة سندباد ثم عشاء خاص.', 'Sindbad submarine then a private dinner.'], ['سبا', 'Spa', 'مساج لشخصين.', 'Couples’ massage.'], ['يوم حر', 'Free day', 'استرخاء.', 'Relax.'], ['العودة', 'Return', 'العودة.', 'Return.']]),
      accommodation: P('جناح مطل على البحر – شامل', 'Sea‑view suite, all‑inclusive'), transport: P('طيران أو سيارة خاصة', 'Flights or private car'),
      included: [P('٥ ليالٍ شامل', '5 nights all‑inclusive'), P('عشاء خاص', 'Private dinner'), P('مساج', 'Massage'), P('رحلة الغواصة', 'Submarine trip')], excluded: [P('الطيران', 'Flights')],
      img: ['art:sea:2', 'art:coast:1', 'art:sea:0'], basePrice: 24000, seats: 12, popular: 120 },
    { id: 't14', companyId: 'c4', destId: 'sokhna', catId: 'day', days: 1, title: P('يوم في العين السخنة', 'A day in Ain Sokhna'),
      summary: P('يوم على شاطئ خاص بالعين السخنة مع غداء.', 'A private‑beach day in Ain Sokhna with lunch.'),
      desc: P('يوم بحر سريع من القاهرة: شاطئ فندق خاص، مسبح، وغداء بوفيه.', 'A quick sea day from Cairo: a private hotel beach, pool access and a buffet lunch.'),
      itinerary: it([['يوم كامل', 'Full day', 'التحرك ٦ صباحًا والعودة ٨ مساءً.', 'Leave 6 am, back by 8 pm.']]),
      accommodation: P('بدون مبيت', 'No overnight'), transport: P('أتوبيس مكيف', 'Air‑conditioned coach'),
      included: [P('النقل', 'Transport'), P('دخول الشاطئ', 'Beach entry'), P('غداء', 'Lunch')], excluded: [P('المشروبات', 'Drinks')],
      img: ['art:coast:2', 'art:coast:0'], basePrice: 1250, seats: 45, popular: 40, status: 'pending' }
  ].map((t, i) => ({ ...t, policy: STD_POLICY, status: t.status || 'active', createdAt: T(-160 + i * 11), images: t.img }));
  trips.forEach((t) => delete t.img);

  // departures ----------------------------------------------------------
  const departures = [];
  const futureOffsets = [7, 14, 21, 35, 49, 63, 84, 105];
  trips.forEach((t, ti) => {
    // past departures for history (completed trips)
    [-150, -120, -90, -60, -35].forEach((off, k) => {
      const start = addDays(TODAY, off - (ti % 4));
      departures.push({ id: `d_${t.id}_p${k}`, tripId: t.id, start: iso(start), end: iso(addDays(start, t.days - 1)), price: Math.round(t.basePrice * (0.92 + R() * 0.12) / 50) * 50, seats: t.seats, status: 'closed' });
    });
    const n = t.days === 1 ? 8 : 5 + (ti % 3);
    for (let k = 0; k < n; k++) {
      const off = t.days === 1 ? 3 + k * 7 + (ti % 3) : futureOffsets[k] + (ti % 5);
      const start = addDays(TODAY, off);
      const peak = start.getMonth() === 11 && start.getDate() > 20 || start.getMonth() === 0 && start.getDate() < 5;
      departures.push({ id: `d_${t.id}_${k}`, tripId: t.id, start: iso(start), end: iso(addDays(start, t.days - 1)), price: Math.round(t.basePrice * (peak ? 1.18 : 0.96 + R() * 0.1) / 50) * 50, seats: t.seats, status: 'open' });
    }
  });

  // bookings ----------------------------------------------------------
  const customers = users.filter((u) => u.role === 'customer');
  const bookings = [], payments = [], refunds = [], reviews = [];
  const methods = ['card', 'fawry', 'wallet', 'instapay'];
  let seq = 1040;
  const firstNames = ['محمد', 'سارة', 'علي', 'منة', 'حسن', 'جنى', 'زياد', 'ملك', 'آدم', 'روان'];
  const compOf = (t) => companies.find((c) => c.id === t.companyId);
  function mkBooking(dep, t, cust, count, status, payStatus, createdOffset) {
    const c = compOf(t), rate = c.commission != null ? c.commission : 10, total = dep.price * count;
    const ref = 'RH-' + (dep.start.slice(2, 4) + dep.start.slice(5, 7)) + '-' + (seq++);
    const created = T(createdOffset);
    const travelers = Array.from({ length: count }, (_, i) => ({ name: i === 0 ? cust.name : firstNames[(seq + i) % firstNames.length] + ' ' + cust.name.split(' ')[1], age: i === 0 ? 30 + (seq % 15) : 8 + ((seq + i * 7) % 40), phone: i === 0 ? cust.phone : '' }));
    const b = { id: uid('b'), ref, customerId: cust.id, companyId: t.companyId, tripId: t.id, departureId: dep.id, count, travelers, unitPrice: dep.price, total, commissionRate: rate, commission: Math.round(total * rate / 100), status, paymentStatus: payStatus, createdAt: created, notes: '' };
    bookings.push(b);
    if (payStatus !== 'pending') {
      const m = methods[seq % 4];
      payments.push({ id: uid('p'), bookingId: b.id, method: m, amount: total, status: payStatus === 'failed' ? 'failed' : 'paid', idemKey: uid('idem'), txn: 'TX' + (900000 + seq * 37), createdAt: created });
    }
    return b;
  }
  const reviewTexts = [
    ['تنظيم ممتاز والمرشد كان فاهم وشرح كل حاجة بهدوء. الفندق نضيف والأكل كويس جدًا.', 5],
    ['الرحلة حلوة جدًا بس الأتوبيس اتأخر نص ساعة في الرجوع. غير كده كل حاجة تمام.', 4],
    ['أحسن رحلة عملتها مع العيلة. المشرف كان متابع معانا طول الوقت والأطفال انبسطوا.', 5],
    ['المكان يجنن والبرنامج مظبوط، كنت أتمنى وقت أطول في البحر.', 4],
    ['الأسعار مناسبة جدًا مقارنة بالخدمة. هحجز معاهم تاني أكيد.', 5],
    ['البرنامج اتغير يوم بسبب الجو بس الشركة عوضتنا برحلة تانية. تعامل محترم.', 4],
    ['التجربة كانت متوسطة، الغرفة مكانتش زي الصور.', 3],
    ['المرشد الأثري كان رائع، حسيت إني فهمت التاريخ لأول مرة.', 5]
  ];
  let rvi = 0;
  departures.forEach((d) => {
    const t = trips.find((x) => x.id === d.tripId);
    if (t.status !== 'active') return;
    const past = new Date(d.end) < TODAY;
    const nb = past ? 3 + Math.floor(R() * 4) : (d.start <= D(30) ? 2 + Math.floor(R() * 4) : Math.floor(R() * 3));
    for (let k = 0; k < nb; k++) {
      const cust = customers[(k * 3 + d.id.length + rvi) % 13];
      const count = 1 + Math.floor(R() * 3);
      const createdOff = Math.min(-1, daysBetween(TODAY, d.start) - 10 - Math.floor(R() * 30));
      if (past) {
        const roll = R();
        if (roll < 0.08) { const b = mkBooking(d, t, cust, count, 'refunded', 'refunded', createdOff); refunds.push({ id: uid('rf'), bookingId: b.id, amount: b.total, status: 'approved', reason: 'ظرف عائلي', createdAt: T(createdOff + 3), processedAt: T(createdOff + 5) }); }
        else if (roll < 0.12) mkBooking(d, t, cust, count, 'cancelled', 'failed', createdOff);
        else {
          const b = mkBooking(d, t, cust, count, 'completed', 'paid', createdOff);
          if (R() < 0.55) {
            const [txt, base] = reviewTexts[rvi++ % reviewTexts.length];
            const rt = (o) => clamp(base + (R() < 0.3 ? -1 : 0) + o, 1, 5);
            reviews.push({ id: uid('r'), bookingId: b.id, tripId: t.id, companyId: t.companyId, customerId: cust.id, ratings: { overall: base, organization: rt(0), service: rt(0), punctuality: rt(R() < 0.3 ? -1 : 0), company: rt(0) }, text: txt, reply: R() < 0.4 ? { text: 'شكرًا لكلامك الجميل، ننتظرك في رحلة قادمة.', at: T(createdOff + 50) } : null, createdAt: addDays(d.end, 2).toISOString() });
          }
        }
      } else {
        mkBooking(d, t, cust, count, 'confirmed', 'paid', createdOff);
      }
    }
  });
  // Demo customer Mariam: a clear set of states for the dashboard
  const mariam = customers[0];
  const depOf = (id) => departures.find((d) => d.id === id);
  const tOf = (id) => trips.find((t) => t.id === id);
  const pastT3 = depOf('d_t3_p3'); const bM1 = mkBooking(pastT3, tOf('t3'), mariam, 2, 'completed', 'paid', -80); // can review
  const pastT9 = depOf('d_t9_p4'); const bM2 = mkBooking(pastT9, tOf('t9'), mariam, 3, 'completed', 'paid', -50);
  reviews.push({ id: uid('r'), bookingId: bM2.id, tripId: 't9', companyId: 'c3', customerId: mariam.id, ratings: { overall: 5, organization: 5, service: 4, punctuality: 5, company: 5 }, text: 'يوم جميل جدًا والغدا الريفي كان أحلى حاجة. شكرًا دروب سيوة.', reply: { text: 'منورانا يا مريم! مستنيينك في سيوة.', at: T(-20) }, createdAt: T(-28) });
  mkBooking(depOf('d_t4_1'), tOf('t4'), mariam, 2, 'confirmed', 'paid', -9);
  const bPend = mkBooking(depOf('d_t7_2'), tOf('t7'), mariam, 1, 'pending_payment', 'pending', 0); bPend.holdUntil = new Date(Date.now() + 20 * 6e4).toISOString();
  const bRP = mkBooking(depOf('d_t1_3'), tOf('t1'), customers[4], 2, 'refund_pending', 'paid', -12);
  refunds.push({ id: uid('rf'), bookingId: bRP.id, amount: bRP.total, status: 'pending', reason: 'تعارض مع موعد امتحانات', createdAt: T(-1, 14) });
  const bRP2 = mkBooking(depOf('d_t2_1'), tOf('t2'), customers[7], 3, 'refund_pending', 'paid', -15);
  refunds.push({ id: uid('rf'), bookingId: bRP2.id, amount: Math.round(bRP2.total / 2), status: 'pending', reason: 'سفر عمل مفاجئ', createdAt: T(0, 9) });
  // a nearly full departure
  const hot = depOf('d_t3_0'); const used = bookings.filter((b) => b.departureId === hot.id && ['confirmed', 'completed', 'refund_pending'].includes(b.status)).reduce((a, b) => a + b.count, 0);
  if (hot.seats - used > 3) mkBooking(hot, tOf('t3'), customers[9], 3, 'confirmed', 'paid', -4);
  hot.seats = bookings.filter((b) => b.departureId === hot.id && ['confirmed', 'completed', 'refund_pending'].includes(b.status)).reduce((a, b) => a + b.count, 0) + 2;

  const disputes = [
    { id: uid('dp'), bookingId: bookings.find((b) => b.status === 'completed' && b.tripId === 't10').id, subject: 'الشقة كانت غرفة واحدة بدل غرفتين', status: 'open', createdAt: T(-3) }
  ];
  const settlements = [
    { id: uid('st'), companyId: 'c1', amount: 186000, note: 'تسوية شهر أغسطس', method: 'تحويل بنكي', createdAt: T(-70) },
    { id: uid('st'), companyId: 'c2', amount: 142500, note: 'تسوية شهر أغسطس', method: 'تحويل بنكي', createdAt: T(-69) },
    { id: uid('st'), companyId: 'c3', amount: 61200, note: 'تسوية شهر أغسطس', method: 'إنستاباي', createdAt: T(-69) },
    { id: uid('st'), companyId: 'c1', amount: 210400, note: 'تسوية شهر سبتمبر', method: 'تحويل بنكي', createdAt: T(-40) },
    { id: uid('st'), companyId: 'c4', amount: 98300, note: 'تسوية شهر سبتمبر', method: 'تحويل بنكي', createdAt: T(-39) }
  ];
  const notifications = [];
  const N = (to, title, body, link, at, read) => notifications.push({ id: uid('n'), to, title, body, link, read: !!read, createdAt: at });
  N('u_k0', P('تذكير برحلتك', 'Trip reminder'), P('باخرة الأقصر وأسوان بعد ١٠ أيام. جهّز بطاقتك الشخصية.', 'Your Luxor–Aswan cruise is in 10 days. Bring your ID.'), '#/me/bookings', T(0, 8));
  N('u_k0', P('قيّم رحلتك إلى دهب', 'Review your Dahab trip'), P('شاركنا رأيك في رحلة دهب وساعد غيرك يختار.', 'Tell us about your Dahab trip and help others choose.'), '#/me/reviews', T(-3), false);
  N('u_k0', P('تم تأكيد الدفع', 'Payment confirmed'), P('تم استلام دفعتك لرحلة الأقصر وأسوان.', 'We received your payment for the Luxor–Aswan cruise.'), '#/me/payments', T(-9), true);
  N('u_c2', P('طلب إلغاء جديد', 'New cancellation request'), P('طلب استرداد على حجز الغردقة من سلمى فتحي.', 'Refund request on a Hurghada booking from Salma Fathy.'), '#/co/bookings', T(-1, 14));
  N('u_c2', P('رحلة دهب قربت تكتمل', 'Dahab departure almost full'), P('باقي مقعدان فقط في أقرب موعد لرحلة دهب.', 'Only two seats left on the next Dahab departure.'), '#/co/trips', T(-1, 9));
  N('u_c1', P('حجز جديد', 'New booking'), P('مريم عادل حجزت مقعدين في باخرة الأقصر وأسوان.', 'Mariam Adel booked two seats on the Luxor–Aswan cruise.'), '#/co/bookings', T(-9));
  N('admin', P('طلب تسجيل شركة', 'Company application'), P('مرسى للسياحة أرسلت طلب انضمام ومستنداتها.', 'Marsa Tourism submitted an application with documents.'), '#/admin/companies', T(-2));
  N('admin', P('طلب تسجيل شركة', 'Company application'), P('واحة الأحلام للسفر أرسلت طلب انضمام.', 'Dream Oasis Travel submitted an application.'), '#/admin/companies', T(-1));
  N('admin', P('طلبات استرداد', 'Refund requests'), P('يوجد طلبان استرداد في انتظار المراجعة.', 'Two refund requests are waiting for review.'), '#/admin/bookings', T(0, 9));
  N('admin', P('رحلة تنتظر الاعتماد', 'Trip awaiting approval'), P('أفق للرحلات أضافت رحلة "يوم في العين السخنة".', 'Ofoq Trips added “A day in Ain Sokhna”.'), '#/admin/trips', T(-1, 16));
  N('admin', P('شكوى عميل', 'Customer complaint'), P('شكوى على حجز العلمين: الشقة لا تطابق الوصف.', 'Complaint on an Alamein booking: apartment didn’t match.'), '#/admin/bookings', T(-3));

  const activity = [
    { at: T(0, 9), text: P('طلب استرداد جديد من يوسف مجدي', 'New refund request from Youssef Magdy') },
    { at: T(-1, 16), text: P('أفق للرحلات أضافت رحلة جديدة للمراجعة', 'Ofoq Trips submitted a new trip') },
    { at: T(-1, 11), text: P('واحة الأحلام للسفر سجلت كشركة جديدة', 'Dream Oasis Travel registered') },
    { at: T(-2, 15), text: P('مرسى للسياحة سجلت كشركة جديدة', 'Marsa Tourism registered') },
    { at: T(-3, 12), text: P('شكوى مفتوحة على حجز في العلمين', 'Complaint opened on an Alamein booking') }
  ];

  const settings = {
    commission: 10,
    holdMinutes: 15,
    banners: [{ id: 'bn1', title: P('الشتاء في أسوان أحلى', 'Winter is better in Aswan'), text: P('خصم ١٠٪ على رحلات الصعيد حتى نهاية ديسمبر بكود الخصم', '10% off Upper Egypt trips until the end of December with the code'), code: 'NILE10', art: 'art:nile:1', link: '#/trips?dest=aswan', active: true }],
    offers: [{ id: 'of1', code: 'NILE10', percent: 10, dests: ['luxor', 'aswan'], until: D(50), active: true }, { id: 'of2', code: 'WELCOME5', percent: 5, dests: [], until: D(120), active: true }],
    featuredTrips: ['t4', 't7', 't1', 't3'],
    campaigns: [
      { id: 'cp_xmas', season: 'christmas', title: P('عروض الكريسماس ورأس السنة على البحر الأحمر', 'Christmas & New Year on the Red Sea'), note: P('خصم على الإقامة الشاملة لحجوزات موسم الأعياد', 'Discount on all‑inclusive stays for the holiday season'), companyId: 'c2', tripIds: ['t1', 't13'], percent: 15, from: D(-3), until: D(50), active: true, agreement: 'اتفاق مع بحر وصحرا' },
      { id: 'cp_mid', season: 'midyear', title: P('إجازة نصف العام في الصعيد', 'Mid‑year break in Upper Egypt'), note: P('خصم للعائلات والطلبة على رحلات الأقصر وأسوان', 'Family and student discount on Luxor and Aswan trips'), companyId: 'c1', tripIds: ['t4', 't5', 't6'], percent: 12, from: D(-3), until: D(85), active: true, agreement: 'اتفاق مع نيل ستار' },
      { id: 'cp_eid', season: 'eid', title: P('عروض العيد في سيوة', 'Eid offers in Siwa'), note: P('خصم على رحلة سيوة طوال أيام عيد الفطر', 'Siwa trip discount through Eid al‑Fitr'), companyId: 'c3', tripIds: ['t7'], percent: 10, from: D(95), until: D(125), active: true, agreement: 'اتفاق مع دروب سيوة' },
      { id: 'cp_summer', season: 'summer', title: P('صيف الساحل الشمالي', 'North Coast summer'), note: P('خصم الحجز المبكر لشقق العلمين', 'Early‑booking discount on Alamein apartments'), companyId: 'c4', tripIds: ['t10'], percent: 20, from: D(135), until: D(290), active: true, agreement: 'اتفاق مع أفق للرحلات' }
    ],
    faq: [
      { q: P('هل الدفع على المنصة آمن؟', 'Is paying on the platform safe?'), a: P('الدفع يتم عبر بوابات دفع معتمدة، والمنصة تحتفظ بالمبلغ حتى موعد الرحلة ثم تحوله للشركة. في هذه النسخة التجريبية الدفع محاكاة فقط.', 'Payments go through licensed gateways and the platform holds the money until the trip, then pays the company. In this prototype payments are simulated.') },
      { q: P('إزاي ألغي حجزي؟', 'How do I cancel?'), a: P('من لوحة حسابك > حجوزاتي > تفاصيل الحجز > طلب إلغاء. قيمة الاسترداد تُحسب تلقائيًا حسب سياسة الرحلة.', 'Go to your account > My bookings > booking details > Request cancellation. The refund is calculated from the trip’s policy.') },
      { q: P('امتى بيوصلني تأكيد الحجز؟', 'When do I get my confirmation?'), a: P('فور نجاح الدفع يظهر تأكيد الحجز برقم مرجعي، ويمكنك تحميله من لوحة حسابك.', 'As soon as payment succeeds you get a confirmation with a reference number, downloadable from your account.') },
      { q: P('هل الشركات على المنصة مرخصة؟', 'Are the companies licensed?'), a: P('لا نقبل أي شركة إلا بعد مراجعة السجل التجاري وترخيص وزارة السياحة.', 'We only accept companies after reviewing their commercial register and Ministry of Tourism licence.') },
      { q: P('أقدر أدفع فوري أو فودافون كاش؟', 'Can I pay with Fawry or a mobile wallet?'), a: P('نعم: بطاقة بنكية، فوري، المحافظ الإلكترونية، وإنستاباي.', 'Yes: bank card, Fawry, mobile wallets and InstaPay.') }
    ],
    pages: {
      about: { title: P('عن UTravel', 'About UTravel'), body: P('UTravel منصة مصرية تجمع شركات السياحة المرخصة في مكان واحد، علشان تقارن الرحلات بوضوح وتحجز وتدفع أونلاين بثقة. كل شركة على المنصة تمت مراجعة مستنداتها، وكل تقييم مكتوب من عميل سافر فعلًا.', 'UTravel is an Egyptian marketplace bringing licensed tour operators together so you can compare trips clearly and book and pay online with confidence. Every company is vetted and every review comes from a traveller who actually went.') },
      terms: { title: P('الشروط والأحكام', 'Terms & conditions'), body: P('الحجز عبر UTravel يعني موافقتك على سياسة الإلغاء الخاصة بكل رحلة. المنصة وسيط بين العميل والشركة المنظمة، وتحتفظ بقيمة الحجز حتى انتهاء الرحلة. أي تعديل في البرنامج تتحمل مسؤوليته الشركة المنظمة مع إخطار العميل.', 'Booking through UTravel means you accept each trip’s cancellation policy. The platform intermediates between you and the operator and holds the payment until the trip ends. The operator is responsible for program changes and must notify you.') },
      privacy: { title: P('سياسة الخصوصية', 'Privacy policy'), body: P('نستخدم بياناتك فقط لإتمام الحجز والتواصل معك بخصوصه. لا نشارك بيانات المسافرين إلا مع الشركة المنظمة للرحلة التي حجزتها.', 'We use your data only to complete and service your booking. Traveller details are shared only with the operator of the trip you booked.') },
      contact: { title: P('تواصل معنا', 'Contact us'), body: P('خدمة العملاء: 16xxx (يوميًا من ٩ صباحًا إلى ١١ مساءً) — البريد: support@utravel.eg — العنوان: التجمع الخامس، القاهرة الجديدة.', 'Customer care: 16xxx (daily 9 am–11 pm) — support@utravel.eg — Fifth Settlement, New Cairo.') }
    }
  };

  /* custom trip requests (demo only) */
  const dISO = (n) => iso(addDays(now, n)), tISO = (h) => new Date(now.getTime() + h * 36e5).toISOString();
  const prog = (arr) => arr.map(([t, x], i) => ({ day: i + 1, title: { ar: t, en: '' }, text: { ar: x, en: '' } }));
  const tripRequests = [
    { id: 'rq1', customerId: 'u_k0', status: 'open', createdAt: tISO(-30), expiresAt: tISO(90), initials: 'م. ع.', city: 'القاهرة', dests: ['dahab'], anyDest: false, from: dISO(30), to: dISO(33), flex: 1, adults: 2, children: 1, budgetMin: 4000, budgetMax: 6500, stay: '4', meals: 'half', transport: ['bus'], types: ['family'], special: 'عايزين غرفة عائلية قريبة من البحر، والطفل عنده ٧ سنين.', program: [{ day: 1, text: 'وصول وراحة على البحر' }, { day: 2, text: 'سنوركل في البلو هول' }, { day: 3, text: 'رحلة سفاري للوادي الملون' }, { day: 4, text: 'رجوع' }], window: 5 },
    { id: 'rq2', customerId: 'u_k3', status: 'open', createdAt: tISO(-4), expiresAt: tISO(116), initials: 'ك. ع.', city: 'المنصورة', dests: ['luxor', 'aswan'], anyDest: false, from: dISO(45), to: dISO(50), flex: 3, adults: 4, children: 0, budgetMin: '', budgetMax: 9000, stay: '5', meals: 'full', transport: ['train', 'flight'], types: [], special: 'نفسنا في ليلة على مركب في النيل.', program: [], window: 5 }
  ];
  const requestOffers = [
    { id: 'of1', requestId: 'rq1', companyId: 'c2', status: 'sent', createdAt: tISO(-20), updatedAt: tISO(-20), title: 'دهب العائلية ٤ أيام', destId: 'dahab', catId: 'family', start: dISO(30), end: dISO(33), price: 5900, total: 17700, validUntil: dISO(10), stayLevel: '4', stay: 'فندق ٤ نجوم على الممشى، غرفة عائلية', transportType: 'bus', transport: 'أتوبيس مكيف من القاهرة', program: prog([['السفر والوصول', 'تسكين وسهرة على الممشى'], ['البلو هول', 'سنوركل مع مدرب وأدوات للطفل'], ['الوادي الملون', 'سفاري بالجيب وغدا بدوي'], ['العودة', 'إفطار ثم السفر']]), included: [{ ar: 'نصف إقامة', en: '' }, { ar: 'الانتقالات', en: '' }, { ar: 'رحلة السنوركل والسفاري', en: '' }], excluded: [{ ar: 'المشروبات', en: '' }], notes: 'الطفل تحت ١٢ بخصم ٢٥٪ داخل السعر.', tripId: null, departureId: null },
    { id: 'of2', requestId: 'rq1', companyId: 'c1', status: 'sent', createdAt: tISO(-6), updatedAt: tISO(-6), title: 'دهب وسانت كاترين', destId: 'dahab', catId: 'adventure', start: dISO(31), end: dISO(34), price: 6800, total: 20400, validUntil: dISO(7), stayLevel: '5', stay: 'منتجع ٥ نجوم', transportType: 'flight', transport: 'طيران لشرم ثم ليموزين', program: prog([['الوصول', 'استقبال في المطار'], ['البلو هول', 'سنوركل'], ['سانت كاترين', 'صعود الجبل وقت الشروق'], ['العودة', '']]), included: [{ ar: 'تذاكر الطيران', en: '' }, { ar: 'إقامة كاملة', en: '' }], excluded: [{ ar: 'رسوم المحمية', en: '' }], notes: '', tripId: null, departureId: null }
  ];
  const requestMessages = [{ id: 'm1', requestId: 'rq1', companyId: 'c2', sender: 'company', text: 'أهلًا! هل تفضلوا غرفة واحدة عائلية ولا غرفتين متصلتين؟', createdAt: tISO(-19) }];
  return { version: DB_VERSION, seededAt: now.toISOString(), settings, users, companies, destinations, categories, trips, departures, bookings, payments, refunds, reviews, notifications, settlements, disputes, activity, tripRequests, requestOffers, requestMessages };
}
