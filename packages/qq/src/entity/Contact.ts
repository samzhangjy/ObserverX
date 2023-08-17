import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum ContactType {
  SINGLE_USER_DIRECT_MESSAGE = 'SINGLE_USER_DIRECT_MESSAGE',
  GROUP_MESSAGE = 'GROUP_MESSAGE',
}

@Entity('Contact')
class Contact {
  @PrimaryColumn()
  public parentId!: string;

  @Column({ nullable: true })
  public name?: string;

  @Column({ type: 'enum', enum: ContactType })
  public type!: ContactType;

  @Column({ nullable: true })
  public model?: string;

  @Column({ default: true })
  public enabled!: boolean;

  @Column({ nullable: true })
  public prompt?: string;

  @Column({ default: 10000 })
  public replyInterval!: number;
}

export default Contact;
