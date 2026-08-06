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
} from 'lucide-react';
import type {
  Answers,
  SchemeCategory,
  SchemeMatchStatus,
} from '../types/schemes';
import { schemes, categories, stepFields } from '../data/schemes';

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
            className={`rounded-xl border px-4 py-2 text-sm font-medium transition-all ${
              active
                ? 'border-saffron-500 bg-saffron-500 text-white shadow-md'
                : 'border-slate-300 text-slate-600 hover:border-saffron-400 dark:border-white/15 dark:text-slate-300'
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
    <div className="mx-auto max-w-5xl px-4 pb-16 pt-24 sm:px-6">
      {/* ── LANDING PHASE ── */}
      {phase === 'landing' && (
        <div className="rounded-3xl bg-navy-950 px-8 py-14 text-center text-white shadow-2xl">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-saffron-400">
            Government Scheme Discovery
          </p>

          <h1 className="relative mb-3 inline-block text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Discover schemes that may match your profile
            <span className="mx-auto mt-2 block h-[3px] w-20 rounded-full bg-saffron-500" />
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-slate-300">
            Answer a few questions to explore potentially relevant schemes and the documents commonly requested. Final eligibility is verified only by the official authority.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={startWizard}
              className="rounded-full bg-saffron-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-saffron-500/20 transition-transform hover:-translate-y-0.5 hover:bg-saffron-600"
            >
              Start Preliminary Check
            </button>

            <button
              type="button"
              onClick={skipToResults}
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10"
            >
              Browse All Schemes
            </button>
          </div>

          <p className="mt-8 text-[11.5px] text-slate-400">
            Official application links provided for final verification
          </p>
        </div>
      )}

      {/* ── WIZARD PHASE ── */}
      {phase === 'wizard' && (
        <div className="flex flex-wrap gap-8 rounded-3xl bg-navy-950 p-8 text-white shadow-2xl">
          <div className="flex min-w-[220px] flex-1 flex-col items-center justify-center text-center">
            <Sparkles className="mb-4 text-saffron-400" size={44} />
            <h2 className="mb-1.5 text-xl font-bold text-white">
              Preliminary Profile Check
            </h2>
            <p className="mb-3 text-[13px] text-slate-300">
              Step {step + 1} of {totalSteps}
            </p>
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <span
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i === step ? 'w-6 bg-saffron-400' : 'w-2 bg-white/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="min-w-[260px] flex-[1.4]">
            <p className="mb-4 text-[11px] font-medium text-slate-400">
              Required questions marked with an asterisk (<span className="text-rose-400">*</span>) — or skip straight to results.
            </p>

            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-semibold text-white">
                    Demographic Gender Profile <span className="text-rose-400">*</span>
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
                  <p className="mb-2 text-sm font-semibold text-white">
                    Are you currently an enrolled student? <span className="text-rose-400">*</span>
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
                  <p className="mb-2 text-sm font-semibold text-white">
                    Are you a landholding farmer? <span className="text-rose-400">*</span>
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
                  <p className="mb-2 text-sm font-semibold text-white">
                    Do you belong to BPL or low-income category? <span className="text-rose-400">*</span>
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
                  <p className="mb-2 text-sm font-semibold text-white">
                    Are you a senior citizen (age 60+)? <span className="text-rose-400">*</span>
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
                  <p className="mb-2 text-sm font-semibold text-white">
                    Do you have a valid Aadhaar Card? <span className="text-rose-400">*</span>
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
              <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-300">
                <AlertCircle size={14} /> Please answer both questions to proceed to the next step.
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="rounded-lg border border-white/20 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
                >
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={goNext}
                disabled={!stepComplete}
                className="rounded-lg bg-saffron-500 px-5 py-2 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                {step === totalSteps - 1 ? 'View Results' : 'Next'}
              </button>

              <button
                type="button"
                onClick={skipToResults}
                className="ml-auto text-xs text-slate-400 underline hover:text-white"
              >
                Skip to results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS PHASE ── */}
      {phase === 'results' && (
        <div>
          <button
            type="button"
            onClick={startOver}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-saffron-500 hover:text-saffron-400"
          >
            <ArrowLeft size={14} /> Start Over
          </button>

          <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Potential Scheme Matches
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {skipped
                  ? 'Showing all prototype schemes. Complete the questionnaire for a more relevant preliminary match.'
                  : 'Based on the information you provided. This is preliminary guidance only.'}
              </p>
            </div>

            {/* Result Counters */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} /> {counts.potentialMatch} Potential Match
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                <XCircle size={13} /> {counts.mayNotMatch} May Not Match
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <HelpCircle size={13} /> {counts.moreInformationNeeded} More Information Needed
              </span>
            </div>
          </div>

          {/* Advisory Card */}
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-slate-800 dark:text-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Preliminary Scheme Guidance
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-amber-200/90">
                Matches are based on the answers provided and a limited prototype rule set. Final eligibility, required documents, benefit amount, and application conditions must be verified on the official scheme portal or with the responsible authority.
              </p>
            </div>
          </div>

          {/* Search & Status Filter */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                aria-label="Search schemes"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schemes, benefits, documents, domains..."
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-xs text-slate-800 shadow-sm focus:border-saffron-500 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
              />
            </div>

            <select
              aria-label="Filter by match status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-sm focus:border-saffron-500 focus:outline-none dark:border-white/15 dark:bg-slate-900 dark:text-white"
            >
              <option value="all">All Match States</option>
              <option value="potential_match">Potential Match</option>
              <option value="may_not_match">May Not Match</option>
              <option value="more_information_needed">More Information Needed</option>
            </select>
          </div>

          {/* Category Filter Chips */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categories.map((c) => {
              const active = c.id === activeCategory;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setActiveCategory(c.id)}
                  className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-colors ${
                    active
                      ? 'border-saffron-500 bg-saffron-500/10 text-saffron-600 dark:text-saffron-400'
                      : 'border-slate-300 text-slate-600 hover:border-saffron-400 dark:border-white/15 dark:text-slate-400'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Schemes Grid */}
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500 dark:border-white/10 dark:bg-slate-900">
              <Info className="mx-auto mb-2 h-8 w-8 text-slate-400" />
              <p className="text-sm font-semibold">No schemes match your search or filters.</p>
              <p className="mt-1 text-xs text-slate-400">
                Try resetting your search query or choosing "All Match States".
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((s) => {
                const status = s.result.status;

                let badgeCls = 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20';
                let badgeIcon = <HelpCircle size={13} />;
                let badgeLabel = 'More Information Needed';

                if (status === 'potential_match') {
                  badgeCls = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
                  badgeIcon = <CheckCircle2 size={13} />;
                  badgeLabel = 'Potential Match';
                } else if (status === 'may_not_match') {
                  badgeCls = 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
                  badgeIcon = <XCircle size={13} />;
                  badgeLabel = 'May Not Match';
                }

                return (
                  <div
                    key={s.id}
                    className="card flex flex-col justify-between p-5 transition-all hover:border-slate-300 dark:hover:border-white/20"
                  >
                    <div>
                      {/* Badge Header */}
                      <div className="mb-3 flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${badgeCls}`}
                        >
                          {badgeIcon} {badgeLabel}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {s.category}
                        </span>
                      </div>

                      {/* Title & Desc */}
                      <h3 className="mb-1 text-base font-bold text-slate-900 dark:text-white">
                        {s.name}
                      </h3>
                      <p className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                        {s.desc}
                      </p>

                      {/* Reason */}
                      <div className="mb-3 rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs dark:border-white/5 dark:bg-slate-950/60">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          Assessment:
                        </span>{' '}
                        <span className="text-slate-600 dark:text-slate-400">
                          {s.result.reason}
                        </span>
                      </div>

                      {/* Matched & Missing Signals */}
                      {s.result.matchedSignals.length > 0 && (
                        <div className="mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Matched Signals:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.result.matchedSignals.map((sig) => (
                              <span
                                key={sig}
                                className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400"
                              >
                                ✓ {sig}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {s.result.missingSignals.length > 0 && (
                        <div className="mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Unverified / Missing Conditions:
                          </span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {s.result.missingSignals.map((sig) => (
                              <span
                                key={sig}
                                className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:text-amber-300"
                              >
                                ⚠ {sig}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Documents Commonly Requested */}
                      <div className="mb-4 border-t border-slate-100 pt-3 dark:border-white/10">
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Documents commonly requested
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {s.docs.map((d) => (
                            <span
                              key={d}
                              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-300"
                            >
                              📄 {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Benefit & Portal Button Footer */}
                    <div className="border-t border-slate-100 pt-3 dark:border-white/10">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Benefit
                          </span>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {s.benefit}
                          </p>
                        </div>

                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-saffron-500/30 bg-saffron-500/10 px-3 py-1.5 text-xs font-bold text-saffron-600 transition-colors hover:bg-saffron-500/20 dark:text-saffron-400"
                        >
                          Open Official Portal <ExternalLink size={12} />
                        </a>
                      </div>

                      <p className="text-[10px] text-slate-400 italic">
                        Final eligibility is determined by the responsible authority.
                      </p>
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
