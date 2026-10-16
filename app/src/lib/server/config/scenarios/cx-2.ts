import { ch, sit } from "../scenario-kit";

/** Customer Experience, batch 2: data, documents, records and honesty. Drafts for Compliance review. */
export const CX_2 = [
  /* -------------------------------------------------- a client asks for everything you hold about him */
  sit("cx-r-data-request", ["cx"], "He wants a copy of all the data you hold", "A client writes: 'Under the data protection law, send me everything you hold about me.' Your colleague says it is a nuisance request and you should 'lose it in the system'.", "compliance", [
    ch("best", "Log it as a data subject request, tell the client it has been received, pass it to the Data Protection Officer straight away and keep the paper trail.", "A request for personal data is a legal right. It goes to the Data Protection Officer, promptly and on the record.", [
      "the request is handled properly, on time and on record",
      [["Today", "You log the request, tell him it is in hand, and pass it on with the date it was received."], ["This week", "The Data Protection Officer checks his identity and gathers what is held."], ["This month", "He receives his information in good time. The firm can show it followed the process."]],
      [["Client", "good", "his right is respected"], ["Firm", "good", "a lawful, documented response"], ["You", "good", "you protected yourself and the firm"]],
    ]),
    ch("partly", "Reply that you will look into it, and mention it to your manager when you next see them.", "Good intent, but the request has no log and no owner, and the clock for answering it is running.", [
      "the request exists, but nobody owns it",
      [["Today", "Nothing is logged. The days start counting."], ["This week", "Your manager is busy and the request waits."], ["This month", "The client chases. By then the deadline for answering is close or missed."]],
      [["Client", "mixed", "waiting without an answer"], ["Firm", "bad", "a risk of missing a legal deadline"]],
    ], { next: "cx-r-regulator-query" }),
    ch("wrong", "Ignore it: the request is a nuisance and he will probably forget.", "A data request cannot be ignored. Doing so can become a regulatory complaint.", [
      "a legal right is ignored, and the client takes it further",
      [["Today", "Nothing happens."], ["This week", "He writes again, and says he will complain to the data protection regulator."], ["This month", "The regulator asks the firm to explain. It finds the first request was received and never acted on."]],
      [["Client", "bad", "ignored on a matter of right"], ["Firm", "bad", "a regulatory complaint and possible action"], ["You", "bad", "your handling will be examined"]],
    ], { next: "cx-r-regulator-query", follow: [7, "⚠️", "A client has told the firm he will complain to the data protection regulator about an earlier request that was never answered.", "bad"] }),
  ]),
  sit("cx-r-regulator-query", ["cx"], "The regulator has written to ask why", "A letter from the data protection regulator reaches the firm. It asks why a client's request for his data was not answered. Your name appears in the first email he sent.", "compliance", [
    ch("best", "Tell your manager and the Data Protection Officer at once, give them the dates and the facts without softening, and help prepare an honest reply.", "Be open and quick. The firm can only answer honestly if it knows exactly what happened.", [
      "the firm replies honestly, with the facts, and puts it right",
      [["Today", "The Data Protection Officer has the full timeline from you the same day."], ["This week", "The client receives his data with an apology, and the firm replies to the regulator with what went wrong and what it has changed."], ["This month", "The matter closes with a lesson learned. Honesty and a quick fix count in the firm's favour."]],
      [["Client", "good", "finally gets his data"], ["Firm", "good", "an honest answer and a fix"], ["You", "mixed", "you will be coached, but trusted for being open"]],
    ]),
    ch("partly", "Say you were busy, and ask your manager to deal with it.", "Passing it up is right, but without the facts nobody can answer properly.", [
      "the letter is passed up, but the facts are not",
      [["Today", "The manager receives the letter and a vague explanation."], ["This week", "Compliance has to reconstruct what happened."], ["This month", "The reply is slower and less convincing."]],
      [["Firm", "mixed", "a weaker reply because of missing detail"], ["You", "mixed", "seen as passing the problem on"]],
    ]),
    ch("wrong", "Quietly send the client his data now, and hope the regulator does not notice the delay.", "Fixing the problem is good, but hiding that it was late is not. The firm must be told.", [
      "the late answer is hidden, which makes the whole matter worse",
      [["Today", "The client gets his data."], ["This week", "The regulator's letter is answered without the full story."], ["This month", "When the timeline comes out, the firm looks as if it concealed the delay."]],
      [["Client", "mixed", "has his data, late"], ["Firm", "bad", "an incomplete answer to a regulator"], ["You", "bad", "a conduct issue on top of the delay"]],
    ]),
  ], { chain: true }),

  /* -------------------------------------------------- a child's account */
  sit("cx-r-minor-account", ["cx"], "A mother opens an account for her son", "A mother wants to open an investment account for her ten-year-old son with ₦300,000 from his grandfather. She has her own ID but not his birth certificate, and says the child is 'only a name on the form'.", "compliance", [
    ch("best", "Explain that an account for a minor needs the child's documents and the guardian's, take what she has, tell her exactly what is still needed and when the account can open.", "A child's account needs the child's identity. Say clearly what is missing and keep the door open.", [
      "the account opens properly once the documents are complete",
      [["Today", "She leaves with a short list of what to bring."], ["This week", "She returns with the birth certificate. The account opens with the right records."], ["This month", "The child's savings are safe and correctly owned, and she tells the grandfather the firm was careful."]],
      [["Client", "good", "an account correctly in the child's name"], ["Firm", "good", "complete records"], ["You", "good", "helpful and compliant"]],
    ]),
    ch("partly", "Open it in her name for now and move it to his name later.", "Easier today, but it is not the account she asked for, and moving it later can bring tax and ownership problems.", [
      "an account in the wrong name, to be fixed later",
      [["Today", "The account opens in the mother's name."], ["This week", "She assumes it is the child's."], ["This month", "When it is moved, ownership, records and any tax treatment have to be put right, and she is confused."]],
      [["Client", "mixed", "an account that is not what she thought"], ["Firm", "mixed", "records that need correcting"]],
    ]),
    ch("wrong", "Open it in the child's name without the birth certificate: it is only a name on the form.", "Opening an account without verifying identity breaks the know-your-customer rule, even for a child.", [
      "an account is opened without proper identity checks",
      [["Today", "The account opens, and the money arrives."], ["This week", "A file review finds no identity document for the child."], ["This month", "The account is restricted until the documents are provided, and the review lists it as a verification failure."]],
      [["Client", "bad", "money tied up and an annoyed parent"], ["Firm", "bad", "a know-your-customer gap"], ["You", "bad", "a finding against your file"]],
    ], { follow: [7, "⚠️", "A file review has found an account opened without identity documents for the account holder. It was opened on your desk.", "bad"] }),
  ]),

  /* -------------------------------------------------- an instruction nobody wrote down */
  sit("cx-r-call-not-logged", ["cx"], "He says he gave an instruction you did not log", "A client calls: 'On Tuesday I told you to sell half of my units. Why have you not done it?' You remember a call on Tuesday, but you did not write anything down and the system shows no instruction.", "compliance", [
    ch("best", "Do not guess or argue. Tell him you will check the call recording and records, and come back to him the same day. Escalate to your manager and Compliance if the recording shows he did give an instruction.", "Records settle disputes, not memory. Check first, and tell the truth either way.", [
      "the facts are checked and the dispute is settled honestly",
      [["Today", "You promise a same-day answer and listen to the recording."], ["This week", "If he did give the instruction, the firm owns the error and decides how to put it right; if not, you show him the record kindly."], ["This month", "Either way he sees a firm that checks. The gap in your note-taking is closed."]],
      [["Client", "good", "treated fairly, with evidence"], ["Firm", "good", "a dispute handled by the book"], ["You", "mixed", "you learn to log every call"]],
    ]),
    ch("partly", "Tell him you will place the order now to keep him happy, and sort out the paperwork later.", "Acting on a disputed, unrecorded instruction can cause a loss for him or for the firm, if the price has moved.", [
      "the order is placed on an instruction nobody can prove",
      [["Today", "The order goes in at today's price."], ["This week", "If the price has fallen since Tuesday, he blames the delay. If it has risen, he says it was your fault he did not sell earlier."], ["This month", "With no proof, the firm cannot show whether it was his instruction or yours."]],
      [["Client", "mixed", "an order he disputes whatever happens"], ["Firm", "bad", "a trade with no clear instruction"]],
    ], { next: "cx-r-disputed-instruction" }),
    ch("wrong", "Tell him you never had that call, to avoid blame.", "If you did take the call, denying it is untrue, and recordings often exist.", [
      "a denial that the recording can disprove",
      [["Today", "He says he is sure, and asks for the recording."], ["This week", "The recording shows the instruction was given."], ["This month", "The firm must put right the loss, and you are asked why you denied the call."]],
      [["Client", "bad", "a loss and a denial"], ["Firm", "bad", "compensation and a conduct concern"], ["You", "bad", "a finding about honesty"]],
    ], { next: "cx-r-disputed-instruction", follow: [6, "🎧", "A client has asked for the recording of his call with you. Compliance would like to listen to it first.", "bad"] }),
  ]),
  sit("cx-r-disputed-instruction", ["cx"], "The recording is being played", "The client's complaint now includes a request for the call recording. Compliance is listening to it, and your manager asks you what you remember.", "compliance", [
    ch("best", "Tell them exactly what you remember, including that you did not log the call, and what you would do differently next time.", "Honesty now protects your credibility. Everything is about to be on tape anyway.", [
      "your honesty helps the firm put things right quickly",
      [["Today", "You describe the call and admit the missing note."], ["This week", "The recording confirms your account. The firm settles the loss and apologises."], ["This month", "You are coached on call notes. Your openness is remembered in your favour."]],
      [["Client", "good", "compensated and respected"], ["Firm", "good", "a clean, quick resolution"], ["You", "mixed", "a coaching conversation, not a disciplinary one"]],
    ]),
    ch("partly", "Say you cannot remember the details.", "That may be true, but it gives the firm nothing to work with, and it sounds like avoiding the question.", [
      "the firm relies on the recording alone",
      [["Today", "Your answer adds nothing."], ["This week", "The recording decides it."], ["This month", "Your manager notes that you were not forthcoming."]],
      [["Firm", "mixed", "a resolution, but slower"], ["You", "mixed", "you missed a chance to build trust"]],
    ]),
    ch("wrong", "Say the client changed his mind after the call and is now blaming you.", "Inventing a different story that the recording can contradict turns a mistake into a lie.", [
      "a mistake becomes a lie",
      [["Today", "Your account is written down."], ["This week", "The recording contradicts it."], ["This month", "A mistake about note-taking becomes an investigation about honesty."]],
      [["Client", "bad", "now sure he was treated unfairly"], ["Firm", "bad", "a conduct investigation"], ["You", "bad", "a serious finding"]],
    ], { follow: [6, "🚨", "Compliance has asked to speak to you today about what you said regarding a client's call, which does not match the recording.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- he did not understand the fees */
  sit("cx-r-language-fees", ["cx"], "He agreed, but did he understand?", "A client who speaks mostly Yoruba nods through your English explanation of the fees and signs the form. A few minutes later he asks his son, in Yoruba, 'Is it free?' You speak Yoruba too.", "communication", [
    ch("best", "Pause, offer to explain again in Yoruba, go through the fees one by one, and let him decide with his son, even if it takes longer.", "Consent only counts if he understands. Switch language and check.", [
      "he understands what he is paying, and chooses knowingly",
      [["Today", "You explain in Yoruba. He is surprised by two of the charges and asks questions."], ["This week", "He goes ahead, knowing the costs, with a copy to read at home."], ["This month", "He has no surprises on his statement, and brings his sister."]],
      [["Client", "good", "informed and in control"], ["Firm", "good", "a fair, defensible sale"], ["You", "good", "you spotted that he had not understood"]],
    ]),
    ch("partly", "Tell his son quickly in English that there are some small charges.", "The son helps, but 'some small charges' is not an explanation, and the client is still left out.", [
      "he is told something, but not enough",
      [["Today", "He signs after a brief reassurance."], ["This week", "The first statement shows charges he did not expect."], ["This month", "He complains that he was not told clearly."]],
      [["Client", "mixed", "surprised by charges"], ["Firm", "mixed", "a complaint about disclosure"]],
    ]),
    ch("wrong", "Let it go: he signed, so he agreed.", "A signature on something he did not understand is not informed consent.", [
      "a signature, but no understanding",
      [["Today", "The account opens."], ["This week", "The statement shows charges he did not expect."], ["This month", "He says he was never told. The firm has to show how it explained the fees, and the file has nothing to show."]],
      [["Client", "bad", "feels misled"], ["Firm", "bad", "a disclosure complaint it may lose"], ["You", "bad", "you knew he had not understood"]],
    ], { follow: [6, "✉️", "A client who signed up last week says nobody told him about the fees. His son wrote on his behalf.", "bad"] }),
  ]),

  /* -------------------------------------------------- a gift for good service */
  sit("cx-r-gift-service", ["cx"], "A gift for being quick", "A grateful client leaves a gift bag with a branded watch on your desk: 'For fast service. Please look after my orders first next time.'", "compliance", [
    ch("best", "Thank him warmly, return the gift, explain the gifts policy, record the offer with Compliance and promise the same service to everyone.", "The gift comes with a request for priority, which makes it a conflict of interest. Return it and disclose.", [
      "the gift is returned and recorded, and your integrity is intact",
      [["Today", "You hand it back kindly and say why. He is surprised, but respects it."], ["This week", "Compliance records the offer. Nothing is held against you."], ["This month", "He keeps using the firm, and trusts that nobody can buy a place in the queue."]],
      [["Client", "good", "treated fairly, like everyone else"], ["Firm", "good", "a clear conflict-of-interest record"], ["You", "good", "disclosed and safe"]],
    ]),
    ch("partly", "Keep it, but tell him you will not give him priority.", "You may mean it, but accepting the gift still creates a conflict and an appearance of one.", [
      "the gift stays, and so does the appearance of a favour",
      [["Today", "You say no to the priority but accept the watch."], ["This week", "A colleague sees the watch and asks about it."], ["This month", "If a complaint ever alleges favouritism, the watch is Exhibit A."]],
      [["Client", "mixed", "may still expect more"], ["Firm", "bad", "an undisclosed gift"], ["You", "bad", "a conflict you did not report"]],
    ]),
    ch("wrong", "Accept the gift and quietly move his orders to the front.", "You are now giving him an advantage that other clients do not get, in return for a gift.", [
      "a gift in exchange for priority",
      [["Today", "The watch is yours, and his orders go first."], ["This week", "Another client, whose order was delayed by his, complains."], ["This month", "Order records show the pattern. Taking gifts in return for priority is a serious conduct breach."]],
      [["Client", "bad", "other clients are disadvantaged"], ["Firm", "bad", "unfair treatment and a conflict"], ["You", "bad", "an investigation"]],
    ], { follow: [6, "🚨", "A client has complained that their order was delayed behind another client's. Compliance is looking at the order records on your desk.", "bad"] }),
  ]),

  /* -------------------------------------------------- the platform is down */
  sit("cx-r-outage-honest", ["cx"], "The platform is down at the busiest hour", "The trading platform has been down for forty minutes. Clients are calling and some are angry. Your manager says: 'Tell them it is just a small delay.'", "communication", [
    ch("best", "Tell clients plainly that there is a system problem, that you do not yet know when it will be fixed, what the fallback is, and when you will update them next.", "Honest, specific and regular: clients forgive a fault, not being misled.", [
      "clients know where they stand, and trust holds",
      [["Today", "Callers hear the truth, the fallback route, and a time for the next update."], ["This week", "Complaints about the outage are fewer than expected, because people were told what was happening."], ["This month", "Clients remember the firm that told them straight."]],
      [["Client", "good", "informed and able to choose"], ["Firm", "good", "outage handled honestly"], ["You", "good", "people trust what you say"]],
    ]),
    ch("partly", "Say there is a technical issue and it will be fixed soon.", "It is true, but 'soon' is a guess, and clients cannot plan around it.", [
      "true, but too vague to help",
      [["Today", "Callers are calmed for a moment."], ["This week", "The fix takes longer than 'soon'. People call again."], ["This month", "Some remember that they were told 'soon' three times."]],
      [["Client", "mixed", "waiting without a plan"], ["Firm", "mixed", "more calls than needed"]],
    ]),
    ch("wrong", "Tell them it is just a small delay, as your manager said.", "If the outage is serious, calling it small can hurt clients who needed to act.", [
      "clients are told it is nothing, while real orders are missed",
      [["Today", "Some clients wait instead of using the fallback route."], ["This week", "A client who missed an order because of it says he was told it was nothing."], ["This month", "The firm has to review who was affected and may have to put losses right."]],
      [["Client", "bad", "a missed order after reassurance"], ["Firm", "bad", "possible compensation"], ["You", "bad", "your words are quoted"]],
    ], { follow: [6, "⚠️", "A client who lost out during the outage says he was told it was only a small delay. The firm is reviewing what was said.", "bad"] }),
  ]),

  /* -------------------------------------------------- a relative with a letter */
  sit("cx-r-relative-withdrawal", ["cx"], "A nephew arrives with a letter", "A young man arrives with a handwritten letter, supposedly from his aunt, asking you to pay out ₦2,000,000 to him. He says she is ill. Her signature looks right.", "compliance", [
    ch("best", "Be sympathetic, explain you cannot act on a letter alone, contact the client on her registered number, and offer the proper route for a withdrawal by an authorised person.", "A letter from a third party is not an instruction. Verify with the account holder through a registered contact.", [
      "the client's money is protected, whichever way it turns out",
      [["Today", "You call her registered number. If she confirms, you take her through the proper authority process; if not, you have prevented a loss."], ["This week", "A properly authorised withdrawal is processed, or the matter is reported as a possible fraud."], ["This month", "The aunt's account is safe, and the family has seen that Meristem is careful."]],
      [["Client", "good", "her money moves only on her say-so"], ["Firm", "good", "a possible fraud stopped or a valid withdrawal handled"], ["You", "good", "you did the verification"]],
    ]),
    ch("partly", "Ask him to come back with a copy of her ID and process it then.", "Better than paying out, but an ID copy is not proof she wants it.", [
      "a barrier, but not the right one",
      [["Today", "He leaves."], ["This week", "He returns with a copy of an ID, which could belong to anyone."], ["This month", "If the withdrawal is made and she did not want it, a copy of her ID will not protect the firm."]],
      [["Client", "mixed", "still at risk"], ["Firm", "mixed", "an ID copy that proves little"]],
    ]),
    ch("wrong", "Pay him: the signature matches and he looks honest.", "A matching signature and an honest face are exactly what a skilled fraudster brings.", [
      "money leaves on the strength of a letter",
      [["Today", "₦2,000,000 is paid out."], ["This week", "The aunt, who was not ill, finds the withdrawal on her statement and has no idea what it is."], ["This month", "The money is gone, there is a fraud report, and the firm asks why no one called her."]],
      [["Client", "bad", "money lost and trust broken"], ["Firm", "bad", "a loss and a fraud investigation"], ["You", "bad", "you paid on a letter alone"]],
    ], { follow: [6, "🚨", "A client says she never asked for the withdrawal that was paid on a letter. The payment was approved on your desk.", "bad"] }),
  ]),

  /* -------------------------------------------------- a poor survey score */
  sit("cx-r-survey-low", ["cx"], "A one-star survey with a comment", "A client you served last week left a one-star rating and one line: 'She did not listen to me.' Your manager asks what you think happened.", "client-care", [
    ch("best", "Re-read your notes, call the client to apologise and ask what you missed, thank him, and write down what you will do differently.", "Feedback is a gift. Listening twice, once now, is what he asked for.", [
      "a one-star client becomes someone who feels heard",
      [["Today", "You call, apologise and ask what you missed. He tells you."], ["This week", "You fix what was missed and tell him."], ["This month", "He raises his rating on the next survey and says why."]],
      [["Client", "good", "listened to, at last"], ["Firm", "good", "a score and a relationship recovered"], ["You", "good", "learning from criticism"]],
    ]),
    ch("partly", "Tell your manager he was probably just having a bad day.", "He may have been, but you have not asked, and you have not listened.", [
      "possibly true, but nothing is learned",
      [["Today", "Your manager shrugs."], ["This week", "The client is not contacted."], ["This month", "The same comment appears again, from someone else."]],
      [["Client", "mixed", "still unheard"], ["You", "mixed", "a pattern you have not looked at"]],
    ]),
    ch("wrong", "Ask your manager to remove the score because it is unfair.", "Trying to remove criticism instead of learning from it hides the problem and your own record.", [
      "the score is the problem, not the cause",
      [["Today", "Your manager refuses, and asks why you tried."], ["This week", "Others hear about it."], ["This month", "Your credibility on feedback drops, and so does the client's trust."]],
      [["Client", "bad", "never contacted"], ["Firm", "mixed", "a team that learns less"], ["You", "bad", "seen as defensive"]],
    ]),
  ]),

  /* -------------------------------------------------- pay a third party */
  sit("cx-r-third-party", ["cx"], "Pay the proceeds to someone else", "A client asks for the proceeds of a sale to be paid into a company account she does not own, 'because it is easier for tax'. She is relaxed and friendly, and offers to wait while you process it.", "compliance", [
    ch("best", "Explain that payments go to an account in the client's own name, offer the options available, note the request and tell Compliance about a payment-to-third-party request that suggests tax avoidance.", "Payments to a third party, especially with a tax reason, are a classic red flag. Decline and escalate.", [
      "a red flag is stopped and recorded",
      [["Today", "You decline politely and offer her own account or a documented alternative."], ["This week", "Compliance reviews the request and, if needed, decides whether to report it."], ["This month", "Your note helps Compliance see whether the same pattern appears elsewhere."]],
      [["Client", "mixed", "turned down, but treated courteously"], ["Firm", "good", "a possible money-laundering risk caught"], ["You", "good", "you spotted it and escalated"]],
    ]),
    ch("partly", "Decline the request but say nothing to anyone else.", "You protected the transaction, but the pattern is not recorded.", [
      "the request is refused, but nobody else knows",
      [["Today", "You refuse."], ["This week", "She asks a colleague, who does not know and agrees."], ["This month", "The payment goes through at another desk, and your earlier refusal was never recorded."]],
      [["Firm", "bad", "a missed chance to spot a pattern"], ["You", "mixed", "right on the day, but you did not report it"]],
    ]),
    ch("wrong", "Process it: the client is regular and it is only a payment instruction.", "Paying a company that is not the client, for a tax reason, may be helping to hide something.", [
      "a payment is made that may help hide the source or owner of funds",
      [["Today", "The money is paid to the company's account."], ["This week", "Monitoring flags a payment to an unrelated company."], ["This month", "A review asks why the payment was made. Where money-laundering is suspected, the firm can have a duty to report it, and not escalating it makes it worse."]],
      [["Client", "mixed", "gets what she asked for, now under review"], ["Firm", "bad", "a possible money-laundering failure"], ["You", "bad", "you processed the payment"]],
    ], { follow: [7, "🚨", "A payment you processed to an unrelated company has been flagged by monitoring. Compliance needs your account of why.", "bad"] }),
  ]),
];
