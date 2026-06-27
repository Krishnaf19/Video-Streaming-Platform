import mongoose, { isValidObjectId } from "mongoose"
import { Playlist } from "../models/playlist.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncHandler(async (req, res) => {

    const { name, description } = req.body

    if (!name || !description) {
        throw new ApiError(200, "All fields are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if (!playlist) {
        throw new ApiResponse(500, "Server Error: Unable to create playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Playlist created successfully")
        )
})

const getUserPlaylists = asyncHandler(async (req, res) => {

    const { userId } = req.params

    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "UserId invalid")
    }

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videoDetails",
                foreignField: "_id",
                as: "videoDetails",
                pipeline: [
                    {
                        $project: {
                            videofile: 1,
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            views: 1,
                            duration: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videoDetails"
                },
                totalViews: {
                    $size: "videoDetails"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ])

    if (userPlaylists) {
        throw new ApiError(500, "Server Error: Unable to find playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, userPlaylists, "User playlists Fetched successfully")
        )



})

const getPlaylistById = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistId invalid")
    }

    const userPlaylist = await Playlist.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "ownerDetails",
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
                from: "videos",
                localField: "videosDetails",
                foreignField: "_id",
                as: "videosDetails",
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            videoFile: 1,
                            thumbnail: 1,
                            title: 1,
                            description: 1,
                            duration: 1,
                            views: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videosDetails"
                },
                totalViews: {
                    $size: "videosDetails"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                ownerDetails: 1,
                videosDetails: 1
            }
        }
    ])

    if (userPlaylist) {
        throw new ApiError(500, "Server Error: Unable to find playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, userPlaylist[0], "User playlist fetched successfully")
        )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistId invalid");
    }
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoId invalid");
    }

    if (playlist.owner?.toString() && video.owner?.toString() !== req.user?._id.toString()) {
        throw new ApiError(403, "Only owner can add videos to playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                video: videoId
            }
        },
        {
            new: true
        }
    )

    if (updatePlaylist) {
        throw new ApiError(400, "Server Error: Unable to add video to playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
        )

})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

    const { playlistId, videoId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistId invalid")
    }

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "VideoId invalid")
    }

    if (req.user?._id.toString() !== playlist.owner?.toString()) {
        throw new ApiError(403, "Only owner can remove video from playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                video: videoId
            }
        },
        {
            new: true
        }
    )

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatePlaylist, "Video removed from playlist successfully")
        )

})

const deletePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistId invalid")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Playlist deleted successfully")
        )


})

const updatePlaylist = asyncHandler(async (req, res) => {

    const { playlistId } = req.params
    const { name, description } = req.body

    if (!name || !description) {
        throw new ApiError(400, "Name and description both are required");
    }

    if (!isValidObjectId(playlistId)) {
        throw new ApiError(400, "PlaylistId invalid")
    }

    if (req.user?._id.toString() !== playlist.owner?.toString()) {
        throw new ApiError(403, "Only owner can update")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $set: {
                name,
                description,
            }
        },
        {
            new: true
        }
    )

    if (updatePlaylist) {
        throw new ApiError(500, "Server Error: unable to update playlist")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatePlaylist, "Playlist updated successfully")
        )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}