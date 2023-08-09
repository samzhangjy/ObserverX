import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CompletionCreateParams } from 'openai/resources/chat';
// eslint-disable-next-line @typescript-eslint/no-use-before-define
import FunctionCall = CompletionCreateParams.CreateChatCompletionRequestStreaming.Message.FunctionCall;
import type User from './User.js';

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
}

@Entity('Message')
class Message {
  @PrimaryGeneratedColumn('increment')
  public id!: number;

  @Column({ type: 'enum', enum: MessageRole, default: MessageRole.USER })
  public role!: MessageRole;

  @CreateDateColumn()
  public timestamp!: Date;

  @Column({ nullable: true })
  public content?: string;

  @Column({ type: 'jsonb', nullable: true })
  public action?: FunctionCall;

  @Column({ nullable: true })
  public actionName?: string;

  @Column()
  public tokens: number;

  @ManyToOne('User', (user: User) => user.messages, { nullable: true })
  public sender?: User;

  @Column({ nullable: true })
  public parentId?: string;
}

export default Message;
