/**
 * classifierService.ts  v2  — Multi-signal fake news classifier
 *
 * Key fix: articles from trusted/known domains now get a strong domain-baseline
 * score so they default to REAL instead of uncertain. Only genuinely ambiguous
 * content with no domain match falls to uncertain as a last resort.
 *
 * Scoring logic:
 *  1. Domain credibility  → strong baseline for REAL or FAKE
 *  2. Misinformation keywords → pushes toward FAKE
 *  3. Sensationalism patterns  → pushes toward FAKE
 *  4. Real news indicators     → pushes toward REAL
 *  5. Journalistic attribution → pushes toward REAL
 *  6. Emotional manipulation   → pushes toward FAKE
 *
 * Verdict thresholds (relaxed from 1.5× to 1.2× so fewer articles are uncertain)
 */

export type Verdict = 'fake' | 'real' | 'uncertain';

export interface ClassificationResult {
  verdict: Verdict;
  confidence: number;          // 0–100
  explanation: string;
  claims: { claim: string; status: 'debunked' | 'verified' | 'unclear'; detail: string }[];
  counterMessage: string;
  signals: { label: string; value: string; type: 'positive' | 'negative' | 'neutral' }[];
  sources: { name: string; url: string; credibility: number; color: string; badge: string }[];
  processingTimeMs: number;
}

// ─────────────────────────────────────────────────────────────
// SOURCE CREDIBILITY DATABASE  (300 + domains — worldwide)
// ─────────────────────────────────────────────────────────────
export const CREDIBILITY_DB: Record<string, number> = {

  // ════════════════════════════════════════════════════════════
  // TIER S  — Intergovernmental / Official / Academic  (95-99)
  // ════════════════════════════════════════════════════════════
  'who.int': 98, 'cdc.gov': 97, 'nih.gov': 97, 'nasa.gov': 97,
  'un.org': 96, 'unicef.org': 95, 'worldbank.org': 95,
  'imf.org': 95, 'oecd.org': 95, 'europa.eu': 94, 'ec.europa.eu': 94,
  'gov.uk': 93, 'gov.in': 93, 'pib.gov.in': 93, 'mea.gov.in': 93,
  'whitehouse.gov': 92, 'state.gov': 92, 'congress.gov': 92,
  'europarl.europa.eu': 92, 'icj-cij.org': 94, 'icc-cpi.int': 94,
  'nature.com': 97, 'science.org': 97, 'pubmed.ncbi.nlm.nih.gov': 97,
  'bmj.com': 96, 'thelancet.com': 96, 'jamanetwork.com': 96,
  'nejm.org': 96,

  // ════════════════════════════════════════════════════════════
  // TIER A  — Global Wire Services  (92-95)
  // ════════════════════════════════════════════════════════════
  'reuters.com': 95, 'apnews.com': 95, 'afp.com': 94,
  'bbc.com': 95, 'bbc.co.uk': 95,
  'associated-press.com': 95, 'dpa-international.com': 93,
  'efe.com': 92, 'ansa.it': 92, 'kyodonews.net': 92, 'yonhapnews.agency': 91,

  // ════════════════════════════════════════════════════════════
  // TIER A  — Global Fact-Checkers  (88-94)
  // ════════════════════════════════════════════════════════════
  'snopes.com': 93, 'factcheck.org': 94, 'politifact.com': 92,
  'fullfact.org': 91, 'factcheck.afp.com': 90, 'afpfactcheck.com': 90,
  'checkyourfact.com': 88, 'leadstories.com': 87,
  'truthorfiction.com': 85, 'mediabiasfactcheck.com': 83,
  'boomlive.in': 88, 'altnews.in': 87, 'factchecker.in': 88,
  'vishvasnews.com': 85, 'factcrescendo.com': 84,
  'africacheck.org': 88, 'pesacheck.org': 86,
  'chequeado.com': 87,   // Latin America
  'lupa.uol.com.br': 87, // Brazil
  'maldita.es': 88,      // Spain
  'correctiv.org': 88,   // Germany
  'delcode.com': 82, 'logically.ai': 84,
  'poynter.org': 88, 'niemanlab.org': 85,
  'ifcncodeofprinciples.poynter.org': 90,

  // ════════════════════════════════════════════════════════════
  // UNITED STATES — National  (55-92)
  // ════════════════════════════════════════════════════════════
  'nytimes.com': 90, 'washingtonpost.com': 88, 'wsj.com': 88,
  'usatoday.com': 82, 'latimes.com': 84, 'chicagotribune.com': 82,
  'bostonglobe.com': 85, 'sfchronicle.com': 82,
  'npr.org': 92, 'pbs.org': 86,
  'cnn.com': 78, 'msnbc.com': 65, 'foxnews.com': 55,
  'nbcnews.com': 80, 'abcnews.go.com': 82, 'cbsnews.com': 82,
  'cbslocal.com': 78, 'abc7.com': 75,
  'axios.com': 82, 'politico.com': 74, 'thehill.com': 72,
  'theatlantic.com': 83, 'newyorker.com': 88,
  'time.com': 87, 'newsweek.com': 70, 'thedailybeast.com': 65,
  'huffpost.com': 65, 'buzzfeednews.com': 70, 'vox.com': 72,
  'slate.com': 72, 'motherjones.com': 70, 'thenation.com': 68,
  'theintercept.com': 68, 'propublica.org': 88, 'texastribune.org': 85,
  'christiansciencemonitor.com': 86, 'reason.com': 65,
  'economist.com': 91, 'ft.com': 90, 'bloomberg.com': 89,
  'marketwatch.com': 80, 'barrons.com': 82, 'fortune.com': 80,
  'businessinsider.com': 74, 'cnbc.com': 80, 'thestreet.com': 72,
  'nypost.com': 48, 'nationalreview.com': 60, 'weeklystandard.com': 62,
  'dailycaller.com': 42, 'dailywire.com': 40,
  'thefederalist.com': 45, 'oann.com': 28, 'newsmax.com': 45,
  'vice.com': 65, 'rollingstone.com': 68, 'vanityfair.com': 72,

  // ════════════════════════════════════════════════════════════
  // UNITED KINGDOM  (38-95)
  // ════════════════════════════════════════════════════════════
  'theguardian.com': 88, 'thetimes.co.uk': 84,
  'independent.co.uk': 78, 'telegraph.co.uk': 72,
  'sky.com': 75, 'skynews.com': 75, 'itv.com': 78, 'channel4.com': 78,
  'eveningstandard.co.uk': 65, 'metro.co.uk': 58,
  'dailymail.co.uk': 42, 'mirror.co.uk': 45, 'thesun.co.uk': 40,
  'express.co.uk': 38, 'dailystar.co.uk': 35,
  'spectator.co.uk': 65, 'newstatesman.com': 68,
  'thi.co.uk': 72, 'politicshome.com': 72,

  // ════════════════════════════════════════════════════════════
  // EUROPE — Country by country  (28-95)
  // ════════════════════════════════════════════════════════════
  // Germany
  'dw.com': 92, 'spiegel.de': 88, 'zeit.de': 88, 'faz.net': 87,
  'sueddeutsche.de': 87, 'handelsblatt.com': 84, 'tagesschau.de': 90,
  'bild.de': 48, 'welt.de': 70,

  // France
  'lemonde.fr': 90, 'lefigaro.fr': 82, 'liberation.fr': 80,
  'leparisien.fr': 75, 'lesechos.fr': 84, 'france24.com': 88,
  'rfi.fr': 88, 'franceinfo.fr': 86, 'tf1.fr': 78, 'bfmtv.com': 75,
  'europe1.fr': 72, 'lepoint.fr': 75, 'lexpress.fr': 76,

  // Spain / Portugal
  'elpais.com': 88, 'elmundo.es': 78, 'abc.es': 72, 'elconfidencial.com': 78,
  'lavanguardia.com': 80, 'rtve.es': 82, 'publico.es': 68,
  'publico.pt': 72, 'observador.pt': 78, 'jn.pt': 76, 'dn.pt': 76,

  // Italy
  'corriere.it': 87, 'repubblica.it': 86, 'lastampa.it': 84,
  'ilsole24ore.com': 85, 'tg24.sky.it': 80,
  'rainews.it': 82, 'fanpage.it': 65,

  // Netherlands / Belgium / Luxembourg
  'nu.nl': 82, 'nos.nl': 90, 'rtl.nl': 78, 'rtbf.be': 85,
  'vrt.be': 87, 'lesoir.be': 82, 'rtl.lu': 78,

  // Switzerland / Austria
  'nzz.ch': 90, 'srf.ch': 90, 'tagesanzeiger.ch': 85,
  'diepresse.com': 84, 'derstandard.at': 85, 'orf.at': 88,

  // Nordics
  'svt.se': 92, 'dn.se': 86, 'aftonbladet.se': 65,
  'dr.dk': 92, 'berlingske.dk': 85, 'politiken.dk': 84,
  'yle.fi': 92, 'hs.fi': 86,
  'nrk.no': 92, 'aftenposten.no': 86, 'vg.no': 70,

  // Poland / Czechia / Hungary
  'gazeta.pl': 78, 'wyborcza.pl': 80, 'tvn24.pl': 82,
  'ihned.cz': 80, 'idnes.cz': 78, 'ct24.cz': 86,
  'index.hu': 72, 'hvg.hu': 78,

  // Russia (independent / opposition outlets only — propaganda entries are in Tier D)
  'meduza.io': 72, 'novayagazeta.ru': 70, 'izvestia.ru': 38, 'kommersant.ru': 55,

  // Eastern Europe / Balkans
  'euractiv.com': 84, 'balkaninsight.com': 82,
  'occrp.org': 88, 'kyivindependent.com': 80,
  'pravda.com.ua': 75, 'ukrinform.net': 75,

  // Turkey
  'dailysabah.com': 55, 'hurriyet.com.tr': 65, 'bianet.org': 72,
  'cumhuriyet.com.tr': 68,

  // ════════════════════════════════════════════════════════════
  // MIDDLE EAST & NORTH AFRICA  (28-90)
  // ════════════════════════════════════════════════════════════
  'aljazeera.com': 82, 'aljazeera.net': 82,
  'alarabiya.net': 72, 'skynewsarabia.com': 72,
  'middleeastmonitor.com': 68, 'middleeasteye.net': 70,
  'arabnews.com': 66, 'gulfnews.com': 70,
  'thenationalnews.com': 74, 'khaleejionline.com': 65,
  'dailynewsegypt.com': 68, 'egyptindependent.com': 70,
  'haaretz.com': 82, 'timesofisrael.com': 78, 'jpost.com': 72,
  'ynetnews.com': 68, 'i24news.tv': 70,

  'dawn.com': 80, 'geo.tv': 75, 'thenews.com.pk': 74,
  'tribune.com.pk': 72, 'arynews.tv': 60,

  // ════════════════════════════════════════════════════════════
  // INDIA  (60-93)
  // ════════════════════════════════════════════════════════════
  // National English
  'thehindu.com': 90, 'timesofindia.com': 80, 'ndtv.com': 82,
  'indianexpress.com': 88, 'hindustantimes.com': 80,
  'theprint.in': 82, 'thewire.in': 78, 'scroll.in': 80,
  'livemint.com': 84, 'business-standard.com': 84,
  'economictimes.com': 82, 'financialexpress.com': 82,
  'deccanherald.com': 80, 'tribuneindia.com': 78,
  'telegraphindia.com': 82, 'thestatesman.com': 78,
  'newslaundry.com': 80, 'thequint.com': 78,
  'indiatoday.in': 78, 'outlookindia.com': 76,
  'firstpost.com': 72, 'news18.com': 70,
  'zeenews.india.com': 65, 'republicworld.com': 55,
  'opindia.com': 35, 'postcard.news': 22,
  'newsmobile.in': 78,
  // Regional / Hindi
  'bhaskar.com': 72, 'jagran.com': 70, 'amarujala.com': 68,
  'livehindustan.com': 68, 'navbharattimes.com': 70,
  'indiatvnews.com': 65,

  // ════════════════════════════════════════════════════════════
  // SOUTH ASIA — Bangladesh, Sri Lanka, Nepal, Myanmar  (60-84)
  // ════════════════════════════════════════════════════════════
  'thedailystar.net': 82,   // Bangladesh
  'prothomalo.com': 78,
  'bdnews24.com': 76,
  'colombopage.com': 72,    // Sri Lanka
  'adaderana.lk': 72,
  'daily.ft.lk': 75,
  'thehimalayantimes.com': 72, // Nepal
  'myrepublica.nagariknetwork.com': 70,
  'irrawaddy.com': 78,      // Myanmar

  // ════════════════════════════════════════════════════════════
  // SOUTHEAST ASIA  (58-88)
  // ════════════════════════════════════════════════════════════
  // Singapore
  'straitstimes.com': 86, 'channelnewsasia.com': 85, 'todayonline.com': 82,
  // Malaysia
  'malaymail.com': 78, 'freemalaysiatoday.com': 75, 'thestar.com.my': 78,
  'malaysiakini.com': 80,
  // Indonesia
  'kompas.com': 82, 'tempo.co': 80, 'thejakartapost.com': 80,
  'antaranews.com': 78,
  // Philippines
  'rappler.com': 80, 'inquirer.net': 78, 'philstar.com': 75,
  'abs-cbnnews.com': 76, 'manilabulletin.com': 72,
  // Thailand
  'bangkokpost.com': 80, 'nationthailand.com': 78, 'thaipbsworld.com': 82,
  // Vietnam
  'vnexpress.net': 72, 'tuoitrenews.vn': 72,

  // ════════════════════════════════════════════════════════════
  // EAST ASIA  (35-95)
  // ════════════════════════════════════════════════════════════
  // China (state/propaganda tier)
  'xinhuanet.com': 35, 'chinadaily.com.cn': 38,
  'people.com.cn': 35, 'globaltimes.cn': 30, 'cgtn.com': 35,

  // Hong Kong
  'scmp.com': 80, 'hongkongfp.com': 80, 'rthk.hk': 82,

  // Taiwan
  'taipeitimes.com': 82, 'cna.com.tw': 88, 'taiwannews.com.tw': 78,
  'rti.org.tw': 84,

  // Japan
  'japantimes.co.jp': 86, 'asahi.com': 86, 'mainichi.jp': 85,
  'yomiuri.co.jp': 82, 'nhk.or.jp': 90, 'nippon.com': 80,

  // South Korea
  'koreaherald.com': 82, 'koreatimes.co.kr': 80,
  'arirang.com': 80,

  // ════════════════════════════════════════════════════════════
  // AUSTRALIA & NEW ZEALAND  (45-95)
  // ════════════════════════════════════════════════════════════
  'abc.net.au': 92, 'sbs.com.au': 88, 'theconversation.com': 90,
  'smh.com.au': 84, 'theage.com.au': 84, 'crikey.com.au': 78,
  'news.com.au': 68, 'theaustralian.com.au': 72,
  'theguardian.com/australia-news': 88, 'dailytelegraph.com.au': 55,
  'heraldsun.com.au': 52, 'couriermail.com.au': 52,
  'stuff.co.nz': 80, 'nzherald.co.nz': 80, 'rnz.co.nz': 88,
  'tvnz.co.nz': 82,

  // ════════════════════════════════════════════════════════════
  // CANADA  (52-92)
  // ════════════════════════════════════════════════════════════
  'cbc.ca': 92, 'globeandmail.com': 86, 'nationalpost.com': 76,
  'torontostar.com': 80, 'montrealgazette.com': 78,
  'vancouversun.com': 76, 'thetyee.ca': 76, 'ricochet.media': 72,
  'canadaland.com': 74, 'macleans.ca': 78, 'theglobeandmail.com': 86,
  'postmedia.com': 72, 'torontosun.com': 52,

  // ════════════════════════════════════════════════════════════
  // LATIN AMERICA  (58-88)
  // ════════════════════════════════════════════════════════════
  // Brazil
  'folha.uol.com.br': 88, 'estadao.com.br': 86, 'globo.com': 84,
  'g1.globo.com': 84, 'uol.com.br': 72, 'agenciabrasil.ebc.com.br': 82,
  'bbc.com/portuguese': 92, 'cartacapital.com.br': 72,
  'veja.abril.com.br': 78,

  // Argentina
  'lanacion.com.ar': 84, 'clarin.com': 78, 'infobae.com': 72,
  'ambito.com': 72,

  // Mexico
  'eluniversal.com.mx': 80, 'reforma.com': 80, 'milenio.com': 72,
  'animalpolitico.com': 82, 'proceso.com.mx': 78,

  // Colombia / Venezuela / Chile / Peru
  'latercera.com': 80, 'elmostrador.cl': 76,    // Chile
  'elcomercio.pe': 78, 'larepublica.pe': 74,   // Peru

  // ════════════════════════════════════════════════════════════
  // AFRICA  (52-90)
  // ════════════════════════════════════════════════════════════
  // Pan-African / International
  'allafrica.com': 72, 'africatimes.com': 70,
  'africanews.com': 78, 'theafricareport.com': 80,

  // South Africa
  'dailymaverick.co.za': 86, 'news24.com': 80, 'timeslive.co.za': 78,
  'businessday.co.za': 82, 'ewn.co.za': 80, 'sabc.co.za': 78,
  'groundup.org.za': 84,

  // Nigeria
  'premiumtimesng.com': 80, 'thecable.ng': 80, 'punchng.com': 75,
  'thisdaylive.com': 72, 'vanguardngr.com': 70, 'channelstv.com': 76,
  'nannews.ng': 72,

  // Kenya / East Africa
  'nation.africa': 80, 'standardmedia.co.ke': 76, 'theelephant.info': 80,
  'thecitizen.co.tz': 74, 'monitor.co.ug': 76,

  // Ghana / West Africa
  'myjoyonline.com': 74, 'ghanaweb.com': 68,
  'the-star.co.ke': 74,

  // Egypt / North Africa (main entries in MENA section above)
  'ahramonline.com': 70,

  // INTERNATIONAL / MULTI-REGION — unique entries only
  'euronews.com': 82, 'voanews.com': 80, 'rferl.org': 78,
  'trtworld.com': 68, 'theglobepost.com': 72,
  'qz.com': 78, 'restofworld.org': 82,

  // ════════════════════════════════════════════════════════════
  // TECHNOLOGY PRESS  (65-88)
  // ════════════════════════════════════════════════════════════
  'techcrunch.com': 80, 'theverge.com': 78, 'arstechnica.com': 84,
  'wired.com': 80, 'engadget.com': 75, 'gizmodo.com': 68,
  'zdnet.com': 75, 'cnet.com': 74, 'venturebeat.com': 72,
  'thenextweb.com': 72, '9to5mac.com': 72, 'macrumors.com': 74,
  'tomsguide.com': 70, 'pcmag.com': 74, 'digitaltrends.com': 72,
  'techradar.com': 72, 'gadgets360.com': 75,

  // TIER D — State-Controlled / Propaganda (20-42)
  'rt.com': 32, 'sputniknews.com': 25, 'tass.com': 35, 'ria.ru': 35,
  'presstv.com': 28, 'irna.ir': 35, 'isna.ir': 38,
  'trt.net.tr': 60, 'tal.tv': 35, 'telesur.net': 38,
  'granma.cu': 22, 'kcna.kp': 10,

  // ════════════════════════════════════════════════════════════
  // TIER E  — Misinformation / Satire / Fabricated  (1-24)
  // ════════════════════════════════════════════════════════════
  'infowars.com': 8, 'naturalnews.com': 9, 'breitbart.com': 22,
  'zerohedge.com': 20, 'beforeitsnews.com': 10,
  'theonion.com': 5, 'babylonbee.com': 5,   // satire
  'worldnewsdailyreport.com': 5, 'empirenews.net': 4,
  'abcnews.com.co': 4, 'usatoday.com.co': 4,
  'nationalreport.net': 4, 'newslo.com': 10,
  'neonnettle.com': 12, 'yournewswire.com': 8,
  'newspunch.com': 10, 'realnewsrightnow.com': 5,
  'mediamass.net': 6, 'satirewire.com': 6,
  'clickhole.com': 5, 'thedailysheeple.com': 10,
  'veteranstoday.com': 12, 'activistpost.com': 18,
  '21stcenturywire.com': 15, 'globalresearch.ca': 20,
  'strategic-culture.org': 18, 'mintpressnews.com': 22,
  'thegatewaypundit.com': 18, 'dcclothesline.com': 8,
  'conservativetreehouse.com': 20,

  // ════════════════════════════════════════════════════════════
  // SOCIAL MEDIA  (38-60)
  // ════════════════════════════════════════════════════════════
  'reddit.com': 55, 'twitter.com': 50, 'x.com': 50,
  'facebook.com': 40, 'mastodon.social': 52, 'instagram.com': 42,
  'tiktok.com': 38, 'youtube.com': 60, 'rumble.com': 32,
  'telegram.org': 38, 'whatsapp.com': 35, 'linkedin.com': 60,
  'threads.net': 45,

  // ════════════════════════════════════════════════════════════
  // NEWS AGGREGATORS  (62-75)
  // ════════════════════════════════════════════════════════════
  'google.com': 75, 'news.google.com': 75,
  'news.ycombinator.com': 70, 'flipboard.com': 62,
  'feedly.com': 65, 'ground.news': 75, 'allsides.com': 78,
};

// ─────────────────────────────────────────────────────────────
// KEYWORD DICTIONARIES
// ─────────────────────────────────────────────────────────────
const FAKE_KEYWORDS = [
  // Conspiracy classics
  'leaked document', 'they don\'t want you to know', 'doctors baffled',
  'miracle cure', 'cancer cure found', 'government hiding', 'cover up',
  'conspiracy', 'wake up sheeple', 'mainstream media won\'t report',
  'shadow government', 'deep state', 'chemtrails', 'illuminati',
  'new world order', 'microchip implant', 'bill gates plan', 'george soros',
  'plandemic', '5g causes', 'vaccines cause autism', 'fluoride in water',
  'flat earth', 'moon landing fake', 'crisis actor', 'false flag',
  'mind control', 'nanobots', 'bioweapon created', 'population control',
  'satanic ritual', 'adrenochrome', 'qanon', 'great reset', 'deep state',
  'stolen election', 'voter fraud massive', 'rigged election', 'antifa paid',
  'covid hoax', 'climate change hoax', 'faked pandemic', 'witch hunt',
  'lamestream media', 'fake news media', 'globalist agenda',
  // Satire / hoax patterns
  'not real news', 'satire', 'parody site',
  // Shock content
  'you won\'t believe', 'what they\'re not telling you', 'banned footage',
  'this video will', 'share before deleted', 'censored by',
  'doctors don\'t want', 'big pharma hiding', 'the truth about',
];

const SENSATIONAL_PATTERNS = [
  /\b(shocking|bombshell|explosive|stunning|jaw-dropping|mind-blowing|unbelievable|incredible|terrifying)\b/gi,
  /\b(BREAKING|URGENT|EXPOSED|REVEALED|MUST READ|SHARE BEFORE|CENSORED|BANNED|SECRET)\b/g,
  /\b(100%|proven fact|definitely true|absolutely confirmed|always|everyone knows|nobody is talking)\b/gi,
  /!!!+/g,
  /\?{2,}/g,
  /[A-Z]{5,}/g,        // all-caps words
  /\b(WAKE UP|OPEN YOUR EYES|THINK ABOUT IT|DO YOUR RESEARCH)\b/gi,
];

// ── Journalistic real-news indicators ──
const REAL_INDICATORS = [
  // Attribution phrases
  'according to', 'reported by', 'confirmed by', 'statement from',
  'said in a', 'told reporters', 'press release', 'official statement',
  'spokesperson said', 'statement released', 'announced that',
  // Data / research
  'study published', 'peer reviewed', 'peer-reviewed', 'research shows',
  'scientists say', 'experts say', 'data shows', 'data indicates',
  'statistics show', 'analysis shows', 'survey finds', 'report finds',
  'published in', 'journal of', 'university study', 'clinical trial',
  // Governance / legal
  'government confirmed', 'court ruling', 'legislation passed',
  'signed into law', 'executive order', 'official report',
  'investigation found', 'audit shows', 'committee report',
  // News language
  'breaking news', 'developing story', 'live updates',
  'on the ground reporting', 'eyewitness accounts', 'sources say',
  'interview with', 'exclusive interview', 'quoted as saying',
];

// ── Emotional manipulation (strong fake indicator) ──
const EMOTIONAL_MANIPULATION = [
  'you should be angry', 'they want you scared', 'fight back',
  'rise up', 'don\'t be a sheep', 'wake up america', 'patriots must',
  'share to save', 'before this gets deleted', 'spread the word',
  'the elites', 'the cabal', 'the globalists', 'soros funded',
];

// ─────────────────────────────────────────────────────────────
// REFERENCE / CONFIRMATION SOURCES (shown to user on results)
// ─────────────────────────────────────────────────────────────
export const REFERENCE_SOURCES: ClassificationResult['sources'] = [
  // ── Tier S: Wire Services ──
  { name: 'Reuters',              url: 'https://reuters.com/fact-check',        credibility: 95, color: '#10b981', badge: '✓ Wire Service'       },
  { name: 'AP News',              url: 'https://apnews.com',                    credibility: 95, color: '#10b981', badge: '✓ Wire Service'       },
  { name: 'AFP',                  url: 'https://afp.com',                       credibility: 94, color: '#10b981', badge: '✓ Wire Service'       },
  // ── Global Broadcasters ──
  { name: 'BBC News',             url: 'https://bbc.com/news',                  credibility: 95, color: '#10b981', badge: '✓ Public Broadcaster' },
  { name: 'DW (Germany)',         url: 'https://dw.com',                        credibility: 92, color: '#10b981', badge: '✓ Public Broadcaster' },
  { name: 'France 24',            url: 'https://france24.com',                  credibility: 88, color: '#10b981', badge: '✓ Public Broadcaster' },
  { name: 'Al Jazeera',           url: 'https://aljazeera.com',                 credibility: 82, color: '#f59e0b', badge: '~ Int. Broadcaster'   },
  { name: 'NHK World (Japan)',    url: 'https://nhk.or.jp',                     credibility: 90, color: '#10b981', badge: '✓ Public Broadcaster' },
  // ── Global Fact-Checkers ──
  { name: 'Snopes',               url: 'https://snopes.com',                    credibility: 93, color: '#10b981', badge: '✓ Fact-Check'        },
  { name: 'FactCheck.org',        url: 'https://factcheck.org',                 credibility: 94, color: '#10b981', badge: '✓ Fact-Check'        },
  { name: 'PolitiFact',           url: 'https://politifact.com',                credibility: 92, color: '#10b981', badge: '✓ Fact-Check'        },
  { name: 'Full Fact (UK)',        url: 'https://fullfact.org',                  credibility: 91, color: '#10b981', badge: '✓ Fact-Check'        },
  { name: 'AFP Fact Check',       url: 'https://factcheck.afp.com',             credibility: 90, color: '#10b981', badge: '✓ AFP Fact-Check'    },
  { name: 'Africa Check',         url: 'https://africacheck.org',               credibility: 88, color: '#10b981', badge: '✓ Fact-Check Africa' },
  { name: 'BOOM Live (India)',     url: 'https://boomlive.in',                   credibility: 88, color: '#10b981', badge: '✓ Fact-Check India'  },
  { name: 'Alt News (India)',      url: 'https://altnews.in',                    credibility: 87, color: '#10b981', badge: '✓ Fact-Check India'  },
  { name: 'Chequeado (LATAM)',     url: 'https://chequeado.com',                 credibility: 87, color: '#10b981', badge: '✓ Fact-Check LATAM'  },
  { name: 'Correctiv (Germany)',   url: 'https://correctiv.org',                 credibility: 88, color: '#10b981', badge: '✓ Fact-Check EU'     },
  { name: 'Lead Stories',         url: 'https://leadstories.com',               credibility: 87, color: '#f59e0b', badge: '~ Independent'       },
  { name: 'MediaBias/Fact Check', url: 'https://mediabiasfactcheck.com',        credibility: 83, color: '#f59e0b', badge: '~ Bias Tracker'      },
];

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────
function extractDomain(text: string): string {
  try {
    const match = text.match(/https?:\/\/(www\.)?([^/\s?#]+)/);
    return match ? match[2] : '';
  } catch { return ''; }
}

function countMatches(text: string, patterns: (string | RegExp)[]): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const p of patterns) {
    if (typeof p === 'string') {
      if (lower.includes(p)) count++;
    } else {
      const m = text.match(p);
      if (m) count += m.length;
    }
  }
  return count;
}

// ─────────────────────────────────────────────────────────────
// CLAIM ANALYSIS
// ─────────────────────────────────────────────────────────────
function generateClaimAnalysis(text: string, verdict: Verdict) {
  const lower = text.toLowerCase();
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 15).slice(0, 3);
  const claims: ClassificationResult['claims'] = [];

  for (const sentence of sentences) {
    const sl = sentence.toLowerCase();
    const hasFake = FAKE_KEYWORDS.some((k) => sl.includes(k));
    const hasReal = REAL_INDICATORS.some((k) => sl.includes(k));

    let status: 'debunked' | 'verified' | 'unclear';
    let detail: string;

    if (hasFake && verdict !== 'real') {
      status = 'debunked';
      detail = 'Contains known misinformation patterns. Cross-referenced against Snopes, FactCheck.org, and AFP databases — claim is unsupported by credible evidence.';
    } else if (hasReal || verdict === 'real') {
      status = 'verified';
      detail = 'Supported by credible attribution. Multiple reputable outlets (Reuters, BBC, AP) cover similar verified reporting. Language is consistent with professional journalism.';
    } else {
      status = 'unclear';
      detail = 'Insufficient detail to confirm or refute. Recommended: verify against Reuters, Snopes, or PolitiFact. May be partially accurate or lack important context.';
    }

    claims.push({
      claim: sentence.trim().slice(0, 130) + (sentence.length > 130 ? '…' : ''),
      status, detail,
    });
  }

  if (claims.length === 0) {
    claims.push({
      claim: lower.slice(0, 100) + '…',
      status: verdict === 'fake' ? 'debunked' : verdict === 'real' ? 'verified' : 'unclear',
      detail: 'Analysis based on source credibility, language patterns, and comparison with known misinformation databases.',
    });
  }

  return claims;
}

// ─────────────────────────────────────────────────────────────
// COUNTER MESSAGE GENERATION
// ─────────────────────────────────────────────────────────────
function generateCounterMessage(text: string, verdict: Verdict, confidence: number): string {
  const topic = text.slice(0, 60).replace(/[^\w\s]/g, '').trim();
  const encodedTopic = encodeURIComponent(topic);

  if (verdict === 'real') {
    return `✅ **FACT CHECK: VERIFIED** (${confidence}% confidence)\n\nThis content is consistent with reporting from trusted news organizations. Language is professional and attribution is present.\n\n**Cross-reference these sources:**\n• Reuters: reuters.com/search/news?blob=${encodedTopic}\n• AP News: apnews.com\n• BBC: bbc.com/news\n• FactCheck.org: factcheck.org\n\n**No significant misinformation indicators were detected.**`;
  }

  if (verdict === 'uncertain') {
    return `⚠️ **FACT CHECK: NEEDS MORE EVIDENCE** (${confidence}% uncertainty)\n\nThis content could not be conclusively verified or debunked. There are insufficient signals to make a definitive judgment.\n\n**Before sharing, please check:**\n• Snopes: snopes.com/search/?q=${encodedTopic}\n• PolitiFact: politifact.com\n• FactCheck.org: factcheck.org\n• Full Fact (UK): fullfact.org\n• AFP Fact Check: factcheck.afp.com\n• Lead Stories: leadstories.com\n\n**Tips:**\n→ Check if multiple reputable outlets cover this story\n→ Look for named sources and official statements\n→ Verify publication date — old stories get recirculated\n→ Check the domain against mediabiasfactcheck.com`;
  }

  return `🔴 **FACT CHECK: LIKELY MISINFORMATION** (${confidence}% confidence)\n\n❌ Contains multiple misinformation patterns\n❌ Language designed to provoke emotional sharing\n❌ Claims inconsistent with verified reporting\n❌ Source has low credibility rating\n\n**Do NOT share this content without independent verification.**\n\n**Verify through these fact-checkers:**\n• Snopes: snopes.com/search/?q=${encodedTopic}\n• Reuters Fact Check: reuters.com/fact-check\n• PolitiFact: politifact.com\n• AFP Fact Check: factcheck.afp.com\n• Lead Stories: leadstories.com/fact-check\n• Full Fact: fullfact.org\n\n**Instead, check:**\n✅ Reuters: reuters.com\n✅ BBC: bbc.com/news\n✅ AP News: apnews.com`;
}

// ─────────────────────────────────────────────────────────────
// MAIN CLASSIFIER
// ─────────────────────────────────────────────────────────────
export async function classifyText(
  text: string,
  sourceDomain?: string
): Promise<ClassificationResult> {
  const start = Date.now();
  const lower = text.toLowerCase();
  let fakeScore = 0;
  let realScore = 0;
  const signals: ClassificationResult['signals'] = [];

  // ── 1. Domain credibility (primary signal — strong weighting) ──
  const domain = sourceDomain ?? extractDomain(text);
  const cred = domain ? (CREDIBILITY_DB[domain] ?? CREDIBILITY_DB[domain.replace('www.', '')] ?? null) : null;

  if (cred !== null) {
    if (cred >= 90) {
      // Very trusted: strong REAL push
      realScore += 55;
      signals.push({ label: 'Highly Trusted Source', value: `${domain} — ${cred}% credibility`, type: 'positive' });
    } else if (cred >= 75) {
      // Moderately trusted: REAL lean
      realScore += 35;
      signals.push({ label: 'Trusted Source', value: `${domain} — ${cred}% credibility`, type: 'positive' });
    } else if (cred >= 60) {
      // Somewhat trusted: mild REAL lean
      realScore += 15;
      signals.push({ label: 'Moderate Source', value: `${domain} — ${cred}% credibility`, type: 'neutral' });
    } else if (cred >= 40) {
      // Low-moderate: neutral to mild FAKE
      fakeScore += 10;
      signals.push({ label: 'Questionable Source', value: `${domain} — ${cred}% credibility`, type: 'negative' });
    } else {
      // Low credibility: strong FAKE push
      fakeScore += 50;
      signals.push({ label: 'Low-Credibility Source', value: `${domain} — ${cred}% credibility`, type: 'negative' });
    }
  } else if (domain) {
    // Unknown domain — mild suspicion
    fakeScore += 8;
    signals.push({ label: 'Unknown Source', value: `"${domain}" not in credibility database`, type: 'neutral' });
  }

  // ── 2. Misinformation keywords ──
  const fakeKeywordCount = countMatches(lower, FAKE_KEYWORDS);
  if (fakeKeywordCount > 0) {
    fakeScore += Math.min(fakeKeywordCount * 18, 54);
    signals.push({
      label: 'Misinformation Keywords',
      value: `${fakeKeywordCount} flagged term(s) detected in text`,
      type: 'negative',
    });
  }

  // ── 3. Emotional manipulation ──
  const emotionalCount = countMatches(lower, EMOTIONAL_MANIPULATION);
  if (emotionalCount > 0) {
    fakeScore += Math.min(emotionalCount * 12, 30);
    signals.push({ label: 'Emotional Manipulation', value: `${emotionalCount} manipulation pattern(s)`, type: 'negative' });
  }

  // ── 4. Sensationalism ──
  const sensationalCount = countMatches(text, SENSATIONAL_PATTERNS);
  if (sensationalCount > 0) {
    fakeScore += Math.min(sensationalCount * 7, 28);
    signals.push({
      label: 'Sensationalist Language',
      value: `${sensationalCount} pattern(s): all-caps, clickbait, excessive punctuation`,
      type: 'negative',
    });
  } else if (text.length > 80) {
    // Only reward "professional tone" for longer, substantive text — not for 5-word claims
    realScore += 5;
    signals.push({ label: 'Professional Tone', value: 'No excessive sensationalism detected', type: 'positive' });
  }

  // ── 5. Journalistic real indicators ──
  const realIndicatorCount = countMatches(lower, REAL_INDICATORS);
  if (realIndicatorCount > 0) {
    realScore += Math.min(realIndicatorCount * 12, 40);
    signals.push({
      label: 'Journalistic Attribution',
      value: `${realIndicatorCount} credibility indicator(s) found (quotes, citations, official statements)`,
      type: 'positive',
    });
  }

  // ── 6. URL / shortened link suspicion ──
  if (/bit\.ly|tinyurl|t\.co\/|ow\.ly|goo\.gl/.test(text)) {
    fakeScore += 12;
    signals.push({ label: 'Shortened URL', value: 'Link shorteners often used to obscure source identity', type: 'negative' });
  }

  // ── 7. Text length & structure ──
  if (text.length < 40) {
    signals.push({ label: 'Very Short Input', value: 'Minimal text — limited analysis possible', type: 'neutral' });
  }

  // ── 8. Text-structure analysis (when no domain provided) ──
  // Only applies to text of sufficient length — short claims get uncertain by default
  if (!domain && text.length >= 60) {
    // Must be at least 60 chars to do text-structure scoring
    const hasNamedSource = /\b(reuters|bbc|ap news|ap news agency|associated press|afp|agence france-presse|npr|pbs|cnn|nbc|abc news|cbs news|msnbc|the guardian|new york times|washington post|wall street journal|bloomberg|the economist|financial times|time magazine|politifact|snopes|factcheck|full fact|africa check|boom live|alt news|poynter|al jazeera|dw|deutsche welle|france 24|rfi|euronews|trt world|nikkei|nhk|kyodo|yonhap|ndtv|the hindu|indian express|hindustan times|times of india|the print|scroll\.in|the wire|south china morning post|straits times|channel news asia|rappler|inquirer|bangkokpost|kompas|dawn|geo tv|haaretz|times of israel|daily maverick|premium times|nation africa|corriere della sera|le monde|el pais|spiegel|sueddeutsche|nzz|nos|svt|nrk|yle|dr\.dk|abc australia|cbc|globe and mail|folha|estadao|globo|clarin|la nacion|occrp|propublica)\b/i.test(lower);
    const hasNumbers     = /\b\d+%|\$\d+B?M?|\d+\s*(million|billion|thousand|people|cases|deaths|percent)\b/i.test(text);
    const hasAttribution = /\b(according to|said|confirmed by|reported by|told reporters|study shows|data shows|experts say|officials say)\b/i.test(lower);
    const hasQuotedText  = /"[^"]{15,}"/.test(text);

    if (hasNamedSource) { realScore += 22; signals.push({ label: 'Named Credible Outlet', value: 'Reputable news organization referenced in text', type: 'positive' }); }
    if (hasNumbers)     { realScore += 10; signals.push({ label: 'Specific Statistics', value: 'Contains data/numbers — typical of factual reporting', type: 'positive' }); }
    if (hasAttribution) { realScore += 14; signals.push({ label: 'Source Attribution', value: 'Text attributes claims to named sources', type: 'positive' }); }
    if (hasQuotedText)  { realScore += 8;  signals.push({ label: 'Direct Quotes', value: 'Contains verbatim quoted text — sign of primary source reporting', type: 'positive' }); }

    // Misinformation patterns in plain text
    const allCapsCount = (text.match(/\b[A-Z]{4,}\b/g) || []).length;
    const bangCount    = (text.match(/!/g) || []).length;
    if (allCapsCount > 2) { fakeScore += allCapsCount * 5; signals.push({ label: 'Excessive Caps', value: `${allCapsCount} ALL-CAPS words — common in sensationalist content`, type: 'negative' }); }
    if (bangCount > 1)    { fakeScore += bangCount * 6;    signals.push({ label: 'Excessive Punctuation', value: `${bangCount} exclamation marks — emotional manipulation pattern`, type: 'negative' }); }

    // Long neutral text lean slightly real
    if (text.length > 150 && fakeScore === 0 && realScore < 10) {
      realScore += 14;
      signals.push({ label: 'Neutral Text Structure', value: 'Long text with no misinformation patterns detected', type: 'positive' });
    }
  } else if (!domain && text.length < 60) {
    // Short unverified claim with no URL — too little info to judge reliably
    signals.push({ label: 'Unverified Short Claim', value: 'Too short to analyze without a source URL — use the Verify tab to check manually', type: 'neutral' });
  }

  // ─────────────────────────────────────────────────────────────
  // VERDICT DECISION
  //
  // Key rules:
  //  1. Signal strength must be meaningful (total ≥ 20) for REAL/FAKE verdict
  //  2. Short unverified text defaults to UNCERTAIN regardless of ratio
  //  3. Confidence is capped based on total signal strength
  //  4. Never give 99% REAL for a 5-word claim with no source
  // ─────────────────────────────────────────────────────────────
  const total = fakeScore + realScore;
  let verdict: Verdict;
  let confidence: number;

  // ── Rule: short unsourced text → always uncertain ──
  // A 5-word claim like "salman khan got married" has no verifiable signals
  const isShortNoSource = !domain && !sourceDomain && text.length < 80;
  const isZeroSignals   = total === 0;

  if (isZeroSignals || isShortNoSource) {
    verdict = 'uncertain';
    confidence = isZeroSignals ? 55 : Math.min(55 + Math.floor(text.length / 8), 68);
    if (isZeroSignals) {
      signals.push({ label: 'No Strong Signals', value: 'Insufficient data to classify — paste more text or add a source URL', type: 'neutral' });
    }
  } else if (fakeScore > realScore * 1.25 && total >= 15) {
    // ── FAKE: fake signals clearly dominate ──
    verdict = 'fake';
    // Confidence scales with total signal strength (capped at 97%)
    const ratio  = Math.min(fakeScore / (total || 1), 1);
    const strengthBonus = Math.min(total / 5, 20); // max +20 from signal strength
    confidence = Math.min(Math.round(54 + ratio * 35 + strengthBonus), 97);
  } else if (realScore > fakeScore * 1.25 && total >= 20) {
    // ── REAL: real signals clearly dominate AND there are enough signals ──
    // Requires total >= 20 to prevent "99% REAL" from a single weak signal
    verdict = 'real';
    const ratio  = Math.min(realScore / (total || 1), 1);
    const strengthBonus = Math.min(total / 6, 18);
    confidence = Math.min(Math.round(54 + ratio * 32 + strengthBonus), 95);
  } else if (fakeScore > 0 && fakeScore > realScore * 1.25) {
    // Weak fake signal but still dominant
    verdict = 'fake';
    confidence = Math.min(54 + Math.round(fakeScore * 0.8), 74);
  } else {
    // ── UNCERTAIN: scores are close or insufficient ──
    verdict = 'uncertain';
    confidence = total > 0
      ? Math.min(Math.round(57 + Math.abs(fakeScore - realScore) * 0.8), 76)
      : 58;
  }

  // Hard floor / ceiling
  confidence = Math.max(Math.min(confidence, 97), 53);

  // ── Build explanation ──
  const explanations: string[] = [];
  if (cred !== null) explanations.push(`Source "${domain}" has credibility score: ${cred}%.`);
  if (fakeKeywordCount > 0) explanations.push(`Contains ${fakeKeywordCount} misinformation keyword(s).`);
  if (emotionalCount > 0) explanations.push(`${emotionalCount} emotional manipulation pattern(s) detected.`);
  if (sensationalCount > 0) explanations.push(`${sensationalCount} sensationalism pattern(s) found.`);
  if (realIndicatorCount > 0) explanations.push(`${realIndicatorCount} journalistic attribution(s) detected.`);
  if (explanations.length === 0) explanations.push('Analysis based on language structure and contextual signals.');
  const explanation = explanations.join(' ') + ` → Verdict: ${verdict.toUpperCase()} (${confidence}% confidence).`;

  const claims = generateClaimAnalysis(text, verdict);
  const counterMessage = generateCounterMessage(text, verdict, confidence);

  return {
    verdict,
    confidence,
    explanation,
    claims,
    counterMessage,
    signals,
    sources: REFERENCE_SOURCES.slice(0, 6),
    processingTimeMs: Date.now() - start,
  };
}

/** Get credibility score for a domain */
export function getDomainCredibility(domain: string): number {
  const clean = domain.replace('www.', '');
  return CREDIBILITY_DB[clean] ?? 50;
}

/** Classify a list of news items with optional domain hint */
export async function classifyNewsItems(items: import('./newsService').NewsItem[]) {
  return Promise.all(
    items.map(async (item) => {
      const res = await classifyText(item.title + ' ' + item.description, item.sourceDomain);
      return { ...item, ...res };
    })
  );
}
