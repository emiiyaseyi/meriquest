/** More client-simulation and leadership cases, added to the starting lists. Admins can edit, add and remove them under Settings. All people and amounts are fictional. */
type Fx = Record<string, number>;
const c = (text: string, effects: Fx, feedback: string) => ({ text, effects, feedback });
const sc = (id: string, units: string[], title: string, story: string, choices: ReturnType<typeof c>[]) => ({ id, units, title, story, choices });
const lc = (id: string, title: string, story: string, choices: ReturnType<typeof c>[]) => ({ id, title, story, choices });

export const MORE_CLIENT_CASES = [
  sc("cs-cx-fraud", ["cx"], "A caller who is not the account holder", "Someone phones for a client's balance and a recent withdrawal, saying the client is travelling and 'asked him to call'.", [
    c("Explain you can only speak to the account holder, offer to call the registered number, and log the attempt.", { trust: 6, compliance: 12, revenue: 0, risk: 10 }, "Never disclose account details without verifying the holder."),
    c("Give the balance only: it is not much information.", { trust: -4, compliance: -14, revenue: 0, risk: -12 }, "A balance is still confidential."),
    c("Ask him to prove he is the client's friend.", { trust: -2, compliance: -4, revenue: 0, risk: -4 }, "A friend's proof does not replace the holder's consent."),
  ]),
  sc("cs-cx-digital", ["cx"], "A client locked out of the app", "A client is locked out of the app before a deadline and wants you to reset it using only his name.", [
    c("Verify him through the approved checks, then trigger the reset and walk him through it.", { trust: 8, compliance: 8, revenue: 2, risk: 8 }, "Secure resets follow verification, every time."),
    c("Reset it quickly: he sounds genuine.", { trust: 2, compliance: -12, revenue: 2, risk: -12 }, "Sounding genuine is how fraud works."),
    c("Tell him to visit a branch tomorrow.", { trust: -6, compliance: 4, revenue: -4, risk: 2 }, "Safe but unhelpful: offer a verified remote route."),
  ]),
  sc("cs-cx-renewal", ["cx"], "A client about to leave", "A long-standing client says a competitor offered lower fees and he is considering moving.", [
    c("Listen, review his needs and our fees honestly, explain the value, and let him decide without pressure.", { trust: 9, compliance: 6, revenue: 4, risk: 4 }, "Honest value beats pressure."),
    c("Offer a secret discount only for him.", { trust: 2, compliance: -10, revenue: 4, risk: -6 }, "Pricing must follow the approved schedule."),
    c("Warn him that leaving will cost him a lot.", { trust: -10, compliance: -6, revenue: -2, risk: -6 }, "Scare tactics damage trust."),
  ]),
  sc("cs-wm-family", ["wealth"], "An adult child asks about a parent's portfolio", "An adult daughter asks for details of her father's portfolio 'to help him'. He is in hospital.", [
    c("Explain confidentiality, ask for the written authority or a power of attorney, and offer to help her with the right paperwork.", { trust: 6, compliance: 12, revenue: 0, risk: 8 }, "Authority must be documented."),
    c("Share the details: she is family.", { trust: -4, compliance: -16, revenue: 0, risk: -10 }, "Family is not authority."),
    c("Refuse and end the call.", { trust: -8, compliance: 2, revenue: -2, risk: 2 }, "Correct but cold: explain what she can do."),
  ]),
  sc("cs-wm-complex", ["wealth"], "A complex product for a simple client", "A retired teacher is excited by a structured product with a high headline return.", [
    c("Explain the risks and costs in plain language, test her understanding, and recommend only if it truly fits her.", { trust: 8, compliance: 10, revenue: 0, risk: 8 }, "Complex products need clear explanation and suitability."),
    c("Let her buy: she is excited and it pays well.", { trust: -8, compliance: -14, revenue: 8, risk: -12 }, "Mis-selling harms her and the firm."),
    c("Say it is too complicated for her.", { trust: -6, compliance: -2, revenue: -2, risk: 0 }, "Do not talk down to clients; explain."),
  ]),
  sc("cs-wm-tax", ["wealth"], "A request to hide income", "A client asks you to split a large deposit across accounts so it 'looks smaller'.", [
    c("Decline, explain the reporting duties, and escalate to compliance as a suspicious request.", { trust: 2, compliance: 14, revenue: -2, risk: 12 }, "Structuring deposits is a red flag and must be reported."),
    c("Do it once: he is a valued client.", { trust: -4, compliance: -20, revenue: 4, risk: -16 }, "That is helping to avoid reporting."),
    c("Refuse without telling anyone.", { trust: -2, compliance: -4, revenue: -2, risk: -4 }, "Right to refuse, but the escalation is missing."),
  ]),
  sc("cs-ia-market", ["invest"], "A rumour moves the market", "A rumour about a rival's merger spreads and a client asks you to buy at once.", [
    c("Check the source, advise caution on unverified rumours, and act only on verified information.", { trust: 6, compliance: 10, revenue: 0, risk: 8 }, "Rumours are not research."),
    c("Buy now: speed matters.", { trust: -2, compliance: -8, revenue: 6, risk: -12 }, "Acting on a rumour risks a bad trade."),
    c("Spread the rumour to other clients to be helpful.", { trust: -8, compliance: -18, revenue: 2, risk: -14 }, "Spreading rumours is market misconduct."),
  ]),
  sc("cs-ia-limit", ["invest"], "A client breaches his limit", "A client wants an order that takes him above his approved exposure limit.", [
    c("Explain the limit, offer to review or raise it through the proper approval, and hold the order until then.", { trust: 4, compliance: 12, revenue: -2, risk: 10 }, "Limits are changed by approval, not by pressure."),
    c("Place the order and ask for approval after.", { trust: 0, compliance: -12, revenue: 6, risk: -14 }, "Approval comes first."),
    c("Split the order into small ones to stay under the limit.", { trust: -4, compliance: -16, revenue: 4, risk: -14 }, "Splitting orders to avoid a limit is a breach."),
  ]),
  sc("cs-ia-conflict", ["invest"], "A conflict you did not expect", "You learn your spouse holds shares in a company you are about to research.", [
    c("Disclose it to compliance before publishing and follow their instruction.", { trust: 6, compliance: 12, revenue: 0, risk: 8 }, "Disclose conflicts early."),
    c("Publish and mention it later if asked.", { trust: -6, compliance: -12, revenue: 2, risk: -10 }, "Disclosure comes before publication."),
    c("Sell your spouse's shares quietly first.", { trust: -8, compliance: -16, revenue: 0, risk: -12 }, "That could be trading on non-public information."),
  ]),
  sc("cs-all-outage", ["*"], "The system is down", "The trading platform is down for an hour and clients are calling.", [
    c("Tell clients clearly what is happening, give a time for the next update, and use the approved fallback process.", { trust: 8, compliance: 6, revenue: 0, risk: 6 }, "Clear updates and the fallback process protect clients."),
    c("Say it is a small glitch and to try again.", { trust: -6, compliance: -4, revenue: 0, risk: -4 }, "Downplaying an outage loses trust."),
    c("Take verbal orders and enter them later without logging.", { trust: -2, compliance: -12, revenue: 4, risk: -12 }, "Untracked orders cause disputes."),
  ]),
  sc("cs-all-social", ["*"], "A post about work", "A colleague posts a photo of a client event with a client's name tag clearly visible.", [
    c("Ask your colleague privately to take it down and remind them of the social media policy.", { trust: 4, compliance: 10, revenue: 0, risk: 6 }, "Protect client identity and the firm's reputation."),
    c("Like the post: it looks good.", { trust: -2, compliance: -8, revenue: 0, risk: -6 }, "The post puts a client at risk."),
    c("Comment publicly that the colleague broke the policy.", { trust: -4, compliance: -2, revenue: 0, risk: -2 }, "Speak privately first."),
  ]),
  sc("cs-all-whistle", ["*"], "You see something wrong", "You notice a colleague routinely backdating forms for clients.", [
    c("Report it through the speak-up channel with what you saw, without confronting or gossiping.", { trust: 4, compliance: 14, revenue: 0, risk: 10 }, "Speak-up channels protect everyone."),
    c("Ignore it: it is not your job.", { trust: -4, compliance: -12, revenue: 0, risk: -10 }, "Silence enables misconduct."),
    c("Do the same to keep up with the work.", { trust: -8, compliance: -20, revenue: 2, risk: -16 }, "Two wrongs make a serious breach."),
  ]),
];

export const MORE_LEAD_CASES = [
  lc("lead-underperformer", "A team member keeps missing targets", "A long-serving colleague has missed targets for three months, and the team has started to notice.", [
    c("Meet privately, listen, set clear goals with support and a review date, and record it.", { morale: 6, delivery: 6, trust: 2, compliance: 4 }, "Fair, clear and supportive feedback gives people a chance."),
    c("Criticise them in the team meeting so everyone hears.", { morale: -12, delivery: 0, trust: -4, compliance: -2 }, "Public shaming destroys morale."),
    c("Ignore it and hope it improves.", { morale: -6, delivery: -6, trust: -2, compliance: -2 }, "Ignoring a problem lets it grow."),
  ]),
  lc("lead-peer-credit", "Someone took credit for your team's work", "A peer presented your team's analysis to the director as their own.", [
    c("Speak to the peer privately, then clarify the contribution with the director calmly and with evidence.", { morale: 6, delivery: 2, trust: 4, compliance: 2 }, "Address it directly and professionally."),
    c("Send an angry message to the whole department.", { morale: -4, delivery: -2, trust: -8, compliance: 0 }, "Anger harms your credibility."),
    c("Let it go and tell the team to accept it.", { morale: -10, delivery: 0, trust: -2, compliance: 0 }, "Your team needs to see recognition matter."),
  ]),
  lc("lead-change", "A big change in how the team works", "Management introduces a new process and half the team is resistant.", [
    c("Explain the reasons, listen to concerns, pilot with volunteers and adjust before full rollout.", { morale: 6, delivery: 6, trust: 4, compliance: 4 }, "People support what they help shape."),
    c("Announce it by email and expect compliance.", { morale: -8, delivery: -2, trust: -4, compliance: 2 }, "Change without conversation breeds resistance."),
    c("Delay it until the team asks for it.", { morale: 0, delivery: -6, trust: -2, compliance: -4 }, "Avoiding change leaves the team behind."),
  ]),
  lc("lead-drained-analyst", "A star performer looks exhausted", "Your best analyst has worked weekends for a month and looks drained.", [
    c("Talk to them, reduce the load, share the work and make sure they take rest.", { morale: 10, delivery: 0, trust: 2, compliance: 2 }, "Protect your best people from burnout."),
    c("Give them even more work: they handle pressure well.", { morale: -12, delivery: 4, trust: -2, compliance: -2 }, "Overloading strong performers leads to loss."),
    c("Praise them in public and carry on.", { morale: -2, delivery: 2, trust: 0, compliance: 0 }, "Praise helps, but workload must change."),
  ]),
  lc("lead-new-joiner", "A new joiner is struggling to settle", "A new colleague is quiet, makes small errors, and eats alone.", [
    c("Pair them with a buddy, set clear first goals and check in weekly.", { morale: 8, delivery: 4, trust: 2, compliance: 4 }, "A good start shapes the whole journey."),
    c("Leave them to figure it out.", { morale: -6, delivery: -4, trust: -2, compliance: -2 }, "Neglect is a poor welcome."),
    c("Complain to HR about their performance in week two.", { morale: -8, delivery: -2, trust: -4, compliance: 0 }, "Give support before judgement."),
  ]),
  lc("lead-pressure-from-above", "A director pushes for a shortcut", "A director asks you to skip a review step to land a client this week.", [
    c("Explain the risk, propose a faster compliant route and escalate if pressed.", { morale: 4, delivery: 2, trust: 4, compliance: 10 }, "Hold the line on controls and offer alternatives."),
    c("Skip the step this once.", { morale: -4, delivery: 6, trust: -4, compliance: -16 }, "Controls skipped once get skipped again."),
    c("Refuse bluntly and say nothing more.", { morale: -2, delivery: -2, trust: -4, compliance: 6 }, "Right instinct, but offer a way forward."),
  ]),
  lc("lead-diversity", "A meeting where one voice dominates", "In your team meetings, two people talk and others rarely speak.", [
    c("Invite quieter voices, use rounds and written input, and thank contributions.", { morale: 8, delivery: 4, trust: 2, compliance: 0 }, "Inclusive meetings produce better decisions."),
    c("Let it continue: the loud ones know the most.", { morale: -8, delivery: -2, trust: -2, compliance: 0 }, "You lose good ideas."),
    c("Tell the dominant ones to stop speaking in meetings.", { morale: -4, delivery: -2, trust: -2, compliance: 0 }, "Too blunt; guide, do not silence."),
  ]),
  lc("lead-remote", "Part of the team works away", "Some of your team works from the Yaba office and feels forgotten.", [
    c("Add regular joint check-ins, share information to both offices and rotate meeting locations.", { morale: 8, delivery: 4, trust: 2, compliance: 2 }, "Equal access builds one team."),
    c("Keep decisions in Ikoyi and send notes later.", { morale: -8, delivery: -2, trust: -2, compliance: 0 }, "People left out stop contributing."),
    c("Visit Yaba once and call it done.", { morale: 0, delivery: 0, trust: 0, compliance: 0 }, "A single visit does not fix a habit."),
  ]),
];
