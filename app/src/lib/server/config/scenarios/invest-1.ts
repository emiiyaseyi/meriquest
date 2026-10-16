import { ch, sit } from "../scenario-kit";

/** Investment Advisory, batch 1: markets, information and fairness. Fictional firms, clients and amounts. Drafts for Compliance review. */
export const INVEST_1 = [
  /* -------------------------------------------------- buying on a rumour */
  sit("i-r-merger-rumour", ["invest"], "Buy now: they say there is a merger", "A client phones: 'Everyone at the club says Harbour Bank is merging with Eko Trust. Buy ₦20 million of Harbour for me before the news. Do not ask me how I know.'", "market-knowledge", [
    ch("best", "Ask where the information came from and what it is based on, explain the risk of acting on an unverified rumour (and the possibility that it is inside information), offer analysis based on public information, and note the conversation.", "A rumour is not research. If it might be inside information, you must not act on it, and you should say so.", [
      "the client is protected from a rumour, and you are protected from a problem",
      [["Today", "You ask where it came from. He cannot say. You explain why acting on it is risky."], ["This week", "The rumour turns out to be false. His money is where it was."], ["This month", "He says you saved him from a mistake and asks for proper research next time."]],
      [["Client", "good", "kept out of a bad trade"], ["Firm", "good", "no trade on doubtful information"], ["You", "good", "a clear note of the advice"]],
    ]),
    ch("partly", "Place a smaller order, as a compromise.", "A smaller order is the same decision on the same rumour.", [
      "a smaller bet on the same rumour",
      [["Today", "₦5 million is placed."], ["This week", "The company denies the rumour and the price falls."], ["This month", "The loss is smaller, but the question remains: why was an order placed on gossip?"]],
      [["Client", "mixed", "a smaller loss"], ["Firm", "mixed", "an order with no real basis"]],
    ]),
    ch("wrong", "Buy the full ₦20 million at once, to be first.", "Acting on a rumour of a merger can be acting on inside information, and you did not ask where it came from.", [
      "a large order on an unexplained tip",
      [["Today", "₦20 million goes in."], ["This week", "The rumour is denied. The price falls."], ["This month", "Surveillance asks why a large order was placed ahead of a rumour, and what you knew about its source."]],
      [["Client", "bad", "a loss, and questions to answer"], ["Firm", "bad", "an order that looks like trading on inside information"], ["You", "bad", "you did not ask where it came from"]],
    ], { next: "i-r-rumour-fallout", follow: [6, "⚠️", "Trading surveillance has asked about a large order placed on a merger rumour, and what you knew about where it came from.", "bad"] }),
  ]),
  sit("i-r-rumour-fallout", ["invest"], "Surveillance wants to know where the tip came from", "The company has denied the merger. Surveillance asks you why a large order was placed before the denial, and who told the client.", "compliance", [
    ch("best", "Tell them exactly what the client said, including that he refused to say where it came from, and that you did not ask. Give the order record and let Compliance take it from there.", "Full, honest facts. You cannot be blamed for what you did not know; you can be for hiding what you did.", [
      "the facts are clear, and the firm can respond properly",
      [["Today", "You give a complete account and the order record."], ["This week", "Compliance contacts the client and reviews the order."], ["This month", "The review concludes quickly. You are reminded to ask about sources in future."]],
      [["Client", "mixed", "questioned, but treated fairly"], ["Firm", "good", "a review handled openly"], ["You", "mixed", "a reminder, with your honesty on record"]],
    ]),
    ch("partly", "Say you took the order in good faith and cannot recall details.", "Good faith matters, but 'cannot recall' about a large order looks like avoiding the question.", [
      "an answer that gives them nothing to work with",
      [["Today", "Your answer is thin."], ["This week", "They rebuild the story from the records."], ["This month", "They note that you were not forthcoming."]],
      [["Firm", "mixed", "a slower review"], ["You", "mixed", "seen as defensive"]],
    ]),
    ch("wrong", "Say the client got the tip from the firm's research.", "Inventing a source to protect a client or yourself is a lie to the people who must decide whether the market was abused.", [
      "a made-up source turns a review into an investigation of you",
      [["Today", "You name the research desk."], ["This week", "Research confirms it never covered the story."], ["This month", "A question about a tip becomes a question about your honesty."]],
      [["Client", "bad", "now involved in a false account"], ["Firm", "bad", "a false statement to Surveillance"], ["You", "bad", "a serious conduct investigation"]],
    ], { follow: [6, "🚨", "Research has confirmed it never published anything on that merger. Compliance wants to speak to you about the source you named.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a friend with good news early */
  sit("i-r-friend-results", ["invest"], "A friend at a listed company hints at the results", "At a wedding, a friend who works at a listed company says quietly: 'Our results next week will be much better than anyone expects. If I were you, I would buy before Thursday.' You hold a position in the stock for a client.", "compliance", [
    ch("best", "Stop him, tell him you cannot hear that, do not act on it or tell anyone, and report the conversation to Compliance as soon as you can.", "Information that is not public, about a listed company, is inside information. You must not use it, pass it on or deal on it. Report it.", [
      "you stay clear of inside information, and the firm knows",
      [["Today", "You step away and tell him you cannot discuss it."], ["This week", "You tell Compliance. The stock may go on a restricted list for you."], ["This month", "The results come out. Nothing you did can be linked to them, and your note shows it."]],
      [["Client", "good", "not exposed to an inside-information trade"], ["Firm", "good", "a potential issue disclosed early"], ["You", "good", "completely clear"]],
    ]),
    ch("partly", "Do nothing with it, but do not mention it to anyone.", "You did not trade, but hearing inside information and not reporting it leaves you exposed.", [
      "you did the right thing, but kept it to yourself",
      [["Today", "You say nothing and do not trade."], ["This week", "The results come out, and the stock jumps."], ["This month", "If anyone later asks why your client did not buy more, or why you knew, there is no note to protect you."]],
      [["Firm", "mixed", "no record that you stayed clear"], ["You", "mixed", "right action, unprotected"]],
    ]),
    ch("wrong", "Buy for your own account the next day, and say nothing.", "Dealing on inside information is a criminal offence and a dismissable one.", [
      "you trade on inside information",
      [["Today", "You buy before Thursday."], ["This week", "The results are strong. The stock rises sharply."], ["This month", "Surveillance flags unusual trading before the announcement. An investigation traces your account, and your friend's phone calls."]],
      [["Client", "mixed", "not directly harmed, but the firm is now under scrutiny"], ["Firm", "bad", "an insider-dealing investigation"], ["You", "bad", "a possible criminal case and dismissal"]],
    ], { next: "i-r-insider-inquiry", follow: [7, "🚨", "Surveillance has flagged personal trading in a stock just before its results. The account belongs to you.", "bad"] }),
  ]),
  sit("i-r-insider-inquiry", ["invest"], "Compliance and the regulator want an interview", "Compliance tells you that the regulator has asked about trading in the stock before its results, and that your account appears. Your friend has not called you since.", "compliance", [
    ch("best", "Get proper advice, cooperate fully and truthfully, give them what they ask for, and do not contact your friend about it.", "Cooperate, tell the truth, and do not coordinate your story with anyone else.", [
      "full cooperation gives you the best outcome available",
      [["Today", "You tell Compliance you will cooperate and get advice."], ["This week", "You give a truthful account and the records."], ["This month", "The outcome depends on the facts, but cooperation and honesty count for a great deal."]],
      [["Firm", "good", "a regulator request met properly"], ["You", "mixed", "serious consequences, but handled the right way"]],
    ]),
    ch("partly", "Answer only the questions you are asked, and volunteer nothing.", "You may feel safer, but half-answers raise suspicion.", [
      "technically honest, but not forthcoming",
      [["Today", "Your answers are short."], ["This week", "They ask more questions."], ["This month", "They conclude you were not open."]],
      [["Firm", "mixed", "a slower investigation"], ["You", "bad", "less credit for cooperation"]],
    ]),
    ch("wrong", "Phone your friend and agree what to say.", "Agreeing a story with a witness is obstruction and a second offence.", [
      "you add a new offence to the first",
      [["Today", "You and your friend agree a version."], ["This week", "Phone records show calls between you before each interview."], ["This month", "The agreed story does not hold. Obstructing an investigation is a serious matter on its own."]],
      [["Firm", "bad", "an obstructed investigation"], ["You", "bad", "a far more serious position"]],
    ], { follow: [6, "🚨", "Phone records show calls between you and an outside person on the day you were told about the inquiry. The regulator would like to ask about them.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- oversubscribed offer */
  sit("i-r-oversubscribed", ["invest"], "A big client wants a bigger share of the offer", "A public offer is oversubscribed, and your clients will get partial allocations. Your biggest client says: 'I expect my full order. I bring you more business than all the others.'", "compliance", [
    ch("best", "Explain that allocation follows the published basis, which treats clients fairly, offer to explain it, and tell him you will pass on his concern but cannot give him special treatment.", "Fair allocation is a regulatory duty. Importance does not buy a bigger share.", [
      "everyone is allocated fairly, and he understands",
      [["Today", "He is unhappy, but you show him the basis, which applies to all."], ["This week", "Allocations are made as published."], ["This month", "He stays. He knows there is no back door, and so do the others."]],
      [["Client", "good", "treated by the same rules as everyone"], ["Firm", "good", "a fair allocation"], ["You", "good", "you resisted pressure"]],
    ]),
    ch("partly", "Give him a little extra from your own allocation.", "It is the same unfairness, with a different source.", [
      "an extra share for the big client, at others' expense",
      [["Today", "He gets slightly more than his basis."], ["This week", "Another client sees the allocation list."], ["This month", "The difference is noticed, and you are asked why."]],
      [["Client", "mixed", "the favoured client is pleased"], ["Firm", "bad", "unfair allocation"], ["You", "bad", "an exception you cannot justify"]],
    ]),
    ch("wrong", "Give him his full order: he is the biggest client.", "Allocating by importance instead of the published basis is unfair to every other client.", [
      "a fair offer is made unfair",
      [["Today", "He receives his full order."], ["This week", "Smaller clients receive less than the basis says."], ["This month", "Several complain, and a review of the allocation finds the departure."]],
      [["Client", "bad", "smaller clients short-changed"], ["Firm", "bad", "an unfair allocation under review"], ["You", "bad", "a conduct breach"]],
    ], { follow: [6, "⚠️", "Several clients have complained that their allocation was smaller than the published basis. A review is under way, and your name appears on the largest allocation.", "bad"] }),
  ]),

  /* -------------------------------------------------- a margin call */
  sit("i-r-margin-call", ["invest"], "A margin client has stopped answering", "A margin client's collateral has fallen below the required level. You have called him four times and sent two messages. He has not replied, and the position keeps falling.", "risk-awareness", [
    ch("best", "Follow the margin agreement: try every registered contact, send the written notice, tell your risk manager, and act only as the agreement allows if there is no response by the stated time.", "The agreement says what you may do and when. Follow it, and keep a record.", [
      "the risk is managed, and the actions are defensible",
      [["Today", "You try every contact and send the formal notice. Your risk manager is told."], ["This week", "He finally replies, or the position is reduced exactly as the agreement says."], ["This month", "The loss is contained, and every step can be shown."]],
      [["Client", "mixed", "forced to act, but treated fairly"], ["Firm", "good", "risk contained by the book"], ["You", "good", "a defensible record"]],
    ]),
    ch("partly", "Wait another week in case he calls.", "Respectful, but the exposure keeps growing, and the agreement may require action.", [
      "a week of unmanaged risk",
      [["Today", "You wait."], ["This week", "The market falls further."], ["This month", "The loss is larger, and the firm asks why nothing was done."]],
      [["Firm", "bad", "a larger loss"], ["You", "bad", "you waited too long"]],
    ]),
    ch("wrong", "Sell some of his holdings now without the notice, because you think it is wise.", "Selling outside the terms of the agreement is acting without authority.", [
      "you act without the authority the agreement requires",
      [["Today", "You sell part of the position."], ["This week", "He reappears, furious: he had arranged cover."], ["This month", "He says the sale was unauthorised. The firm has to defend an action not allowed by its own agreement."]],
      [["Client", "bad", "assets sold without proper notice"], ["Firm", "bad", "an unauthorised sale and possible compensation"], ["You", "bad", "you acted outside the agreement"]],
    ], { next: "i-r-forced-sale", follow: [6, "✉️", "A margin client has complained that part of his portfolio was sold without the notice his agreement requires.", "bad"] }),
  ]),
  sit("i-r-forced-sale", ["invest"], "He says the sale was unauthorised", "The margin client has written in. He says that the sale breached the agreement, and he wants the position restored at the old price. Your head asks you what notice was given.", "compliance", [
    ch("best", "Tell her exactly what happened, including that the notice was not sent, and give her all records. Accept that the firm may need to put it right.", "The truth, early, gives the firm its best chance of dealing with it fairly.", [
      "the firm puts it right, and the client keeps his trust",
      [["Today", "You tell your head what happened, and give her the records."], ["This week", "The firm restores the position or compensates him fairly."], ["This month", "The matter closes. You are coached on the margin process."]],
      [["Client", "good", "put back where he should be"], ["Firm", "good", "an error owned and fixed"], ["You", "mixed", "a coaching conversation"]],
    ]),
    ch("partly", "Say notice was sent, and you will find the proof.", "You are not sure it is true. If there is no proof, you have misled your head.", [
      "a claim you cannot support",
      [["Today", "You say it as if it were certain."], ["This week", "No proof is found."], ["This month", "Your head knows you said something that was not true."]],
      [["Firm", "bad", "a weaker position against the client"], ["You", "bad", "a statement you could not support"]],
    ]),
    ch("wrong", "Backdate a notice so it looks as if it was sent.", "Creating a record to match what should have happened is forgery.", [
      "a mistake becomes a forgery",
      [["Today", "A notice appears on file, dated before the sale."], ["This week", "System logs show it was created after the sale."], ["This month", "Forgery is a far more serious matter than the original mistake, and may need to be reported outside the firm."]],
      [["Client", "bad", "now sure the firm is dishonest"], ["Firm", "bad", "a forged record"], ["You", "bad", "a possible dismissal and legal action"]],
    ], { follow: [6, "🚨", "System logs show a margin notice was created after the sale it was meant to precede. Compliance needs to understand how.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a price that has not moved */
  sit("i-r-stale-price", ["invest"], "A price that has not moved in two days", "You notice a security's price on your screen has not changed in two days, while the rest of the market has moved. Month-end valuations are due tomorrow and this price is part of a client's report.", "market-knowledge", [
    ch("best", "Check the market, tell operations and valuation that the price may be stale, and do not use it until a verified price is confirmed. Note what you did.", "A stale price can overstate or understate value. Verify, and say so.", [
      "the report uses a true price",
      [["Today", "You find a verified quote, and operations updates the price source."], ["This week", "Reports go out with the correct valuation."], ["This month", "The valuation process is improved because you raised it."]],
      [["Client", "good", "a correct valuation"], ["Firm", "good", "a data problem found early"], ["You", "good", "you protected the figure and the process"]],
    ]),
    ch("partly", "Use it, since it is the only price available, and add a footnote.", "A footnote does not make a stale price correct.", [
      "a questionable price with a note",
      [["Today", "The report goes out."], ["This week", "A client questions the value."], ["This month", "A recalculation shows a different figure, and the footnote does not help."]],
      [["Client", "mixed", "confused by a figure with a footnote"], ["Firm", "mixed", "a report that needed correcting"]],
    ]),
    ch("wrong", "Delete the security from the report, so the problem disappears.", "Removing a holding from a client's report hides it from them.", [
      "the problem is hidden from the client",
      [["Today", "The report omits it."], ["This week", "The client notices a missing holding."], ["This month", "The firm has to explain why a valued asset vanished from a report."]],
      [["Client", "bad", "a report that hides part of his portfolio"], ["Firm", "bad", "an incomplete report"], ["You", "bad", "you removed it"]],
    ], { follow: [6, "⚠️", "A client has noticed that one of his holdings is missing from last month's report. It was left out on your desk.", "bad"] }),
  ]),

  /* -------------------------------------------------- skipping a limit check */
  sit("i-r-limit-skip", ["invest"], "The price is moving: skip the limit check", "A trader says: 'The price is running away. I need to put this order in now, and I do not have time for the limit check. Just this once.' The order would take the desk above its exposure limit.", "risk-awareness", [
    ch("best", "Insist on the limit check, even if the opportunity passes. Offer to run it as fast as possible, and document why you did.", "Limits exist because speed hides risk. A missed opportunity is cheaper than a breached limit.", [
      "the limit holds, the check is fast, and the record is clear",
      [["Today", "You run the check quickly. The order goes in at a smaller size that fits."], ["This week", "The desk stays within limits. Risk acknowledges your note."], ["This month", "Traders learn that the check is quick and the rule is real."]],
      [["Firm", "good", "limits respected"], ["Team", "mixed", "a trader disappointed by a smaller order"], ["You", "good", "a clear, defensible decision"]],
    ]),
    ch("partly", "Allow it just this once, with a note.", "One exception becomes the habit. A note is not a check.", [
      "a one-off exception that was not one-off",
      [["Today", "The order goes in above the limit."], ["This week", "The price reverses and the desk loses on the oversized position."], ["This month", "Risk finds the breach and asks who approved it."]],
      [["Firm", "bad", "a limit breach and a loss"], ["You", "bad", "you allowed it"]],
    ]),
    ch("wrong", "Approve it and say nothing to risk.", "A hidden breach is the worst kind. If it goes wrong, it will look like concealment.", [
      "a limit breach nobody was told about",
      [["Today", "The order goes in."], ["This week", "The price reverses, and the loss is large."], ["This month", "Risk finds that the limit was breached and not reported. The loss and the concealment are examined together."]],
      [["Firm", "bad", "a loss and a hidden breach"], ["You", "bad", "a serious conduct finding"]],
    ], { follow: [6, "🚨", "Risk has found a limit breach on the desk that was not reported. They have asked who approved the order.", "bad"] }),
  ]),
];
