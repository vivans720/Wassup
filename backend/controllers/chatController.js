const responseHandler = require("../utils/responseHandler");
const Conversation = require("../models/Conversation");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Message = require("../models/Message");

exports.sendMessage = async (req, res) => {
  try {
    if (!req.body) {
      return responseHandler(res, 400, "Request body is missing");
    }
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;
    const participants = [senderId, receiverId].sort();

    let conversation = await Conversation.findOne({
      participants: participants,
    });

    if (!conversation) {
      conversation = new Conversation({
        participants,
      });
      await conversation.save();
    }

    let imageOrVideoUrl = null;
    let contentType = null;
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);

      if (!uploadFile?.secure_url) {
        return responseHandler(res, 400, "File upload failed");
      }
      imageOrVideoUrl = uploadFile?.secure_url;
      if (file.mimetype.startsWith("image")) {
        contentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        contentType = "video";
      } else {
        return responseHandler(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return responseHandler(res, 400, "Invalid message");
    }

    const message = new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      messageStatus,
      contentType,
      imageOrVideoUrl,
    });
    await message.save();
    if (message?.content) {
      conversation.lastMessage = message?.id;
    }
    conversation.unreadCount += 1;
    await conversation.save();

    const populateMessage = await Message.findOne(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture");
    return responseHandler(
      res,
      200,
      "Message sent successfully",
      populateMessage
    );
  } catch (error) {
    console.log(error);
    return responseHandler(res, 500, "Internal server error");
  }
};

exports.getConversations = async (req, res) => {
  const userId = req.user.userId;
  try {
    let conversation = await Conversation.find({
      participants: { $in: [userId] },
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return responseHandler(
      res,
      200,
      "Conversation fetched successfully",
      conversation
    );
  } catch (error) {
    console.log(error);
    return responseHandler(res, 500, "Internal server error");
  }
};

exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return responseHandler(res, 404, "Conversation not found");
    }

    if (!conversation.participants.includes(userId)) {
      return responseHandler(res, 401, "Unauthorized");
    }

    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort({ createdAt: -1 });

    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["sent", "delivered"] },
      },
      { $set: { messageStatus: "read" } }
    );

    conversation.unreadCount = 0;
    await conversation.save();
    return responseHandler(res, 200, "Message fetched", messages);
  } catch (error) {
    console.log(error);
    return responseHandler(res, 500, "Internal server error");
  }
};

exports.markAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.userId;
  try {
    let messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
    });

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
      },
      { $set: { messageStatus: "read" } }
    );

    return responseHandler(res, 200, "Message marked as read", messages);
  } catch (error) {
    console.error(error);
    return responseHandler(res, 500, "Internal server error");
  }
};

exports.deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return responseHandler(res, 404, "Message not found");
    }
    if (message.sender.toString() !== userId) {
      return responseHandler(res, 401, "Unauthorized");
    }
    await message.deleteOne();
    return responseHandler(res, 200, "Message deleted successfully");
  } catch (error) {
    console.error(error);
    return responseHandler(res, 500, "Internal server error");
  }
};
