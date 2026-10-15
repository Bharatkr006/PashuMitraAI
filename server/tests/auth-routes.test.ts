import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";

describe("Auth Routes Integration", () => {
  const app = createApp();

  it("POST /api/auth/login returns 400 when email is invalid", async () => {
    // We can do a mock request or express handler invocation
    const req = {
      body: { email: "not-an-email" },
    };
    let responseStatus = 200;
    let responseJson: any = null;
    const res = {
      status: (code: number) => {
        responseStatus = code;
        return res;
      },
      json: (data: any) => {
        responseJson = data;
        return res;
      },
    };

    // Use app or import router directly
    const authRouter = (await import("../src/routes/auth.js")).default;
    // Find login route
    const layer = authRouter.stack.find((s: any) => s.route?.path === "/login");
    expect(layer).toBeDefined();

    layer.route.stack[0].handle(req, res);
    expect(responseStatus).toBe(400);
    expect(responseJson.success).toBe(false);
  });

  it("POST /api/auth/login creates user and logs in", async () => {
    const testEmail = `integration_${Date.now()}@test.com`;
    const req = {
      body: { email: testEmail, name: "Integration User" },
    };
    let responseJson: any = null;
    const res = {
      status: () => res,
      json: (data: any) => {
        responseJson = data;
        return res;
      },
    };

    const authRouter = (await import("../src/routes/auth.js")).default;
    const layer = authRouter.stack.find((s: any) => s.route?.path === "/login");
    layer.route.stack[0].handle(req, res);

    expect(responseJson).toBeDefined();
    expect(responseJson.success).toBe(true);
    expect(responseJson.isNewUser).toBe(true);
    expect(responseJson.user.email).toBe(testEmail.toLowerCase());
    expect(responseJson.user.name).toBe("Integration User");

    // Second login should be isNewUser: false
    let secondJson: any = null;
    const res2 = {
      status: () => res2,
      json: (data: any) => {
        secondJson = data;
        return res2;
      },
    };
    layer.route.stack[0].handle(req, res2);
    expect(secondJson.success).toBe(true);
    expect(secondJson.isNewUser).toBe(false);
    expect(secondJson.user.id).toBe(responseJson.user.id);
  });
});
