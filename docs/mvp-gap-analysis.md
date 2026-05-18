# Ichigo MVP Gap Analysis

## Purpose

This document records what is still missing between the current Ichigo build and a real market-viable MVP.

This is not a generic product wishlist.

It is a focused assessment of:

- what already exists
- what is still too weak for real user launch
- what should be worked on next
- what should not distract the team yet

The product documentation PDF remains the higher-level product source of truth.
This document is the practical execution companion for the current codebase.

## Current Honest Assessment

Ichigo is currently a strong `alpha`, not yet a market-viable `MVP`.

What it already does well:

- expresses the core thesis clearly: `content + context`
- demonstrates the response-mode idea in a real working app
- supports account creation, sign-in, Google auth, feed, compose, rooms, threads, settings, moderation, and tests
- has a coherent enough shell to run closed testing

Why it is not yet a real MVP:

- the product still proves the idea conceptually more than behaviorally
- the first-user loop is not strong enough yet
- the trust layer is not ready for real public use
- the wedge is still too broad
- the product does not yet create a sharp enough reason to come back

## Definition Of MVP For Ichigo

For Ichigo, MVP should not mean:

- "the app has many pages"
- "authentication works"
- "backend exists"
- "the design looks polished enough"

For Ichigo, MVP should mean:

1. a user understands the product in under a minute
2. they make a post with a clear response mode
3. they receive replies that feel noticeably better than conventional social apps
4. they want to use Ichigo again for the same need
5. the system is safe enough to handle real people without immediately breaking trust

If those five things do not happen, the product is still pre-MVP.

## What Is Missing

## 1. A Narrow User Wedge

### Problem

Ichigo currently behaves like a general social product.
That is too broad for early adoption.

When a product is trying to serve:

- emotional support
- advice seeking
- founder feedback
- creator reflection
- private rooms
- thoughtful discussion

all at once, it usually becomes interesting but not urgent.

### Why This Blocks MVP

Real MVP traction usually comes from one narrow use case where the pain is obvious.

For Ichigo, likely wedges could be:

- founders asking for high-signal product or strategy feedback
- creators sharing work-in-progress and choosing reply tone
- private peer groups where context mismatch is already a problem
- emotionally sensitive posting where tone mismatch causes real harm

### What Is Missing In Product Terms

- no primary audience is enforced in onboarding
- no route, copy, or feed structure makes one wedge feel like the main one
- the product still reads as a broad "better social app"

### What We Need

- choose one starting wedge
- make the home, feed, compose flow, and example content all reflect that wedge
- remove or de-emphasize secondary use cases for the first beta

### Suggested Decision

Best early wedge candidate:

- founders, builders, and creators who need different kinds of feedback on work and decisions

Reason:

- the response-mode concept is easiest to explain there
- users already feel the pain of mismatched feedback
- they are easier to recruit for closed testing

## 2. First-Time User Onboarding Is Too Weak

### Problem

A first-time user can technically enter the product, but the product does not yet guide them tightly enough into the core value moment.

### Why This Blocks MVP

If the first session does not quickly produce:

- understanding
- action
- payoff

users will bounce before the product idea is felt.

### What Is Missing

- no explicit onboarding flow after signup
- no "why this works" walkthrough inside the app
- no structured first post creation path
- no seeded "choose what you need" onboarding prompt
- no guided first reply experience
- no clear explanation of which mode to use when

### What We Need

- a short post-signup onboarding sequence
- a first-use decision tree like:
  - `I want advice`
  - `I want comfort`
  - `I want honest truth`
  - `I want people to just listen`
- a guided first post template
- sample threads that show correct and incorrect reply behavior

### Acceptance Criteria

A new user should be able to:

1. understand the idea
2. choose a mode confidently
3. publish a first post
4. know what a good reply looks like

without reading long explanatory copy

## 3. The Core Value Loop Is Not Strong Enough Yet

### Problem

The core loop should be:

`need -> post -> explicit context -> better replies -> emotional/functional payoff -> return`

The app already supports this structurally, but it does not yet create a strong enough payoff loop.

### Why This Blocks MVP

Ichigo only matters if users feel:

- "people met me the right way"
- "this conversation went better because I set context first"

That needs to be obvious, not inferred.

### What Is Missing

- no strong feedback after posting that reinforces "your tone is now set"
- no visible score or summary of how well replies matched the ask
- no post-level reflection like:
  - `3 replies matched your ask`
  - `1 reply drifted`
- no obvious difference between a standard reply stream and an Ichigo reply stream
- no reply composer guidance shown strongly enough at the moment of response

### What We Need

- better post-state UX after submit
- stronger thread-level context framing
- clearer reply guidance before someone comments
- visible mode-alignment outcomes
- a stronger "this worked" signal for posters

### Acceptance Criteria

A poster should finish a thread and feel:

- the ask was understood
- the replies were shaped by the mode
- Ichigo changed the conversation outcome

## 4. Reply Quality Control Is Still Too Thin

### Problem

The product promise depends on reply quality, but current enforcement is still light.

### Why This Blocks MVP

If people choose `Soft Truth` and receive:

- generic noise
- lazy encouragement
- hostile honesty
- reply styles that ignore the ask

then the thesis collapses.

### What Is Missing

- strong composer nudges for repliers
- pre-submit warnings when a reply conflicts with the chosen mode
- visible rewrite suggestions in the actual reply flow
- tighter incentives for aligned replies
- consequences for repeated low-alignment replies

### What We Need

- reply composer assistance tied to the active post mode
- visible "before you reply" guidance in thread view
- optional AI-assisted rewrite before submit
- better rating feedback loops
- user reputation that reflects reply quality, not just activity

### Acceptance Criteria

Before public MVP, the average reply quality should feel materially better than default social replies in the chosen wedge.

## 5. Trust And Safety Are Not Ready For Real Users

### Problem

There is moderation surface area, but not enough real operational safety for open usage.

### Why This Blocks MVP

Ichigo deals directly with emotional tone and vulnerable posting.
That raises the safety bar.

If the product cannot handle:

- harassment
- mocking replies
- dogpiling
- bad-faith truth-telling
- repeated room abuse

it will lose trust fast.

### What Is Missing

- rate limits on abuse-prone actions
- anti-spam and anti-bot protections
- stronger moderation queue tooling
- block / mute behavior
- room owner moderation tools
- escalation policy for harmful users
- clear abuse states in the user interface
- audit trail depth for moderation decisions

### What We Need

- minimal anti-abuse controls
- per-user and per-IP rate limiting
- block and mute system
- room-level moderation permissions
- report triage improvements
- harmful-reply intervention logic

### Acceptance Criteria

Before real MVP use, the product should safely survive:

- low-quality trolling
- repeat reporters
- room abuse
- hostile replies against vulnerable posts

without requiring manual intervention every few minutes

## 6. Authentication And Account Lifecycle Are Incomplete

### Problem

Auth works, but account lifecycle is not complete enough for public release.

### What Exists

- email/password auth
- Google auth
- session handling
- password change
- session revocation

### What Is Still Missing

- email verification flow
- forgot password / reset password flow
- stronger session/device labeling
- better account recovery UX
- clearer linked-account management

### Why This Matters

Public users expect recovery and verification basics.
Without them, account trust feels fragile.

### Acceptance Criteria

Before broader launch, a user must be able to:

- verify email
- reset a forgotten password
- understand active sessions
- recover access without manual support

## 7. Notifications And Return Loops Are Too Weak

### Problem

Notifications exist, but the system does not yet strongly pull users back into the app.

### Why This Blocks MVP

If people post and leave, Ichigo needs a reason for them to come back.

### What Is Missing

- stronger prioritization in activity
- "you have replies that match your ask" style notifications
- "someone responded in the tone you requested" messaging
- reminder loops for unanswered posts
- digest logic for important updates

### What We Need

- better notification semantics
- unread prioritization
- stronger notification copy
- optional email notifications later

### Acceptance Criteria

Users should have a clear reason to re-open Ichigo after posting or replying.

## 8. Rooms Need A Clearer Job

### Problem

Rooms exist, but their role in the product is not yet sharp enough.

### Why This Blocks MVP

Rooms can either strengthen context or add complexity.
If they are not clearly necessary, they become overhead.

### What Is Missing

- a defined reason for when a conversation belongs in a room versus the main feed
- stronger room identity and norms
- clearer creation and joining logic
- better room owner control

### What We Need

- decide whether rooms are MVP-core or post-MVP
- if they stay in MVP, make them essential for the wedge
- if not, keep them secondary and simple

### Recommendation

Keep rooms, but make them supporting infrastructure, not the primary story, until the core loop proves itself.

## 9. Measurement And Analytics Are Missing

### Problem

There is no serious instrumentation for validating whether the product is working.

### Why This Blocks MVP

Without measurement, we will confuse:

- app usage
- curiosity
- actual product value

### What Is Missing

- onboarding funnel metrics
- compose completion rate
- first post rate
- first reply received time
- reply alignment distribution
- return rate by user cohort
- room engagement metrics
- mode usage distribution

### What We Need

- event instrumentation
- simple dashboard or queryable event store
- baseline success metrics for closed beta

### Minimum Metrics For MVP Validation

- `signup -> first post`
- `first post -> first reply`
- `% of replies rated aligned`
- `day 1 / day 7 return`
- `% of users who post again`

## 10. Production Infrastructure Is Not Ready

### Problem

The app works, but it still looks like a local-first product build rather than a production system.

### Current State

- local persistence
- working server logic
- tests

### What Is Missing

- production database migration plan
- managed Postgres
- environment separation
- error monitoring
- request logging
- background job strategy
- deployment hardening
- backup and restore plan

### What We Need

- move from local SQLite to production Postgres
- add structured logging and runtime monitoring
- define deploy environment variables
- create safe migration path

### Note

This matters, but it should follow the core product loop unless a closed beta requires it immediately.

## 11. Mobile And Cross-Device Quality Still Need Deliberate QA

### Problem

The product is improving, but device compatibility still needs systematic coverage.

### Why This Blocks MVP

If Ichigo breaks visually or behaviorally across phones and tablets, adoption will stall quickly.

### What Is Missing

- systematic responsive QA across major breakpoints
- navigation behavior audit on all screens
- touch interaction QA
- long-text overflow QA
- keyboard and accessibility checks

### What We Need

- test matrix for mobile, tablet, small laptop, desktop
- page-by-page responsive review
- navigation and sheet behavior checks
- stronger accessibility pass

## 12. The Product Voice Is Better, But Not Fully Disciplined Yet

### Problem

Copy has improved, but the whole app still needs a tighter and more unified brand voice.

### Why This Matters

Ichigo is a tone-sensitive product.
Language quality is not decoration here. It is part of the product.

### What Is Missing

- a documented voice system
- consistent terminology for:
  - post
  - ask
  - tone
  - response mode
  - room
  - safety
- final pass on low-signal helper copy and empty states

### What We Need

- voice guide
- controlled vocabulary
- page-by-page copy review

## 13. AI Is Still Supportive, Not Yet Essential

### Problem

AI endpoints exist, but they are not yet integrated strongly enough into the core user flow.

### What Is Missing

- inline mode suggestion while composing
- inline reply rewrite before submission
- explanation when a reply may miss the ask
- stronger moderator assistance

### Recommendation

Do not overbuild AI first.
Use it where it directly protects or strengthens the core loop:

- mode selection
- reply guidance
- moderation assistance

## What Should Be Prioritized Tomorrow

Tomorrow should not become another broad build day.
It should focus on the shortest path from `strong alpha` to `closed-beta MVP candidate`.

## Priority 1: Lock The Wedge

Decide the primary user wedge and align product copy and flows to it.

Deliverables:

- one sentence defining who Ichigo is for first
- one sentence defining the primary job-to-be-done
- remove or de-emphasize secondary stories from the home and app surfaces

## Priority 2: Design The First-Use Flow

Build the onboarding path for a brand-new user.

Deliverables:

- after-signup onboarding route or modal flow
- mode chooser guidance
- suggested first post templates
- sample success states

## Priority 3: Strengthen The Thread Value Loop

Make it obvious that response modes change outcomes.

Deliverables:

- stronger thread header guidance
- pre-reply prompts for mode fit
- visible alignment summary after replies
- better poster payoff states

## Priority 4: Establish The Trust Floor

Build the minimum safety layer required for real user testing.

Deliverables:

- block / mute plan
- rate-limit plan
- room moderation permissions
- improved report triage flow

## Priority 5: Add Instrumentation

Before larger testing, install measurement.

Deliverables:

- core event list
- funnel instrumentation
- MVP health metrics

## Suggested Work Order After Tomorrow

1. wedge definition
2. onboarding
3. reply-quality loop
4. trust floor
5. analytics
6. production infrastructure
7. broader beta

## What Not To Prioritize Yet

These may matter later, but they should not lead tomorrow:

- payments
- premium plans
- large-scale algorithmic feed work
- complex social graph mechanics
- deep gamification
- broad creator economy features
- major visual redesign unrelated to MVP conversion

## Exit Criteria Before Calling It MVP

Ichigo can be called an MVP when all of the following are true:

1. a clearly defined wedge exists
2. onboarding gets new users to first post quickly
3. reply quality feels materially better than normal social platforms
4. users can clearly perceive that context changed the conversation
5. moderation and abuse handling are good enough for real testing
6. analytics can tell us whether the product is actually working
7. mobile and desktop usage both feel reliable

## Short Conclusion

Ichigo is already beyond idea stage and beyond design fiction.
It is a real product build.

But it is still missing the things that make a product survive contact with real users:

- focus
- onboarding
- reply quality enforcement
- trust infrastructure
- measurement

That is the actual gap between `working product` and `market-viable MVP`.
