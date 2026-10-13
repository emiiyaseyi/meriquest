/** The starting leadership simulator. Admins can edit meters, scenarios and points under Settings. All people are fictional. */
type Fx = Record<string, number>;
const c = (text: string, effects: Fx, feedback: string) => ({ text, effects, feedback });

export const DEFAULT_LEADERSHIP = {
  settings: { rounds: 5, startMeter: 55, runsPerDay: 2, pointsGreat: 12, pointsGood: 7, pointsLearning: 2, greatAverage: 70, goodAverage: 58, floor: 35 },
  meters: [
    { id: "morale", label: "Team morale", icon: "😊" },
    { id: "delivery", label: "Delivery", icon: "📦" },
    { id: "trust", label: "Client trust", icon: "🤝" },
    { id: "compliance", label: "Compliance", icon: "🛡️" },
  ],
  scenarios: [
    {
      id: "lead-deadline-clash",
      title: "Two deadlines, one team",
      story: "Your team has a client report due tomorrow, and an urgent regulatory return due the same afternoon. You are short by two people.",
      choices: [
        c("Do the regulatory return first, tell the client the report will be a few hours late, and ask for help from another team.", { compliance: 10, trust: 4, delivery: -2, morale: 4 }, "Regulatory deadlines come first. Telling the client early and asking for help protects trust and the team."),
        c("Ask everyone to stay late and do both without telling anyone.", { delivery: 5, morale: -12, compliance: -4, trust: -2 }, "It may work once, but it burns the team and risks errors in the return."),
        c("Send the report on time and do the return when you can.", { trust: 5, compliance: -15, delivery: 2, morale: -4 }, "Missing a regulatory deadline is far costlier than a late report."),
      ],
    },
    {
      id: "lead-mistake",
      title: "A mistake in a client statement",
      story: "A junior colleague sent a client the wrong statement. The client has not noticed yet.",
      choices: [
        c("Tell the client now, correct it, and review the process with the team without blaming the colleague.", { trust: 8, compliance: 8, morale: 4, delivery: 0 }, "Owning a mistake early builds trust. A fair review prevents a repeat."),
        c("Quietly send the right one and say nothing.", { trust: -8, compliance: -10, morale: 0, delivery: 2 }, "Hiding it is dishonest and the client may find out."),
        c("Reprimand the colleague in front of the team.", { morale: -14, trust: 0, compliance: 2, delivery: -2 }, "Public blame damages morale and makes people hide mistakes."),
      ],
    },
    {
      id: "lead-star",
      title: "The high performer who bends rules",
      story: "Your top seller skips a required suitability check to close deals faster. Results are excellent.",
      choices: [
        c("Coach them privately, make the check non-negotiable, and explain the risk to them and the firm.", { compliance: 12, morale: 2, delivery: -3, trust: 5 }, "Good results do not excuse skipped checks. Clear, private coaching is fair."),
        c("Ignore it: results speak for themselves.", { delivery: 6, compliance: -18, trust: -6, morale: -4 }, "Tolerating this puts clients and the firm at risk and others will copy it."),
        c("Report them straight to HR without speaking to them first.", { compliance: 6, morale: -8, trust: 0, delivery: -4 }, "Serious, but a conversation and the proper procedure usually come first."),
      ],
    },
    {
      id: "lead-burnout",
      title: "A team member is exhausted",
      story: "One of your best analysts looks worn out and has made small errors this week. A big project starts Monday.",
      choices: [
        c("Have a private conversation, adjust the workload, and agree some time to recover.", { morale: 12, delivery: -3, trust: 2, compliance: 2 }, "Caring early prevents bigger problems and errors."),
        c("Tell them to push through: the project needs them.", { delivery: 4, morale: -14, compliance: -5, trust: -2 }, "Pushing an exhausted person risks serious errors."),
        c("Move them off the project without talking to them.", { morale: -8, delivery: -4, compliance: 0, trust: 0 }, "Decisions about someone without them can feel like a punishment."),
      ],
    },
    {
      id: "lead-client-pressure",
      title: "A large client demands a promise",
      story: "A large client demands a guaranteed return and threatens to move their account if you refuse.",
      choices: [
        c("Decline the guarantee, explain the risks clearly, and offer options that fit their goals.", { compliance: 10, trust: 6, delivery: -2, morale: 2 }, "Never promise returns. Honest options keep long-term trust."),
        c("Give the guarantee verbally to keep the account.", { trust: 4, compliance: -20, delivery: 3, morale: -4 }, "A promised return breaks the code of conduct and creates real liability."),
        c("Escalate to your head of business and let them decide.", { compliance: 4, trust: 0, delivery: -3, morale: -2 }, "Escalation can help, but a manager is expected to handle the conversation too."),
      ],
    },
    {
      id: "lead-credit",
      title: "Who gets the credit?",
      story: "Your director praises you for a project that your team mostly built.",
      choices: [
        c("Thank the director and name the team members who did the work.", { morale: 12, trust: 3, delivery: 0, compliance: 0 }, "Sharing credit builds loyalty and a strong team."),
        c("Accept the praise: you led it.", { morale: -10, trust: 0, delivery: 0, compliance: 0 }, "Taking the credit costs you your team's trust."),
        c("Say nothing now and mention the team later, privately.", { morale: 2, trust: 0, delivery: 0, compliance: 0 }, "Better than silence, but recognition is best given in the moment."),
      ],
    },
    {
      id: "lead-conflict",
      title: "Two colleagues are not speaking",
      story: "Two of your people had a disagreement and now avoid each other, which is slowing a joint task.",
      choices: [
        c("Speak to each privately, then bring them together to agree how they will work.", { morale: 8, delivery: 6, trust: 2, compliance: 0 }, "Listening first, then a facilitated agreement, usually works."),
        c("Wait and hope it passes.", { morale: -4, delivery: -6, trust: -2, compliance: 0 }, "Unaddressed conflict usually grows and slows the work."),
        c("Reassign one of them so they never work together.", { morale: -6, delivery: -2, trust: 0, compliance: 0 }, "It avoids the problem rather than solving it."),
      ],
    },
  ],
};
