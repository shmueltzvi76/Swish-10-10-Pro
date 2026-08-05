import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Target, Plus, TrendingUp, Trophy, Flame, Settings, Trash2, Edit3, ChevronDown, BarChart2, X, Filter, Activity, Sparkles, ArrowUp, ArrowDown, Minus, BookOpen, ArrowRight, FileText, Download, Upload, Dumbbell, Code2, Phone, Mail } from 'lucide-react';

import { getTrend } from './utils/trend';
import {
  TREND_COLORS,
  STORAGE_DATA_KEY,
  STORAGE_SETTINGS_KEY,
  STORAGE_ONBOARDED_KEY,
  STORAGE_SETTINGS_SEEN_KEY,
  STORAGE_SPOTS_KEY,
  STORAGE_SPOTS_HINT_SEEN_KEY,
  STORAGE_DIFFICULTY_HINT_SEEN_KEY,
  STORAGE_COURT_VIEW_KEY,
  DIFFICULTY_MODIFIERS,
  DEMO_SESSIONS,
  INITIAL_SESSION
} from './data/constants';
import { DEFAULT_SPOTS, GROUP_ORDER, suggestSpotName, suggestSpotGroup, nextCustomSpotId } from './data/spots';

import CustomDropdown from './components/CustomDropdown';
import HybridInput from './components/HybridInput';
import RichTextEditor from './components/RichTextEditor';
import SmartLineChart from './components/SmartLineChart';
import TrendArrow from './components/TrendArrow';
import CourtView from './components/CourtView';
import DifficultyChips from './components/DifficultyChips';

// טוען את המצב ההתחלתי (אימונים, הגדרות, האם להציג דמה) פעם אחת בלבד, באופן סינכרוני,
// לפני הרינדור הראשון - כדי שהמסך הראשון שהמשתמש רואה כבר יהיה הנכון, בלי הבזק ריק שקופץ
// לתוכן האמיתי רגע אחרי (מה שגרם לתחושת פתיחה "לא חלקה").
let cachedInitialLoad = null;
const loadInitialState = () => {
  if (cachedInitialLoad) return cachedInitialLoad;

  const savedData = localStorage.getItem(STORAGE_DATA_KEY);
  const savedSettingsRaw = localStorage.getItem(STORAGE_SETTINGS_KEY);

  let settings = { targetShots: 10 };
  if (savedSettingsRaw) {
    try {
      const parsedSettings = JSON.parse(savedSettingsRaw);
      if (parsedSettings && Number.isFinite(parsedSettings.targetShots) && parsedSettings.targetShots > 0) {
        settings = parsedSettings;
      }
    } catch {
      // ignore corrupted settings, keep defaults
    }
  }

  let parsedSessions = null;
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      if (Array.isArray(parsed) && parsed.length > 0) parsedSessions = parsed;
    } catch {
      // ignore corrupted data, fall back to initial session
    }
  }

  const onboarded = localStorage.getItem(STORAGE_ONBOARDED_KEY) === 'true';

  // בגרסאות ישנות של האפליקציה (לפני שהיה מצב דגמה אמיתי), טעינה ריקה הייתה שומרת אוטומטית
  // אימון-דוגמה בודד וקבוע (INITIAL_SESSION) כאילו הוא נתון אמיתי. כדי שמשתמשים כאלה עדיין
  // יקבלו את חוויית הדגמה המלאה (ולא רק אימון בודד "אמיתי" למראית עין), מתייחסים למצב הזה
  // בדיוק כמו למי שטרם התחיל בכלל.
  const isLegacyPlaceholderOnly = !!parsedSessions && parsedSessions.length === 1 && parsedSessions[0].id === INITIAL_SESSION.id && !onboarded;

  let sessions;
  let isDemoData = false;

  if (parsedSessions && !isLegacyPlaceholderOnly) {
    // מתקן רטרואקטיבית תאריך שגוי שנשמר בעבר עבור אימון הדוגמה המובנה (מזוהה לפי ה-id הקבוע שלו)
    const fixedSessions = parsedSessions.map(s =>
      s.id === INITIAL_SESSION.id && s.date !== INITIAL_SESSION.date
        ? { ...s, date: INITIAL_SESSION.date }
        : s
    );
    sessions = fixedSessions;
    if (JSON.stringify(fixedSessions) !== JSON.stringify(parsedSessions)) {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(fixedSessions));
    }
    // למי שכבר יש נתונים אמיתיים משמורים (כולל משתמשים ותיקים) - לוודא שלעולם לא יראו מצב דמה בעתיד
    if (!onboarded) localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
  } else if (onboarded) {
    // המשתמש כבר "סיים" את שלב ההיכרות (הזין אימון אמיתי או ניקה נתונים בעבר) - לא מציגים דמה, נשארים ריקים
    sessions = [];
  } else {
    // טעינה ראשונה אי פעם (או רק אימון הדוגמה הישן שנחשב "לא-אמיתי") - מציגים מצב הדגמה
    sessions = DEMO_SESSIONS;
    isDemoData = true;
  }

  cachedInitialLoad = { sessions, settings, isDemoData };
  return cachedInitialLoad;
};

const loadInitialSpots = () => {
  try {
    const raw = localStorage.getItem(STORAGE_SPOTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore corrupted spots, fall back to defaults
  }
  return DEFAULT_SPOTS;
};

export default function App() {
  const mainRef = useRef(null);
  const importInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState('court');
  const [sessions, setSessions] = useState(() => loadInitialState().sessions);
  const [settings, setSettings] = useState(() => loadInitialState().settings);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedSpotDetails, setSelectedSpotDetails] = useState(null);
  const [recordCelebration, setRecordCelebration] = useState(null);
  const [isDemoData, setIsDemoData] = useState(() => loadInitialState().isDemoData);
  const [showSettingsHint, setShowSettingsHint] = useState(() => localStorage.getItem(STORAGE_SETTINGS_SEEN_KEY) !== 'true');

  const [spots, setSpots] = useState(loadInitialSpots);
  const [courtMode, setCourtMode] = useState(() => localStorage.getItem(STORAGE_COURT_VIEW_KEY) === 'full' ? 'full' : 'half');
  const [spotEditMode, setSpotEditMode] = useState(false);
  const [showSpotsEditHint, setShowSpotsEditHint] = useState(() => localStorage.getItem(STORAGE_SPOTS_HINT_SEEN_KEY) !== 'true');

  const [currentDifficulty, setCurrentDifficulty] = useState([]);
  const [showDifficultyHint, setShowDifficultyHint] = useState(() => localStorage.getItem(STORAGE_DIFFICULTY_HINT_SEEN_KEY) !== 'true');

  const [currentInput, setCurrentInput] = useState({});
  const [editingId, setEditingId] = useState(null);

  const [filterMode, setFilterMode] = useState('overall');
  const [filterZone, setFilterZone] = useState(GROUP_ORDER[0]);
  const [filterSpot, setFilterSpot] = useState(spots[0]?.id);

  const [journalSessionId, setJournalSessionId] = useState(null);
  const [expandedZones, setExpandedZones] = useState({});

  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [activeTab, journalSessionId]);

  useEffect(() => {
    if (settings.showJournal !== true && activeTab === 'journal') setActiveTab('court');
  }, [settings.showJournal, activeTab]);

  useEffect(() => {
    // נתוני דמה לעולם לא נשמרים בזיכרון - כדי שברענון הבא עדיין ניחשב "לא התחלתי" ולא "יש לי נתונים אמיתיים"
    if (sessions.length > 0 && !isDemoData) {
      localStorage.setItem(STORAGE_DATA_KEY, JSON.stringify(sessions));
    }
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
  }, [sessions, settings, isDemoData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_COURT_VIEW_KEY, courtMode);
  }, [courtMode]);

  const toggleSpotEditMode = () => {
    setSpotEditMode(prev => !prev);
    if (showSpotsEditHint) {
      setShowSpotsEditHint(false);
      localStorage.setItem(STORAGE_SPOTS_HINT_SEEN_KEY, 'true');
    }
  };

  const handleAddSpot = (x, y) => {
    setSpots(prev => {
      const updated = [...prev, {
        id: nextCustomSpotId(prev),
        name: suggestSpotName(x, y),
        group: suggestSpotGroup(x, y),
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        custom: true
      }];
      localStorage.setItem(STORAGE_SPOTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleRemoveSpot = (spotId) => {
    setSpots(prev => {
      const updated = prev.filter(s => s.id !== spotId);
      localStorage.setItem(STORAGE_SPOTS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleResetSpots = () => {
    if (!window.confirm('לאפס את כל המיקומים המותאמים אישית ולחזור לברירת המחדל?')) return;
    setSpots(DEFAULT_SPOTS);
    localStorage.removeItem(STORAGE_SPOTS_KEY);
  };

  const toggleDifficulty = (id) => {
    setCurrentDifficulty(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
    if (showDifficultyHint) {
      setShowDifficultyHint(false);
      localStorage.setItem(STORAGE_DIFFICULTY_HINT_SEEN_KEY, 'true');
    }
  };

  const saveSession = () => {
    const entries = Object.entries(currentInput).filter(([, v]) => v !== '' && v !== undefined && v !== null);
    if (entries.length === 0) return;
    const cleanedInput = Object.fromEntries(entries);

    if (editingId) {
      const updatedSessions = sessions.map(s =>
        s.id === editingId ? { ...s, data: cleanedInput, difficulty: currentDifficulty } : s
      );
      setSessions(updatedSessions);
    } else {
      const newSession = {
        id: Date.now(),
        date: new Date().toISOString(),
        targetShots: settings.targetShots,
        data: cleanedInput,
        difficulty: currentDifficulty
      };

      if (isDemoData) {
        // האימון האמיתי הראשון שנשמר מוחק את נתוני ההדגמה ומתחיל מעקב אמיתי נקי
        setIsDemoData(false);
        localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
        setSessions([newSession]);
      } else {
        const newPerc = sessionOverallPerc(newSession);
        const priorPercs = sessions.map(sessionOverallPerc).filter(p => p !== null);
        const priorBest = priorPercs.length > 0 ? Math.max(...priorPercs) : null;
        if (newPerc !== null && priorBest !== null && newPerc > priorBest) {
          const ma = sessionMadeAttempts(newSession);
          setRecordCelebration({ perc: newPerc, made: ma.made, total: ma.total });
        }

        setSessions([newSession, ...sessions]);
      }
    }

    setCurrentInput({});
    setEditingId(null);
    setActiveTab('stats');
  };

  const handleInput = (id, val) => {
    setCurrentInput(prev => ({ ...prev, [id]: val }));
  };

  const handleEdit = (session) => {
    setEditingId(session.id);
    setCurrentInput(session.data);
    setCurrentDifficulty(session.difficulty || []);
    setActiveTab('input');
  };

  const handleDelete = (id) => {
    if (window.confirm('האם למחוק אימון זה?')) {
      const filtered = sessions.filter(s => s.id !== id);
      setSessions(filtered);
      if (filtered.length === 0) localStorage.removeItem(STORAGE_DATA_KEY);
      if (editingId === id) {
        setEditingId(null);
        setCurrentInput({});
      }
      if (journalSessionId === id) setJournalSessionId(null);
    }
  };

  const updateSessionNotes = (sessionId, field, html) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== sessionId) return s;
      const notes = s.notes || { general: '', zones: {} };
      if (field === 'general') return { ...s, notes: { ...notes, general: html } };
      return { ...s, notes: { ...notes, zones: { ...(notes.zones || {}), [field]: html } } };
    }));
  };

  const hasNotes = (session) => {
    const notes = session.notes;
    if (!notes) return false;
    const strip = (html) => (html || '').replace(/<[^>]*>/g, '').trim();
    if (strip(notes.general)) return true;
    return Object.values(notes.zones || {}).some(html => strip(html));
  };

  const clearAllData = () => {
    if (window.confirm('אזהרה: כל היסטוריית האימונים תימחק לצמיתות. להמשיך?')) {
      setSessions([]);
      setIsDemoData(false);
      setEditingId(null);
      setCurrentInput({});
      localStorage.removeItem(STORAGE_DATA_KEY);
      localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
      setShowSettingsModal(false);
      setActiveTab('court');
    }
  };

  const exportData = async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      sessions: isDemoData ? [] : sessions,
      settings
    };
    const json = JSON.stringify(payload, null, 2);
    const filename = `swish-pro-10-10-גיבוי-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([json], filename, { type: 'application/json' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'גיבוי Swish-Pro 10/10' });
        return;
      } catch {
        // המשתמש ביטל את השיתוף, או שהשיתוף נכשל בפועל - נופלים חזרה על הורדה רגילה
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const importedSessions = Array.isArray(parsed?.sessions) ? parsed.sessions : (Array.isArray(parsed) ? parsed : null);
        if (!importedSessions || importedSessions.length === 0) {
          window.alert('קובץ לא תקין - לא נמצאו אימונים לייבוא.');
          return;
        }
        const looksValid = importedSessions.every(s => s && typeof s === 'object' && s.data && typeof s.data === 'object' && s.date);
        if (!looksValid) {
          window.alert('קובץ לא תקין - מבנה הנתונים לא מוכר.');
          return;
        }
        if (!window.confirm(`נמצאו ${importedSessions.length} אימונים בקובץ. הייבוא יחליף את כל הנתונים הנוכחיים באפליקציה. להמשיך?`)) return;

        setIsDemoData(false);
        setEditingId(null);
        setCurrentInput({});
        setSessions([...importedSessions].sort((a, b) => new Date(b.date) - new Date(a.date)));
        if (parsed?.settings && Number.isFinite(parsed.settings.targetShots) && parsed.settings.targetShots > 0) {
          setSettings(prev => ({ ...prev, ...parsed.settings }));
        }
        localStorage.setItem(STORAGE_ONBOARDED_KEY, 'true');
        window.alert('הנתונים יובאו בהצלחה!');
      } catch {
        window.alert('קובץ לא תקין - לא ניתן לקרוא אותו כ-JSON.');
      }
    };
    reader.readAsText(file);
  };

  const handleSpotClick = (spotId) => {
    const spot = spots.find(s => s.id === spotId);
    if (!spot) return;
    const session1 = sessions[0];
    const session2 = sessions.length > 1 ? sessions[1] : null;
    const session3 = sessions.length > 2 ? sessions[2] : null;

    const getStats = (session) => {
      if (!session || session.data[spotId] === undefined) return null;
      const made = session.data[spotId];
      const target = session.targetShots;
      return {
        made,
        target,
        perc: target > 0 ? Math.round((made / target) * 100) : 0
      };
    };

    const s1 = getStats(session1);
    const s2 = getStats(session2);
    const s3 = getStats(session3);

    setSelectedSpotDetails({
      name: spot.name,
      s1: s1 ? { ...s1, trend: s2 ? getTrend(s1.perc, s2.perc) : null } : null,
      s2: s2 ? { ...s2, trend: s3 ? getTrend(s2.perc, s3.perc) : null } : null
    });
  };

  const latestSession = sessions[0] || null;
  // "אימון ההשוואה" - האימון שלפני האחרון, משמש לבדיקת "שבירת שיא" (המגרש, כרטיס הסטטיסטיקה, חלוקה לאזורים)
  const comparisonSession = sessions.length > 1 ? sessions[1] : null;
  // כשיוצרים אימון חדש, האימון "הקודם" הוא פשוט האימון האחרון שכבר נשמר (sessions[0]) -
  // הוא עדיין לא כלול במערך sessions באותה נקודה. בעריכת אימון קיים, "הקודם" הוא האימון
  // האחרון שאינו זה שנערך כרגע.
  const previousSession = editingId ? sessions.find(s => s.id !== editingId) : (sessions[0] || null);
  // האימון שלפני "האימון הקודם" - כדי לתת גם לערך הרפרנס בדף ההזנה צבע/מגמה משלו
  const priorToPreviousSession = (() => {
    if (!previousSession) return null;
    const idx = sessions.findIndex(s => s.id === previousSession.id);
    return idx >= 0 ? (sessions[idx + 1] || null) : null;
  })();

  const currentTargetShots = editingId
    ? (sessions.find(s => s.id === editingId)?.targetShots || settings.targetShots)
    : settings.targetShots;

  const sessionMadeAttempts = (session) => {
    if (!session) return null;
    const values = Object.values(session.data);
    const total = values.length * session.targetShots;
    const made = values.reduce((a, b) => a + b, 0);
    return { made, total };
  };

  // עד 10 האימונים האחרונים עם נתונים לאזור נתון, מהחדש לישן, כל אחד עם מגמה מול זה שאחריו (גם אם הוא מחוץ ל-10)
  const getZoneHistory = (group) => {
    const rows = [];
    sessions.forEach(session => {
      let made = 0, attempts = 0;
      spots.filter(s => s.group === group).forEach(spot => {
        if (session.data[spot.id] !== undefined) {
          made += session.data[spot.id];
          attempts += session.targetShots;
        }
      });
      if (attempts > 0) rows.push({ id: session.id, date: session.date, made, attempts, perc: Math.round((made / attempts) * 100) });
    });
    return rows.slice(0, 10).map((r, i) => ({ ...r, trend: rows[i + 1] ? getTrend(r.perc, rows[i + 1].perc) : null }));
  };

  const sessionOverallPerc = (session) => {
    const ma = sessionMadeAttempts(session);
    if (!ma || ma.total === 0) return null;
    return Math.round((ma.made / ma.total) * 100);
  };

  const latestSessionPerc = useMemo(() => sessionOverallPerc(latestSession) ?? 0, [latestSession]);
  const comparisonSessionPerc = useMemo(() => sessionOverallPerc(comparisonSession), [comparisonSession]);
  const overallTrend = getTrend(latestSessionPerc, comparisonSessionPerc);
  const overallTrendColor = overallTrend ? TREND_COLORS[overallTrend] : '#FF8A00';

  const stats = useMemo(() => {
    if (!sessions.length) return null;
    let totalMade = 0, totalShots = 0;
    let lastMade = 0, lastShots = 0;

    const zoneData = {};
    GROUP_ORDER.forEach(g => zoneData[g] = {
      allTimeMade: 0, allTimeAttempts: 0,
      lastMade: 0, lastAttempts: 0,
      prevMade: 0, prevAttempts: 0
    });

    sessions.forEach((session, idx) => {
      const isLast = idx === 0;
      const isPrev = idx === 1;
      Object.entries(session.data).forEach(([idStr, made]) => {
        const spot = spots.find(s => s.id === parseInt(idStr, 10));
        if (spot && zoneData[spot.group]) {
          totalMade += made;
          totalShots += session.targetShots;
          zoneData[spot.group].allTimeMade += made;
          zoneData[spot.group].allTimeAttempts += session.targetShots;

          if (isLast) {
            lastMade += made;
            lastShots += session.targetShots;
            zoneData[spot.group].lastMade += made;
            zoneData[spot.group].lastAttempts += session.targetShots;
          }
          if (isPrev) {
            zoneData[spot.group].prevMade += made;
            zoneData[spot.group].prevAttempts += session.targetShots;
          }
        }
      });
    });

    return {
      totalMade,
      totalShots,
      overallPerc: totalShots > 0 ? Math.round((totalMade / totalShots) * 100) : 0,
      lastMade,
      lastShots,
      lastPerc: lastShots > 0 ? Math.round((lastMade / lastShots) * 100) : 0,
      zoneData
    };
  }, [sessions, spots]);

  const graphData = useMemo(() => {
    const raw = sessions.map(session => {
      let made = 0, total = 0;

      if (filterMode === 'overall') {
        Object.values(session.data).forEach(v => made += v);
        total = Object.keys(session.data).length * session.targetShots;
      }
      else if (filterMode === 'zone') {
        spots.filter(s => s.group === filterZone).forEach(spot => {
          if(session.data[spot.id] !== undefined) {
            made += session.data[spot.id];
            total += session.targetShots;
          }
        });
      }
      else if (filterMode === 'spot') {
        if(session.data[filterSpot] !== undefined) {
          made += session.data[filterSpot];
          total = session.targetShots;
        }
      }

      const dateObj = new Date(session.date);
      return {
        shortDate: dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' }),
        fullDate: dateObj.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }),
        percentage: total > 0 ? (made / total) * 100 : 0,
        hasData: total > 0
      };
    });
    return raw.filter(d => d.hasData);
  }, [sessions, filterMode, filterZone, filterSpot, spots]);

  const insights = useMemo(() => {
    if (!latestSession || !stats) return [];
    const list = [];

    if (comparisonSession && comparisonSessionPerc !== null) {
      const diff = latestSessionPerc - comparisonSessionPerc;
      const prevMA = sessionMadeAttempts(comparisonSession);
      if (diff > 0) {
        list.push({ type: 'up', text: `השתפרת ב-${diff}%: קלעת ${stats.lastMade}/${stats.lastShots} באימון האחרון, לעומת ${prevMA.made}/${prevMA.total} באימון הקודם. כל הכבוד!` });
      } else if (diff < 0) {
        list.push({ type: 'down', text: `ירדת ב-${Math.abs(diff)}%: קלעת ${stats.lastMade}/${stats.lastShots} באימון האחרון, לעומת ${prevMA.made}/${prevMA.total} באימון הקודם - זה קורה, תמשיך להתאמן.` });
      } else {
        list.push({ type: 'same', text: `נשארת יציב: קלעת ${stats.lastMade}/${stats.lastShots} באימון האחרון, בדיוק כמו באימון הקודם.` });
      }

      let bestZone = null, bestDelta = 0;
      GROUP_ORDER.forEach(g => {
        const zd = stats.zoneData[g];
        if (zd.lastAttempts > 0 && zd.prevAttempts > 0) {
          const delta = Math.round((zd.lastMade / zd.lastAttempts) * 100) - Math.round((zd.prevMade / zd.prevAttempts) * 100);
          if (delta > bestDelta) { bestDelta = delta; bestZone = g; }
        }
      });
      if (bestZone) {
        const zd = stats.zoneData[bestZone];
        list.push({ type: 'up', text: `האזור "${bestZone}" השתפר הכי הרבה: עלית ב-${bestDelta}% - קלעת ${zd.lastMade}/${zd.lastAttempts} באימון האחרון, לעומת ${zd.prevMade}/${zd.prevAttempts} באימון הקודם.` });
      }
    } else {
      list.push({ type: 'same', text: 'זהו האימון הראשון שלך שנשמר - מכאן והלאה תוכל לעקוב אחרי ההתקדמות שלך!' });
    }

    let weakZone = null, weakPerc = Infinity;
    GROUP_ORDER.forEach(g => {
      const zd = stats.zoneData[g];
      if (zd.lastAttempts > 0) {
        const lp = Math.round((zd.lastMade / zd.lastAttempts) * 100);
        if (lp < weakPerc) { weakPerc = lp; weakZone = g; }
      }
    });
    if (weakZone) {
      const zd = stats.zoneData[weakZone];
      let weakText = `הכי כדאי להתמקד באזור "${weakZone}": קלעת רק ${zd.lastMade}/${zd.lastAttempts} (${weakPerc}%) באימון האחרון`;
      if (zd.prevAttempts > 0) {
        const prevPerc = Math.round((zd.prevMade / zd.prevAttempts) * 100);
        const delta = weakPerc - prevPerc;
        if (delta > 0) weakText += `, שיפור של ${delta}% לעומת ${zd.prevMade}/${zd.prevAttempts} (${prevPerc}%) באימון הקודם`;
        else if (delta < 0) weakText += `, ירידה של ${Math.abs(delta)}% לעומת ${zd.prevMade}/${zd.prevAttempts} (${prevPerc}%) באימון הקודם`;
        else weakText += `, בדיוק כמו ${zd.prevMade}/${zd.prevAttempts} (${prevPerc}%) באימון הקודם`;
      }
      weakText += `, ו-${zd.allTimeMade}/${zd.allTimeAttempts} בסך הכל.`;
      list.push({ type: 'down', text: weakText });
    }

    return list;
  }, [latestSession, comparisonSession, comparisonSessionPerc, latestSessionPerc, stats]);

  const filterModeOptions = [
    { value: 'overall', label: 'ממוצע כולל (סה"כ)' },
    { value: 'zone', label: 'לפי אזור במגרש' },
    { value: 'spot', label: 'לפי עמדה ספציפית' }
  ];

  const zoneOptions = GROUP_ORDER.map(g => ({ value: g, label: g }));
  const spotOptions = spots.map(s => ({ value: s.id, label: s.name }));

  const difficultyLabel = (id) => DIFFICULTY_MODIFIERS.find(m => m.id === id)?.label || id;

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#0F1115] text-[#E0E2E7] font-sans selection:bg-[#FF8A00]/30" dir="rtl">

      {/* ===================== מודל פרטי נקודה ===================== */}
      {selectedSpotDetails && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedSpotDetails(null)}
        >
          <div
            className="bg-[#1C202A] p-6 rounded-3xl border border-[#2A2F3D] shadow-2xl w-full max-w-[320px] transform scale-100 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-black text-white">{selectedSpotDetails.name}</h3>
              <button onClick={() => setSelectedSpotDetails(null)} className="text-[#848B98] hover:text-white bg-[#0F1115] rounded-full p-2 transition-colors border border-[#2A2F3D]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0F1115] p-5 rounded-2xl border border-[#2A2F3D]">
                 <p className="text-[#848B98] text-xs font-bold uppercase tracking-wider mb-2">אימון אחרון</p>
                 {selectedSpotDetails.s1 ? (
                    <div className="flex justify-between items-end">
                       <span className="text-4xl font-black" style={{ color: selectedSpotDetails.s1.trend ? TREND_COLORS[selectedSpotDetails.s1.trend] : '#FFFFFF' }}>
                         {selectedSpotDetails.s1.perc}%
                       </span>
                       <span dir="ltr" className="text-[#A0A6B1] text-sm font-medium mb-1">{selectedSpotDetails.s1.made}/{selectedSpotDetails.s1.target}</span>
                    </div>
                 ) : <p className="text-[#848B98] text-sm">לא נזרק באימון זה</p>}
              </div>

              <div className="bg-[#0F1115] p-5 rounded-2xl border border-[#2A2F3D]/50 opacity-80">
                 <p className="text-[#848B98] text-xs font-bold uppercase tracking-wider mb-2">אימון קודם</p>
                 {selectedSpotDetails.s2 ? (
                    <div className="flex justify-between items-end">
                       <span className="text-3xl font-bold" style={{ color: selectedSpotDetails.s2.trend ? TREND_COLORS[selectedSpotDetails.s2.trend] : '#FFFFFF' }}>
                         {selectedSpotDetails.s2.perc}%
                       </span>
                       <span dir="ltr" className="text-[#848B98] text-sm mb-1">{selectedSpotDetails.s2.made}/{selectedSpotDetails.s2.target}</span>
                    </div>
                 ) : <p className="text-[#848B98] text-sm">אין נתונים מהאימון הקודם</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* חגיגת שיא אישי - מוצג כשהאימון שנשמר שובר את השיא הכללי (אחוז קליעה כולל) של כל הזמנים */}
      {recordCelebration && (
        <div
          className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6 animate-in fade-in"
          onClick={() => setRecordCelebration(null)}
        >
          <div
            className="bg-gradient-to-b from-[#1C202A] to-[#161920] p-8 rounded-3xl border border-[#FF8A00]/40 shadow-2xl w-full max-w-[320px] text-center transform scale-100 animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#FF8A00] to-[#E55D00] flex items-center justify-center shadow-lg shadow-[#FF8A00]/30">
              <Trophy className="text-white w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-white mb-1">שיא אישי חדש!</h3>
            <p className="text-[#848B98] text-sm mb-5">האחוז הגבוה ביותר שלך אי פעם באימון שלם</p>
            <p className="text-5xl font-black text-[#FF8A00] mb-1">{recordCelebration.perc}%</p>
            <p dir="ltr" className="text-[#848B98] text-sm mb-6">{recordCelebration.made}/{recordCelebration.total}</p>
            <button
              onClick={() => setRecordCelebration(null)}
              className="w-full bg-gradient-to-r from-[#FF8A00] to-[#E55D00] text-[#0F1115] font-black text-lg py-3.5 rounded-xl shadow-lg shadow-[#FF8A00]/20"
            >
              יאללה, קדימה!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="shrink-0 bg-[#161920] border-b border-[#252A36] pt-8 pb-4 px-5 shadow-md">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FF8A00] to-[#E55D00] rounded-xl flex items-center justify-center shadow-lg shadow-[#FF8A00]/20">
              <Trophy className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight uppercase" style={{fontFamily: 'Impact, sans-serif'}}>
                SWISH-PRO 10/10
              </h1>
            </div>
          </div>
          <button
            onClick={() => {
              setShowSettingsModal(true);
              if (showSettingsHint) {
                setShowSettingsHint(false);
                localStorage.setItem(STORAGE_SETTINGS_SEEN_KEY, 'true');
              }
            }}
            className="relative p-2.5 rounded-full bg-[#1C202A] text-[#848B98] border border-[#2A2F3D] hover:text-[#FF8A00] transition-colors"
          >
            <Settings size={20} />
            {showSettingsHint && (
              <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-[#161920] animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto w-full max-w-md mx-auto relative">

        {/* מודל הגדרות */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-40 bg-[#0F1115]/95 backdrop-blur-sm p-6 overflow-y-auto animate-in fade-in">
            <div className="bg-[#1C202A] rounded-3xl p-6 border border-[#2A2F3D] shadow-2xl mt-10">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">הגדרות אימון</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  aria-label="סגור הגדרות"
                  className="text-[#848B98] hover:text-white bg-[#0F1115] rounded-full p-2 transition-colors border border-[#2A2F3D] shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-medium text-[#A0A6B1] mb-3">
                  יעד זריקות לכל עמדה
                </label>
                <div className="flex items-center gap-4 bg-[#0F1115] p-3 rounded-2xl border border-[#2A2F3D]">
                  <input
                    type="number"
                    min="1"
                    value={settings.targetShots}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === '') { setSettings(prev => ({ ...prev, targetShots: '' })); return; }
                      const v = parseInt(raw, 10);
                      if (Number.isFinite(v) && v >= 1) setSettings(prev => ({ ...prev, targetShots: v }));
                    }}
                    onBlur={() => {
                      if (!Number.isFinite(settings.targetShots) || settings.targetShots < 1) {
                        setSettings(prev => ({ ...prev, targetShots: 10 }));
                      }
                    }}
                    className="w-20 bg-transparent text-center text-3xl font-black text-[#FF8A00] outline-none"
                  />
                  <span className="text-[#848B98] text-xs leading-relaxed">זריקות (ישפיע רק על<br/>אימונים חדשים שתפתח)</span>
                </div>
              </div>

              <div className="border-t border-[#2A2F3D] pt-6 mb-4 space-y-3">
                <div className="flex items-center justify-between bg-[#0F1115] p-4 rounded-2xl border border-[#2A2F3D]">
                  <div>
                    <p className="text-white font-bold text-sm">הצגת מסקנות</p>
                    <p className="text-[#848B98] text-[10px] mt-0.5">כרטיס תובנות ומוטיבציה בעמוד הסטטיסטיקות</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, showInsights: prev.showInsights === false }))}
                    aria-label="הצג או הסתר מסקנות"
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.showInsights === false ? 'bg-[#3A4155]' : 'bg-[#FF8A00]'}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.showInsights === false ? 'right-1' : 'right-6'}`}></span>
                  </button>
                </div>

                <div className="flex items-center justify-between bg-[#0F1115] p-4 rounded-2xl border border-[#2A2F3D]">
                  <div>
                    <p className="text-white font-bold text-sm">הצגת יומן</p>
                    <p className="text-[#848B98] text-[10px] mt-0.5">טאב יומן להערות על כל אימון (ההערות עצמן לא נמחקות בכיבוי)</p>
                  </div>
                  <button
                    onClick={() => setSettings(prev => ({ ...prev, showJournal: prev.showJournal !== true }))}
                    aria-label="הצג או הסתר יומן"
                    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${settings.showJournal === true ? 'bg-[#FF8A00]' : 'bg-[#3A4155]'}`}
                  >
                    <span className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${settings.showJournal === true ? 'right-6' : 'right-1'}`}></span>
                  </button>
                </div>
              </div>

              <div className="border-t border-[#2A2F3D] pt-6">
                <p className="text-white font-bold text-sm mb-1">גיבוי ושחזור</p>
                <p className="text-[#848B98] text-[10px] mb-3">שמור עותק של כל האימונים שלך כקובץ, כדי שלעולם לא תאבד אותם - גם אם תמחק את האפליקציה או תחליף מכשיר.</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={exportData}
                    disabled={isDemoData}
                    className="bg-[#0F1115] text-[#E0E2E7] font-bold py-3.5 rounded-xl border border-[#3A4155] hover:border-[#FF8A00]/50 flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <Download size={16} /> ייצוא נתונים
                  </button>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="bg-[#0F1115] text-[#E0E2E7] font-bold py-3.5 rounded-xl border border-[#3A4155] hover:border-[#FF8A00]/50 flex items-center justify-center gap-2"
                  >
                    <Upload size={16} /> ייבוא נתונים
                  </button>
                  <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
                </div>
              </div>

              <div className="border-t border-[#2A2F3D] pt-6">
                <button
                  onClick={clearAllData}
                  className="w-full bg-red-500/10 text-red-500 font-bold py-4 rounded-xl border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center gap-2"
                >
                  <Trash2 size={18} /> מחיקת כל הנתונים
                </button>
              </div>

              <div className="border-t border-[#2A2F3D] pt-6">
                <div className="bg-gradient-to-br from-[#1C202A] to-[#161920] p-4 rounded-2xl border border-[#2A2F3D]">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF8A00] to-[#E55D00] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF8A00]/20">
                      <Code2 size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">שמואל צבי כהן</p>
                      <p className="text-[#848B98] text-[11px]">אדריכל קוד • מלמד תכנות ובונה מערכות, אפליקציות ואתרים</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 pt-3 border-t border-[#2A2F3D]/60">
                    <a href="tel:0539311073" className="flex items-center gap-2 text-[#A0A6B1] text-xs hover:text-[#FF8A00] transition-colors" dir="ltr">
                      <Phone size={13} className="shrink-0" /> 053-931-1073
                    </a>
                    <a href="mailto:shmueltzvi76@gmail.com" className="flex items-center gap-2 text-[#A0A6B1] text-xs hover:text-[#FF8A00] transition-colors" dir="ltr">
                      <Mail size={13} className="shrink-0" /> shmueltzvi76@gmail.com
                    </a>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettingsModal(false)}
                className="w-full mt-4 bg-[#FF8A00] text-black font-black text-lg py-4 rounded-xl shadow-lg shadow-[#FF8A00]/20"
              >
                סגור חלון
              </button>
            </div>
          </div>
        )}

        {/* מגרש ראשי */}
        {activeTab === 'court' && !showSettingsModal && (
          <div className="h-full flex flex-col p-4 animate-in fade-in">
            {isDemoData && (
              <div className="shrink-0 mb-3 px-3 py-2 rounded-xl border border-dashed border-[#FF8A00]/50 bg-[#FF8A00]/10 flex items-center gap-2">
                <Sparkles size={14} className="text-[#FF8A00] shrink-0" />
                <p className="text-[#FF8A00] text-[11px] font-bold leading-tight">
                  מצב הדגמה - נתונים לדוגמה בלבד. ברגע שתזין אימון אמיתי ראשון, הם יוחלפו במעקב האמיתי שלך.
                </p>
              </div>
            )}
            <div className="shrink-0 bg-[#1C202A] p-3 rounded-2xl mb-3 border border-[#2A2F3D] flex justify-between items-center shadow-lg">
              <div>
                <p className="text-[#848B98] text-[10px] font-bold uppercase tracking-wider mb-0.5">
                  האימון האחרון
                </p>
                <p className="text-white font-medium text-sm">
                  {latestSession ? new Date(latestSession.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' }) : 'אין נתונים'}
                </p>
              </div>
              <div
                className="text-left px-3 py-1.5 rounded-xl border"
                style={{ background: `linear-gradient(to bottom right, ${overallTrendColor}33, ${overallTrendColor}0D)`, borderColor: `${overallTrendColor}33` }}
              >
                <p className="text-xl font-black flex items-center gap-1" style={{ color: overallTrendColor }}>{latestSessionPerc}%<TrendArrow trend={overallTrend} size={14} /></p>
              </div>
            </div>

            <CourtView
              spots={spots}
              latestSession={latestSession}
              comparisonSession={comparisonSession}
              onSpotClick={handleSpotClick}
              courtMode={courtMode}
              onChangeCourtMode={setCourtMode}
              editMode={spotEditMode}
              onToggleEditMode={toggleSpotEditMode}
              onAddSpot={handleAddSpot}
              onRemoveSpot={handleRemoveSpot}
              onResetSpots={handleResetSpots}
              showEditHint={showSpotsEditHint}
            />

            <div className="shrink-0 text-center mt-3 bg-[#1C202A] px-3 py-2 rounded-xl border border-[#2A2F3D]">
              <p className="text-[#848B98] text-[10px] flex items-center justify-center gap-1">
                <Target size={11} /> מתוך <span className="text-[#FF8A00] font-bold">{latestSession?.targetShots || settings.targetShots}</span> זריקות · לחץ על מספר לפרטים
              </p>
              {comparisonSession && (
                <div className="flex items-center justify-center gap-3 mt-1 text-[9px] text-[#848B98]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.up }}></span>שיא חדש</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.same }}></span>ללא שינוי</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: TREND_COLORS.down }}></span>ירידה</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* הזנה ועריכה */}
        {activeTab === 'input' && !showSettingsModal && (
          <div className="p-4 animate-in slide-in-from-bottom-4 pb-10">
            <div className="mb-6 flex justify-between items-end">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">
                  {editingId ? 'עריכת אימון' : 'הזנת תוצאות'}
                </h2>
                <p className="text-sm text-[#848B98]">מתוך {currentTargetShots} זריקות לכל עמדה</p>
              </div>
              {editingId && (
                <button onClick={() => { setEditingId(null); setCurrentInput({}); setActiveTab('stats'); }} className="text-[#848B98] text-sm underline px-2 py-1">
                  ביטול
                </button>
              )}
            </div>

            <div className="relative mb-6 bg-[#1C202A] rounded-2xl border border-[#2A2F3D] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell size={15} className="text-[#FF8A00]" />
                <h3 className="text-white font-bold text-sm">רמת קושי לאימון הזה</h3>
                {showDifficultyHint && (
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></span>
                )}
              </div>
              <DifficultyChips selected={currentDifficulty} onToggle={toggleDifficulty} />
            </div>

            <div className="space-y-6">
              {GROUP_ORDER.map(group => {
                const groupSpots = spots.filter(s => s.group === group);
                if (groupSpots.length === 0) return null;
                return (
                <div key={group} className="bg-[#1C202A] rounded-2xl border border-[#2A2F3D] shadow-lg">
                  <div className="bg-[#212631] px-4 py-3 border-b border-[#2A2F3D] rounded-t-2xl flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-[#FF8A00]/20 flex items-center justify-center">
                      <Target className="text-[#FF8A00] w-3.5 h-3.5" />
                    </div>
                    <h3 className="font-bold text-white text-sm tracking-wide">{group}</h3>
                  </div>

                  <div className="p-2 divide-y divide-[#2A2F3D]/50">
                    {groupSpots.map(spot => {
                      const val = currentInput[spot.id];
                      const prevScore = previousSession?.data[spot.id];
                      const liveTrend = (val !== undefined && val !== '' && prevScore !== undefined) ? getTrend(val, prevScore) : null;
                      const priorScore = priorToPreviousSession?.data[spot.id];
                      const prevTrend = prevScore !== undefined && priorScore !== undefined ? getTrend(prevScore, priorScore) : null;
                      const prevTrendColor = prevTrend ? TREND_COLORS[prevTrend] : '#FF8A00';

                      return (
                        <div key={spot.id} className="flex items-center justify-between p-2">
                          <div>
                            <span className="text-[#E0E2E7] font-bold text-sm block">{spot.name}</span>
                            {prevScore !== undefined ? (
                              <span className="text-[10px] font-bold inline-flex items-center gap-1" style={{ color: prevTrendColor }}>
                                {`אימון קודם: קלעת ${prevScore}`}
                                {prevTrend === 'up' && <ArrowUp size={9} strokeWidth={3} />}
                                {prevTrend === 'down' && <ArrowDown size={9} strokeWidth={3} />}
                                {prevTrend === 'same' && <span className="w-1 h-1 rounded-full" style={{ backgroundColor: prevTrendColor }}></span>}
                              </span>
                            ) : (
                              <span className="text-[#596070] text-[10px] font-bold">טרם הוזן בעבר</span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <TrendArrow trend={liveTrend} size={16} />
                            <HybridInput
                              value={val}
                              onChange={(v) => handleInput(spot.id, v)}
                              max={currentTargetShots}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>

            <button
              onClick={saveSession}
              className="w-full mt-8 bg-gradient-to-r from-[#FF8A00] to-[#E55D00] text-[#0F1115] font-black text-lg py-4 rounded-xl shadow-lg shadow-[#FF8A00]/20 active:scale-95 transition-all sticky bottom-0"
            >
              {editingId ? 'עדכן אימון' : 'שמור אימון'}
            </button>
          </div>
        )}

        {/* סטטיסטיקות */}
        {activeTab === 'stats' && stats && !showSettingsModal && (
          <div className="p-4 animate-in fade-in space-y-6 pb-10">

            {/* סיכום אימון אחרון! */}
            {latestSession && (
              <div className="bg-gradient-to-br from-[#1C202A] to-[#161920] rounded-3xl p-5 border border-[#FF8A00]/30 shadow-lg relative overflow-hidden">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#FF8A00]/10 rounded-full blur-xl"></div>
                <div className="flex items-center gap-2 mb-2 relative z-10">
                  <Activity className="w-5 h-5 text-[#FF8A00]" />
                  <h3 className="text-white font-bold text-sm">האימון האחרון שלך</h3>
                </div>
                <div className="flex justify-between items-end relative z-10">
                  <div>
                    <p className="text-4xl font-black leading-none" style={{ color: overallTrendColor }}>{stats.lastPerc}<span className="text-xl">%</span></p>
                    {overallTrend && (
                      <p className="text-[10px] font-bold mt-1 flex items-center gap-1" style={{ color: overallTrendColor }}>
                        {overallTrend === 'up' && <><ArrowUp size={11} /> שיא חדש!</>}
                        {overallTrend === 'down' && <><ArrowDown size={11} /> ירידה מהאימון הקודם</>}
                        {overallTrend === 'same' && <><Minus size={11} /> ללא שינוי</>}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p dir="ltr" className="text-[#E0E2E7] font-bold">{stats.lastMade} / {stats.lastShots}</p>
                    <p className="text-[#848B98] text-[10px]">קליעות מהאימון האחרון</p>
                  </div>
                </div>
                {latestSession.difficulty && latestSession.difficulty.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 relative z-10">
                    {latestSession.difficulty.map(id => (
                      <span key={id} className="text-[9px] font-bold bg-[#0F1115] text-[#A0A6B1] border border-[#2A2F3D] rounded-full px-2 py-0.5">
                        {difficultyLabel(id)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* מסקנות ותובנות */}
            {settings.showInsights !== false && insights.length > 0 && (
              <div className="bg-[#1C202A] rounded-2xl p-5 border border-[#2A2F3D] shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-[#FF8A00]" />
                  <h3 className="text-white font-bold text-sm">מסקנות מהאימון</h3>
                </div>
                <div className="space-y-2.5">
                  {insights.map((insight, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 mt-1 w-2 h-2 rounded-full"
                        style={{ backgroundColor: TREND_COLORS[insight.type] }}
                      ></span>
                      <p className="text-[#E0E2E7] text-xs leading-relaxed">{insight.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* סיכום מכל האימונים */}
            <div className="flex gap-4">
              <div className="flex-1 bg-[#1C202A] rounded-2xl p-4 border border-[#2A2F3D] text-center shadow-sm">
                <Flame className="w-5 h-5 text-[#848B98] mx-auto mb-1" />
                <p className="text-[#848B98] text-[9px] font-bold uppercase">אחוז כל הזמנים</p>
                <p className="text-2xl font-black text-white mt-0.5">{stats.overallPerc}<span className="text-[#848B98] text-sm">%</span></p>
              </div>

              <div className="flex-1 bg-[#1C202A] rounded-2xl p-4 border border-[#2A2F3D] text-center shadow-sm flex flex-col justify-center">
                <p className="text-[#848B98] text-[9px] font-bold uppercase mb-1">סלי שדה (All-Time)</p>
                <div dir="ltr" className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className="text-xl font-bold text-white">{stats.totalMade}</span>
                  <span className="text-[#848B98] text-xs">/ {stats.totalShots}</span>
                </div>
              </div>
            </div>

            {/* גרף התקדמות */}
            <div className="bg-[#1C202A] rounded-3xl p-5 border border-[#2A2F3D] shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={18} className="text-[#FF8A00]" />
                <h3 className="text-white font-bold text-sm">גרף התקדמות</h3>
              </div>

              <div className="flex flex-col gap-3">
                <CustomDropdown
                  value={filterMode}
                  options={filterModeOptions}
                  onChange={setFilterMode}
                  icon={Filter}
                />

                {filterMode === 'zone' && (
                  <div className="animate-in slide-in-from-top-2 fade-in">
                    <CustomDropdown
                      value={filterZone}
                      options={zoneOptions}
                      onChange={setFilterZone}
                    />
                  </div>
                )}

                {filterMode === 'spot' && (
                  <div className="animate-in slide-in-from-top-2 fade-in">
                    <CustomDropdown
                      value={filterSpot}
                      options={spotOptions}
                      onChange={setFilterSpot}
                    />
                  </div>
                )}
              </div>

              <SmartLineChart data={graphData} />
            </div>

            {/* חלוקה לאזורים משודרגת - מראה גם אימון אחרון וגם כל הזמנים */}
            <div>
              <div className="flex justify-between items-end mb-3">
                <h3 className="text-white font-bold text-sm">חלוקה לאזורים</h3>
              </div>

              <div className="grid gap-3">
                {GROUP_ORDER.map(group => {
                  const data = stats.zoneData[group];
                  if (data.allTimeAttempts === 0) return null;

                  const lastPerc = data.lastAttempts > 0 ? Math.round((data.lastMade / data.lastAttempts) * 100) : 0;
                  const prevPerc = data.prevAttempts > 0 ? Math.round((data.prevMade / data.prevAttempts) * 100) : null;
                  const zoneTrend = comparisonSession ? getTrend(lastPerc, prevPerc) : null;
                  const zoneTrendColor = zoneTrend ? TREND_COLORS[zoneTrend] : '#FF8A00';
                  const allPerc = Math.round((data.allTimeMade / data.allTimeAttempts) * 100);

                  const isExpanded = !!expandedZones[group];

                  return (
                    <div key={group} className="bg-[#1C202A] p-4 rounded-xl border border-[#2A2F3D]">
                      <div className="flex items-center justify-between mb-3 border-b border-[#2A2F3D] pb-2">
                        <h4 className="font-bold text-white text-sm">{group}</h4>
                        <button
                          onClick={() => setExpandedZones(prev => ({ ...prev, [group]: !prev[group] }))}
                          aria-label="הרחב היסטוריה מפורטת לאזור"
                          className="text-[#848B98] hover:text-[#FF8A00] p-1 -m-1 transition-colors"
                        >
                          <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {isExpanded ? (
                        <div className="space-y-2.5">
                          {getZoneHistory(group).map(row => {
                            const rowColor = row.trend ? TREND_COLORS[row.trend] : '#FF8A00';
                            return (
                              <div key={row.id} className="flex items-center justify-between">
                                <div className="w-20">
                                  <p className="text-[9px] text-[#848B98] font-bold uppercase">
                                    {new Date(row.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                  </p>
                                  <p dir="ltr" className="text-[11px] text-[#A0A6B1]">{row.made}/{row.attempts}</p>
                                </div>
                                <div className="flex-1 mx-3 bg-[#0F1115] h-1.5 rounded-full overflow-hidden shadow-inner">
                                  <div className="h-full rounded-full" style={{ width: `${row.perc}%`, backgroundColor: rowColor }} />
                                </div>
                                <div className="w-14 flex items-center justify-end gap-1">
                                  <span className="font-black text-xs" style={{ color: rowColor }}>{row.perc}%</span>
                                  <TrendArrow trend={row.trend} size={11} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <>
                          {/* פס אימון אחרון */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-20">
                              <p className="text-[9px] text-[#848B98] font-bold uppercase">אימון אחרון</p>
                              <p dir="ltr" className="text-[11px] text-[#A0A6B1]">{data.lastMade}/{data.lastAttempts}</p>
                            </div>
                            <div className="flex-1 mx-3 bg-[#0F1115] h-1.5 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full rounded-full" style={{ width: `${lastPerc}%`, backgroundColor: zoneTrendColor }} />
                            </div>
                            <div className="w-14 flex items-center justify-end gap-1">
                              <span className="font-black text-xs" style={{ color: zoneTrendColor }}>{lastPerc}%</span>
                              <TrendArrow trend={zoneTrend} size={11} />
                            </div>
                          </div>

                          {/* פס כל הזמנים */}
                          <div className="flex items-center justify-between opacity-70">
                            <div className="w-20">
                              <p className="text-[9px] text-[#848B98] font-bold uppercase">כל הזמנים</p>
                              <p dir="ltr" className="text-[11px] text-[#848B98]">{data.allTimeMade}/{data.allTimeAttempts}</p>
                            </div>
                            <div className="flex-1 mx-3 bg-[#0F1115] h-1.5 rounded-full overflow-hidden shadow-inner">
                              <div className="h-full bg-[#848B98] rounded-full" style={{ width: `${allPerc}%` }} />
                            </div>
                            <div className="w-8 text-right">
                              <span className="font-bold text-[#848B98] text-xs">{allPerc}%</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* היסטוריית אימונים */}
            <div>
              <h3 className="text-white font-bold text-sm mb-3 mt-4">היסטוריית אימונים</h3>
              <div className="space-y-3">
                {sessions.map((session, idx) => {
                  let sMade = 0;
                  let sTotal = Object.keys(session.data).length * session.targetShots;
                  Object.values(session.data).forEach(v => sMade += v);
                  const sPerc = sTotal > 0 ? Math.round((sMade / sTotal) * 100) : 0;
                  const sOlderPerc = sessionOverallPerc(sessions[idx + 1]);
                  const sTrend = getTrend(sPerc, sOlderPerc);
                  const sTrendColor = sTrend ? TREND_COLORS[sTrend] : '#FF8A00';

                  return (
                    <div key={session.id} className="bg-[#1C202A] p-4 rounded-xl border border-[#2A2F3D] flex justify-between items-center relative overflow-hidden group">
                      <div>
                        <p className="text-white font-bold text-sm">אימון {sessions.length - idx}</p>
                        <p className="text-[10px] text-[#848B98] mt-0.5">{new Date(session.date).toLocaleString('he-IL')}</p>
                        {session.difficulty && session.difficulty.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {session.difficulty.slice(0, 3).map(id => (
                              <span key={id} className="text-[8px] font-bold bg-[#0F1115] text-[#848B98] border border-[#2A2F3D] rounded-full px-1.5 py-0.5">
                                {difficultyLabel(id)}
                              </span>
                            ))}
                            {session.difficulty.length > 3 && (
                              <span className="text-[8px] font-bold text-[#596070]">+{session.difficulty.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right mr-2">
                          <p className="text-lg font-black flex items-center gap-1 justify-end" style={{ color: sTrendColor }}>{sPerc}%<TrendArrow trend={sTrend} size={12} /></p>
                          <p className="text-[9px] text-[#848B98]"><span dir="ltr">{sMade}/{sTotal}</span> קליעות</p>
                        </div>

                        <div className="flex flex-col gap-1 border-r border-[#2A2F3D] pr-3">
                          <button onClick={() => handleEdit(session)} className="text-[#848B98] hover:text-white bg-[#0F1115] p-1.5 rounded-lg transition-colors">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => handleDelete(session.id)} className="text-[#848B98] hover:text-red-500 bg-[#0F1115] p-1.5 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* יומן */}
        {activeTab === 'journal' && settings.showJournal === true && !showSettingsModal && (() => {
          const journalSession = sessions.find(s => s.id === journalSessionId);

          if (!journalSession) {
            return (
              <div className="p-4 animate-in fade-in pb-10">
                <h2 className="text-xl font-bold text-white mb-1">יומן אימונים</h2>
                <p className="text-sm text-[#848B98] mb-6">כתוב לעצמך הערות מעוצבות על כל אימון - כללי או לפי אזור במגרש.</p>

                {sessions.length === 0 ? (
                  <p className="text-[#848B98] text-sm text-center py-10">אין עדיין אימונים שמורים.</p>
                ) : (
                  <div className="space-y-3">
                    {sessions.map((session, idx) => {
                      let sMade = 0;
                      const sTotal = Object.keys(session.data).length * session.targetShots;
                      Object.values(session.data).forEach(v => sMade += v);
                      const sPerc = sTotal > 0 ? Math.round((sMade / sTotal) * 100) : 0;
                      const sOlderPerc = sessionOverallPerc(sessions[idx + 1]);
                      const sTrend = getTrend(sPerc, sOlderPerc);
                      const sTrendColor = sTrend ? TREND_COLORS[sTrend] : '#FF8A00';
                      const noted = hasNotes(session);
                      return (
                        <button
                          key={session.id}
                          onClick={() => setJournalSessionId(session.id)}
                          className="w-full text-right bg-[#1C202A] p-4 rounded-xl border border-[#2A2F3D] flex justify-between items-center hover:border-[#FF8A00]/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${noted ? 'bg-[#FF8A00]/20' : 'bg-[#0F1115]'}`}>
                              <FileText size={14} className={noted ? 'text-[#FF8A00]' : 'text-[#596070]'} />
                            </div>
                            <div>
                              <p className="text-white font-bold text-sm">אימון {sessions.length - idx}</p>
                              <p className="text-[10px] text-[#848B98] mt-0.5">{new Date(session.date).toLocaleString('he-IL')}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: noted ? '#FF8A00' : '#596070' }}>{noted ? 'יש הערות' : 'אין הערות עדיין'}</p>
                            </div>
                          </div>
                          <span className="text-lg font-black" style={{ color: sTrendColor }}>{sPerc}%</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          let jMade = 0;
          const jTotal = Object.keys(journalSession.data).length * journalSession.targetShots;
          Object.values(journalSession.data).forEach(v => jMade += v);
          const jPerc = jTotal > 0 ? Math.round((jMade / jTotal) * 100) : 0;
          const jIdx = sessions.findIndex(s => s.id === journalSession.id);
          const jOlderPerc = sessionOverallPerc(sessions[jIdx + 1]);
          const jTrend = getTrend(jPerc, jOlderPerc);
          const jTrendColor = jTrend ? TREND_COLORS[jTrend] : '#FF8A00';

          return (
            <div className="p-4 animate-in slide-in-from-bottom-4 pb-10">
              <button onClick={() => setJournalSessionId(null)} className="flex items-center gap-1.5 text-[#848B98] text-sm font-bold mb-4">
                <ArrowRight size={16} /> חזרה ליומן
              </button>

              <div className="bg-[#1C202A] p-4 rounded-2xl border border-[#2A2F3D] flex justify-between items-center mb-6">
                <div>
                  <p className="text-white font-bold text-sm">{new Date(journalSession.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' })}</p>
                  <p className="text-[10px] text-[#848B98] mt-0.5" dir="ltr">{jMade}/{jTotal} קליעות</p>
                </div>
                <span className="text-xl font-black" style={{ color: jTrendColor }}>{jPerc}%</span>
              </div>

              <div className="mb-6">
                <h3 className="text-white font-bold text-sm mb-2">הערה כללית</h3>
                <RichTextEditor
                  key={`general-${journalSession.id}`}
                  initialValue={journalSession.notes?.general}
                  onChange={(html) => updateSessionNotes(journalSession.id, 'general', html)}
                  placeholder="מה חשבת על האימון הזה? מה עבד טוב, מה כדאי לשפר..."
                />
              </div>

              <div className="space-y-5">
                {GROUP_ORDER.map(group => (
                  <div key={group}>
                    <h3 className="text-white font-bold text-sm mb-2">{group}</h3>
                    <RichTextEditor
                      key={`zone-${group}-${journalSession.id}`}
                      initialValue={journalSession.notes?.zones?.[group]}
                      onChange={(html) => updateSessionNotes(journalSession.id, group, html)}
                      placeholder={`הערות על "${group}"...`}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </main>

      {/* תפריט תחתון */}
      <nav className="shrink-0 w-full bg-[#161920]/95 backdrop-blur-md border-t border-[#2A2F3D] pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.3)]">
        <div className="max-w-md mx-auto flex justify-around p-2">
          <button onClick={() => {setActiveTab('court'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'court' && !showSettingsModal ? 'text-[#FF8A00]' : 'text-[#848B98]'}`}>
            <Target size={22} />
            <span className="text-[9px] font-bold tracking-wider">המגרש</span>
          </button>

          <button onClick={() => {setActiveTab('input'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'input' && !showSettingsModal ? 'text-white' : 'text-[#848B98]'}`}>
            <Plus size={22} />
            <span className="text-[9px] font-bold tracking-wider">{editingId ? 'ערוך אימון' : 'הזנה'}</span>
          </button>

          <button onClick={() => {setActiveTab('stats'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'stats' && !showSettingsModal ? 'text-[#FF8A00]' : 'text-[#848B98]'}`}>
            <TrendingUp size={22} />
            <span className="text-[9px] font-bold tracking-wider">סטטיסטיקות</span>
          </button>

          {settings.showJournal === true && (
            <button onClick={() => {setActiveTab('journal'); setShowSettingsModal(false);}} className={`flex flex-col items-center gap-1 transition-colors p-2 ${activeTab === 'journal' && !showSettingsModal ? 'text-[#FF8A00]' : 'text-[#848B98]'}`}>
              <BookOpen size={22} />
              <span className="text-[9px] font-bold tracking-wider">יומן</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
