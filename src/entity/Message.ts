import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ChatCompletionRequestMessageFunctionCall } from 'openai';

export enum MessageRole {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
  FUNCTION = 'function',
}

@Entity()
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
  public action?: ChatCompletionRequestMessageFunctionCall;

  @Column({ nullable: true })
  public actionName?: string;
}

export default Message;
