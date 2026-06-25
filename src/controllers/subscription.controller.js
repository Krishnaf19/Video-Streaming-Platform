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

    const channel = await Subscription.findbyId(channelId)

    if (!isValidObjectId(channel)) {
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
                _id: mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "sunscriptions",
                            localField: "subscribedToChannel",
                            foreignField: "channel",
                            as: "subscribedToChannel"
                        }
                    },
                    {
                        $addField: {
                            subscribedToChannel: {
                                $cond: {
                                    if: { $in: [channelId, "$subscribedToChannel.channel"] },
                                    then: true,
                                    else: false
                                }
                            },
                            subcribersCount: {
                                $size: "$subscribedToChannel"
                            }
                        }
                    }
                ]
            }
        },
        {
            $project: {
                _id: 0,
                subscriber: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1,
                    subscribedToChannel: 1,
                    subcribersCount: 1,
                },
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
                _id: mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "totalChannelsSubscribed",
                            foreignField: "channel",
                            as: "totalChannelsSubscribed"
                        }
                    },
                    {
                        $addField: {
                            totalChannelsSubscribed: {
                                $$cond: {
                                    if: { $in: [subscriberId, "$totalChannelsSubscribed.channel"] },
                                    then: true,
                                    else: false
                                }
                            },
                            totalChannel: {
                                $size: "$totalChannelsSubscribed"
                            }
                        }
                    }
                ]
            }
        },
        {
            $project: {
                _id: 0,
                channel: {
                    _id: 1,
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
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