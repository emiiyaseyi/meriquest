import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/server/auth/dal";
import { blankCourseJson, getCourseJson } from "@/lib/server/academy/content";
import { z } from "zod";
import { SchemaForm, type JS } from "@/components/SchemaForm";
import { courseSchema } from "@/lib/server/config/definitions";
import { saveCourseAction } from "@/app/admin/actions";

// The form is drawn from the course rules; the server checks every value against the same rules on save
const courseJsonSchema = JSON.parse(JSON.stringify(z.toJSONSchema(courseSchema, { unrepresentable: "any", io: "input" }))) as JS;

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireArea("academy");
  const { id } = await params;
  const isNew = id === "new";
  const json = isNew ? blankCourseJson() : await getCourseJson(admin, id);
  if (!json) notFound();
  return (
    <>
      <p><Link href="/admin/academy">← All courses</Link></p>
      <h1>{isNew ? "Add a course" : "Edit course"}</h1>
      <p className="muted">
        A course has lessons; each lesson has notes (paragraphs) and a bank of questions tagged level 1 (Easy), 2 (Medium) or 3 (Hard). Give every level at least seven questions so quizzes vary. Question and lesson ids must stay unique and should not change once people have started. The group must be one of the Academy groups, or empty.
      </p>
      <SchemaForm configKey={id} schema={courseJsonSchema} initial={JSON.parse(json)} initialJson={json} saveAction={saveCourseAction} />
    </>
  );
}
