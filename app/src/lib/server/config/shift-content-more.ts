/** More work-shift situations, added to the starting list. Admins can edit, add and remove them under Settings. All people and amounts are fictional. */
type V = "best" | "partly" | "wrong";
type Task = { id: string; units: string[]; title: string; story: string; skill?: string; choices: { text: string; verdict: V; feedback: string }[] };

const t = (id: string, units: string[], title: string, story: string, skill: string, c: [V, string, string][]): Task => ({ id, units, title, story, skill, choices: c.map(([verdict, text, feedback]) => ({ text, verdict, feedback })) });

export const MORE_SHIFT_TASKS: Task[] = [
  /* ---------------------------------- Customer Experience ---------------------------------- */
  t("cx-statement-request", ["cx"], "A statement request with no ID", "A caller asks you to email her account statement but cannot answer your security questions.", "compliance", [
    ["best", "Politely explain you must verify her first, offer the branch or the registered email route, and note the attempt.", "Verification protects the client from fraud."],
    ["partly", "Send it to the email on file and hope it is her.", "The registered email helps, but the checks come first."],
    ["wrong", "Send it to the new address she gives, to be helpful.", "Sending to an unverified address is a data breach waiting to happen."]]),
  t("cx-wrong-name", ["cx"], "The name on the account is wrong", "A client notices her surname is misspelt on every statement and says it has been like that for two years.", "client-care", [
    ["best", "Apologise, take her details, correct it through the proper change-of-details process and confirm when it is done.", "Own the fix and follow the controlled process."],
    ["partly", "Correct it in the system yourself right now.", "A direct edit without documents breaks the controls."],
    ["wrong", "Tell her it is a small thing and does not matter.", "Accurate records matter, and dismissing her breaks the standards."]]),
  t("cx-elderly-client", ["cx"], "An elderly client is confused", "An elderly client struggles with the mobile app and is close to tears at the desk.", "client-care", [
    ["best", "Slow down, sit with her, walk through one step at a time, and offer a printed guide and a follow-up call.", "Patience and a simple next step build loyalty."],
    ["partly", "Do the transaction for her on her phone.", "It solves today but she should not share her login."],
    ["wrong", "Tell her to ask her grandchildren.", "That is dismissive and risks losing her."]]),
  t("cx-angry-call", ["cx"], "Shouting on the phone", "A caller shouts that nobody has called him back in a week. He is right: your team missed the call.", "client-care", [
    ["best", "Let him finish, apologise for the missed call, fix the issue or give a firm time, and log the call.", "Listen, own it, act and log it."],
    ["partly", "Apologise but explain the team is very busy.", "Excuses weaken the apology."],
    ["wrong", "Say your tone is not acceptable and end the call.", "Never hang up on a caller."]]),
  t("cx-referral", ["cx"], "A happy client offers a referral", "A satisfied client says her brother wants to invest and asks you to call him.", "client-care", [
    ["best", "Thank her, ask her to share your details or ask permission to call, and follow the right onboarding.", "Referrals are earned by service; consent comes first."],
    ["partly", "Call the brother straight away with her number as proof.", "Get her permission and his before calling."],
    ["wrong", "Ignore it: referrals are a sales job.", "A referral is the best compliment and must be handled well."]]),
  t("cx-dividend-query", ["cx"], "Where is my dividend?", "A client asks why his dividend has not been paid, but the company has not yet paid.", "market-knowledge", [
    ["best", "Check the payment date, explain the process, and tell him when to expect it and whom to contact if it is late.", "A clear, informed answer saves a complaint."],
    ["partly", "Tell him to check back next week.", "Vague and unhelpful."],
    ["wrong", "Say it was probably paid and he missed it.", "Guessing misleads him."]]),
  t("cx-language-barrier", ["cx"], "A client who prefers Yoruba", "A client struggles to explain a problem in English but is relaxed in Yoruba. A colleague speaks it.", "communication", [
    ["best", "Ask her which language she prefers and bring in the colleague, keeping notes in English for the record.", "Meet clients in the language they are comfortable with."],
    ["partly", "Speak slowly and hope she follows.", "She may feel unheard."],
    ["wrong", "Ask her to bring someone who speaks English.", "That puts the burden on her."]]),
  t("cx-queue", ["cx"], "A long queue and one counter", "Eight people are waiting and you have one colleague on leave. A client at the front has a complex request.", "client-care", [
    ["best", "Greet the queue, give an honest wait time, offer a quick service point or a booked slot for the complex request, and offer water.", "Minimise the wait and keep people informed."],
    ["partly", "Rush the complex request to clear the queue.", "Speed without accuracy creates errors."],
    ["wrong", "Ignore the queue and finish the complex request.", "Delay is deadly."]]),
  t("cx-fake-sms", ["cx"], "A client received a suspicious SMS", "A client shows you an SMS that appears to come from Meristem asking for his PIN.", "compliance", [
    ["best", "Tell him never to share a PIN, record the details, report it to IT security and fraud, and advise him to change his credentials.", "Fraud awareness protects clients and the brand."],
    ["partly", "Tell him to delete it.", "It should also be reported."],
    ["wrong", "Ask him to forward it to you personally.", "Use the proper reporting channel."]]),
  t("cx-closing-time", ["cx"], "A client arrives at closing time", "It is two minutes to closing and a client arrives with a short, simple request.", "client-care", [
    ["best", "Welcome him, serve the request, and explain clearly what cannot be done today.", "Clients are the reason we are in business."],
    ["partly", "Ask him to come back tomorrow, politely.", "A short request could have been handled."],
    ["wrong", "Point at the clock and lock the door.", "Poor service."]]),
  t("cx-feedback-form", ["cx"], "Low rating on a feedback form", "A client leaves a low score and a short comment: 'Nobody explained the fees.'", "client-care", [
    ["best", "Thank him, call to explain the fees clearly, share a written breakdown, and tell your team the lesson.", "Turn feedback into a better explanation next time."],
    ["partly", "Reply that fees are in the contract.", "Technically true, but unhelpful."],
    ["wrong", "Delete the form as unfair.", "Hiding feedback hides the problem."]]),
  t("cx-vip-pressure", ["cx"], "A VIP wants to skip the process", "A well-known client asks to open an account without the usual documents because 'everyone knows me'.", "compliance", [
    ["best", "Treat him with respect and the same requirements as anyone else, offering to help collect the documents.", "No preferential treatment on compliance."],
    ["partly", "Open it and collect documents next week.", "Documents come first."],
    ["wrong", "Open it: refusing a famous client would be embarrassing.", "Rules apply to everyone."]]),
  t("cx-callback-promise", ["cx"], "You promised a call at 3 pm", "It is 2:50 pm and you are deep in a task. You promised a client a call at 3 pm.", "client-care", [
    ["best", "Pause, make the call on time, or tell him early if you need to move it.", "Keep promises or renegotiate early."],
    ["partly", "Call at 3:30 and apologise.", "A late call is better than none but the promise was broken."],
    ["wrong", "Skip it: he will call if it is urgent.", "Honesty in all dealings."]]),
  t("cx-new-product", ["cx"], "A client asks about a product you do not know", "A client asks about a new product launched last week. You have not read about it yet.", "market-knowledge", [
    ["best", "Say you will find out, get the correct details from the product team, and call him back the same day.", "Honesty and speed beat guessing."],
    ["partly", "Describe it from what you heard in the corridor.", "Corridor information is not reliable."],
    ["wrong", "Tell him it is probably not suitable for him.", "You cannot judge a product you do not know."]]),

  /* ---------------------------------- Wealth Advisory ---------------------------------- */
  t("wealth-inheritance", ["wealth"], "A client has just inherited money", "A client in her forties has inherited ₦150 million and wants to invest it all this week.", "risk-awareness", [
    ["best", "Express sympathy, suggest she takes a little time, then plan goals, risk, tax and a staged investment.", "Large windfalls need a plan, not a rush."],
    ["partly", "Put it all in a money market fund until she decides.", "Safe, but she needs an actual plan."],
    ["wrong", "Invest in the product with the highest commission.", "Her goals come first."]]),
  t("wealth-retirement-gap", ["wealth"], "A retirement shortfall", "A 52-year-old client's pension projection covers only half of the income he wants.", "market-knowledge", [
    ["best", "Show the gap, discuss saving more, working longer or adjusting spending, and build a staged plan with him.", "Show options and trade-offs honestly."],
    ["partly", "Tell him not to worry: markets will fix it.", "Hope is not a plan."],
    ["wrong", "Suggest a high-risk fund to close the gap fast.", "Risk should match capacity, not need."]]),
  t("wealth-divorce", ["wealth"], "A client is divorcing", "A client mentions she is divorcing and asks you to move assets to her sister's name.", "compliance", [
    ["best", "Decline to move assets in a way that may mislead others, suggest she takes legal advice, and record the request.", "Do not become part of asset concealment."],
    ["partly", "Move half now and the rest later.", "Still part of the same problem."],
    ["wrong", "Do it quickly before anyone notices.", "That could be assisting fraud."]]),
  t("wealth-fees-question", ["wealth"], "How much do you earn from me?", "A client directly asks how you are paid on his portfolio.", "compliance", [
    ["best", "Explain the fees and any commission openly and clearly, and show him the written schedule.", "Transparency about fees builds trust."],
    ["partly", "Say it is complicated and change the subject.", "Evasion damages trust."],
    ["wrong", "Say you earn nothing from his account.", "A false statement is a serious breach."]]),
  t("wealth-risk-quiz", ["wealth"], "A risk questionnaire that does not fit", "A client scores as 'aggressive' but says she cannot sleep when her investments fall.", "risk-awareness", [
    ["best", "Discuss the mismatch, revisit her answers with real examples, and set the profile on both her attitude and capacity.", "A profile is a conversation, not just a score."],
    ["partly", "Follow the score: it is the official record.", "A score should not override clear feelings."],
    ["wrong", "Change the answers to match her comments without telling her.", "Never alter her answers."]]),
  t("wealth-school-fees", ["wealth"], "School fees due in six months", "A client needs ₦8 million for school fees in six months and has it in an equity fund.", "market-knowledge", [
    ["best", "Move the near-term amount into a low-risk, liquid instrument and explain why the horizon matters.", "Match the instrument to the date."],
    ["partly", "Leave it: markets usually rise.", "A fixed date does not tolerate a fall."],
    ["wrong", "Buy more equity to grow it faster.", "That increases the risk of a shortfall."]]),
  t("wealth-family-office", ["wealth"], "A family disagreement over a portfolio", "Two siblings who co-own a portfolio give you opposite instructions.", "communication", [
    ["best", "Pause, explain you need joint instructions per the mandate, and arrange a meeting with both.", "Follow the mandate and keep both informed."],
    ["partly", "Follow the one who calls first.", "That is unfair and may breach the mandate."],
    ["wrong", "Follow the one who is more senior in the family.", "The mandate decides, not the family order."]]),
  t("wealth-currency", ["wealth"], "A client worried about the naira", "A client wants to move everything into dollars after reading alarming news.", "market-knowledge", [
    ["best", "Explain currency risk, diversification, costs and rules, and agree a measured allocation rather than all or nothing.", "Balanced advice beats fear."],
    ["partly", "Do it as instructed with no discussion.", "He deserves advice on the trade-offs."],
    ["wrong", "Tell him dollars are always the best.", "No asset is always best."]]),
  t("wealth-trust-idea", ["wealth"], "A client wants to protect her children", "A client with two young children asks how to ensure they are looked after if something happens to her.", "client-care", [
    ["best", "Introduce wills, a living trust and protection options, and involve the trustees team for next steps.", "Connect clients with the right service."],
    ["partly", "Tell her to talk to a lawyer.", "A lawyer helps but we have services too."],
    ["wrong", "Suggest she simply names a friend.", "That does not protect the children's interests."]]),
  t("wealth-review-meeting", ["wealth"], "A tough review meeting", "At a review the client's portfolio is down 4% and she is annoyed that you did not warn her.", "communication", [
    ["best", "Acknowledge her concern, show the market context and her plan, own what could have been communicated sooner, and agree how you will update her in future.", "Own the communication gap and show the plan."],
    ["partly", "Blame the market and show a chart.", "Facts help, but she needs empathy."],
    ["wrong", "Promise it will recover by year end.", "Never promise returns."]]),

  /* ---------------------------------- Investment Advisory ---------------------------------- */
  t("invest-chinese-wall", ["invest"], "A colleague from another team asks about a deal", "A friend in an advisory team asks which clients are in your research coverage universe before a launch.", "compliance", [
    ["best", "Decline politely, remind them of the information barrier, and tell compliance if pressed.", "Information barriers protect clients and the firm."],
    ["partly", "Say only the names that are already public.", "Even small hints can leak."],
    ["wrong", "Share the list: you are on the same team.", "Barriers apply inside the firm."]]),
  t("invest-late-report", ["invest"], "A report is late for the committee", "The investment committee meets in an hour and your valuation model has a formula you doubt.", "compliance", [
    ["best", "Check the formula, correct it, tell the chair if time is short, and note the issue.", "Accuracy before speed."],
    ["partly", "Send it and mark the formula as 'to be reviewed'.", "Doubtful numbers should not reach a committee."],
    ["wrong", "Send it and hope nobody checks.", "That is a serious breach."]]),
  t("invest-bond-yield", ["invest"], "A client asks why bond prices fell", "A client sees his bond fund drop after interest rates rose.", "market-knowledge", [
    ["best", "Explain the inverse link between yields and prices, the duration of the fund, and what the income still earns.", "Clear explanation reduces panic."],
    ["partly", "Say 'it is just the market'.", "Not an explanation."],
    ["wrong", "Tell him bonds cannot fall.", "False and damaging."]]),
  t("invest-ipo-allocation", ["invest"], "An oversubscribed offer", "A public offer is oversubscribed and your clients will get partial allocations. One VIP client asks for a bigger share.", "compliance", [
    ["best", "Follow the published allocation basis and treat clients equally and fairly.", "Fair allocation is a regulatory duty."],
    ["partly", "Give him a little extra from your own allocation.", "That still gives unfair treatment."],
    ["wrong", "Give him a larger share: he is a big client.", "Preferential allocation is a breach."]]),
  t("invest-margin-call", ["invest"], "A margin call", "A margin client's collateral value falls and he does not answer his phone.", "risk-awareness", [
    ["best", "Follow the margin agreement: try all contacts, send the written notice, and act within the terms if there is no response.", "Follow the agreement and keep records."],
    ["partly", "Wait a week hoping he calls.", "Risk grows while you wait."],
    ["wrong", "Sell some of his holdings without notice because you think it is wise.", "Act only as the agreement allows."]]),
  t("invest-stale-price", ["invest"], "A stale price", "You notice a security's price on your screen has not changed for two days while others have moved.", "market-knowledge", [
    ["best", "Check the market, flag the stale price to operations, and avoid using it for valuations until confirmed.", "Bad data creates bad decisions."],
    ["partly", "Use it, since it is the only price.", "A stale price may overstate or understate value."],
    ["wrong", "Delete the security from the report.", "That hides the issue."]]),
  t("invest-personal-account", ["invest"], "A friend asks for a stock pick", "At a wedding, a friend asks what stock you would buy with ₦500,000.", "compliance", [
    ["best", "Explain you cannot give personal tips, suggest he speaks to a licensed adviser, and avoid mentioning client views.", "Keep advice within the rules and avoid leaks."],
    ["partly", "Give a general, popular stock name.", "Even casual tips can cause trouble."],
    ["wrong", "Tell him what the firm is buying.", "That is confidential information."]]),
  t("invest-short-notice", ["invest"], "A last-minute trade idea", "A trader proposes a large last-minute trade that skips the usual limit check because 'the price is moving'.", "risk-awareness", [
    ["best", "Insist on the limit check, even if it costs the opportunity, and document why.", "Limits exist because speed hides risk."],
    ["partly", "Allow it just this once, with a note.", "A one-off breach becomes a habit."],
    ["wrong", "Approve it and say nothing.", "Hidden breaches are the worst."]]),
  t("invest-research-error", ["invest"], "An error in your published note", "After publishing, you find a wrong earnings figure that makes a stock look cheaper.", "compliance", [
    ["best", "Tell your head and compliance immediately, publish a correction promptly, and review how it happened.", "Correct errors openly and quickly."],
    ["partly", "Fix it in the next note.", "Clients may have acted on it already."],
    ["wrong", "Quietly edit the original.", "Silent edits hide the problem."]]),
  t("invest-client-meeting-prep", ["invest"], "A big pitch tomorrow", "You have a pitch tomorrow to an institutional client and your numbers include a source you cannot verify.", "market-knowledge", [
    ["best", "Replace the source with a verifiable one or remove the figure, and tell your manager what you changed.", "Verified facts only."],
    ["partly", "Use it and footnote the uncertainty.", "A footnote does not make it reliable."],
    ["wrong", "Use it: it makes the case stronger.", "Unverified numbers mislead."]]),

  /* ---------------------------------- Everyone ---------------------------------- */
  t("all-tailgating", ["*"], "Someone follows you through the door", "A person you do not know follows you through the staff door without scanning a card.", "compliance", [
    ["best", "Politely ask who they are and to sign in at reception, and tell security if you are unsure.", "Physical security is everyone's job."],
    ["partly", "Say nothing and hope they belong.", "Silence invites risk."],
    ["wrong", "Hold the door open for them.", "That helps an intruder."]]),
  t("all-phishing", ["*"], "A suspicious email", "An email from 'IT' asks you to log in through a link to avoid your mailbox being closed.", "digital-tools", [
    ["best", "Do not click, report it to IT security using the report button, and delete it.", "Report phishing; never click."],
    ["partly", "Delete it and say nothing.", "Reporting helps protect colleagues."],
    ["wrong", "Click to check if it is real.", "Clicking is the attack."]]),
  t("all-meeting-late", ["*"], "Running late to a meeting", "You realise you will be fifteen minutes late to a client meeting because of traffic.", "communication", [
    ["best", "Call or message the client and your team early with a realistic time, and join as soon as you can.", "Early, honest communication preserves trust."],
    ["partly", "Rush in without a word.", "They will have waited without knowing."],
    ["wrong", "Skip the meeting and say nothing.", "Never leave a client waiting in silence."]]),
  t("all-colleague-struggling", ["*"], "A colleague is struggling", "A colleague has missed several deadlines and looks stressed.", "communication", [
    ["best", "Check in privately and kindly, offer help or a quick handover, and suggest speaking to their manager if needed.", "Supportive teamwork prevents burnout."],
    ["partly", "Mention it to the manager without talking to the colleague.", "Speak to them first, if safe."],
    ["wrong", "Gossip about it at lunch.", "Gossip hurts trust."]]),
  t("all-expense-claim", ["*"], "A claim that is slightly generous", "A colleague suggests adding a small amount to an expense claim 'everyone does it'.", "compliance", [
    ["best", "Decline politely, claim only what was spent, and raise it with your manager if it is common.", "Integrity in small things."],
    ["partly", "Add a small amount this once.", "Small dishonesty is still dishonesty."],
    ["wrong", "Add a larger amount to match what others claim.", "That is fraud."]]),
  t("all-sensitive-screen", ["*"], "A screen left unlocked", "A colleague leaves their desk with a client's account open on the screen.", "compliance", [
    ["best", "Lock the screen and remind them kindly when they return.", "Protect client information."],
    ["partly", "Leave it: it is not your job.", "A small action avoids a breach."],
    ["wrong", "Look at what is on screen out of curiosity.", "Never access what you do not need."]]),
  t("all-training-clash", ["*"], "Training or a client deadline?", "A compulsory compliance training is due today but a client request arrives that morning.", "communication", [
    ["best", "Handle the urgent client need briefly, tell your manager your plan, and complete the training later today.", "Plan, communicate and honour both."],
    ["partly", "Skip the training: clients come first.", "Compliance training is also mandatory."],
    ["wrong", "Ask a colleague to take the training for you.", "That is dishonest."]]),
  t("all-hybrid-noise", ["*"], "A noisy call in the open plan", "A colleague takes long, loud calls on speaker near your desk while you work on a report.", "communication", [
    ["best", "Ask kindly if they can use a meeting room or headset, and thank them.", "Respectful, direct requests work best."],
    ["partly", "Complain about it to others.", "Talk to them, not about them."],
    ["wrong", "Play louder music to make a point.", "That escalates."]]),
];
