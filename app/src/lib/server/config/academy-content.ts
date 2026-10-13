import { COMPLIANCE_COURSES } from "./academy/compliance";
import { CULTURE_COURSES } from "./academy/culture";
import { CX_COURSES } from "./academy/cx";
import { EXTRA } from "./academy/extra";
import { MORE_COURSES } from "./academy/more";
import { PRODUCT_COURSES_A } from "./academy/products-a";
import { PRODUCT_COURSES_B } from "./academy/products-b";

/**
 * The built-in Meristem Academy, imported from the NEO Slides 2024 folder (see docs/ACADEMY-IMPORT.md). It is
 * a starting point: the admin reviews and edits every course, lesson and question under Admin → Academy, and
 * can move courses between groups or take them out of a group. The settings and groups below are the Academy
 * setting; the courses are copied into the Academy's own records the first time it is used.
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
};

export const BUILTIN_COURSES = [...CULTURE_COURSES, ...COMPLIANCE_COURSES, ...PRODUCT_COURSES_A, ...PRODUCT_COURSES_B, ...CX_COURSES, ...MORE_COURSES].map((c) => {
  const x = EXTRA[c.id];
  return x ? { ...c, scenarios: [...c.scenarios, ...x.scenarios], cases: [...c.cases, ...x.cases] } : c;
});
