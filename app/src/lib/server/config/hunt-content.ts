/** The starting daily clues. Each one points to a room; finding the room earns Merit points. Admins can edit them under Settings. */
export const DEFAULT_HUNT = {
  settings: { fastMinutes: 30, pointsFast: 8, pointsLater: 4 },
  clues: [
    { id: "clue-lobby-1", clue: "Every visitor passes me first, and I never take a lunch break. Find the place where Meristem says hello.", scene: "ikoyi-lobby", hint: "Ground floor" },
    { id: "clue-lobby-2", clue: "Turnstiles hum, lifts wait, and a green wall wears our name. Where does a day at Ikoyi begin?", scene: "ikoyi-lobby", hint: "Where the lifts are" },
    { id: "clue-floor-1", clue: "Rows of green dividers, a hundred keyboards and the best coffee point on the floor. Where does the real work happen?", scene: "ikoyi-floor", hint: "Open space" },
    { id: "clue-floor-2", clue: "Where colleagues share a tip over a glass of water and the printer never sleeps.", scene: "ikoyi-floor", hint: "Open space" },
    { id: "clue-board-1", clue: "A long table, big decisions and a screen for every number. Find the room where the board meets.", scene: "ikoyi-boardroom", hint: "Through the door off the open floor" },
    { id: "clue-lounge-1", clue: "Soft chairs, calm talk and ideas that start over coffee. Find the lounge where leaders unwind.", scene: "ikoyi-lounge", hint: "Through the door off the open floor" },
    { id: "clue-home-1", clue: "A room with your name on the door, where you choose every plant and lamp. Find your own space.", scene: "my-workspace", hint: "The Workspace button" },
    { id: "clue-home-2", clue: "The only room in the building you decorate yourself. Go there and make it yours.", scene: "my-workspace", hint: "The Workspace button" },
  ],
};
