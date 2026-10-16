import { ch, sit } from "../scenario-kit";

/** Wealth Advisory, batch 2: families, documents, products and honesty. Fictional clients and amounts. Drafts for Compliance review. */
export const WEALTH_2 = [
  /* -------------------------------------------------- two owners, two instructions */
  sit("w-r-joint-owners", ["wealth"], "Two brothers, two opposite instructions", "A portfolio is held jointly by two brothers. One phones: 'Sell the property fund.' An hour later the other phones: 'Do not touch the property fund. I forbid it.' The mandate says both must agree.", "communication", [
    ch("best", "Tell both that the mandate needs agreement from both, do nothing yet, offer a joint call or meeting, and note both instructions with the times.", "A joint mandate follows what the mandate says, not who phones first or who is louder.", [
      "nothing is done in haste, and both brothers are heard",
      [["Today", "Both are told, separately and kindly, what the mandate requires."], ["This week", "A joint call is held, and they reach an agreement, or agree to ask a lawyer."], ["This month", "Whatever they decide is recorded and signed by both. Neither can later say they were overruled."]],
      [["Client", "good", "both owners treated equally"], ["Firm", "good", "the mandate followed"], ["You", "good", "stayed neutral and kept a record"]],
    ]),
    ch("partly", "Follow the first instruction and tell the second brother afterwards.", "It is simpler, but you have acted on half the authority the mandate requires.", [
      "acting on one of two owners",
      [["Today", "The fund is sold on the first call."], ["This week", "The second brother is furious that he was not consulted."], ["This month", "He says the sale was made without proper authority, and asks the firm to put it right."]],
      [["Client", "bad", "one owner overruled"], ["Firm", "bad", "an instruction without full authority"], ["You", "bad", "your decision caused the dispute"]],
    ], { next: "w-r-brothers-dispute" }),
    ch("wrong", "Follow whichever brother is the elder or the more senior in the family.", "Family seniority is not in the mandate. The mandate decides.", [
      "family hierarchy decides instead of the mandate",
      [["Today", "The elder brother's instruction is followed."], ["This week", "The younger one complains in writing."], ["This month", "The firm had no authority for the sale and has to answer for it."]],
      [["Client", "bad", "one owner ignored"], ["Firm", "bad", "an unauthorised transaction"], ["You", "bad", "named in the complaint"]],
    ], { next: "w-r-brothers-dispute", follow: [6, "✉️", "A joint owner has complained that a sale was made on his brother's say-so alone, against the mandate.", "bad"] }),
  ]),
  sit("w-r-brothers-dispute", ["wealth"], "Now the brothers are not speaking", "After the sale, the brothers have stopped speaking. One of them is demanding that the firm buy the fund back at today's price; the other says it was the right call.", "communication", [
    ch("best", "Escalate to your manager and Compliance, stay neutral, put everything in writing to both, and let the firm decide how to respond, including whether it must put anything right.", "A dispute between owners is not yours to settle. Be neutral, be clear, and escalate.", [
      "the firm responds as one, fairly to both",
      [["Today", "Your notes of both calls and the sale go to Compliance."], ["This week", "The firm decides what, if anything, it needs to put right. Both brothers hear the same message in writing."], ["This month", "The matter closes without anyone feeling you took sides."]],
      [["Client", "good", "both treated equally"], ["Firm", "good", "a dispute handled properly"], ["You", "mixed", "you will be coached on the original decision"]],
    ]),
    ch("partly", "Try to broker a deal between the brothers yourself, over a private lunch.", "Meant well, but you are now in the middle of a family dispute, without authority and without a record.", [
      "peacemaking without authority",
      [["Today", "The lunch happens. Both feel you favoured the other."], ["This week", "Both give different accounts of what you said."], ["This month", "The firm has to unpick your conversations as well as the sale."]],
      [["Client", "bad", "each sure you took the other's side"], ["You", "bad", "a conflict you created"]],
    ]),
    ch("wrong", "Tell the unhappy brother he should have spoken up earlier.", "Blaming a client for a mistake the firm made is both unfair and untrue.", [
      "blaming the client for the firm's mistake",
      [["Today", "He ends the call and instructs a lawyer."], ["This week", "The lawyer's letter arrives."], ["This month", "The firm now defends a claim, and your remark is in the correspondence."]],
      [["Client", "bad", "now represented by a lawyer"], ["Firm", "bad", "a claim and a legal cost"], ["You", "bad", "your remark is quoted"]],
    ], { follow: [6, "⚖️", "A lawyer's letter has arrived on behalf of a joint owner. It quotes what you said to him about speaking up earlier.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- moving assets before a divorce */
  sit("w-r-divorce-move", ["wealth"], "Move my assets to my sister's name", "A client tells you quietly that she is divorcing. She asks you to move half her holdings into her sister's name 'just for safekeeping' and not mention it to anyone.", "compliance", [
    ch("best", "Decline to move assets in a way that could hide them from a lawful process, suggest she takes independent legal advice, record the request and tell Compliance.", "Helping to hide assets can mean taking part in something unlawful. Say no kindly, and record it.", [
      "you stay out of something that could harm others, and she is pointed to proper advice",
      [["Today", "You decline gently and suggest a lawyer. She is upset but not surprised."], ["This week", "Your note and Compliance's guidance protect you if the matter is ever examined."], ["This month", "She follows lawful advice. The firm is not part of any concealment."]],
      [["Client", "mixed", "turned down, but guided"], ["Firm", "good", "a possible concealment avoided"], ["You", "good", "you stayed on the right side of the line"]],
    ]),
    ch("partly", "Move a smaller amount, and keep it between the two of you.", "A smaller amount is the same act. Secrecy makes it worse.", [
      "a smaller version of the same problem",
      [["Today", "A portion is moved."], ["This week", "The transfer is seen in her spouse's disclosure demand."], ["This month", "The firm is asked why it assisted in moving assets in the middle of a divorce."]],
      [["Client", "bad", "exposed in court"], ["Firm", "bad", "drawn into a legal dispute"], ["You", "bad", "your part is examined"]],
    ]),
    ch("wrong", "Do it quickly and quietly: it is her money, and nobody will notice.", "It is her money, but moving it to defeat a lawful process can amount to helping to defeat it.", [
      "you take part in hiding assets",
      [["Today", "The assets move."], ["This week", "The spouse's lawyers obtain account histories and find the transfers."], ["This month", "The firm is summoned for documents, and the court asks who arranged the transfer."]],
      [["Client", "bad", "a worse outcome in court"], ["Firm", "bad", "exposed as part of a concealment"], ["You", "bad", "a serious conduct and legal problem"]],
    ], { follow: [7, "⚖️", "A court has asked the firm for records of transfers made on a client's account before her divorce. Your name is on the transfer instructions.", "bad"] }),
  ]),

  /* -------------------------------------------------- a product too complicated to explain */
  sit("w-r-complex-product", ["wealth"], "A retired teacher loves the headline return", "A retired teacher is excited by a structured note with a high headline return. She says, 'You explained it nicely, I think it is like a bond.' You are not sure she understands the risk.", "risk-awareness", [
    ch("best", "Slow down. Explain in plain words what could go wrong, ask her to say back what she understands, and only continue if it truly fits her needs and she understands. Offer a simpler alternative.", "If she cannot explain it back, she does not understand it. Her understanding is part of suitability.", [
      "she chooses a product she understands, or declines one she does not",
      [["Today", "She tries to explain the note back and realises it is not like a bond. She asks for something simpler."], ["This week", "She holds a straightforward income product."], ["This month", "She sleeps well. Her retirement income is safe."]],
      [["Client", "good", "invested in what she understands"], ["Firm", "good", "a suitable sale"], ["You", "good", "you tested her understanding"]],
    ]),
    ch("partly", "Give her the brochure and let her decide at home.", "A brochure does not test understanding. She may decide on the headline alone.", [
      "she is given paper, not understanding",
      [["Today", "She takes the brochure home."], ["This week", "She returns excited and buys."], ["This month", "When the note's value falls, she says she thought it was safe."]],
      [["Client", "bad", "holds something she did not understand"], ["Firm", "mixed", "a complaint waiting to happen"]],
    ]),
    ch("wrong", "Let her buy it: she is excited, and it carries a good commission.", "Selling a complex product to someone who does not understand it, for your own gain, is mis-selling.", [
      "a complex product sold to someone who did not understand it",
      [["Today", "She buys the note."], ["This week", "Its value falls with the market."], ["This month", "She complains. The review finds no evidence that you tested her understanding, and a commission that was a motive."]],
      [["Client", "bad", "loses retirement money"], ["Firm", "bad", "mis-selling and compensation"], ["You", "bad", "a mis-selling investigation"]],
    ], { follow: [6, "⚠️", "A retired client has complained that she did not understand a structured note that fell in value. Compliance is reviewing the sale.", "bad"] }),
  ]),

  /* -------------------------------------------------- splitting a deposit */
  sit("w-r-split-deposit", ["wealth"], "Split the deposit so it is not reported", "A client brings ₦45 million in cash, which is more than the cash limit that triggers reporting. He asks: 'Can we put it in as several smaller deposits over a few days? It would be simpler.'", "compliance", [
    ch("best", "Explain that you cannot split a deposit to avoid reporting, ask about the source of the funds, document the answer, and refer the matter to Compliance, which decides on any report.", "Splitting a deposit to stay below a threshold is called structuring, and it is itself a warning sign.", [
      "a warning sign is raised properly",
      [["Today", "You decline and ask politely where the cash came from."], ["This week", "Compliance reviews your note and decides whether a suspicious transaction report is needed."], ["This month", "If the source is genuine and documented, the deposit goes ahead properly. If not, the firm has done what it must."]],
      [["Client", "mixed", "slowed down, but treated with courtesy"], ["Firm", "good", "a possible laundering attempt handled by the book"], ["You", "good", "you spotted it and escalated"]],
    ]),
    ch("partly", "Accept the deposit in one go but say nothing to Compliance.", "You avoided splitting it, but you did not report what he asked for.", [
      "the structuring request goes unreported",
      [["Today", "The deposit is made properly."], ["This week", "He tries again with another officer, who agrees to split it."], ["This month", "Compliance reviews and sees that you knew of the request and did not report it."]],
      [["Firm", "bad", "a missed warning"], ["You", "bad", "you knew and did not report"]],
    ]),
    ch("wrong", "Agree to split it into smaller deposits: it is easier and the client is important.", "That is helping to avoid reporting. It can be a criminal offence for the person who helps.", [
      "you help a client avoid a reporting rule",
      [["Today", "The deposits are made over three days."], ["This week", "Monitoring flags a pattern of deposits just under the threshold."], ["This month", "An investigation looks at what you knew. Helping to avoid reporting can be treated as part of the offence."]],
      [["Client", "mixed", "gets the result, but under scrutiny"], ["Firm", "bad", "a possible reporting failure"], ["You", "bad", "a serious conduct and possibly legal problem"]],
    ], { follow: [7, "🚨", "Monitoring has flagged a series of cash deposits just under a reporting threshold, all handled on your desk.", "bad"] }),
  ]),

  /* -------------------------------------------------- an expensive thank you */
  sit("w-r-gift-watch", ["wealth"], "A very generous thank-you", "At year end, a client you have served for six years gives you an expensive watch. 'Take it. You have earned it. Do not insult me by refusing.'", "compliance", [
    ch("best", "Thank him warmly, say you cannot accept a gift of that value under the firm's policy, offer a handwritten note instead, and disclose the offer to Compliance.", "Polite refusal and disclosure protect both of you. Real friendship survives a polite no.", [
      "his gratitude is received, the gift is not, and the record is clean",
      [["Today", "He is a little hurt, then understands. You accept a handshake and a card."], ["This week", "Compliance records the offer."], ["This month", "He refers a friend, saying that you were the adviser who could not be bought."]],
      [["Client", "good", "respected, and still valued"], ["Firm", "good", "a gift declared"], ["You", "good", "above reproach"]],
    ]),
    ch("partly", "Accept it, and tell Compliance afterwards.", "Disclosing after accepting is better than hiding, but the policy said to decline.", [
      "accepted first, declared second",
      [["Today", "You take the watch."], ["This week", "Compliance asks you to return it."], ["This month", "Returning it later is awkward for both of you."]],
      [["Client", "mixed", "offended when asked to take it back"], ["You", "mixed", "you disclosed, but late"]],
    ]),
    ch("wrong", "Accept it and say nothing to anyone.", "An undisclosed valuable gift from a client is a conflict of interest, however innocent the reason.", [
      "an undisclosed gift becomes a conflict",
      [["Today", "The watch is yours."], ["This week", "A colleague notices it and asks."], ["This month", "A complaint from another client about favouritism makes the gift look like a motive."]],
      [["Client", "mixed", "may expect favours"], ["Firm", "bad", "an undisclosed conflict"], ["You", "bad", "a policy breach"]],
    ], { follow: [6, "⚠️", "A colleague has mentioned an expensive gift from a client that was never declared. Compliance has asked you about it.", "bad"] }),
  ]),

  /* -------------------------------------------------- a daughter wants her father's details */
  sit("w-r-daughter-poa", ["wealth"], "A daughter asks about her father's portfolio", "A woman phones: 'My father is in hospital. I need his balances and to sell some units for his bills.' She says she is his daughter, and she sounds distressed.", "compliance", [
    ch("best", "Be kind, explain you cannot share details or act without authority from the account holder, tell her what documents (such as a power of attorney) would allow her to help, and offer to speak to the father if he is able.", "Compassion without breaching confidentiality. Say what is needed, and make it easy.", [
      "his privacy is protected, and she is shown the way",
      [["Today", "She is told what she needs. You offer to speak to him directly."], ["This week", "A valid power of attorney arrives, or the father gives instructions himself."], ["This month", "Everything is handled with authority. The family is grateful for the care and the clarity."]],
      [["Client", "good", "his money moves only with authority"], ["Firm", "good", "confidentiality protected"], ["You", "good", "compassionate and careful"]],
    ]),
    ch("partly", "Give her the balance but refuse to sell anything.", "Even a balance is confidential. Only the account holder or an authorised person may have it.", [
      "a balance shared, a sale refused",
      [["Today", "You give her the balance."], ["This week", "She later asks others to push for more."], ["This month", "The father complains that his details were shared with someone he had not authorised."]],
      [["Client", "bad", "private details given away"], ["Firm", "bad", "a confidentiality breach"], ["You", "bad", "disclosed without authority"]],
    ]),
    ch("wrong", "Sell the units: she is clearly his daughter and he needs the money.", "You cannot know she is his daughter, or that he wants a sale. Selling on a phone call is acting without authority.", [
      "assets sold on a stranger's word",
      [["Today", "Units are sold and money is paid."], ["This week", "The father recovers and finds his holding reduced, and the money gone to someone he had not meant."], ["This month", "The firm has to answer for a sale made without authority."]],
      [["Client", "bad", "his assets sold without his instruction"], ["Firm", "bad", "an unauthorised transaction"], ["You", "bad", "you acted without any authority"]],
    ], { follow: [6, "🚨", "A client who was in hospital says his account was sold down by someone who phoned in. The instruction was taken on your desk.", "bad"] }),
  ]),

  /* -------------------------------------------------- you sent the wrong figure */
  sit("w-r-report-error", ["wealth"], "You find a mistake in a report you already sent", "Three days after sending a client his quarterly report, you notice you used last year's valuation for one holding. The total is overstated by about ₦2 million. He has not noticed.", "compliance", [
    ch("best", "Tell your manager at once, correct the report, call the client yourself, explain the mistake plainly, and record what you changed and why.", "A mistake owned early is a small problem. Hidden, it grows.", [
      "a small mistake is corrected and the client's trust grows",
      [["Today", "You call him and explain, then send the corrected report."], ["This week", "He thanks you for telling him. Your manager notes how you handled it."], ["This month", "The error never becomes an issue, and he mentions your honesty to a colleague."]],
      [["Client", "good", "told the truth, and given a correct figure"], ["Firm", "good", "an error found and fixed"], ["You", "good", "trusted for owning it"]],
    ]),
    ch("partly", "Send the corrected report quietly, without calling him.", "The correction reaches him, but he has no explanation and may wonder what else is wrong.", [
      "the right figure, but no explanation",
      [["Today", "A corrected report arrives with no comment."], ["This week", "He notices the difference and asks what happened."], ["This month", "He wonders why he was not told, and whether other things have been wrong."]],
      [["Client", "mixed", "confused and a little suspicious"], ["You", "mixed", "a missed chance to be open"]],
    ]),
    ch("wrong", "Say nothing: he has not noticed, and the difference will fade next quarter.", "He is making decisions on an overstated figure. Leaving it is allowing a false picture to stand.", [
      "an overstated figure stays with the client",
      [["Today", "Nothing happens."], ["This week", "He makes a decision based on the wrong figure."], ["This month", "He finds the difference. 'You knew and said nothing' is worse than the original mistake."]],
      [["Client", "bad", "a decision made on a wrong number"], ["Firm", "bad", "a known error left uncorrected"], ["You", "bad", "your silence is the real problem"]],
    ], { next: "w-r-correction-fallout", follow: [7, "✉️", "A client has found that last quarter's report overstated one of his holdings by about ₦2 million, and wants to know whether anyone knew.", "bad"] }),
  ]),
  sit("w-r-correction-fallout", ["wealth"], "He asks whether you knew", "The client holds both reports in front of him. He asks you directly: 'Did you know about this mistake when we spoke last month?'", "compliance", [
    ch("best", "Tell him the truth: yes, you noticed and did not tell him, and that was wrong. Apologise, give him the correct figures and tell your manager what you have said.", "The truth now is a damaged relationship, but a lie would end it.", [
      "an honest answer keeps the door open",
      [["Today", "You tell him the truth and apologise."], ["This week", "He is angry but sees that you came forward. Your manager and Compliance review the file."], ["This month", "You are coached or disciplined as the facts require. He decides whether to stay, with the truth in hand."]],
      [["Client", "mixed", "angry, but told the truth"], ["Firm", "mixed", "a mistake and a concealment, both disclosed"], ["You", "mixed", "a consequence, with your honesty intact"]],
    ]),
    ch("partly", "Say you only noticed recently, which is not quite true.", "A half-truth he can check against your email is worse than the whole truth.", [
      "a half-truth that can be checked",
      [["Today", "He accepts it for now."], ["This week", "Emails show you opened the report three days after sending."], ["This month", "He concludes you lied to him, which is worse than the error."]],
      [["Client", "bad", "now sure you lied"], ["You", "bad", "a lie on top of a mistake"]],
    ]),
    ch("wrong", "Say you did not know, and blame the system.", "Denying that you knew, when you did, is a lie, and records can show it.", [
      "a lie about what you knew",
      [["Today", "He appears to accept it."], ["This week", "The system shows you viewed the corrected figures before you spoke to him."], ["This month", "A mistake about a number has become an investigation into honesty."]],
      [["Client", "bad", "lied to directly"], ["Firm", "bad", "an integrity breach"], ["You", "bad", "a serious conduct investigation"]],
    ], { follow: [6, "🚨", "The system shows you opened a corrected valuation before telling a client you did not know of the error. Compliance wants to talk to you.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a target and an in-house fund */
  sit("w-r-house-fund", ["wealth"], "Push our own fund to hit the target", "Your manager says the in-house fund must reach its target this month: 'Recommend it to every client with cash.' A cautious client with short-term needs is next on your list.", "compliance", [
    ch("best", "Recommend what truly suits her, which may not be the in-house fund, explain why, and tell your manager that for this client the fund does not fit and what you recommended instead.", "A target never overrides suitability. Offer the fund only where it fits, and be open about why not.", [
      "she gets what suits her, and you stay honest with your manager",
      [["Today", "She is offered a short-term, liquid product that fits her needs."], ["This week", "Your manager is told why, and accepts it."], ["This month", "She stays and adds more money. Another client, better suited, takes the in-house fund."]],
      [["Client", "good", "recommended what suited her"], ["Firm", "good", "a suitable sale and a trusting client"], ["You", "good", "you resisted pressure honestly"]],
    ]),
    ch("partly", "Mention the fund briefly as an option, among others, without recommending it.", "Honest, but it does not tell her which is right for her, which is your job.", [
      "an option mentioned, but no advice given",
      [["Today", "She hears several options and picks the one with the highest headline."], ["This week", "It turns out not to suit her needs."], ["This month", "She asks why you did not say which was right."]],
      [["Client", "mixed", "left to choose alone"], ["You", "mixed", "no clear advice"]],
    ]),
    ch("wrong", "Recommend the in-house fund, to help the team hit its target.", "Recommending a product because of a target and not the client is mis-selling.", [
      "her needs are set aside for a target",
      [["Today", "She buys the fund."], ["This week", "It is illiquid for a year and she needs the money in six months."], ["This month", "She complains. The file shows a target email from your manager and no analysis of her needs."]],
      [["Client", "bad", "money locked in when she needs it"], ["Firm", "bad", "mis-selling driven by a target"], ["You", "bad", "your sale is under review"]],
    ], { next: "w-r-fund-complaint", follow: [7, "⚠️", "A client who needed her money within six months says she was sold a fund that locks it in for a year. Compliance is reviewing how the fund was being pushed.", "bad"] }),
  ]),
  sit("w-r-fund-complaint", ["wealth"], "Compliance is reviewing how the fund was sold", "Compliance has asked to see all recommendations of the in-house fund this month. Your manager asks you privately: 'Say it was your own decision, not a team push.'", "compliance", [
    ch("best", "Tell the truth about the target email and what you were asked to do, show the file honestly, and say you should have raised the pressure with Compliance.", "Honesty protects the clients and, in the end, you. Pressure to mis-sell is exactly what Compliance needs to hear about.", [
      "the truth reaches Compliance, and the practice can be fixed",
      [["Today", "You give Compliance the email and the facts."], ["This week", "The review looks at the whole team's sales, not only yours. Clients who were sold unsuitably are contacted."], ["This month", "Targets that drove the problem are changed. You are heard, and coached on raising concerns sooner."]],
      [["Client", "good", "unsuitable sales found and put right"], ["Firm", "good", "a pressure problem exposed and fixed"], ["You", "mixed", "you will be coached, but you told the truth"]],
    ]),
    ch("partly", "Say nothing about the target, but answer honestly about your own sales.", "You were not untruthful, but you left out the cause, which matters most.", [
      "your sales examined, but not the cause",
      [["Today", "Your answers are accurate and incomplete."], ["This week", "The review finds a pattern across the team."], ["This month", "Compliance wonders why you did not mention the target."]],
      [["Firm", "mixed", "slower to find the real cause"], ["You", "mixed", "a missed chance to speak up"]],
    ]),
    ch("wrong", "Say it was your own decision, as your manager asked.", "Lying to Compliance to protect a manager makes you part of the problem.", [
      "you take the blame for something that was not only yours, and lie to do it",
      [["Today", "You say what your manager asked you to say."], ["This week", "The target email is found, and contradicts you."], ["This month", "You are held responsible for the sales and for what you said. Your manager is held responsible too."]],
      [["Client", "bad", "the cause is hidden for longer"], ["Firm", "bad", "a lie to Compliance"], ["You", "bad", "a serious conduct finding"]],
    ], { follow: [6, "🚨", "Compliance has found a target email that contradicts what you said about why you recommended the in-house fund. They want to meet you.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a fear of the naira */
  sit("w-r-fx-fear", ["wealth"], "'Move everything into dollars. Now.'", "After alarming news about the naira, a client wants all ₦90 million moved into dollars today. 'Do not argue. Do it.'", "market-knowledge", [
    ch("best", "Acknowledge his worry, explain currency risk, costs and rules, show a balanced allocation that keeps some local and some dollar exposure, and let him choose with the advice recorded.", "Fear is a reason to talk, not to act blindly. A balanced allocation respects both his worry and his plan.", [
      "he diversifies sensibly, and his decision is informed",
      [["Today", "You show him what each choice would mean. He chooses a mix."], ["This week", "The currency moves either way. His portfolio is not all on one outcome."], ["This month", "He thanks you for not just following his panic, and not ignoring his worry."]],
      [["Client", "good", "protected without betting everything"], ["Firm", "good", "advice and decision recorded"], ["You", "good", "you balanced fear with facts"]],
    ]),
    ch("partly", "Do it exactly as asked, without discussion.", "It is his instruction, but good advice means telling him what 100% in one currency risks.", [
      "an instruction followed with no advice",
      [["Today", "Everything moves to dollars at today's rate and cost."], ["This week", "The rate eases. He has paid the cost of moving and lost the local yield."], ["This month", "He says nobody explained what it would cost."]],
      [["Client", "mixed", "paid for a move he did not understand"], ["You", "mixed", "no advice on record"]],
    ]),
    ch("wrong", "Tell him dollars are always the best place to be.", "No asset is always best. Saying so is misleading.", [
      "an absolute claim that cannot be true",
      [["Today", "He moves everything."], ["This week", "The dollar softens and the naira firms."], ["This month", "He quotes you: 'always the best'."]],
      [["Client", "bad", "relied on a false claim"], ["Firm", "bad", "a misleading statement"], ["You", "bad", "your words are quoted"]],
    ], { follow: [6, "⚠️", "A client who moved everything into dollars says you told him dollars were 'always the best'. Compliance wants to hear the conversation.", "bad"] }),
  ]),

  /* -------------------------------------------------- the annual review he keeps cancelling */
  sit("w-r-review-skip", ["wealth"], "He keeps cancelling the annual review", "A busy client has cancelled his annual review three times. 'Everything is fine. Just leave it.' His circumstances may have changed: you heard he has a new baby.", "client-care", [
    ch("best", "Offer a short, flexible slot, explain what changes in his life can affect his plan, ask how things are, and keep a note of each attempt to meet him.", "A review is where plans catch up with life. Make it short, and make it easy.", [
      "his plan catches up with his life",
      [["Today", "You offer a 20-minute call at a time that suits him."], ["This week", "He mentions the baby, and that he wants to buy a house in three years."], ["This month", "His portfolio is adjusted for a new goal. He thanks you for pushing gently."]],
      [["Client", "good", "a plan that fits his life now"], ["Firm", "good", "a review done and recorded"], ["You", "good", "persistence with kindness"]],
    ]),
    ch("partly", "Leave him alone until he asks.", "Respectful, but plans go stale. Silence is not service.", [
      "left alone, and the plan goes stale",
      [["Today", "He is glad not to be chased."], ["This week", "His circumstances have changed, but nobody asks."], ["This month", "A year on, his portfolio no longer fits his life."]],
      [["Client", "mixed", "a plan that has drifted"], ["You", "mixed", "a missed chance to help"]],
    ]),
    ch("wrong", "Mark the review as completed in the system.", "A false record says something happened that did not.", [
      "a review that never happened is on record",
      [["Today", "The system shows a completed review."], ["This week", "A quality check asks for the notes of the review."], ["This month", "There are none, and the false entry is a records breach."]],
      [["Client", "bad", "no real review"], ["Firm", "bad", "a false record"], ["You", "bad", "a conduct finding"]],
    ], { follow: [6, "⚠️", "A quality check has asked for the notes of an annual review that is marked as completed. The client says it never took place.", "bad"] }),
  ]),
];
