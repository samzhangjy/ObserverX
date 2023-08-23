import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('UserInfo')
class UserInfo {
  @PrimaryColumn()
  public userId!: string;

  @Column({ nullable: true })
  public personality?: string;

  @Column({ nullable: true })
  public hobbies?: string;
}

export default UserInfo;
