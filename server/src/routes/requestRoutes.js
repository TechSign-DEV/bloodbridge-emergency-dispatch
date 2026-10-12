import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import {
  createBloodRequest,
  getMyBloodRequests,
  getBloodRequestById,
  retryDispatch,
  cancelBloodRequest,
} from "../controllers/requestController.js";

const router = Router();
router.use(requireAuth, requireRole("hospital"));

router.post("/", createBloodRequest);
router.get("/mine", getMyBloodRequests);
router.get("/:requestId", getBloodRequestById);
router.post("/:requestId/dispatch", retryDispatch);
router.patch("/:requestId/cancel", cancelBloodRequest);

export default router;
