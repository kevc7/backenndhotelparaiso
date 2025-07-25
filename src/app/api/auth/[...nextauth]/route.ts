import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getDbPool } from "@/lib/database";
import bcrypt from "bcryptjs";
import { SessionStrategy } from "next-auth";

const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const pool = getDbPool();
        const client = await pool.connect();
        try {
          const res = await client.query(
            "SELECT * FROM usuarios WHERE email = $1 AND activo = true",
            [credentials.email]
          );
          const user = res.rows[0];
          if (!user) return null;
          const passwordMatch = await bcrypt.compare(credentials.password, user.password_hash);
          if (passwordMatch) {
            return {
              id: user.id,
              email: user.email,
              nombre: user.nombre,
              apellido: user.apellido,
              rol: user.rol
            };
          }
          return null;
        } finally {
          client.release();
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as SessionStrategy
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user?: any }) {
      if (user) {
        token.rol = user.rol;
        token.nombre = user.nombre;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.rol = token.rol;
        session.user.nombre = token.nombre;
        session.user.id = token.id;
      }
      return session;
    }
  },
  pages: {
    signIn: "http://localhost:3001/login"
  },
  secret: process.env.NEXTAUTH_SECRET || "tu-clave-secreta"
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST, authOptions }; 