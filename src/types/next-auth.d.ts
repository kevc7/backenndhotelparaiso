import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email: string
      nombre: string
      rol: string
    }
  }

  interface User {
    id: string
    email: string
    nombre: string
    apellido: string
    rol: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    nombre: string
    rol: string
  }
} 