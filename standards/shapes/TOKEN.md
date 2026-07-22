# Token / Credits Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `token`
**Template:** `templates/agent-generated-product/build/token/`

---

## When to Use This Shape

- Usage-based access to a service (API calls, AI generations, etc.)
- Prepaid credits model (buy credits, spend them on actions)
- Gated content (buy a token to unlock premium content)
- Multi-product: one token/credit system across multiple products
- When subscription is too heavy but per-use pricing makes sense

---

## 1. Research Phase

| Task | Tool | Output |
|------|------|--------|
| Validate usage-based demand | Competitor pricing pages, user complaints about subscriptions | Confirmed preference for pay-per-use |
| Audit credit systems | How competitors handle credits/tokens | `research/competitors.md` |
| Define credit economics | Cost per operation, margin target | `research/economics.md` |
| Design credit packages | Price points, bonus structures | `decision/pricing.json` |
| Legal review | Virtual currency regulations (state/federal) | `research/legal.md` |

**Gate:** `research/brief.md` must exist before proceeding.

---

## 2. Create Phase

### Architecture

```text
build/token/
  src/
    credits/
      balance.ts          # Credit balance management
      purchase.ts         # Stripe checkout → credit allocation
      consume.ts          # Deduct credits on use
      ledger.ts           # Transaction log (immutable)
    api/
      routes.ts           # REST endpoints for balance, purchase, usage
      middleware.ts        # Credit-check middleware
    webhooks/
      stripe.ts           # Handle checkout.session.completed
  tests/
    credits/              # Unit tests
    integration/          # Purchase → use → verify balance
  database/
    schema.sql            # Credits tables
  README.md
```

### Database Schema

```sql
-- Credit balances (one row per user)
CREATE TABLE credit_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_consumed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Immutable ledger (append-only)
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('purchase', 'consume', 'refund', 'bonus', 'expire')),
  amount INTEGER NOT NULL,  -- positive for purchase/bonus, negative for consume
  balance_after INTEGER NOT NULL,
  description TEXT,
  stripe_payment_id TEXT,
  product_slug TEXT,        -- which product consumed the credits
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_credit_txn_user ON credit_transactions(user_id, created_at DESC);
```

### Credit Operations

```typescript
// consume.ts — atomic credit deduction
async function consumeCredits(
  userId: string,
  amount: number,
  productSlug: string,
  description: string
): Promise<{ success: boolean; balanceAfter: number }> {
  return await db.transaction(async (tx) => {
    const row = await tx
      .select()
      .from(creditBalances)
      .where(eq(creditBalances.userId, userId))
      .for("update")  // row-level lock
      .first();

    if (!row || row.balance < amount) {
      return { success: false, balanceAfter: row?.balance ?? 0 };
    }

    const newBalance = row.balance - amount;
    await tx.update(creditBalances)
      .set({ balance: newBalance, lifetimeConsumed: row.lifetimeConsumed + amount })
      .where(eq(creditBalances.userId, userId));

    await tx.insert(creditTransactions).values({
      userId,
      type: "consume",
      amount: -amount,
      balanceAfter: newBalance,
      description,
      productSlug,
    });

    return { success: true, balanceAfter: newBalance };
  });
}
```

### Quality Gates

- [ ] Credit purchase → balance increase is atomic and idempotent
- [ ] Credit consumption is atomic (no double-spend)
- [ ] Ledger is append-only (no updates or deletes)
- [ ] Balance never goes negative (DB constraint + code check)
- [ ] Stripe webhook handles retries gracefully (idempotency key)
- [ ] Tests cover: purchase, consume, insufficient balance, refund, concurrent access
- [ ] No secrets in source
- [ ] TypeScript strict mode

---

## 3. Design Phase

| Asset | Purpose | Tool |
|-------|---------|------|
| Credit balance UI widget | Show current balance in products | Figma component |
| Purchase modal | Credit package selection + checkout | Figma |
| Usage dashboard | Transaction history, consumption chart | Figma |
| Landing page | Explain credit system + pricing | Figma → HTML |
| OG image | Social sharing | Figma |

---

## 4. Publish Phase

### Stripe Configuration

```bash
# Create credit packages as Stripe Products
stripe products create --name="100 Credits" --metadata[credits]=100 --metadata[type]=credit_pack
stripe prices create --product=<id> --unit-amount=999 --currency=usd   # $9.99 for 100

stripe products create --name="500 Credits" --metadata[credits]=500 --metadata[type]=credit_pack
stripe prices create --product=<id> --unit-amount=3999 --currency=usd  # $39.99 for 500 (20% bonus)

stripe products create --name="1000 Credits" --metadata[credits]=1000 --metadata[type]=credit_pack
stripe prices create --product=<id> --unit-amount=6999 --currency=usd  # $69.99 for 1000 (30% bonus)
```

### Integration Points

Every product that uses credits needs a middleware check:

```typescript
// middleware — check credits before expensive operations
app.use("/api/v1/generate", async (req, res, next) => {
  const cost = getCreditCost(req.body.operation);
  const result = await consumeCredits(req.user.id, cost, "product-slug", req.body.operation);
  if (!result.success) {
    return res.status(402).json({
      error: { code: "INSUFFICIENT_CREDITS", balance: result.balanceAfter, required: cost }
    });
  }
  req.creditsConsumed = cost;
  next();
});
```

### Landing Page

Must include:
- Credit pricing table (packages with bonus tiers)
- What credits can be used for (list of products/operations)
- Credit cost per operation (transparent pricing)
- FAQ (do credits expire? refund policy?)
- Purchase CTA → Stripe Checkout

---

## 5. Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **Stripe API key** | Credit purchase + webhooks | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |
| **Stripe webhook secret** | Verify webhook signatures | Doppler (per-project) |
| **Database** | Credit balances + ledger | Doppler (per-project `DATABASE_URL`) |

---

## Monetization

Credits ARE the monetization. Key economics:

| Metric | Target |
|--------|--------|
| Credit cost to user | $0.05-0.50 per credit (depending on value) |
| Cost of goods sold | < 30% of credit price |
| Margin per credit | ≥ 70% |
| Bonus tiers | 20% at 500, 30% at 1000 |
| Expiration | Optional — 12 months is common |

---

## Acceptance Criteria

- [ ] Credit purchase flow works end-to-end (Stripe → webhook → balance)
- [ ] Credit consumption is atomic and prevents double-spend
- [ ] Ledger accurately reflects all transactions
- [ ] At least one product integrated with credit check middleware
- [ ] Stripe Products + Prices created for all tiers
- [ ] Landing page explains credit system and pricing
- [ ] Tests pass (purchase, consume, concurrent access, refund)
- [ ] `state.json` step = `deployed`, `certified = true`
