# Product Definition Document (PDD)

**Version**: 1.0  
**Status**: Draft  
**Date**: 2026-06-14

---

## 1. Product Overview

- **What it is**: PaletaIQ is an Argentina-first decision platform for padel racket buyers, combining a normalized racket catalog, local ARS pricing and stock visibility, a side-by-side comparator, and an AI-guided finder that recommends real catalog items based on player profile and budget.
- **Problem it solves**: Argentine buyers currently rely on Spain-focused comparators that do not reflect local prices, local stock, or local stores, creating poor purchase decisions and low trust.
- **Business goal**: Become the default decision layer before purchase for padel rackets in Argentina, then monetize intent through outbound commerce (affiliate/store traffic), retention mechanics (alerts), and eventually data products.
- **Scope boundary**: Out of scope in current product reality are direct checkout, marketplace logistics, hard guarantees of lowest price, non-Argentina primary market focus, and full API commercialization.

---

## 2. Target Users

| User Type | Description | Main Goal | Key Motivation |
| --------- | ----------- | --------- | -------------- |
| Beginner / Intermediate Buyer (AR) | Recreational player with low-to-medium product certainty and budget sensitivity | Choose the right racket without overpaying | Avoid making an expensive mistake and buy with confidence |
| Advanced / Competitive Buyer (AR) | More technical player evaluating detailed specs and fit | Optimize racket choice by play style and specs | Performance edge and better value from local offers |
| Returning Value Seeker (AR) | User who already has shortlist/favorites and waits for better deal | Buy at preferred price timing | Maximize savings with minimal tracking effort |
| Internal Catalog Operator (Admin) | Small team maintaining data quality and scraping operations | Keep catalog and prices accurate and fresh | Preserve product trust and differentiation |

---

## 3. Capabilities

- The Beginner / Intermediate Buyer can describe their player profile and receive ranked, explainable recommendations from real catalog rackets.
- The Advanced / Competitive Buyer can filter and compare up to four rackets with normalized technical attributes and best local price context.
- The system allows users to inspect detailed racket specs, store-level prices, stock state, and recent price history when available.
- The system allows bilingual usage (Spanish default, English secondary) so messaging remains clear across locales.
- The Internal Catalog Operator can manually validate and edit racket attributes to correct data extraction errors.
- The Internal Catalog Operator can trigger and review scraping runs to refresh source data and detect source failures.

---

## 4. Business Rules & Invariants

| Rule ID | Description | Rationale | Source |
| ------- | ----------- | --------- | ------ |
| BR-01 | Recommendations must select only from real candidate rackets already filtered from internal catalog data. | Protect trust; avoid invented products. | stated |
| BR-02 | Argentina-local commerce context (ARS pricing, local stores, local stock) is the primary value proposition. | Core positioning vs Spain-based alternatives. | stated |
| BR-03 | For recommendation quality, profile inputs must include at least level and play style; budget should influence selection when provided. | Ensure meaningful fit and practical affordability. | stated |
| BR-04 | Admin-only operations (catalog edits, scraping triggers) require admin role authorization. | Data integrity and operational control. | stated |
| BR-05 | If AI recommendation is unavailable, the system must still return recommendations through deterministic heuristics. | Maintain continuity of user value. | stated |
| BR-06 | Outbound store links should be attributable to support monetization and quality feedback loops. _(assumed)_ | Revenue and conversion visibility are required for business viability. | assumed |
| BR-07 | Data freshness for displayed prices should meet a defined recency threshold and expose stale states when exceeded. _(assumed)_ | Price trust decays when data gets old. | assumed |
| BR-08 | Acquisition and behavior events should be measurable at each funnel stage. _(assumed)_ | Product optimization requires measurable leading indicators. | assumed |

---

## 5. Use Cases

**UC-01: Discover and Shortlist via Catalog**

- **Actor**: Beginner / Intermediate Buyer or Advanced / Competitive Buyer
- **Precondition**: User lands on catalog page with available rackets.
- **Goal**: Narrow options to relevant rackets and build shortlist.
- **Main Flow**:
  1. User applies filters (brand, shape, level, style, price range, search text).
  2. System returns filtered rackets and highlights best available price where present.
  3. User adds rackets to compare set.
- **Alternative Flows**: User clears active filters and restarts exploration.
- **Error / Exception Flows**: No matching rackets; system shows no-results state.
- **Postcondition**: User has a shortlist and/or comparison candidates.

**UC-02: Compare Candidate Rackets**

- **Actor**: Buyer
- **Precondition**: At least one racket selected for comparison.
- **Goal**: Evaluate trade-offs quickly and reduce decision ambiguity.
- **Main Flow**:
  1. User opens comparator with selected rackets.
  2. System shows side-by-side normalized specs and best price row.
  3. User removes/adds candidates and iterates.
- **Alternative Flows**: User enters comparator without selections and gets guided back to listing.
- **Error / Exception Flows**: Missing fields for some rackets are shown as unavailable data.
- **Postcondition**: User identifies top candidate(s) for deeper review.

**UC-03: Get AI-Guided Recommendation**

- **Actor**: Buyer
- **Precondition**: Finder flow is accessible.
- **Goal**: Receive personalized, explainable ranked recommendations.
- **Main Flow**:
  1. User answers profile and budget questions.
  2. System sanitizes profile and fetches candidates from catalog.
  3. System ranks via AI and returns 3-5 recommendations with rationale.
  4. User opens detailed page of a recommended racket.
- **Alternative Flows**: User skips optional fields (previous racket, budget bounds).
- **Error / Exception Flows**: If AI fails, system serves heuristic recommendations with explicit note.
- **Postcondition**: User has ranked options with explanation and next action path.

**UC-04: Inspect Offer and Exit to Store**

- **Actor**: Buyer
- **Precondition**: User is on racket detail page with at least one store offer.
- **Goal**: Validate offer quality and move to purchase channel.
- **Main Flow**:
  1. User reviews specs, store prices, stock, and recency.
  2. User clicks external store link for selected offer.
- **Alternative Flows**: User checks price history before exiting.
- **Error / Exception Flows**: If no prices exist, system communicates data absence clearly.
- **Postcondition**: User completes high-intent outbound action.

**UC-05: Admin Maintains Data Quality**

- **Actor**: Internal Catalog Operator
- **Precondition**: Admin is authenticated and authorized.
- **Goal**: Keep data accurate and scraping operations healthy.
- **Main Flow**:
  1. Admin filters pending entries and edits normalized fields.
  2. Admin marks entries validated.
  3. Admin runs source scrape and monitors run status/errors.
- **Alternative Flows**: Admin audits recent scrape runs and retries specific source.
- **Error / Exception Flows**: Source errors are logged and visible in run list.
- **Postcondition**: Catalog quality/freshness improves and operational issues are surfaced.

---

## 6. Open Questions

| # | Question | Impact | Owner | Status |
| --- | --- | --- | --- | --- |
| 1 | What exact North Star definition should the team commit to (sessions reaching store click, unique users reaching store click, or qualified recommendation-to-click rate)? | High | Product + Founder | Open |
| 2 | What freshness SLA should define price reliability (for example 48h/72h/7d), and what user-facing stale label policy applies? | High | Product + Data Ops | Open |
| 3 | Which monetization rails are prioritized first: affiliate links, sponsored placement, leads/API licensing, or hybrid? | High | Founder | Open |
| 4 | What conversion baseline and target are expected for AI finder completion and outbound click-through? | High | Product | Open |
| 5 | What consent/privacy approach is required for analytics in Argentina for behavioral events and attribution? | Medium | Product + Legal | Open |
| 6 | What user segment is primary for first PMF proof (beginners, intermediates, advanced), and what segment-specific promise should messaging emphasize? | Medium | Product Marketing | Open |
| 7 | What minimum viable retention mechanism is preferred first: price alerts or favorites/watchlist? | Medium | Product | Open |

---

## 7. Assumptions Register

| # | Assumption | If Wrong, Impact | Confidence | Validation Question |
| --- | --- | --- | --- | --- |
| 1 | The strongest PMF wedge in Argentina is local price/stock trust rather than pure recommendation quality. | Product overinvests in AI polish while failing to win transactional trust. | High | In user interviews, what reason do users cite first for using PaletaIQ? |
| 2 | Outbound store click is the best early proxy for delivered buying value. | Team optimizes vanity engagement with weak commercial intent. | High | Does higher finder/comparison usage correlate with store exits? |
| 3 | Users are willing to log in when value exchange is explicit (alerts, saved lists). | Login remains low and retention loops do not activate. | Medium | What login lift occurs when alerts/favorites are introduced? |
| 4 | AI fallback quality is good enough to preserve trust in low-failure windows. | Recommendation credibility drops after AI incidents. | Medium | Do users exposed to fallback return and click at similar rates? |
| 5 | Catalog coverage and freshness are currently the primary growth bottlenecks. | Team delays growth by focusing on lower-impact UX work. | High | What % of viewed rackets have current local prices and stock? |
| 6 | SEO category pages can become a major low-CAC acquisition channel in this market. | Organic investment underperforms and slows topline growth. | Medium | Do category/intent pages produce meaningful non-brand traffic and activation? |
| 7 | Admin throughput can sustain data quality until automation depth increases. | Manual ops become bottleneck and data trust degrades. | Medium | How many pending validations and scrape errors age beyond SLA weekly? |

---

## Product Diagnosis (Strategy, Value, Positioning, PMF Risk)

### What is strong

- **Clear strategic wedge**: Argentina-first proposition is crisp and visible in product copy (ARS prices, local stores, stock focus).
- **Core value loop exists**: discovery (catalog) → decision support (compare/finder) → commerce intent (store links).
- **Trust architecture is directionally right**: AI constrained to real candidates plus heuristic fallback reduces hallucination risk.
- **Operational readiness for data quality**: admin editing + scrape run visibility supports an early data-ops model.
- **Localization discipline**: bilingual foundation and translation coverage improve message consistency.

### What is weak

- **Monetization readiness is partial**: outbound links exist but no dedicated attribution flow, no click events, no affiliate routing layer.
- **Measurement blind spots**: no product analytics stack/events visible, making funnel diagnosis and growth prioritization low-confidence.
- **Retention loop missing**: no live alerts/favorites/saved recommendations despite roadmap intent.
- **Coverage risk**: not all rackets have local prices, which weakens core positioning promise when users encounter empty offers.
- **README misalignment**: root documentation still generic template, reducing internal/external product clarity.

### Product-market-fit risk zones

- **Risk 1: “Useful but non-habitual” behavior**: without alerts/favorites, users may churn after one session.
- **Risk 2: Data trust erosion**: stale/missing prices can invalidate the Argentina-first promise.
- **Risk 3: Over-index on UX polish before growth economics**: visual improvements may not improve revenue if attribution and funnels stay uninstrumented.
- **Risk 4: AI value ambiguity**: if finder quality is not measured against click and satisfaction outcomes, its ROI is unknown.

---

## Gap Analysis (Vision vs Implementation Reality)

### Vision items already materially implemented

- Comparator with normalized specs and side-by-side analysis.
- AI finder with profile flow and recommendation explanations.
- Localized interface in Spanish/English.
- Admin-protected operations for catalog curation and scraping trigger/review.
- Price history display on detail pages.

### Vision items partially implemented

- **Data moat depth**: schema and scraping exist, but local-price coverage and freshness consistency still incomplete.
- **Recommendation integrity**: hard candidate selection exists, but budget relaxation behavior can produce perceived mismatch.
- **Admin observability**: scrape runs visible, but limited operational guardrails for concurrent runs/alerts.

### Vision items not yet implemented (high strategic gap)

- Price-drop alerts (retention engine).
- Affiliate/tracked redirect layer for monetization proof.
- Saved profiles/recommendations and favorites (identity-driven repeat value).
- Robust KPI instrumentation and event taxonomy.
- SEO growth machine (programmatic landing pages + technical SEO enhancements).

---

## KPI Tree + Instrumentation Plan

### North Star Metric

- **North Star**: Weekly High-Intent Buying Sessions (WHIBS)
- **Definition**: Count of weekly unique sessions that reach at least one qualified outbound store click after interacting with decision features (finder and/or compare/detail).
- **Why this NSM**: It connects user value (confident purchase progression) and business value (monetizable intent).

### KPI Tree

1. **Acquisition**
- Unique users (weekly)
- Non-brand organic sessions
- Paid/social referral sessions
- Landing-to-catalog visit rate

2. **Activation**
- Catalog interaction rate (filter or search use)
- Compare initiation rate (add to compare)
- Finder start rate
- Finder completion rate
- Recommendation detail click-through rate

3. **Decision Quality / Intent**
- Detail page view per active session
- Store offer visibility rate (sessions seeing at least one in-stock offer)
- Outbound click-through rate (detail → store click)
- Multi-store evaluation rate (user compares >1 store offer)

4. **Retention**
- 7-day and 30-day return rate
- Saved-item adoption rate (favorites/watchlist once implemented)
- Alert subscription rate and alert-to-return rate (once implemented)

5. **Monetization**
- Attributed outbound clicks (affiliate-ready)
- Revenue per 1,000 sessions (RPM sessions)
- Effective conversion by store/source (click quality)

6. **Data Quality / Supply Health**
- Catalog price coverage (% active rackets with current price)
- Freshness SLA attainment (% prices updated within SLA)
- Scrape success rate by source
- Pending validation backlog age

### Event Instrumentation Plan (MVP analytics schema)

- **User/session context fields** (for all events): `session_id`, `user_id_nullable`, `locale`, `country_hint`, `utm_source`, `utm_medium`, `utm_campaign`, `device_type`, `timestamp`.
- **Core events**:
  - `page_view` (page_type: home/catalog/detail/finder/compare/admin)
  - `catalog_filter_applied` (filter_keys, results_count)
  - `catalog_search_submitted` (query_length, results_count)
  - `compare_add` / `compare_remove` / `compare_view` (slugs_count)
  - `finder_started`
  - `finder_step_answered` (step_id, answer_type)
  - `finder_completed` (profile_completeness_score, budget_set_boolean)
  - `recommendation_served` (heuristic_boolean, candidates_count, recommendations_count, latency_ms)
  - `recommendation_detail_clicked` (rank_position, paddle_id)
  - `detail_offer_viewed` (paddle_id, store_count, in_stock_count)
  - `store_outbound_clicked` (paddle_id, store_id, price_id, position, is_affiliate_boolean)
  - `auth_started` / `auth_success`
  - `admin_scrape_triggered` / `admin_scrape_finished` (source, status, duration_ms)
- **Derived metrics model**:
  - Build daily aggregates for funnel stages and source/store segments.
  - Create weekly cohort tables for return behavior by first-touch path (catalog-first vs finder-first).
- **Implementation phasing**:
  1. Add event pipeline for client and server actions.
  2. Add `/go/[priceId]` redirect for outbound clicks with event write-before-redirect.
  3. Build simple KPI dashboard with NSM + 12 leading indicators.

---

## Prioritized Product Backlog (Now / Next / Later)

### Now (0-6 weeks)

1. **Implement outbound tracking redirect (`/go/[priceId]`) and click event logging**  
Rationale: unlocks monetization readiness and North Star measurability.

2. **Ship baseline analytics taxonomy and dashboard (acquisition → outbound)**  
Rationale: eliminates blind spots and enables evidence-based prioritization.

3. **Establish data freshness SLA + stale labeling policy on offers**  
Rationale: protects trust in core Argentina-first promise.

4. **Launch one retention primitive: favorites or price alerts (MVP)**  
Rationale: converts one-off utility into repeat behavior.

5. **Fix recommendation budget-relaxation transparency behavior**  
Rationale: avoid mismatch between user constraints and recommendation credibility.

6. **Harden scraping operations (concurrency guard + failure alerting)**  
Rationale: reduce data outages and admin burden.

### Next (6-12 weeks)

1. **Expand Argentine store source coverage by priority tiers**  
Rationale: increase offer density and outbound conversion opportunities.

2. **Launch price alerts full loop (subscribe → trigger → notify → return)**  
Rationale: strongest retention + intent recapture mechanism.

3. **SEO expansion: category/intent landing pages + structured metadata program**  
Rationale: scalable low-CAC acquisition channel.

4. **Saved recommendation profiles and shareable results**  
Rationale: improve social discovery and repeated evaluation behavior.

5. **Recommendation quality evaluation framework**  
Rationale: compare AI vs heuristic outcomes on click/satisfaction metrics.

### Later (3-9 months)

1. **Affiliate optimization layer (store-level ranking by expected conversion/value)**  
Rationale: improve monetization efficiency without harming user trust.

2. **Data product readiness (partner endpoints / B2B syndication pilot)**  
Rationale: monetize data moat beyond consumer traffic.

3. **Advanced personalization (repeat-user preference memory, injury-aware tuning)**  
Rationale: increase recommendation relevance and retention.

4. **Regional expansion readiness (LatAm locale/store abstractions)**  
Rationale: optional growth once Argentina PMF is proven.

---

## Experiments Plan (Acquisition, Activation, Retention, Monetization)

### Acquisition Experiments

1. **SEO Intent Page Test**
- Hypothesis: intent/category pages increase non-brand qualified sessions.
- Variant A: current catalog entry points only.
- Variant B: dedicated pages by level/style/brand with stronger intent copy.
- Success Metric: non-brand sessions, finder starts, outbound click rate from organic.

2. **Creator/Club Referral Program Pilot**
- Hypothesis: community referral traffic has higher activation than generic social traffic.
- Variant A: generic social post links.
- Variant B: referral-tagged links for coaches/clubs with curated landing copy.
- Success Metric: activation rate and outbound clicks per referred session.

### Activation Experiments

1. **Finder Entry Point Framing**
- Hypothesis: “2-minute recommendation” framing increases finder starts and completion.
- Variant A: current CTA text.
- Variant B: time-bound promise + clearer value proposition in hero.
- Success Metric: finder start rate, completion rate, recommendation detail CTR.

2. **Comparator Guidance Nudges**
- Hypothesis: contextual nudges to compare increase qualified decisions.
- Variant A: passive compare bar only.
- Variant B: nudge when two similar rackets are viewed.
- Success Metric: compare initiation rate and downstream outbound clicks.

### Retention Experiments

1. **Favorites vs Price Alerts First-Retention Test**
- Hypothesis: price alerts drive higher 30-day return than favorites alone.
- Variant A: favorites only.
- Variant B: price alerts only.
- Variant C: both enabled.
- Success Metric: 7/30-day return rate, repeat outbound click rate.

2. **Recommendation Recall Prompt**
- Hypothesis: reminding users of prior recommendations increases re-engagement.
- Variant A: no follow-up.
- Variant B: follow-up prompt for logged users to revisit saved recommendations.
- Success Metric: revisit rate and repeated detail exploration.

### Monetization Experiments

1. **Offer Table Ranking Strategy**
- Hypothesis: ranking offers by best value + trust signals increases outbound clicks over price-only sorting.
- Variant A: current listing order.
- Variant B: ordered by value score (price recency + stock + store reliability). _(assumed)_
- Success Metric: outbound CTR and revenue per session.

2. **Affiliate Link Placement and CTA Clarity**
- Hypothesis: clearer buy-intent CTA language increases store exits without reducing trust.
- Variant A: current “View in store”.
- Variant B: intent-focused wording plus confidence copy.
- Success Metric: outbound CTR, bounce after detail view.

3. **Finder-to-Store Bridge CTA**
- Hypothesis: explicit “best current offer” CTA in recommendations increases monetizable action.
- Variant A: recommendation card links to detail only.
- Variant B: recommendation card includes direct best-offer action. _(assumed)_
- Success Metric: recommendation-to-outbound conversion.

---

## Definition of Done

The PDD is complete when:

- [x] Every capability maps to at least one use case
- [x] Every use case has at least one business rule
- [x] All unknowns are captured in Open Questions
- [x] Every inferred rule is marked as an assumption
- [x] Scope boundary is explicitly defined
- [x] A client or stakeholder can read the PDD and confirm it matches their intent

---

## Anti-Goals (What This Document Does NOT Define)

- Technical architecture or infrastructure
- Framework, language, or database choices
- UI/UX design or screen layouts
- Deployment or DevOps decisions
- Data models or database schemas
