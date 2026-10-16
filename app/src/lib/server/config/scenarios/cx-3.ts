import { ch, sit } from "../scenario-kit";

/** Customer Experience, batch 3: requests that colleagues bring to the person at their desk (they arrive as visitors). Drafts for Compliance review. */
export const CX_3 = [
  sit("cx-i-vip-queue", ["cx"], "Your manager wants a VIP to skip the queue", "Your manager walks over: 'Mr Adeleke is on the board of a big client. Take him straight to the front, ahead of the people who have been waiting an hour.'", "client-care", [
    ch("best", "Greet Mr Adeleke warmly, offer him a seat and a realistic wait, and tell your manager you will serve him as soon as the person at the counter is done. Offer the same courtesy to those waiting.", "Being warm to a VIP is fine. Quietly serving him first, at others' expense, is not.", [
      "he is looked after, and nobody is pushed aside",
      [["Today", "Mr Adeleke gets a seat, a drink and an honest wait. Those waiting see the queue is fair."], ["This week", "Your manager sees that the VIP was happy and nobody complained."], ["This month", "Clients who watched the queue stay fair keep coming."]],
      [["Client", "good", "everyone, including the VIP, treated well"], ["Firm", "good", "a fair queue"], ["You", "good", "you stayed polite and fair under pressure"]],
    ]),
    ch("partly", "Do as your manager says, but apologise quietly to the person you pass.", "You are kind about it, but you still put one client ahead of others because of who he is.", [
      "the queue is jumped, with an apology",
      [["Today", "The VIP is served first. The person you passed accepts your apology, but is not pleased."], ["This week", "Another client posts about 'the queue not being a queue'."], ["This month", "Clients start to wonder how the firm treats them."]],
      [["Client", "mixed", "some feel second-class"], ["Firm", "mixed", "a fairness complaint"]],
    ]),
    ch("wrong", "Take him straight to the front without a word to the people waiting.", "Treating one client better because of his title, without telling anyone, is unfair, and the others will notice.", [
      "an hour's wait is ignored, and everyone saw",
      [["Today", "Mr Adeleke is served first. The people waiting are silent, then angry."], ["This week", "Two of them complain in writing about unequal treatment."], ["This month", "The complaint mentions a manager's instruction. The firm has to explain why one client was served ahead of others."]],
      [["Client", "bad", "waiting clients feel worthless"], ["Firm", "bad", "an unequal-treatment complaint"], ["You", "mixed", "you followed an instruction you should have questioned"]],
    ], { follow: [6, "✉️", "Two clients who were waiting have written to complain that another client was served ahead of them without explanation.", "bad"] }),
  ], { internal: true }),

  sit("cx-i-client-list", ["cx"], "A colleague wants the client list for a campaign", "A colleague from another team asks you to export the contact details of your clients 'for a quick promotion I am running for my own side business'. He says it will take two minutes.", "compliance", [
    ch("best", "Decline, explain that client data can only be used for the purposes clients agreed to, and tell him the proper route is through Marketing and the Data Protection Officer. Mention the request to your manager.", "Client data is not yours to share, even with a colleague. A personal business use is a clear no.", [
      "client data stays protected, and the request is on record",
      [["Today", "You say no kindly and explain why."], ["This week", "Your manager is told, and the colleague gets a conversation about data use."], ["This month", "Clients' phone numbers are never used for something they did not agree to."]],
      [["Client", "good", "their details stay private"], ["Firm", "good", "a data-protection risk avoided"], ["You", "good", "you protected clients and said so"]],
    ]),
    ch("partly", "Tell him no, but say nothing to anyone.", "Right answer, but a person who asks once may ask someone less careful.", [
      "the list stays safe today, but the request is not recorded",
      [["Today", "You refuse."], ["This week", "He asks someone else, who agrees."], ["This month", "Clients start getting calls from a stranger's business. Your refusal was never recorded."]],
      [["Firm", "bad", "a leak that could have been stopped"], ["You", "mixed", "you refused, but did not report"]],
    ]),
    ch("wrong", "Export it for him: he is a colleague and it is only phone numbers.", "Phone numbers and names are personal data. Giving them out for a personal business is a breach.", [
      "clients' details are used for someone's side business",
      [["Today", "The list is sent."], ["This week", "Clients start receiving unwanted calls and messages, and ask where their numbers came from."], ["This month", "A complaint reaches the data protection officer. Tracing the export leads straight to you."]],
      [["Client", "bad", "their privacy has been breached"], ["Firm", "bad", "a data breach and possible regulatory action"], ["You", "bad", "named in the investigation"]],
    ], { follow: [6, "🚨", "Clients have started to complain about unwanted calls and messages from someone outside the firm. The Data Protection Officer is tracing where their numbers came from.", "bad"] }),
  ], { internal: true }),

  sit("cx-i-compliance-spot", ["cx"], "Compliance asks to see your call notes", "Someone from Compliance stops by: 'We do spot checks. Can I see your call notes for last month?' You notice you missed logging three calls.", "compliance", [
    ch("best", "Show them what you have, tell them honestly which three calls were not logged, and add the missing notes clearly marked as written late.", "Honesty with Compliance is non-negotiable. Late notes, marked as late, are far better than invented ones.", [
      "an honest gap is found and closed, nobody is misled",
      [["Today", "You show your notes and point out the missing calls yourself."], ["This week", "Compliance records a minor note-keeping gap and agrees to your late entries."], ["This month", "You build the habit of logging after every call. Compliance trusts your records."]],
      [["Client", "good", "records that can be relied on"], ["Firm", "good", "an honest spot check"], ["You", "good", "trusted for being straight"]],
    ]),
    ch("partly", "Show only what you have and say nothing about the missing three.", "You have not lied, but you let them think the record is complete.", [
      "an incomplete record is allowed to look complete",
      [["Today", "The check finishes with no comment."], ["This week", "A client disputes one of the missing calls."], ["This month", "When the gap shows up in a dispute, it looks as if you knew and said nothing."]],
      [["Client", "mixed", "a dispute with nothing in writing"], ["You", "mixed", "silence that looks like concealment"]],
    ]),
    ch("wrong", "Quickly write the three notes now and backdate them to the day of each call.", "Backdating records is falsifying them. It is a far more serious matter than a missing note.", [
      "a gap in the notes becomes a falsified record",
      [["Today", "The notes look complete."], ["This week", "System entry times show all three were written today."], ["This month", "Backdating is treated as falsification of records. It can end a career, and in some cases it has to be reported outside the firm."]],
      [["Client", "bad", "records that cannot be trusted"], ["Firm", "bad", "falsified records on file"], ["You", "bad", "a serious conduct investigation"]],
    ], { follow: [6, "🚨", "Compliance has noticed that three call notes were created today but carry earlier dates. They would like to speak to you about them.", "bad"] }),
  ], { internal: true }),

  sit("cx-i-share-login", ["cx"], "A new joiner asks to use your login", "A new joiner, whose access has not come through yet, asks: 'Can I just use your login for today? Everyone does it. My first week will be wasted otherwise.'", "digital-tools", [
    ch("best", "Say no kindly, chase the access request with IT, suggest they shadow you meanwhile, and tell your manager the access is late so a first week is not wasted.", "Everything done on your login is you. Help them in a way that does not use it.", [
      "the new joiner is helped, and your login stays yours",
      [["Today", "You raise the access request with IT and let them shadow you. They learn plenty."], ["This week", "Access arrives. Your manager hears that the process was slow and acts on it."], ["This month", "The new joiner remembers that you were kind and careful."]],
      [["Team", "good", "a new joiner welcomed and supported"], ["Firm", "good", "audit trail intact"], ["You", "good", "your login and your name are safe"]],
    ]),
    ch("partly", "Let them watch you work on your screen, then walk away from your desk for a while.", "You did not share your password, but you left a signed-in session open.", [
      "not shared, but not secured",
      [["Today", "You step away. They are alone at your logged-in screen."], ["This week", "A transaction is made on your login while you were out."], ["This month", "You must explain who made it. Leaving a session open is treated as sharing it."]],
      [["Team", "mixed", "a new joiner who made a mistake"], ["You", "bad", "responsible for what was done in your name"]],
    ]),
    ch("wrong", "Give them your login and password for the day.", "Shared logins destroy the audit trail. Anything they do is recorded as you.", [
      "someone else acts in your name",
      [["Today", "They work all day on your login."], ["This week", "They make a mistake on a client's account. The system says it was you."], ["This month", "Sharing credentials is a breach of security policy. You are responsible for everything done on your login."]],
      [["Client", "bad", "an error traced to the wrong person"], ["Firm", "bad", "a security breach"], ["You", "bad", "a formal warning is likely"]],
    ], { follow: [6, "⚠️", "Information Security has seen your login used from two desks at once. They have asked you to explain.", "bad"] }),
  ], { internal: true }),

  sit("cx-i-close-complaints", ["cx"], "Close these complaints by Friday", "Your manager hands you eight open complaints: 'Close them by Friday. Do not bother calling the clients, just mark them as resolved. The target is what counts.'", "client-care", [
    ch("best", "Say you will do everything possible by Friday, but that you cannot mark a complaint resolved without the client's agreement. Show your manager which ones can close honestly and which need more time.", "A closed complaint must really be closed. Give your manager the honest picture, not the number.", [
      "the numbers are honest, and the target conversation is too",
      [["Today", "You sort the eight: three can close properly, five need calls."], ["This week", "You ring the clients. Four close with their agreement."], ["This month", "Your manager reports an honest figure and discusses the remaining ones, instead of hiding them."]],
      [["Client", "good", "complaints really resolved"], ["Firm", "good", "honest complaint figures"], ["You", "good", "you protected clients and your manager from a false number"]],
    ]),
    ch("partly", "Close the three easy ones and leave the rest without telling your manager.", "You did what you could honestly, but you left your manager with a wrong picture of the target.", [
      "partly done, and nobody knows why",
      [["Today", "Three are closed, five are not."], ["This week", "Your manager discovers five open complaints she thought were closed."], ["This month", "A surprise in a report is worse than an honest warning."]],
      [["Client", "mixed", "five clients still waiting"], ["You", "mixed", "an honest effort, but not communicated"]],
    ]),
    ch("wrong", "Mark all eight as resolved without calling anyone.", "Closing a complaint the client has not accepted is false reporting, and the complaint comes back.", [
      "complaints are closed on paper only",
      [["Today", "The target is met."], ["This week", "Three clients write in again, annoyed that they were told it was resolved."], ["This month", "Complaint figures are reported to senior management, and an audit finds complaints closed with no client contact."]],
      [["Client", "bad", "told it is resolved when it is not"], ["Firm", "bad", "false complaint figures"], ["You", "bad", "your name is on every closure"]],
    ], { follow: [7, "🚨", "Internal Audit has found complaints marked resolved with no contact with the client. They are asking who closed them.", "bad"] }),
  ], { internal: true }),

  sit("cx-i-ops-mistake", ["cx"], "Operations made a mistake and asks you to say nothing", "A colleague from Operations tells you quietly that they booked a client's sale at the wrong price last week, so the client is short by ₦120,000. 'Please do not tell him yet. We will fix it next month.'", "compliance", [
    ch("best", "Tell her that you cannot stay silent, because the client is owed the difference, and agree to raise it together with your manager and Compliance so the client is told and paid correctly.", "A known error that harms a client has to be put right and disclosed, not kept quiet.", [
      "the error is disclosed and corrected, and the client is paid what he is owed",
      [["Today", "You and your colleague take it to your managers. The client's correct amount is worked out."], ["This week", "The client is told, apologised to, and paid the difference."], ["This month", "The firm's reputation for honesty is stronger. The booking process is checked."]],
      [["Client", "good", "paid what he is owed, and told the truth"], ["Firm", "good", "an error disclosed and fixed"], ["Team", "good", "a colleague helped to do the right thing"]],
    ]),
    ch("partly", "Say you will keep quiet this time, but ask her to fix it as soon as possible.", "You mean well, but you have agreed to hide an error that is costing a client money.", [
      "a promise to hide, with a promise to fix",
      [["Today", "You say nothing to the client."], ["This week", "The fix does not happen. The error is forgotten."], ["This month", "A reconciliation finds it. The client is told months late, and you knew."]],
      [["Client", "bad", "out of pocket for longer than he should be"], ["Firm", "bad", "a late-disclosed error"], ["You", "bad", "you knew and did not report"]],
    ]),
    ch("wrong", "Agree to say nothing, and tell the client his sale went through correctly if he asks.", "Telling the client something false about his own money is deception.", [
      "a client is told something untrue about his money",
      [["Today", "You say nothing, and later reassure him."], ["This week", "He spots the price difference on his statement and asks again."], ["This month", "The firm has to admit the error, and also what you told him."]],
      [["Client", "bad", "lied to about his own money"], ["Firm", "bad", "an error and a cover-up"], ["You", "bad", "a conduct investigation"]],
    ], { follow: [6, "⚠️", "A client has noticed a price difference on his statement and says you told him it went through correctly. Compliance wants to hear what you knew.", "bad"] }),
  ], { internal: true }),

  sit("cx-i-handover", ["cx"], "A colleague hands you an angry client", "A colleague about to go on leave hands you a file: 'This client is furious. I told him you would sort it. My notes are a bit thin.' The client arrives within the hour.", "client-care", [
    ch("best", "Read the file and the system history quickly, ask your colleague two or three key questions before she leaves, greet the client, summarise what you understand and ask him to correct you.", "A good handover is asked for, not hoped for. Start by showing him you know his story.", [
      "the client is met with understanding, and the handover works",
      [["Today", "You ask your colleague what she knows, read the history, and open with a short, accurate summary."], ["This week", "He feels heard and is helped. You follow up as promised."], ["This month", "A furious client becomes a regular, and the handover practice improves."]],
      [["Client", "good", "does not have to repeat his story"], ["Team", "good", "a smooth handover"], ["You", "good", "prepared under time pressure"]],
    ]),
    ch("partly", "Greet him and ask him to explain everything from the beginning.", "He is now telling the story for the third time, and he is already angry.", [
      "he is made to start again",
      [["Today", "He repeats everything with growing frustration."], ["This week", "You fix it, but he comments that nobody seemed to know his case."], ["This month", "He gives a lower rating than the fix deserved."]],
      [["Client", "mixed", "helped, but annoyed"], ["Team", "mixed", "a handover that did not carry the story"]],
    ]),
    ch("wrong", "Tell him your colleague has left and the matter is no longer your responsibility.", "A handover means the matter is now yours. Blaming a colleague who is not there makes it worse.", [
      "a promise by the firm is dropped",
      [["Today", "He is told his case is nobody's right now."], ["This week", "He writes to the Head of Client Service, mentioning that he was promised help."], ["This month", "The complaint names two staff: the colleague who promised, and you who refused."]],
      [["Client", "bad", "feels abandoned"], ["Firm", "bad", "a formal complaint"], ["You", "bad", "named in the complaint"]],
    ], { follow: [6, "✉️", "A client has written to the Head of Client Service to say he was passed from one person to another and told that nobody was responsible for his case.", "bad"] }),
  ], { internal: true }),
];
