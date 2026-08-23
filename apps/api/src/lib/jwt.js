import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export function generateAccessToken(user) {
  return jwt.sign(user, SECRET, { expiresIn: "15m" });
}

export function generateRefreshToken(user) {
  return jwt.sign(user, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch (error) {
    const invalidTokenError = new Error("Invalid refresh token");
    invalidTokenError.code = "INVALID_REFRESH_TOKEN";
    throw invalidTokenError;
  }
}
