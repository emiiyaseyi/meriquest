import { caseStudy, scenario, type CaseDef, type ScenarioDef } from "./helpers";

/** A second set of decisions and written cases for the built-in courses. Keyed by course id. All people and amounts are fictional. */
export const EXTRA2: Record<string, { scenarios: ScenarioDef[]; cases: CaseDef[] }> = {
  "aml-cft": {
    scenarios: [
      scenario("y-aml-cash", "A large cash deposit", 2, "A client who usually invests small amounts arrives with a large cash sum and says it is from selling land. He has no paperwork with him.",
        [["best", "Accept nothing yet, ask for the source-of-funds evidence, follow the process and report to the compliance officer if it does not add up.", "Source of funds must be explained and evidenced; unusual patterns are reported."],
         ["partly", "Take the money and ask for papers next week.", "Evidence comes before accepting large cash."],
         ["wrong", "Tell him how to split it into smaller deposits.", "Helping split deposits is helping to avoid reporting."]]),
      scenario("y-aml-tipping", "A client asks if you reported him", 3, "After you reported a transaction, the client asks you directly whether Meristem has told the authorities about him.",
        [["best", "Say you cannot discuss internal compliance matters and tell the compliance officer about the question.", "Tipping off a client about a report is a serious offence."],
         ["partly", "Say 'I do not think so' to calm him.", "Any hint, true or false, can amount to tipping off."],
         ["wrong", "Tell him yes, so he can explain himself.", "Tipping off is an offence."]]),
      scenario("y-aml-pep", "A politically exposed client", 2, "A new client is a senior government official's relative and wants a quick account opening.",
        [["best", "Apply enhanced due diligence, get senior approval, and establish the source of wealth before opening.", "Politically exposed persons need enhanced checks and senior sign-off."],
         ["partly", "Open it with normal checks as he is polite.", "Normal checks are not enough for higher-risk clients."],
         ["wrong", "Skip the checks to avoid offending him.", "Rules apply, especially for higher risk."]]),
    ],
    cases: [
      caseStudy("y-case-aml-layering", "Money in, money out, quickly", "A newly opened account receives several transfers from different individuals and, within days, the owner asks to redeem everything to a third party abroad. The stated occupation is 'student'.",
        ["Name the red flags: many senders, quick exit, third-party payment, and income that does not match.", "Do not tip off the client.", "Report to the compliance officer, who decides on a suspicious transaction report.", "Keep a clear record of what you saw and when."]),
    ],
  },
  "confidentiality-at-work": {
    scenarios: [
      scenario("y-conf-lift", "A conversation in the lift", 1, "Two colleagues discuss a client's large order in a crowded lift.",
        [["best", "Remind them quietly afterwards to keep client talk to private spaces.", "Confidential information must not be discussed where others can hear."],
         ["partly", "Say nothing but feel uncomfortable.", "A quiet reminder helps everyone."],
         ["wrong", "Join in and add your opinion.", "That adds to the breach."]]),
      scenario("y-conf-print", "A printout left behind", 2, "You find a printed client list on the printer tray.",
        [["best", "Collect it, return it to the owner or shred it as policy says, and remind the team to use secure print.", "Handle and dispose of confidential paper properly."],
         ["partly", "Leave it for the owner to find.", "It may be seen by others meanwhile."],
         ["wrong", "Take a photo to check it later.", "Copying client data is a breach."]]),
    ],
    cases: [
      caseStudy("y-case-conf-email", "The wrong attachment", "An officer emails a quarterly statement to the wrong client because two names look alike. She notices an hour later.",
        ["Tell the manager and the data protection contact at once.", "Ask the wrong recipient to delete it and confirm in writing.", "Tell the affected client as the policy requires.", "Review the process: check addresses before sending."]),
    ],
  },
  "law-and-regulation": {
    scenarios: [
      scenario("y-law-deadline", "A filing deadline", 2, "A regulatory return is due at 5 pm and you realise one figure may be wrong.",
        [["best", "Tell your manager now, verify the figure, and file correctly on time or ask for the proper extension.", "Accuracy and timeliness both matter; escalate early."],
         ["partly", "File on time and fix it next month.", "A known error should be corrected before filing."],
         ["wrong", "File a guess to meet the deadline.", "A guess in a regulatory return is a breach."]]),
      scenario("y-law-inspection", "A regulator asks for documents", 2, "A regulator's officer calls and asks you to email a set of client records today.",
        [["best", "Take their details, tell the compliance officer, and send nothing until the request is verified and approved.", "Regulator requests go through compliance."],
         ["partly", "Send half to be helpful.", "Do not send anything without approval."],
         ["wrong", "Ignore the call.", "Regulators must be answered properly."]]),
    ],
    cases: [
      caseStudy("y-case-law-late", "A late return", "A team discovers that a periodic return was filed three days late last quarter and nobody reported it.",
        ["Report the breach to compliance immediately.", "Understand why it happened and fix the process.", "Be open with the regulator as advised.", "Hiding a late filing makes it worse."]),
    ],
  },
  "meristem-wealth-management": {
    scenarios: [
      scenario("y-wm-goals", "A goal with no number", 1, "A client says she wants 'enough for retirement' but cannot say how much.",
        [["best", "Ask about lifestyle, expenses and timeline, and help her turn it into a number and a plan.", "Clear goals shape the plan."],
         ["partly", "Pick a figure that sounds right.", "The number must come from her situation."],
         ["wrong", "Move on and sell her a product.", "Needs first, product second."]]),
      scenario("y-wm-review", "Skipping the annual review", 2, "A busy client keeps cancelling his annual review and says 'everything is fine'.",
        [["best", "Offer a short, flexible slot, explain why reviews matter, and record the attempts.", "Regular reviews keep the plan on track."],
         ["partly", "Wait until he asks.", "Reviews should not wait for a problem."],
         ["wrong", "Mark the review as done.", "A false record is a breach."]]),
    ],
    cases: [
      caseStudy("y-case-wm-plan", "A plan for a young family", "A couple in their thirties with two children, a mortgage and a modest emergency fund want to start investing ₦300,000 a month.",
        ["Start with emergency fund and protection.", "Match investments to goals and horizons: school fees, home, retirement.", "Explain risk and costs plainly.", "Review every year or after a life change."]),
    ],
  },
  "meristem-stockbrokers": {
    scenarios: [
      scenario("y-sb-order", "A mistaken order", 2, "You entered a buy order for 10,000 shares instead of 1,000. The order has already executed.",
        [["best", "Tell your supervisor at once, follow the error-handling procedure, inform the client if needed and record it.", "Report trade errors quickly and follow procedure."],
         ["partly", "Sell the extra shares quietly to fix it.", "Quiet fixes hide errors and may disadvantage the client."],
         ["wrong", "Say nothing and hope the price rises.", "Hiding an error is serious misconduct."]]),
      scenario("y-sb-frontrun", "Trading ahead of a client", 3, "You know a client will place a very large order tomorrow that will push the price up. A friend asks if he should buy today.",
        [["best", "Decline to share anything and avoid trading ahead; the client's order is confidential.", "Front-running is a serious offence."],
         ["partly", "Hint without being clear.", "A hint is still a leak."],
         ["wrong", "Tell him to buy and share the gains.", "That is front-running."]]),
    ],
    cases: [
      caseStudy("y-case-sb-limits", "A price limit missed", "A client's limit order was not triggered because the order was entered in the wrong price field. The client lost an opportunity.",
        ["Own the error, tell the supervisor and compliance.", "Compensate the client according to policy.", "Fix the process: double-check key fields.", "Learn without blaming."]),
    ],
  },
  "meristem-customer-experience": {
    scenarios: [
      scenario("y-cx-silence", "A silent complaint", 2, "A client does not complain but his survey scores fall every quarter.",
        [["best", "Reach out kindly, ask what could be better and act on what he says.", "Listen for quiet signals, not only loud complaints."],
         ["partly", "Wait until he complains.", "Early outreach prevents loss."],
         ["wrong", "Ignore the scores: he has not said anything.", "Silence can mean disappointment."]]),
      scenario("y-cx-handover", "A good handover", 1, "You are going on leave and a client has an open request.",
        [["best", "Write a clear handover, tell the client who will help and when you return.", "Clients should never feel dropped."],
         ["partly", "Tell a colleague verbally.", "Write it down so nothing is lost."],
         ["wrong", "Leave it for when you return.", "Delay damages trust."]]),
    ],
    cases: [
      caseStudy("y-case-cx-recovery", "Turning a bad day around", "A client waited an hour in the lobby, was sent to the wrong desk and left angry. He then posted a review online.",
        ["Call him personally and apologise sincerely.", "Fix what went wrong and tell him what changes.", "Reply to the review politely, without arguing.", "Share the lesson with the team."]),
    ],
  },
  "meristem-capital": {
    scenarios: [
      scenario("y-cap-deal", "Leaks around a deal", 3, "Bankers on a confidential deal notice rumours in the market about the transaction.",
        [["best", "Tell compliance at once, review who has access and follow the leak procedure.", "Leaks must be escalated and the barrier reviewed."],
         ["partly", "Wait to see if the rumours die.", "Delay increases the risk."],
         ["wrong", "Confirm the rumour to a journalist.", "That is a serious breach."]]),
      scenario("y-cap-valuation", "A valuation the client dislikes", 2, "A client asks you to change the assumptions in a valuation to raise the price.",
        [["best", "Explain that assumptions must be reasonable and supportable, and show a range with evidence.", "Independence matters in valuations."],
         ["partly", "Change a few assumptions slightly.", "Small changes to please a client still weaken independence."],
         ["wrong", "Use the client's numbers as asked.", "That compromises integrity."]]),
    ],
    cases: [
      caseStudy("y-case-cap-info", "Who needs to know?", "A junior analyst on a confidential deal asks a colleague in another team for help with a model and shares the client's name.",
        ["Use the need-to-know rule.", "Anonymise or use code names.", "Tell the deal lead and compliance about the breach.", "Add the colleague to the wall-crossing list only if approved."]),
    ],
  },
};
