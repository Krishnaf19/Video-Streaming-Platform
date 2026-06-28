import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Tweet } from "../models/tweets.model.js"

const createTweet = asyncHandler(async (req, res) => {

    const { content } = req.body

    if (!content) {
        throw new ApiError(400, "Content is required for tweet")
    }

    const tweet = await Tweet.create({
        owner: req.user?._id,
        content
    })

    if (!tweet) {
        throw new ApiError(500, "Server Error: Unable to create tweet")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweet, "Tweet created successfully")
        )
})

const getTweet = asyncHandler(async (req, res) => {

    const { username } = req.params

    if (!username?.trim()) {
        throw new ApiError(400, "Username not found")
    }

    const user = await User.findOne({ username: username?.toLowerCase() })

    if (!user) {
        throw new ApiError(404, "User not found")
    }

    const tweet = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(user._id)
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
                foreignField: "tweet",
                as: "tweetLikes"
            }
        },
        {
            $addFields: {
                ownerDetails: {
                    $first: "$ownerDetails"
                },
                totalLikes: {
                    $size: "$tweetLikes"
                },
                isLiked: {
                    $cond: {
                        if: { $in: [req.user?._id, "$tweetLikes.likedBy"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                content: 1,
                ownerDetails: 1,
                totalLikes: 1,
                isLiked: 1,
            }
        }
    ])

    if (!tweet?.length) {
        throw new ApiError(404, "No tweets found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, tweet, "Tweet fetched successfully")
        )

})

const updateTweet = asyncHandler(async (req, res) => {

    const { content } = req.body
    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "TweetId invalid");
    }

    const tweet = await Tweet.findById(tweetId)

    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "Only owner can edit")
    }

    const newTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set: {
                content: content
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, newTweet, "Tweet updated successfully")
        )
})

const deleteTweet = asyncHandler(async (req, res) => {

    const { tweetId } = req.params

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "TweetId invalid");
    }

    const tweet = await Tweet.findById(tweetId)
    
    if (tweet.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Only owner can delete tweet")
    }

    await Tweet.findOneAndDelete(tweetId)

    return res
        .status(200)
        .json(200, {}, "Tweet deleted successfully")
})

export {
    createTweet,
    getTweet,
    updateTweet,
    deleteTweet
}