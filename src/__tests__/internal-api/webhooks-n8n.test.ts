import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import crypto from "crypto";

import { POST } from "@/app/api/webhooks/n8n/route";

function signBody(body: string, secret: string): string {
  return "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");
}

const SECRET = process.env.N8N_WEBHOOK_SECRET!;

function makeRequest(body: object, overrideSignature?: string) {
  const bodyStr = JSON.stringify(body);
  const sig = overrideSignature ?? signBody(bodyStr, SECRET);
  return new NextRequest("http://localhost/api/webhooks/n8n", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-n8n-signature": sig,
    },
    body: bodyStr,
  });
}

describe("POST /api/webhooks/n8n", () => {
  it("returns 401 when signature is missing", async () => {
    const req = new NextRequest("http://localhost/api/webhooks/n8n", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "test", tenantId: "t1", payload: {} }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 401 when signature is invalid", async () => {
    const res = await POST(makeRequest({ action: "test", tenantId: "t1", payload: {} }, "sha256=invalid"));
    expect(res.status).toBe(401);
  });

  it("returns 200 for valid signed payload", async () => {
    const res = await POST(makeRequest({ action: "conversation.updated", tenantId: "t1", payload: {} }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("returns 422 for valid signature but missing action", async () => {
    const res = await POST(makeRequest({ tenantId: "t1", payload: {} }));
    expect(res.status).toBe(422);
  });
});
