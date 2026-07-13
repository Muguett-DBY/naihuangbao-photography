import { describe, expect, it } from "vitest";
import { onRequestPost } from "./api/workshops/[id]/register";

type RecordedStatement = {
  sql: string;
  values: unknown[];
};

function createWorkshopDb(workshop: {
  id: string;
  max_participants: number;
  current_participants: number;
}) {
  const statements: RecordedStatement[] = [];

  const prepare = (sql: string) => ({
    bind: (...values: unknown[]) => {
      const statement = { sql, values };
      statements.push(statement);
      return {
        first: async () => sql.includes("from workshops") ? workshop : null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true, meta: { changes: 1 } }),
        statement,
      };
    },
  });

  return {
    statements,
    prepare,
    batch: async (queries: unknown[]) => queries.map(() => ({ success: true })),
  };
}

function registrationRequest() {
  return new Request("https://shoot.custard.top/api/workshops/workshop-123/register", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-nhb-public-action": "1",
    },
    body: JSON.stringify({
      name: "Lin",
      contact: "lin@example.com",
      participants: 2,
    }),
  });
}

describe("workshop registration capacity", () => {
  it("accepts registrations when an upcoming workshop has no participant limit", async () => {
    const db = createWorkshopDb({
      id: "workshop-123",
      max_participants: 0,
      current_participants: 12,
    });

    const response = await onRequestPost({
      request: registrationRequest(),
      env: { DB: db },
      params: { id: "workshop-123" },
    } as never);

    expect(response.status).toBe(201);
    expect(db.statements.some((entry) => entry.sql.includes("insert into workshop_registrations"))).toBe(true);
  });

  it("fails closed when stored participant limits are malformed", async () => {
    const db = createWorkshopDb({
      id: "workshop-123",
      max_participants: -1,
      current_participants: 0,
    });

    const response = await onRequestPost({
      request: registrationRequest(),
      env: { DB: db },
      params: { id: "workshop-123" },
    } as never);

    expect(response.status).toBe(503);
    expect(db.statements.some((entry) => entry.sql.includes("insert into workshop_registrations"))).toBe(false);
  });
});
