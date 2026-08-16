'use client';

import { useMemo, useState } from 'react';
import {
  ALLOWED_DOMAINS,
  ALLOWED_SKILLS,
  AllowedDomain,
  AllowedSkill,
  MAX_SKILLS,
  buildManifestFromForm,
  formatValidationAlert,
  sampleInvalidManifest,
  sampleValidManifest,
  validateAgentManifest,
  type ManifestValidationResult,
} from './data/validator';

type Mode = 'form' | 'json';

const INITIAL_FORM = {
  persona_id: 'registry-guard-agent',
  version: '1.0.0',
  skills: ['mcp_file_read', 'github_api_commit'] as AllowedSkill[],
  target_artifact_domains: ['oaudrey'] as AllowedDomain[],
  execution_timeout_seconds: 60,
  allow_local_shell_access: false,
};

export default function Home() {
  const [mode, setMode] = useState<Mode>('form');
  const [form, setForm] = useState(INITIAL_FORM);
  const [jsonText, setJsonText] = useState(
    () => JSON.stringify(sampleValidManifest(), null, 2),
  );
  const [apiEcho, setApiEcho] = useState<string | null>(null);
  const [apiBusy, setApiBusy] = useState(false);

  const { manifest, jsonParseError } = useMemo(() => {
    if (mode === 'form') {
      return {
        manifest: buildManifestFromForm(form),
        jsonParseError: null as string | null,
      };
    }
    try {
      return {
        manifest: JSON.parse(jsonText) as unknown,
        jsonParseError: null as string | null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { manifest: null, jsonParseError: message };
    }
  }, [mode, form, jsonText]);

  const result: ManifestValidationResult | null = useMemo(() => {
    if (manifest === null) return null;
    return validateAgentManifest(manifest);
  }, [manifest]);

  const alertCargo = useMemo(() => {
    if (!result || result.valid) return null;
    return formatValidationAlert({
      workflowName: 'Agent Manifest Validator UI',
      executionId: `ui-${result.checked_at}`,
      errorMessage: result.summary,
    });
  }, [result]);

  const toggleSkill = (skill: AllowedSkill) => {
    setForm((prev) => {
      const exists = prev.skills.includes(skill);
      if (exists) {
        return { ...prev, skills: prev.skills.filter((s) => s !== skill) };
      }
      if (prev.skills.length >= MAX_SKILLS) return prev;
      return { ...prev, skills: [...prev.skills, skill] };
    });
  };

  const toggleDomain = (domain: AllowedDomain) => {
    setForm((prev) => {
      const exists = prev.target_artifact_domains.includes(domain);
      if (exists) {
        return {
          ...prev,
          target_artifact_domains: prev.target_artifact_domains.filter(
            (d) => d !== domain,
          ),
        };
      }
      return {
        ...prev,
        target_artifact_domains: [...prev.target_artifact_domains, domain],
      };
    });
  };

  const loadSample = (kind: 'valid' | 'invalid') => {
    const sample =
      kind === 'valid' ? sampleValidManifest() : sampleInvalidManifest();
    setJsonText(JSON.stringify(sample, null, 2));
    setMode('json');
  };

  const downloadManifest = () => {
    if (!manifest || !result?.valid) return;
    const blob = new Blob([JSON.stringify(manifest, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${String((manifest as { persona_id?: string }).persona_id || 'manifest')}.json`;
    anchor.click();
    // Delay revoke so the browser can start the download from the blob URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const callApi = async () => {
    if (manifest === null) return;
    setApiBusy(true);
    setApiEcho(null);
    try {
      const response = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manifest, simulate_alert: true }),
      });
      const data = await response.json();
      setApiEcho(JSON.stringify({ status: response.status, ...data }, null, 2));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setApiEcho(JSON.stringify({ error: message }, null, 2));
    } finally {
      setApiBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="panel rounded-3xl p-6 sm:p-8">
        <p className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-200">
          Revvel Guardrail · SaaS
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Agent Manifest Validator
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Enforce <code className="mono text-sky-300">registry_rules.json</code>{' '}
          before an agent persona ships: 5-skill budget, domain allow-list (
          meetaudreyevans / oaudrey / openaudrey), SemVer, and execution
          constraints. Pair with the n8n defensive alert blueprint for Slack,
          Discord, and email fan-out.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('form')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'form'
                ? 'bg-sky-500 text-slate-950'
                : 'border border-slate-600 text-slate-200 hover:border-sky-400'
            }`}
          >
            Guided form
          </button>
          <button
            type="button"
            onClick={() => setMode('json')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'json'
                ? 'bg-sky-500 text-slate-950'
                : 'border border-slate-600 text-slate-200 hover:border-sky-400'
            }`}
          >
            Raw JSON
          </button>
          <button
            type="button"
            onClick={() => loadSample('valid')}
            className="rounded-xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/10"
          >
            Load valid sample
          </button>
          <button
            type="button"
            onClick={() => loadSample('invalid')}
            className="rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/10"
          >
            Load failing sample
          </button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel rounded-3xl p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-white">Manifest input</h2>

          {mode === 'form' ? (
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-semibold text-slate-300">
                  persona_id
                </span>
                <input
                  className="mono mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                  value={form.persona_id}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, persona_id: e.target.value }))
                  }
                  placeholder="my-persona-agent"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-slate-300">
                  version (SemVer)
                </span>
                <input
                  className="mono mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                  value={form.version}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, version: e.target.value }))
                  }
                  placeholder="1.0.0"
                />
              </label>

              <div>
                <p className="text-sm font-semibold text-slate-300">
                  skills ({form.skills.length}/{MAX_SKILLS})
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALLOWED_SKILLS.map((skill) => {
                    const active = form.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? 'bg-violet-500 text-white'
                            : 'border border-slate-600 text-slate-300 hover:border-violet-400'
                        }`}
                      >
                        {skill}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-300">
                  target_artifact_domains
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ALLOWED_DOMAINS.map((domain) => {
                    const active = form.target_artifact_domains.includes(domain);
                    return (
                      <button
                        key={domain}
                        type="button"
                        onClick={() => toggleDomain(domain)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? 'bg-cyan-500 text-slate-950'
                            : 'border border-slate-600 text-slate-300 hover:border-cyan-400'
                        }`}
                      >
                        {domain}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-300">
                    execution_timeout_seconds (5–300)
                  </span>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    className="mono mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                    value={form.execution_timeout_seconds}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        execution_timeout_seconds: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    checked={form.allow_local_shell_access}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        allow_local_shell_access: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-slate-600"
                  />
                  <span className="text-sm font-semibold text-slate-300">
                    allow_local_shell_access
                  </span>
                </label>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                spellCheck={false}
                className="mono h-[420px] w-full rounded-2xl border border-slate-700 bg-slate-950/80 p-4 text-xs leading-relaxed text-slate-100 outline-none focus:border-sky-400 sm:text-sm"
              />
              {jsonParseError ? (
                <p className="mt-2 text-sm text-rose-300">
                  JSON parse error: {jsonParseError}
                </p>
              ) : null}
            </div>
          )}
        </section>

        <aside className="space-y-6">
          <section className="panel rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-white">Validation result</h2>
            {result ? (
              <div className="mt-4 space-y-3">
                <div
                  className={`rounded-2xl p-4 ${
                    result.valid
                      ? 'border border-emerald-400/30 bg-emerald-500/10'
                      : 'border border-rose-400/30 bg-rose-500/10'
                  }`}
                >
                  <p className="text-xs uppercase tracking-wide text-slate-300">
                    Status
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      result.valid ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {result.valid ? 'PASS' : 'FAIL'}
                  </p>
                  <p className="mt-2 text-sm text-slate-200">{result.summary}</p>
                </div>
                {result.skill_budget_remaining !== null ? (
                  <p className="text-sm text-slate-300">
                    Skill budget remaining:{' '}
                    <strong className="text-white">
                      {result.skill_budget_remaining}
                    </strong>{' '}
                    / {MAX_SKILLS}
                  </p>
                ) : null}
                {result.errors.length > 0 ? (
                  <ul className="space-y-2">
                    {result.errors.map((err) => (
                      <li
                        key={`${err.path}-${err.message}`}
                        className="rounded-xl border border-rose-400/20 bg-slate-950/50 px-3 py-2 text-sm"
                      >
                        <span className="mono text-rose-300">
                          {err.path || '(root)'}
                        </span>
                        <span className="text-slate-300"> — {err.message}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={downloadManifest}
                    disabled={!result.valid}
                    className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Download JSON
                  </button>
                  <button
                    type="button"
                    onClick={callApi}
                    disabled={apiBusy || manifest === null}
                    className="rounded-xl border border-sky-400/50 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/10 disabled:opacity-40"
                  >
                    {apiBusy ? 'Calling API…' : 'POST /api/validate'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-400">
                Fix JSON parse errors to run validation.
              </p>
            )}
          </section>

          {alertCargo ? (
            <section className="panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">
                Simulated n8n alert cargo
              </h2>
              <pre className="mono mt-3 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-amber-400/20 bg-slate-950/70 p-4 text-xs text-amber-100">
                {alertCargo}
              </pre>
            </section>
          ) : null}

          {apiEcho ? (
            <section className="panel rounded-3xl p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-white">API response</h2>
              <pre className="mono mt-3 max-h-64 overflow-auto rounded-2xl border border-slate-700 bg-slate-950/70 p-4 text-xs text-slate-200">
                {apiEcho}
              </pre>
            </section>
          ) : null}

          <section className="panel rounded-3xl p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">SaaS tiers</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>
                <strong className="text-white">Free</strong> — browser + CLI
                validation, sample alert preview
              </li>
              <li>
                <strong className="text-white">Team $49/mo</strong> — API key,
                webhook fan-out to your n8n Slack/Discord/email nodes
              </li>
              <li>
                <strong className="text-white">Fleet $199/mo</strong> — CI gate +
                multi-repo registry sync
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <footer className="pb-8 text-center text-xs text-slate-500">
        Schema source of truth: schemas/registry_rules.json · CLI:
        scripts/validate-agent-manifest.js · n8n blueprint:
        workflows/n8n/defensive-validation-guardrail-alerting.json
      </footer>
    </div>
  );
}
