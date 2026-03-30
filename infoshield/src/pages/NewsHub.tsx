import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, TrendingUp, Filter, ChevronDown, CheckCircle, XCircle, AlertCircle, BookOpen, ExternalLink } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import RefreshStatusBar from '../components/ui/RefreshStatusBar';
import { useAutoRefresh } from '../hooks/useAutoRefresh';

type Verdict = 'REAL' | 'FAKE' | 'UNVERIFIED';
interface NewsItem { id: string; headline: string; source: string; sourceLogo: string; verdict: Verdict; confidence: number; region?: string; language?: string; timestamp: string; tags: string[]; }

const globalNews: NewsItem[] = [
  { id: 'g1', headline: 'WHO confirms no new pandemic-level outbreak in Southeast Asia despite viral claims', source: 'Reuters', sourceLogo: '📰', verdict: 'REAL', confidence: 96, timestamp: '2h ago', tags: ['Health', 'Global'] },
  { id: 'g2', headline: 'Viral: "5G towers causing bird deaths worldwide" — debunked by ornithologists', source: 'AP News', sourceLogo: '📡', verdict: 'FAKE', confidence: 91, timestamp: '4h ago', tags: ['Technology', 'Science'] },
  { id: 'g3', headline: 'UN Security Council adopts new AI governance resolution — full text released', source: 'UN News', sourceLogo: '🌐', verdict: 'REAL', confidence: 99, timestamp: '6h ago', tags: ['AI', 'Policy'] },
  { id: 'g4', headline: 'Claim: "Moon landing footage recently altered by NASA" spreading on Telegram', source: 'AFP Fact Check', sourceLogo: '🔍', verdict: 'FAKE', confidence: 98, timestamp: '8h ago', tags: ['Space', 'Conspiracy'] },
  { id: 'g5', headline: 'Global inflation projections revised — IMF releases Q1 2026 report', source: 'IMF', sourceLogo: '💹', verdict: 'REAL', confidence: 95, timestamp: '10h ago', tags: ['Economy'] },
  { id: 'g6', headline: 'Unverified "alien signal" from James Webb telescope circulating on X', source: 'NASA Watch', sourceLogo: '🔭', verdict: 'UNVERIFIED', confidence: 52, timestamp: '1h ago', tags: ['Space'] },
];

const indiaNews: NewsItem[] = [
  { id: 'i1',  headline: 'PM launches ₹2 lakh crore Rural Infrastructure mission — PIB official statement', source: 'PIB India', sourceLogo: '🏛️', verdict: 'REAL', confidence: 99, timestamp: '1h ago', tags: ['Government', 'Infrastructure'], language: 'English' },
  { id: 'i2',  headline: 'Viral: "India GDP overtook Germany" — partial truth, PPP basis only', source: 'The Hindu', sourceLogo: '📖', verdict: 'UNVERIFIED', confidence: 61, timestamp: '3h ago', tags: ['Economy'], language: 'English' },
  { id: 'i3',  headline: 'False: "New Education Policy cancels 2026 board exams" — MEA clarification', source: 'Indian Express', sourceLogo: '📰', verdict: 'FAKE', confidence: 93, timestamp: '5h ago', tags: ['Education'], language: 'English' },
  { id: 'i4',  headline: 'ISRO confirms Gaganyaan crew module recovery test successful', source: 'NDTV', sourceLogo: '📺', verdict: 'REAL', confidence: 97, timestamp: '7h ago', tags: ['Space', 'ISRO'], language: 'English' },
  { id: 'i5',  headline: 'Misleading: "India bans all Chinese apps permanently" — only specific apps restricted', source: 'Times of India', sourceLogo: '🗞️', verdict: 'FAKE', confidence: 87, timestamp: '9h ago', tags: ['Technology'], language: 'English' },
  { id: 'i6',  headline: 'RBI announces UPI transaction limit upgrade to ₹5 lakh for select categories', source: 'Economic Times', sourceLogo: '💹', verdict: 'REAL', confidence: 94, timestamp: '11h ago', tags: ['Finance'], language: 'English' },
  { id: 'i7',  headline: 'Hindustan Times: India overtakes Japan in number of internet users — TRAI report confirmed', source: 'Hindustan Times', sourceLogo: '🗞️', verdict: 'REAL', confidence: 96, timestamp: '13h ago', tags: ['Technology'], language: 'English' },
  { id: 'i8',  headline: 'Dainik Bhaskar: WhatsApp forward claiming new ₹500 note has RFID chip — fact check debunks', source: 'Dainik Bhaskar', sourceLogo: '🇮🇳', verdict: 'FAKE', confidence: 95, timestamp: '14h ago', tags: ['Finance', 'Fact Check'], language: 'Hindi' },
  { id: 'i9',  headline: 'Dainik Jagran: NEET परीक्षा को लेकर वायरल संदेश — सरकार ने किया खंडन', source: 'Dainik Jagran', sourceLogo: '📜', verdict: 'FAKE', confidence: 91, timestamp: '16h ago', tags: ['Education'], language: 'Hindi' },
  { id: 'i10', headline: 'Amar Ujala: AI-generated deepfake of UP CM goes viral — Lucknow Police issues clarification', source: 'Amar Ujala', sourceLogo: '🌅', verdict: 'FAKE', confidence: 98, timestamp: '18h ago', tags: ['AI', 'Politics'], language: 'Hindi' },
  { id: 'i11', headline: 'The Wire: Farmers protest update — Centre assures MSP committee report by May 2026', source: 'The Wire', sourceLogo: '🔗', verdict: 'REAL', confidence: 88, timestamp: '20h ago', tags: ['Agriculture'], language: 'English' },
  { id: 'i12', headline: 'Scroll.in: Manipur clashes — viral video from 2023 being reshared as recent incident', source: 'Scroll.in', sourceLogo: '📜', verdict: 'FAKE', confidence: 93, timestamp: '22h ago', tags: ['Law & Order'], language: 'English' },
];

const stateNewsMap: Record<string, NewsItem[]> = {
  'Jharkhand': [
    { id: 'jh1', headline: 'Fake circular about Jharkhand free laptop scheme goes viral on WhatsApp', source: 'Prabhat Khabar', sourceLogo: '📱', verdict: 'FAKE', confidence: 89, timestamp: '2h ago', tags: ['Education'], language: 'Hindi', region: 'East India' },
    { id: 'jh2', headline: 'Hemant Soren launches new tribal welfare scheme — official gazette notification', source: 'Ranchi Express', sourceLogo: '🏛️', verdict: 'REAL', confidence: 96, timestamp: '5h ago', tags: ['Government'], language: 'Hindi', region: 'East India' },
    { id: 'jh3', headline: 'Dhanbad mining accident: unverified casualty figures spreading on social media', source: 'Jharkhand Mirror', sourceLogo: '⚠️', verdict: 'UNVERIFIED', confidence: 44, timestamp: '1h ago', tags: ['Safety'], language: 'Hindi', region: 'East India' },
  ],
  'Maharashtra': [
    { id: 'mh1', headline: 'Mumbai Metro Line 3 extension approval — MMRDA official press release', source: 'Mumbai Mirror', sourceLogo: '🚇', verdict: 'REAL', confidence: 98, timestamp: '3h ago', tags: ['Infrastructure'], language: 'English', region: 'West India' },
    { id: 'mh2', headline: 'Viral: "Pune flooding due to dam breach" — no breach confirmed by NDRF', source: 'Maharashtra Times', sourceLogo: '💧', verdict: 'FAKE', confidence: 91, timestamp: '6h ago', tags: ['Disaster'], language: 'Marathi', region: 'West India' },
  ],
  'Delhi': [
    { id: 'dl1', headline: 'Delhi AQI enters "Good" zone for first time in 3 years — CPCB data', source: 'Hindustan Times', sourceLogo: '🌬️', verdict: 'REAL', confidence: 97, timestamp: '2h ago', tags: ['Environment'], language: 'English', region: 'North India' },
    { id: 'dl2', headline: 'False: "Delhi CM announces complete property tax waiver" — partial only', source: 'Delhi Times', sourceLogo: '🏠', verdict: 'FAKE', confidence: 88, timestamp: '7h ago', tags: ['Finance'], language: 'Hindi', region: 'North India' },
  ],
  'Tamil Nadu': [
    { id: 'tn1', headline: 'Chennai Metro Phase 2 inauguration confirmed by CM — official gazette', source: 'The Hindu', sourceLogo: '🚇', verdict: 'REAL', confidence: 99, timestamp: '4h ago', tags: ['Infrastructure'], language: 'Tamil', region: 'South India' },
  ],
  'West Bengal': [
    { id: 'wb1', headline: 'Kolkata clocks 32°C in March — IMD confirms early summer trend', source: 'Telegraph India', sourceLogo: '🌡️', verdict: 'REAL', confidence: 95, timestamp: '1h ago', tags: ['Weather'], language: 'Bengali', region: 'East India' },
    { id: 'wb2', headline: 'WhatsApp: "Howrah bridge closed 3 months" — no such order issued', source: 'Anandabazar', sourceLogo: '🌉', verdict: 'FAKE', confidence: 92, timestamp: '5h ago', tags: ['Infrastructure'], language: 'Bengali', region: 'East India' },
  ],
  'Gujarat': [
    { id: 'gj1', headline: 'Claim: "Gujarat policy bans MSMEs" — MSMEs actually get tax breaks', source: 'Divya Bhaskar', sourceLogo: '📰', verdict: 'FAKE', confidence: 90, timestamp: '3h ago', tags: ['Economy'], language: 'Gujarati', region: 'West India' },
  ],
  'Kerala': [
    { id: 'kl1', headline: 'Kerala achieves 100% broadband in all panchayats — K-FONE report', source: 'Mathrubhumi', sourceLogo: '📡', verdict: 'REAL', confidence: 98, timestamp: '2h ago', tags: ['Technology'], language: 'Malayalam', region: 'South India' },
  ],
};

const allStates = ['Jharkhand', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'West Bengal', 'Gujarat', 'Kerala', 'Karnataka', 'Rajasthan', 'Uttar Pradesh', 'Bihar', 'Odisha', 'Assam', 'Punjab', 'Haryana'];
type Tab = 'global' | 'india' | 'state' | 'archive';

function VerdictBadge({ verdict, confidence }: { verdict: Verdict; confidence: number }) {
  if (verdict === 'REAL') return <span className="badge-real text-xs"><CheckCircle className="w-3 h-3" />{confidence}% REAL</span>;
  if (verdict === 'FAKE') return <span className="badge-fake text-xs"><XCircle className="w-3 h-3" />{confidence}% FAKE</span>;
  return <span className="badge-uncertain text-xs"><AlertCircle className="w-3 h-3" />{confidence}% UNVERIFIED</span>;
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="glass-card hover:border-primary/30 group">
      <div className="flex items-start gap-3">
        <div className="text-2xl flex-shrink-0">{item.sourceLogo}</div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">{item.headline}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-xs text-slate-500">{item.source}</span>
            <span className="text-slate-700">·</span>
            <span className="text-xs text-slate-600">{item.timestamp}</span>
            {item.language && <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">{item.language}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <VerdictBadge verdict={item.verdict} confidence={item.confidence} />
            {item.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary/70 border border-primary/20">{t}</span>)}
          </div>
        </div>
        <button className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"><ExternalLink className="w-3.5 h-3.5 text-slate-400" /></button>
      </div>
    </motion.div>
  );
}

function StatsBar({ news }: { news: NewsItem[] }) {
  const real = news.filter((n) => n.verdict === 'REAL').length;
  const fake = news.filter((n) => n.verdict === 'FAKE').length;
  const unv = news.filter((n) => n.verdict === 'UNVERIFIED').length;
  const tot = news.length || 1;
  return (
    <div className="glass-card mb-4">
      <div className="flex items-center gap-4 mb-3"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-sm font-semibold text-white">Classification Breakdown</span><span className="ml-auto text-xs text-slate-500">{tot} articles</span></div>
      <div className="flex gap-1 h-3 rounded-full overflow-hidden mb-2">
        <motion.div initial={{ width: 0 }} animate={{ width: `${(real / tot) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 }} className="h-full" style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${(fake / tot) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} className="h-full" style={{ background: 'linear-gradient(90deg, #ef4444, #f87171)' }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${(unv / tot) * 100}%` }} transition={{ duration: 0.8, delay: 0.4 }} className="h-full" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
      </div>
      <div className="flex gap-4 text-xs"><span className="text-green-400">✓ {real} Real</span><span className="text-red-400">✗ {fake} Fake</span><span className="text-yellow-400">? {unv} Unverified</span></div>
    </div>
  );
}

export default function NewsHub() {
  const [activeTab, setActiveTab] = useState<Tab>('global');
  const [selectedState, setSelectedState] = useState('Jharkhand');
  const [stateDropOpen, setStateDropOpen] = useState(false);
  const [langFilter, setLangFilter] = useState<string | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');
  const tabs = [
    { id: 'global'  as Tab, emoji: '🌐', label: 'Global News'    },
    { id: 'india'   as Tab, emoji: '🇮🇳', label: 'India National' },
    { id: 'state'   as Tab, emoji: '🏙️', label: 'State-wise'     },
    { id: 'archive' as Tab, emoji: '📚', label: 'Archive'        },
  ];
  // Archive of historical misinformation events
  const archiveNews: NewsItem[] = [
    { id: 'a1',  headline: 'COVID-19 vaccine microchip myth debunked — traced to manipulated Bill Gates interview (2021)', source: 'WHO / Snopes', sourceLogo: '📋', verdict: 'FAKE', confidence: 99, timestamp: 'Jun 2021', tags: ['Health', 'COVID'] },
    { id: 'a2',  headline: '2020 US Election fraud claims — all 62 court cases dismissed or rejected', source: 'AP News', sourceLogo: '📡', verdict: 'FAKE', confidence: 98, timestamp: 'Nov 2020', tags: ['Politics', 'USA'] },
    { id: 'a3',  headline: 'India CAA 2019-20 protests: 200+ fake images and videos documented by Alt News', source: 'Alt News', sourceLogo: '🔍', verdict: 'FAKE', confidence: 96, timestamp: 'Jan 2020', tags: ['India', 'Law'] },
    { id: 'a4',  headline: 'Russia-Ukraine war 2022: Video game footage and 2008 Georgia war clips shared as Ukraine battle', source: 'BBC Verify', sourceLogo: '📺', verdict: 'FAKE', confidence: 97, timestamp: 'Mar 2022', tags: ['World', 'War'] },
    { id: 'a5',  headline: 'Demonetisation 2016: "New ₹2000 note has GPS chip" — Reserve Bank of India denial', source: 'RBI / Snopes', sourceLogo: '🏦', verdict: 'FAKE', confidence: 99, timestamp: 'Nov 2016', tags: ['India', 'Finance'] },
    { id: 'a6',  headline: 'Tablighi Jamaat COVID blame 2020: Targeted misinformation wave documented', source: 'The Wire', sourceLogo: '🔗', verdict: 'FAKE', confidence: 94, timestamp: 'Apr 2020', tags: ['India', 'Health'] },
    { id: 'a7',  headline: 'Pulwama attack 2019: 200+ fake images and videos misattributed to the incident', source: 'Alt News', sourceLogo: '🔍', verdict: 'FAKE', confidence: 98, timestamp: 'Feb 2019', tags: ['India', 'Security'] },
    { id: 'a8',  headline: 'Deepfake Bill Gates/Musk crypto scam videos removed from major platforms (2023)', source: 'Snopes', sourceLogo: '📋', verdict: 'FAKE', confidence: 99, timestamp: 'Mar 2023', tags: ['Technology', 'Crypto'] },
    { id: 'a9',  headline: 'Israel-Hamas October 2023: AI-generated images tracked across Twitter, Facebook and Telegram', source: 'Reuters Fact Check', sourceLogo: '📡', verdict: 'FAKE', confidence: 97, timestamp: 'Oct 2023', tags: ['World', 'AI'] },
    { id: 'a10', headline: 'Balakot airstrike 2019: Casualty claims debunked — zero confirmed deaths by satellite imagery', source: 'BBC Verify', sourceLogo: '📺', verdict: 'UNVERIFIED', confidence: 68, timestamp: 'Feb 2019', tags: ['India', 'Security'] },
    { id: 'a11', headline: 'Doklam standoff 2017: Fabricated military casualty figures on WhatsApp fact-checked', source: 'The Hindu', sourceLogo: '📖', verdict: 'FAKE', confidence: 92, timestamp: 'Aug 2017', tags: ['India', 'China'] },
    { id: 'a12', headline: 'Bihar floods 2019: 50+ viral images actually from Bangladesh, Kerala and Texas Hurricane Harvey', source: 'Boom Live', sourceLogo: '💡', verdict: 'FAKE', confidence: 95, timestamp: 'Jul 2019', tags: ['India', 'Disaster'] },
  ];
  const filteredArchive = archiveSearch.trim()
    ? archiveNews.filter((n) =>
        n.headline.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        n.tags.some((t) => t.toLowerCase().includes(archiveSearch.toLowerCase())) ||
        n.source.toLowerCase().includes(archiveSearch.toLowerCase())
      )
    : archiveNews;
  const stateNews = (stateNewsMap[selectedState] ?? []).filter((n) => !langFilter || n.language === langFilter);
  const stateLangs = [...new Set((stateNewsMap[selectedState] ?? []).map((n) => n.language!).filter(Boolean))];

  // Lightweight auto-refresh: NewsHub static tabs update their timestamps every 5 min.
  // When connected to live sources this would refetch news data too.
  const refreshCallback = useCallback(async () => {
    // Minimal delay to simulate background check
    await new Promise((r) => setTimeout(r, 300));
  }, []);
  const { secondsLeft, isRefreshing, lastRefreshed, forceRefresh } = useAutoRefresh(refreshCallback);

  return (
    <AppLayout title="News Intelligence Hub" subtitle="AI-powered misinformation detection across global &amp; Indian news">
        {/* Auto-refresh status bar */}
        <RefreshStatusBar
          secondsLeft={secondsLeft}
          isRefreshing={isRefreshing}
          lastRefreshed={lastRefreshed}
          onRefreshNow={forceRefresh}
          statusLabel="Refreshing news intelligence data…"
        />

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent-purple/30 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
            <div><h1 className="text-2xl font-bold font-display text-white">News Intelligence Hub</h1><p className="text-slate-400 text-sm">AI-powered misinformation detection across global &amp; Indian news</p></div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 glass rounded-xl overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button key={tab.id} id={`tab-${tab.id}`} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'bg-primary text-dark' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <span>{tab.emoji}</span>{tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'global' && (
            <motion.div key="global" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <StatsBar news={globalNews} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{globalNews.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}</div>
            </motion.div>
          )}
          {activeTab === 'india' && (
            <motion.div key="india" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-wrap gap-2 mb-4">
                {['PIB India 🏛️', 'NDTV 📺', 'The Hindu 📖', 'Indian Express 📰', 'TOI 🗞️', 'Hindustan Times 🗞️', 'Dainik Bhaskar 🇮🇳', 'Dainik Jagran 📜', 'Amar Ujala 🌅', 'The Wire 🔗'].map((s) => (
                  <span key={s} className="px-3 py-1.5 rounded-full glass text-xs text-slate-300 border border-green-500/20 flex items-center gap-1.5"><CheckCircle className="w-3 h-3 text-green-400" />{s}</span>
                ))}
              </div>
              <StatsBar news={indiaNews} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{indiaNews.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}</div>
            </motion.div>
          )}
          {activeTab === 'state' && (
            <motion.div key="state" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="flex flex-wrap gap-3 mb-5">
                <div className="relative">
                  <button id="state-dropdown-btn" onClick={() => setStateDropOpen((o) => !o)}
                    className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-sm text-white border border-white/10 hover:border-primary/30 transition-all">
                    <MapPin className="w-4 h-4 text-primary" />{selectedState}<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${stateDropOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {stateDropOpen && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="absolute top-full mt-2 left-0 z-50 glass-dark border border-white/10 rounded-xl overflow-hidden shadow-2xl w-52 max-h-64 overflow-y-auto">
                        {allStates.map((s) => (
                          <button key={s} onClick={() => { setSelectedState(s); setStateDropOpen(false); setLangFilter(null); }}
                            className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${s === selectedState ? 'bg-primary/20 text-primary' : 'text-slate-300 hover:bg-white/5'} ${!stateNewsMap[s] ? 'opacity-40' : ''}`}>
                            {s} {!stateNewsMap[s] && '(no data)'}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <button onClick={() => setLangFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${!langFilter ? 'bg-primary/20 text-primary border border-primary/30' : 'text-slate-400 hover:text-white'}`}>All</button>
                  {stateLangs.map((l) => <button key={l} onClick={() => setLangFilter(l === langFilter ? null : l)} className={`px-3 py-1.5 rounded-lg text-xs transition-all ${langFilter === l ? 'bg-primary/20 text-primary border border-primary/30' : 'text-slate-400 hover:text-white'}`}>{l}</button>)}
                </div>
              </div>
              <StatsBar news={stateNews} />
              {stateNews.length > 0
                ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{stateNews.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}</div>
                : <div className="glass-card text-center py-12"><MapPin className="w-10 h-10 text-slate-600 mx-auto mb-3" /><p className="text-slate-500">No data for <strong className="text-slate-300">{selectedState}</strong></p></div>}
            </motion.div>
          )}
          {activeTab === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="glass-card mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">📚</span>
                    <span className="font-semibold text-white text-sm">Historical Misinformation Archive</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">Search documented misinformation events from 2016–2024 — COVID, Pulwama, Demonetisation, Elections and more.</p>
                </div>
                <input
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="Search: Pulwama, COVID, CAA, Demonetisation…"
                  className="input-glass py-2 text-sm w-full sm:w-72 flex-shrink-0"
                />
              </div>
              <StatsBar news={filteredArchive} />
              {filteredArchive.length > 0
                ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filteredArchive.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)}</div>
                : <div className="glass-card text-center py-12">
                    <span className="text-4xl mb-3 block">🔎</span>
                    <p className="text-slate-500">No archive results for <strong className="text-slate-300">&quot;{archiveSearch}&quot;</strong></p>
                    <p className="text-xs text-slate-600 mt-1">Try: Pulwama, CAA, COVID, Demonetisation, Doklam, Bihar floods</p>
                  </div>
              }
            </motion.div>
          )}
        </AnimatePresence>
    </AppLayout>
  );
}
