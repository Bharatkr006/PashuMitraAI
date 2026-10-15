import { Router, Request, Response } from "express";
import { findOrCreateUser, getUserByEmail } from "../core/users.js";

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/auth/login
 * Body: { email: string, name?: string }
 * Checks if user exists. If not, automatically creates the user, then signs them in.
 */
router.post("/login", (req: Request, res: Response) => {
  try {
    const { email, name } = req.body || {};

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        error: "कृपया एक मान्य ईमेल दर्ज करें (Please provide a valid email address)",
      });
      return;
    }

    const { user, isNewUser } = findOrCreateUser(email, name);

    res.json({
      success: true,
      user,
      isNewUser,
      message: isNewUser
        ? "नया खाता बनाया गया और लॉगिन सफल रहा (Account created & signed in successfully)"
        : "लॉगिन सफल रहा (Signed in successfully)",
    });
  } catch (err) {
    console.error("Auth login error:", err);
    res.status(500).json({
      success: false,
      error: "लॉगिन प्रक्रिया में त्रुटि हुई (Login processing failed)",
    });
  }
});

/**
 * GET /api/auth/me
 * Retrieves current user profile by email query param or header
 */
router.get("/me", (req: Request, res: Response) => {
  try {
    const email = (req.query.email as string) || (req.headers["x-user-email"] as string);
    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
      res.status(400).json({
        success: false,
        error: "ईमेल आवश्यक है (Email is required)",
      });
      return;
    }

    const user = getUserByEmail(email.trim());
    if (!user) {
      res.status(404).json({
        success: false,
        error: "उपयोगकर्ता नहीं मिला (User not found)",
      });
      return;
    }

    res.json({
      success: true,
      user,
    });
  } catch (err) {
    console.error("Auth me error:", err);
    res.status(500).json({
      success: false,
      error: "उपयोगकर्ता प्राप्त करने में त्रुटि (Failed to retrieve user profile)",
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post("/logout", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "सफलतापूर्वक लॉगआउट किया गया (Logged out successfully)",
  });
});

export default router;
