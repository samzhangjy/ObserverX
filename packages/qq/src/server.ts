import 'dotenv/config';
import express from 'express';

const app = express();
const port = parseInt(process.env.CQ_REVERSE_SERVER_PORT, 10) || 8081;

app.use(express.json());

export interface IMessageHandler {
  isPrivate: boolean;
  senderId: string;
  groupId?: string;
  message: string;
}

export type MessageHandler = (params: IMessageHandler) => any | Promise<any>;

function startReverseServer(handler: MessageHandler) {
  app.post('/', async (req, res) => {
    const event = req.body.post_type;
    if (event !== 'message') {
      res.json({ status: 'success' });
      return;
    }
    const isPrivate = req.body.message_type === 'private';
    res.json({ status: 'success' });
    await handler({
      isPrivate,
      senderId: req.body.user_id.toString(),
      groupId: isPrivate ? null : req.body.group_id.toString(),
      message: req.body.message,
    });
  });

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

export default startReverseServer;
