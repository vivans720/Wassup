const response = require("../utils/responseHandler");
const Status = require("../models/Status");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Message = require("../models/Message");

exports.createStatus = async (req, res) => {
  try {
    if (!req.body) {
      return response(res, 400, "Request body is missing");
    }
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return response(res, 400, "File upload failed");
      }
      mediaUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Invalid message");
    }

    const expiryAt = new Date();
    expiryAt.setHours(expiryAt.getHours() + 24);

    const status = new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiryAt,
    });
    await status.save();

    const populateStatus = await Status.findById(status?._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populateStatus);
        }
      }
    }
    return response(res, 201, "Status created successfully", populateStatus);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.getStatus = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiryAt: {
        $gt: new Date(),
      },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });
    return response(res, 200, "Status fetched successfully", statuses);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (!status.viewers.includes(userId)) {
      status.viewers.push(userId);
      await status.save();
    } else {
      console.log("Status already viewed");
    }

    const updatedStatus = await Status.findById(statusId)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    if (req.io && req.socketUserMap) {
      const statusOwnerSocketId = req.socketUserMap.get(
        status.user._id.toString()
      );
      if (statusOwnerSocketId) {
        const viewData = {
          statusId,
          viewerId: userId,
          totalViewers: updatedStatus.viewers.length,
          viewers: updatedStatus.viewers,
        };

        req.io.to(statusOwnerSocketId).emit("status_viewed", viewData);
      } else {
        console.log("Status owner are not connected");
      }
    }

    return response(res, 200, "Status Viewed successfully", updatedStatus);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

exports.deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (status.user.toString() !== userId) {
      return response(res, 401, "Unauthorized");
    }
    await status.deleteOne();

    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", statusId);
        }
      }
    }
    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
