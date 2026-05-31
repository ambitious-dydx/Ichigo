# Ichigo MVP Gap Analysis

## Purpose

This document records the gap between the current Ichigo build and a real public MVP.

It is not a wishlist.
It is the practical product and execution read on the codebase as it exists today.

The project PDF now captures the current product thesis and implementation direction.
This markdown file remains the sharper execution-state gap document for the current app.

## Current Product State

As of today, Ichigo is a real full-stack product prototype and a credible closed-beta candidate.
It is not yet a public, market-proven MVP.

## Current Positioning

Ichigo should currently be understood as:

- a context-first feedback product
- aimed first at founders, builders, and a narrow slice of creators
- designed for work, decisions, drafts, launches, product questions, and emotionally sensitive feedback moments

Ichigo should not currently be understood as:

- a general-purpose social network
- a broad “better Twitter/Reddit/LinkedIn” substitute
- a product for every kind of posting and every kind of audience at once

That narrower wedge is now present in the app, but it still needs to be enforced more consistently across all docs, copy, and product decisions.

## What Is Already Real

The current application already includes:

- a full-stack `Next.js` web app
- email/password auth
- Google auth
- email verification gating
- password reset flow
- session management and session revocation
- onboarding before full product access
- feed, compose, thread, room, profile, notification, settings, and moderation routes
- room membership and room creation flows
- reply-mode selection and visible post context
- reply classification, rewrite assistance, and mode-fit guidance
- reply-quality cooldown consequences
- block / mute style relationship controls
- SMTP-backed transactional email
- automated tests across security, repository, and HTTP flows

This is well beyond a static prototype.

## Current Honest Assessment

Best label for Ichigo right now:

- `late alpha`
- `closed beta candidate`

Not yet:

- `public MVP`
- `general social product`
- `market-proven feedback network`

Why it is not yet a real public MVP:

- the wedge is better, but still not disciplined enough
- the first-session payoff is stronger, but still not sharp enough
- trust and moderation are materially improved, but not production-grade
- there is not yet enough real-world usage evidence to claim retention or product pull
- production infrastructure is still local-first

## The Main Remaining Gaps

## 1. The Wedge Is Better, But Still Too Soft

### What Is Already True

- onboarding leans founder / builder / creator
- seeded content and rooms lean in that direction
- the product makes more sense in that wedge than it did originally

### What Is Still Missing

- top-level docs now carry the beta wedge more clearly
- some product surfaces may still drift broader than the intended early audience
- the product can still drift toward "everyone" if new features are not judged against the wedge

### What Needs To Happen

- treat founders and builders as the primary wedge
- keep creators adjacent, not equal priority
- keep broad social framing as long-term expansion only, not current positioning

## 2. The First-Time User Loop Still Needs More Force

### What Is Already True

- signup now leads into verification and onboarding
- onboarding asks for focus, goal, and preferred mode
- the user can reach a real product flow quickly

### What Is Still Missing

- the first-use moment still depends too much on explanation
- the guided path from “I have a problem” to “I got a better reply” is not yet tight enough
- the first thread does not yet create a strong enough “this is why Ichigo exists” reaction

### What Needs To Happen

- tighten onboarding copy and decisions further around the wedge
- make first post creation even more opinionated
- make the first success moment unmistakable

## 3. The Core Value Loop Is Present, But Not Yet Proven

### What Is Already True

- users can post with an explicit mode
- the thread keeps the ask visible
- replies can be checked against the ask
- reply assistance and cooldowns reinforce the contract

### What Is Still Missing

- a stronger poster-facing summary of how well a thread matched the ask
- clearer visible payoff after a thread receives replies
- more evidence that users actually return because Ichigo improved the exchange

### What Needs To Happen

- strengthen thread outcome summaries
- surface alignment outcomes more clearly to the poster
- validate return behavior with real beta users

## 4. Trust And Moderation Are Better, But Not Production-Grade

### What Is Already True

- moderation routes exist
- reports exist
- flagged reply handling exists
- block / mute controls exist
- rate limits and reply cooldowns exist
- verification and recovery basics exist

### What Is Still Missing

- stronger abuse handling for real open use
- more operator tooling and clearer escalation policy
- room-owner moderation depth
- more robust anti-spam and anti-bot protections

### What Needs To Happen

- tighten room-level control surfaces
- improve abuse triage
- add stronger production abuse controls before broader launch

## 5. Measurement Exists Structurally, But Not Yet As A Real Product Loop

### What Is Already True

- product events and basic product-health summaries exist
- there is now enough instrumentation to begin measuring product behavior

### What Is Still Missing

- a disciplined funnel view for:
  - signup
  - verification
  - onboarding
  - first post
  - first reply
  - second post
- real cohort retention analysis
- clearer success thresholds for the closed beta

### What Needs To Happen

- define MVP success metrics
- monitor closed-beta behavior against those metrics
- let product decisions follow measured usage, not intuition alone

## 6. Infrastructure Is Still Local-First

### What Is Already True

- the app builds cleanly
- tests pass
- SMTP works
- the backend is real

### What Is Still Missing

- managed Postgres
- production deployment shape
- monitoring and logging
- backup and restore thinking
- environment separation beyond local-first assumptions

### What Needs To Happen

- deploy publicly
- move persistence to managed Postgres
- add runtime monitoring and logging

## 7. Rooms Still Need Product Discipline

### What Is Already True

- rooms work
- rooms help reinforce context for small groups

### What Is Still Missing

- a sharper definition of when a conversation belongs in a room
- stronger room-owner controls
- more consistent room hierarchy in the product story

### Recommendation

Keep rooms as supporting structure for the wedge.
Do not let rooms become the main story before the core feedback loop proves itself.

## 8. Cross-Device Quality Still Needs Deliberate QA

### What Is Already True

- the app is much more responsive than before
- navigation now adapts better across smaller screens

### What Is Still Missing

- systematic mobile QA
- long-text overflow QA
- touch-behavior review
- keyboard and accessibility review

### What Needs To Happen

- run a page-by-page responsive audit
- fix remaining overflow and interaction inconsistencies

## 9. The Product Voice Is Better, But Not Fully Locked

### What Is Already True

- the copy is much less placeholder-like
- the product sounds more intentional than it did earlier

### What Is Still Missing

- a fully documented voice system
- stricter language consistency across all screens
- final removal of broad or generic product wording

### What Needs To Happen

- define the voice explicitly
- keep the language founder / builder focused for the beta

## What Should Happen Next

If Ichigo is being driven toward a real MVP, the next order should be:

1. lock the wedge in the docs and product language
2. deploy the app publicly
3. move to managed Postgres
4. tighten measurement and closed-beta success criteria
5. run a real founder / builder closed beta

## What Should Not Distract The Team Yet

Do not spend the next cycle on:

- broad social-network expansion
- generalized “for everyone” positioning
- new surface area that does not improve the founder / builder loop
- cosmetic work that does not improve clarity, retention, or trust

## Final Assessment

Ichigo is now much more than a concept.
It is a functioning product with a real identity emerging.

But the honest state is still:

- strong alpha
- credible private beta candidate
- not yet a proven public MVP

The path forward should be narrower, not broader.
