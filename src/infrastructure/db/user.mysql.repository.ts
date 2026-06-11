import { getPool } from "./mysql-client";

export interface UpsertUserInput {
  email: string;
  name: string | null;
  image: string | null;
}

/** Crea o actualiza el usuario al loguearse (estrategia JWT: users es nuestra única tabla). */
export async function upsertUser(input: UpsertUserInput): Promise<void> {
  await getPool().execute(
    `INSERT INTO users (email, name, image)
     VALUES (:email, :name, :image) AS new
     ON DUPLICATE KEY UPDATE name = new.name, image = new.image`,
    { email: input.email, name: input.name, image: input.image },
  );
}
