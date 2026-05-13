/* eslint-disable no-empty */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { IMessage } from '../message/message.interface';
import { Message } from '../message/message.model';
import { IChat } from './chat.interface';
import { Chat } from './chat.model';
import { isOnline, getLastActive } from '../../helpers/presenceHelper';
import {
  getUnreadCountCached,
  setUnreadCount,
} from '../../helpers/unreadHelper';
import QueryBuilder from '../../builder/QueryBuilder';

const createChatToDB = async (payload: any): Promise<IChat> => {
  const isExistChat: IChat | null = await Chat.findOne({
    participants: { $all: payload },
  });

  if (isExistChat) {
    return isExistChat;
  }
  const chat: IChat = await Chat.create({ participants: payload });
  return chat;
};

const getChatFromDB = async (
  user: any,
  query: Record<string, unknown>,
): Promise<{ data: any[]; pagination: any }> => {
  const chatQuery = new QueryBuilder(
    Chat.find({ participants: { $in: [user.id] } }),
    query,
  )
    .filter()
    .sort()
    .paginate();

  const chats: any = await chatQuery.modelQuery
    .populate({
      path: 'participants',
      select: '_id name image role',
      match: {
        _id: { $ne: user.id },
      },
    })
    .populate({
      path: 'trialRequestId',
      select: 'subject',
      populate: {
        path: 'subject',
        select: 'name',
      },
    })
    .populate({
      path: 'sessionRequestId',
      select: 'subject',
      populate: {
        path: 'subject',
        select: 'name',
      },
    })
    .select('participants status updatedAt trialRequestId sessionRequestId');

  const pagination = await chatQuery.getPaginationInfo();

  const filteredChats = chats?.filter(
    (chat: any) => chat?.participants?.length > 0,
  );

  const chatList: any[] = await Promise.all(
    filteredChats?.map(async (chat: any) => {
      const data = chat?.toObject();

      const lastMessage: IMessage | null = await Message.findOne({
        chatId: chat?._id,
      })
        .sort({ createdAt: -1 })
        .select('text offer createdAt sender');

      const cachedUnread = await getUnreadCountCached(
        String(chat?._id),
        String(user.id),
      );
      let unreadCount: number;
      if (typeof cachedUnread === 'number') {
        unreadCount = cachedUnread;
      } else {
        unreadCount = await Message.countDocuments({
          chatId: chat?._id,
          sender: { $ne: user.id },
          readBy: { $ne: user.id },
        });

        try {
          await setUnreadCount(String(chat?._id), String(user.id), unreadCount);
        } catch {}
      }

      const other = data?.participants?.[0];
      let presence: { isOnline: boolean; lastActive?: number } | null = null;
      if (other?._id) {
        const online = await isOnline(String(other._id));
        let last = await getLastActive(String(other._id));
        if (last === undefined) {
          if (lastMessage?.createdAt) {
            last = new Date(String(lastMessage.createdAt)).getTime();
          } else if (data?.updatedAt) {
            last = new Date(String(data.updatedAt)).getTime();
          }
        }
        presence = { isOnline: online, lastActive: last };
      }

      const subject =
        data?.sessionRequestId?.subject?.name ||
        data?.trialRequestId?.subject?.name ||
        null;

      return {
        ...data,
        lastMessage: lastMessage || null,
        unreadCount,
        presence,
        subject,
      };
    }),
  );

  return {
    data: chatList,
    pagination,
  };
};

export const ChatService = { createChatToDB, getChatFromDB };
