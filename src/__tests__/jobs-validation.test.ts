// ============================================================================
// CareerPilot AI — Job Validation Schema Tests
// ============================================================================

import { describe, it, expect } from "vitest";
import { JobCreateSchema, JobUpdateSchema } from "@/lib/validation/schemas";

// ---------------------------------------------------------------------------
// JobCreateSchema
// ---------------------------------------------------------------------------

describe("JobCreateSchema", () => {
  const validInput = {
    title: "Software Engineer",
    company: "Acme",
  };

  it("accepts minimal valid input", () => {
    const result = JobCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("applies defaults for optional fields", () => {
    const result = JobCreateSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.location).toBe("");
      expect(result.data.url).toBeNull();
      expect(result.data.description).toBe("");
      expect(result.data.source).toBe("manual");
      expect(result.data.employmentType).toBe("full-time");
      expect(result.data.salary).toBe("");
      expect(result.data.skills).toEqual([]);
      expect(result.data.requirements).toBe("");
      expect(result.data.postedAt).toBeNull();
      expect(result.data.deadline).toBeNull();
    }
  });

  it("rejects missing title", () => {
    const result = JobCreateSchema.safeParse({ company: "Acme" });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = JobCreateSchema.safeParse({
      title: "",
      company: "Acme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing company", () => {
    const result = JobCreateSchema.safeParse({ title: "Engineer" });
    expect(result.success).toBe(false);
  });

  it("rejects empty company", () => {
    const result = JobCreateSchema.safeParse({
      title: "Engineer",
      company: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects title over 300 characters", () => {
    const result = JobCreateSchema.safeParse({
      title: "A".repeat(301),
      company: "Acme",
    });
    expect(result.success).toBe(false);
  });

  it("rejects company over 200 characters", () => {
    const result = JobCreateSchema.safeParse({
      title: "Engineer",
      company: "A".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects description over 50000 characters", () => {
    const result = JobCreateSchema.safeParse({
      title: "Engineer",
      company: "Acme",
      description: "A".repeat(50001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid URL", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      url: "https://example.com/job/123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts null URL", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      url: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts skills array", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      skills: ["React", "TypeScript"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skills).toEqual(["React", "TypeScript"]);
    }
  });

  it("rejects more than 50 skills", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      skills: Array.from({ length: 51 }, (_, i) => `Skill ${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 50 skills", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      skills: Array.from({ length: 50 }, (_, i) => `Skill ${i}`),
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid employment type", () => {
    for (const type of ["full-time", "part-time", "contract", "internship"]) {
      const result = JobCreateSchema.safeParse({
        ...validInput,
        employmentType: type,
      });
      expect(result.success).toBe(true);
    }
  });

  it("accepts null deadline", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      deadline: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts date string as deadline", () => {
    const result = JobCreateSchema.safeParse({
      ...validInput,
      deadline: "2026-09-15",
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// JobUpdateSchema
// ---------------------------------------------------------------------------

describe("JobUpdateSchema", () => {
  it("accepts partial updates", () => {
    const result = JobUpdateSchema.safeParse({ title: "New Title" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (no changes)", () => {
    const result = JobUpdateSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts title update", () => {
    const result = JobUpdateSchema.safeParse({ title: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts company update", () => {
    const result = JobUpdateSchema.safeParse({ company: "NewCo" });
    expect(result.success).toBe(true);
  });

  it("accepts location update", () => {
    const result = JobUpdateSchema.safeParse({ location: "NYC" });
    expect(result.success).toBe(true);
  });

  it("accepts skills update", () => {
    const result = JobUpdateSchema.safeParse({
      skills: ["Go", "Rust"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts deadline update", () => {
    const result = JobUpdateSchema.safeParse({ deadline: "2026-10-01" });
    expect(result.success).toBe(true);
  });

  it("accepts null deadline", () => {
    const result = JobUpdateSchema.safeParse({ deadline: null });
    expect(result.success).toBe(true);
  });

  it("does NOT allow status update (server-controlled)", () => {
    // status was intentionally removed from JobUpdateSchema
    // in STEP 25.3 P2 hardening
    const result = JobUpdateSchema.safeParse({ status: "applied" });
    // With strict() this would be rejected; without it, the extra field is silently ignored
    // Either way, the API route should not pass status to updateJob
    expect(result.success).toBe(true); // Zod ignores unknown fields by default
    if (result.success) {
      expect(result.data).not.toHaveProperty("status");
    }
  });

  it("rejects title that is too long", () => {
    const result = JobUpdateSchema.safeParse({ title: "A".repeat(301) });
    expect(result.success).toBe(false);
  });

  it("rejects empty title", () => {
    const result = JobUpdateSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });
});
