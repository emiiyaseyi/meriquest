/**
 * What happens after a client conversation, in real life. One story for how the client decided, and one for each kind of breach.
 * Everything is fictional and general: it describes how things typically unfold, not a specific rule or penalty, and it is a draft
 * for Group Compliance to check before it is relied on (RULEBOOK §2.9). Admins can edit all of it under Settings > Client Desk.
 */
type When = "Today" | "This week" | "This month" | "Later";
type Who = "Client" | "Firm" | "You" | "Team";
type Tone = "good" | "bad" | "mixed";

const c = (headline: string, timeline: [When, string][], impact: [Who, Tone, string][]) => ({
  headline,
  timeline: timeline.map(([when, text]) => ({ when, text })),
  impact: impact.map(([who, tone, text]) => ({ who, tone, text })),
});
const f = (afterMinutes: number, icon: string, text: string, tone: "good" | "bad" | "info") => ({ afterMinutes, icon, text, tone });

export const AFTERMATH = {
  outcomes: {
    invests: {
      consequence: c(
        "the client goes ahead and the relationship grows",
        [
          ["Today", "The forms are signed and the money is on its way. You confirm in writing what was agreed, including the risks."],
          ["This week", "The checker approves the file, the account is activated and the client gets a confirmation. Your follow-up call lands the next day."],
          ["This month", "A client who felt well served and well informed tends to stay, add more over time and mention you to friends and colleagues."],
        ],
        [["Client", "good", "feels informed and looked after"], ["Firm", "good", "a new, properly documented relationship"], ["You", "good", "a record that shows good practice"]],
      ),
    },
    thinking: {
      consequence: c(
        "the client wants time to think, and the next contact decides it",
        [
          ["Today", "The client leaves with your written summary and a date for a call. Nothing is decided yet."],
          ["This week", "If your follow-up happens as promised, the client is far more likely to come back. If it slips, they remember."],
          ["This month", "Many clients decide after two or three honest contacts. Some choose another firm; that is part of the work."],
        ],
        [["Client", "mixed", "has not decided yet"], ["You", "mixed", "the follow-up is now your job"]],
      ),
      followUp: f(6, "📞", "A client you saw earlier is waiting for the follow-up call you promised. A prompt, honest call keeps the door open.", "info"),
    },
    declines: {
      consequence: c(
        "no deal this time",
        [
          ["Today", "The client decides not to go ahead. How you leave the conversation matters more than the sale."],
          ["This week", "A short thank-you and an open door keep you in their mind; silence does not."],
          ["This month", "Some prospects return months later, usually to the person who treated them well when they said no."],
        ],
        [["Client", "mixed", "not ready, or not convinced"], ["Firm", "mixed", "no new business from this visit"], ["You", "mixed", "a lesson in what could have been explained better"]],
      ),
    },
    stays: {
      consequence: c(
        "the client stays with the firm",
        [
          ["Today", "The client feels heard and leaves calmer than they came."],
          ["This week", "The problem is fixed or escalated, as you said it would be, and the client hears back."],
          ["This month", "A complaint handled well often builds more trust than no complaint at all."],
        ],
        [["Client", "good", "feels heard"], ["Firm", "good", "keeps a client who was close to leaving"], ["You", "good", "owned the problem"]],
      ),
    },
    leaves: {
      consequence: c(
        "the client may leave the firm",
        [
          ["Today", "The client leaves still upset, and says they are thinking of moving their money."],
          ["This week", "A written complaint is likely, copied to the Head of Client Service. It must be acknowledged and answered within the standard time."],
          ["This month", "If nothing changes, the account closes. Unhappy clients also tell others."],
        ],
        [["Client", "bad", "feels ignored or brushed off"], ["Firm", "bad", "may lose the client and its goodwill"], ["You", "bad", "a complaint to be explained"]],
      ),
      followUp: f(5, "✉️", "A client you saw earlier has sent a written complaint about how they were handled. It needs an acknowledgement within 24 hours.", "bad"),
    },
  },
  breaches: {
    unsuitable: {
      consequence: c(
        "a product that did not suit the client was recommended",
        [
          ["Today", "The client agrees, trusting your advice, and buys something that does not fit their goals or tolerance for risk."],
          ["This week", "When the price moves, the client asks why they were sold it. The file shows no proper suitability work."],
          ["This month", "A complaint follows. The firm reviews the sale, may have to put things right for the client at its own cost, and your sales are looked at more closely."],
        ],
        [["Client", "bad", "holds something they did not need or understand"], ["Firm", "bad", "complaint and possible regulatory attention"], ["You", "bad", "your recommendations will be reviewed"]],
      ),
      followUp: f(8, "⚠️", "Compliance has asked to review a recent recommendation of yours. The file needs to show why the product suited the client.", "bad"),
    },
    kyc: {
      consequence: c(
        "the client's documents were not checked first",
        [
          ["Today", "The conversation goes ahead as if the paperwork were fine."],
          ["This week", "Operations or Compliance finds gaps on the file. The account may be put on hold until the documents are complete."],
          ["This month", "The client is annoyed at being chased, and the firm has to explain why it dealt without proper verification."],
        ],
        [["Client", "bad", "delayed and irritated"], ["Firm", "bad", "a know-your-customer weakness on record"], ["You", "bad", "asked why the check was skipped"]],
      ),
    },
    promise: {
      consequence: c(
        "returns were promised, which is never allowed",
        [
          ["Today", "The client is delighted and relies on what you said."],
          ["This week", "Returns do not match the promise. The client remembers your words, not the small print."],
          ["This month", "A complaint cites what you said. Recorded calls and notes are reviewed, and a promise like this can be treated as a serious conduct matter."],
        ],
        [["Client", "bad", "feels misled"], ["Firm", "bad", "conduct breach and reputational risk"], ["You", "bad", "a conduct review; in real life this can lead to disciplinary action"]],
      ),
      followUp: f(7, "⚠️", "A client has quoted something you said about returns in a complaint. Compliance wants to hear your account of the conversation.", "bad"),
    },
    improper: {
      consequence: c(
        "you did something improper because the client asked",
        [
          ["Today", "The favour is done, and the client is pleased."],
          ["This week", "Monitoring or a checker notices the unusual pattern: a backdated form, a split deposit or a tip passed on. It is recorded."],
          ["This month", "An investigation looks at what you did and why. Helping a client avoid a rule can be treated as a serious breach, and in some cases it must be reported outside the firm."],
        ],
        [["Client", "mixed", "gets what they wanted, and may ask again"], ["Firm", "bad", "a control failure and possible reporting duty"], ["You", "bad", "a formal investigation; in real life this can end a career"]],
      ),
      followUp: f(6, "🚨", "An internal review has flagged a transaction you handled. You will be asked to explain it.", "bad"),
    },
    offschedule: {
      consequence: c(
        "a private discount was offered outside the fee schedule",
        [
          ["Today", "The client is happy with the lower fee."],
          ["This week", "Finance sees revenue below the schedule. Other clients find out and ask for the same."],
          ["This month", "Treating clients unequally is a fairness issue. You are asked to justify the exception, and the discount may be reversed."],
        ],
        [["Client", "mixed", "pleased now, upset if it is withdrawn"], ["Firm", "bad", "fee leakage and unequal treatment"], ["You", "bad", "asked to explain the exception"]],
      ),
    },
    skipkyc: {
      consequence: c(
        "an account was opened before the documents were collected",
        [
          ["Today", "The account is open and the client is happy to start."],
          ["This week", "The documents never arrive, or arrive wrong. The account has to be restricted."],
          ["This month", "The gap shows up in a review. Dealing with an unverified customer is a serious weakness in anti-money-laundering controls."],
        ],
        [["Client", "bad", "has to be chased and restricted"], ["Firm", "bad", "an anti-money-laundering control gap"], ["You", "bad", "a finding against your file"]],
      ),
    },
    guess: {
      consequence: c(
        "the risk profile was filled in without the client",
        [
          ["Today", "It saves time, and the form looks complete."],
          ["This week", "The profile says the client is comfortable with risk. They never said so."],
          ["This month", "After a loss, the client says they never answered those questions. The advice cannot be defended."],
        ],
        [["Client", "bad", "advice based on answers that were not theirs"], ["Firm", "bad", "a suitability record that cannot be relied on"], ["You", "bad", "the file shows you completed it"]],
      ),
    },
    rigged: {
      consequence: c(
        "the risk profile was adjusted to fit a product",
        [
          ["Today", "The profile now supports the product you wanted to sell."],
          ["This week", "A review compares the answers with the product and the pattern stands out."],
          ["This month", "Altering a client's profile is a serious integrity matter. The sale may be reversed and the client compensated."],
        ],
        [["Client", "bad", "sold something the true profile did not support"], ["Firm", "bad", "a falsified record to put right"], ["You", "bad", "a serious conduct matter"]],
      ),
    },
    bypass: {
      consequence: c(
        "an account was activated without the checker's approval",
        [
          ["Today", "The account is live straight away, and the client is happy."],
          ["This week", "The checker's step is missing from the record, so the control did not happen."],
          ["This month", "Internal audit lists it as a control breach. The approval step exists to catch errors and fraud before money moves."],
        ],
        [["Client", "mixed", "served quickly, but exposed to unchecked errors"], ["Firm", "bad", "an audit finding"], ["You", "bad", "named in the finding"]],
      ),
    },
    bluff: {
      consequence: c(
        "an answer was given as fact when you were not sure",
        [
          ["Today", "The client is reassured and decides on what you said."],
          ["This week", "Someone checks and the answer was wrong or incomplete."],
          ["This month", "You must correct it with the client, who now trusts the next answer less. A quick 'I will find out and come back to you' would have cost nothing."],
        ],
        [["Client", "bad", "decided on a wrong answer"], ["Firm", "mixed", "a correction and some lost trust"], ["You", "bad", "your credibility with this client"]],
      ),
    },
  },
};
