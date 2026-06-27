import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {

    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const channelStats = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "videoLikes"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $group: { 
                _id: null,                   
                totalVideos: {
                    $sum: 1                         
                },
                totalViews: {
                    $sum: "$views"                  
                },
                totalLikes: {
                    $sum: {
                        $size: "$videoLikes"        
                    }
                },
                totalSubscribers: {
                    $first: {
                        $size: "$subscribers"       
                    }
                }
            }
        },
        {
            $project: {
                totalVideos: 1,
                totalViews: 1,
                totalLikes: 1,
                totalSubscribers: 1
            }
        }
    ])

    if (!channelStats?.length) {
        throw new ApiError(404, "Channel stats not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channelStats[0], "Channel stats fetched successfully")
        )
})

const getChannelVideos = asyncHandler(async (req, res) => {

    const channelVideos = await Video.aggregate([

        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "videoLikes"
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$videoLikes"
                },
                createdAt: {
                    $dateToParts: { date: "$createdAt" } 
                }
            }
        },
        {
            $sort: {
                "createdAt.year": -1,
                "createdAt.month": -1,
                "createdAt.day": -1
            }
        },
        {
            $project: {
                title: 1,
                thumbnail: 1,
                videoFile: 1,
                description: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                totalLikes: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1
                }
            }
        }
    ])

    if (!channelVideos?.length) {
        throw new ApiError(404, "No videos found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, channelVideos, "Channel videos fetched successfully")
        )
})

export {
    getChannelStats,
    getChannelVideos
}