import axios from 'axios';
import process from 'process';
import { ISendMessage } from './index';

const host = process.env.CQ_SERVER_HOST ?? '127.0.0.1';
const port = parseInt(process.env.CQ_SERVER_PORT, 10) || 8080;
const server = `http://${host}:${port}`;

export async function getGroupName(groupId: string) {
  const response = await axios.get(`${server}/get_group_info`, {
    params: {
      group_id: groupId,
    },
  });
  return response.data?.data?.group_name;
}

export async function sendMessage({ isPrivate, to, message }: ISendMessage) {
  if (isPrivate) {
    await axios.post(`${server}/send_private_msg`, {
      user_id: to,
      message,
    });
  } else {
    await axios.post(`${server}/send_group_msg`, {
      group_id: to,
      message,
    });
  }
}

export async function getUserName(userId: string) {
  const response = await axios.get(`${server}/get_stranger_info`, {
    params: {
      user_id: userId,
    },
  });
  return response.data?.data?.nickname;
}
