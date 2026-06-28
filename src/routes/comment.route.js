import { Router } from "express";
import { verifyJWT, } from "../middleware/auth.middleware.js"
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";

const router = Router()

router.use(verifyJWT)

router.route("/c/:commentId")
    .post(updateComment)
    .delete(deleteComment)

router.route("/v/:videoId")
   .post(addComment)
   .get(getVideoComments)
      
export default router