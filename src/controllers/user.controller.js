import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh token")
    }
}


const registerUser = asyncHandler(async (req, res) => {

    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const { fullName, email, username, password } = req.body

    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {      //some : it gives callback so that iteration will possiable in array 
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({                                                //findOne : find in db 
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }


    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }


    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }



    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

})


const loginUser = asyncHandler(async (req, res) => {

    //take data from frontend
    //validation
    //search that email in db 
    //check for password
    //generate access and refresh token and save refresh token in db
    //send cookie

    const { email, password } = req.body

    if (!email) {
        throw new ApiError(400, "Email is required")
    }

    const user = await User.findOne({
        email
    })

    if (!user) {
        throw new ApiError(401, "User doesn't exist")
    }

    const isPasswordValid = user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, loggedInUser, "User logged in successfully"))

})


const logoutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))

})


const refreshAccessToken = asyncHandler(async (req, res) => {

    const incomingRefreshToken = req.cookie?.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unarthorized user")
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id)

    if (!user) {
        throw new ApiError(401, "Invalid refresh token")
    }

    if (incomingRefreshToken !== user.refreshToken) {
        throw new ApiError(401, "Refresh token is expired or used")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id)

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(200, { accessToken, refreshToken: newRefreshToken },
            "Access token is refreshed"
        )

})


const updatePassword = asyncHandler(async (req, res) => {

    //only login user can update password , so we will add a middle ware at the route 

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Incorrect old password")
    }

    user.password = newPassword                            //object me newPassword set hua hai save nahi
    user.save({ validateBeforeSave: false })


    return res
        .status(200)
        .json(200, {}, "Password updated successfully")

})


const updateAccountDetails = asyncHandler(async (req, res) => {

    //login user can only update account details

    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate(                   //we will add a middleware auth.middleware.js from there we get req.user
        req.user?._id,

        {
            $set: {
                fullName,
                email
            }
        },

        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(200, user, "Accound updated successfully")

})


const getCurrentUser = asyncHandler(async (req, res) => {

    //if user is login than only current user will be fetched
    const user = req.user

    return res
        .status(200)
        .json(200, user, "Current user fetched successfully")
})


const updateAvatar = asyncHandler(async (req, res) => {

    //login user can only update avatar
    //get avatar and upload on cloudinary
    //update in db
    //return res

    const avatarLocalPath = res.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Error while uploading Avatar on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,

        {
            $set: {
                avatar: avatar.url
            }
        },

        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(200, user, "Avatar updated successfully")
})


const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = res.params               //we are going to channel using url

    if (!username?.trim()) {
        throw new ApiError(400, "Username not found")
    }

    /*const user=  User.find({username})
    const channel = User.find(user?._id)*/

    const channel = await User.aggregate([

        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {                         //storing all subscriber from subscriber.model.js
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {                         //storing how many channels i have subscribed
                from: "subscriptions",
                localField: "_id",
                foreignField: "subcriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName : 1,
                username : 1,
                email : 1,
                subscriberCount : 1,
                channelsSubscribedToCount : 1,
                isSubscribed : 1,
                avatar : 1,
                coverImage : 1

            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(400, "Channel does not exist")
    }

    return res
    .status(200)
    .json(200, channel[0], "channel fetches successfully")

})

export {

    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    updatePassword,
    updateAccountDetails,
    getCurrentUser,
    updateAvatar,
    getUserChannelProfile
}