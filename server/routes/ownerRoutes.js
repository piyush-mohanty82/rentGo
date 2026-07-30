import express from "express";
import { protect } from "../middleware/auth";
import { changeRoleToOwner } from "../controllers/ownerController";

const ownerRouter = express.Router();

ownerRouter.post("/change-role",protect,changeRoleToOwner)

export default ownerRouter;