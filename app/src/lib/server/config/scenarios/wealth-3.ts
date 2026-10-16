import { ch, sit } from "../scenario-kit";

/** Wealth Advisory, batch 3: requests that colleagues bring to the adviser (they arrive as visitors). Drafts for Compliance review. */
export const WEALTH_3 = [
  sit("w-i-pitch-numbers", ["wealth"], "A colleague wants to use numbers you cannot verify", "A colleague preparing a pitch asks you to quote a fund's '34% return last year' in your joint slide. He found the figure on a website, with no source.", "compliance", [
    ch("best", "Say you cannot use a number without a source, help find the verified performance from the fund's official factsheet, and use that, with the required risk warning.", "A pitch is only as honest as its numbers. Use the factsheet, not a rumour.", [
      "the pitch is accurate, and nobody has to retract anything",
      [["Today", "You find the factsheet figure and correct the slide, with the usual warning."], ["This week", "The client does not feel misled, and the pitch passes review."], ["This month", "The prospect becomes a client and trusts what you showed."]],
      [["Client", "good", "decides on correct information"], ["Firm", "good", "a pitch that survives checking"], ["Team", "good", "your colleague learns to check sources"]],
    ]),
    ch("partly", "Use it, but add 'approximate'.", "'Approximate' does not make an unverified number safe.", [
      "an unverified number with a soft word in front",
      [["Today", "The slide goes out."], ["This week", "A client quotes it back."], ["This month", "The true figure is lower. The word 'approximate' does not help."]],
      [["Client", "bad", "relied on a wrong figure"], ["Firm", "bad", "a misleading pitch"]],
    ]),
    ch("wrong", "Use it as it is: it is only a pitch, and everyone rounds up.", "A pitch is a representation to a client. Inflated numbers are misleading, however common.", [
      "an inflated figure reaches a client",
      [["Today", "The slide goes out with 34%."], ["This week", "The client invests partly because of it."], ["This month", "The real figure is 21%. He says he was misled, and the slide is the evidence."]],
      [["Client", "bad", "invested on a false number"], ["Firm", "bad", "a misleading communication"], ["You", "bad", "your name is on the slide"]],
    ], { follow: [6, "⚠️", "A client says a pitch showed a 34% return, but the official figure is much lower. The slide carries your name.", "bad"] }),
  ], { internal: true }),

  sit("w-i-estate-info", ["wealth"], "Trustees ask for a client's full details", "A colleague from the trustees team asks for a client's holdings and family information 'to prepare her estate plan'. The client has never mentioned the trustees' service.", "compliance", [
    ch("best", "Ask whether the client has consented, offer to ask her yourself and, with her agreement, introduce the trustees team and share what is needed.", "Information is shared for a purpose the client agreed to. Ask her first.", [
      "the client decides, and the information moves with her consent",
      [["Today", "You call the client, who is glad to be offered the service."], ["This week", "With her consent, a short introduction and the right details go across."], ["This month", "Her estate plan is made, and she thanks you for asking."]],
      [["Client", "good", "her information shared only with her say-so"], ["Firm", "good", "a lawful use of data and a cross-sell done properly"], ["Team", "good", "a new client for the trustees team"]],
    ]),
    ch("partly", "Give only her contact details, and let them call her.", "Contact details are still personal data, and she may not want to be called.", [
      "a small disclosure without consent",
      [["Today", "Her number goes to the trustees team."], ["This week", "A cold call surprises her."], ["This month", "She asks how they got her number."]],
      [["Client", "bad", "surprised by a call she did not expect"], ["You", "bad", "shared without her consent"]],
    ]),
    ch("wrong", "Send everything: they are colleagues in the same group.", "Being in the same group is not consent. The purpose matters, and the client never agreed.", [
      "personal data is shared across teams without a purpose she agreed to",
      [["Today", "Her full file goes across."], ["This week", "She finds out and complains."], ["This month", "A data-protection complaint follows, and the transfer is traced to you."]],
      [["Client", "bad", "her private details moved without her say-so"], ["Firm", "bad", "a data-protection breach"], ["You", "bad", "named in the complaint"]],
    ], { follow: [6, "⚠️", "A client has complained that her family and holdings details were passed to another team without her knowledge. The Data Protection Officer is looking into it.", "bad"] }),
  ], { internal: true }),

  sit("w-i-before-the-rating", ["wealth"], "Which clients hold this share? A rating is coming", "An analyst you know asks quietly: 'Which of your clients hold this share? I want to see who to warn before our rating is published next week.'", "compliance", [
    ch("best", "Decline, explain that a pending rating is sensitive and clients cannot be selectively warned, and mention the request to Compliance.", "Telling some clients about a rating before it is published is giving them an unfair advantage. The request itself should be reported.", [
      "no client gets an unfair edge, and the request is on record",
      [["Today", "You refuse and say why."], ["This week", "Compliance reviews the request and reminds the analyst of the rules."], ["This month", "The rating is published to everyone at once. No client can say they were disadvantaged."]],
      [["Client", "good", "all clients treated equally"], ["Firm", "good", "market conduct rules respected"], ["You", "good", "you protected the firm and yourself"]],
    ]),
    ch("partly", "Refuse, but warn a few of your best clients to 'keep an eye on it'.", "A hint to selected clients is selective disclosure, and it is the same thing.", [
      "no list given, but a hint passes the same information",
      [["Today", "Three clients are told to watch the share."], ["This week", "Two sell before the publication."], ["This month", "A review links their sales to your calls."]],
      [["Client", "mixed", "some advantaged, others not"], ["Firm", "bad", "selective disclosure"], ["You", "bad", "you tipped clients"]],
    ]),
    ch("wrong", "Give the list, and call your biggest holders yourself.", "Using unpublished information to help selected clients trade is market abuse.", [
      "unpublished information is used to help some clients trade",
      [["Today", "You share the list and call the clients."], ["This week", "Several sell ahead of the rating."], ["This month", "A regulator reviews trading before the announcement. The pattern points to you and the analyst."]],
      [["Client", "bad", "clients drawn into possible market abuse"], ["Firm", "bad", "a possible market-abuse investigation"], ["You", "bad", "a serious conduct and legal risk"]],
    ], { follow: [7, "🚨", "Trading in a share ahead of a rating announcement has been flagged for review. The clients who sold are all yours.", "bad"] }),
  ], { internal: true }),

  sit("w-i-marketing-wording", ["wealth"], "Marketing wants 'guaranteed' in the headline", "Someone from Marketing sends you a draft email: 'Guaranteed growth for your retirement. Join our fund today.' She asks you to approve it because you know the product.", "compliance", [
    ch("best", "Do not approve it. Explain that a fund cannot guarantee growth, suggest a compliant wording with a risk warning, and tell her it also needs Compliance's approval.", "Promotional wording must be fair and not misleading. 'Guaranteed' is a red flag.", [
      "the advert is honest before it reaches a client",
      [["Today", "You suggest wording that describes the fund fairly, with the risk warning."], ["This week", "Compliance approves the new version."], ["This month", "No client is misled, and no regulator query follows."]],
      [["Client", "good", "told the truth in the advert"], ["Firm", "good", "an approved, fair promotion"], ["Team", "good", "Marketing learns what to avoid"]],
    ]),
    ch("partly", "Approve it but suggest adding 'terms apply'.", "'Terms apply' does not remove a false promise.", [
      "the claim stays, with a disclaimer that does not fix it",
      [["Today", "The email goes out."], ["This week", "A client replies: 'Is it really guaranteed?'"], ["This month", "A complaint reaches Compliance, who ask who approved it."]],
      [["Client", "bad", "misled by the headline"], ["Firm", "bad", "a misleading promotion"], ["You", "bad", "you approved it"]],
    ]),
    ch("wrong", "Approve it: marketing knows what sells.", "Approving a misleading promotion because it will sell is a conduct failure.", [
      "a false promise goes to thousands of people",
      [["Today", "The email goes to the full list."], ["This week", "Several clients invest because of 'guaranteed'."], ["This month", "The regulator receives a complaint. Both the promotion and your approval are examined."]],
      [["Client", "bad", "invest because of a false promise"], ["Firm", "bad", "a misleading mass promotion"], ["You", "bad", "your approval is on record"]],
    ], { follow: [6, "🚨", "A complaint says a Meristem email promised 'guaranteed growth'. The email shows your approval.", "bad"] }),
  ], { internal: true }),

  sit("w-i-personal-trade", ["wealth"], "Can I buy this share before the client does?", "A fellow adviser says: 'A client of mine is about to place a large order for this share. If I buy a few thousand shares now, I can sell them to her order tomorrow at a profit.'", "compliance", [
    ch("best", "Tell him this is trading ahead of a client, which is not allowed, remind him of the personal-dealing rules and pre-clearance, and suggest he tells Compliance about the idea so it is on record that it was stopped.", "Using a client's order for your own gain is front-running. Stop it, and report it.", [
      "a serious breach is stopped before it happens",
      [["Today", "He stops, a little embarrassed."], ["This week", "Compliance, told by one of you, reminds the team of the rule."], ["This month", "Nothing goes wrong, and both of you are trusted for it."]],
      [["Client", "good", "her order is not exploited"], ["Firm", "good", "market integrity protected"], ["Team", "good", "a colleague stopped from a career-ending mistake"]],
    ]),
    ch("partly", "Say it sounds risky and you would not do it, then leave it there.", "Good instinct, but you knew of an intention to break the rules and told nobody.", [
      "you disapproved, but nobody was told",
      [["Today", "He says he will think about it."], ["This week", "He does it, since nobody stopped him."], ["This month", "Compliance finds it and asks who knew."]],
      [["Client", "bad", "her order was front-run"], ["Firm", "bad", "a breach that could have been prevented"], ["You", "bad", "you knew and said nothing"]],
    ]),
    ch("wrong", "Ask him to buy some for you too.", "You have joined in taking advantage of a client's order.", [
      "you join in front-running a client's order",
      [["Today", "Both of you buy ahead of her order."], ["This week", "Her order moves the price up, and you both sell at a profit."], ["This month", "Surveillance links your trades and hers. Front-running is a serious market offence."]],
      [["Client", "bad", "her order was used against her"], ["Firm", "bad", "a market-abuse case"], ["You", "bad", "a possible dismissal and legal action"]],
    ], { follow: [7, "🚨", "Trading surveillance has noticed personal trades placed just before a client's large order. The accounts are yours and a colleague's.", "bad"] }),
  ], { internal: true }),

  sit("w-i-junior-error", ["wealth"], "A junior colleague begs you not to report a mistake", "A junior colleague admits he bought the wrong fund for a client yesterday, and the price has already moved against her by ₦300,000. 'Please do not report me. I will fix it somehow.'", "compliance", [
    ch("best", "Be kind, but tell him this has to be reported and the client protected, go with him to your manager, and help him set out exactly what happened.", "A mistake reported quickly can be put right. Hiding one makes it a conduct problem, and the client's loss grows.", [
      "the client is protected, and the junior learns the right habit",
      [["Today", "You go together to your manager. The facts are clear."], ["This week", "The firm corrects the trade and covers the loss. The client is told."], ["This month", "The junior is coached, not punished. He remembers that you helped him do the right thing."]],
      [["Client", "good", "her loss is put right"], ["Firm", "good", "an error reported and fixed"], ["Team", "good", "a junior supported and taught"]],
    ]),
    ch("partly", "Tell him to report it himself and do not offer to go with him.", "Right, but he is frightened and may not do it.", [
      "the right advice, but he is left alone with it",
      [["Today", "He says he will report it."], ["This week", "He does not."], ["This month", "The loss grows. When it is found, you are asked whether you knew."]],
      [["Client", "bad", "a loss that keeps growing"], ["You", "mixed", "you advised right, but did not follow up"]],
    ]),
    ch("wrong", "Agree to say nothing, and help him trade out of it quietly.", "Quietly trading out of an error, without telling the client or the firm, hides a loss and risks making it worse.", [
      "a hidden error, and a second one on top",
      [["Today", "You help him trade out of the position."], ["This week", "The trades are matched to the original error."], ["This month", "Two people are now involved in hiding a loss from a client and the firm."]],
      [["Client", "bad", "a loss hidden from her"], ["Firm", "bad", "a concealed error"], ["You", "bad", "a conduct breach of your own"]],
    ], { follow: [6, "🚨", "A review has linked two trades in a client's account to a correction made outside the normal process. Both desks involved are being asked to explain.", "bad"] }),
  ], { internal: true }),
];
