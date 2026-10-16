import { ch, sit } from "../scenario-kit";

/** Customer Experience, batch 1: everyday service situations with real consequences. Drafts for Compliance review. */
export const CX_1 = [
  /* -------------------------------------------------- a wrong balance, denied or put right */
  sit("cx-r-statement-wrong", ["cx"], "The balance on his statement looks wrong", "A client phones, polite but worried. His statement shows 500 fewer units than he bought last month. On your screen you can see a posting adjustment from Operations that has not completed yet.", "client-care", [
    ch("best", "Take his details, check the history, tell him honestly what you can see, raise it with Operations under a reference number and agree when you will call back.", "Honest, specific and owned: he knows what happens next and when.", [
      "the problem is traced and put right, and the client trusts you more",
      [["Today", "You log it with a reference number and tell him exactly when he will hear back. He ends the call reassured."], ["This week", "Operations confirms a posting delay. The statement is corrected and he receives it with a short apology."], ["This month", "A client who has seen a problem fixed properly tends to call you first next time, and to stay."]],
      [["Client", "good", "feels informed and looked after"], ["Firm", "good", "an error found and fixed before it became a complaint"], ["You", "good", "a clean record of what you did"]],
    ]),
    ch("partly", "Tell him it is probably just a delay and the statement will correct itself.", "Probably right, but he has no reference and no date, so he has to chase.", [
      "the problem may be fixed, but he is left guessing",
      [["Today", "He accepts your word but has nothing in writing and no date."], ["This week", "The correction arrives late. He calls twice more to ask where it is."], ["This month", "He feels he had to chase. A small error has turned into a small trust problem."]],
      [["Client", "mixed", "relieved at first, then irritated"], ["You", "mixed", "extra calls that a reference number would have avoided"]],
    ]),
    ch("wrong", "Tell him the statement is system-generated, so it must be right.", "A real error was denied. Never assume the system is right without checking.", [
      "a real error is denied, and the client escalates",
      [["Today", "He ends the call angry. The error is still on his statement."], ["This week", "He finds the posting notice himself and writes to the Head of Client Service, quoting what you told him."], ["This month", "The complaint must be answered formally, and a denial on the call history makes it harder to defend."]],
      [["Client", "bad", "feels dismissed about his own money"], ["Firm", "bad", "a formal complaint about an error it could have admitted"], ["You", "bad", "your words are quoted back to your manager"]],
    ], { next: "cx-r-statement-escalated", follow: [6, "✉️", "A client has written to the Head of Client Service about his statement, quoting what he was told on the phone: that the system 'must be right'.", "bad"] }),
  ]),
  sit("cx-r-statement-escalated", ["cx"], "He has written in, and quoted you", "The client has emailed the Head of Client Service, copying your manager. He says you told him the system must be right, and he has found the adjustment notice that proves it was not.", "client-care", [
    ch("best", "Acknowledge within 24 hours, apologise for what you said, confirm the correction date and offer a call with the Head of Client Service.", "Owning the mistake quickly takes the heat out of a complaint.", [
      "the complaint is closed early, and the client stays",
      [["Today", "Your acknowledgement reaches him within hours. It apologises plainly and says what will happen and when."], ["This week", "The statement is corrected. A call with the Head of Client Service lets him say what he needs to say."], ["This month", "The complaint closes without regulatory attention. He tells a colleague that Meristem put it right."]],
      [["Client", "good", "heard, and proven right"], ["Firm", "good", "a complaint handled within the standard time"], ["You", "good", "your manager sees you owned it"]],
    ]),
    ch("partly", "Forward his email to Operations and wait for them to reply.", "It is a start, but he has heard nothing from you, and the standard is to acknowledge within 24 hours.", [
      "the right people know, but the client hears nothing",
      [["Today", "Operations receives the email. Nobody writes back to the client."], ["This week", "He chases, and his second email is angrier than his first."], ["This month", "The complaint takes longer to close and counts against the 24-hour acknowledgement standard."]],
      [["Client", "bad", "feels ignored a second time"], ["Firm", "mixed", "the fix happens, but the complaint handling does not"]],
    ]),
    ch("wrong", "Reply that the call was not recorded so you cannot confirm what was said.", "Hiding behind a missing recording is not an answer, and it can look like an attempt to avoid blame.", [
      "the complaint becomes about honesty, not the statement",
      [["Today", "The client reads your reply as a denial, and forwards it to the Head of Client Service."], ["This week", "Call logs and notes show what was said. Your reply is compared with them."], ["This month", "Your manager has a conversation with you about integrity, and the client may take the complaint outside the firm."]],
      [["Client", "bad", "now sure he is being fobbed off"], ["Firm", "bad", "a complaint that could now reach a regulator"], ["You", "bad", "a conduct conversation, not just a service one"]],
    ], { follow: [7, "⚠️", "Your manager would like a word about your reply to the client who complained. It will be about honesty as well as service.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a caller who is not who they say */
  sit("cx-r-caller-email", ["cx"], "A caller wants the account email changed", "A man phones, sounds confident, and says he is a client. He wants the email address on the account changed today because 'I lost my old email'. He cannot answer two of your three security questions.", "compliance", [
    ch("best", "Politely explain that you cannot change it without verifying him, offer the branch route with ID or the registered-contact process, and note the attempt.", "Verification is the protection. A failed check on a request to change contact details is a warning sign.", [
      "the account is protected, and the attempt is on record",
      [["Today", "You decline kindly and note the attempt. If he is genuine, he now knows how to prove it."], ["This week", "If the caller was not the client, the real client's account was never touched."], ["This month", "Your note helps Compliance spot a pattern if the same number tries other accounts."]],
      [["Client", "good", "their account stays theirs"], ["Firm", "good", "a fraud attempt stopped at the first step"], ["You", "good", "followed the verification rule"]],
    ]),
    ch("partly", "Change the email but ask him to send ID by email afterwards.", "Verification comes before the change, not after. Once the email is changed, reset links go to him.", [
      "the door is opened first and checked later",
      [["Today", "The email is changed. A password reset can now go to the new address."], ["This week", "The ID that arrives does not match the client on file."], ["This month", "The account has to be locked and investigated. If money moved in between, the firm and the client are both hurt."]],
      [["Client", "bad", "a stranger may have had a way in"], ["Firm", "bad", "a verification failure on record"], ["You", "bad", "you made the change"]],
    ], { next: "cx-r-account-takeover" }),
    ch("wrong", "Change it: he sounds convincing and the real client would be annoyed if you refused.", "Sounding convincing is how fraud works. Convenience never outranks verification.", [
      "an account is handed to a stranger",
      [["Today", "The email is changed to his address and a reset is sent."], ["This week", "He logs in and requests a withdrawal to a new bank account."], ["This month", "The real client finds out. There is an investigation, a possible report to the authorities, and you are asked why a failed verification was ignored."]],
      [["Client", "bad", "money and trust lost"], ["Firm", "bad", "a fraud loss, possible reporting duties and reputational damage"], ["You", "bad", "a serious conduct review"]],
    ], { next: "cx-r-account-takeover", follow: [6, "🚨", "A client has reported that someone else changed the email on their account. The change was made on your login.", "bad"] }),
  ]),
  sit("cx-r-account-takeover", ["cx"], "The real client is on the phone", "The real client phones in a panic: he cannot log in, and a withdrawal request has appeared on his account that he did not make. The change of email was done on your login yesterday.", "compliance", [
    ch("best", "Stay calm, block further activity now, tell him what you know, escalate to Compliance and Information Security straight away and record every step.", "Containment first, honesty second, then the proper channel. Do not try to fix it quietly.", [
      "the damage is contained and the firm can act properly",
      [["Today", "The account is frozen before the withdrawal is paid. The client is told what happened and what you are doing."], ["This week", "Compliance and Information Security investigate. Your record of each step makes it clear what went wrong and when."], ["This month", "The client's money is safe. The gap in verification is closed for everyone."]],
      [["Client", "good", "money protected and kept informed"], ["Firm", "good", "an incident handled and reported properly"], ["You", "mixed", "you will be asked about yesterday, but you were open about it"]],
    ]),
    ch("partly", "Tell the client you will look into it and call him back, and tell your manager at the end of the day.", "You reacted, but a withdrawal is pending now. Minutes matter in fraud.", [
      "some of the damage is stopped, but late",
      [["Today", "The delay gives the withdrawal time to move forward."], ["This week", "Part of the money is recovered, part is not."], ["This month", "The client is told that the delay made a difference. The review looks at response time as well as the original mistake."]],
      [["Client", "bad", "some of his money at risk"], ["Firm", "bad", "slow incident response"], ["You", "bad", "a delay that mattered"]],
    ]),
    ch("wrong", "Reverse the email change yourself and say nothing, to avoid trouble.", "Fixing it quietly hides an incident the firm is obliged to know about.", [
      "an incident is hidden, which is worse than the incident",
      [["Today", "The email goes back. The withdrawal is still pending, because nobody stopped it."], ["This week", "The system logs show both changes under your login."], ["This month", "Hiding a security incident is treated far more seriously than the original mistake."]],
      [["Client", "bad", "money lost and nobody told him"], ["Firm", "bad", "an unreported incident"], ["You", "bad", "a conduct breach on top of a verification failure"]],
    ], { follow: [6, "🚨", "Information Security has asked why the same login changed an account email and then changed it back. They need a full account today.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a form that is not complete */
  sit("cx-r-dividend-mandate", ["cx"], "The dividend mandate has no signature", "A client hands in a dividend mandate form so that his dividends go to a new bank account. The account details are clear, but the signature box is empty and he says he is in a hurry.", "compliance", [
    ch("best", "Explain kindly that the mandate cannot be processed unsigned, offer a pen there and then, and check the signature against the one on file.", "An unsigned mandate is not an instruction. Fixing it on the spot costs a minute.", [
      "the instruction is valid, and the dividends go where he meant",
      [["Today", "He signs in front of you. You compare it with the signature on file and process the form."], ["This week", "The next dividend reaches his new account."], ["This month", "There is no dispute, because the instruction is clear and signed."]],
      [["Client", "good", "paid to the right account without fuss"], ["Firm", "good", "a valid mandate on file"], ["You", "good", "you protected him from a mistake"]],
    ]),
    ch("partly", "Process it and ask him to bring a signed copy next week.", "Helpful, but you have acted on an instruction that was not valid yet.", [
      "it works out, but the file was weak for a week",
      [["Today", "The mandate goes in as it is."], ["This week", "The signed copy arrives, as promised."], ["This month", "Nothing goes wrong this time, but a file with an unsigned mandate is a finding if it is reviewed."]],
      [["Client", "mixed", "served quickly"], ["Firm", "mixed", "a control exception that happened to be harmless"]],
    ]),
    ch("wrong", "Sign it for him: it is obviously his account and he is in a hurry.", "Signing for a client is forgery. Never do it, however obvious it seems.", [
      "a document is forged, and everything that follows is tainted",
      [["Today", "The form looks complete and is processed."], ["This week", "A routine check compares the signature with the one on file and finds a mismatch."], ["This month", "Signing for a client is treated as falsifying a record. It can end a career, and in some cases it must be reported outside the firm."]],
      [["Client", "bad", "an instruction he never signed"], ["Firm", "bad", "a forged document on file"], ["You", "bad", "a serious conduct investigation"]],
    ], { follow: [7, "🚨", "A routine check has found a mandate whose signature does not match the one on file. It was processed on your desk.", "bad"] }),
  ]),

  /* -------------------------------------------------- a client trusts you with his security */
  sit("cx-r-pin-shared", ["cx"], "An elderly client gives you his PIN", "An elderly client struggles with the app. He writes his password and token PIN on a slip of paper and gives it to you: 'Please just do it for me, I trust you.'", "compliance", [
    ch("best", "Thank him for his trust, hand the slip back, explain that nobody at Meristem will ever ask for it, and help him step by step on his own phone or arrange a supported session.", "Kindness without breaking the rule: his credentials stay his.", [
      "he learns to do it himself, and his account stays safe",
      [["Today", "You return the slip and walk him through each step. He is a little embarrassed, but grateful."], ["This week", "He uses the app on his own and tells his family it was easy."], ["This month", "He recommends Meristem to a friend because 'they were patient, and they did not take my password'."]],
      [["Client", "good", "safe, capable and respected"], ["Firm", "good", "a loyal client and a clean security record"], ["You", "good", "trust earned the right way"]],
    ]),
    ch("partly", "Keep the slip safe in your drawer and do the transactions for him.", "Meant kindly, but you now hold his credentials, and staff must never do that.", [
      "meant kindly, but it creates a risk for both of you",
      [["Today", "You do his transaction. The slip stays in your drawer."], ["This week", "A colleague sees the slip while you are away."], ["This month", "If anything ever goes wrong on that account, the slip points at you."]],
      [["Client", "mixed", "helped now, exposed later"], ["You", "bad", "holding a client's credentials"]],
    ]),
    ch("wrong", "Log in as him and do whatever he needs, saving everyone time.", "Logging in as a client is unauthorised access, even with his permission.", [
      "you act as the client, and there is no way to tell it was not him",
      [["Today", "It works, and he is delighted."], ["This week", "System logs show a login from the branch network under his name at a time he was in front of you."], ["This month", "Unauthorised access to a client account is a serious breach of both security and data-protection rules, whatever the intention."]],
      [["Client", "bad", "his account has been used without a proper record"], ["Firm", "bad", "a security and data-protection breach"], ["You", "bad", "a formal investigation"]],
    ], { follow: [6, "⚠️", "Information Security has noticed a login to a client account from the branch network. They would like to know who used it.", "bad"] }),
  ]),

  /* -------------------------------------------------- money sent to the wrong account */
  sit("cx-r-wrong-transfer", ["cx"], "He sent money to the wrong account number", "A client rings, breathless: he typed one wrong digit and sent ₦1,500,000 to the wrong account. He wants you to 'just reverse it now'.", "client-care", [
    ch("best", "Keep him calm, explain that Meristem cannot take money back from another account without a process, raise a recall request at once with the right team and the bank, give him a reference and tell him what to expect.", "Speed matters, but the way back is a formal recall, not a reversal on a phone call.", [
      "a recall starts within minutes, giving the best chance of getting it back",
      [["Today", "The recall request goes out with the details while the money is still traceable. He has a reference number."], ["This week", "The receiving bank contacts the account holder. Where the holder agrees, or the funds are still there, the money returns."], ["This month", "He gets his money, or a clear explanation of what happened. Either way, he was never left guessing."]],
      [["Client", "good", "has the best possible chance of recovery"], ["Firm", "good", "an error handled by the book"], ["You", "good", "fast, calm, accurate"]],
    ]),
    ch("partly", "Tell him you will pass it to the transfers team and they will call him tomorrow.", "Passing it on is right, but waiting a day loses time while the money may still be in the account.", [
      "the right team is told, but a day is lost",
      [["Today", "The request waits until tomorrow. The receiving account may be emptied meanwhile."], ["This week", "Recovery is harder and slower."], ["This month", "Part of the money may be lost, and the client remembers the 'tomorrow'."]],
      [["Client", "mixed", "feels the delay mattered"], ["Firm", "mixed", "a slower recall"]],
    ]),
    ch("wrong", "Tell him it is impossible to get the money back, and he should accept the loss.", "It is often possible to recover funds. Saying it is impossible gives up on his money.", [
      "a recoverable loss is written off",
      [["Today", "He hangs up in despair and does not follow it up."], ["This week", "The window to trace the money closes."], ["This month", "He later learns from his bank that a recall was possible. He complains."]],
      [["Client", "bad", "loses money he might have recovered"], ["Firm", "bad", "a complaint about poor advice"], ["You", "bad", "you gave up too soon"]],
    ], { next: "cx-r-recall-too-late" }),
  ]),
  sit("cx-r-recall-too-late", ["cx"], "He learned it could have been recalled", "The client calls back, now angry. His bank has told him a recall within the first day could have worked. He says you told him there was nothing to be done.", "client-care", [
    ch("best", "Apologise sincerely, raise the recall now anyway, tell him honestly that the chance is lower, and escalate his complaint to your manager with the call notes.", "Late is better than never, and honesty about the odds keeps his trust.", [
      "a poor start is turned into an honest effort",
      [["Today", "You apologise, start the recall and tell him the truth about the odds."], ["This week", "The receiving bank is slow, but part of the funds are recovered."], ["This month", "He is not happy, but he sees that Meristem tried and told him straight."]],
      [["Client", "mixed", "some money back, and respect for the honesty"], ["Firm", "mixed", "a complaint contained"], ["You", "mixed", "you owned your earlier answer"]],
    ]),
    ch("partly", "Tell him you are sorry and that it is now too late, and nothing more.", "An apology without action leaves him with nothing.", [
      "sympathy without effort",
      [["Today", "He ends the call unconvinced."], ["This week", "He writes a formal complaint."], ["This month", "The complaint finds that an earlier recall was not offered. The firm has to respond."]],
      [["Client", "bad", "feels brushed off again"], ["Firm", "bad", "a formal complaint"]],
    ]),
    ch("wrong", "Tell him you never said that, and the call must have been misunderstood.", "Denying what you said, when he is sure of it, damages trust and your own credibility.", [
      "the dispute turns into an argument about who said what",
      [["Today", "He says he will go to the Head of Client Service and the regulator."], ["This week", "Call records are checked."], ["This month", "If the call history supports him, the firm has lost the complaint and your credibility."]],
      [["Client", "bad", "angry and considering outside action"], ["Firm", "bad", "a complaint that may leave the firm"], ["You", "bad", "your account of the call is doubted"]],
    ], { follow: [6, "✉️", "The client has written to the Head of Client Service about the transfer and says he will go to the regulator if it is not resolved.", "bad"] }),
  ], { chain: true }),

  /* -------------------------------------------------- a threat to post online */
  sit("cx-r-social-threat", ["cx"], "He says he will post about it online", "A client who waited three weeks for a certificate says, loudly, in the lobby: 'I will put this on social media and tag everyone!' Other clients are listening.", "communication", [
    ch("best", "Lower your voice, invite him somewhere quiet, listen without interrupting, apologise for the wait, explain what you will do and by when, and follow up as promised.", "Listen, own it, give a date. Most clients who feel heard do not post.", [
      "the client is heard, the matter is fixed, and no post appears",
      [["Today", "In a quiet room he explains everything. You apologise and commit to a date."], ["This week", "The certificate arrives on the date you gave, and you call to check."], ["This month", "He mentions the experience to a friend, and says that it was handled well in the end."]],
      [["Client", "good", "heard and helped"], ["Firm", "good", "a public complaint avoided and a client kept"], ["You", "good", "calm under pressure"]],
    ]),
    ch("partly", "Apologise quickly in front of everyone and promise to 'sort it out' without a date.", "It helps a little, but a vague promise in public is easy to break.", [
      "he calms down, but the promise is empty",
      [["Today", "He quietens, though it is still in the lobby."], ["This week", "No date was given, so he calls twice more."], ["This month", "On the third call, he posts. The post says nothing was done."]],
      [["Client", "mixed", "heard, but not helped"], ["Firm", "mixed", "a public complaint, caused by a vague promise"]],
    ], { next: "cx-r-social-reply" }),
    ch("wrong", "Tell him calmly that threats will not get him served faster, and ask him to take a seat.", "He may have been rude, but you answered the threat, not the problem.", [
      "the problem is ignored, and the threat is carried out",
      [["Today", "He leaves, angrier than he came."], ["This week", "His post appears with a photo of the lobby and tags the firm."], ["This month", "The post is shared. The firm has to respond publicly, and the certificate is still not fixed."]],
      [["Client", "bad", "has gone public"], ["Firm", "bad", "a public complaint with the firm's name on it"], ["You", "bad", "your reply is quoted in the post"]],
    ], { next: "cx-r-social-reply", follow: [5, "📱", "A post about long waits at Meristem is spreading online. It mentions the lobby and includes a photo.", "bad"] }),
  ]),
  sit("cx-r-social-reply", ["cx"], "The post is online, and people are replying", "The client's post is up, with a photo of the lobby. A few people have commented. Your manager asks you to help prepare a reply, and an old colleague suggests: 'Just tell people he is lying.'", "communication", [
    ch("best", "Draft a short, calm public reply that apologises, offers a private channel, and does not argue. Fix his certificate privately and tell him once it is done.", "Never argue in public. Fix the problem, and invite him to continue privately.", [
      "the public reply shows care, and the private fix ends it",
      [["Today", "The firm replies once, politely, with a direct contact."], ["This week", "The certificate is delivered. He is told personally."], ["This month", "He adds a note that it was resolved. Other readers see a firm that listens."]],
      [["Client", "good", "problem solved and acknowledged"], ["Firm", "good", "a public complaint turned into a good example"], ["You", "good", "you helped the reply, and the fix"]],
    ]),
    ch("partly", "Say nothing publicly, and fix the certificate quietly.", "He is helped, but readers see no reply and assume none was given.", [
      "the client is helped, but the public record looks like silence",
      [["Today", "Nothing is posted."], ["This week", "He is helped, but the post stays up unchanged."], ["This month", "Readers who see only the post may think the firm did not care."]],
      [["Client", "good", "problem solved"], ["Firm", "mixed", "a complaint left looking unanswered"]],
    ]),
    ch("wrong", "Post a reply saying the client is exaggerating and the delay was his fault.", "Arguing in public rarely wins, and an unfair reply can make a small complaint a big story.", [
      "an argument in public, and a bigger story",
      [["Today", "The reply is posted. People react."], ["This week", "He answers with proof of the dates. Others join in."], ["This month", "The firm has to delete the reply and apologise. It becomes a case study in how not to respond."]],
      [["Client", "bad", "feels accused in public"], ["Firm", "bad", "reputational damage from the reply itself"], ["You", "bad", "your name is on a reply that went badly"]],
    ], { follow: [6, "⚠️", "Corporate Communications has asked who approved a public reply to a client's post. They would like a word.", "bad"] }),
  ], { chain: true }),
];
