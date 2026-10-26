/* Setare Talaei — catalogue (sample data for the prototype) */
(function (global) {
  'use strict';

  const fa = function (n) { return String(n).replace(/\d/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'[d]; }); };
  const toman = function (n) { return fa(Math.round(n).toLocaleString('en-US').replace(/,/g, '٬')); };
  const roundPrice = function (n) { return Math.round(n / 10000) * 10000; };

  const CATS = {
    farsh:    { name: 'فرش',     plural: 'فرش‌ها' },
    kenare:   { name: 'کناره',   plural: 'کناره‌ها' },
    padari:   { name: 'پادری',   plural: 'پادری‌ها' },
    rufarshi: { name: 'روفرشی',  plural: 'روفرشی‌ها' },
    gelim:    { name: 'گلیم',    plural: 'گلیم‌ها' },
  };

  const DESIGNS = {
    toranj: 'لچک‌ترنج', afshan: 'افشان', mahi: 'ماهی', khesti: 'خشتی', moharramat: 'محرمات', kilim: 'گلیمی',
  };

  const SHANEH = { 700: 2550, 1000: 3000, 1200: 3600, 1500: 4500 };
  const PER_M2 = { 700: 1950000, 1000: 2850000, 1200: 3650000, 1500: 4900000 };

  const SIZES = {
    farsh: [
      { w: 100, l: 150, label: '۱×۱٫۵', area: 1.5 },
      { w: 150, l: 225, label: '۱٫۵×۲٫۲۵', area: 3.4, nick: '۳ متری' },
      { w: 200, l: 300, label: '۲×۳', area: 6, nick: '۶ متری' },
      { w: 250, l: 350, label: '۲٫۵×۳٫۵', area: 9, nick: '۹ متری' },
      { w: 300, l: 400, label: '۳×۴', area: 12, nick: '۱۲ متری' },
    ],
    kenare: [
      { w: 80, l: 200, label: '۸۰×۲۰۰', area: 1.6 },
      { w: 80, l: 300, label: '۸۰×۳۰۰', area: 2.4 },
      { w: 80, l: 400, label: '۸۰×۴۰۰', area: 3.2 },
    ],
    padari: [
      { w: 60, l: 90, label: '۶۰×۹۰', area: 0.54 },
      { w: 70, l: 110, label: '۷۰×۱۱۰', area: 0.77 },
    ],
    rufarshi: [
      { w: 150, l: 225, label: '۱٫۵×۲٫۲۵', area: 3.4, nick: '۳ متری' },
      { w: 200, l: 300, label: '۲×۳', area: 6, nick: '۶ متری' },
      { w: 250, l: 350, label: '۲٫۵×۳٫۵', area: 9, nick: '۹ متری' },
    ],
    gelim: [
      { w: 100, l: 150, label: '۱×۱٫۵', area: 1.5 },
      { w: 150, l: 225, label: '۱٫۵×۲٫۲۵', area: 3.4 },
      { w: 200, l: 300, label: '۲×۳', area: 6 },
    ],
  };

  function priceFor(p, size) {
    if (p.cat === 'padari') return roundPrice(size.area * 1650000 + 240000);
    if (p.cat === 'rufarshi') return roundPrice(size.area * 520000 + 450000);
    if (p.cat === 'gelim') return roundPrice(size.area * 1480000);
    return roundPrice(size.area * PER_M2[p.shaneh]);
  }

  const raw = [
    // cat, name, design, palette, seed, shaneh, extras
    ['farsh', 'نگار', 'toranj', 'laki', 11, 1200, { sold: 1840, rating: 4.8, reviews: 312, off: 18, colors: ['laki', 'sormei', 'kerem'] }],
    ['farsh', 'شب کویر', 'toranj', 'sormei', 23, 1500, { sold: 960, rating: 4.9, reviews: 141, isNew: true, collection: 'شب کویر', colors: ['sormei', 'fili', 'laki'] }],
    ['farsh', 'ماه‌بانو', 'toranj', 'kerem', 37, 1200, { sold: 1320, rating: 4.7, reviews: 208, colors: ['kerem', 'laki', 'toosi'] }],
    ['farsh', 'گلستان', 'afshan', 'sormei', 41, 1000, { sold: 1105, rating: 4.6, reviews: 176, off: 25, colors: ['sormei', 'laki', 'kerem'] }],
    ['farsh', 'هراتی کاشان', 'mahi', 'kerem', 53, 1200, { sold: 870, rating: 4.7, reviews: 119, colors: ['kerem', 'sormei', 'gerdooi'] }],
    ['farsh', 'باغ ارم', 'khesti', 'abi', 61, 1000, { sold: 540, rating: 4.5, reviews: 73, colors: ['abi', 'fili', 'yashmi'] }],
    ['farsh', 'سایه', 'toranj', 'fili', 71, 1200, { sold: 1490, rating: 4.8, reviews: 254, vintage: 0.55, collection: 'وینتیج', off: 12, colors: ['fili', 'toosi', 'laki'] }],
    ['farsh', 'یشم', 'afshan', 'yashmi', 83, 1500, { sold: 410, rating: 4.9, reviews: 58, isNew: true, colors: ['yashmi', 'kerem', 'sormei'] }],
    ['farsh', 'پرنیان', 'mahi', 'gerdooi', 97, 700, { sold: 2210, rating: 4.4, reviews: 389, off: 30, colors: ['gerdooi', 'laki', 'kerem'] }],
    ['farsh', 'خاطره', 'toranj', 'toosi', 101, 1000, { sold: 760, rating: 4.6, reviews: 96, vintage: 0.4, collection: 'وینتیج', colors: ['toosi', 'fili', 'kerem'] }],
    ['farsh', 'بهار', 'afshan', 'kerem', 113, 1200, { sold: 990, rating: 4.7, reviews: 133, colors: ['kerem', 'abi', 'yashmi'] }],
    ['farsh', 'قاجار', 'moharramat', 'laki', 127, 1000, { sold: 330, rating: 4.5, reviews: 41, colors: ['laki', 'fili', 'yashmi'] }],
    ['farsh', 'ثریا', 'toranj', 'abi', 131, 1500, { sold: 680, rating: 4.9, reviews: 88, isNew: true, collection: 'شب کویر', colors: ['abi', 'sormei', 'kerem'] }],
    ['farsh', 'دلنشین', 'khesti', 'fili', 149, 700, { sold: 1270, rating: 4.3, reviews: 201, off: 22, colors: ['fili', 'abi', 'gerdooi'] }],
    ['farsh', 'کهکشان', 'afshan', 'sormei', 151, 1500, { sold: 590, rating: 4.8, reviews: 67, isNew: true, collection: 'شب کویر', colors: ['sormei', 'laki', 'yashmi'] }],
    ['farsh', 'رز', 'mahi', 'laki', 163, 1000, { sold: 1150, rating: 4.6, reviews: 158, colors: ['laki', 'sormei', 'toosi'] }],

    ['kenare', 'نگار', 'toranj', 'laki', 211, 1200, { sold: 980, rating: 4.8, reviews: 121, colors: ['laki', 'sormei'] }],
    ['kenare', 'هراتی', 'mahi', 'sormei', 223, 1000, { sold: 1210, rating: 4.6, reviews: 143, off: 15, colors: ['sormei', 'kerem'] }],
    ['kenare', 'بهار', 'afshan', 'kerem', 239, 1200, { sold: 640, rating: 4.7, reviews: 77, colors: ['kerem', 'abi'] }],
    ['kenare', 'سایه', 'toranj', 'fili', 241, 1200, { sold: 720, rating: 4.7, reviews: 84, vintage: 0.5, colors: ['fili', 'toosi'] }],
    ['kenare', 'قاجار', 'moharramat', 'yashmi', 257, 1000, { sold: 260, rating: 4.4, reviews: 29, isNew: true, colors: ['yashmi', 'laki'] }],

    ['padari', 'نگار', 'toranj', 'laki', 307, 1200, { sold: 2650, rating: 4.7, reviews: 402, off: 20, colors: ['laki', 'sormei'] }],
    ['padari', 'هراتی', 'mahi', 'sormei', 311, 1000, { sold: 1980, rating: 4.6, reviews: 288, colors: ['sormei', 'kerem'] }],
    ['padari', 'باغ', 'khesti', 'abi', 331, 1000, { sold: 1430, rating: 4.5, reviews: 190, colors: ['abi', 'fili'] }],
    ['padari', 'ایل', 'kilim', 'gerdooi', 347, 700, { sold: 1760, rating: 4.6, reviews: 233, isNew: true, colors: ['gerdooi', 'laki'] }],
    ['padari', 'بهار', 'afshan', 'kerem', 353, 1200, { sold: 1120, rating: 4.7, reviews: 151, colors: ['kerem', 'yashmi'] }],

    ['rufarshi', 'گلستان', 'afshan', 'sormei', 401, 0, { sold: 1340, rating: 4.5, reviews: 210, off: 35, colors: ['sormei', 'laki'] }],
    ['rufarshi', 'ماه‌بانو', 'toranj', 'kerem', 419, 0, { sold: 1180, rating: 4.6, reviews: 174, colors: ['kerem', 'toosi'] }],
    ['rufarshi', 'هراتی', 'mahi', 'fili', 421, 0, { sold: 760, rating: 4.4, reviews: 92, colors: ['fili', 'kerem'] }],
    ['rufarshi', 'باغ ارم', 'khesti', 'yashmi', 433, 0, { sold: 520, rating: 4.5, reviews: 61, isNew: true, colors: ['yashmi', 'abi'] }],

    ['gelim', 'ایل‌راه', 'kilim', 'laki', 503, 0, { sold: 690, rating: 4.7, reviews: 83, colors: ['laki', 'sormei'] }],
    ['gelim', 'کوچ', 'kilim', 'gerdooi', 521, 0, { sold: 540, rating: 4.6, reviews: 66, off: 15, colors: ['gerdooi', 'kerem'] }],
    ['gelim', 'سیاه‌چادر', 'kilim', 'sormei', 547, 0, { sold: 410, rating: 4.8, reviews: 49, isNew: true, colors: ['sormei', 'yashmi'] }],
    ['gelim', 'دشت', 'kilim', 'toosi', 563, 0, { sold: 300, rating: 4.5, reviews: 32, colors: ['toosi', 'fili'] }],
  ];

  const MATERIAL = {
    farsh: 'نخ اکریلیک هیت‌ست', kenare: 'نخ اکریلیک هیت‌ست', padari: 'نخ پلی‌پروپیلن با پشت ضدلغزش',
    rufarshi: 'پارچه مخمل کش‌دار (اسپان)', gelim: 'نخ پنبه و پشم، دست‌بافت',
  };

  const products = raw.map(function (r, i) {
    const x = r[6];
    const p = {
      id: 'st' + (100 + i), cat: r[0], name: r[1], design: r[2], palette: r[3], seed: r[4], shaneh: r[5] || null,
      density: r[5] ? SHANEH[r[5]] : null, vintage: x.vintage || 0, sold: x.sold, rating: x.rating, reviews: x.reviews,
      off: x.off || 0, isNew: !!x.isNew, collection: x.collection || null, colors: x.colors, material: MATERIAL[r[0]],
      sizes: SIZES[r[0]], views: Math.round(x.sold * (3.2 + (r[4] % 7) / 3)),
    };
    p.kind = p.cat === 'kenare' ? 'runner' : p.cat === 'padari' ? 'mat' : p.cat === 'rufarshi' ? 'cover' : 'rug';
    p.defaultSize = p.cat === 'farsh' ? 2 : p.cat === 'kenare' ? 1 : 0;
    p.price = function (sizeIdx) { return priceFor(p, p.sizes[sizeIdx == null ? p.defaultSize : sizeIdx]); };
    p.finalPrice = function (sizeIdx) { return roundPrice(p.price(sizeIdx) * (1 - p.off / 100)); };
    p.title = (p.cat === 'farsh' ? 'فرش' : CATS[p.cat].name) + ' ' + p.name;
    p.subtitle = [p.shaneh ? fa(p.shaneh) + ' شانه' : null, 'طرح ' + DESIGNS[p.design], global.Loom ? global.Loom.PALETTES[p.palette].name : ''].filter(Boolean);
    return p;
  });

  // shape of the rug image for each category (portrait, width × height in css px at 1x)
  function imgOpts(p, w, palette) {
    const ratio = p.cat === 'kenare' ? 3.4 : p.cat === 'padari' ? 1.5 : 1.5;
    const W = Math.round(w), H = Math.round(w * ratio);
    return { design: p.design, palette: palette || p.palette, seed: p.seed, width: W, height: H, kind: p.kind, vintage: p.vintage };
  }

  const PROVINCES = ['تهران', 'اصفهان', 'خراسان رضوی', 'فارس', 'آذربایجان شرقی', 'خوزستان', 'مازندران', 'گیلان', 'البرز', 'کرمان', 'یزد', 'قم'];

  global.ST = { fa: fa, toman: toman, CATS: CATS, DESIGNS: DESIGNS, SHANEH: SHANEH, SIZES: SIZES, products: products, imgOpts: imgOpts, PROVINCES: PROVINCES };
})(window);
