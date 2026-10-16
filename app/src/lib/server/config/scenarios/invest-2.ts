import { ch, sit } from "../scenario-kit";

/** Investment Advisory, batch 2: research, orders, records and conflicts. Fictional firms, clients and amounts. Drafts for Compliance review. */
export const INVEST_2 = [
  /* -------------------------------------------------- an error in a published note */
  sit("i-r-note-error", ["invest"], "A wrong earnings figure in your published note", "After your research note on Lagoon Breweries went out, you spot that you typed the wrong earnings figure. The error makes the share look cheaper than it is. Clients may already be acting on it.", "compliance", [
    ch("best", "Tell your head and Compliance immediately, publish a clear correction as soon as it is approved, and review how the error happened.", "Correct errors openly and quickly. Clients may have acted on the wrong figure.", [
      "the error is corrected openly, and clients can adjust",
      [["Today", "Your head and Compliance are told within minutes. A correction is prepared."], ["This week", "The correction goes to everyone who received the note, with a clear explanation."], ["This month", "A process change stops the same slip. Clients see a firm that corrects itself."]],
      [["Client", "good", "told, so they can reconsider"], ["Firm", "good", "an error corrected openly"], ["You", "good", "you reported it yourself"]],
    ]),
    ch("partly", "Fix it in the next note, in a week.", "Clients may buy on the wrong figure in the meantime.", [
      "the error stays live for a week",
      [["Today", "Nothing is sent."], ["This week", "Some clients buy on the strength of the wrong number."], ["This month", "When the next note corrects it, they ask why they were not told straight away."]],
      [["Client", "bad", "bought on a wrong figure"], ["Firm", "bad", "a late correction and possible losses"]],
    ]),
    ch("wrong", "Quietly edit the published note and say nothing.", "Silently changing a published note hides that clients received a wrong figure.", [
      "a published error is quietly erased",
      [["Today", "The online copy is changed."], ["This week", "A client points out that the figure he printed does not match the website."], ["This month", "The firm has to explain why an error was altered without notice, which looks like concealment."]],
      [["Client", "bad", "no way to know the figure was wrong"], ["Firm", "bad", "an undisclosed change to published research"], ["You", "bad", "you hid the correction"]],
    ], { next: "i-r-correction-published", follow: [6, "⚠️", "A client has noticed that the earnings figure on the website differs from the one in the note he printed. Compliance wants to know who changed it.", "bad"] }),
  ]),
  sit("i-r-correction-published", ["invest"], "A client printed the old version", "A client emails with two versions of your note side by side, with different earnings figures and no explanation. He asks, politely, which one is right and why he was not told.", "communication", [
    ch("best", "Tell him the truth: the first version had an error, it was changed without a notice, that should not have happened, and here is the correct figure. Apologise and tell your head.", "Honesty now, even about the cover-up, is the way out.", [
      "the truth ends the question, and the firm can fix its process",
      [["Today", "You explain what happened and apologise."], ["This week", "A correction notice goes out to all readers, and the process for amending research is tightened."], ["This month", "The client stays. He says the honest answer mattered more than the mistake."]],
      [["Client", "good", "told the truth"], ["Firm", "good", "a lapse owned and a process fixed"], ["You", "mixed", "a conversation with your head, but you were honest"]],
    ]),
    ch("partly", "Say the website was updated for clarity, and not mention the error.", "True in a sense, but it hides that the figure was wrong.", [
      "a half-explanation",
      [["Today", "He appears to accept it."], ["This week", "He compares the figures and realises it was a correction."], ["This month", "He asks why you did not just say so, and trusts the next note less."]],
      [["Client", "mixed", "feels managed"], ["You", "mixed", "a half-truth is remembered"]],
    ]),
    ch("wrong", "Say his printed version must be from an earlier draft that was never published.", "Claiming a published note was a draft is a lie that records can disprove.", [
      "a lie about a published document",
      [["Today", "He says he downloaded it from the site."], ["This week", "Server logs show it was public."], ["This month", "Your claim is shown to be untrue, which is worse than the original typo."]],
      [["Client", "bad", "knows you lied"], ["Firm", "bad", "a false statement to a client"], ["You", "bad", "a conduct finding"]],
    ], { follow: [6, "🚨", "Server logs show the note you called a draft was publicly available. Compliance has asked why a client was told otherwise.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- an urgent order on an unrecorded line */
  sit("i-r-unrecorded-order", ["invest"], "A large order, on a line that is not recorded", "A client phones your mobile with an urgent ₦150 million order. The call is not on a recorded line, and he says there is no time to send an email.", "compliance", [
    ch("best", "Ask him to call back on the recorded line or send written confirmation, and place the order only when you have it, even if it takes a few minutes. Log what happened.", "Instructions must be traceable. A few minutes' delay is cheaper than a dispute.", [
      "the order is placed on a proper record",
      [["Today", "He calls back on the recorded line within minutes. The order is placed."], ["This week", "There is no dispute: the instruction is on tape."], ["This month", "He knows how to give instructions properly, and does."]],
      [["Client", "good", "an order that cannot be disputed"], ["Firm", "good", "a traceable instruction"], ["You", "good", "you protected both sides"]],
    ]),
    ch("partly", "Place the order and ask him to confirm by email afterwards.", "The order is in, but if the price moves, he can say it was not what he said.", [
      "the order first, the evidence second",
      [["Today", "The order goes in."], ["This week", "The price moves against him."], ["This month", "He says he never gave that instruction, and there is no recording to settle it."]],
      [["Client", "mixed", "a disputed order"], ["Firm", "bad", "an order with no proof"]],
    ]),
    ch("wrong", "Place it and write the file note later, once you remember the details.", "Writing the record afterwards, from memory, for a large order is exactly how disputes are lost.", [
      "a large order resting on memory",
      [["Today", "The order is placed."], ["This week", "The price falls. He says he asked for half."], ["This month", "There is nothing but your memory of a call, and the firm may have to bear the loss."]],
      [["Client", "bad", "a loss and a dispute"], ["Firm", "bad", "a possible compensation claim"], ["You", "bad", "the file note is the only evidence"]],
    ], { follow: [6, "⚠️", "A client says he asked for half the amount of a ₦150 million order placed on a call that was not recorded. The firm may have to bear the difference.", "bad"] }),
  ]),

  /* -------------------------------------------------- a client wants a better rating */
  sit("i-r-rating-pressure", ["invest"], "A company asks you to upgrade your rating", "The finance director of a company you cover calls: 'We are about to raise money. An upgrade from you now would help enormously. We would remember it when mandates are awarded.'", "compliance", [
    ch("best", "Say your rating is independent and based on your analysis, record the call, and tell Compliance about the request and the hint about mandates.", "Research must be independent. A hint of business in return for a rating is a conflict you must report.", [
      "the rating stays honest, and the pressure is recorded",
      [["Today", "You decline politely and write down what was said."], ["This week", "Compliance reviews the call and may remind the company of the boundaries."], ["This month", "Your rating is whatever the analysis says, and nobody can accuse you of selling it."]],
      [["Client", "good", "investors get an honest rating"], ["Firm", "good", "research independence protected"], ["You", "good", "your integrity is on record"]],
    ]),
    ch("partly", "Say you will 'look at the numbers again' and be 'open-minded'.", "Open-mindedness sounds like a promise to someone who is asking for an upgrade.", [
      "a signal that the door is open",
      [["Today", "The finance director takes it as encouragement."], ["This week", "He calls again with more pressure."], ["This month", "When the rating does not change, he says you led him on."]],
      [["Firm", "bad", "an ambiguous exchange with a company you cover"], ["You", "bad", "your signal can be quoted"]],
    ]),
    ch("wrong", "Upgrade the rating: the company has good prospects and the relationship matters.", "Changing a rating for the benefit of a company that may award business is a serious conflict.", [
      "a rating that looks as if it was bought",
      [["Today", "The upgrade is published."], ["This week", "The company raises money. Investors rely on the new rating."], ["This month", "The firm is awarded a mandate by the company. The sequence looks like a trade, and a regulator may ask about it."]],
      [["Client", "bad", "investors relied on a rating that was influenced"], ["Firm", "bad", "a research-independence breach"], ["You", "bad", "a serious conduct and legal risk"]],
    ], { follow: [7, "🚨", "Compliance has noticed that a rating upgrade came days after a call from the company, and that the firm was then awarded business by it.", "bad"] }),
  ]),

  /* -------------------------------------------------- over the wall */
  sit("i-r-wall-crossed", ["invest"], "You know about a deal. A friend asks about the company", "You have been brought over the wall on a confidential acquisition. At a dinner, a friend says: 'I am thinking of buying shares in that target company. Is it a good idea?'", "compliance", [
    ch("best", "Say you cannot talk about that company at all, change the subject, and tell Compliance about the conversation. Do not trade in it yourself.", "Once you hold inside information, you cannot say anything, not even 'do not buy'. Report the conversation.", [
      "you give nothing away, and the firm knows",
      [["Today", "You say you cannot discuss it, and move on."], ["This week", "You tell Compliance, who note the conversation."], ["This month", "The deal is announced. Nobody can link anything to you."]],
      [["Client", "good", "the deal stays confidential"], ["Firm", "good", "the wall holds"], ["You", "good", "protected"]],
    ]),
    ch("partly", "Say 'I would not buy it right now', and nothing more.", "Even a hint like that can be a signal. Telling someone not to buy can be as revealing as telling them to.", [
      "no details, but a signal",
      [["Today", "He does not buy."], ["This week", "He mentions it to others, saying you advised against."], ["This month", "The deal comes out, and your comment looks like a leak."]],
      [["Firm", "bad", "confidential information signalled"], ["You", "bad", "a hint that looks like a leak"]],
    ]),
    ch("wrong", "Tell him it is a very good idea, without saying why.", "You know it will rise on the announcement. Encouraging him to buy is passing on inside information.", [
      "you pass on inside information with a nod",
      [["Today", "He buys."], ["This week", "The takeover is announced and the price jumps."], ["This month", "Surveillance flags his purchase before the announcement and traces it to the dinner, and to you."]],
      [["Client", "mixed", "a gain that is now a problem"], ["Firm", "bad", "a leak from inside the wall"], ["You", "bad", "a criminal and career risk"]],
    ], { follow: [7, "🚨", "A purchase of the target company's shares just before the announcement has been flagged. The buyer is someone known to you.", "bad"] }),
  ]),

  /* -------------------------------------------------- the best price or the favoured broker */
  sit("i-r-best-execution", ["invest"], "Better to deal with the broker who buys your lunch", "You must buy ₦80 million of bonds for a client. One broker offers a better price; another, who regularly takes you to lunch, is slightly worse. The second broker calls first.", "compliance", [
    ch("best", "Get both prices, deal with the broker offering the better outcome for the client, and note why.", "Your duty is the best result for the client, not your relationships.", [
      "the client gets the best price, and the record shows why",
      [["Today", "You compare and choose the better price."], ["This week", "The client's return is slightly better."], ["This month", "The lunch broker remains friendly. Your reputation for fairness grows."]],
      [["Client", "good", "the best available price"], ["Firm", "good", "best execution shown"], ["You", "good", "no conflict"]],
    ]),
    ch("partly", "Deal with the lunch broker, because the price is 'close enough'.", "Close is not the same as best, and the difference belongs to the client.", [
      "a slightly worse price for the client",
      [["Today", "You deal with the lunch broker."], ["This week", "The difference, small per bond, adds up."], ["This month", "A review comparing prices notes a pattern in your trades."]],
      [["Client", "bad", "pays slightly more than necessary"], ["Firm", "bad", "a best-execution shortfall"], ["You", "bad", "a pattern in your dealing"]],
    ]),
    ch("wrong", "Choose the lunch broker without comparing prices.", "Choosing by friendship, without looking, is a conflict of interest.", [
      "friendship decides, not the price",
      [["Today", "The lunch broker gets the deal."], ["This week", "A client's adviser compares the price with the market and asks about it."], ["This month", "The review sees repeated deals with one broker and a record of lunches."]],
      [["Client", "bad", "a poorer price"], ["Firm", "bad", "a conflict of interest and a best-execution failure"], ["You", "bad", "gifts and deals linked in the records"]],
    ], { follow: [6, "⚠️", "A review of bond trades has found a pattern of deals with one broker at prices slightly worse than the market, and a record of lunches paid by that broker.", "bad"] }),
  ]),

  /* -------------------------------------------------- your spouse owns the share */
  sit("i-r-spouse-holding", ["invest"], "Your spouse owns shares in the company you are about to cover", "You are about to initiate research on a company, and you realise your spouse holds shares in it. Nobody at work knows.", "compliance", [
    ch("best", "Tell Compliance before you publish, follow their instruction (which may include handing the company to someone else) and keep a record.", "Disclose a conflict before it matters. It is the only thing that protects you.", [
      "the conflict is managed before it can harm anyone",
      [["Today", "You tell Compliance, who reassign the coverage or put controls on it."], ["This week", "Research on the company is published by someone without the conflict."], ["This month", "Nobody can question the independence of the report, and you are trusted."]],
      [["Client", "good", "independent research"], ["Firm", "good", "a conflict managed"], ["You", "good", "disclosed and safe"]],
    ]),
    ch("partly", "Publish, and tell Compliance after it goes out.", "Disclosure after publication is too late to prevent the appearance of bias.", [
      "disclosed too late",
      [["Today", "The note is published."], ["This week", "You tell Compliance, who ask why you did not do it first."], ["This month", "The report carries a question mark, and you are asked to step away."]],
      [["Client", "mixed", "a report with a doubt over it"], ["Firm", "mixed", "a conflict disclosed late"]],
    ]),
    ch("wrong", "Have your spouse sell quietly first, and say nothing.", "Selling before publication, on your inside knowledge of the note, is trading on unpublished research.", [
      "your spouse trades ahead of your own note",
      [["Today", "Your spouse sells before publication."], ["This week", "The note is published and the share falls."], ["This month", "Surveillance links the sale to your note, and a conflict is now a trading offence."]],
      [["Client", "bad", "investors read a note you traded ahead of"], ["Firm", "bad", "a conflict and a possible offence"], ["You", "bad", "a serious conduct and legal problem"]],
    ], { follow: [7, "🚨", "A sale of the company's shares by a person connected to you, shortly before your note was published, has been flagged.", "bad"] }),
  ]),

  /* -------------------------------------------------- change the assumptions */
  sit("i-r-valuation-pressure", ["invest"], "A client wants the valuation raised", "A client asks you to change the assumptions in a valuation of his stake so that the price comes out higher, because he wants to use it in a loan application.", "compliance", [
    ch("best", "Explain that assumptions must be reasonable and supportable, show a range with evidence, and decline to adjust them to reach a figure.", "A valuation that starts with the answer is not a valuation. Independence is the whole point.", [
      "an honest range, and a client who understands why",
      [["Today", "You show him the range and the reasons for each assumption."], ["This week", "He uses the honest range, or decides to look elsewhere."], ["This month", "His lender trusts a valuation that was not bent to fit."]],
      [["Client", "good", "an honest valuation he can rely on"], ["Firm", "good", "valuation integrity"], ["You", "good", "you resisted pressure"]],
    ]),
    ch("partly", "Nudge a couple of assumptions, within the reasonable range.", "If the nudges are chosen to reach his number, the range is no longer honest.", [
      "assumptions chosen with the answer in mind",
      [["Today", "The value rises slightly."], ["This week", "The lender's own valuer disagrees."], ["This month", "He blames you, and the file shows the changes were made at his request."]],
      [["Client", "bad", "a valuation that does not hold"], ["You", "mixed", "the changes are on file"]],
    ]),
    ch("wrong", "Use his numbers as asked.", "Writing a valuation to suit the person who will use it is misleading to the lender who will rely on it.", [
      "a valuation shaped to mislead a lender",
      [["Today", "The valuation is issued."], ["This week", "The lender relies on it."], ["This month", "The loan goes bad. The lender asks to see the working, and finds the assumptions were dictated."]],
      [["Client", "bad", "a loan obtained on an unreliable valuation"], ["Firm", "bad", "a misleading valuation with the firm's name on it"], ["You", "bad", "you signed it"]],
    ], { follow: [7, "⚖️", "A lender has asked for the workings behind a valuation the firm issued, after a loan based on it went wrong.", "bad"] }),
  ]),

  /* -------------------------------------------------- client money in the wrong account */
  sit("i-r-client-money", ["invest"], "A client's payment landed in the house account", "A client's ₦25 million settlement payment has arrived in the firm's own account by mistake. A colleague says: 'It is useful liquidity. Leave it a few days; nobody will miss it.'", "compliance", [
    ch("best", "Tell finance and your head immediately, make sure the money is moved to the client's segregated account today, and write down the timeline.", "Client money must stay separate from the firm's money. Move it at once and say so.", [
      "client money is safe, and the mistake is on record",
      [["Today", "The funds are identified and moved to the client's account before close."], ["This week", "Finance records the incident and the cause."], ["This month", "The client never lost access to his money, and the control is tightened."]],
      [["Client", "good", "his money was never at risk"], ["Firm", "good", "client money rules respected"], ["You", "good", "you acted straight away"]],
    ]),
    ch("partly", "Tell finance, but leave it to them to move it next week.", "Right to report, but client money in the wrong account every day is a breach.", [
      "reported, but not fixed in time",
      [["Today", "Finance is told."], ["This week", "The funds sit in the house account for days."], ["This month", "The delay is a client-money breach in its own right."]],
      [["Firm", "bad", "a client-money rule breached for days"], ["You", "mixed", "you reported, but did not insist"]],
    ]),
    ch("wrong", "Leave it where it is, as the colleague suggests.", "Using client money as the firm's liquidity, even briefly, is a serious breach.", [
      "client money is used as the firm's own",
      [["Today", "The money stays."], ["This week", "The firm uses the balance to cover its own payment."], ["This month", "A reconciliation finds client money in the firm's account. This can be a serious regulatory breach, with a reporting duty."]],
      [["Client", "bad", "his money was used without his knowledge"], ["Firm", "bad", "a serious client-money breach"], ["You", "bad", "you knew and left it"]],
    ], { follow: [6, "🚨", "The reconciliation has found a client's settlement money held in the firm's own account for several days. Finance and Compliance are asking who knew.", "bad"] }),
  ]),

  /* -------------------------------------------------- why did my bond fall */
  sit("i-r-bond-fall", ["invest"], "'You told me bonds were safe'", "A client sees his bond fund drop 4% after interest rates rose, and calls you angry: 'You told me bonds were safe!'", "communication", [
    ch("best", "Stay calm, explain the inverse link between interest rates and bond prices, how long the fund holds its bonds, and what the income still earns. Admit if your word 'safe' was too strong.", "Explain the mechanism, and own any over-reassurance. Clients forgive a fall they understand.", [
      "he understands, and keeps the plan",
      [["Today", "You explain what happened and why, and own the word 'safe'."], ["This week", "He keeps the fund, now understanding its risks."], ["This month", "He tells his brother you explained things honestly."]],
      [["Client", "good", "informed and calmer"], ["Firm", "good", "a trusting client"], ["You", "good", "honest about your own words"]],
    ]),
    ch("partly", "Say it is just the market and will recover.", "True in part, but it does not answer his real question: what 'safe' meant.", [
      "a shrug instead of an explanation",
      [["Today", "He is not convinced."], ["This week", "He asks someone else."], ["This month", "Another adviser explains it better, and he moves."]],
      [["Client", "mixed", "unconvinced"], ["You", "mixed", "a missed chance"]],
    ]),
    ch("wrong", "Tell him bonds cannot fall in value.", "Bond prices can and do fall. Saying they cannot is wrong and misleading.", [
      "a false statement about how bonds work",
      [["Today", "He accepts it, confused."], ["This week", "The price falls further."], ["This month", "He complains that he was told they cannot fall, and wants his money back."]],
      [["Client", "bad", "misled about the product"], ["Firm", "bad", "a misleading statement"], ["You", "bad", "your words are the problem"]],
    ], { follow: [6, "⚠️", "A client who saw his bond fund fall says he was told bonds cannot fall in value. Compliance is reviewing what was said.", "bad"] }),
  ]),

  /* -------------------------------------------------- book last night's trade at today's price */
  sit("i-r-late-booking", ["invest"], "Book last night's trade at the better price", "A trader asks you, as the middle-office checker, to book a trade made at 4:55 pm yesterday using this morning's better price. 'Same trade, just a better number. Nobody will check.'", "compliance", [
    ch("best", "Refuse, explain that a trade must be booked at the price at which it was executed, tell your head of operations about the request, and book it correctly.", "Booking a trade at a different price from the one dealt falsifies the books. Refuse, and report.", [
      "the books stay true, and the request is on record",
      [["Today", "You book the trade at the true price and tell your head."], ["This week", "Operations reminds the desk of the booking rule."], ["This month", "Nobody is surprised at a later review. Your record is clean."]],
      [["Client", "good", "records that can be trusted"], ["Firm", "good", "an accurate book"], ["You", "good", "you resisted a favour"]],
    ]),
    ch("partly", "Book it as asked, and note the change privately.", "A private note does not make a false entry true.", [
      "a false entry with a private note",
      [["Today", "The trade is booked at the better price."], ["This week", "The note is not seen by anyone."], ["This month", "When the entry is checked against the market, the price does not fit the time."]],
      [["Firm", "bad", "a false entry in the books"], ["You", "bad", "you made it"]],
    ]),
    ch("wrong", "Book it at the better price: the trader is senior.", "Seniority does not make a false booking true.", [
      "the books are made to say something untrue",
      [["Today", "The trade is booked at today's price."], ["This week", "Profit and loss shows a gain that did not happen."], ["This month", "An audit compares times and prices and finds the mismatch. Falsifying the books is a serious breach."]],
      [["Client", "bad", "a figure that was never real"], ["Firm", "bad", "falsified books"], ["You", "bad", "your login is on the booking"]],
    ], { next: "i-r-booking-audit", follow: [6, "🚨", "Internal Audit has found a trade booked at a price that did not exist at the time it was executed. The entry was made on your login.", "bad"] }),
  ]),
  sit("i-r-booking-audit", ["invest"], "Internal Audit is sitting at your desk", "An Internal Audit officer asks you to walk through the booking of one trade. The price does not match the market at that time. The trader has told her it was 'a normal adjustment'.", "compliance", [
    ch("best", "Tell her exactly what you were asked, and what you did, including that you should have refused. Offer the messages and records.", "The truth, in full, is your only good option. Records will show it anyway.", [
      "the full truth reaches Audit, and the responsibility lands where it belongs",
      [["Today", "You give a complete, honest account and the supporting messages."], ["This week", "Audit speaks to the trader, whose instruction is clear from the messages."], ["This month", "You face consequences for the booking, reduced by your honesty. The trader faces more."]],
      [["Firm", "good", "the true picture, quickly"], ["You", "mixed", "a consequence, with your honesty counted"], ["Team", "mixed", "a trader under investigation, which is hard but fair"]],
    ]),
    ch("partly", "Say it was a routine adjustment, as the trader said.", "You are now repeating his explanation, which the records do not support.", [
      "repeating a story the records do not support",
      [["Today", "You say it was routine."], ["This week", "The records show no such routine."], ["This month", "You are now part of the story, as someone who backed it."]],
      [["Firm", "bad", "a longer investigation"], ["You", "bad", "your account is not believed"]],
    ]),
    ch("wrong", "Say you did not make the booking and your login was used by someone else.", "Blaming a stolen login, when it was your action, is a lie logs can test.", [
      "a lie about your own login",
      [["Today", "You deny it."], ["This week", "Access logs show the booking from your desk at a time you were there."], ["This month", "A booking error has become a dishonesty case against you."]],
      [["Firm", "bad", "a lie to Internal Audit"], ["You", "bad", "likely dismissal"]],
    ], { follow: [6, "🚨", "Access logs place the booking at your desk, at a time you were there. Internal Audit would like to talk to you again.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a post about a deal */
  sit("i-r-social-post", ["invest"], "A proud post about a deal you are working on", "Your team closes a big deal. A colleague suggests posting a photo of the deal team with the client's name tag visible, and a caption: 'Huge deal coming next week!'", "communication", [
    ch("best", "Hold off, explain that a confidential deal is not to be mentioned publicly before announcement, and suggest waiting for the official announcement and the firm's approval.", "Posting about an undisclosed deal can leak inside information. Wait for the announcement and approval.", [
      "the celebration waits, and the deal stays confidential",
      [["Today", "You explain, and the team agrees to wait."], ["This week", "The deal is announced officially. The firm shares its own post."], ["This month", "The team celebrates together, safely, with the firm's approval."]],
      [["Client", "good", "the deal stays confidential"], ["Firm", "good", "no leak"], ["Team", "good", "a mistake avoided"]],
    ]),
    ch("partly", "Allow the photo but remove the client's name tag and the caption detail.", "Better, but the post still shows a team celebrating a deal that has not been announced.", [
      "less revealing, but still a clue",
      [["Today", "A photo goes up, with no names."], ["This week", "A journalist links the faces to a client and guesses."], ["This month", "A leak is traced back to a team post."]],
      [["Firm", "mixed", "a clue that could have been avoided"], ["You", "mixed", "you allowed a risky post"]],
    ]),
    ch("wrong", "Let them post it: it will be announced soon anyway.", "Until it is announced, the deal is inside information. A post can move the price.", [
      "inside information reaches the public early",
      [["Today", "The post goes up."], ["This week", "The share price moves. Traders ask what the caption means."], ["This month", "Regulators ask why details of a deal were public before the announcement."]],
      [["Client", "bad", "a leak before the announcement"], ["Firm", "bad", "a possible market-abuse inquiry"], ["You", "bad", "you let it happen"]],
    ], { follow: [6, "🚨", "The price of a company's shares moved after a post by Meristem staff hinting at a big deal. Compliance wants to know who knew and who approved it.", "bad"] }),
  ]),
];
