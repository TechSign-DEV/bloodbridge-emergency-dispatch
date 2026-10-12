import { Router } from "express";
import { registerDonor, loginDonor, registerHospital, loginHospital } from "../controllers/authController.js";

const router = Router();

router.post("/donors/register", registerDonor);
router.post("/donors/login", loginDonor);
router.post("/hospitals/register", registerHospital);
router.post("/hospitals/login", loginHospital);

export default router;
