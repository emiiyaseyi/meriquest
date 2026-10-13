import { CULTURE_COURSES } from "./academy/culture";

/**
 * The built-in Meristem Academy, imported from the NEO Slides 2024 folder (see docs/ACADEMY-IMPORT.md). It is
 * a starting point: the admin reviews and edits every course, lesson and question in Settings → Meristem
 * Academy, and can move courses between groups or take them out of a group.
 */
export const DEFAULT_ACADEMY = {
  settings: { classSeconds: 30, classMinutes: 45, quizSize: 7, passCorrect: 5, retryMinutes: 5, classesPerDay: 2, lessonPoints: [2, 4, 6] as [number, number, number], scenarioPoints: 3 },
  groups: [
    { id: "culture", label: "Culture", icon: "🌱" },
    { id: "compliance", label: "Compliance", icon: "🛡️" },
    { id: "products", label: "Products and Services", icon: "💼" },
    { id: "cx", label: "Customer Experience", icon: "💬" },
    { id: "more", label: "More to learn", icon: "📚" },
  ],
  courses: [...CULTURE_COURSES],
};
