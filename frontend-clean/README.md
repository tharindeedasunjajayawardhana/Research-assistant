# Paper Insight

Build: AI Research Assistant

Build a polished, production-quality frontend web application called AI Research Assistant.

Product tagline

Understand papers. Ask questions. Cite the page.

The application is a research-paper understanding tool. A user uploads one research paper in PDF format, the application detects basic document information, allows the user to choose a response language, generates a structured summary, and provides a citation-grounded chat interface for asking questions about the uploaded paper.

The frontend must be designed so that a real FastAPI/Python backend can replace the mock API later without requiring changes to the visual components.

1. IMPORTANT: FRONTEND-ONLY SCOPE

This task is primarily to build the frontend application and frontend architecture.

Do NOT implement a real LLM, RAG pipeline, OCR service, database, PDF processing backend, authentication system, or autonomous agent.

Instead:

Build the complete polished frontend.
Build a clean API abstraction in src/lib/api.ts.
Use realistic mock responses behind that API.
Make the frontend ready to connect to a real FastAPI backend later.
Do not invent fake backend endpoints outside src/lib/api.ts.
Do not put backend logic inside React components.

The application must work completely with mock data when USE_MOCK = true.

2. TECHNOLOGY

Use:

React
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query / React Query
Lucide React
Framer Motion

Use the project's existing build tooling where possible.

Do not add unnecessary dependencies.

Do not add a library unless it is genuinely required by this specification.

Use Inter as the primary font.

3. ARCHITECTURE RULES — STRICT
   API boundary

ALL application data access MUST go through:

src/lib/api.ts

Components must NEVER:

call fetch() directly
call Axios directly
contain API URLs
contain mock API objects
contain hardcoded paper data
contain hardcoded chat messages
contain hardcoded summary content

The intended architecture is:

React Component
↓
Custom Hook
↓
src/lib/api.ts
↓
Mock API OR Real FastAPI API

The components should not know whether the data is mocked or real.

4. REQUIRED FILES

Use this structure:

src/
├── components/
│ ├── upload/
│ ├── workspace/
│ ├── summary/
│ ├── chat/
│ ├── citation/
│ ├── layout/
│ └── ui/
│
├── hooks/
│ ├── usePaper.ts
│ ├── useSummary.ts
│ └── useChat.ts
│
├── lib/
│ ├── api.ts
│ ├── types.ts
│ ├── citations.ts
│ └── utils.ts
│
├── pages/
│ ├── LandingPage.tsx
│ └── PaperWorkspacePage.tsx
│
├── App.tsx
└── main.tsx

You may create additional small components/hooks when necessary, but preserve this organization.

5. TYPES — EXACTLY AS PROVIDED

Put ALL application/domain TypeScript types in:

src/lib/types.ts

Use these exact definitions:

type Language = "ja" | "en" | "si" | "zh" | "es" | "fr" | "de" | "other";

type ResponseLanguage =
| "auto"
| "en"
| "ja"
| "si";

interface Paper {
id: string;
filename: string;
language: Language;
language_name: string;
page_count: number;
status: "processing" | "ready" | "failed";
low_text_pages: number[];
}

interface SourcedText {
text: string;
sources: number[];
}

interface Summary {
title: string;
authors: string[];
abstract: SourcedText;
problem_statement: SourcedText;
methodology: SourcedText;
key_results: SourcedText;
conclusion: SourcedText;
}

interface Source {
page: number;
snippet: string;
}

interface ChatMessage {
id: string;
role: "user" | "assistant";
content: string;
sources: Source[];
}

Do not duplicate these application types elsewhere.

Do not create alternative versions of Paper, Summary, ChatMessage, etc.

Use these types throughout the application.

6. API CONTRACT — EXACT

src/lib/api.ts must expose:

uploadPaper(
file: File,
onProgress: (pct: number) => void
): Promise<Paper>;

getPaper(id: string): Promise<Paper>;

getSummary(
id: string,
lang: ResponseLanguage
): Promise<Summary>;

sendChat(
id: string,
question: string,
lang: ResponseLanguage
): Promise<ChatMessage>;

Also export:

USE_MOCK

The default must be:

const USE_MOCK = true;

Support:

VITE_API_URL

through Vite environment variables.

The real API implementation must use VITE_API_URL when:

USE_MOCK = false

Do not expose secrets in frontend code.

7. MOCK API REQUIREMENTS

The mock API must feel realistic.

Use asynchronous delays between approximately 800–1500 ms.

uploadPaper

Simulate upload progress.

The progress callback should gradually move through realistic values rather than immediately jumping to 100%.

Example progression:

0
15
31
48
67
82
94
100

Then return the mock Paper.

getPaper

Wait approximately 800–1500 ms and return the mock paper.

getSummary

Wait approximately 800–1500 ms and return the complete mock summary.

Respect the requested response language conceptually.

For the prototype, English/Japanese/Sinhala can use the same underlying evidence while the UI demonstrates the language-selection behavior.

sendChat

Wait approximately 800–1500 ms and return realistic predefined mock responses.

The UI must not contain the mock responses.

Mock responses belong in api.ts.

8. MOCK PAPER

Create exactly one realistic mock research paper.

Filename:

attention-is-all-you-need-ja.pdf

Title:

Attention Is All You Need

Authors:

Ashish Vaswani
Noam Shazeer
Niki Parmar

Language:

ja

Language name:

Japanese

Pages:

18

Status:

ready

Low-text pages:

[12, 13]

Use realistic paper metadata and realistic source page numbers.

9. MOCK SUMMARY

Create a complete realistic Summary object.

It must include:

title
authors
abstract
problem statement
methodology
key results
conclusion

Every SourcedText must include realistic page citations.

Use realistic page ranges based on the actual structure of the paper.

For example:

Abstract: early pages
Problem statement: early pages
Methodology: methodology/architecture pages
Results: experimental section pages
Conclusion: final pages

Do not use obviously fake citations such as every section citing page 1.

The summary must feel like a genuine research-paper summary.

10. MOCK CHAT

Create at least two realistic predefined assistant responses.

Each response must include:

natural answer text
citations embedded in the content
source page references
realistic source snippets

Example conceptual format:

The Transformer replaces recurrence with attention mechanisms, allowing
the model to process sequence elements in parallel. [Page 3]

and:

The authors report that the Transformer achieved strong translation
performance while requiring substantially less training time than
several recurrent architectures. [Pages 7–8]

The actual mock content should be more complete and realistic.

Do not hardcode these responses inside Chat components.

11. CITATION SYSTEM

Create:

src/lib/citations.ts

This file owns citation parsing/formatting logic.

The API returns plain text.

Example:

The model uses self-attention [Page 5].

The UI must convert:

[Page 5]

into a clickable citation chip:

📄 Page 5

Support:

[Page 5]
[Pages 4–6]

and similar page references.

Every individual page should remain clickable.

For example:

Pages 4–6

📄 4 📄 5 📄 6

Do NOT return JSX/HTML from the API.

Citation parsing belongs in the frontend citation utility/component layer.

12. DESIGN DIRECTION

The application should feel inspired by the product quality and simplicity of:

Notion
Perplexity
Claude
Linear
Elicit

Do NOT make it look like:

a generic admin dashboard
a template SaaS dashboard
a cryptocurrency dashboard
a developer console
an overly colorful AI landing page

The visual identity should be:

calm
academic
trustworthy
intelligent
spacious
modern
premium
focused

The product should feel appropriate for researchers, students, engineers, academics, and knowledge workers.

13. COLOR SYSTEM

Primary:

#5668AE

Primary hover:

#4D5FA3

Light background:

#F8F8F5

Card background:

#FFFFFF

Dark background:

#0E1928

Dark surface:

#152131

Primary text:

#0E1928

Secondary text:

#667085

Warning:

#F25F27

Border:

#E7E7E2

Muted sage:

#9AA093

Accent brown:

#7D6653

Rules:

Indigo is the primary interactive accent.
Orange is warning-only.
Never use bright orange for primary buttons.
Never use pure black backgrounds.
Avoid harsh shadows.
Prefer subtle borders and soft elevation. 14. GLOBAL DESIGN

Use:

rounded-xl
rounded-2xl
approximately 24px cards where appropriate
subtle shadows
soft borders
generous whitespace
strong typography hierarchy
200ms transitions

Do not overuse rounded pills.

Use rounded shapes intentionally.

15. ACCESSIBILITY

The entire application must be accessible.

Implement:

semantic HTML
appropriate ARIA labels
keyboard navigation
visible focus states
keyboard-accessible dialogs/drawers
accessible buttons
accessible form labels
sufficient color contrast
aria-live where appropriate for upload/processing status
Escape key support for drawers
focus management for modal/drawer interactions

Do not rely on color alone to communicate state.

16. DARK MODE

Implement:

light mode
dark mode
system preference detection
manual theme toggle

Dark colors:

Background: #0E1928
Surface: #152131
Text: #F8FAFC
Accent: #5668AE
Border: rgba(255,255,255,0.08)

No pure black.

The UI must remain readable and elegant in both modes.

17. RESPONSIVENESS

Design mobile-first.

The application must work well on:

mobile
tablet
laptop
desktop

Do not simply shrink the desktop UI.

For mobile:

stack content naturally
make citation panels bottom sheets
ensure chat input remains usable
avoid horizontal scrolling
preserve readable typography 18. ROUTING

Use:

/

for the landing/upload page.

Use:

/paper/:id

for the paper workspace.

Summary and Chat are tabs within the workspace.

Do not create separate pages for Summary and Chat.

The architecture should make future tabs such as Notes and Quiz easy to add, but do not implement those tabs yet.

19. LANDING PAGE

Create a beautiful centered hero.

Main heading:

AI Research Assistant

Large tagline:

Understand papers.
Ask questions.
Cite the page.

Add a subtle radial indigo gradient behind the hero.

Keep it restrained.

The page should feel premium and academic rather than flashy.

20. UPLOAD AREA

Create a large drag-and-drop upload area.

Content:

Drop your research paper here

Button:

Choose PDF

Supporting text:

One paper at a time · PDF only · max 20 MB

The upload area must support:

click to select
drag and drop
keyboard access
PDF validation
file size validation
accessible error messages 21. UPLOAD VALIDATION

Client-side validation:

File type

Only PDF.

If invalid:

Please upload a PDF file.

File size

Maximum 20 MB.

If too large:

Files larger than 20 MB are not supported.

Errors must appear inline and be friendly.

Do not use browser alert().

22. UPLOAD FLOW

After selecting a valid file:

Show an animated upload state.

Example:

Uploading...
67%

Display a progress bar.

After completion:

✓ Uploaded

Then automatically continue to the paper-detected state.

Do not require the user to manually navigate to another page after upload.

23. PAPER DETECTED SCREEN

After upload, show a centered card.

Title:

Paper detected

Display:

Language

🇯🇵 Japanese

and:

Pages

18

Then:

Response language

with dropdown options:

Auto
English
Japanese
Sinhala

Helper text:

Auto answers in the language used in your question.

Also display:

✓ Multilingual retrieval enabled

The exact visual treatment should feel like a polished information card, not a form dashboard.

24. RESPONSE LANGUAGE BEHAVIOR

The response language selection applies to:

generated summary
future chat responses

The original paper must NEVER be modified or translated in storage.

The original document remains untouched.

The user can choose:

Auto
English
Japanese
Sinhala

Interpret Auto as:

Respond in the language used in the user's question.

When the response language changes:

request/regenerate the summary through getSummary(id, lang)
apply the selected language to future sendChat() calls

Do not perform API calls directly from components.

25. LOW-TEXT WARNING

If:

low_text_pages

is not empty, show an amber warning banner.

For the mock paper:

Pages 12–13 appear to be scanned or image-based.
Text extraction may be incomplete for these pages.

Format page numbers into compact ranges.

For example:

[12,13]

becomes:

Pages 12–13

The warning must be informative, not alarming.

Use orange only for this warning state.

26. ANALYZE PAPER

Provide a primary button:

Analyze paper

When clicked, show an animated analysis stepper:

✓ Extracting text
✓ Detecting language
● Generating summary

Use Framer Motion for subtle progress animation.

The processing UI should feel like a real AI document-analysis workflow.

Do not create fake technical details such as "Training neural network" or "Running quantum analysis."

Keep the steps relevant:

Extracting text
Detecting language
Generating summary

27. WORKSPACE

After analysis, navigate to:

/paper/:id

Create a polished research workspace.

28. TOP BAR

Left side:

paper title
filename
language badge
page count

Example:

Attention Is All You Need
attention-is-all-you-need-ja.pdf

Japanese · 18 pages

Right side:

response language dropdown
Upload New Paper button
theme toggle

The top bar should remain clean and compact.

29. UPLOAD NEW PAPER

The user should be able to return to the upload flow.

Button:

Upload New Paper

Do not implement multiple simultaneous papers.

The application supports one paper at a time.

30. PERSISTENT WARNING BANNER

Under the workspace top bar, show the low-text warning whenever:

paper.low_text_pages.length > 0

It should be dismissible.

Dismissal only affects the current UI view.

Do not modify the paper data.

31. TABS

Implement:

Summary
Chat

Do not implement:

Notes
Quiz

yet.

However, structure the tab components so future tabs can be added easily.

Do not show disabled fake tabs.

32. SUMMARY TAB

Display six polished cards:

Title & Authors
Abstract
Problem Statement
Methodology
Key Results
Conclusion

Each card should have:

clear heading
readable content
citations
subtle border
subtle shadow
approximately 24px radius
comfortable spacing

Do not cram everything into one giant card.

33. TITLE & AUTHORS

Display:

Attention Is All You Need

Then authors:

Ashish Vaswani
Noam Shazeer
Niki Parmar

Make this visually distinct from the other sections.

34. SUMMARY SOURCES

Each sourced section contains:

text
sources

Render the source pages beneath or alongside the text.

Example:

The Transformer architecture relies entirely on
attention mechanisms...

Sources

📄 3
📄 4

Every page chip is clickable.

35. SUMMARY LOADING

While getSummary() is pending:

Show skeleton loaders.

Do not show fake summary text.

Use animated skeletons that resemble the final cards.

36. SUMMARY ERROR

If summary generation fails:

Display a polished error state:

We couldn't generate the summary.

Please try again.

Provide:

Retry

The Retry button must call the API through the appropriate hook.

No direct API calls from the component.

37. CHAT TAB

Build a modern AI research chat interface.

Empty state:

Ask anything about this paper

Supporting text should explain that answers are grounded in the uploaded paper.

Suggested prompts:

What was the main contribution?

What dataset was used?

What limitations did the authors mention?

These should be clickable.

When clicked, populate/send the question through the normal chat flow.

38. CHAT STATE

Use TanStack Query appropriately for server state.

Use local React state only for transient UI state such as:

current input
selected tab
citation drawer
dismissed warning
theme UI state if not handled by existing theme tooling

Do not put server responses into random component state if TanStack Query is appropriate.

39. CHAT INPUT

Place the input at the bottom of the chat area.

Requirements:

multiline textarea
Send button
Enter sends
Shift+Enter creates a newline
disabled while sending
accessible label
visible keyboard focus state

Do not allow an empty question to be submitted.

40. TYPING INDICATOR

While waiting for sendChat():

Show a subtle typing indicator.

For example:

● ● ●

Animate gently.

Do not overdo the animation.

41. USER MESSAGE

User messages:

right aligned
indigo background
white text
readable max-width
accessible contrast
rounded but not excessively pill-shaped 42. ASSISTANT MESSAGE

Assistant responses:

Light mode:

white surface

Dark mode:

#152131

Use readable typography and generous line height.

Citations inside the assistant text must become clickable citation chips.

43. SOURCES UNDER ASSISTANT MESSAGES

Below assistant responses:

Sources

Then:

📄 Page 3
📄 Page 5

Clicking opens the reusable citation panel.

If there are no sources:

No supporting passage found in the paper.

Do not invent sources.

44. CITATION PANEL

Create a reusable citation component.

Desktop:

right-side drawer

Mobile:

bottom sheet

Title:

Source · Page N

Show:

snippet text

and:

paper filename

Button:

Open PDF page

This button must be visibly disabled.

Supporting text:

Coming soon

Do NOT implement fake PDF navigation.

If a snippet is unavailable:

Snippet not available

45. DRAWER BEHAVIOR

Citation panel must close through:

close button
Escape key
backdrop click

It should have a polished Framer Motion transition.

On desktop:

slide from right

On mobile:

slide upward from bottom

Manage focus appropriately.

46. EMPTY STATES

Create polished empty states for:

no file uploaded
no chat messages
summary unavailable
request failure

Do not use generic emoji-heavy placeholders.

Use Lucide icons and calm explanatory text.

47. ANIMATIONS

Use Framer Motion lightly.

Implement subtle:

hero fade-in
upload success transition
analysis step transitions
summary card fade-in
citation drawer transition
tab content transition
typing indicator

Keep animations around 150–300ms where appropriate.

Respect:

prefers-reduced-motion

Users who prefer reduced motion should not receive unnecessary animations.

48. FOOTER NOTE

Include a persistent footer note:

Answers are generated from the uploaded paper only. Always verify against the original.

This should be subtle but visible.

Do not put it in an annoying fixed popup.

49. ERROR HANDLING

Handle:

invalid file
file too large
upload failure
paper retrieval failure
summary failure
chat failure

Errors should be:

friendly
concise
actionable
visually consistent

Never expose stack traces or internal implementation details.

50. LOADING STATES

Every asynchronous operation must have an intentional loading state.

Examples:

Upload:

Uploading...
67%

Paper detection:

Analyzing document...

Summary:

Skeleton cards.

Chat:

Typing indicator.

Never leave the UI apparently frozen while waiting for an API request.

51. TANSTACK QUERY

Use TanStack Query for server state.

Create hooks such as:

usePaper()
useSummary()
useChat()

Hooks should call src/lib/api.ts.

Components should consume hooks rather than call the API directly.

For example conceptually:

usePaper()
↓
api.getPaper()

and:

useSummary()
↓
api.getSummary()

and:

useChat()
↓
api.sendChat()

Do not create unnecessary global state.

52. IMPORTANT: NO HARDCODED MOCK DATA IN COMPONENTS

This is a strict requirement.

BAD:

const messages = [...]

inside a component.

BAD:

const summary = {...}

inside a component.

BAD:

const paper = {...}

inside a component.

GOOD:

Component
↓
Hook
↓
api.ts
↓
mock data

All mock responses belong behind the API abstraction.

53. IMPORTANT: NO DIRECT FETCH IN COMPONENTS

Never do:

fetch(...)

inside:

Summary components
Chat components
Upload components
Citation components
Workspace components

All network access belongs in:

src/lib/api.ts

54. ENVIRONMENT CONFIGURATION

Support:

VITE_API_URL

Example conceptually:

VITE_API_URL=https://your-fastapi-backend.example.com

Do not hardcode a production API URL.

Do not hardcode secrets.

The frontend must continue to work with:

USE_MOCK = true

without requiring an environment variable.

55. FUTURE BACKEND COMPATIBILITY

The frontend API contract should be designed so that later the real backend can implement:

POST /papers
GET /papers/:id
GET /papers/:id/summary
POST /papers/:id/chat

The frontend should not need to know whether the backend internally uses:

PostgreSQL
pgvector
RAG
OCR
an LLM
an agent
another service

Those are backend concerns.

56. FUTURE FEATURES — ARCHITECTURE ONLY

The architecture should leave room for future:

Notes
Quiz
OCR
Claim verification
Potential issues
Bounded research agent
Evaluation
Tracing

But DO NOT implement those features in this task.

Do not add placeholder functionality that doesn't work.

Do not add fake buttons for future features.

The only visible tabs should currently be:

Summary
Chat

57. PRODUCT TRUST MODEL

The UI must communicate an important principle:

The original paper is untouched.

The application summarizes and answers questions using the uploaded document.

It does not silently "fix" the paper.

Potential future AI interpretations or detected inconsistencies should be separate from source-derived content.

Do not display claims such as:

Paper is wrong

in this frontend version.

58. CODE QUALITY

Write clean, maintainable TypeScript.

Requirements:

strongly typed
reusable components
no duplicated UI logic
no duplicated API logic
clear naming
small focused components
sensible hook boundaries
no unnecessary abstractions
no giant components
no dead code
no unused imports
no TypeScript errors
no console errors

Use shadcn/ui primitives where appropriate rather than recreating common accessible controls.

59. PERFORMANCE

Avoid unnecessary rerenders.

Use:

TanStack Query caching
appropriate React memoization only when useful
lazy rendering where useful
stable callbacks where necessary

Do not prematurely optimize everything.

The priority is clean architecture and reliable UX.

60. FINAL USER JOURNEY

The complete working mock journey MUST be:

Landing page
↓
Choose PDF
↓
Validate PDF
↓
Uploading...
↓
✓ Uploaded
↓
Paper detected
↓
Language: 🇯🇵 Japanese
Pages: 18
↓
Choose response language
↓
Analyze paper
↓
✓ Extracting text
✓ Detecting language
● Generating summary
↓
Paper workspace
↓
Summary
↓
Title & Authors
Abstract
Problem Statement
Methodology
Key Results
Conclusion
↓
Click citation
↓
Citation drawer
↓
Chat
↓
Ask question
↓
Typing indicator
↓
Grounded answer
↓
Clickable page citations
↓
Citation drawer

Every step must work with the mock API.

61. QUALITY BAR

The final application should look like a real product that could be shown to:

researchers
students
engineers
professors
recruiters
investors

It must NOT look like a generated template.

Prioritize:

visual polish
usability
accessibility
clear information hierarchy
realistic loading/error states
clean architecture
future FastAPI compatibility

Do not sacrifice architecture for visual effects.

Do not sacrifice usability for animations.

Do not sacrifice clarity for decoration.

62. FINAL VALIDATION BEFORE FINISHING

Before considering the implementation complete, verify:

Application starts successfully
No TypeScript errors
No console errors
Upload UI works
PDF validation works
20 MB validation works
Drag-and-drop works
Keyboard upload works
Upload progress is visible
Paper detected screen appears
Japanese language is shown
18 pages are shown
Low-text warning displays Pages 12–13
Response language selector works
Analyze flow works
Summary loads through the API abstraction
All six summary sections display
Summary citations work
Chat empty state works
Suggested prompts work
Enter sends chat
Shift+Enter creates newline
Typing indicator works
Assistant citations become clickable
Source rows work
Citation drawer works
Citation drawer closes with ESC
Citation drawer closes with backdrop
Mobile citation panel becomes a bottom sheet
Dark mode works
System theme detection works
Reduced-motion preference is respected
Mobile layout works
Tablet layout works
Desktop layout works
Footer trust message is visible
No component directly calls fetch
No component contains mock data
All application types are in src/lib/types.ts
All data access goes through src/lib/api.ts
USE_MOCK defaults to true
VITE_API_URL is supported
No unnecessary dependencies were added
FINAL INSTRUCTION

Do not merely generate a visually attractive prototype.

Generate a clean, maintainable frontend foundation that can immediately be handed to another engineer using Cursor, who will replace the mock API with a real FastAPI/Python backend, PostgreSQL/pgvector, document extraction, multilingual embeddings, RAG, OCR, claim verification, bounded agent orchestration, evaluation, and tracing.

The frontend should already feel complete even though those backend capabilities are mocked.

Build the application now.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/621315ef-8109-5033-8285-ff637ac2a5bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
