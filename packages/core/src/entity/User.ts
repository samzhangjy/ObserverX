import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
class User {
  @PrimaryGeneratedColumn('increment')
  public id!: number;

  @Column({ nullable: true })
  public name?: string;

  @Column({ nullable: true })
  public personality?: string;

  @Column({ nullable: true })
  public hobbies?: string;
}

export default User;
