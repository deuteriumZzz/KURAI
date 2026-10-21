# KURAI — Product Experience Blueprint

## Product thesis

KURAI is a professional AI operating system for a person or a small team. It
combines the task-first clarity of Kimi, the model breadth expected from an AI
aggregator, and a restrained cyber-industrial material language. It is not a
game HUD, a provider catalogue, or a dark dashboard with neon decoration.

The product owns a user’s route from intention to a reusable result:

```text
signal (intent) → context → route → result → evidence / reuse
```

Cyberpunk is expressed through material, contrast, grid discipline, signal
feedback and motion. It must never obscure work, simulate false telemetry or
turn the interface into role-play.

The public landing is a separate marketing surface. This blueprint governs
authenticated product screens (`/app/*`), authentication and utility model
pages. Landing changes are intentionally a separate workstream.

## Competitive reading

| Reference | What KURAI learns | What KURAI must not copy |
| --- | --- | --- |
| Kimi | calm task-first composition, effortless input, responsive details | visual identity, exact layouts, generic empty space |
| SyntaxAI | clear model choice and aggregator capability | provider-first decision fatigue |
| CYBR dark reference | carbon substrate, strict modules, chartreuse command signal, large type | skull imagery, fake coordinates, terminal cosplay |
| CYBR paper reference | paper is a full system, not inverted dark mode; editorial grid and violet/lime | superficial light-theme inversion |
| Beyond Human reference | magenta signal, image-led atmosphere, dense purposeful panels | fictional logs, warning theatre, unreadable density |

## The two design systems

Night Ops and Paper System share the same information architecture, typography
roles, spacing scale and interaction states. They are different materials, not
automatic colour inversion.

### Night Ops — default workspace

| Token | Value | Semantic role |
| --- | --- | --- |
| Void carbon | `#0D1110` | base substrate |
| Graphite | `#171B19` | raised work surface |
| Ash | `#90938C` | quiet metadata |
| Bone | `#E7E4DA` | readable foreground |
| Radio lime | `#D7FF2F` | select, confirm, execute, active route |
| Signal magenta | `#E33A73` | generative media, live AI signal, unresolved event |
| System violet | `#8D72E8` | research, sources, structured context |

### Paper System — reading and analytical work

| Token | Value | Semantic role |
| --- | --- | --- |
| Paper | `#F1F0EC` | base substrate |
| Ink | `#111311` | foreground and structural rule |
| Paper graphite | `#D9D8D1` | raised surface |
| Paper ash | `#777A73` | quiet metadata |
| Radio lime | `#B9E600` | confirmation and active route |
| Signal magenta | `#C72F62` | generative media and special signal |
| System violet | `#7356D4` | research and source structure |

### Colour contract

1. Radio lime is an action and selected-state colour, never a permanent glow.
2. Signal magenta marks generative media, live AI signal and unusual system
   events. It is not the universal error colour; accessible red remains
   reserved for an error.
3. System violet belongs to research, evidence and connections.
4. One work surface has one dominant accent. Lime, magenta and violet never
   compete at equal strength on the same screen.
5. Cyan is retired as the primary KURAI signal.

## Visual grammar

### Structure

- A deterministic layout grid anchors real objects: conversation, source,
  file, route, artifact or ledger entry.
- One screen has one dominant working surface and at most two supporting
  surfaces. Equal bento-card layouts are prohibited.
- Boundaries are thin, deliberate and useful. Decorative lines without a
  content relationship are removed.
- Small technical labels identify state, source and cost. They never replace
  plain-language explanations.
- Texture is limited to subtle grain and a local scan/sweep on genuine live
  work. No full-screen animated noise or constant glitch.

### Typography

| Role | Use | Rules |
| --- | --- | --- |
| Display condensed | rare hero statements, empty-state anchors, mode title | short and tight, never long reading |
| Interface sans | controls, chat, document text | calm, high contrast, generous reading measure |
| Technical mono | model, route, cost, timestamps, source IDs | small and tabular, never long prose |

### Signature details

- `K/01`, `NODE`, `ROUTE`, `SOURCE` and similar labels are a compact KURAI
  indexing system, each attached to real data.
- Square corner markers and hatch patterns mark structure and irreversible
  actions.
- A lightweight contextual topology can represent a real project’s context;
  it must not be random background geometry.
- Model emblems are abstract KURAI identifiers, not copied provider logos.

## Product IA and screen blueprints

### App shell — Command Deck (P0)

**Job:** orient, navigate and preserve working context without dashboard noise.

- Narrow left rail: workspace identity, create command, primary destinations,
  recent conversation branches and account status.
- Central canvas: the current work. It receives visual priority.
- Contextual Inspector: an optional right rail for model route, sources,
  files, cost and artifact details. It opens only when it helps the current
  task.
- Desktop permits three zones; tablet collapses the Inspector; mobile uses a
  bottom command rail and sheets. No essential action is hover-only.

### Home — Command Deck (P0)

**Job:** start useful work in seconds.

- A composed task entrance, not an empty chat.
- Central universal composer with task, model/Auto route, tools, attachments
  and cost estimate.
- Recent work and pinned routes occupy supporting modules; no generic prompt
  card wall.
- A truthful readiness signal shows service, routes or limitations only when
  the data exists.
- One art-directed context topology may be present, built from actual current
  objects and quiet when the user begins typing.

### Conversation Workbench (P0)

**Job:** read, continue, branch, verify and reuse an AI result.

- Messages read as a document stream, not social bubbles.
- Each assistant result carries an unobtrusive receipt: model, cost, duration,
  sources and route decision.
- Hover/focus reveals a local action edge: copy, branch, save as artifact,
  inspect sources. Actions remain available by keyboard and touch.
- Source hover/focus links the source marker and the precise answer claim.
- Context rail shows what the selected run actually saw: files, instructions,
  sources, memory and used context.
- The composer remains anchored, readable and immediately usable while the
  Inspector opens and closes.

### Model Bay and Model Registry (P0 / P1)

**Job:** provide choice without forcing model expertise.

- Model Bay is an anchored, keyboard-safe panel, not a tiny dropdown.
- Begin with an outcome recommendation and route explanation; expose provider
  details only as a second layer.
- Filter by capabilities, price, latency, context and modality.
- `Compare Run` permits two or three bounded results for a single prompt. A
  selected winner can continue the main branch.
- Model Registry is a dense but readable comparison table with favourites and
  task-oriented groups.

### Evidence Room (P1)

**Job:** make research verifiable and reusable.

- A single work surface connects question, source, claim, uncertainty and
  final artifact.
- Violet expresses source structure; lime confirms verified work.
- Connections appear only when source relationships exist.
- Every research output preserves citations, retrieval date and uncertainty.

### Asset Bay (P1)

**Job:** make generated media useful after its first appearance.

- Real generated previews lead the layout; no abstract media placeholders.
- Metadata opens on demand: prompt, model, route, version, origin chat and
  reuse options.
- Magenta expresses generation and live asset work.
- A user can create variants, hand off an asset, download a private result or
  return to its originating conversation.

### Artifact Workspace (P1)

**Job:** turn a useful output into durable work.

- Save a response as a document, specification, table, recipe, image or
  research packet.
- Artifact provenance retains source answer, model, route, cost and sources.
- A handoff action turns an artifact into a follow-up prompt without context
  loss.

### Projects and Branch Map (P1)

**Job:** make long-running work recoverable.

- A project gathers chats, files, defaults and artifacts.
- Branch Map is a compact route diagram for real conversation forks, not a
  decorative graph.
- Create alternative paths from an answer, name them, compare them and return
  to the chosen outcome.

### Prompt Recipes (P1)

**Job:** make repeatable quality accessible.

- Recipes are parameterized workflows: research, document analysis,
  specification, comparison, code review and content plan.
- Show inputs, suggested modes, expected output and estimate.
- Save a user’s successful run as a private recipe.

### Billing Ledger and settings (P1)

**Job:** make control and privacy evident.

- Ledger is a quiet factual record of balance, reserves, settlements, refunds
  and forecasts. No theatrical colour treatment.
- Settings group appearance, privacy, data deletion, models, notifications
  and account. Destructive actions use unmistakable separation and hatch.

### Shared workspaces (P2, architecture first)

**Job:** permit collaboration without compromising account privacy.

- A personal workspace can publish a frozen, read-only chat snapshot through
  an opaque, expiring link. The owner can copy or revoke it without leaving
  the conversation; a public viewer never sees the workspace route or gains
  write access.
- Invite-only project access, comments on an answer/artifact and a full
  history of changes.
- Team roles are intentionally deferred until the account and sharing model
  is complete.

## Interaction and motion contract

Motion provides feedback, orientation and perceived continuity. It is not a
screen saver. All movement uses transform and opacity, respects
`prefers-reduced-motion` and KURAI calm mode, and never hides readable content
at load time.

| Surface | Distinct behaviour | Duration |
| --- | --- | --- |
| Rail navigation | label and index slide 2–4px; active rail locks into place | 140–170ms |
| Conversation item | subtle surface lift; receipt/actions unfold from trailing edge | 140–180ms |
| Assistant answer | action edge and source links emerge without moving prose | 140–180ms |
| Composer dispatch | one lime signal sweep, then a real queue/progress indicator | 180–240ms |
| Model Bay | origin-aware lift from trigger, internal detail crossfade | 180–220ms |
| Inspector | edge reveal from the right; canvas never jumps unexpectedly | 200–240ms |
| Source link | violet connection emphasis between source and claim | 120–160ms |
| Media asset | mask reveal for a completed image; metadata rises locally | 180–240ms |
| Theme switch | substrate and contrast transition; no white flash | 180–220ms |
| Error | static semantic treatment plus short local confirmation only | 100–140ms |

Rules:

1. At most three concurrent moving sources may be visible.
2. Each interaction category has a distinct response, but shares timing,
   easing and material rules. Random per-button effects are prohibited.
3. Hover enriches a control; it never provides the only way to invoke one.
4. Continuous animation exists only for a real pending state. Stop it at a
   terminal state.
5. Glitch is reserved for isolated fault/recovery moments, never for ordinary
   text, controls or navigation.

## Delivery plan

### Foundation — visual tokens and safety rails (P0)

1. Replace cyan-first token usage with Night Ops / Paper System semantic
   tokens and establish contrast tests.
2. Define typography roles, spacing, grid, border, hatch, z-index and motion
   tokens.
3. Add a theme preference that persists locally and follows system preference
   on first use.
4. Add tests for theme persistence, keyboard focus and no-motion behaviour.

### Workbench core — first useful session (P0)

1. Rebuild the App Shell with the rail, central work canvas and contextual
   Inspector frame.
2. Recompose Home and universal composer around one dominant task surface.
3. Rebuild Conversation Workbench: answer receipt, source action edge,
   context rail and stable composer.
4. Upgrade Model Bay’s visual hierarchy without regressing keyboard model
   selection or OpenRouter quote behavior.
5. Test authenticated navigation, model selection, message send/cancel and
   reduced-motion paths.

### Reuse and evidence — professional depth (P1)

1. Deliver Model Registry and Compare Run.
2. Deliver Evidence Room, Context Rail and durable source provenance.
3. Deliver Asset Bay, Artifact Workspace, Prompt Recipes and Branch Map.
4. Tighten Projects, Billing Ledger and Settings around real data states.

### Trust, collaboration and release craft (P2)

1. Add share-safe artifact collaboration when backend roles are ready.
2. Complete empty, loading, degraded, error, cancellation and recovery states.
3. Test 375px, 768px, 1024px, 1280px and large desktop; keyboard, touch,
   zoom, high contrast and reduced motion are release gates.
4. Profile interaction latency and layout stability. No visual effect justifies
   blocking input, streaming or Core Web Vitals.

## Definition of done

The product redesign is ready when:

- a first-time user can send a task without knowing model names;
- a power user can select, compare and explain model choice;
- every route, source, cost and artifact can be understood after reload;
- Night Ops and Paper System each feel authored, coherent and readable;
- no action is broken, hidden behind hover or dependent on animation;
- every effect has a real semantic purpose;
- no screen reads as a generic neon SaaS template, fake terminal or game HUD;
- mobile retains create, inspect, stop, reuse and share capabilities;
- automated tests, typecheck, lint and visual interaction checks pass.

---

# Master execution plan — KURAI Workbench 2026-09-30

## Canonical visual target

The supplied **KURAI research workbench** reference is the canonical desktop
composition for the authenticated product. It replaces any interpretation that
turns the workspace into a dense cyber-HUD, a card wall, or a landing-page
concept.

```text
left rail             central document canvas                    contextual inspector
workspace + history   task title → conversation → anchored input  model → cost → sources → next work
```

It is a product-specific composition, not a screenshot to copy. KURAI keeps
its own model routing, price estimates, projects, artefacts, media and agent
states. Kimi informs calm task-first ergonomics; Qronos informs compositional
weight and system hierarchy; the CYBR references inform material and signal
discipline. Cyberpunk is expressed through graphite, paper, condensed type,
lime/magenta/violet signals and precise motion — never role-play telemetry.

### Fixed rules

1. The public landing shares the workspace material (2026-10-21): the same
   palette, fonts, geometry and `k-index` + `.k-display` page header. Its hero is
   the real composer with a server-priced estimate; landing data comes from the
   public catalog API, never from mocks.
2. `/app/*` uses one family of layouts; no individual feature gets a separate
   visual world.
3. The central canvas is always the primary task: write, read, inspect or
   create. Supporting surfaces may not compete with it.
4. The right Inspector is contextual and factual. It is not permanent
   decoration and never invents status, cost, source or model data.
5. The product must remain usable without hover, motion, sound, WebGL or a
   large desktop viewport.
6. Motion conveys a real state transition. Decorative persistence, fake online
   activity, looping progress and full-screen HUD grids are out of scope.

## Capability statement

After this programme ships, a person can start a task without model expertise,
understand the selected route and price, work in a readable conversational
document, inspect real evidence and context, preserve output as a project or
artefact, and return to the work without losing the thread. Every modality is
recognisably part of one premium KURAI operating system.

## Current baseline: retained versus replaced

### Retained product truth

- One OpenRouter-backed model route and explicit model choice.
- A unified composer for text, images, video, audio, research and slides.
- Real chat branches, files, projects, price estimates, balances, artefacts,
  sources and model metadata where the backend contract provides them.
- Existing authentication, API, billing-ledger and safety work remains a
  product constraint; the redesign must not reintroduce synthetic promises.

### Replaced presentation

- Card-grid homes, generic AI gradients, cyan-first colour, HUD labels around
  ordinary inputs, constant grids, glowing answer rectangles and generic
  dashboard density.
- Any interaction which only exists as a visual prop: fake model availability,
  fake source maps, fake agent status, fake activity or fake payment success.

### First foundation already present

- Night Ops / Paper System semantic token direction.
- A quieter command entrance, document-first answer treatment and a compact
  model selector direction.
- A reduced sidebar and removal of the most visible answer/composer glow
  framing.

These are foundations only. They are not the completion of the programme.

## Master delivery sequence

### Phase 0 — lock the system contract

**Goal:** make every later visual decision consistent and implementable.

- Consolidate the current style rules into shared tokens for colour, type,
  spacing, surfaces, borders, elevations, z-indexes and motion.
- Establish the supplied Workbench as the screenshot-review master for desktop
  and define its mobile interpretation: rail becomes a sheet, Inspector becomes
  a sheet, composer remains in thumb reach.
- Inventory each route and mark it as: replace, align, retain, external
  dependency or intentionally deferred.
- Define a reusable state matrix: empty, loading, populated, streaming,
  success, degraded, offline, cancellation and error.
- Define visual truth rules for data: a state only receives a signal if the
  corresponding API or client state exists.

**Done when:** every implementation task can select tokens and a motion pattern
without inventing a one-off visual language.

### Phase 1 — material, typography and themes

**Goal:** establish the authored KURAI substrate before rebuilding screens.

- Night Ops: void carbon, graphite surfaces, bone reading text, radio-lime
  command signal, magenta generation signal, violet evidence signal.
- Paper System: warm technical paper, ink structure, deeper lime, authored
  magenta and violet; never a simple dark inversion.
- Type roles: calm sans for reading, condensed display for rare anchors, mono
  for values and provenance only.
- Shared spacing scale `4/8/12/16/24/32/48/64`, document reading measure,
  1px structural rules and minimal radii.
- Focus, selection, scrollbar and disabled-state design for both themes.
- Contrast verification for body copy, controls, colour-only signals and
  keyboard focus.

**Do not add:** glass, blur cards, cyan as a brand colour, permanent glow,
rounded pill collections or full-screen decorative grids.

**Done when:** switching themes changes material rather than merely colours,
and a screen remains recognisable as KURAI in both themes.

### Phase 2 — application shell and information architecture

**Goal:** make navigation feel calm, expensive and immediately legible.

- Desktop left rail: KURAI mark, New chat, Search, Library/Models, Agents,
  Settings/account, project groups, history and archive. Keep the rail short;
  secondary destinations live in contextual menus or command search.
- A compact project tree with create, expand, active and unread states.
- Distinct but restrained rail behaviours: chat rows trace, project rows unfold,
  library rows reveal a media mark, active route locks a lime rail marker.
- Persistent account footer with balance and a compact account menu.
- Tablet collapses the Inspector first; phone turns the rail into a drawer and
  protects the composer from any overlay.
- Page changes preserve the application shell. There is no neon page-load bar
  or full-page flash.

**Done when:** a user can orient themselves in two seconds and reach any
frequent action without decoding a crowded menu.

### Phase 3 — Command Deck (`/app`)

**Goal:** make starting work feel as simple as Kimi, with KURAI-specific route
control.

- One primary prompt: a short task-first heading and universal composer.
- The composer owns mode, files, web/reasoning tools, model route and price.
- Quick starts are three to four text-led routes, not a gallery of stock art or
equal cards.
- A real readiness signal appears only where backend/client state exists;
otherwise the interface stays quiet.
- Recent project/activity information is subordinate and must never move the
composer from its visual centre.
- Optional empty-state signal field may use Canvas only when it represents real
current project/context entities; it must fade behind typing.

**Motion:** heading/document entrance once; composer focus material shift;
file handoff; send press and a single route sweep. No attention-seeking loops.

**Done when:** a new user can describe a task, attach evidence, choose or keep
Auto routing and understand estimated cost before launching.

### Phase 4 — universal Composer and Model Bay

**Goal:** make the input feel like a professional instrument rather than a
decorated text box.

- Composer states: empty, focused, dragged-over, files processing, route
  quoted, insufficient balance, pending confirmation, sending, streaming and
  stopped.
- Attachments become factual chips with type, size, processing status and
  removal. Files can be reused from the project.
- Mode settings remain a compact horizontal control row. Selecting a mode must
  never reveal a wall of decorative model cards.
- Model Bay is an anchored module: search; Auto; favourites; recent models;
  task groups; model, context and estimated price columns; short route reason.
- Compare Run supports two or three selected routes, displays the total known
  estimate and clearly creates separate answer branches.
- Keyboard flow covers opening, search, arrows, selection, escape and focus
  return.

**Motion:** Model Bay inserts from its trigger; selected row receives a precise
rail marker; details crossfade without height jumps; send performs a bounded
signal handoff.

**Done when:** a non-expert can use Auto confidently and an expert can select
a specific model without leaving the current task.

### Phase 5 — Conversation Workbench (`/app/c/[id]`)

**Goal:** build the canonical supplied reference screen as KURAI's primary
working scene.

- Three-zone desktop topology: left rail, document canvas, contextual
  Inspector. Central canvas uses a calm readable measure, not edge-to-edge
  conversation bubbles.
- Header: task title, small metadata, share/menu actions and no visual noise.
- User messages are restrained surfaces. Assistant messages are document
  sections; answers never receive a glow rectangle, neon outline or permanent
  animated edge.
- Assistant receipt: selected model, real cost/duration, version and sources
  only when supplied by the run.
- Action layer: copy, regenerate, branch, pin, save as artefact and feedback.
  It appears on hover/focus but is always available on touch and keyboard.
- Anchored dock composer remains stable as replies, Inspector and artefact
  details change.
- Search, branch navigation, response versions, interrupted responses and
  streaming state are designed as first-class states.

**Done when:** the screen matches the reference's hierarchy and reading calm,
while retaining all real KURAI capabilities.

### Phase 6 — contextual Inspector and evidence

**Goal:** make right-side information helpful enough to justify its space.

- Inspector modules: current model route, estimated/actual cost, context usage,
  files, source list, artefact details, selected branch and next actions.
- Modules are shown only when relevant. An ordinary text chat may show model
  and context; research adds evidence; media adds generation details.
- Evidence room joins claim, citation, source, retrieval time and uncertainty.
- Source-hover/focus links a claim to its actual source in violet, with a
  keyboard-equivalent control.
- Related requests become useful continuations derived from current work, not
  generic marketing suggestions.

**Motion:** Inspector enters from the edge without reflow surprise; sources
locally connect to claims; cards do not float or glow.

**Done when:** users can explain why a result was produced and where its facts
came from after reopening the conversation.

### Phase 7 — agent and Research workspaces

**Goal:** make long-running work transparent and controllable.

- Plan before run, current step, completed steps, factual tool/source activity,
  stop, intervene, continue and recovery paths.
- Research runs receive a dedicated evidence view without abandoning the
  Workbench frame.
- A contextual topology/Canvas is allowed only for real task/source/artefact
  relationships, with a document fallback.
- Finished work resolves into an answer plus reusable research packet.
- Agent status persists into the project and sidebar only while it is factual.

**Motion:** each completed step seals once; current activity has a small local
signal; terminal states stop all continuous motion.

**Done when:** a user can understand, trust, interrupt and reuse a multi-step
run without reading an opaque event log.

### Phase 8 — media and Asset Bay (`/app/media`)

**Goal:** make images, video and audio durable working output.

- Asset grid/list is media-led but editorial, not a generic bento gallery.
- Inspect image/video/audio generation metadata on demand: prompt, model,
  route, version, origin chat and project.
- Image actions: variants, edit, upscale, animate, compare before/after,
  download and return to chat/project.
- Video actions: truthful progress/queue states, timeline, playback, versions
  and export.
- Audio actions: waveform, playback, speed and download.
- Magenta marks real media generation and ready-state handoff; lime confirms
  a selected/finished action.

**Motion:** image mask reveal once available, gentle preview focus, draggable
before/after, real waveform/playhead. Never fake rendering percentage.

**Done when:** media remains useful and traceable after the originating chat is
closed.

### Phase 9 — artefacts, projects, branches and recipes

**Goal:** turn chats into reusable long-term work.

- Artefact Workspace for documents, specifications, tables, slide decks,
  research packets, code and media.
- Provenance connects artefact, originating run, model, cost, citations and
  project without exposing unnecessary private IDs on public views.
- Projects organise conversations, files, project instructions, defaults and
  artefacts.
- Branch Map is a compact representation of actual conversation forks. It is
  never a random glowing graph.
- Recipes store successful reusable workflows with inputs, output expectation,
  suggested route and known estimate.
- Split view and Focus mode cover deep work: chat + artefact, or one surface
  without distracting navigation.

**Motion:** artefacts emerge from their source answer, then can hand off back
to a prompt; branch selection changes only the local work context.

**Done when:** a result can move between chat, project, artefact and future
work without lost context.

### Phase 10 — account, billing, sharing and trust surfaces

**Goal:** make commercial and privacy-critical moments calm and credible.

- Access gate: simple sign-in/register/recovery states with no false Telegram,
  email or provider claims.
- Billing Ledger: balance, estimate, reserve, settlement, refund, receipt and
  forecast as factual financial records. No cyber-drama.
- Settings: appearance, calm mode, defaults, privacy, export and deletion.
- Sharing: opaque expiring read-only token, explicit revoke, public DTO with
  allowlisted fields, no workspace IDs or private asset URLs in a snapshot.
- Payments, provider fallback policy and retention jobs remain externally
  dependent until their real provider/legal policies are implemented; they must
  not be represented as complete earlier.

**Done when:** users can understand costs, control their data and safely share
a result without misleading UI claims.

### Phase 11 — motion, delight and signature details

**Goal:** give KURAI a recognisable living character without reducing clarity.

- Create an **Ambient Field** system with four deliberately different layers:
  1. **Material grain:** a static, low-contrast print/screen texture for both
     themes. It gives surfaces physical depth but never moves or competes with
     text.
  2. **Command Deck signal field:** a low-density Canvas field behind the empty
     home canvas. It reacts subtly to pointer proximity and composer focus,
     then recedes almost completely while a user types. It is abstract KURAI
     material, not fake telemetry and not a full-screen particle wallpaper.
  3. **Work event signal:** one local lime route sweep from composer to the
     active document only after a real send; one magenta local signal around a
     genuinely running media job. Both decay at terminal state.
  4. **Factual topology:** Research and agent work may render Canvas/WebGL
     connections only from actual sources, task steps, files and artefacts.
     The document fallback remains available at all times.
- Conversation Workbench backgrounds stay materially quiet: no permanent grid,
  cursor spotlight, ambient glow, scanning line or moving particles behind
  reading. Depth comes from typography, surfaces and local interactions.
- Theme switching morphs substrate, grain and semantic accents in place. It
  does not white-flash the page or replay an entrance animation.
- Create a Motion Kit with named primitives: rail trace, module insert,
  document reveal, route handoff, signal sweep, media mask reveal, source
  connection, result seal and recovery confirmation.
- Every primitive receives default, hover, focus, press, loading, success,
  error, touch and reduced-motion behaviour.
- Distinguish movement by surface: rail shifts 2–4px; a model selector inserts;
  a document reveals; a source connects; media focuses; agents seal steps.
- Add optional sound only after the visual system is finished, disabled by
  default, with separate user preference. It may signal a real completion or
  error, never decorate navigation.
- Add one signature Canvas/WebGL scene only after the document and mobile
  fallback are complete. Candidate: live agent context topology. It must be
  optional, locally scoped and derived from real state.

**Do not add:** permanent cursor effects, global parallax, looping glitch,
ambient fake activity, dense particle fields, or multiple concurrent scenes.

**Done when:** every interaction has a specific, recognisable and accessible
response, while a quiet screenshot still looks complete.

### Motion and interaction catalogue

The following catalogue is part of Phase 2–11 work. It is not a request to
animate every visible object at once: each pattern appears only in its relevant
state and follows the timing, factual-state and calm-mode rules above.

| Area | Interaction / motion | Product meaning |
| --- | --- | --- |
| Left rail | Chat row trace, project unfold, active route lock, trailing action reveal | orient, select, manage real history |
| Command palette | Trigger morphs into search; result preview changes locally; keyboard selection follows | find a command or existing work |
| New chat | Central composer becomes the conversation dock after dispatch | preserve the user's mental context |
| Composer | Focus material shift, drag-in attachment handoff, voice waveform, price update, send press, route sweep | compose, configure and launch a task |
| Attachments | File chip enters, reports processing, resolves to ready/error, can be removed | show real file lifecycle |
| Model Bay | Trigger-origin module insert, active route marker, details crossfade, Compare Run collection | understand and choose a route |
| Model Registry | Filter transition, favourite confirmation, comparison rows assemble | compare real model capabilities |
| User message | Quiet surface acknowledgement and edit transition | preserve a user's intent |
| Assistant answer | Document reveal, stream caret, action layer, version handoff, citation connection | read, inspect and reuse a result |
| Answer actions | Copy-to-check, pin seal, branch handoff, regenerate recovery | confirm a meaningful local action |
| Research | Real source node/claim connection, evidence section reveal, confidence change | verify work and uncertainty |
| Agent run | Plan step seal, current-step local signal, intervention/recovery action | understand and control a long task |
| Image result | Blur/mask-to-ready reveal, variant layout transition, before/after drag | inspect and iterate a real asset |
| Video result | Truthful queue/job state, timeline/playhead, ready handoff | follow an actual video job |
| Audio result | Waveform playback, playhead and speed transition | inspect real generated audio |
| Artefact | Emerges from answer, opens into workspace, returns as a durable link | turn chat output into work |
| Project | Context gathers in layers; branch/map opens only from actual relations | recover long-running work |
| Inspector | Right-edge module insert; changes content without central-canvas jump | inspect relevant context |
| Billing | Factual ledger row arrival, reserve/settle/refund status changes | understand money without theatre |
| Sharing | Link creation/revoke confirmation and read-only state | communicate a safe sharing boundary |
| Error / retry | Local semantic state, one short acknowledgement, precise recovery control | recover rather than dramatise failure |
| Notifications | One arrival, quiet persistence, explicit dismissal or completion | keep user informed without distraction |
| Theme | Material/ink/accent morph in place | change working material without reloading work |

#### Optional high-craft scenes

- **Context Thread:** on request, a thin relation trace links an answer claim
  with its source, file or artefact. It is never permanently drawn over prose.
- **Route Handoff:** changing a model or continuing a branch visually transfers
  the active route to the next result without implying that models share hidden
  context they did not receive.
- **Result Seal:** a completed, saved or exported artefact receives one small
  local confirmation, then returns to the quiet resting state.
- **Memory Fold:** when real context compression occurs, the old range folds
  into a readable summary with a reversible link to its source messages.
- **Focus mode:** surrounding navigation recedes when reading/editing an
  artefact, then restores without changing the document's scroll position.
- **Presentation mode:** an artefact or report removes controls and preserves
  a clear return path; it does not expose private workspace metadata.

#### Motion state requirements

Every interactive component in the catalogue must define: default, hover,
focus, pressed, disabled, loading, success, error, touch and calm/reduced-motion
behaviour. Sound and haptics, if added after visual completion, are opt-in and
only accompany real send, completion or error events.

### Phase 12 — responsive, accessibility and localisation hardening

**Goal:** the system remains premium in every usable condition.

- Validate 375px, 768px, 1024px, 1280px and large desktop.
- Mobile: drawer rail, Inspector sheet, Model Bay sheet, minimum 44px targets,
  persistent thumb-zone composer and no hover-only information.
- Keyboard: logical order, visible focus, escape routes, trapped-modal safety,
  shortcuts and screen-reader announcements for streaming/progress/errors.
- Respect `prefers-reduced-motion`, KURAI calm mode, contrast preferences and
  text zoom.
- Move copy into localisation primitives and test long Russian strings before
  adding English.

**Done when:** the main task can be completed by keyboard, touch, zoomed text
or reduced motion without lost functionality.

### Phase 13 — API alignment and release verification

**Goal:** replace visual confidence with tested product truth.

- Map each UI status to API contracts: member, workspace, models,
  capabilities, quote, ledger, chat stream, files, sources, artefacts,
  sharing and job states.
- Use explicit degraded/offline states instead of believable mock facts.
- Test: authentication → workspace → quote → model selection → send/stream →
  cancel/retry → source/artefact reuse → billing record → deletion/share.
- Capture desktop and mobile screenshots for each critical state and review
  against the canonical Workbench.
- Run unit, integration and E2E coverage; typecheck; lint; production build;
  accessibility checks; motion/reduced-motion checks; visual detector.
- Run a final independent review for visual craft, security and product truth.

**Done when:** the product looks authored, works with factual state, and every
critical route has verified success, failure and recovery behaviour.

## Cross-cutting state inventory

Every Phase 3–10 surface must explicitly design the following where applicable:

| State | Required treatment |
| --- | --- |
| First run | one useful next action, no tutorial wall |
| Empty | explain what can be created; no decorative dead space |
| Loading | stable skeleton/material, never a fake percentage |
| Streaming | real text/job progress, stop/recovery control |
| Ready | local result seal, no permanent celebration |
| Offline/degraded | plain-language limitation and safe retry |
| Error | local semantic error + exact recovery path |
| Cancelled | preserve partial work and cost truth |
| Permission/billing | explain requirement before irreversible action |
| Overflow | readable truncation, inspectable full content |
| Destructive | separated visual zone, confirmation and undo where possible |

## Completion gates

The redesign may be called complete only when all gates are true:

1. The supplied Workbench composition is visibly realised on desktop, with a
   mobile-native equivalent.
2. Home, conversation, Model Bay, Research, media, artefacts, projects,
   billing, settings and auth share one recognisable KURAI system.
3. Every visual signal corresponds to factual product state.
4. The interface is quieter than the old HUD direction while feeling more
   alive through intentional local motion.
5. A first-time user, regular user and power user can each complete their core
   tasks without model/provider confusion.
6. Dark and Paper themes are independently authored and accessible.
7. No route remains a decorative placeholder, synthetic payment/fallback claim
   or unhandled state.
8. Automated, responsive, accessibility, visual and security checks pass.
