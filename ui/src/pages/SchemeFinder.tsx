import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, HelpCircle, ExternalLink, ArrowLeft, Sparkles, AlertCircle } from 'lucide-react';

type Answers = {
  gender?: 'male' | 'female' | 'other';
  student?: 'yes' | 'no';
  farmer?: 'yes' | 'no';
  bpl?: 'yes' | 'no';
  senior?: 'yes' | 'no';
  aadhaar?: 'yes' | 'no';
};

type CheckResult = { ok: boolean | null; reason?: string };

type Scheme = {
  name: string;
  desc: string;
  category: 'farmer' | 'student' | 'women' | 'senior' | 'general';
  benefit: string;
  docs: string[];
  url: string;
  domain: string;
  check: (a: Answers) => CheckResult;
};

const schemes: Scheme[] = [
  {
    name: 'PM-Kisan Samman Nidhi',
    desc: 'Income support of ₹6,000 per year for eligible farmer families.',
    category: 'farmer',
    benefit: '₹6,000/yr',
    docs: ['Aadhaar', 'Land record', 'Bank account'],
    url: 'https://pmkisan.gov.in/',
    domain: 'pmkisan.gov.in',
    check: a => a.farmer === undefined ? { ok: null } : a.farmer === 'yes' ? { ok: true } : { ok: false, reason: 'Requires farmer status — you indicated you are not a farmer.' },
  },
  {
    name: 'Ayushman Bharat (PM-JAY)',
    desc: 'Cashless health cover up to ₹5 lakh per family per year.',
    category: 'general',
    benefit: '₹5,00,000',
    docs: ['Aadhaar', 'Ration card'],
    url: 'https://beneficiary.nha.gov.in/',
    domain: 'nha.gov.in',
    check: a => (a.bpl === undefined && a.senior === undefined) ? { ok: null } : (a.bpl === 'yes' || a.senior === 'yes') ? { ok: true } : { ok: false, reason: 'Typically requires BPL status or age 70+ — neither matched your answers.' },
  },
  {
    name: 'PM Ujjwala Yojana',
    desc: 'Free LPG connection for women from BPL households.',
    category: 'women',
    benefit: 'Free connection',
    docs: ['Aadhaar', 'BPL card'],
    url: 'https://www.pmuy.gov.in/',
    domain: 'pmuy.gov.in',
    check: a => (a.gender === undefined && a.bpl === undefined) ? { ok: null } : (a.gender === 'female' && a.bpl === 'yes') ? { ok: true } : { ok: false, reason: a.gender !== 'female' ? 'Scheme is limited to women applicants.' : 'Requires BPL household status.' },
  },
  {
    name: 'PM Shram Yogi Maandhan',
    desc: 'Monthly pension for unorganised workers after age 60.',
    category: 'senior',
    benefit: '₹3,000/mo',
    docs: ['Aadhaar', 'Bank account'],
    url: 'https://maandhan.in/',
    domain: 'maandhan.in',
    check: a => a.senior === undefined ? { ok: null } : a.senior === 'yes' ? { ok: true } : { ok: false, reason: 'Pension applies from age 60 onward — you indicated you are not a senior citizen yet.' },
  },
  {
    name: 'National Means-cum-Merit Scholarship',
    desc: 'Scholarship for meritorious students from economically weaker sections.',
    category: 'student',
    benefit: '₹12,000/yr',
    docs: ['Aadhaar', 'Income certificate'],
    url: 'https://scholarships.gov.in/',
    domain: 'scholarships.gov.in',
    check: a => a.student === undefined ? { ok: null } : a.student === 'yes' ? { ok: true } : { ok: false, reason: 'Only open to currently enrolled students.' },
  },
  {
    name: 'PM Jan Dhan Yojana',
    desc: 'Zero-balance bank account with free debit card and insurance.',
    category: 'general',
    benefit: 'Zero balance',
    docs: ['Aadhaar', 'Address proof'],
    url: 'https://www.pmjdy.gov.in/',
    domain: 'pmjdy.gov.in',
    check: a => a.aadhaar === undefined ? { ok: null } : a.aadhaar === 'yes' ? { ok: true } : { ok: false, reason: 'Aadhaar is required to open the account under this scheme.' },
  },
];

const categories: { id: 'all' | Scheme['category']; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'farmer', label: 'Farmer' },
  { id: 'student', label: 'Student' },
  { id: 'women', label: 'Women' },
  { id: 'senior', label: 'Senior citizen' },
  { id: 'general', label: 'General' },
];

const stepFields: (keyof Answers)[][] = [
  ['gender', 'student'],
  ['farmer', 'bpl'],
  ['senior', 'aadhaar'],
];

function ChoiceRow({ options, value, onChange }: { options: { value: string; label: string }[]; value: string | undefined; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map(o => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              active
                ? 'bg-saffron-500 border-saffron-500 text-white'
                : 'border-slate-300 dark:border-white/15 text-slate-600 dark:text-slate-300 hover:border-saffron-400'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function SchemeFinder() {
  const [phase, setPhase] = useState<'landing' | 'wizard' | 'results'>('landing');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [skipped, setSkipped] = useState(false);
  const [warn, setWarn] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'eligible' | 'not-eligible'>('all');
  const [activeCategory, setActiveCategory] = useState<'all' | Scheme['category']>('all');

  const totalSteps = stepFields.length;
  const currentFields = stepFields[step];
  const stepComplete = currentFields.every(f => answers[f] !== undefined);

  function startWizard() {
    setPhase('wizard');
    setStep(0);
  }

  function skipToResults() {
    setSkipped(true);
    setPhase('results');
  }

  function goNext() {
    if (!stepComplete) { setWarn(true); return; }
    setWarn(false);
    if (step < totalSteps - 1) setStep(s => s + 1);
    else setPhase('results');
  }

  function goBack() {
    if (step > 0) setStep(s => s - 1);
  }

  function startOver() {
    setPhase('landing');
    setStep(0);
    setSkipped(false);
    setWarn(false);
    setAnswers({});
  }

  const evaluated = useMemo(
    () => schemes.map(s => ({ ...s, result: s.check(answers) })),
    [answers]
  );

  const filtered = evaluated.filter(s => {
    const q = search.trim().toLowerCase();
    const matchesQuery = s.name.toLowerCase().includes(q) || s.desc.toLowerCase().includes(q);
    const status = s.result.ok === null ? 'unknown' : s.result.ok ? 'eligible' : 'not-eligible';
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    return matchesQuery && matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-16">
      {phase === 'landing' && (
        <div className="bg-navy-950 rounded-3xl px-8 py-12 text-center">
          <p className="text-[11px] uppercase tracking-wider text-white/50 mb-2">National portal of India</p>
          <h2 className="text-2xl font-semibold text-white relative inline-block mb-1">
            Government schemes
            <span className="block w-16 h-[3px] bg-red-500 mx-auto mt-1.5 rounded-full" />
          </h2>
          <p className="text-base font-medium text-white mt-7 mb-1.5">Find personalised schemes</p>
          <p className="text-[13px] text-white/45 mb-5 max-w-md mx-auto">
            Answer a few quick questions for more accurate results, or skip straight to browsing.
          </p>
          <button
            onClick={startWizard}
            className="bg-white text-navy-950 rounded-full px-6 py-2.5 text-sm font-medium hover:-translate-y-0.5 transition-transform"
          >
            Check your eligibility
          </button>
          <p className="mt-5 text-[11.5px] text-white/40">
            Powered by <span className="bg-white/10 px-2 py-0.5 rounded-md text-white">myScheme</span>
          </p>
        </div>
      )}

      {phase === 'wizard' && (
        <div className="bg-navy-950 rounded-3xl p-8 flex flex-wrap gap-8">
          <div className="flex-1 min-w-[220px] flex flex-col items-center text-center justify-center">
            <Sparkles className="text-white/25 mb-4" size={48} />
            <h3 className="text-xl font-medium text-white mb-1.5">Find the best schemes for you</h3>
            <p className="text-[13px] text-white/50 mb-3">Step {step + 1} of {totalSteps}</p>
            <div className="flex gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span key={i} className={`w-2 h-2 rounded-full ${i === step ? 'bg-saffron-400' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>

          <div className="flex-[1.4] min-w-[260px]">
            <p className="text-[11px] text-white/40 mb-1.5">
              Required fields marked with an asterisk (*) — or skip straight to results.
            </p>

            {step === 0 && (
              <div>
                <p className="text-sm font-medium text-white mb-2.5">You are a <span className="text-red-400">*</span></p>
                <div className="mb-4">
                  <ChoiceRow
                    options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }, { value: 'other', label: 'Other' }]}
                    value={answers.gender}
                    onChange={v => setAnswers(a => ({ ...a, gender: v as Answers['gender'] }))}
                  />
                </div>
                <p className="text-sm font-medium text-white mb-2.5">Are you a student? <span className="text-red-400">*</span></p>
                <ChoiceRow
                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                  value={answers.student}
                  onChange={v => setAnswers(a => ({ ...a, student: v as Answers['student'] }))}
                />
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="text-sm font-medium text-white mb-2.5">Are you a farmer? <span className="text-red-400">*</span></p>
                <div className="mb-4">
                  <ChoiceRow
                    options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                    value={answers.farmer}
                    onChange={v => setAnswers(a => ({ ...a, farmer: v as Answers['farmer'] }))}
                  />
                </div>
                <p className="text-sm font-medium text-white mb-2.5">Do you belong to BPL category? <span className="text-red-400">*</span></p>
                <ChoiceRow
                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                  value={answers.bpl}
                  onChange={v => setAnswers(a => ({ ...a, bpl: v as Answers['bpl'] }))}
                />
              </div>
            )}

            {step === 2 && (
              <div>
                <p className="text-sm font-medium text-white mb-2.5">Are you a senior citizen (60+)? <span className="text-red-400">*</span></p>
                <div className="mb-4">
                  <ChoiceRow
                    options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                    value={answers.senior}
                    onChange={v => setAnswers(a => ({ ...a, senior: v as Answers['senior'] }))}
                  />
                </div>
                <p className="text-sm font-medium text-white mb-2.5">Do you have a valid Aadhaar? <span className="text-red-400">*</span></p>
                <ChoiceRow
                  options={[{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]}
                  value={answers.aadhaar}
                  onChange={v => setAnswers(a => ({ ...a, aadhaar: v as Answers['aadhaar'] }))}
                />
              </div>
            )}

            {warn && (
              <p className="flex items-center gap-1.5 text-xs text-red-300 mt-2.5">
                <AlertCircle size={14} /> Please answer both questions to continue with the guided flow.
              </p>
            )}

            <div className="flex items-center gap-2.5 mt-4 flex-wrap">
              {step > 0 && (
                <button onClick={goBack} className="border border-white/25 text-white/70 px-4 py-2 rounded-lg text-[13px]">
                  Back
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!stepComplete}
                className="bg-white text-navy-950 px-5 py-2 rounded-lg text-[13px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button onClick={skipToResults} className="ml-auto text-[12.5px] text-white/45 underline">
                Skip to results
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === 'results' && (
        <div>
          <button onClick={startOver} className="flex items-center gap-1 text-[12.5px] text-saffron-500 mb-3.5">
            <ArrowLeft size={14} /> Start over
          </button>
          <div className="mb-5">
            <h3 className="text-lg font-medium text-slate-900 dark:text-white">Schemes for you</h3>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1">
              {skipped ? 'Showing all schemes — answer questions for personalised eligibility' : 'Based on your answers'}
            </p>
          </div>

          <div className="flex gap-2 mb-3 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search schemes..."
              className="flex-1 min-w-[160px] rounded-lg border border-slate-300 dark:border-white/15 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400"
            />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className="min-w-[160px] rounded-lg border border-slate-300 dark:border-white/15 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-white"
            >
              <option value="all">All statuses</option>
              <option value="eligible">Eligible</option>
              <option value="not-eligible">Not eligible</option>
            </select>
          </div>

          <div className="flex gap-1.5 mb-4 flex-wrap">
            {categories.map(c => {
              const active = c.id === activeCategory;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`text-[12.5px] px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? 'border-saffron-500 bg-saffron-500/10 text-saffron-600 dark:text-saffron-400 font-medium'
                      : 'border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No schemes match your search.</p>
          ) : (
            <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
              {filtered.map(s => {
                const state = s.result.ok === null ? 'unknown' : s.result.ok ? 'eligible' : 'not-eligible';
                const badge =
                  state === 'eligible'
                    ? { cls: 'bg-green-500/10 text-green-600 dark:text-green-400', icon: <CheckCircle2 size={13} />, label: 'Eligible' }
                    : state === 'not-eligible'
                    ? { cls: 'bg-red-500/10 text-red-600 dark:text-red-400', icon: <XCircle size={13} />, label: 'Not eligible' }
                    : { cls: 'bg-slate-500/10 text-slate-500 dark:text-slate-400', icon: <HelpCircle size={13} />, label: 'Answer questions to check' };

                return (
                  <div key={s.name} className="card p-4.5 flex flex-col">
                    <div className="flex items-center justify-between mb-3.5">
                      <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${badge.cls}`}>
                        {badge.icon}{badge.label}
                      </span>
                    </div>
                    <h4 className="text-[14.5px] font-medium text-slate-900 dark:text-white mb-1.5">{s.name}</h4>
                    <p className="text-[13px] leading-relaxed text-slate-500 dark:text-slate-400 mb-2.5">{s.desc}</p>
                    {state === 'not-eligible' && (
                      <p className={`text-xs leading-relaxed rounded-lg px-2.5 py-2 mb-3.5 ${badge.cls}`}>
                        {s.result.reason}
                      </p>
                    )}
                    <div className="border-t border-slate-200 dark:border-white/10 pt-3 mb-3">
                      <p className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-1.5">Documents required</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.docs.map(d => (
                          <span key={d} className="text-[11.5px] text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 rounded-full px-2 py-0.5">
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{s.benefit}</p>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[12.5px] font-medium text-saffron-600 dark:text-saffron-400"
                      >
                        Apply on {s.domain} <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
