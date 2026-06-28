import mongoose, { isValidObjectId } from "mongoose"
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { page = 1, limit = 10 } = req.query

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid videoId")
    }

    const comments = await Comment.aggregatePaginate(
        Comment.aggregate([

            {
                $match: {
                    video: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "commentLikes"
                }
            },
            {
                $addFields: {
                    ownerDetails: {
                        $first: "$ownerDetails"
                    },
                    totalLikes: {
                        $size: "$commentLikes"
                    },
                    isLiked: {
                        $cond: {
                            if: { $in: [req.user?._id, "$commentLikes.likedBy"] },
                            then: true,
                            else: false
                        }
                    },
                    isOwner: {
                        $cond: {
                            if: { $eq: [req.user?._id, "$owner"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $project: {
                    content: 1,
                    ownerDetails: 1,
                    totalLikes: 1,
                    isLiked: 1,
                    isOwner: 1,
                    createdAt: 1
                }
            }
        ]),
        {
            page: parseInt(page),
            limit: parseInt(limit)
        }
    )

    if (!comments?.totalDocs) {
        throw new ApiError(404, "No comments found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, comments, "Comments fetched successfully")
        )

})

const addComment = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Write something to add a comment")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(404, "VideoId invalid");
    }

    const comment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId
    })

    if (!comment) {
        throw new ApiError(500, "Server Error: Unable to add a comment try again")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, comment, "Comment added successfully")
        )
})

const updateComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params
    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Write something to update a comment")
    }

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "CommentId invaid");
    }

    const comment = await Comment.findById(commentId)

    if (req.user?._id.toString() !== comment?.owner.toString()) {
        throw new ApiError(403, "Only ower can update")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content
            }
        },
        {
            new: true
        }
    )

    if (!updatedComment) {
        throw new ApiError(500, "Server Error: Failed to edit comment please try again");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedComment, "Comment updated successfully")
        )
})

const deleteComment = asyncHandler(async (req, res) => {

    const { commentId } = req.params


    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "CommentId invalid")
    }

    if(req.user?._id.toString() !== comment?.owner.toString()){
        throw new ApiError(403, "Only owner can delete comment")
    }

    await Comment.findByIdAndDelete(commentId)

    await Like.findByIdAndDelete(commentId)

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    )
})

export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}