/**
 * VEILLE ADS — Analyse Stratégique des Pubs
 * ===========================================
 * Dédruit automatiquement depuis chaque publicité :
 * - L'ANGLE marketing (peur, aspiration, urgence, preuve sociale...)
 * - Les KEYWORDS associés (thèmes, mots-clés SEO/SEA)
 * - Le PERSONA visé (démographie, psychographie, intent)
 * 
 * 100% gratuit — analyse par règles NLP, pas d'API payante.
 */

// ═══════════════════════════════════════════════════════════
// TAXONOMIE DES ANGLES MARKETING
// ═══════════════════════════════════════════════════════════

export type AngleType =
  | "pain_point"        // "Tired of..." / "Stop wasting..."
  | "aspiration"        // "Achieve..." / "Unlock your..."
  | "fear"              // "Don't risk..." / "What if..."
  | "urgency"           // "Limited time" / "Act now"
  | "social_proof"      // "10M+ users" / "Rated 4.8★"
  | "authority"         // "Doctor recommended" / "Backed by science"
  | "curiosity"         // "The secret to..." / "What nobody tells you"
  | "convenience"       // "In 30 seconds" / "One click"
  | "savings"           // "Save 50%" / "Free trial"
  | "fomo"              // "Join before..." / "Trending"
  | "transformation"    // "Before/After" / "Changed my life"
  | "trust"             // "Guaranteed" / "Money-back"
  | "comparison"        // "Better than..." / "Unlike other..."
  | "problem_solution"  // "Struggling with X? Try Y"
  | "identity"          // "For smart people" / "For real men"
  | "scarcity"          // "Only 3 left" / "Exclusive"
  | "empathy"          // "We understand" / "You deserve"
  | "humor"            // Funny/relatable
  | "controversy"      // "Why everyone is wrong about..."
  | "nostalgia"        // "Remember when..."
  | "data_driven"      // "93% of users..." / "Studies show..."
  | "beginner_friendly" // "No experience needed"
  | "premium"          // "Luxury" / "Premium quality"
  | "community"        // "Join our community" / "Like-minded"
  | "freedom"          // "Take control" / "Be free"
  | "status"           // "Elite" / "VIP" / "Exclusive access"
  | "risk_reduction"   // "No commitment" / "Cancel anytime"
  | "education"        // "Learn how to..." / "Master..."
  | "entertainment"    // "Fun" / "Exciting" / "Amazing"
  | "health"           // "Improve your health" / "Feel better"
  | "wealth"           // "Make money" / "Financial freedom"
  | "relationships"    // "Find love" / "Better relationships"
  | "productivity"     // "Save time" / "Get more done"
  | "security"         // "Protect yourself" / "Stay safe"
  | "appearance"       // "Look younger" / "Get in shape"
  | "spirituality"     // "Find your purpose" / "Cosmic guidance"
  | "gamification"     // "Challenge" / "Level up" / "Win"
  | "uniqueness"       // "Unlike anything else" / "Revolutionary"
  | "accessibility"    // "For everyone" / "Easy to use"
  | "urgency_scarcity" // Combined urgency + scarcity
  | "other";

export type PersonaSegment =
  | "health_conscious"       // Prend soin de sa santé
  | "weight_loss_seeker"     // Veut perdre du poids
  | "beauty_seeker"          // Veut améliorer son apparence
  | "singles_dating"         // Célibataire, cherche des relations
  | "relationship_issues"    // Problèmes relationnels
  | "career_focused"         // Orienté carrière
  | "job_seeker"             // Cherche un emploi
  | "entrepreneur"           // Entrepreneur / side hustle
  | "investor"               // Investissement / finance
  | "parent"                 // Parent
  | "student"                // Étudiant
  | "senior"                 // Senior / retraité
  | "tech_savvy"             // À l'aise avec la tech
  | "tech_beginner"          // Novice en tech
  | "creative"               // Créatif / artiste
  | "spiritual_seeker"       // Spiritualité / astrologie
  | "curious_learner"        // Veut apprendre / test QI
  | "security_conscious"     // Préoccupé par la sécurité
  | "privacy_conscious"      // Préoccupé par la vie privée
  | "bargain_hunter"         // Cherche les bonnes affaires
  | "premium_buyer"          // Achète du premium
  | "impulse_buyer"          // Acheteur impulsif
  | "research_oriented"      // Compare avant d'acheter
  | "family_oriented"        // Famille / foyer
  | "adventurous"            // Aventureux / voyage
  | "homebody"               // Maison / confort
  | "social_media_active"    // Très actif sur les réseaux
  | "young_adult"            // 18-30 ans
  | "middle_aged"            // 30-55 ans
  | "gamer"                  // Gaming / divertissement
  | "pet_owner"              // Propriétaire d'animal
  | "diy_enthusiast"         // Bricolage / DIY
  | "music_lover"            // Musique
  | "sports_fan"             // Sport
  | "eco_conscious"          // Écologie
  | "luxury_lifestyle"       // Mode de vie luxueux
  | "minimalist"             // Minimalisme
  | "chronic_pain"           // Douleurs chroniques
  | "mental_health"          // Santé mentale
  | "sleep_issues"           // Problèmes de sommeil
  | "addiction_recovery"     // Sevrage
  | "grief_loss"             // Deuil / perte
  | "identity_seeker"        // Cherche son identité
  | "parenting_support"      // Soutien parental
  | "language_learner"       // Apprend une langue
  | "music_creator"          // Créateur de musique
  | "content_creator"        // Créateur de contenu
  | "small_business_owner"   // Petite entreprise
  | "freelancer"             // Freelance
  | "remote_worker"          // Travailleur à distance
  | "recently_divorced"      // Récent divorce
  | "empty_nester"           // Syndrome du nid vide
  | "first_time_parent"      // Premier enfant
  | "retirement_planner"     // Planification retraite
  | "other";

export interface AngleAnalysis {
  primary: AngleType;
  secondary: AngleType[];
  confidence: number; // 0-1
  evidence: string[]; // phrases extraites qui justifient l'angle
}

export interface KeywordAnalysis {
  keywords: string[];
  themes: string[];
  emotional_triggers: string[];
  cta_type: string;
  intent_level: "high" | "medium" | "low";
}

export interface PersonaAnalysis {
  primary: PersonaSegment;
  secondary: PersonaSegment[];
  demographics: {
    age_range: string;
    gender: string;
    income: string;
    education: string;
    location: string;
  };
  psychographics: string[];
  pain_points: string[];
  desires: string[];
  confidence: number;
}

export interface AdInsight {
  angle: AngleAnalysis;
  keywords: KeywordAnalysis;
  persona: PersonaAnalysis;
  creative_tone: "emotional" | "rational" | "humorous" | "urgent" | "inspirational" | "fear_based" | "trust_based";
  offer_type: "free_trial" | "discount" | "money_back" | "subscription" | "one_time" | "freemium" | "consultation";
  funnel_stage: "awareness" | "consideration" | "conversion" | "retention";
}

// ═══════════════════════════════════════════════════════════
// DICTIONNAIRES DE DÉTECTION
// ═══════════════════════════════════════════════════════════

const ANGLE_PATTERNS: Record<AngleType, { keywords: string[]; regex: RegExp[] }> = {
  pain_point: {
    keywords: ["tired of", "stop wasting", "frustrated", "struggling", "sick of", "fed up", "annoyed", "bored of", "can't stand", "had enough"],
    regex: [/(?:tired|sick|fed)\s+of/gi, /stop\s+(?:wasting|losing|struggling)/gi, /struggling\s+with/gi],
  },
  aspiration: {
    keywords: ["achieve", "unlock", "reach your", "become", "transform", "discover", "elevate", "maximize", "optimize", "level up", "master"],
    regex: [/(?:achieve|unlock|reach|become|transform|discover|elevate)/gi],
  },
  fear: {
    keywords: ["don't risk", "what if", "warning", "danger", "protect yourself", "before it's too late", "miss out", "lose", "risk"],
    regex: [/(?:don'?t\s+(?:risk|miss|lose|wait))/gi, /before\s+it'?s\s+too\s+late/gi],
  },
  urgency: {
    keywords: ["now", "today", "limited time", "ends soon", "hurry", "act fast", "last chance", "expires", "deadline"],
    regex: [/(?:limited\s+time|ends?\s+(?:soon|today)|hurry|act\s+(?:now|fast)|last\s+chance)/gi],
  },
  social_proof: {
    keywords: ["million", "thousands", "users", "rated", "reviews", "trusted by", "loved by", "recommended", "popular", "trending", "best seller"],
    regex: [/[\d,.]+\s*(?:million|thousand|k\+|m\+|users|customers|reviews)/gi, /(?:rated|trusted|loved|recommended)\s+by/gi],
  },
  authority: {
    keywords: ["doctor", "expert", "science", "research", "clinical", "proven", "certified", "professional", "recommended by", "backed by", "studies show"],
    regex: [/(?:doctor|expert|scientifically|clinically|proven|certified|professional)/gi],
  },
  curiosity: {
    keywords: ["secret", "what nobody tells", "the truth about", "hidden", "revealed", "mystery", "shocking", "surprising", "you won't believe"],
    regex: [/(?:secret|truth|hidden|revealed|shocking|surprising|you\s+won'?t\s+believe)/gi],
  },
  convenience: {
    keywords: ["easy", "simple", "instant", "one click", "in seconds", "no effort", "automatically", "hands-free", "quick", "fast"],
    regex: [/(?:instant|one\s+click|in\s+\d+\s+seconds?|no\s+effort|automatically|quick(?:ly)?|easy)/gi],
  },
  savings: {
    keywords: ["save", "free", "discount", "off", "deal", "cheap", "affordable", "budget", "value", "worth"],
    regex: [/(?:save|free|discount|\d+%\s+off|cheap|affordable)/gi],
  },
  fomo: {
    keywords: ["join before", "trending", "everyone is", "don't be left", "missing out", "catching on", "going viral"],
    regex: [/(?:join\s+before|everyone|missing\s+out|going\s+viral|trending)/gi],
  },
  transformation: {
    keywords: ["before after", "changed my life", "results", "journey", "transformation", "new you", "reborn", "complete makeover"],
    regex: [/(?:before\s*(?:and|&|\/)\s*after|changed\s+(?:my|your)\s+life|transformation|new\s+you)/gi],
  },
  trust: {
    keywords: ["guaranteed", "money back", "refund", "safe", "secure", "reliable", "trusted", "certified", "verified", "endorsed"],
    regex: [/(?:guaranteed?|money\s*back|refund|safe|secure|trusted|verified|endorsed)/gi],
  },
  comparison: {
    keywords: ["better than", "unlike", "compared to", "vs", "versus", "alternative to", "instead of", "superior"],
    regex: [/(?:better\s+than|unlike|compared\s+to|alternative\s+to|instead\s+of|superior)/gi],
  },
  problem_solution: {
    keywords: ["struggling with", "problem with", "issue with", "solution", "fix", "solve", "the answer to"],
    regex: [/(?:struggling|problem|issue|solution|fix|solve|answer\s+to)/gi],
  },
  identity: {
    keywords: ["for smart", "for real", "for men", "for women", "for people who", "if you're the type", "designed for"],
    regex: [/(?:for\s+(?:smart|real|men|women|people|those|you))/gi],
  },
  scarcity: {
    keywords: ["only", "exclusive", "limited", "few left", "invitation only", "waitlist", "select"],
    regex: [/(?:only\s+\d+|exclusive|limited\s+edition|few\s+left|waitlist|invitation)/gi],
  },
  empathy: {
    keywords: ["we understand", "you deserve", "you're not alone", "we've been there", "we know how", "compassionate"],
    regex: [/(?:we\s+understand|you\s+deserve|you'?re\s+not\s+alone|we'?ve\s+been|we\s+know)/gi],
  },
  humor: {
    keywords: ["lol", "haha", "funny", "hilarious", "relatable", "joke", "awkward", "oops", "meme"],
    regex: [/(?:lol|haha|funny|hilarious|relatable|awkward)/gi],
  },
  controversy: {
    keywords: ["why everyone is wrong", "the truth", "myth", "busted", "controversial", "unpopular opinion", "stop believing"],
    regex: [/(?:why\s+everyone|truth\s+about|myth|busted|controversial|stop\s+believing)/gi],
  },
  nostalgia: {
    keywords: ["remember when", "back in the day", "good old days", "classic", "vintage", "throwback", "used to"],
    regex: [/(?:remember\s+when|back\s+in|good\s+old|classic|throwback)/gi],
  },
  data_driven: {
    keywords: ["93%", "studies show", "research proves", "data shows", "statistics", "proven results", "measured", "benchmark"],
    regex: [/\d+%\s+of\s+(?:users|people|customers)/gi, /(?:studies|research|data|statistics)\s+(?:show|prove|confirm)/gi],
  },
  beginner_friendly: {
    keywords: ["no experience", "beginner", "start from zero", "for dummies", "easy to learn", "step by step", "guide"],
    regex: [/(?:no\s+(?:experience|skills|knowledge)|beginner|from\s+zero|step\s+by\s+step)/gi],
  },
  premium: {
    keywords: ["premium", "luxury", "elite", "exclusive", "high-end", "top quality", "best in class", "five star"],
    regex: [/(?:premium|luxury|elite|high[\s-]end|best\s+in\s+class|five[\s-]star)/gi],
  },
  community: {
    keywords: ["join our", "community", "together", "like-minded", "family", "tribe", "support group", "network"],
    regex: [/(?:join\s+(?:our|the)|community|like[\s-]minded|together|support)/gi],
  },
  freedom: {
    keywords: ["take control", "be free", "freedom", "independent", "on your terms", "your way", "autonomy", "liberation"],
    regex: [/(?:take\s+control|freedom|independent|your\s+terms|your\s+way|autonomy)/gi],
  },
  status: {
    keywords: ["vip", "elite", "premium member", "exclusive access", "inner circle", "first access", "priority"],
    regex: [/(?:vip|elite|inner\s+circle|first\s+access|priority|exclusive\s+access)/gi],
  },
  risk_reduction: {
    keywords: ["no commitment", "cancel anytime", "no risk", "try it free", "risk free", "no obligation", "money back"],
    regex: [/(?:no\s+commitment|cancel\s+anytime|no\s+risk|risk[\s-]free|no\s+obligation)/gi],
  },
  education: {
    keywords: ["learn", "master", "discover", "understand", "course", "training", "tutorial", "guide", "masterclass"],
    regex: [/(?:learn|master|discover|understand|course|training|tutorial|guide)/gi],
  },
  entertainment: {
    keywords: ["fun", "exciting", "amazing", "awesome", "cool", "incredible", "mind-blowing", "epic"],
    regex: [/(?:fun|exciting|amazing|awesome|incredible|mind[\s-]blowing|epic)/gi],
  },
  health: {
    keywords: ["health", "wellness", "fitness", "medical", "doctor", "symptoms", "treatment", "cure", "pain relief"],
    regex: [/(?:health|wellness|fitness|medical|symptom|treatment|cure|pain)/gi],
  },
  wealth: {
    keywords: ["money", "income", "profit", "earn", "wealth", "financial", "invest", "rich", "earnings", "revenue"],
    regex: [/(?:money|income|profit|earn|wealth|financial|invest|rich|revenue)/gi],
  },
  relationships: {
    keywords: ["love", "dating", "relationship", "partner", "soulmate", "compatibility", "romance", "marriage", "connection"],
    regex: [/(?:love|dating|relationship|partner|soulmate|compatibility|romance|marriage)/gi],
  },
  productivity: {
    keywords: ["save time", "productive", "efficient", "organize", "manage", "workflow", "get more done", "faster"],
    regex: [/(?:save\s+time|productive|efficient|organize|workflow|faster|more\s+done)/gi],
  },
  security: {
    keywords: ["protect", "safe", "secure", "privacy", "guard", "shield", "defend", "safety", "risk"],
    regex: [/(?:protect|safe|secure|privacy|guard|shield|defend|safety)/gi],
  },
  appearance: {
    keywords: ["look", "beautiful", "young", "skin", "hair", "weight", "body", "grooming", "style", "fashion"],
    regex: [/(?:look\s+(?:better|younger|beautiful)|skin|hair|weight|body|grooming|style)/gi],
  },
  spirituality: {
    keywords: ["stars", "zodiac", "horoscope", "cosmic", "universe", "spiritual", "meditation", "karma", "destiny", "soul"],
    regex: [/(?:zodiac|horoscope|cosmic|spiritual|meditation|karma|destiny|soul|stars)/gi],
  },
  gamification: {
    keywords: ["challenge", "level up", "win", "score", "points", "reward", "achievement", "compete", "leaderboard"],
    regex: [/(?:challenge|level\s+up|win|score|points|reward|achievement|compete)/gi],
  },
  uniqueness: {
    keywords: ["unlike anything", "revolutionary", "breakthrough", "never before", "first ever", "unique", "innovative"],
    regex: [/(?:unlike\s+anything|revolutionary|breakthrough|never\s+before|first[\s-]ever|unique|innovative)/gi],
  },
  accessibility: {
    keywords: ["for everyone", "easy to use", "accessible", "user friendly", "simple", "intuitive", "no technical"],
    regex: [/(?:for\s+everyone|easy\s+to\s+use|accessible|user[\s-]friendly|intuitive)/gi],
  },
  urgency_scarcity: {
    keywords: ["limited spots", "only today", "exclusive offer", "ending soon", "final hours", "last day"],
    regex: [/(?:limited\s+(?:spots|seats|time|edition)|only\s+today|ending\s+soon|final\s+hours|last\s+day)/gi],
  },
  other: { keywords: [], regex: [] },
};

const PERSONA_KEYWORDS: Record<PersonaSegment, string[]> = {
  health_conscious: ["health", "wellness", "fitness", "nutrition", "diet", "exercise", "healthy", "wellbeing"],
  weight_loss_seeker: ["weight", "lose weight", "diet", "slim", "fat", "obesity", "bmi", "calories", "meal plan", "fasting"],
  beauty_seeker: ["skin", "hair", "beauty", "anti-aging", "glow", "wrinkles", "acne", "makeup", "cosmetic"],
  singles_dating: ["single", "dating", "find love", "match", "singles", "romance", "first date", "attractive"],
  relationship_issues: ["relationship", "marriage", "partner", "breakup", "love language", "compatibility", "trust issues"],
  career_focused: ["career", "job", "promotion", "salary", "professional", "resume", "interview", "networking"],
  job_seeker: ["find a job", "resume", "cv", "cover letter", "interview", "unemployed", "job search", "hiring"],
  entrepreneur: ["business", "startup", "entrepreneur", "side hustle", "freelance", "revenue", "scale"],
  investor: ["invest", "stocks", "crypto", "portfolio", "trading", "wealth", "financial freedom", "passive income"],
  parent: ["parent", "kids", "children", "family", "baby", "toddler", "school", "parenting"],
  student: ["student", "college", "university", "study", "exam", "degree", "campus", "tuition"],
  senior: ["senior", "retirement", "over 60", "golden years", "aging", "grandparent", "medicare"],
  tech_savvy: ["ai", "technology", "digital", "app", "software", "automation", "data", "algorithm"],
  tech_beginner: ["easy", "simple", "no technical", "beginner friendly", "step by step", "guide"],
  creative: ["design", "art", "creative", "draw", "illustration", "photography", "music", "write"],
  spiritual_seeker: ["horoscope", "zodiac", "astrology", "spiritual", "meditation", "cosmic", "universe", "destiny"],
  curious_learner: ["iq", "test", "quiz", "intelligence", "brain", "cognitive", "learn", "knowledge", "discover"],
  security_conscious: ["security", "protect", "safe", "monitor", "surveillance", "spy", "track", "guard"],
  privacy_conscious: ["privacy", "anonymous", "secure", "encrypted", "data protection", "vpn"],
  bargain_hunter: ["deal", "discount", "cheap", "save", "free", "coupon", "sale", "bargain"],
  premium_buyer: ["premium", "luxury", "exclusive", "top quality", "best", "high-end", "vip"],
  impulse_buyer: ["now", "instant", "quick", "limited", "today", "hurry", "fast", "immediate"],
  research_oriented: ["compare", "review", "analysis", "research", "data", "stats", "proven", "evidence"],
  family_oriented: ["family", "home", "household", "kids", "parents", "together", "family time"],
  adventurous: ["adventure", "travel", "explore", "excitement", "thrill", "wild", "outdoor"],
  homebody: ["home", "comfort", "cozy", "indoor", "relax", "stay", "movie", "read"],
  social_media_active: ["instagram", "tiktok", "social", "viral", "share", "followers", "influencer", "content"],
  young_adult: ["young", "gen z", "millennial", "trendy", "cool", "vibe", "aesthetic", "fresh"],
  middle_aged: ["balance", "career", "family", "health", "stress", "time management", "wellness"],
  gamer: ["game", "gaming", "play", "esports", "console", "pc", "level", "score", "achievement"],
  pet_owner: ["pet", "dog", "cat", "animal", "puppy", "kitten", "veterinarian", "pet care"],
  diy_enthusiast: ["diy", "build", "craft", "make", "create", "project", "woodwork", "repair"],
  music_lover: ["music", "song", "playlist", "concert", "album", "artist", "guitar", "piano"],
  sports_fan: ["sport", "fitness", "athletic", "workout", "gym", "running", "team", "match"],
  eco_conscious: ["eco", "sustainable", "green", "environment", "organic", "recycle", "carbon", "climate"],
  luxury_lifestyle: ["luxury", "designer", "premium", "exclusive", "yacht", "first class", "five star"],
  minimalist: ["simple", "minimal", "less is more", "declutter", "essential", "clean", "zen"],
  chronic_pain: ["pain", "chronic", "suffering", "relief", "arthritis", "back pain", "migraine", "fibromyalgia"],
  mental_health: ["anxiety", "depression", "stress", "mental health", "therapy", "mindfulness", "calm", "peace"],
  sleep_issues: ["sleep", "insomnia", "tired", "fatigue", "rest", "sleep better", "snoring", "sleep quality"],
  addiction_recovery: ["addiction", "recovery", "sobriety", "quit", "smoking", "alcohol", "clean"],
  grief_loss: ["loss", "grief", "memorial", "remember", "tribute", "healing", "closure"],
  identity_seeker: ["identity", "self discovery", "purpose", "meaning", "who am i", "find myself", "personality"],
  parenting_support: ["parenting", "kids", "behavior", "discipline", "family therapy", "parenting tips"],
  language_learner: ["language", "learn", "speak", "fluent", "translate", "vocabulary", "grammar", "bilingual"],
  music_creator: ["create music", "compose", "produce", "beat", "melody", "songwriting", "recording"],
  content_creator: ["content", "creator", "youtube", "blog", "podcast", "audience", "subscriber", "viral"],
  small_business_owner: ["business owner", "small business", "entrepreneur", "shop", "store", "client", "customer"],
  freelancer: ["freelance", "remote work", "client", "project", "contract", "self employed", "gig"],
  remote_worker: ["remote", "work from home", "wfh", "virtual", "online", "digital nomad"],
  recently_divorced: ["divorce", "separated", "single again", "co parenting", "new chapter"],
  empty_nester: ["empty nest", "kids left", "new chapter", "rediscover", "freedom"],
  first_time_parent: ["first baby", "new parent", "pregnancy", "newborn", "expecting", "baby prep"],
  retirement_planner: ["retirement", "pension", "savings", "financial planning", "401k", "ira"],
  other: [],
};

// ═══════════════════════════════════════════════════════════
// MOTEUR D'ANALYSE
// ═══════════════════════════════════════════════════════════

export function analyzeAngle(headline: string, body: string, cta: string): AngleAnalysis {
  const text = `${headline} ${body} ${cta}`.toLowerCase();
  const scores: Record<string, number> = {};
  const evidence: Record<string, string[]> = {};

  for (const [angle, patterns] of Object.entries(ANGLE_PATTERNS)) {
    if (angle === "other") continue;
    let score = 0;
    const ev: string[] = [];

    // Keyword matching
    for (const kw of patterns.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += 2;
        ev.push(`keyword: "${kw}"`);
      }
    }

    // Regex matching
    for (const regex of patterns.regex) {
      const matches = text.match(regex);
      if (matches) {
        score += matches.length * 3;
        matches.forEach(m => ev.push(`pattern: "${m}"`));
      }
    }

    if (score > 0) {
      scores[angle] = score;
      evidence[angle] = ev.slice(0, 5); // max 5 preuves
    }
  }

  // Trier par score
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return { primary: "other", secondary: [], confidence: 0.3, evidence: [] };
  }

  const primary = sorted[0][0] as AngleType;
  const secondary = sorted.slice(1, 4).map(s => s[0] as AngleType);
  const maxPossible = 15; // score max théorique
  const confidence = Math.min(sorted[0][1] / maxPossible, 1);

  return {
    primary,
    secondary,
    confidence: Math.round(confidence * 100) / 100,
    evidence: evidence[primary] || [],
  };
}

export function analyzeKeywords(headline: string, body: string, cta: string): KeywordAnalysis {
  const text = `${headline} ${body} ${cta}`.toLowerCase();

  // Extraire les mots significatifs (3+ lettres, non-stopwords)
  const stopwords = new Set([
    "the", "and", "for", "you", "your", "with", "this", "that", "are", "was",
    "not", "can", "has", "had", "but", "his", "her", "they", "from", "have",
    "will", "one", "all", "been", "when", "there", "their", "what", "about",
    "which", "how", "its", "our", "who", "get", "got", "can", "just", "like",
    "new", "now", "use", "using", "more", "most", "some", "any", "also", "than",
    "into", "over", "such", "only", "very", "much", "even", "still", "well",
    "here", "way", "may", "own", "same", "too", "other", "after", "before",
    "does", "did", "each", "she", "him", "them", "these", "those", "then",
  ]);

  const words = text
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopwords.has(w));

  // Fréquence des mots
  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Top keywords
  const keywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(e => e[0]);

  // Thèmes (catégories sémantiques)
  const themes: string[] = [];
  const themePatterns: Record<string, RegExp> = {
    "Santé / Bien-être": /health|wellness|fitness|medical|doctor|pain|diet|weight|nutrition/i,
    "Beauté / Apparence": /skin|hair|beauty|young|glow|style|fashion|look/i,
    "Amour / Relations": /love|dating|relationship|partner|soulmate|romance|match/i,
    "Finance / Argent": /money|income|invest|wealth|financial|profit|earn|save/i,
    "Carrière / Emploi": /career|job|resume|cv|interview|salary|promotion/i,
    "Éducation / QI": /learn|iq|test|quiz|brain|education|course|training|skill/i,
    "Astrologie / Spiritualité": /zodiac|horoscope|stars|cosmic|spiritual|meditation|destiny/i,
    "Sécurité / Privacy": /safe|secure|protect|privacy|monitor|spy|track|guard/i,
    "Technologie / IA": /ai|technology|app|software|digital|automation|data/i,
    "Productivité": /productiv|efficient|time|organize|manage|workflow|fast/i,
    "Lifestyle / Luxe": /luxury|premium|exclusive|lifestyle|travel|adventure/i,
    "Famille / Parentalité": /family|kids|children|parent|baby|home/i,
  };

  for (const [theme, regex] of Object.entries(themePatterns)) {
    if (regex.test(text)) themes.push(theme);
  }

  // Emotional triggers
  const emotionalTriggers: string[] = [];
  const emotionPatterns: Record<string, RegExp> = {
    "Peur": /fear|danger|risk|warning|protect|before it's too late/i,
    "Urgence": /now|today|limited|hurry|last chance|expires|ending/i,
    "Aspiration": /achieve|dream|goal|success|transform|become|unlock/i,
    "Frustration": /tired|frustrated|struggling|sick of|fed up|annoyed/i,
    "Curiosité": /secret|discover|hidden|revealed|mystery|shocking/i,
    "Confiance": /guaranteed|proven|trusted|certified|money back/i,
    "Joie": /amazing|awesome|love|happy|exciting|fun|incredible/i,
    "Appartenance": /join|community|together|like-minded|family/i,
  };

  for (const [emotion, regex] of Object.entries(emotionPatterns)) {
    if (regex.test(text)) emotionalTriggers.push(emotion);
  }

  // CTA type
  let ctaType = "learn_more";
  if (/buy|purchase|order|shop/i.test(cta)) ctaType = "purchase";
  else if (/try|start|get started|free trial/i.test(cta)) ctaType = "trial";
  else if (/sign up|register|join|subscribe/i.test(cta)) ctaType = "signup";
  else if (/download|get the/i.test(cta)) ctaType = "download";
  else if (/learn|discover|find out|see/i.test(cta)) ctaType = "learn_more";
  else if (/book|schedule|appointment/i.test(cta)) ctaType = "book";
  else if (/take the quiz|test|check/i.test(cta)) ctaType = "quiz";

  // Intent level
  let intentLevel: "high" | "medium" | "low" = "medium";
  if (/buy|order|purchase|price|pricing|cost|\$|€|subscribe|trial/i.test(text)) intentLevel = "high";
  else if (/learn|discover|how to|guide|tips|what is/i.test(text)) intentLevel = "low";

  return {
    keywords,
    themes,
    emotional_triggers: emotionalTriggers,
    cta_type: ctaType,
    intent_level: intentLevel,
  };
}

export function analyzePersona(headline: string, body: string, cta: string, landingUrl: string): PersonaAnalysis {
  const text = `${headline} ${body} ${cta} ${landingUrl}`.toLowerCase();

  // Score chaque persona
  const scores: Record<string, number> = {};
  for (const [persona, keywords] of Object.entries(PERSONA_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (text.includes(kw.toLowerCase())) score++;
    }
    if (score > 0) scores[persona] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

  const primary = (sorted[0]?.[0] || "other") as PersonaSegment;
  const secondary = sorted.slice(1, 5).map(s => s[0] as PersonaSegment);

  // Déduire la démographie
  let ageRange = "25-54";
  if (/young|gen z|student|college|teen/i.test(text)) ageRange = "18-30";
  else if (/senior|retire|golden|over 60|medicare/i.test(text)) ageRange = "55+";
  else if (/parent|family|kids|baby/i.test(text)) ageRange = "28-45";
  else if (/career|professional|business/i.test(text)) ageRange = "25-50";

  let gender = "All";
  if (/\b(?:men|man|male|him|his|guy|gentleman)\b/i.test(text)) gender = "Male";
  else if (/\b(?:women|woman|female|her|she|lady|girl)\b/i.test(text)) gender = "Female";

  let income = "Middle";
  if (/luxury|premium|exclusive|high-end|invest/i.test(text)) income = "High";
  else if (/cheap|budget|affordable|save|free|discount/i.test(text)) income = "Low-Medium";

  let education = "All";
  if (/professional|expert|degree|university|certified/i.test(text)) education = "Higher";

  let location = "Global";
  if (/\.fr|france|français/i.test(text)) location = "France";
  else if (/\.uk|united kingdom|british/i.test(text)) location = "UK";
  else if (/\.us|america|united states/i.test(text)) location = "USA";

  // Psychographics
  const psychographics: string[] = [];
  if (/health|wellness|fitness/i.test(text)) psychographics.push("Health-oriented");
  if (/technology|ai|digital|app/i.test(text)) psychographics.push("Tech-savvy");
  if (/premium|luxury|exclusive/i.test(text)) psychographics.push("Quality-conscious");
  if (/free|discount|save|deal/i.test(text)) psychographics.push("Price-sensitive");
  if (/easy|simple|quick|instant/i.test(text)) psychographics.push("Convenience-seeker");
  if (/community|join|together/i.test(text)) psychographics.push("Social-oriented");
  if (/security|protect|safe|privacy/i.test(text)) psychographics.push("Risk-averse");
  if (/learn|discover|master|education/i.test(text)) psychographics.push("Knowledge-seeker");

  // Pain points
  const painPoints: string[] = [];
  const painPatterns: Record<string, RegExp> = {
    "Weight struggles": /weight|fat|obesity|overweight|diet/i,
    "Skin problems": /acne|wrinkle|aging|skin problem|blemish/i,
    "Loneliness": /single|lonely|alone|find love|dating/i,
    "Financial stress": /money|debt|bills|income|afford/i,
    "Career stagnation": /stuck|promotion|career|job|salary/i,
    "Health issues": /pain|sick|illness|symptom|diagnosis/i,
    "Sleep problems": /insomnia|sleep|tired|fatigue|rest/i,
    "Anxiety/Stress": /anxiety|stress|depression|mental|overwhelm/i,
    "Lack of knowledge": /don't know|confused|lost|uncertain|unclear/i,
    "Time pressure": /busy|no time|rush|overwhelmed|too much/i,
  };

  for (const [pain, regex] of Object.entries(painPatterns)) {
    if (regex.test(text)) painPoints.push(pain);
  }

  // Desires
  const desires: string[] = [];
  const desirePatterns: Record<string, RegExp> = {
    "Look better": /beautiful|attractive|glow|young|style/i,
    "Feel healthier": /health|energy|vitality|wellness|fit/i,
    "Find love": /love|relationship|partner|soulmate|match/i,
    "Make more money": /income|earn|profit|wealth|financial/i,
    "Save time": /time|fast|quick|instant|efficient/i,
    "Feel confident": /confidence|self-esteem|empower|strong/i,
    "Learn something new": /learn|discover|master|skill|knowledge/i,
    "Be safe/secure": /safe|secure|protect|privacy|guard/i,
    "Have fun": /fun|exciting|amazing|entertain|enjoy/i,
    "Find purpose": /purpose|meaning|destiny|spiritual|cosmic/i,
  };

  for (const [desire, regex] of Object.entries(desirePatterns)) {
    if (regex.test(text)) desires.push(desire);
  }

  const maxScore = sorted[0]?.[1] || 1;
  const confidence = Math.min(maxScore / 5, 1);

  return {
    primary,
    secondary,
    demographics: { age_range: ageRange, gender, income, education, location },
    psychographics,
    pain_points: painPoints,
    desires,
    confidence: Math.round(confidence * 100) / 100,
  };
}

export function determineTone(headline: string, body: string): AdInsight["creative_tone"] {
  const text = `${headline} ${body}`.toLowerCase();
  if (/fear|danger|risk|warning|protect|before/i.test(text)) return "fear_based";
  if (/now|limited|hurry|urgent|last chance|act fast/i.test(text)) return "urgent";
  if (/lol|funny|hilarious|joke|awkward|relatable/i.test(text)) return "humorous";
  if (/amazing|incredible|transform|dream|achieve|inspire/i.test(text)) return "inspirational";
  if (/guaranteed|proven|trusted|certified|science|data/i.test(text)) return "trust_based";
  if (/feel|love|hate|heart|soul|emotional|cry/i.test(text)) return "emotional";
  return "rational";
}

export function determineOfferType(cta: string, body: string): AdInsight["offer_type"] {
  const text = `${cta} ${body}`.toLowerCase();
  if (/free trial|try free|try it free|start free/i.test(text)) return "free_trial";
  if (/\d+%\s*off|discount|save|coupon|deal/i.test(text)) return "discount";
  if (/money back|refund|guarantee/i.test(text)) return "money_back";
  if (/subscribe|subscription|monthly|annual|plan/i.test(text)) return "subscription";
  if (/buy|purchase|one.time|lifetime/i.test(text)) return "one_time";
  if (/free|freemium|upgrade/i.test(text)) return "freemium";
  if (/consult|book|schedule|call/i.test(text)) return "consultation";
  return "subscription";
}

export function determineFunnelStage(headline: string, body: string, cta: string): AdInsight["funnel_stage"] {
  const text = `${headline} ${body} ${cta}`.toLowerCase();
  if (/discover|learn|what is|how to|guide|tips|why/i.test(text)) return "awareness";
  if (/compare|review|best|vs|alternative|why choose/i.test(text)) return "consideration";
  if (/buy|order|get started|sign up|try|start now|download/i.test(text)) return "conversion";
  if (/upgrade|renew|refer|share|come back|welcome back/i.test(text)) return "retention";
  return "consideration";
}

/**
 * Analyse complète d'une publicité.
 */
export function analyzeAd(ad: {
  headline: string;
  body: string;
  cta: string;
  landing_url: string;
}): AdInsight {
  const { headline, body, cta, landing_url } = ad;

  return {
    angle: analyzeAngle(headline, body, cta),
    keywords: analyzeKeywords(headline, body, cta),
    persona: analyzePersona(headline, body, cta, landing_url),
    creative_tone: determineTone(headline, body),
    offer_type: determineOfferType(cta, body),
    funnel_stage: determineFunnelStage(headline, body, cta),
  };
}

/**
 * Analyse en batch de toutes les ads d'un advertiser.
 * Retourne un résumé stratégique agrégé.
 */
export function generateStrategicSummary(insights: AdInsight[]): {
  dominant_angles: { angle: AngleType; count: number; percentage: number }[];
  dominant_personas: { persona: PersonaSegment; count: number; percentage: number }[];
  dominant_themes: string[];
  dominant_tones: string[];
  dominant_offers: string[];
  dominant_funnel_stages: string[];
  top_keywords: string[];
  recommended_counter_angles: string[];
} {
  // Compter les angles
  const angleCounts: Record<string, number> = {};
  const personaCounts: Record<string, number> = {};
  const themeCounts: Record<string, number> = {};
  const toneCounts: Record<string, number> = {};
  const offerCounts: Record<string, number> = {};
  const funnelCounts: Record<string, number> = {};
  const keywordCounts: Record<string, number> = {};

  for (const ins of insights) {
    angleCounts[ins.angle.primary] = (angleCounts[ins.angle.primary] || 0) + 1;
    personaCounts[ins.persona.primary] = (personaCounts[ins.persona.primary] || 0) + 1;
    toneCounts[ins.creative_tone] = (toneCounts[ins.creative_tone] || 0) + 1;
    offerCounts[ins.offer_type] = (offerCounts[ins.offer_type] || 0) + 1;
    funnelCounts[ins.funnel_stage] = (funnelCounts[ins.funnel_stage] || 0) + 1;

    for (const theme of ins.keywords.themes) {
      themeCounts[theme] = (themeCounts[theme] || 0) + 1;
    }
    for (const kw of ins.keywords.keywords.slice(0, 5)) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    }
  }

  const total = insights.length || 1;

  const dominantAngles = Object.entries(angleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([angle, count]) => ({
      angle: angle as AngleType,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  const dominantPersonas = Object.entries(personaCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([persona, count]) => ({
      persona: persona as PersonaSegment,
      count,
      percentage: Math.round((count / total) * 100),
    }));

  // Recommander des angles de contre-attaque
  const counterAngles: string[] = [];
  const dominant = dominantAngles[0]?.angle;
  if (dominant === "pain_point") counterAngles.push("Utiliser aspiration + transformation (positif vs négatif)");
  if (dominant === "fear") counterAngles.push("Utiliser trust + risk_reduction (rassurer vs effrayer)");
  if (dominant === "urgency") counterAngles.push("Utiliser social_proof + authority (crédibilité vs pression)");
  if (dominant === "social_proof") counterAngles.push("Utiliser uniqueness + comparison (différenciation vs conformité)");
  if (dominant === "savings") counterAngles.push("Utiliser premium + quality (valeur vs prix)");
  counterAngles.push("Tester curiosity_gap (angle non exploité)");
  counterAngles.push("Tester education (positionner comme expert)");
  counterAngles.push("Tester community (créer un sentiment d'appartenance)");

  return {
    dominant_angles: dominantAngles,
    dominant_personas: dominantPersonas,
    dominant_themes: Object.entries(themeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]),
    dominant_tones: Object.entries(toneCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
    dominant_offers: Object.entries(offerCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
    dominant_funnel_stages: Object.entries(funnelCounts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
    top_keywords: Object.entries(keywordCounts).sort((a, b) => b[1] - a[1]).slice(0, 20).map(e => e[0]),
    recommended_counter_angles: counterAngles,
  };
}
