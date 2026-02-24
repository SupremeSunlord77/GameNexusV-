import express from "express";
import {
  upsertProfile,
  getMyProfile,
  getProfileByUserId
} from "../controllers/profileController";
import { authMiddleware } from "../middlewares/authMiddleware";
import { authenticated } from "../middlewares/roleMiddleware";

const router = express.Router();

// All profile routes require authentication
router.use(authMiddleware);
router.use(authenticated);

router.put("/me", upsertProfile);
router.get("/me", getMyProfile);
router.get("/:userId", getProfileByUserId);

export default router;