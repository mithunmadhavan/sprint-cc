const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, USER_ROLES } = require("../models/User");

const ETIHAD_DOMAIN = "etihad.ae";
const ADMIN_BOOTSTRAP_EMAIL = "mithunpramilak@etihad.ae";
const ADMIN_BOOTSTRAP_PASSWORD = "Admin@1234";
const JWT_DEFAULT_SECRET = "change-this-in-production";

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeName(name, email) {
  return usernameFromEmail(email);
}

function usernameFromEmail(email) {
  const local = normalizeEmail(email).split("@")[0] || "viewer";
  return local;
}

function assertEtihadEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized.endsWith(`@${ETIHAD_DOMAIN}`)) {
    const err = new Error("Only @etihad.ae email addresses are allowed");
    err.statusCode = 403;
    throw err;
  }
  return normalized;
}

function jwtSecret() {
  return process.env.JWT_SECRET || JWT_DEFAULT_SECRET;
}

function userToSafe(userDoc) {
  return {
    id: String(userDoc._id),
    username: userDoc.username,
    name: userDoc.name,
    firstName: userDoc.firstName || "",
    lastName: userDoc.lastName || "",
    email: userDoc.email,
    role: userDoc.role,
    isActive: userDoc.isActive,
    assignedTeams: Array.isArray(userDoc.assignedTeams) ? userDoc.assignedTeams : [],
    okta_id: userDoc.okta_id || "",
  };
}

function buildToken(userDoc) {
  const payload = {
    sub: String(userDoc._id),
    email: userDoc.email,
    role: userDoc.role,
    assignedTeams: Array.isArray(userDoc.assignedTeams) ? userDoc.assignedTeams : [],
  };

  return jwt.sign(payload, jwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || "12h" });
}

async function ensureDefaultAdminUser() {
  const email = ADMIN_BOOTSTRAP_EMAIL;
  const username = usernameFromEmail(email);
  const existing = await User.findOne({ email });
  if (existing) {
    if (
      existing.role !== USER_ROLES.ADMIN
      || !existing.isActive
      || existing.username !== username
      || existing.name !== username
      || existing.firstName !== ""
      || existing.lastName !== ""
    ) {
      existing.role = USER_ROLES.ADMIN;
      existing.isActive = true;
      existing.username = username;
      existing.name = username;
      existing.firstName = "";
      existing.lastName = "";
      await existing.save();
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(ADMIN_BOOTSTRAP_PASSWORD, 10);
  return User.create({
    username,
    name: username,
    firstName: "",
    lastName: "",
    email,
    password: passwordHash,
    role: USER_ROLES.ADMIN,
    isActive: true,
    assignedTeams: [],
    okta_id: "",
  });
}

async function signIn({ email, password, name }) {
  const normalizedEmail = assertEtihadEmail(email);
  const providedPassword = String(password || "").trim();

  if (!providedPassword) {
    const err = new Error("Password is required");
    err.statusCode = 400;
    throw err;
  }

  await ensureDefaultAdminUser();

  let user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    const username = usernameFromEmail(normalizedEmail);
    const passwordHash = await bcrypt.hash(providedPassword, 10);
    user = await User.create({
      username,
      name: normalizeName(name, normalizedEmail),
      firstName: "",
      lastName: "",
      email: normalizedEmail,
      password: passwordHash,
      role: USER_ROLES.VIEWER,
      isActive: true,
      assignedTeams: [],
      okta_id: "",
    });
  } else {
    const isValid = await bcrypt.compare(providedPassword, user.password);
    if (!isValid) {
      const err = new Error("Invalid email or password");
      err.statusCode = 401;
      throw err;
    }

    const expectedUsername = usernameFromEmail(normalizedEmail);
    if (user.username !== expectedUsername || user.name !== expectedUsername) {
      user.username = expectedUsername;
      user.name = expectedUsername;
      user.firstName = "";
      user.lastName = "";
      await user.save();
    }
  }

  if (!user.isActive) {
    const err = new Error("User account is disabled");
    err.statusCode = 403;
    throw err;
  }

  return {
    token: buildToken(user),
    user: userToSafe(user),
  };
}

async function getUserById(id) {
  if (!id) return null;
  const user = await User.findById(id).lean();
  return user ? userToSafe(user) : null;
}

function verifyToken(token) {
  try {
    return jwt.verify(token, jwtSecret());
  } catch (_e) {
    const err = new Error("Invalid or expired token");
    err.statusCode = 401;
    throw err;
  }
}

module.exports = {
  ETIHAD_DOMAIN,
  USER_ROLES,
  signIn,
  getUserById,
  verifyToken,
  ensureDefaultAdminUser,
};



