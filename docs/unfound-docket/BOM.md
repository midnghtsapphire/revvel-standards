# Bill of materials

| Kind | Name | Cost | Verdict | Why |
|---|---|---|---|---|
| API | None at runtime | Free | Use | The exhibit is a closed-form function. A live statute API would drift under a declaration. Humans verify against official CRS on a pinned date. |
| API | LLM completion API | Paid quota | Reject for the exhibit | A completion is not reproducible. The fleet may draft with a model only by pasting these prompts; the numbers still have to come from meridian-math. |
| MCP | meridian-exhibit (local spec) | Free | Spec only | Tools: pod_random_search, bayes_after_miss, credit_summary, canonical_proof. Same functions as the web exhibit. No network. The browser app is the implementation viewers can run. |
| MCP | Dark-web / Telegram / Discord search servers | Unsafe | Reject | Private chats are not citable authority, are often unlawful to scrape, and are full of theories a lawyer cannot sign. |
| CLI | node --experimental-strip-types --test src/lib/meridian-math.test.ts | Free | Use | Proves the canonical posterior, the random-search identity, and the 50-minute credit ledger. The same proofs render in the Exhibit. |
| App | Brief | Free | Ship | States the niche, both clocks, and the accreditation limit. |
| App | Course | Free | Ship | Three 60-minute hours, 150 minutes of instruction, written materials, checks. |
| App | Exhibit | Free | Ship | Inspectable Bayes update. Beats a nomograph at chaining a miss, beats an LLM ranker at being a distribution, and does not pretend to beat SORAL at multi-asset optimization. |
| App | Fleet | Free | Ship | Ten prompts with output schemas. They call the math. They do not freelance. |
| App | Signal | Free | Ship | SEO and SEM for the query class counsel actually needs, with evasion queries as negatives. |
| App | Open Index | Free | Ship | Pinned public repos and agencies. States what the deep web was asked for and why it was not used. |
| App | Binder | Free | Ship | Provider playbook, production blueprint, YouTube rundown, optional CI YAML. |
| App | Daily Watch | Free | Ship | One official source per day, selected by day-of-year modulo 7. A checkbox is not a finding that the law is unchanged. |
| Action | meridian-proof.yml | Free | Spec in the binder | On push, run the node test. Fail the branch if the posterior or the credit ledger drifts. No secret keys. |
| Docker | Optional wrapper | Free | Do not deploy | A container cannot make 0.30/0.70 truer. This product is the web exhibit. A Dockerfile that only runs the test is in the binder as a reference, not as the preview. |
| Library | SORAL (ctwardy/soral) | Free, C++ | Cite, don’t wrap | Better optimizer for effort across regions. Worse CLE exhibit: the courtroom needs the identity, not a binary. |
| Library | SAR_Nomographs (tvrusso) | Free PDFs | Cite | Same random-search law, not interactive, no posterior, no Colorado elements. |
| Library | LandSAR SDK (raytheonbbn/landsar-sdk) | Open SDK | Cite | Motion-model plugins for a larger platform. Not a Rule 250 binder. |
| Library | SAREnv (namurproject/SAREnv) | MIT | Cite | Best open UAV benchmark we found. European scenarios. Do not drop its maps on Colorado terrain and call them local base rates. |

## Action spec

```yaml
name: meridian-proof
on:
  push:
  pull_request:
jobs:
  proof:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: node --experimental-strip-types --test src/lib/meridian-math.test.ts
```

## Dockerfile not deployed

```dockerfile
# Reference only. Not how this docket is deployed.
# The proof does not need a moving OS.
FROM node:22-alpine
WORKDIR /app
COPY src/lib/meridian-math.ts src/lib/meridian-math.test.ts src/lib/course.ts ./src/lib/
CMD ["node", "--experimental-strip-types", "--test", "src/lib/meridian-math.test.ts"]
```
