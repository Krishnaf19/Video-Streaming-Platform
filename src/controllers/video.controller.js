import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {

    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //todo
   
})

const publishAVideo = asyncHandler(async (req, res) => {

    const { title, description } = req.body

    if (!title || !description) {
        throw new ApiError(400, "Title and description both are required")
    }

    const videoLocalPath = res.files?.videoFile[0]?.path
    const thumbnailLocalPath = res.files?.thumbnail[0]?.path

    if (!videoLocalPath) {
        throw new ApiError(400, "Error while uploading video")
    }

    if (thumbnailLocalPath) {
        throw new ApiError(400, "Error while uploading thumbnail")
    }

    const video = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if (!video) {
        throw new ApiError(500, "Server Error: Unable to upload video")
    }

    const createVideo = await Video.create({
        title,
        description,
        videoFile: video.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration,
        isPublished: false,
        owner: req.user?._id
    })

    const videoUploaded = await Video.findById(video._id);

    if (!videoUploaded) {
        throw new ApiError(500, "Server error: VideoUpload failed");
    }

    return res
        .status(200)
        .json(200, createVideo, "Video published successfully")
})

const getVideoById = asyncHandler(async (req, res) => {

    //todo
    const { videoId } = req.params

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoId invalid")
    }

    const video = await Video.aggregate([
        
    ])

    if (!video) {
        throw new ApiError(500, "Server Error: Unable to find video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "Video fetched successfully")
        )
})

const updateVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!isValidObjectId(video)) {
        throw new ApiError(400, "VideoId invalid")
    }

    if(req.user?._id.toString() !== video.owner?.toString()){
        throw new ApiError(403, "Only owner can update video")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    )

    if (!updatedVideo) {
        throw new ApiError(500, "Server Error: Unable to update video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedVideo, "Video updated successfully")
        )

})

const deleteVideo = asyncHandler(async (req, res) => {

    const { videoId } = req.params
    
    const video = await Video.findById(videoId)

    if (!isValidObjectId(video)) {
        throw new ApiError(400, "VideoId invalid")
    }

     if(req.user?._id.toString() !== video.owner?.toString()){
        throw new ApiError(403, "Only owner can delete video")
    }

    const deleteVideo = await Video.findByIdAndDelete(videoId)

    if (!deleteVideo) {
        throw new ApiError(500, "Server Error: Unable to delete video")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Video deleted successfully")
        )
})

const togglePublishStatus = asyncHandler(async (req, res) => {

    const { videoId } = req.params

    const video = await Video.findById(videoId)

    if (!isValidObjectId(video)) {
        throw new ApiError(400, "VideoId is required or invalid")
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "You can't toogle publish status as you are not the owner");
    }


    const togglePublishStatus = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        {
            new: true
        }
    )

    if (!togglePublishStatus) {
        throw new ApiError(500, "Server Error: Unable to toggle status")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, { isPublished: togglePublishStatus.isPublished }, "Publish status is toggled successfully")
        )


})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}