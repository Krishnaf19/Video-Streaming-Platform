import asyncHandler from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Like } from "../models/like.model.js"

const toggleVideoLike = asyncHandler(async (req, res) => {

    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "VideoId invalid")
    }

    const alreadyLiked = await Like.findOne({
        likedBy: req.user?._id,
        video: videoId
    })

    if(alreadyLiked){
        await Like.findByIdAndDelete(alreadyLiked?._id)

        return res
        .status(200)
        .json(
            new ApiResponse(200, {isLiked: false})
        )
    }

    await Like.create({
        likedBy: req.user?._id,
        video: videoId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, {isLiked: true})
    )
    
})

const toggleCommentLike = asyncHandler(async (req, res) => {

    const {commentId} = req.params
    
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "CommentId invalid")
    }

    const alreadyLiked = await Like.findOne({
        likedBy: req.user?._id,
        comment: commentId
    })

    if(alreadyLiked){
        await Like.findByIdAndDelete(commentId)

        return res
        .status(200)
        .json(
            new ApiResponse(200, {isComment: false})
        )
    }

    await Like.create({
        likedBy: req.user?._id,
        comment: commentId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, {isComment: true})
    )
})

const toggleTweetLike = asyncHandler(async (req, res) => {

    const {tweetId} = req.params
    
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "TweetId invalid")
    }

    const alreadyLiked = await Like.findOne({
        isLiked: req.user?._id,
        tweet: tweetId
    })

    if(alreadyLiked){
        await Like.findByIdAndDelete(tweetId)

        return res
        .status(200)
        .json(
            new ApiResponse(200, {isLiked: false})
        )
    }

    await Like.create({
        likedBy: req.user?._id,
        tweet: tweetId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, {isLiked: true})
    )
}
)

const getLikedVideos = asyncHandler(async (req, res) => {

    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user._id),
                video: { $exists: true, $ne: null }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            duration: 1,
                            views: 1,
                            owner: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                video: { $first: "$video" }
            }
        },
        {
            $project: {
                video: 1
            }
        }
    ])

    if (!likedVideos?.length) {
        throw new ApiError(404, "No liked videos found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
        )
    
})

export {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos
}
