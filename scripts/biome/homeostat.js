#!/usr/bin/env node
'use strict';

/**
 * BIOME · homeostat — the crew's homeostasis regulator.
 *
 * The whole point of BIOME is that it is CREDIT-FREE: missing AI-lane keys
 * (OpenRouter / Anthropic / Perplexity — the ones Doppler keeps wiping) must
 * NEVER degrade the crew, because the crew runs on rule-based logic + the free
 * GITHUB_TOKEN. So homeostat treats absent AI keys as *informational* (AI lanes
 * offline), keeps the rule-based lanes alive, and posts ONE consolidated, deduped
 * status note instead of spamming `needs-human` escalations.
 *
 * Pure functions are exported for tests; the CLI upserts/resolves the note.
 */

const TRACKED_KEYS = ['OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'PERPLEXITY_API_KEY'];
const STATUS_MARKER = '<!-- biome-homeostat-status -->';

function assessKeyHealth(env, keyNames = TRACKED_KEYS) {
  const present = [];
  const missing = [];
  for (const k of keyNames) {
    const v = env[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') present.push(k);
    else missing.push(k);
  }
  return { present, missing, aiLanesOffline: missing.length > 0, checked: keyNames.slice() };
}

function buildHomeostatSection(assessment) {
  const offline = assessment.aiLanesOffline;
  return {
    // BIOME is credit-free by design, so missing AI keys never make the crew
    // unhealthy. Status stays "healthy"; the AI-lane state is surfaced as info.
    worker: 'homeostat',
    status: 'healthy',
    summary: offline
      ? `AI lanes offline (${assessment.missing.join(', ')} unset) — credit-free rule-based lanes active`
      : 'AI lanes online; rule-based lanes also active',
    counts: {
      ai_keys_present: assessment.present.length,
      ai_keys_missing: assessment.missing.length,
    },
    detail: {
      ai_lanes: offline ? 'offline' : 'online',
      present: assessment.present,
      missing: assessment.missing,
    },
  };
}

function buildStatusBody(assessment, generatedAtIso) {
  const offline = assessment.aiLanesOffline;
  const lines = [
    STATUS_MARKER,
    '## 🌡️ BIOME Homeostat — AI-lane status',
    '',
    `**AI lanes:** ${offline ? '🟡 offline' : '🟢 online'}  `,
    `**Crew health:** 🟢 healthy (credit-free — runs without AI keys)  `,
    `**Checked:** ${generatedAtIso}`,
    '',
  ];
  if (offline) {
    lines.push(`Missing AI keys: ${assessment.missing.map((k) => `\`${k}\``).join(', ')}.`);
    lines.push('');
    lines.push(
      'This is **not** an outage. The BIOME crew is credit-free and keeps healing via ' +
        'rule-based lanes + the free `GITHUB_TOKEN`. If you want the AI lanes back, restore ' +
        'the key(s) in Doppler — homeostat will auto-resolve this note on the next run.'
    );
  } else {
    lines.push(`Present AI keys: ${assessment.present.map((k) => `\`${k}\``).join(', ') || '(none tracked)'}.`);
    lines.push('');
    lines.push('All tracked AI lanes are online and rule-based lanes remain active as backup.');
  }
  return lines.join('\n');
}

// When AI lanes are offline, homeostat can promptly trigger the EXISTING
// Doppler->Actions recovery workflow (secret-persistence-guard) instead of
// waiting for that workflow's own daily cron. Gated behind BIOME_RECOVER_KEYS so
// it only fires when the workflow explicitly opts in; homeostat never handles
// secret values itself — it just dispatches the reviewed recovery workflow.
function shouldTriggerRecovery(assessment, env) {
  return assessment.aiLanesOffline === true && String((env && env.BIOME_RECOVER_KEYS) || '').toLowerCase() === 'true';
}

module.exports = {
  TRACKED_KEYS,
  STATUS_MARKER,
  assessKeyHealth,
  buildHomeostatSection,
  buildStatusBody,
  shouldTriggerRecovery,
};

// --- CLI -------------------------------------------------------------------
if (require.main === module) {
  (async () => {
    const { repoApi } = require('./gh');
    const assessment = assessKeyHealth(process.env);
    const generatedAt = new Date().toISOString();
    console.log(`[biome-homeostat] ai_lanes=${assessment.aiLanesOffline ? 'offline' : 'online'} present=${assessment.present.length} missing=${assessment.missing.length}`);

    const search = await repoApi('/issues?state=open&labels=biome,homeostat&per_page=50', { allowError: true });
    const existing = Array.isArray(search)
      ? search.find((i) => !i.pull_request && (i.body || '').includes(STATUS_MARKER))
      : null;

    if (!assessment.aiLanesOffline) {
      // Lanes online: resolve any open status note (close is ops metadata, not a content deletion).
      if (existing) {
        await repoApi(`/issues/${existing.number}/comments`, {
          method: 'POST',
          body: { body: `${STATUS_MARKER}\n✅ AI lanes back online as of ${generatedAt}. Resolving.` },
        });
        await repoApi(`/issues/${existing.number}`, { method: 'PATCH', body: { state: 'closed' } });
        console.log(`[biome-homeostat] resolved status note #${existing.number}`);
      } else {
        console.log('[biome-homeostat] AI lanes online — nothing to do.');
      }
      return;
    }

    const body = buildStatusBody(assessment, generatedAt);
    if (existing) {
      await repoApi(`/issues/${existing.number}/comments`, { method: 'POST', body: { body } });
      console.log(`[biome-homeostat] refreshed consolidated status #${existing.number}`);
    } else {
      const created = await repoApi('/issues', {
        method: 'POST',
        body: {
          title: '[BIOME-HOMEOSTAT] AI lanes offline — crew healthy (credit-free)',
          body,
          labels: ['biome', 'homeostat'],
        },
      });
      console.log(`[biome-homeostat] opened consolidated status #${created && created.number}`);
    }

    // Promptly rehydrate the wiped key(s) by dispatching the existing reviewed
    // Doppler->Actions recovery workflow (no-ops if Doppler has no value).
    if (shouldTriggerRecovery(assessment, process.env)) {
      const recoveryWorkflow = process.env.BIOME_RECOVERY_WORKFLOW || '';
      await repoApi(`/actions/workflows/${recoveryWorkflow}/dispatches`, {
        method: 'POST',
        body: { ref: 'main', inputs: { force_recovery: 'true' } },
        allowError: true,
      });
      console.log(`[biome-homeostat] dispatched ${recoveryWorkflow} to rehydrate keys from Doppler`);
    }
  })().catch((err) => {
    console.error(`[biome-homeostat] error: ${err.message}`);
    process.exit(1);
  });
}
