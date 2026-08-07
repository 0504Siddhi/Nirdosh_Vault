import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Search,
  Info,
  Sprout,
  GraduationCap,
  UserRound,
  HeartHandshake,
  Landmark,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ShieldCheck,
  Grid,
} from 'lucide-react';
import type {
  Answers,
  SchemeCategory,
  SchemeMatchStatus,
} from '../types/schemes';
import { schemes, categories, stepFields } from '../data/schemes';

function getCategoryIcon(cat: SchemeCategory | 'all') {
  switch (cat) {
    case 'farmer':
      return <Sprout size={14} className="shrink-0 text-emerald-600 dark:text-emerald-400" />;
    case 'student':
      return <GraduationCap size={14} className="shrink-0 text-blue-600 dark:text-blue-400" />;
    case 'women':
      return <UserRound size={14} className="shrink-0 text-purple-600 dark:text-purple-400" />;
    case 'senior':
      return <HeartHandshake size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />;
    case 'general':
      return <Landmark size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" />;
    default:
      return <Grid size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />;
  }
}

function ChoiceRow({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 ${
              active
                ? 'border-saffron-500 bg-saffron-500 text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:border-saffron-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-saffron-400'
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
  const [statusFilter, setStatusFilter] = useState<'all' | SchemeMatchStatus>('all');
  const [activeCategory, setActiveCategory] = useState<'all' | SchemeCategory>('all');
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const totalSteps = stepFields.length;
  const currentFields = stepFields[step];
  const stepComplete = currentFields.every((f) => answers[f] !== undefined);

  function startWizard() {
    setPhase('wizard');
    setStep(0);
    setSkipped(false);
  }

  function skipToResults() {
    setSkipped(true);
    setPhase('results');
  }

  function goNext() {
    if (!stepComplete) {
      setWarn(true);
      return;
    }
    setWarn(false);
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    } else {
      setPhase('results');
    }
  }

  function goBack() {
    if (step > 0) {
      setStep((s) => s - 1);
    }
  }

  function startOver() {
    setPhase('landing');
    setStep(0);
    setSkipped(false);
    setWarn(false);
    setAnswers({});
    setSearch('');
    setStatusFilter('all');
    setActiveCategory('all');
    setExpandedCardIds({});
  }

  function toggleCardExpanded(schemeId: string) {
    setExpandedCardIds((prev) => ({
      ...prev,
      [schemeId]: !prev[schemeId],
    }));
  }

  const evaluated = useMemo(
    () =>
      schemes.map((s) => {
        const result = skipped
          ? {
              status: 'more_information_needed' as SchemeMatchStatus,
              reason: 'Questionnaire was skipped; complete questions for a tailored preliminary check.',
              matchedSignals: [],
              missingSignals: ['Profile questionnaire answers'],
            }
          : s.check(answers);

        return { ...s, result };
      }),
    [answers, skipped]
  );

  const counts = useMemo(() => {
    let potentialMatch = 0;
    let mayNotMatch = 0;
    let moreInformationNeeded = 0;

    for (const item of evaluated) {
      if (item.result.status === 'potential_match') potentialMatch++;
      else if (item.result.status === 'may_not_match') mayNotMatch++;
      else moreInformationNeeded++;
    }

    return { potentialMatch, mayNotMatch, moreInformationNeeded };
  }, [evaluated]);

  const filtered = useMemo(() => {
    return evaluated.filter((s) => {
      const q = search.trim().toLowerCase();

      const searchableText = [
        s.name,
        s.desc,
        s.category,
        s.benefit,
        s.domain,
        ...s.docs,
      ]
        .join(' ')
        .toLowerCase();

      const matchesQuery = !q || searchableText.includes(q);
      const matchesStatus = statusFilter === 'all' || s.result.status === statusFilter;
      const matchesCategory = activeCategory === 'all' || s.category === activeCategory;

      return matchesQuery && matchesStatus && matchesCategory;
    });
  }, [evaluated, search, statusFilter, activeCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6">
      {/* ── LANDING PHASE ── */}
      {phase === 'landing' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-saffron-600 bg-saffron-50 border border-saffron-200 dark:text-saffron-400 dark:bg-saffron-500/10 dark:border-saffron-500/20 mb-3">
            <Sparkles size={12} className="text-saffron-500" />
            GOVERNMENT SCHEME DISCOVERY
          </div>

          <h1 className="mb-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            Discover schemes that may match your profile
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            Answer a few simple questions to explore potentially relevant government schemes. Final eligibility is determined by the responsible authority.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row mb-10">
            <button
              type="button"
              onClick={startWizard}
              className="w-full sm:w-auto rounded-xl bg-saffron-500 px-7 py-3 text-sm font-bold text-white shadow-md shadow-saffron-500/20 transition-all hover:bg-saffron-600 hover:-translate-y-0.5"
            >
              Start Preliminary Check
            </button>

            <button
              type="button"
              onClick={skipToResults}
              className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Explore All Schemes
            </button>
          </div>

          {/* 3-Step Visual Explanation */}
          <div className="border-t border-slate-200 pt-8 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 border border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800">
                <div className="w-9 h-9 rounded-full bg-saffron-50 border border-saffron-200 flex items-center justify-center text-saffron-600 dark:bg-saffron-500/10 dark:border-saffron-500/20 dark:text-saffron-400 mb-3 font-bold text-xs">
                  1
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <UserCheck size={14} className="text-saffron-500" /> Tell us about you
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Answer 6 simple demographic questions
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 border border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800">
                <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-400 mb-3 font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-blue-500" /> Explore possible schemes
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  View preliminary matches and signals
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 border border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800">
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-400 mb-3 font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" /> Verify on official portal
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Confirm rules and apply on government portals
                </p>
              </div>
            </div>

            <p className="mt-6 text-[11.5px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
              <Info size={13} className="text-slate-400" /> Official application links provided for final verification
            </p>
          </div>
        </div>
      )}

      {/* ── WIZARD PHASE ── */}
      {phase === 'wizard' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:shadow-xl">
          <div className="flex flex-wrap gap-8">
            <div className="flex min-w-[220px] flex-1 flex-col items-center justify-center text-center p-6 rounded-xl bg-slate-50 border border-slate-200/60 dark:bg-slate-800/40 dark:border-slate-800">
              <Sparkles className="mb-4 text-saffron-500" size={40} />
              <h2 className="mb-1.5 text-xl font-bold text-slate-900 dark:text-white">
                Preliminary Profile Check
              </h2>
              <p className="mb-3 text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                Step {step + 1} of {totalSteps}
              </p>
              <div className="flex gap-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === step ? 'w-6 bg-saffron-500' : 'w-2 bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="min-w-[260px] flex-[1.4] py-2">
              <p className="mb-4 text-xs font-medium text-slate-500 dark:text-slate-400">
                Required questions marked with an asterisk (<span className="text-rose-500">*</span>) — or skip straight to results.
              </p>

              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                      Demographic Gender Profile <span className="text-rose-500">*</span>
                    </p>
                    <ChoiceRow
                      options={[
                        { value: 'male', label: 'Male' },
                        { value: 'female', label: 'Female' },
                        { value: 'other', label: 'Other' },
                      ]}
                      value={answers.gender}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, gender: v as Answers['gender'] }))
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                      Are you currently an enrolled student? <span className="text-rose-500">*</span>
                    </p>
                    <ChoiceRow
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                      value={answers.student}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, student: v as Answers['student'] }))
                      }
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                      Are you a landholding farmer? <span className="text-rose-500">*</span>
                    </p>
                    <ChoiceRow
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                      value={answers.farmer}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, farmer: v as Answers['farmer'] }))
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                      Do you belong to BPL or low-income category? <span className="text-rose-500">*</span>
                    </p>
                    <ChoiceRow
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                      value={answers.bpl}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, bpl: v as Answers['bpl'] }))
                      }
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                      Are you a senior citizen (age 60+)? <span className="text-rose-500">*</span>
                    </p>
                    <ChoiceRow
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                      value={answers.senior}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, senior: v as Answers['senior'] }))
                      }
                    />
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                      Do you have a valid Aadhaar Card? <span className="text-rose-500">*</span>
                    </p>
                    <ChoiceRow
                      options={[
                        { value: 'yes', label: 'Yes' },
                        { value: 'no', label: 'No' },
                      ]}
                      value={answers.aadhaar}
                      onChange={(v) =>
                        setAnswers((a) => ({ ...a, aadhaar: v as Answers['aadhaar'] }))
                      }
                    />
                  </div>
                </div>
              )}

              {warn && (
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
                  <AlertCircle size={14} /> Please answer both questions to proceed to the next step.
                </p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-200 dark:border-slate-800 pt-4">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={goBack}
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    Back
                  </button>
                )}

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!stepComplete}
                  className="rounded-xl bg-saffron-500 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-saffron-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {step === totalSteps - 1 ? 'View Results' : 'Next'}
                </button>

                <button
                  type="button"
                  onClick={skipToResults}
                  className="ml-auto text-xs text-slate-500 underline hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                >
                  Skip to results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS PHASE ── */}
      {phase === 'results' && (
        <div className="space-y-6">
          {/* Top navigation row */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={startOver}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-saffron-600 hover:text-saffron-500 dark:text-saffron-400 transition-colors"
            >
              <ArrowLeft size={14} /> Start Over
            </button>
            {skipped && (
              <button
                type="button"
                onClick={startWizard}
                className="inline-flex items-center gap-1.5 rounded-full border border-saffron-200 bg-saffron-50 px-3 py-1 text-xs font-semibold text-saffron-700 hover:bg-saffron-100 dark:border-saffron-500/20 dark:bg-saffron-500/10 dark:text-saffron-400 transition-colors"
              >
                <Sparkles size={12} /> Complete Preliminary Check
              </button>
            )}
          </div>

          {/* Skipped questionnaire notice */}
          {skipped && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
              <div className="flex items-start gap-2.5">
                <Info size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" />
                <p className="text-xs leading-relaxed">
                  You're browsing all prototype schemes. Complete the preliminary check to receive more relevant matches.
                </p>
              </div>
              <button
                type="button"
                onClick={startWizard}
                className="shrink-0 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Complete Preliminary Check
              </button>
            </div>
          )}

          {/* Results Header */}
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Potential Scheme Matches
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Preliminary matches based on the information you provided.
              </p>
            </div>

            {/* Clean summary row underneath heading */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 size={13} /> Potential Match ({counts.potentialMatch})
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                <HelpCircle size={13} /> More Information Needed ({counts.moreInformationNeeded})
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400">
                <XCircle size={13} /> May Not Match ({counts.mayNotMatch})
              </span>
            </div>
          </div>

          {/* Compact Preliminary Guidance Information Strip */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-slate-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs">
              <span className="font-bold text-amber-900 dark:text-amber-300 block mb-0.5">
                Preliminary guidance
              </span>
              <p className="leading-relaxed text-amber-800 dark:text-amber-200/90">
                These results are based on limited profile information. Always verify eligibility, documents and application conditions on the official scheme portal.
              </p>
            </div>
          </div>

          {/* Filtering Toolbar */}
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  aria-label="Search schemes"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search schemes, benefits or documents..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-saffron-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-saffron-500"
                />
              </div>

              <select
                aria-label="Filter by match status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-saffron-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              >
                <option value="all">All Match States</option>
                <option value="potential_match">Potential Match</option>
                <option value="more_information_needed">More Information Needed</option>
                <option value="may_not_match">May Not Match</option>
              </select>
            </div>

            {/* Category Filter Chips */}
            <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800/80">
              {categories.map((c) => {
                const active = c.id === activeCategory;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveCategory(c.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-500 ${
                      active
                        ? 'border-saffron-500 bg-saffron-50 font-semibold text-saffron-700 dark:border-saffron-500/30 dark:bg-saffron-500/10 dark:text-saffron-400'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {getCategoryIcon(c.id)}
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Schemes Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <Info className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                No schemes match your search or filters.
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Try resetting your search query or choosing "All Match States".
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((s) => (
                <SchemeCardItem
                  key={s.id}
                  scheme={s}
                  isExpanded={!!expandedCardIds[s.id]}
                  onToggleExpand={() => toggleCardExpanded(s.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SchemeCardItem({
  scheme,
  isExpanded,
  onToggleExpand,
}: {
  scheme: (typeof schemes)[0] & {
    result: {
      status: SchemeMatchStatus;
      reason: string;
      matchedSignals: string[];
      missingSignals: string[];
    };
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const status = scheme.result.status;

  let badgeCls = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let badgeIcon = <HelpCircle size={13} />;
  let badgeLabel = 'More Information Needed';

  if (status === 'potential_match') {
    badgeCls = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30';
    badgeIcon = <CheckCircle2 size={13} />;
    badgeLabel = 'Potential Match';
  } else if (status === 'may_not_match') {
    badgeCls = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30';
    badgeIcon = <XCircle size={13} />;
    badgeLabel = 'May Not Match';
  }

  // Max 2-3 signals for default visible view
  const visibleMatched = scheme.result.matchedSignals.slice(0, 3);
  const visibleMissing = scheme.result.missingSignals.slice(0, 3);

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div>
        {/* Category + Status Badge Top Row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {getCategoryIcon(scheme.category)}
            <span className="capitalize">{scheme.category}</span>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${badgeCls}`}>
            {badgeIcon} {badgeLabel}
          </span>
        </div>

        {/* Scheme Name */}
        <h3 className="mb-1.5 text-base font-bold text-slate-900 dark:text-white">
          {scheme.name}
        </h3>

        {/* 1-2 line description */}
        <p className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
          {scheme.desc}
        </p>

        {/* Prominent Benefit Section */}
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/60">
          <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Benefit Value
          </span>
          <span className="block text-sm font-extrabold text-slate-900 dark:text-white">
            {scheme.benefit}
          </span>
        </div>

        {/* Key Signals (Visible Default: Max 2-3) */}
        {status === 'potential_match' && visibleMatched.length > 0 && (
          <div className="mb-3">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Why it may match:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {visibleMatched.map((sig) => (
                <span
                  key={sig}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                >
                  ✓ {sig}
                </span>
              ))}
            </div>
          </div>
        )}

        {status === 'more_information_needed' && visibleMissing.length > 0 && (
          <div className="mb-3">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Information still needed:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {visibleMissing.map((sig) => (
                <span
                  key={sig}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  ⚠ {sig}
                </span>
              ))}
            </div>
          </div>
        )}

        {status === 'may_not_match' && (
          <div className="mb-3">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Why it may not match:
            </span>
            <p className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs leading-relaxed text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              {scheme.result.reason}
            </p>
          </div>
        )}

        {/* Expandable Section (Progressive Disclosure) */}
        {isExpanded && (
          <div
            id={`scheme-details-${scheme.id}`}
            className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800"
          >
            {/* Full Assessment Explanation */}
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Full Assessment Explanation
              </span>
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                {scheme.result.reason}
              </p>
            </div>

            {/* All Matched Signals if more than visible */}
            {scheme.result.matchedSignals.length > 3 && (
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  All Matched Signals ({scheme.result.matchedSignals.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {scheme.result.matchedSignals.map((sig) => (
                    <span
                      key={sig}
                      className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                    >
                      ✓ {sig}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* All Missing Signals if more than visible */}
            {scheme.result.missingSignals.length > 3 && (
              <div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  All Unverified / Missing Conditions ({scheme.result.missingSignals.length})
                </span>
                <div className="flex flex-wrap gap-1">
                  {scheme.result.missingSignals.map((sig) => (
                    <span
                      key={sig}
                      className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
                    >
                      ⚠ {sig}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Documents Commonly Requested */}
            <div>
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Documents Commonly Requested
              </span>
              <div className="flex flex-wrap gap-1.5">
                {scheme.docs.map((d) => (
                  <span
                    key={d}
                    className="rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    📄 {d}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions Footer */}
      <div className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
        <div className="mb-2 flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            aria-expanded={isExpanded}
            aria-controls={`scheme-details-${scheme.id}`}
            onClick={onToggleExpand}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
          >
            {isExpanded ? (
              <>
                Less Details <ChevronUp size={14} />
              </>
            ) : (
              <>
                Why this result? <ChevronDown size={14} />
              </>
            )}
          </button>

          <a
            href={scheme.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-saffron-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
          >
            Open Official Portal <ExternalLink size={12} />
          </a>
        </div>

        <p className="text-center text-[10px] italic text-slate-500 sm:text-left dark:text-slate-400">
          Final eligibility is determined by the responsible authority.
        </p>
      </div>
    </article>
  );
}
