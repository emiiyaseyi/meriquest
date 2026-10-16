import { ch, sit } from "../scenario-kit";

/** Wealth Advisory, batch 1: advice under pressure. Fictional clients and amounts. Drafts for Compliance review. */
export const WEALTH_1 = [
  /* -------------------------------------------------- a fall, and the urge to sell everything */
  sit("w-r-loss-panic", ["wealth"], "She wants to sell everything after a fall", "A careful client with a five-year goal has watched her portfolio fall 6% in a month. She phones you: 'Sell it all. I cannot sleep.'", "risk-awareness", [
    ch("best", "Listen first, review her goal and timeline with the numbers, explain what happened and what a sale now would lock in, and let her decide with that in front of her. If she still wants to sell, record the instruction and the advice you gave.", "Calm, evidence-based advice, then her decision. Advising is not the same as refusing.", [
      "she decides with a clear head, and the advice is on record",
      [["Today", "You take her through what fell, why, and what her plan says. She is calmer by the end."], ["This week", "She chooses to keep most of it and sell a small part to feel safer. Your note records the advice and her decision."], ["This month", "Markets recover part of the fall. Whatever happens next, her decision was informed and documented."]],
      [["Client", "good", "decided with understanding, not fear"], ["Firm", "good", "advice and instruction both recorded"], ["You", "good", "a clean file"]],
    ]),
    ch("partly", "Tell her markets always recover, and to wait.", "Reassurance is not advice. If she has a five-year goal, she deserves to see the numbers.", [
      "comfort without analysis",
      [["Today", "She is calmed for a day."], ["This week", "The next fall comes. 'You told me it always recovers' is quoted back to you."], ["This month", "If she sells at the bottom, she remembers that you said wait."]],
      [["Client", "mixed", "reassured, then let down"], ["You", "mixed", "your words may come back to you"]],
    ]),
    ch("wrong", "Sell everything at once, as instructed, without a conversation.", "Taking an instruction is allowed, but good advice means explaining what a sale locks in.", [
      "she sells at the low, and it is done the moment she asked",
      [["Today", "Everything is sold at today's price."], ["This week", "Markets turn. She is out and sees them rise."], ["This month", "She asks why nobody talked to her before she sold. You have no note of any advice."]],
      [["Client", "bad", "locks in a loss she might have avoided"], ["Firm", "bad", "a complaint about advice not given"], ["You", "bad", "an instruction with no advice on record"]],
    ], { next: "w-r-sold-the-bottom", follow: [7, "✉️", "A client who sold everything last week says that nobody advised her first, and the market has since recovered. She has asked for the file.", "bad"] }),
  ]),
  sit("w-r-sold-the-bottom", ["wealth"], "She sold, and the market has recovered", "The client who sold everything is on the phone. The market has since recovered most of its fall. She says: 'You let me do it. Why did nobody stop me?'", "communication", [
    ch("best", "Do not defend yourself. Acknowledge how she feels, explain honestly what was and was not discussed, offer a proper review of her plan and, if she wants to complain, tell her how and escalate to your manager.", "Be honest, kind and clear. If she complains, that is her right.", [
      "an honest conversation limits the damage and keeps the door open",
      [["Today", "You listen, say what happened, and offer a plan review."], ["This week", "Her goals are revisited, and a staged way back into the market is discussed."], ["This month", "She does not leave, though she may still complain. You are credited with having been straight."]],
      [["Client", "mixed", "upset, but treated honestly"], ["Firm", "good", "a complaint handled well"], ["You", "good", "you stayed professional"]],
    ]),
    ch("partly", "Tell her that nobody can time the market, and that is that.", "True, but it dismisses the question. She asked why nobody talked to her.", [
      "a true answer to the wrong question",
      [["Today", "She ends the call unsatisfied."], ["This week", "She writes in."], ["This month", "The firm has to reconstruct what advice was given."]],
      [["Client", "bad", "feels brushed off"], ["Firm", "mixed", "a written complaint"]],
    ]),
    ch("wrong", "Tell her she insisted, and you only followed her instruction.", "Pointing at her instruction without admitting that you gave no advice turns a loss into a dispute.", [
      "the client is blamed for her own loss",
      [["Today", "She is furious."], ["This week", "She files a complaint, saying she was never advised."], ["This month", "The file shows an instruction and no advice. The firm may have to compensate her."]],
      [["Client", "bad", "blamed for a loss"], ["Firm", "bad", "a complaint it may lose"], ["You", "bad", "your file shows no advice"]],
    ], { follow: [6, "⚠️", "Compliance has opened a review of a sale instruction you took, because the file shows no record of advice before the client sold.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a guarantee */
  sit("w-r-guarantee", ["wealth"], "Guarantee 25% and ₦200 million is yours", "A prospective client says: 'I will move ₦200 million to you tomorrow if you guarantee at least 25% a year.' Your target for the quarter is within reach.", "compliance", [
    ch("best", "Decline the guarantee politely, explain that no returns can be promised, show what a sensible plan for her goals and risk looks like, and offer to work with her on that basis.", "A promised return is never allowed. Win the client on honesty, not on a number.", [
      "she hears the truth, and you are left with a relationship you can defend",
      [["Today", "She is disappointed about the guarantee but listens to the plan."], ["This week", "She either moves part of her money on realistic terms, or goes elsewhere. You have promised nothing."], ["This month", "If she stays, she stays on honest terms. If she goes, the firm has avoided a promise it could not keep."]],
      [["Client", "good", "told the truth about risk"], ["Firm", "good", "no promise it cannot keep"], ["You", "good", "you protected yourself and the firm"]],
    ]),
    ch("partly", "Say it 'should be around that' without being specific.", "A vague yes sounds like a promise, and clients remember the number, not the hedge.", [
      "a hint that she hears as a promise",
      [["Today", "She hears 25% and moves the money."], ["This week", "The first quarter comes in well below 25%."], ["This month", "She says you told her it would be about 25%. Your hedge did not survive in her memory."]],
      [["Client", "bad", "feels misled"], ["Firm", "bad", "a complaint about what was promised"], ["You", "bad", "your words are the evidence"]],
    ], { next: "w-r-guarantee-fallout" }),
    ch("wrong", "Give the guarantee verbally to win the account.", "Guaranteeing returns breaks the code of conduct, whether it is written or spoken.", [
      "a promise nobody can keep wins the account, and loses everything else",
      [["Today", "₦200 million arrives. You are the hero of the quarter."], ["This week", "Returns do not match the promise."], ["This month", "She calls it fraud. The firm has to look at what was promised, and the investigation is about you."]],
      [["Client", "bad", "a loss and a broken promise"], ["Firm", "bad", "a conduct breach and reputational risk"], ["You", "bad", "a serious conduct investigation"]],
    ], { next: "w-r-guarantee-fallout", follow: [6, "🚨", "A client has told the firm that you guaranteed a return of 25% before she moved ₦200 million. Compliance has opened an investigation.", "bad"] }),
  ]),
  sit("w-r-guarantee-fallout", ["wealth"], "She holds you to the number", "Three months later she calls: the portfolio is up 4%. 'You said 25%. What happened to the rest?' Your manager has asked you to join the call.", "compliance", [
    ch("best", "Tell the truth: say what you recall, accept that the wording left a wrong impression, apologise, and agree that your manager and Compliance will handle it from here.", "Own it, and let the process take over. Do not try to explain it away.", [
      "honesty gives the firm its best chance of a fair outcome",
      [["Today", "You say what you said, and what you should have said."], ["This week", "Compliance reviews the file and the call. The firm decides how to respond to her."], ["This month", "You are coached or disciplined as the facts require, but you were open. The client is treated fairly."]],
      [["Client", "good", "told the truth, and treated fairly"], ["Firm", "mixed", "a mistake owned"], ["You", "mixed", "a consequence, but you kept your integrity"]],
    ]),
    ch("partly", "Say you only meant it as an estimate, and she misunderstood.", "Blaming her understanding is rarely believed when she heard a number.", [
      "your estimate versus her memory",
      [["Today", "She does not accept this."], ["This week", "She asks for the notes and recordings of the first call."], ["This month", "If they show a number, you look as though you tried to talk your way out."]],
      [["Client", "bad", "angrier and unconvinced"], ["You", "bad", "your credibility is damaged"]],
    ]),
    ch("wrong", "Say she never mentioned 25%, and offer to move her into a riskier fund to catch up.", "Denying what happened and then taking more risk with her money makes everything worse.", [
      "a denial, and more risk to cover it up",
      [["Today", "She says she has an email proving it."], ["This week", "The email and the call notes show the number."], ["This month", "Suggesting a riskier fund to make up a shortfall you caused is a further conduct breach."]],
      [["Client", "bad", "more risk to cover your promise"], ["Firm", "bad", "a serious conduct breach"], ["You", "bad", "likely to end badly for you"]],
    ], { follow: [6, "⚠️", "The client has produced an email in which the 25% figure appears. Compliance wants to speak to you again.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- everything in one share */
  sit("w-r-concentration", ["wealth"], "Put 80% in one share", "A client's friend has told him a share is going to double. He wants 80% of his ₦40 million portfolio in it by Friday. 'It is my money,' he says.", "risk-awareness", [
    ch("best", "Explain concentration risk with his own numbers, agree a limit that fits his risk profile, offer a smaller position if he insists, and record the advice and his decision.", "It is his money, and your duty is to advise. A smaller position, with the advice recorded, respects both.", [
      "he keeps control, and takes a risk he understands",
      [["Today", "He sees what a 40% fall in one share would do to his plan. He chooses a 10% position."], ["This week", "Your note records the advice and his choice."], ["This month", "Whether the share rises or falls, he took a risk with his eyes open, and his plan survives."]],
      [["Client", "good", "a risk he understands and can afford"], ["Firm", "good", "advice and instruction both recorded"], ["You", "good", "a defensible file"]],
    ]),
    ch("partly", "Do it, because it is his money and his instruction.", "An instruction does not remove your duty to advise on suitability and concentration.", [
      "his instruction is followed, but you did not advise",
      [["Today", "80% goes into the share."], ["This week", "The share falls 30% on bad news."], ["This month", "He says he was never told what could happen. Your note says only 'client instruction'."]],
      [["Client", "bad", "a heavy loss"], ["Firm", "bad", "a suitability complaint"], ["You", "bad", "no advice on record"]],
    ]),
    ch("wrong", "Refuse to deal in that share at all.", "Refusing without explaining leaves him with nothing but a closed door, and he may simply go elsewhere.", [
      "he is turned away and does it elsewhere without advice",
      [["Today", "He leaves annoyed."], ["This week", "He buys the share through another broker, on his own."], ["This month", "If it falls, he loses with no advice; if it rises, you lost him."]],
      [["Client", "bad", "no advice, and no relationship"], ["Firm", "mixed", "a client lost"]],
    ]),
  ]),

  /* -------------------------------------------------- an inheritance in a hurry */
  sit("w-r-inheritance-rush", ["wealth"], "₦150 million inherited, and she wants it invested this week", "A woman in her forties has just inherited ₦150 million and is overwhelmed. 'Just invest it all this week, I do not want to think about it.'", "risk-awareness", [
    ch("best", "Be kind, suggest she parks it safely for a short while, then plan together: her goals, other income, debts, tax and a staged way in over a few months.", "A windfall is a moment for a plan, not a rush. Safe first, then staged.", [
      "the money is safe now, and a plan follows",
      [["Today", "The money goes somewhere safe and liquid while she takes a breath."], ["This week", "You map her goals and obligations and agree a staged plan."], ["This month", "The first part is invested on a plan she understands. She is grateful for not having been rushed."]],
      [["Client", "good", "calm, safe and in control"], ["Firm", "good", "a client who trusts the advice"], ["You", "good", "a relationship built on care"]],
    ]),
    ch("partly", "Put it all in a money market fund until she decides.", "Safe, but she has a plan to make, and 'until she decides' can drift for years.", [
      "safe, but there is no plan",
      [["Today", "The money is safe."], ["This week", "She does not return to the subject."], ["This month", "A year later, inflation has eaten into a pot that was meant to grow, and nobody planned it."]],
      [["Client", "mixed", "safe, but not working for her"], ["You", "mixed", "a plan that never happened"]],
    ]),
    ch("wrong", "Put it all into the product that pays you the highest commission this week.", "Putting your own reward ahead of her needs is the heart of a conflict of interest.", [
      "her windfall serves your commission, not her goals",
      [["Today", "She signs what you give her."], ["This week", "The product is illiquid and carries high charges."], ["This month", "A relative who is an accountant asks why she is locked in. The file shows no analysis of her needs."]],
      [["Client", "bad", "money tied up in the wrong place"], ["Firm", "bad", "a mis-selling complaint"], ["You", "bad", "a conflict of interest on the file"]],
    ], { follow: [7, "⚠️", "A client's accountant has asked the firm why a ₦150 million windfall was put into a high-charge, illiquid product within a week.", "bad"] }),
  ]),

  /* -------------------------------------------------- money needed soon */
  sit("w-r-school-fees-horizon", ["wealth"], "School fees in six months, money in shares", "A client needs ₦8 million for school fees in six months. It is currently in an equity fund, which is down 8% this month. He asks you: 'What should I do?'", "risk-awareness", [
    ch("best", "Explain that money needed in six months should not carry equity risk, move the amount he needs into a low-risk, liquid holding, and explain the cost of selling now versus the risk of waiting.", "Match the investment to the date. Six months is not long enough for an equity fund to be safe.", [
      "the fees are covered, whatever the market does",
      [["Today", "He sees why the fees money should be somewhere safe."], ["This week", "The ₦8 million moves to a low-risk holding."], ["This month", "The fees are paid on time. He is relieved he did not wait for a recovery."]],
      [["Client", "good", "the money will be there when he needs it"], ["Firm", "good", "advice that fits the goal"], ["You", "good", "you matched the risk to the date"]],
    ]),
    ch("partly", "Tell him to wait, because the fund usually recovers.", "It may. But he has a fixed date and cannot wait for 'usually'.", [
      "a hope against a deadline",
      [["Today", "He waits."], ["This week", "The fund falls another 5%."], ["This month", "He sells at a lower price to pay the fees, and a fixed deadline has cost him money."]],
      [["Client", "bad", "sells at a worse price"], ["You", "bad", "you advised hope, not a plan"]],
    ]),
    ch("wrong", "Suggest buying more of the equity fund to recover faster.", "Adding risk to money with a fixed date makes a shortfall more likely.", [
      "more risk on money he cannot afford to lose",
      [["Today", "He adds to the fund."], ["This week", "The fund falls again."], ["This month", "He cannot pay the full fees. He says he followed your suggestion."]],
      [["Client", "bad", "a shortfall on school fees"], ["Firm", "bad", "an unsuitable recommendation"], ["You", "bad", "your suggestion is quoted back"]],
    ], { follow: [6, "✉️", "A client who could not pay his children's school fees in full says he put more money into a falling fund on your suggestion.", "bad"] }),
  ]),

  /* -------------------------------------------------- how are you paid? */
  sit("w-r-fee-question", ["wealth"], "'How much do you earn from my account?'", "A client you have advised for two years asks, in front of his wife: 'How much do you actually get paid out of my portfolio? Be honest.'", "compliance", [
    ch("best", "Answer openly: explain the fees and any commission, show him the written schedule and what he gets for it, and offer to go through the numbers line by line.", "Transparency about fees builds trust. Hiding them loses it.", [
      "an open answer deepens trust",
      [["Today", "You show him the fee schedule and the commission, and what they pay for."], ["This week", "He asks one or two good questions and thanks you."], ["This month", "He recommends you to his brother. He says you were the first adviser who showed him the numbers."]],
      [["Client", "good", "knows what he pays, and why"], ["Firm", "good", "a transparent relationship"], ["You", "good", "trusted for being open"]],
    ]),
    ch("partly", "Say it is complicated, and change the subject.", "A client who asks a direct question about fees and is brushed off assumes the worst.", [
      "silence that sounds like hiding something",
      [["Today", "He lets it drop, but does not forget."], ["This week", "He asks another firm for a comparison."], ["This month", "The other firm shows him a fee table. He wonders why you did not."]],
      [["Client", "mixed", "wondering what you are hiding"], ["Firm", "mixed", "a relationship under strain"]],
    ]),
    ch("wrong", "Say you earn nothing extra from his account.", "If that is not true, it is a false statement, and a serious one.", [
      "a false statement about your own pay",
      [["Today", "He accepts it."], ["This week", "He sees a commission line on a statement."], ["This month", "A false answer about fees is a serious conduct matter, and he may say you misled him."]],
      [["Client", "bad", "told something untrue"], ["Firm", "bad", "a disclosure breach"], ["You", "bad", "a conduct investigation"]],
    ], { follow: [6, "⚠️", "A client has found a commission on his statement that you told him did not exist. Compliance would like to understand what was said.", "bad"] }),
  ]),

  /* -------------------------------------------------- she says she is aggressive, but she cannot sleep */
  sit("w-r-risk-mismatch", ["wealth"], "Her score says aggressive, but she cannot sleep", "Your risk questionnaire rates a client 'aggressive', but she tells you she lies awake when her portfolio falls 3%. A growth fund would suit the score.", "risk-awareness", [
    ch("best", "Discuss the mismatch with her, go through real examples of falls, agree a risk level she can live with, and record both her answers and the reasons for the final profile.", "A risk profile is a conversation. How she feels counts as much as a score.", [
      "the portfolio matches the person, not just the form",
      [["Today", "You talk through what a 20% fall would feel like. She chooses a moderate profile."], ["This week", "The portfolio is built to match. The file explains why it differs from the first score."], ["This month", "A bad month comes. She does not panic, because the portfolio fits her."]],
      [["Client", "good", "invested at a level she can live with"], ["Firm", "good", "a profile that can be defended"], ["You", "good", "you listened"]],
    ]),
    ch("partly", "Follow the score: it is the official record.", "A score should not override clear evidence about how she will actually behave.", [
      "the form wins over the person",
      [["Today", "She is put into a growth fund."], ["This week", "It falls 6%. She calls, upset."], ["This month", "She sells at a loss. The score said aggressive; her behaviour said otherwise."]],
      [["Client", "bad", "a loss in a fund she could not live with"], ["Firm", "mixed", "a profile that did not hold up"]],
    ]),
    ch("wrong", "Change her answers to match the profile you think is right, without telling her.", "Altering a client's answers is falsification. Never do it.", [
      "a client's own answers are altered",
      [["Today", "The form now says what you wanted."], ["This week", "A review compares the answers with her file notes."], ["This month", "Changing a client's answers is a serious integrity breach, and any sale based on them can be reversed."]],
      [["Client", "bad", "a profile she never gave"], ["Firm", "bad", "a falsified record"], ["You", "bad", "a serious conduct investigation"]],
    ], { follow: [6, "🚨", "A review has found that a client's risk questionnaire was changed after she completed it. The change was made on your login.", "bad"] }),
  ]),
];
