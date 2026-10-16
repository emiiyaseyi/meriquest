import { ch, sit } from "../scenario-kit";

/** Investment Advisory, batch 3: colleagues who walk up to your desk. Fictional people and amounts. Drafts for Compliance review. */
export const INVEST_3 = [
  sit("i-i-deal-leak", ["invest"], "A colleague from Admin asks what the big deal is", "A colleague from Admin stops by: 'Everyone says the Aspen Foods deal is happening. You must know. Is it true? I might buy a few shares.'", "compliance", [
    ch("best", "Say you cannot discuss any client or deal, and suggest she does not trade on rumours. Tell Compliance about the question.", "Confirming or denying a deal is a leak. Tell Compliance that someone is asking.", [
      "nothing is confirmed, and Compliance knows people are asking",
      [["Today", "You decline kindly and move on."], ["This week", "Compliance reminds the office about confidentiality."], ["This month", "The deal is announced and nobody can say it leaked from you."]],
      [["Firm", "good", "the deal stays confidential"], ["You", "good", "you protected the deal"], ["Team", "good", "a colleague steered away from a risky trade"]],
    ]),
    ch("partly", "Say 'I cannot say', with a knowing smile.", "A knowing smile is an answer.", [
      "no words, but a signal",
      [["Today", "She reads the smile."], ["This week", "She buys, and tells a friend."], ["This month", "A cluster of purchases before the announcement is noticed."]],
      [["Firm", "bad", "a leak by expression"], ["You", "mixed", "you said nothing, but still signalled"]],
    ]),
    ch("wrong", "Tell her it is true but ask her to keep it quiet.", "You have just passed inside information to someone who will trade on it.", [
      "inside information handed across a desk",
      [["Today", "She buys shares."], ["This week", "The deal is announced and the price jumps."], ["This month", "Surveillance links her purchase to you."]],
      [["Firm", "bad", "a leak and a suspicious trade"], ["You", "bad", "a serious conduct and legal risk"], ["Team", "bad", "a colleague drawn into an offence"]],
    ], { follow: [6, "🚨", "A purchase of Aspen Foods shares by a colleague, just before the announcement, has been flagged. She says you told her.", "bad"] }),
  ], { internal: true }),

  sit("i-i-skip-committee", ["invest"], "A senior asks you to skip the investment committee", "A senior colleague drops by: 'The committee meets Thursday. This opportunity closes Wednesday. Just tell the client yes and we will take it to committee afterwards.'", "compliance", [
    ch("best", "Explain that you cannot commit before approval, and offer to ask for an urgent committee or tell the client the offer is subject to approval.", "Approval comes first. Ask for an urgent review, or be clear with the client that nothing is agreed.", [
      "the process is kept, and the opportunity might still be saved",
      [["Today", "You propose an urgent committee review."], ["This week", "The committee meets early and decides."], ["This month", "Whatever the decision, it was made properly."]],
      [["Client", "good", "told the truth about the status"], ["Firm", "good", "governance respected"], ["You", "good", "you kept the line"]],
    ]),
    ch("partly", "Tell the client 'probably yes', to keep them warm.", "'Probably' will be heard as 'yes'.", [
      "a soft promise",
      [["Today", "The client hears it as a yes."], ["This week", "The committee declines."], ["This month", "The client says he was promised, and is angry."]],
      [["Client", "bad", "a broken expectation"], ["You", "mixed", "you softened a hard fact"]],
    ]),
    ch("wrong", "Commit now and ask the committee to approve afterwards.", "The committee is now approving something already done.", [
      "approval after the fact",
      [["Today", "You give the client a yes."], ["This week", "The committee has concerns about the risk."], ["This month", "The firm must either honour a bad commitment or break its word."]],
      [["Client", "mixed", "a commitment that may be broken"], ["Firm", "bad", "governance bypassed"], ["You", "bad", "you committed without authority"]],
    ], { follow: [6, "⚠️", "The investment committee has raised concerns about a deal that was already promised to a client before it was approved.", "bad"] }),
  ], { internal: true }),

  sit("i-i-early-research", ["invest"], "Sales wants your note before it is published", "A salesperson asks for a sneak preview of your upgrade note: 'My best clients should have it first. They will be so grateful.'", "compliance", [
    ch("best", "Decline: research goes to all clients at the same time, after approval. Offer to help her prepare to talk about it once it is out.", "Giving some clients research early gives them an unfair edge and may be market abuse.", [
      "everyone gets it at once, and sales is ready",
      [["Today", "You explain and offer help."], ["This week", "The note is published to all clients together."], ["This month", "Sales trusts that research is fair, and clients do too."]],
      [["Client", "good", "equal access to research"], ["Firm", "good", "no selective disclosure"], ["Team", "good", "sales knows the rule"]],
    ]),
    ch("partly", "Give her the headline view only, not the full note.", "A headline is the part that moves the price.", [
      "just the part that matters",
      [["Today", "She tells two clients the rating is changing."], ["This week", "They buy before publication."], ["This month", "The trades are noticed, and the source is traced to a preview."]],
      [["Firm", "bad", "selective disclosure"], ["You", "bad", "you supplied the headline"]],
    ]),
    ch("wrong", "Send her the whole draft, since she is on your side.", "Sharing an unpublished upgrade with sales for her best clients is front-running research.", [
      "an unpublished note in the wrong hands",
      [["Today", "She forwards it to favoured clients."], ["This week", "They buy ahead of publication. The price moves on release."], ["This month", "Surveillance links the trades to the draft."]],
      [["Client", "bad", "other clients are disadvantaged"], ["Firm", "bad", "selective disclosure of research"], ["You", "bad", "you released it"]],
    ], { follow: [6, "🚨", "Trades by several clients just before an upgrade note was published have been flagged. The draft was seen by sales.", "bad"] }),
  ], { internal: true }),

  sit("i-i-month-end-mark", ["invest"], "Mark the book at the kinder price at month-end", "A fund manager asks you, as the valuation checker, to mark an illiquid bond at the more favourable of two quotes. 'It makes the month look better. Both are defensible.'", "compliance", [
    ch("best", "Use the documented valuation policy, apply the same method every month, and record why. Tell him you cannot pick the quote by what looks better.", "A valuation method must be applied consistently, not chosen for the result.", [
      "the valuation follows the policy",
      [["Today", "You apply the policy and record the quote used."], ["This week", "The fund manager grumbles, then accepts."], ["This month", "Investors see an honest value, with no later surprise."]],
      [["Client", "good", "an honest valuation"], ["Firm", "good", "valuation consistency"], ["You", "good", "you resisted pressure"]],
    ]),
    ch("partly", "Pick the favourable one just this month, and promise to revert next month.", "One-off choices that favour the result are still selective.", [
      "a favourable mark for one month",
      [["Today", "The favourable quote is used."], ["This week", "The month looks better."], ["This month", "Next month's reversion creates a visible drop and questions."]],
      [["Client", "mixed", "an inflated month, then a fall"], ["You", "mixed", "an inconsistency in your record"]],
    ]),
    ch("wrong", "Mark it at the favourable price, whatever the policy says.", "Marking assets to flatter results can mislead investors and may be fraud.", [
      "the book is marked to please",
      [["Today", "The higher value is booked."], ["This week", "Fees are calculated on the inflated value."], ["This month", "An audit tests the quotes and finds the choice always favoured the result."]],
      [["Client", "bad", "overcharged on an inflated value"], ["Firm", "bad", "misleading valuations"], ["You", "bad", "your approval is on the mark"]],
    ], { follow: [7, "🚨", "An audit has found that illiquid bonds were consistently marked at the more favourable of two quotes. The checker's sign-off is on every one.", "bad"] }),
  ], { internal: true }),

  sit("i-i-it-phish", ["invest"], "'IT' needs your trading password", "A caller says he is from IT: 'We are upgrading the trading system. Give me your password so I can move your settings across before 2 pm, or you will lose access.'", "compliance", [
    ch("best", "Refuse, never share a password, hang up, and report the call to IT and Security through the official channel.", "Real IT never asks for your password. Report it, as others may receive the same call.", [
      "the attempt fails, and others are warned",
      [["Today", "You hang up and report it."], ["This week", "Security warns the office and blocks the number."], ["This month", "A colleague who received the same call also refuses, thanks to your warning."]],
      [["Client", "good", "accounts stay safe"], ["Firm", "good", "an attack stopped"], ["Team", "good", "colleagues alerted"]],
    ]),
    ch("partly", "Refuse, but do not report it.", "You are safe, but the next person may not be.", [
      "safe for you, but not for others",
      [["Today", "You hang up."], ["This week", "The caller tries the next desk."], ["This month", "A colleague gives away her password."]],
      [["Firm", "bad", "an attack not shared"], ["You", "mixed", "safe, but silent"]],
    ]),
    ch("wrong", "Give it, to avoid losing access before the deadline.", "A password given to a stranger is a password stolen.", [
      "your trading access is in a stranger's hands",
      [["Today", "You read out the password."], ["This week", "Unauthorised orders appear under your login."], ["This month", "Clients' accounts are affected, and you must explain how it happened."]],
      [["Client", "bad", "orders placed without authority"], ["Firm", "bad", "a security breach"], ["You", "bad", "your login was used"]],
    ], { follow: [6, "🚨", "Unusual orders have been placed from your trading login. Security says the login was recently shared with a caller.", "bad"] }),
  ], { internal: true }),

  sit("i-i-restricted-timing", ["invest"], "A colleague wants to trade right before the restricted list update", "A colleague whispers: 'The restricted list updates tomorrow and I think my company is going on it. Let me sell my shares in it today, before I cannot.'", "compliance", [
    ch("best", "Tell him he must pre-clear any personal trade with Compliance, and that suspicion of coming restrictions makes it worse. Do not help him to trade, and tell Compliance if he goes ahead.", "Personal trades need pre-clearance. A hunch about a restricted list is itself sensitive.", [
      "the trade goes through Compliance, not around it",
      [["Today", "He goes to Compliance, who decide."], ["This week", "He is told to wait, or the sale is cleared with conditions."], ["This month", "Nobody has anything to explain."]],
      [["Firm", "good", "personal trading controls respected"], ["You", "good", "you pointed him to the right door"], ["Team", "good", "a colleague kept out of trouble"]],
    ]),
    ch("partly", "Say 'do what you think is best', and leave.", "You have neither helped nor stopped him.", [
      "a shrug with consequences",
      [["Today", "He sells without pre-clearance."], ["This week", "The restricted list is updated, and the date of his sale is just before."], ["This month", "Compliance asks who knew."]],
      [["Firm", "bad", "an uncleared personal trade"], ["You", "mixed", "you knew and did nothing"]],
    ]),
    ch("wrong", "Tell him to sell now, quickly, before the update.", "You have just advised a trade on non-public information about the list.", [
      "you advise a trade ahead of a restriction",
      [["Today", "He sells."], ["This week", "The list is updated, and the sale looks pre-planned."], ["This month", "Compliance finds the sale and the advice."]],
      [["Firm", "bad", "a personal trade breach"], ["You", "bad", "you encouraged it"], ["Team", "bad", "a colleague on the wrong side of the rules"]],
    ], { follow: [6, "🚨", "A sale of shares by a colleague, the day before a restricted list update, has been flagged. He says you told him to sell.", "bad"] }),
  ], { internal: true }),
];
