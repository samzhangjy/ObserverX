import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('Contact')
class Contact {
  @PrimaryColumn()
  public parentId!: string;

  @Column()
  public name!: string;
}

export default Contact;
