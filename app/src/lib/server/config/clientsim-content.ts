/** The starting client simulation. Cases are tagged with the units they are for. Admins can edit everything under Settings. All people and amounts are fictional. */
type Fx = Record<string, number>;
const c = (text: string, effects: Fx, feedback: string) => ({ text, effects, feedback });
const sc = (id: string, units: string[], title: string, story: string, choices: ReturnType<typeof c>[]) => ({ id, units, title, story, choices });

export const DEFAULT_CLIENTSIM = {
  settings: { rounds: 4, startMeter: 55, runsPerDay: 3, pointsGreat: 10, pointsGood: 6, pointsLearning: 2, greatAverage: 68, goodAverage: 56, floor: 35, leadershipRefreshDays: 180, successionMinTenure: 3 },
  meters: [
    { id: "trust", label: "Client trust", icon: "🤝" },
    { id: "compliance", label: "Compliance", icon: "🛡️" },
    { id: "revenue", label: "Revenue", icon: "💰" },
    { id: "risk", label: "Risk control", icon: "⚖️" },
  ],
  scenarios: [
    sc("cs-cx-delayed", ["cx"], "The client who has waited three days", "Mrs Bello says her redemption has not arrived after three days. She is calm but firm, and has told you she will take her money elsewhere.", [
      c("Apologise, check the status in front of her, tell her exactly when it will arrive, and call her yourself when it does.", { trust: 10, compliance: 3, revenue: 4, risk: 2 }, "Ownership and a clear next step win back trust."),
      c("Tell her the back office handles it and give her their number.", { trust: -8, compliance: 0, revenue: -4, risk: 0 }, "Passing her on breaks the ownership standard."),
      c("Promise it will be in her account by tomorrow so she calms down.", { trust: -4, compliance: -6, revenue: 0, risk: -10 }, "A promise you cannot control turns a delay into a broken promise."),
    ]),
    sc("cs-cx-kyc", ["cx"], "Documents that do not match", "A new client wants to open an account today, but the address on her utility bill differs from her form. She is in a hurry and says her last stockbroker never asked.", [
      c("Explain why the checks matter, help her fix the mismatch, and open the account once verified, even if it takes another day.", { trust: 4, compliance: 10, revenue: -2, risk: 8 }, "Know-your-customer checks protect the client and the firm."),
      c("Open it today and ask her to send the correct bill later.", { trust: 2, compliance: -12, revenue: 6, risk: -12 }, "Skipping verification exposes the firm to money laundering risk."),
      c("Refuse and tell her to come back with the right documents.", { trust: -6, compliance: 4, revenue: -4, risk: 2 }, "Correct, but unhelpful: guide her on what to bring."),
    ]),
    sc("cs-cx-complaint", ["cx"], "A complaint in writing", "A client emails a harsh complaint about a statement error and copies his lawyer.", [
      c("Acknowledge within 24 hours, escalate to the Head of Client Service, investigate and reply with a clear correction.", { trust: 8, compliance: 8, revenue: 2, risk: 6 }, "Complaints are handled within 24 hours and escalated."),
      c("Reply defensively to show the statement was right.", { trust: -10, compliance: -4, revenue: -2, risk: -6 }, "Arguing without checking inflames the situation."),
      c("Ignore it until the lawyer calls.", { trust: -12, compliance: -8, revenue: -4, risk: -10 }, "Ignoring a complaint is never acceptable."),
    ]),
    sc("cs-cx-upsell", ["cx"], "A product that does not fit", "Your target is close. A client who wants safe, short-term savings is a good fit for a higher-commission long-term product.", [
      c("Recommend the short-term product she asked for, and mention the other as an option for later.", { trust: 8, compliance: 8, revenue: 2, risk: 4 }, "Suitability comes before targets."),
      c("Push the long-term product: her needs may change.", { trust: -8, compliance: -10, revenue: 8, risk: -8 }, "Mis-selling harms the client and the firm."),
      c("Tell her both are the same and let her pick.", { trust: -6, compliance: -6, revenue: 2, risk: -4 }, "Misleading comparisons are a breach."),
    ]),
    sc("cs-wm-loss", ["wealth"], "A client sees a loss", "A cautious client has seen her portfolio fall 6% in a month and wants to sell everything.", [
      c("Review her goals and timeline, explain what happened, and agree whether her plan or her risk profile needs changing.", { trust: 9, compliance: 6, revenue: 3, risk: 6 }, "Calm, evidence-based advice beats panic or silence."),
      c("Sell everything at once as instructed, without discussion.", { trust: -2, compliance: -2, revenue: -6, risk: -4 }, "Following an instruction is allowed, but good advice means discussing it."),
      c("Tell her markets always recover and to wait.", { trust: -6, compliance: -6, revenue: 0, risk: -8 }, "Reassurance without analysis is not advice."),
    ]),
    sc("cs-wm-guarantee", ["wealth"], "Asked for a guarantee", "A high-net-worth client says she will move 200 million naira to you if you guarantee at least 25% a year.", [
      c("Decline the guarantee, explain the risks, and propose options that fit her goals and risk tolerance.", { trust: 6, compliance: 10, revenue: 0, risk: 8 }, "Never promise returns."),
      c("Give the guarantee verbally to win the account.", { trust: 2, compliance: -20, revenue: 10, risk: -14 }, "A promised return breaks the code of conduct."),
      c("Say 'it should be around that' without being specific.", { trust: -2, compliance: -10, revenue: 4, risk: -8 }, "A vague yes sounds like a promise."),
    ]),
    sc("cs-wm-life", ["wealth"], "A life change at the annual review", "A client mentions a new baby and a plan to buy a house within three years.", [
      c("Update her goals, build an emergency fund and a house-deposit plan on the right time horizon, and review protection.", { trust: 9, compliance: 4, revenue: 4, risk: 6 }, "Plans should follow life changes."),
      c("Keep her portfolio as it is: it is performing well.", { trust: -4, compliance: -2, revenue: 0, risk: -4 }, "Good performance does not cover new goals."),
      c("Put everything into equities to maximise growth for the house.", { trust: -6, compliance: -6, revenue: 4, risk: -12 }, "A three-year goal does not suit a growth-only portfolio."),
    ]),
    sc("cs-wm-gift", ["wealth"], "A gift from a client", "A grateful client offers you an expensive watch after a good year.", [
      c("Thank her warmly but decline, and tell compliance about the offer as the gifts policy requires.", { trust: 4, compliance: 10, revenue: 0, risk: 6 }, "Gifts must follow the policy and be disclosed."),
      c("Accept: it would be rude to refuse.", { trust: 0, compliance: -12, revenue: 0, risk: -8 }, "Accepting a valuable gift risks a conflict of interest."),
      c("Accept it but keep it quiet.", { trust: -2, compliance: -16, revenue: 0, risk: -10 }, "Hiding a gift is worse than accepting it."),
    ]),
    sc("cs-ia-tip", ["invest"], "A tip about an announcement", "A friend at a listed company says results will be much better than expected and hints you should buy before the announcement.", [
      c("Do not act or share it, and tell compliance about the tip.", { trust: 4, compliance: 12, revenue: 0, risk: 10 }, "Using inside information is illegal."),
      c("Buy a small amount for yourself only.", { trust: -4, compliance: -20, revenue: 2, risk: -16 }, "Trading on inside information is illegal at any size."),
      c("Recommend the stock to clients without saying why.", { trust: -8, compliance: -20, revenue: 6, risk: -16 }, "That is both insider dealing and misleading clients."),
    ]),
    sc("cs-ia-concentration", ["invest"], "Too much in one stock", "A client wants 80% of her portfolio in one fast-rising stock after a friend's recommendation.", [
      c("Explain concentration risk, agree a limit that fits her risk profile, and document the advice.", { trust: 6, compliance: 8, revenue: 2, risk: 8 }, "Diversification and documentation protect her and you."),
      c("Do it: it is her money and her instruction.", { trust: 0, compliance: -6, revenue: 6, risk: -10 }, "An instruction does not remove the duty to advise."),
      c("Refuse to deal in that stock at all.", { trust: -6, compliance: 2, revenue: -4, risk: 2 }, "Refusing without explaining does not help her."),
    ]),
    sc("cs-ia-research", ["invest"], "Pressure to change a rating", "A corporate client asks your analyst team to upgrade a stock before an offer to help sales.", [
      c("Keep the rating independent, record the request, and tell compliance.", { trust: 6, compliance: 12, revenue: -2, risk: 8 }, "Research independence must be protected."),
      c("Upgrade it quietly: the relationship matters.", { trust: -6, compliance: -20, revenue: 8, risk: -14 }, "That is a serious conflict of interest."),
      c("Delay the publication until after the offer.", { trust: -2, compliance: -8, revenue: 2, risk: -6 }, "Timing research to help a deal is a conflict too."),
    ]),
    sc("cs-ia-order", ["invest"], "A large order by phone", "A client phones with an urgent, large order. The line is not recorded.", [
      c("Use the recorded line or get written confirmation first, and log it.", { trust: 4, compliance: 10, revenue: 0, risk: 8 }, "Instructions must be traceable."),
      c("Execute now and write it up afterwards.", { trust: 0, compliance: -10, revenue: 4, risk: -10 }, "Untraceable orders cause disputes."),
      c("Tell him to send an email and take no action until he does, without saying why.", { trust: -4, compliance: 4, revenue: -2, risk: 2 }, "Right step, poor service: explain why."),
    ]),
    sc("cs-all-data", ["*"], "A request for another client's details", "A client asks for the contact details of another investor 'to do a deal together'.", [
      c("Politely decline, explain confidentiality, and offer to pass on a message.", { trust: 6, compliance: 10, revenue: 0, risk: 6 }, "Never share client information."),
      c("Give the number: they are both adults.", { trust: -6, compliance: -16, revenue: 2, risk: -10 }, "That is a confidentiality breach."),
      c("Say you cannot say whether that person is a client.", { trust: 2, compliance: 4, revenue: 0, risk: 2 }, "Close, but a clear, polite explanation is better."),
    ]),
    sc("cs-all-mistake", ["*"], "Your own mistake", "You discover you sent a client the wrong valuation last week. No one has noticed.", [
      c("Tell your manager and the client, send the correct one and note what you will change.", { trust: 8, compliance: 8, revenue: 0, risk: 8 }, "Owning a mistake early builds trust."),
      c("Quietly send the correct one and say nothing.", { trust: -4, compliance: -8, revenue: 0, risk: -6 }, "Hiding it means nobody can fix the cause."),
      c("Leave it: the figures were close.", { trust: -8, compliance: -12, revenue: 0, risk: -12 }, "A wrong figure is still wrong."),
    ]),
  ],
};
