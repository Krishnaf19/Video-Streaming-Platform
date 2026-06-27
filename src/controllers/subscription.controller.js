import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { pipeline } from "stream"
import { checkPrime } from "crypto"


const toggleSubscription = asyncHandler(async (req, res) => {

    const { channelId } = req.params

    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "ChannelId invalid")
    }

    const alreadySubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if (alreadySubscribed) {
        await Subscription.findByIdAndDelete(alreadySubscribed?._id)

        return res
            .status(200)
            .json(
                new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully")
            )
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    return res
        .status(200)
        .json(
            new ApiResponse(200, { subscribed: true }, "Subscribed successfully")
        )
})


const getUserChannelSubscribers = asyncHandler(async (req, res) => {

    const { channelId } = req.params

    const channel = await Subscription.findbyId(channelId)

    if (!isValidObjectId(channel)) {
        throw new ApiError(400, "ChannelId invalid")
    }

    const channelSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriberDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribedToSubscriber"
                        }
                    },
                    {
                        $addFields: {
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [new mongoose.Types.ObjectId(channelId), "$subscribedToSubscriber.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            },
                            subscribersCount: {
                                $size: "$subscribedToSubscriber"
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            isSubscribed: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscriberDetails"
        },
        {
            $project: {
                _id: 0,
                subscriberDetails: 1,
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200, channelSubscribers, "All subscribers of the channel is fetched successfully")
        )
})


const getSubscribedChannels = asyncHandler(async (req, res) => {

    const { subscriberId } = req.params

    const subscriber = await Subscription.findbyId(subscriberId)

    if (!isValidObjectId(subscriber)) {
        throw new ApiError(400, "SubscriberId invalid")
    }

    const subscribedChannels = await Subscription.aggregate([
       {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelDetails",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "channelSubscribers"
                        }
                    },
                    {
                        $addFields: {
                       
                            isSubscribed: {
                                $cond: {
                                    if: { $in: [new mongoose.Types.ObjectId(subscriberId), "$channelSubscribers.subscriber"] },
                                    then: true,
                                    else: false
                                }
                            },
                            
                            subscribersCount: {
                                $size: "$channelSubscribers"
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1,
                            isSubscribed: 1,
                            subscribersCount: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$channelDetails"
        },
        {
            $project: {
                _id: 0,
                channelDetails: 1
            }
        }
    ])

    return res
        .status(200)
        .json(
            new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
        )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}