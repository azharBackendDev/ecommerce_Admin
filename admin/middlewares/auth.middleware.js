import { verifyToken } from "../services/jwt.services.js";

export const authAdminMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.AccessToken;
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin access only" });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};


export const authSuperAdminMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.AccessToken;
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET);

    if (decoded.role !== "superAdmin") {
      return res.status(403).json({ message: "Super Admin access only" });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};


