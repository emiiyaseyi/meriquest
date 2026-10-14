/** The starting work-shift situations. Admins can edit, add and remove them under Settings. All people and amounts are fictional. */
type V = "best" | "partly" | "wrong";
type Task = { id: string; units: string[]; title: string; story: string; skill?: string; choices: { text: string; verdict: V; feedback: string }[] };

const t = (id: string, units: string[], title: string, story: string, skill: string, c: [V, string, string][]): Task => ({ id, units, title, story, skill, choices: c.map(([verdict, text, feedback]) => ({ text, verdict, feedback })) });

import { MORE_SHIFT_TASKS } from "./shift-content-more";

export const DEFAULT_SHIFTS = {
  settings: { minutes: 8, tasksPerShift: 3, shiftsPerDay: 2, pointsBest: 4, pointsPartly: 2, completionBonus: 5, skillXpBest: 2 },
  tasks: [
    ...MORE_SHIFT_TASKS,
    t("cx-delayed-transfer", ["cx"], "A client is angry about a delayed transfer", "A client walks up to the desk and says his transfer has been pending for two days. People are watching.", "client-care", [
      ["best", "Stay calm, thank him for waiting, take ownership, check the status and tell him exactly when he will hear back.", "Calm ownership and a clear next step settle a client."],
      ["partly", "Offer him water and ask him to wait while you find the right person.", "Hospitality helps, but he needs action and a time."],
      ["wrong", "Tell him the transfers team handles that and send him to their desk.", "Passing him on breaks the ownership standard."]]),
    t("cx-third-ring", ["cx"], "The phone has rung four times", "Your colleague's phone is ringing for the fourth time. You are not busy.", "client-care", [
      ["best", "Pick it up, greet and identify yourself, and help or take a message.", "Calls are answered by the third ring."],
      ["partly", "Wait a little to see if they come back.", "The standard is the third ring at most."],
      ["wrong", "Ignore it: it is not your desk.", "Ignoring a ringing phone is rude and costs us clients."]]),
    t("cx-overdue-call", ["cx"], "A client you have not called in six weeks", "Your CRM shows a client has had no call from you for six weeks.", "client-care", [
      ["best", "Call today, log it on the CRM and plan the next contact within two weeks.", "Clients are called at least twice a month and calls are logged."],
      ["partly", "Send an email instead.", "A call is the standard."],
      ["wrong", "Wait for the client to call.", "Proactive contact is expected."]]),
    t("cx-complaint-friday", ["cx"], "A complaint arrives at 4:50 pm on Friday", "A written complaint about missing dividends arrives just before closing.", "client-care", [
      ["best", "Log it, tell your head of client service, and acknowledge it to the client within 24 hours.", "Complaints are handled within 24 hours and escalated."],
      ["partly", "Leave it in your inbox and handle it first thing on Monday.", "That misses the 24-hour standard."],
      ["wrong", "Reply that dividends are not your responsibility.", "Never dismiss a complaint."]]),
    t("cx-two-clients", ["cx"], "Two clients arrive at once", "A client with a large portfolio and a client with a small account reach the desk together.", "client-care", [
      ["best", "Greet both warmly and serve them fairly, keeping each wait short.", "No preferential treatment by portfolio size."],
      ["partly", "Serve the larger client first and apologise to the other.", "The apology helps but the order is not fair."],
      ["wrong", "Ask the smaller client to come back later.", "Delay is deadly."]]),
    t("cx-share-details", ["cx"], "A friend asks about a client", "A friend asks if a famous businessman banks with us.", "compliance", [
      ["best", "Say you cannot talk about any client, politely.", "Even the fact of a relationship is confidential."],
      ["partly", "Say 'no comment' with a smile.", "A hint can read as confirmation."],
      ["wrong", "Confirm quietly: it is only a friend.", "That is a breach of confidentiality."]]),
    t("wealth-risk-profile", ["wealth"], "A cautious client wants high returns", "A retired client says she cannot afford losses but asks for the highest return you have.", "risk-awareness", [
      ["best", "Explain the risk and return trade-off, confirm her goals and capacity for loss, and recommend a suitable mix.", "Suitability comes before returns."],
      ["partly", "Recommend a conservative product without discussing it.", "Safe, but she should understand why."],
      ["wrong", "Put her in the highest-return product.", "That ignores her stated limit."]]),
    t("wealth-life-change", ["wealth"], "A client has changed jobs and had a baby", "At her annual review a client mentions a new job and a new baby.", "risk-awareness", [
      ["best", "Update her profile, goals and risk preference and adjust the plan, including protection and education savings.", "Life changes should change the plan."],
      ["partly", "Review performance only.", "It misses her new circumstances."],
      ["wrong", "Skip the review: nothing changed in her portfolio.", "Reviews are part of the service."]]),
    t("wealth-promise", ["wealth"], "A client asks for a guaranteed return", "A client asks, 'Can you promise me 25% this year?'", "compliance", [
      ["best", "Explain that returns cannot be promised, describe the risks and show what the product terms say.", "Never promise returns."],
      ["partly", "Say 'probably' and move on.", "A vague yes sounds like a promise."],
      ["wrong", "Say yes to win the account.", "Promising returns breaches the code of conduct."]]),
    t("wealth-edu-plan", ["wealth"], "School fees in eight years", "A client wants to fund two children's university education in eight years and keep an emergency fund.", "market-knowledge", [
      ["best", "Build the emergency fund first, then match investments to the eight-year horizon, and review each year.", "Match the plan to the time horizon."],
      ["partly", "Put all her savings into one growth fund.", "Concentration does not suit a fixed date."],
      ["wrong", "Suggest she borrows later for fees.", "That ignores planning."]]),
    t("invest-insider", ["invest"], "A tip about an announcement", "A colleague from corporate finance says a listed client will announce a big acquisition on Friday and 'the price will jump'.", "compliance", [
      ["best", "Do not act or share it, and tell compliance what you heard.", "Unpublished price-sensitive information must not be used or passed on."],
      ["partly", "Do not trade yourself but hint to a friend to be ready.", "Hinting passes on inside information."],
      ["wrong", "Buy a small amount.", "Trading on inside information is illegal at any size."]]),
    t("invest-conflict", ["invest"], "Your own trade before a recommendation", "You want to buy a stock yourself that you are about to recommend to clients.", "compliance", [
      ["best", "Do not trade ahead of clients; follow the personal dealing policy and get approval.", "Clients come first."],
      ["partly", "Buy after sending the recommendation.", "Still needs approval under the policy."],
      ["wrong", "Buy first so you benefit.", "That is front-running."]]),
    t("invest-valuation", ["invest"], "A doubtful figure in a report", "An hour before a report goes out you spot a figure that looks wrong.", "compliance", [
      ["best", "Check and correct it, and tell your manager if time is short.", "Accuracy before speed, especially for regulators."],
      ["partly", "Send it and flag the figure afterwards.", "Better to fix it first."],
      ["wrong", "Delete the figure.", "Hiding a doubtful number makes things worse."]]),
    t("invest-rights", ["invest"], "A rights issue deadline", "A client may have missed a rights issue because nobody told her.", "client-care", [
      ["best", "Check the records, apologise, explain her options now, and fix the reminder process.", "Own it and prevent a repeat."],
      ["partly", "Apologise but do nothing more.", "She needs options and a fix."],
      ["wrong", "Say it was her responsibility.", "Corporate actions are communicated in good time."]]),
    t("invest-instruction", ["invest"], "An order given by phone", "A client phones with a large order, but the call is not on a recorded line.", "compliance", [
      ["best", "Use the recorded line or get written confirmation before executing, and log the instruction.", "Instructions must be traceable."],
      ["partly", "Execute and note it in your diary.", "A diary is not enough evidence."],
      ["wrong", "Execute now and sort the paperwork later.", "Trading without proper instruction creates disputes."]]),
    t("all-printer", ["*"], "A client statement on the printer", "You find a printed client statement left on the shared printer.", "compliance", [
      ["best", "Take it, return or secure it, and remind the team to collect prints at once.", "Protect client information in shared spaces."],
      ["partly", "Leave it for its owner to collect.", "Anyone could read it meanwhile."],
      ["wrong", "Read it out of curiosity.", "Reading what you do not need is a breach."]]),
    t("all-wrong-email", ["*"], "An email to the wrong person", "You realise you sent a client's valuation to the wrong address.", "compliance", [
      ["best", "Report it at once to your manager and compliance, recall it and ask the recipient to delete it.", "Prompt reporting limits harm."],
      ["partly", "Ask the recipient quietly to delete it.", "Good step, but report it through the proper channel too."],
      ["wrong", "Say nothing and hope.", "Hiding a breach makes it worse."]]),
    t("all-new-joiner", ["*"], "A new colleague eats alone", "A new joiner sits alone at lunch and seems unsure.", "communication", [
      ["best", "Invite them to join you and introduce them to a few people.", "A welcoming culture costs little."],
      ["partly", "Smile and say hello.", "Friendly, but a small extra step goes further."],
      ["wrong", "Leave them to find their own way.", "Esprit de corps starts with small things."]]),
    t("all-deadline", ["*"], "A deadline you cannot meet", "You cannot finish a client deliverable by the date you promised.", "communication", [
      ["best", "Tell the client early and honestly, give a new realistic date and keep to it.", "Under-promise and over-deliver; update early."],
      ["partly", "Work late and hope to make it without telling anyone.", "The client should be told if there is a risk."],
      ["wrong", "Wait and see if they ask.", "Silence turns a delay into a complaint."]]),
    t("all-gossip", ["*"], "Gossip at the coffee point", "Colleagues are gossiping about a manager's private matter.", "communication", [
      ["best", "Politely steer the conversation away and do not pass it on.", "Meristem people are immune to gossip."],
      ["partly", "Stay quiet but listen.", "Listening encourages it."],
      ["wrong", "Join in and add what you heard.", "Gossip damages trust."]]),
  ],
};
