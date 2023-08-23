import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import type Message from './Message.js';

@Entity('User')
class User {
  @PrimaryColumn()
  public id!: string;

  @Column({ nullable: true })
  public name?: string;

  @OneToMany('Message', (message: Message) => message.sender)
  public messages!: Message[];

  @Column({ default: false })
  public isAdmin!: boolean;
}

export default User;
