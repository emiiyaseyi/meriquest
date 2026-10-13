# Meristem Academy: content imported from the NEO Slides 2024 folder

Source: `OneDrive - Meristem Securities Limited\NEO Slides 2024` (new employee orientation decks, product decks and the NEO assessment). The decks are internal Meristem material. The repository is private; keep it that way.

## How the content is built
- Text is read from each deck and the exam document; duplicate files are skipped.
- Each deck becomes a **course** of lessons (notes written from the slides, with the deck's own facts). Each lesson has a **question bank** tagged Easy, Medium and Hard (many more questions than a quiz shows, so retakes differ).
- **Levels unlock as you pass:** a person passes every lesson at Easy, then Medium opens for that course, then Hard; the certificate comes with Hard.
- **Scenarios** (scored decisions: best, partly right, wrong) and **case studies** (read, think, compare with key points) come from the NEO exam's essay and case questions and from the decks.
- Everything lives in Settings → **Meristem Academy** (a JSON setting). Admins can edit any course, lesson, question, scenario or case, add groups, and **move a course to another group or out of every group** (it then shows under "More courses").
- Courses are open to everyone. `units` marks who a course is recommended for: `cx` (Customer Experience), `wealth` (Wealth Advisory), `invest` (Investment Advisory), or `*` for everyone, so general learning is open to all staff, including those outside the three pilot teams.
- The built-in content is a first draft. HR, Compliance and the subsidiary owners should review it, especially anything that may have changed since the decks were written (appraisal rules, working hours, product details and prices).

## Status by deck
| Group | Course | Source deck | Status |
|---|---|---|---|
| Culture | Our Story and Values | Welcome Nuggets 2023 | Imported |
| Culture | The Meristem Culture (CEPOEM) | THE MERISTEM CULTURE | Imported |
| Culture | Living the Meristem Brand | Meristem Brand Induction | Imported |
| Compliance | Law and Regulation in the Capital Market | Overview of the Legal and Regulatory Framework; Law and Regulations deck | Planned |
| Compliance | Confidentiality at the Workplace | Confidentiality at the Work Place | Planned |
| Compliance | Anti-Money Laundering and Countering the Financing of Terrorism | KSS AML-CFT | Planned |
| Products and Services | One course for each of: Wealth Management, Stockbrokers, Registrars and Probate, Trustees, Finance, Capital (including how to spot corporate finance transactions), Family Office | The product decks | Planned |
| Customer Experience | The Meristem Customer Experience; The Art of Selling | The two decks | Planned |
| More to learn | Understanding the Financial System; Planning Your Personal Finance; Strategy and Corporate Transformation | The three decks | Planned |
| Scenarios and cases | From the NEO assessment (versions 1 and 2) | NEO EXAM V1 and V2 | Planned |

## Status update (13 Oct 2026)
Imported: Culture (3), Compliance (3), Products and Services (7), Customer Experience (2), More to learn (3). Extra scenarios and written cases sit in `academy/extra.ts`. Not yet imported: the NEO exam essay questions beyond those used as cases, and the HR report deck.
