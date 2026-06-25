import asyncHandler from "../utils/asyncHandler.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Tweet } from "../models/tweets.model.js"

const createTweet = asyncHandler(async (req, res) => {
    
    const { content } = req.body

    if(!content){
        throw new ApiError(400, "Content is required for tweet")
    }
    
    const tweet = await Tweet.create({
        owner: req.user?._id,
        content
    })

    if(!tweet){
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


    const tweet = await Tweet.aggregate([
        {
            $match: {
                owner : mongoose.Types.ObjectId(req.user?._id)
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
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                ownerDetails: {
                    $first: "$ownerDetails"
                }
            }
        },
        {
            $project: {
                ownerDetails: 1
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, tweet, "Tweet fetched successfully")
    )

})

const updateTweet = asyncHandler(async (req, res) => {

    const{ content } = req.body
    const { tweetId } = req.params

    const tweet = await Tweet.findById(tweetId)

    if (!isValidObjectId(tweet)) {
        throw new ApiError(400, "TweetId invalid");
    }

    if(tweet.owner.toString() !== req.user._id.toString()){
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

    const tweet = Tweet.findById(tweetId)

    if(!isValidObjectId(tweet)){
        throw new ApiError(400, "TweetId invalid");
    }

    if(tweet.owner.toString() !== req.user?._id.toString()){
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