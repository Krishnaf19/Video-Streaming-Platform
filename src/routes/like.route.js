import { Router } from "express";
import { verifyJWT, } from "../middleware/auth.middleware.js"
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/like.controller.js";

const router = Router()

router.use(verifyJWT)

router.route("/v/:videoId").post(toggleVideoLike)
router.route("/c/:commentId").post(toggleCommentLike)
router.route("/t/:tweetId").post(toggleTweetLike)
router.route("/videos").get(getLikedVideos)

export default router