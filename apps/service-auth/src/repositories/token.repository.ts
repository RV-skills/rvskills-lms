import { PrismaClient } from "../generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ 
    connectionString: process.env.DATABASE_URL! 
});
const prisma = new PrismaClient({ adapter });

export const tokenRepository = {
    async createRefreshToken(user_id: string, token_hash: string, expires_at: Date) {
        return prisma.refreshToken.create({
            data: { user_id, token_hash, expires_at },
        });
    },

    async findByTokenHash(token_hash: string) {
        return prisma.refreshToken.findFirst({
            where: {
                token_hash,
                revoked_at: null
            }
        });
    },

    async revokeToken(token_id: string) {
        return prisma.refreshToken.update({
            where: { token_id },
            data: { revoked_at: new Date() },
        });
    },

    async revokeAllUsersTokens(user_id: string) {
        return prisma.refreshToken.updateMany({
            where: { 
                user_id,
                revoked_at: null
            },
            data: {
                revoked_at: new Date()
            },
        })
    }
}