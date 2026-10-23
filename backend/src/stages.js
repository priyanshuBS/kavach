// The five stages of a "digital arrest" scam call, and the rule patterns
// (English, Hinglish and Hindi/Devanagari) that hint at each stage.
//
// Every pattern has a weight. A stage's rule score for a piece of text is the
// sum of the weights of all patterns that matched, capped at 0.95.
// Strong, specific phrases ("CBI", "digital arrest") get high weights.
// Common words that also appear in genuine calls ("police", "amount") get low
// weights, so on their own they never mark a stage as detected.

export const STAGES = [
  {
    id: 'impersonation',
    label: 'Fake officer',
    description: 'Caller claims to be CBI, police, customs, TRAI, RBI, ED, NCB…',
    patterns: [
      [/\bc\.?\s?b\.?\s?i\b/i, 0.8],
      [/crime\s*branch/i, 0.7],
      [/cyber\s*(cell|crime|police)/i, 0.6],
      [/\b(n\.?c\.?b|narcotics\s*control)\b/i, 0.7],
      [/enforcement\s*directorate|\bE\.D\.?\s+(officer|se|department)/i, 0.7],
      [/\b(customs|income\s*tax)\s*(officer|department|vibhag|se)/i, 0.6],
      [/\bt\.?r\.?a\.?i\b/i, 0.5],
      [/\b(i\.?p\.?s|d\.?c\.?p|s\.?h\.?o|a\.?c\.?p)\b/i, 0.5],
      [/\b(inspector|sub[-\s]?inspector|commissioner)\b/i, 0.4],
      [/\bpolice\b/i, 0.35],
      [/(officer|adhikari|afsar)\s*(bol|baat)\s*(raha|rahi)/i, 0.5],
      [/(supreme\s*court|high\s*court)\s*(judge|order|se)/i, 0.5],
      [/\bR\.?B\.?I\b.*(officer|se\s*bol)/i, 0.5],
      [/सीबीआई|क्राइम\s*ब्रांच|साइबर\s*सेल|नारकोटिक्स|कस्टम/, 0.75],
      [/पुलिस|इंस्पेक्टर|अधिकारी|ऑफिसर|डीसीपी|आईपीएस/, 0.35],
    ],
  },
  {
    id: 'accusation',
    label: 'Accusation',
    description: 'You are linked to drugs, money laundering, a parcel, an FIR…',
    patterns: [
      [/money\s*laundering/i, 0.8],
      [/\b(drugs?|narcotics|md\s*drugs|mdma)\b/i, 0.55],
      [/\bparcel\b/i, 0.3],
      [/arrest\s*warrant|warrant\s*(issue|nikal|jaari)/i, 0.7],
      [/\bF\.?I\.?R\b/i, 0.45],
      [/case\s*(registered|filed|darj|hua\s*hai|banta)/i, 0.5],
      [/(aadhaar|aadhar|pan\s*card|sim\s*card|bank\s*account)\s*.{0,40}(misuse|illegal|used|linked|link|istemal|use\s*hua)/i, 0.6],
      [/human\s*trafficking|terror(ist)?\s*funding|hawala/i, 0.7],
      [/(illegal|fraud|criminal)\s*(activit|case|transaction)/i, 0.45],
      [/(aap|you)\s*(are|pe|par|ke\s*khilaf).{0,20}(accused|suspect|case|involved|shamil)/i, 0.6],
      [/मनी\s*लॉन्ड्रिंग|ड्रग्स|गिरफ्तारी\s*वारंट|अरेस्ट\s*वारंट|हवाला/, 0.7],
      [/एफआईआर|केस\s*दर्ज|पार्सल|आधार.{0,30}(गलत|इस्तेमाल|लिंक)/, 0.45],
    ],
  },
  {
    id: 'isolation',
    label: 'Isolation',
    description: '"Don\'t tell anyone", "stay on camera", "don\'t cut the call"',
    patterns: [
      [/digital(ly)?\s*arrest/i, 0.9],
      [/(don'?t|do\s*not|never)\s*(tell|inform|share|discuss).{0,30}(anyone|family|anybody|nobody|bank)/i, 0.75],
      [/kisi\s*(ko|se)\s*(bhi\s*)?(mat|nahi|na)\s*(bata|bol|baat|kehna)/i, 0.75],
      [/(stay|remain|be)\s*(on|in\s*front\s*of)\s*(the\s*)?(camera|video|call|line)/i, 0.7],
      [/camera\s*(on|chalu|band\s*mat)/i, 0.6],
      [/(don'?t|do\s*not)\s*(disconnect|cut|end|hang\s*up)/i, 0.6],
      [/(call|phone|video)\s*(mat|nahi)\s*(kaat|kaatna|kato|band)/i, 0.6],
      [/(room|ghar|kamre)\s*(se\s*)?(bahar\s*mat|mat\s*nikal)/i, 0.6],
      [/(national\s*security|confidential|secret)\s*(matter|case|investigation|hai)?/i, 0.45],
      [/(gopniya|gupt)/i, 0.45],
      [/डिजिटल\s*अरेस्ट/, 0.9],
      [/किसी\s*(को|से)\s*(भी\s*)?(मत|नहीं|ना)\s*(बता|बोल|बात)/, 0.75],
      [/कैमरा\s*(ऑन|चालू)|फोन\s*मत\s*काट|कॉल\s*मत\s*काट|गोपनीय/, 0.6],
    ],
  },
  {
    id: 'urgency',
    label: 'Urgency / threat',
    description: 'Arrest right now, jail, "within 2 hours", "last chance"',
    patterns: [
      [/(within|in)\s*(the\s*)?(next\s*)?\d+\s*(hours?|minutes?|mins?)/i, 0.5],
      [/\d+\s*(ghante|ghanton|minute)\s*(mein|me|ke\s*andar)/i, 0.5],
      [/\b(immediately|right\s*now|urgent(ly)?)\b/i, 0.3],
      [/\b(turant|abhi\s*ke\s*abhi|jaldi\s*karo)\b/i, 0.35],
      [/\b(jail|prison|custody|lock[-\s]?up)\b/i, 0.45],
      [/(arrest|giraftar|giraftaar)\s*(kar|ho|kiya|you|will)/i, 0.55],
      [/(last|final)\s*(chance|warning)|aakhri\s*(mauka|chance)/i, 0.5],
      [/\b(otherwise|warna|nahi\s*to)\b/i, 0.25],
      [/(team|police)\s*(is|aa\s*rahi|on\s*the\s*way|bhej)/i, 0.45],
      [/तुरंत|अभी\s*के\s*अभी|जेल|गिरफ्तार|आखिरी\s*मौका|घंटे\s*में/, 0.45],
      [/वरना|नहीं\s*तो/, 0.25],
    ],
  },
  {
    id: 'money',
    label: 'Money demand',
    description: 'Transfer money to a "safe" / RBI / verification account',
    patterns: [
      [/(safe|secure|secret|supervised|rbi|government|verification)\s*(account|khata)/i, 0.85],
      [/(transfer|bhej|jama|deposit)\s*.{0,25}(money|paise|paisa|amount|rupees|funds|savings)/i, 0.6],
      [/(money|paise|paisa|amount|funds|savings)\s*.{0,25}(transfer|bhej|jama|deposit)/i, 0.6],
      [/\b(rtgs|neft|imps)\b/i, 0.5],
      [/\bupi\b|google\s*pay|phone\s*pe|paytm/i, 0.3],
      [/(fixed\s*deposit|\bf\.?d\b).{0,20}(break|tod|todo|todna|close)/i, 0.7],
      [/(refund|wapas|return).{0,30}(after|baad).{0,20}(verification|investigation|jaanch)/i, 0.7],
      [/(account|bank)\s*(number|details|balance)\s*(batao|bataiye|share|tell|kitna)/i, 0.5],
      [/(₹|rs\.?|rupees?)\s*\d|\d+\s*(lakh|crore|lac)/i, 0.25],
      [/सेफ\s*अकाउंट|आरबीआई\s*(खाता|अकाउंट)|पैसे\s*(ट्रांसफर|भेज|जमा)|ट्रांसफर\s*कर/, 0.7],
      [/लाख|करोड़|खाता\s*नंबर|बैलेंस/, 0.25],
    ],
  },
];

export const STAGE_IDS = STAGES.map((s) => s.id);

/**
 * Run the rule patterns on one piece of text.
 * Returns { stageId: { score, matches: [matched text, …] } } for stages that matched.
 */
export function ruleScores(text) {
  const result = {};
  for (const stage of STAGES) {
    let score = 0;
    const matches = [];
    for (const [re, weight] of stage.patterns) {
      const m = text.match(re);
      if (m) {
        score += weight;
        matches.push(m[0].trim());
      }
    }
    if (score > 0) result[stage.id] = { score: Math.min(0.95, score), matches };
  }
  return result;
}
