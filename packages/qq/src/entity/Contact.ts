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
}

export default Contact;
