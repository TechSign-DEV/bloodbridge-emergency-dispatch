import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  getMyDonorProfile,
  updateAvailability,
  updateDonorLocation,
  getDonorNotifications,
  respondToNotification,
  getDonorHistory,
} from "../controllers/donorController.js";

const router = Router();
router.use(requireAuth, requireRole("donor"));

router.get("/me", getMyDonorProfile);
router.patch("/me/availability", updateAvailability);
router.patch("/me/location", updateDonorLocation);
router.get("/notifications", getDonorNotifications);
router.get("/history", getDonorHistory);
router.patch("/notifications/:notificationId/respond", respondToNotification);

export default router;
