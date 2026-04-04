import colors from 'colors';
import { Server } from 'socket.io';
import { logger } from '../shared/logger';
import { jwtHelper } from './jwtHelper';
import config from '../config';
import { Message } from '../app/modules/message/message.model';
import { Chat } from '../app/modules/chat/chat.model';
import NodeCache from 'node-cache';
import { CallService } from '../app/modules/call/call.service';
import { WhiteboardService } from '../app/modules/whiteboard/whiteboard.service';
import { SessionService } from '../app/modules/session/session.service';
import { CallType } from '../app/modules/call/call.interface';
import { User } from '../app/modules/user/user.model';
import {
  setOnline,
  setOffline,
  addUserRoom,
  removeUserRoom,
  updateLastActive,
  getUserRooms,
  getLastActive,
  incrConnCount,
  decrConnCount,
  clearUserRooms,
} from '../app/helpers/presenceHelper';

const USER_ROOM = (userId: string) => `user::${userId}`;
const CHAT_ROOM = (chatId: string) => `chat::${chatId}`;
const TYPING_KEY = (chatId: string, userId: string) => `typing:${chatId}:${userId}`;
const TYPING_TTL_SECONDS = 5;
const typingThrottle = new NodeCache({ stdTTL: TYPING_TTL_SECONDS, checkperiod: 10, useClones: false });

const socket = (io: Server) => {
  io.on('connection', async socket => {
    try {

      const token =
        (socket.handshake.auth as any)?.token ||
        (socket.handshake.query as any)?.token;

      if (!token || typeof token !== 'string') {
        logger.warn(
          colors.yellow('Socket connection without token. Disconnecting.')
        );
        return socket.disconnect(true);
      }

      let payload: any;
      try {
        payload = jwtHelper.verifyToken(token, config.jwt.jwt_secret as any);
      } catch (err) {
        logger.warn(
          colors.red('Invalid JWT on socket connection. Disconnecting.')
        );
        return socket.disconnect(true);
      }

      const userId = payload?.id as string;
      if (!userId) {
        logger.warn(colors.red('JWT payload missing id. Disconnecting.'));
        return socket.disconnect(true);
      }

      await setOnline(userId);
      await incrConnCount(userId);
      await updateLastActive(userId);
      socket.join(USER_ROOM(userId));
      logger.info(
        colors.blue(`✅ User ${userId} connected & joined ${USER_ROOM(userId)}`)
      );
      logEvent('socket_connected', `for user_id: ${userId}`);

      const handleEventProcessed = (event: string, extra?: string) => {
        updateLastActive(userId).catch(() => {});
        logEvent(event, extra);
      };

      socket.on('JOIN_CHAT', async ({ chatId }: { chatId: string }) => {
        if (!chatId) return;

        const allowed = await Chat.exists({ _id: chatId, participants: userId });
        if (!allowed) {
          socket.emit('ACK_ERROR', {
            message: 'You are not a participant of this chat',
            chatId: String(chatId),
          });
          handleEventProcessed('JOIN_CHAT_DENIED', `for chat_id: ${chatId}`);
          return;
        }
        socket.join(CHAT_ROOM(chatId));
        await addUserRoom(userId, chatId);
        handleEventProcessed('JOIN_CHAT', `for chat_id: ${chatId}`);

        const lastActive = await getLastActive(userId);
        io.to(CHAT_ROOM(chatId)).emit('USER_ONLINE', {
          userId,
          chatId,
          lastActive,
        });
        logger.info(
          colors.green(`User ${userId} joined chat room ${CHAT_ROOM(chatId)}`)
        );

        try {
          const undelivered = await Message.find(
            {
              chatId,
              sender: { $ne: userId },
              deliveredTo: { $nin: [userId] },
            },
            { _id: 1 }
          );

          if (undelivered && undelivered.length > 0) {
            const ids = undelivered.map(m => m._id);
            await Message.updateMany(
              { _id: { $in: ids } },
              { $addToSet: { deliveredTo: userId } }
            );

            for (const msg of undelivered) {
              io.to(CHAT_ROOM(String(chatId))).emit('MESSAGE_DELIVERED', {
                messageId: String(msg._id),
                chatId: String(chatId),
                userId,
              });
            }

            logger.info(
              colors.green(
                `Auto-delivered ${
                  undelivered.length
                } pending messages for user ${userId} on join to ${CHAT_ROOM(
                  chatId
                )}`
              )
            );
            handleEventProcessed(
              'AUTO_DELIVERED_ON_JOIN',
              `count=${undelivered.length} chat_id=${chatId}`
            );
          }
        } catch (err) {
          logger.error(
            colors.red(`JOIN_CHAT auto deliver error: ${String(err)}`)
          );
        }
      });

      socket.on('LEAVE_CHAT', async ({ chatId }: { chatId: string }) => {
        if (!chatId) return;

        const allowed = await Chat.exists({ _id: chatId, participants: userId });
        if (!allowed) {
          socket.emit('ACK_ERROR', {
            message: 'You are not a participant of this chat',
            chatId: String(chatId),
          });
          handleEventProcessed('LEAVE_CHAT_DENIED', `for chat_id: ${chatId}`);
          return;
        }
        socket.leave(CHAT_ROOM(chatId));
        await removeUserRoom(userId, chatId);
        handleEventProcessed('LEAVE_CHAT', `for chat_id: ${chatId}`);

        const lastActive = await getLastActive(userId);
        io.to(CHAT_ROOM(chatId)).emit('USER_OFFLINE', {
          userId,
          chatId,
          lastActive,
        });
        logger.info(
          colors.yellow(`User ${userId} left chat room ${CHAT_ROOM(chatId)}`)
        );
      });

      socket.on('TYPING_START', async ({ chatId }: { chatId: string }) => {
        if (!chatId) return;

        const allowed = await Chat.exists({ _id: chatId, participants: userId });
        if (!allowed) {
          handleEventProcessed('TYPING_START_DENIED', `for chat_id: ${chatId}`);
          return;
        }

        {
          const key = TYPING_KEY(chatId, userId);
          if (typingThrottle.has(key)) {
            handleEventProcessed('TYPING_START_THROTTLED_SKIP', `for chat_id: ${chatId}`);
            return;
          }
          typingThrottle.set(key, 1, TYPING_TTL_SECONDS);
        }

        io.to(CHAT_ROOM(chatId)).emit('TYPING_START', { userId, chatId });
        handleEventProcessed('TYPING_START', `for chat_id: ${chatId}`);
      });

      socket.on('TYPING_STOP', async ({ chatId }: { chatId: string }) => {
        if (!chatId) return;

        const allowed = await Chat.exists({ _id: chatId, participants: userId });
        if (!allowed) {
          handleEventProcessed('TYPING_STOP_DENIED', `for chat_id: ${chatId}`);
          return;
        }

        typingThrottle.del(TYPING_KEY(chatId, userId));

        io.to(CHAT_ROOM(chatId)).emit('TYPING_STOP', { userId, chatId });
        handleEventProcessed('TYPING_STOP', `for chat_id: ${chatId}`);
      });

      socket.on(
        'DELIVERED_ACK',
        async ({ messageId }: { messageId: string }) => {
          try {
            const found = await Message.findById(messageId).select('_id chatId');
            if (!found) {
              socket.emit('ACK_ERROR', {
                message: 'Message not found',
                messageId,
              });
              return;
            }

            const allowed = await Chat.exists({ _id: found.chatId, participants: userId });
            if (!allowed) {
              socket.emit('ACK_ERROR', {
                message: 'You are not a participant of this chat',
                chatId: String(found.chatId),
                messageId: String(found._id),
              });
              handleEventProcessed('DELIVERED_ACK_DENIED', `chat_id: ${String(found.chatId)}`);
              return;
            }

            const msg = await Message.findByIdAndUpdate(
              messageId,
              { $addToSet: { deliveredTo: userId } },
              { new: true }
            );
            if (msg) {
              io.to(CHAT_ROOM(String(msg.chatId))).emit('MESSAGE_DELIVERED', {
                messageId: String(msg._id),
                chatId: String(msg.chatId),
                userId,
              });
              handleEventProcessed(
                'DELIVERED_ACK',
                `for message_id: ${String(msg._id)}`
              );
            }
          } catch (err) {
            logger.error(colors.red(`❌ DELIVERED_ACK error: ${String(err)}`));
          }
        }
      );

      socket.on('READ_ACK', async ({ messageId }: { messageId: string }) => {
        try {
          const found = await Message.findById(messageId).select('_id chatId');
          if (!found) {
            socket.emit('ACK_ERROR', {
              message: 'Message not found',
              messageId,
            });
            return;
          }

          const allowed = await Chat.exists({ _id: found.chatId, participants: userId });
          if (!allowed) {
            socket.emit('ACK_ERROR', {
              message: 'You are not a participant of this chat',
              chatId: String(found.chatId),
              messageId: String(found._id),
            });
            handleEventProcessed('READ_ACK_DENIED', `chat_id: ${String(found.chatId)}`);
            return;
          }

          const msg = await Message.findByIdAndUpdate(
            messageId,
            { $addToSet: { readBy: userId } },
            { new: true }
          );
          if (msg) {
            io.to(CHAT_ROOM(String(msg.chatId))).emit('MESSAGE_READ', {
              messageId: String(msg._id),
              chatId: String(msg.chatId),
              userId,
            });
            handleEventProcessed(
              'READ_ACK',
              `for message_id: ${String(msg._id)}`
            );
          }
        } catch (err) {
          logger.error(colors.red(`❌ READ_ACK error: ${String(err)}`));
        }
      });

      socket.on(
        'CALL_INITIATE',
        async ({
          receiverId,
          callType,
          chatId,
        }: {
          receiverId: string;
          callType: CallType;
          chatId?: string;
        }) => {
          try {
            const { call, token, channelName, uid } =
              await CallService.initiateCall(userId, receiverId, callType, chatId);

            const caller = await User.findById(userId).select(
              'name profilePicture'
            );

            socket.emit('CALL_INITIATED', {
              callId: call._id,
              channelName,
              token,
              uid,
              callType,
            });

            io.to(USER_ROOM(receiverId)).emit('INCOMING_CALL', {
              callId: call._id,
              channelName,
              callType,
              caller: {
                id: userId,
                name: caller?.name,
                profilePicture: caller?.profilePicture,
              },
            });

            handleEventProcessed(
              'CALL_INITIATE',
              `to: ${receiverId}, type: ${callType}`
            );
          } catch (err) {
            socket.emit('CALL_ERROR', { message: String(err) });
            logger.error(colors.red(`CALL_INITIATE error: ${String(err)}`));
          }
        }
      );

      socket.on('CALL_ACCEPT', async ({ callId }: { callId: string }) => {
        try {
          const { call, token, uid } = await CallService.acceptCall(
            callId,
            userId
          );

          socket.emit('CALL_ACCEPTED', {
            callId,
            channelName: call.channelName,
            token,
            uid,
          });

          io.to(USER_ROOM(call.initiator.toString())).emit(
            'CALL_ACCEPTED_BY_RECEIVER',
            { callId }
          );

          handleEventProcessed('CALL_ACCEPT', `callId: ${callId}`);
        } catch (err) {
          socket.emit('CALL_ERROR', { message: String(err) });
          logger.error(colors.red(`CALL_ACCEPT error: ${String(err)}`));
        }
      });

      socket.on('CALL_REJECT', async ({ callId }: { callId: string }) => {
        try {
          const call = await CallService.rejectCall(callId, userId);

          io.to(USER_ROOM(call.initiator.toString())).emit('CALL_REJECTED', {
            callId,
          });

          handleEventProcessed('CALL_REJECT', `callId: ${callId}`);
        } catch (err) {
          socket.emit('CALL_ERROR', { message: String(err) });
          logger.error(colors.red(`CALL_REJECT error: ${String(err)}`));
        }
      });

      socket.on('CALL_END', async ({ callId }: { callId: string }) => {
        try {
          const call = await CallService.endCall(callId, userId);

          call.participants.forEach(participantId => {
            if (participantId.toString() !== userId) {
              io.to(USER_ROOM(participantId.toString())).emit('CALL_ENDED', {
                callId,
                duration: call.duration,
              });
            }
          });

          handleEventProcessed('CALL_END', `callId: ${callId}`);
        } catch (err) {
          socket.emit('CALL_ERROR', { message: String(err) });
          logger.error(colors.red(`CALL_END error: ${String(err)}`));
        }
      });

      socket.on('CALL_CANCEL', async ({ callId }: { callId: string }) => {
        try {
          const call = await CallService.cancelCall(callId, userId);

          io.to(USER_ROOM(call.receiver.toString())).emit('CALL_CANCELLED', {
            callId,
          });

          handleEventProcessed('CALL_CANCEL', `callId: ${callId}`);
        } catch (err) {
          socket.emit('CALL_ERROR', { message: String(err) });
          logger.error(colors.red(`CALL_CANCEL error: ${String(err)}`));
        }
      });

      socket.on(
        'CALL_JOIN_SESSION',
        async ({
          sessionId,
          otherUserId,
          callType = 'video',
        }: {
          sessionId: string;
          otherUserId: string;
          callType?: CallType;
        }) => {
          try {
            const { call, token, channelName, uid, isNew } =
              await CallService.joinSessionCall(userId, sessionId, otherUserId, callType);

            socket.emit('SESSION_CALL_JOINED', {
              callId: call._id,
              channelName,
              token,
              uid,
              callType,
              isNew,
            });

            if (isNew) {
              const caller = await User.findById(userId).select('name profilePicture');
              io.to(USER_ROOM(otherUserId)).emit('SESSION_CALL_READY', {
                callId: call._id,
                channelName,
                sessionId,
                callType,
                caller: {
                  id: userId,
                  name: caller?.name,
                  profilePicture: caller?.profilePicture,
                },
              });
            }

            handleEventProcessed(
              'CALL_JOIN_SESSION',
              `sessionId: ${sessionId}, channelName: ${channelName}, isNew: ${isNew}`
            );
          } catch (err) {
            socket.emit('CALL_ERROR', { message: String(err) });
            logger.error(colors.red(`CALL_JOIN_SESSION error: ${String(err)}`));
          }
        }
      );

      socket.on(
        'CALL_USER_JOINED_CHANNEL',
        async ({ callId, agoraUid }: { callId: string; agoraUid: number }) => {
          try {
            const { call, activeCount } = await CallService.recordParticipantJoin(
              callId,
              userId,
              agoraUid
            );

            call.participants.forEach(participantId => {
              io.to(USER_ROOM(participantId.toString())).emit(
                'CALL_PARTICIPANT_JOINED',
                {
                  callId,
                  userId,
                  agoraUid,
                  activeParticipants: activeCount,
                }
              );
            });

            if (activeCount >= 2) {
              call.participants.forEach(participantId => {
                io.to(USER_ROOM(participantId.toString())).emit(
                  'CALL_BOTH_CONNECTED',
                  {
                    callId,
                    message: 'Both participants are now connected',
                  }
                );
              });
            }

            handleEventProcessed(
              'CALL_USER_JOINED_CHANNEL',
              `callId: ${callId}, userId: ${userId}`
            );
          } catch (err) {
            socket.emit('CALL_ERROR', { message: String(err) });
            logger.error(
              colors.red(`CALL_USER_JOINED_CHANNEL error: ${String(err)}`)
            );
          }
        }
      );

      socket.on(
        'CALL_USER_LEFT_CHANNEL',
        async ({ callId }: { callId: string }) => {
          try {
            const { call, activeCount } = await CallService.recordParticipantLeave(
              callId,
              userId
            );

            if (call.sessionId) {
              try {
                await SessionService.syncAttendanceFromCall(call.sessionId.toString());
                logger.info(
                  colors.cyan(`Session attendance synced for session: ${call.sessionId}`)
                );
              } catch (syncErr) {

                logger.warn(
                  colors.yellow(`Failed to sync session attendance: ${String(syncErr)}`)
                );
              }
            }

            call.participants.forEach(participantId => {
              if (participantId.toString() !== userId) {
                io.to(USER_ROOM(participantId.toString())).emit(
                  'CALL_PARTICIPANT_LEFT',
                  {
                    callId,
                    userId,
                    activeParticipants: activeCount,
                  }
                );
              }
            });

            handleEventProcessed(
              'CALL_USER_LEFT_CHANNEL',
              `callId: ${callId}, userId: ${userId}`
            );
          } catch (err) {
            socket.emit('CALL_ERROR', { message: String(err) });
            logger.error(
              colors.red(`CALL_USER_LEFT_CHANNEL error: ${String(err)}`)
            );
          }
        }
      );

      socket.on(
        'CALL_ENABLE_WHITEBOARD',
        async ({ callId }: { callId: string }) => {
          try {
            const { room, token, isNew } =
              await WhiteboardService.getOrCreateRoomForCall(callId, userId);

            const call = await CallService.getCallById(callId, userId);

            call.participants.forEach((participantId: any) => {
              io.to(
                USER_ROOM(
                  typeof participantId === 'object'
                    ? participantId._id.toString()
                    : participantId.toString()
                )
              ).emit('WHITEBOARD_ENABLED', {
                callId,
                roomUuid: room.uuid,
                roomToken: token,
                isNew,
              });
            });

            handleEventProcessed(
              'CALL_ENABLE_WHITEBOARD',
              `callId: ${callId}, roomUuid: ${room.uuid}`
            );
          } catch (err) {
            socket.emit('CALL_ERROR', { message: String(err) });
            logger.error(
              colors.red(`CALL_ENABLE_WHITEBOARD error: ${String(err)}`)
            );
          }
        }
      );

      socket.on('disconnect', async () => {
        try {
          await updateLastActive(userId);
          const remaining = await decrConnCount(userId);
          const lastActive = await getLastActive(userId);

          if (!remaining || remaining <= 0) {
            await setOffline(userId);

            try {
              const rooms = await getUserRooms(userId);
              for (const chatId of rooms || []) {
                io.to(CHAT_ROOM(String(chatId))).emit('USER_OFFLINE', {
                  userId,
                  chatId: String(chatId),
                  lastActive,
                });
              }
              await clearUserRooms(userId);
            } catch {}
          } else {
            logger.info(colors.yellow(`User ${userId} disconnected one session; ${remaining} session(s) remain.`));
          }

          logger.info(colors.red(`User ${userId} disconnected`));
          logEvent('socket_disconnected', `for user_id: ${userId}`);
        } catch (err) {
          logger.error(
            colors.red(`❌ Disconnect handling error: ${String(err)}`)
          );
        }
      });
    } catch (err) {
      logger.error(colors.red(`Socket connection error: ${String(err)}`));
      try {
        socket.disconnect(true);
      } catch {}
    }
  });
};

const logEvent = (event: string, extra?: string) => {
  logger.info(`🔔 Event processed: ${event} ${extra || ''}`);
};

export const socketHelper = { socket };
