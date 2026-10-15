import { describe, it, expect } from "vitest";
import { findOrCreateUser, getUserByEmail, getUserById } from "../src/core/users.js";

describe("Users & Auth", () => {
  it("creates user when entering an email", () => {
    const testEmail = `farmer_${Date.now()}@example.com`;
    const result = findOrCreateUser(testEmail, "Ramesh Patel");

    expect(result.isNewUser).toBe(true);
    expect(result.user).toBeDefined();
    expect(result.user.id).toBeGreaterThan(0);
    expect(result.user.email).toBe(testEmail.toLowerCase());
    expect(result.user.name).toBe("Ramesh Patel");
  });

  it("signs in existing user on subsequent calls and matches case-insensitively", () => {
    const testEmail = `kisan_${Date.now()}@test.org`;
    const first = findOrCreateUser(testEmail, "Suresh");
    expect(first.isNewUser).toBe(true);

    // Call again with uppercase version of the same email
    const second = findOrCreateUser(testEmail.toUpperCase());
    expect(second.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(second.user.email).toBe(testEmail.toLowerCase());
  });

  it("formats default name from email if no name is provided", () => {
    const testEmail = `manoj.kumar.${Date.now()}@pashumitra.in`;
    const res = findOrCreateUser(testEmail);
    expect(res.user.name).toContain("Manoj Kumar");
  });

  it("retrieves user by id and email", () => {
    const testEmail = `priya_${Date.now()}@dairy.com`;
    const { user } = findOrCreateUser(testEmail, "Priya Sharma");

    const fetchedByEmail = getUserByEmail(testEmail);
    expect(fetchedByEmail).toBeDefined();
    expect(fetchedByEmail?.id).toBe(user.id);

    const fetchedById = getUserById(user.id);
    expect(fetchedById).toBeDefined();
    expect(fetchedById?.email).toBe(testEmail.toLowerCase());
  });
});
