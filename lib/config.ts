import type { Venture, VentureInfo } from '@/types';

// ─── App-wide configuration ───────────────────────────────────────────────────
// Values can be overridden via .env.local (see .env.local.example)

export const CONFIG = {
  clientId:
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    '371728085947-24bpmu41akpf73pqtc4pp3jtg12gsjps.apps.googleusercontent.com',

  geminiApiKey:
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    'AIzaSyBWTtFpBN2D8OD8Tb7HH8RGw5a7AMQy83c',

  supabaseUrl:
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://gnpwlomohmzmokdsuokc.supabase.co',

  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_KEY ||
    'sb_publishable_DgzetYVlgK_fQRWeLgHOPA_CuNIaJB2',

  // Current stage per venture (1=Ideation 2=Problem 3=Solution 4=Formation 5=Growth)
  ventureStages: {
    flowar:       4,
    homeservices: 3,
    legal:        4,
    dental:       3,
    voice:        3,
    general:      0,
  } as Record<Venture, number>,

  // Google Tasks list name → venture key
  listMap: {
    'AR Collection Agent':      'flowar',
    'Voice Agent':              'voice',
    'My Tasks':                 'general',
    'Home Services':            'homeservices',
    'Legal Receptionist Agent': 'legal',
    'Dental Project':           'dental',
  } as Record<string, Venture>,

  // Capacity estimation
  effortHours:    1.5,  // hours per effort point
  weeklyCapacity: 15,   // target hours/week (midpoint of 10–20hr range)
} as const;

// ─── Venture metadata ─────────────────────────────────────────────────────────

export const VENTURES: VentureInfo[] = [
  { key: 'flowar',       label: 'FlowAR',       cssVar: 'var(--flowar)',       hex: '#3b82f6', stage: CONFIG.ventureStages.flowar       },
  { key: 'homeservices', label: 'HomeServices',  cssVar: 'var(--homeservices)', hex: '#22c55e', stage: CONFIG.ventureStages.homeservices },
  { key: 'legal',        label: 'Legal Agent',   cssVar: 'var(--legal)',        hex: '#a855f7', stage: CONFIG.ventureStages.legal        },
  { key: 'dental',       label: 'Sona/Dental',   cssVar: 'var(--dental)',       hex: '#f97316', stage: CONFIG.ventureStages.dental       },
  { key: 'voice',        label: 'Voice Platform',cssVar: 'var(--voice)',        hex: '#14b8a6', stage: CONFIG.ventureStages.voice        },
  { key: 'general',      label: 'General',       cssVar: 'var(--general)',      hex: '#64748b', stage: CONFIG.ventureStages.general      },
];

export const VENTURE_MAP = Object.fromEntries(VENTURES.map(v => [v.key, v])) as Record<Venture, VentureInfo>;

// ─── Stage labels ─────────────────────────────────────────────────────────────

export const STAGE_LABELS: Record<number, string> = {
  0: '—',
  1: 'Ideation',
  2: 'Problem/Solution',
  3: 'Solution Validation',
  4: 'Company Formation',
  5: 'Growth',
};

// ─── Playbook artifacts (global, stage-aware) ─────────────────────────────────
// Each artifact has an `expected` map: stage → expected status, or null = N/A at that stage.
// Status cycle: 'default' → 'started' → 'updated' → 'finalized' → 'referenced' → (back)

export interface PlaybookArtifact {
  name: string;
  expected: Record<number, string | null>;
}

export const PLAYBOOK_DATA: PlaybookArtifact[] = [
  { name: 'One Pager',           expected: { 1:'started', 2:'updated', 3:'finalized', 4:'updated',   5:null        } },
  { name: 'Market Sizing',       expected: { 1:'started', 2:'updated', 3:'finalized', 4:'updated',   5:null        } },
  { name: 'Competitive Analysis',expected: { 1:'started', 2:'updated', 3:'finalized', 4:'updated',   5:null        } },
  { name: 'Assumptions List',    expected: { 1:'started', 2:'updated', 3:'finalized', 4:'finalized', 5:'referenced'} },
  { name: 'Interviews',          expected: { 1:'started', 2:'updated', 3:'finalized', 4:'referenced',5:null        } },
  { name: 'Cold Outreach',       expected: { 1:'started', 2:'updated', 3:'updated',   4:'updated',   5:'referenced'} },
  { name: 'Personas',            expected: { 1:'started', 2:'updated', 3:'finalized', 4:'referenced',5:'referenced'} },
  { name: 'Product Strategy',    expected: { 1:'started', 2:'updated', 3:'finalized', 4:'finalized', 5:'updated'   } },
  { name: 'PRD',                 expected: { 1:null,      2:'started', 3:'finalized', 4:'referenced',5:'referenced'} },
  { name: 'Solution Interviews', expected: { 1:null,      2:null,      3:'started',   4:'referenced',5:null        } },
  { name: 'Prototypes',          expected: { 1:null,      2:'updated', 3:'finalized', 4:'referenced',5:'updated'   } },
  { name: 'MVP Scope',           expected: { 1:null,      2:null,      3:'updated',   4:'finalized', 5:'referenced'} },
  { name: 'Sales Materials',     expected: { 1:null,      2:null,      3:'finalized', 4:'updated',   5:'updated'   } },
  { name: 'Pilot Agreement',     expected: { 1:null,      2:null,      3:'finalized', 4:'updated',   5:'referenced'} },
  { name: 'Founder Briefing',    expected: { 1:null,      2:'started', 3:'finalized', 4:'updated',   5:'referenced'} },
  { name: 'Validation Memo',     expected: { 1:null,      2:null,      3:'finalized', 4:'referenced',5:null        } },
  { name: 'Scorecards',          expected: { 1:null,      2:null,      3:'finalized', 4:'referenced',5:null        } },
];

export const PLAYBOOK_STATUS_CYCLE = ['default', 'started', 'updated', 'finalized', 'referenced'];
export const PLAYBOOK_STATUS_ICONS: Record<string, string> = {
  default:    '⬜', started:  '🟢', updated: '✏️',
  finalized:  '⭐', referenced:'👁️', na: '—',
};
export const PLAYBOOK_STATUS_LABELS: Record<string, string> = {
  default:    'Expected', started:   'Started',    updated:  'In progress',
  finalized:  'Done ✓',  referenced: 'Referenced', na:       'N/A',
};

// Keep PLAYBOOK_ARTIFACTS for any legacy code that might reference it
export const PLAYBOOK_ARTIFACTS: Record<string, string[]> = {};
