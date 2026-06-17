import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { userRepository } from "../repositories/user.repository";
import { tokenRepository } from "../repositories/token.repository";
import { UnauthorizedError } from "@rv-lms/shared-utils";
import type { AuthTokenDTO, UserDTO } from "@rv-lms/shared-types";

const DEFAULT_TENANT_ID = 'rv-skills-tenant';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const PRIVATE_KEY = process.env.JWT_PRIVATE_KEY!.replace(/\\n/g, '\n');
const PUBLIC_KEY = process.env.JWT_PUBLIC_KEY!.replace(/\\n/g, '\n');

interface JWTPayload {
    user_id: string,
    tenant_id: string,
    roles: string[],
    permissions: string[]
}

const mapToUserDTO = (user: any): UserDTO => ({
  user_id: user.user_id,
  tenant_id: user.tenant_id,
  first_name: user.first_name,
  last_name: user.last_name,
  username: user.username,
  email: user.email,
  status: user.status,
  roles: user.user_roles?.map((ur: any) => ur.role) ?? [],
  created_at: user.created_at,
  updated_at: user.updated_at,
});

const generateAccessToken = (payload: JWTPayload): string => {
    return jwt.sign(payload, PRIVATE_KEY, {
        algorithm: "RS256",
        expiresIn: ACCESS_TOKEN_EXPIRY
    });
};

const generateRefreshToken = (): string => {
    return crypto.randomBytes(40).toString("hex");
};

const hashToken = (token:string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
};

export const authService = {
    verifyAccessToken(token: string): JWTPayload {
        try{
            return jwt.verify(token, PUBLIC_KEY, {
                algorithms: ['RS256'],
            }) as JWTPayload;
        } catch (error) {
            throw new UnauthorizedError("Invalid or expired token");
        }
    },

    async login(email: string, password: string): Promise<AuthTokenDTO> {
        const user = await userRepository.findByEmail(email, DEFAULT_TENANT_ID);

        if(!user) {
            throw new UnauthorizedError("Invalid email or password");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if(!isPasswordValid){
            throw new UnauthorizedError("Invalid email or password");
        }

        const userWithRoles = await userRepository.findWithRoles(
            user.user_id,
            DEFAULT_TENANT_ID
        );

        const roles = userWithRoles!.user_roles.map((ur: any) => ur.role.role_name);
        const permissions = userWithRoles!.user_roles.flatMap((ur: any) => 
            ur.role.role_permissions.map(
                (rp: any) => `${rp.permission.resource}:${rp.permission.action}`
            )    
        );

        const accessToken = generateAccessToken({
            user_id: user.user_id,
            tenant_id: user.tenant_id,
            roles,
            permissions
        });

        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(refreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        await tokenRepository.createRefreshToken(
        user.user_id,
        refreshTokenHash,
        expiresAt
        );

        return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: 900,
        token_type: 'Bearer',
        user: mapToUserDTO(userWithRoles),
        };
    },

    async refreshAccessToken(refreshToken: string): Promise<AuthTokenDTO> {
        const tokenHash = hashToken(refreshToken);
        const storedToken = await tokenRepository.findByTokenHash(tokenHash);

        if (!storedToken || storedToken.expires_at < new Date()) {
        throw new UnauthorizedError('Invalid or expired refresh token');
        }

        await tokenRepository.revokeToken(storedToken.token_id);

        const userWithRoles = await userRepository.findWithRoles(
        storedToken.user_id,
        DEFAULT_TENANT_ID
        );

        if (!userWithRoles) {
        throw new UnauthorizedError('User not found');
        }

        const roles = userWithRoles.user_roles.map((ur: any) => ur.role.role_name);
        const permissions = userWithRoles.user_roles.flatMap((ur: any) =>
        ur.role.role_permissions.map(
            (rp: any) => `${rp.permission.resource}:${rp.permission.action}`
        )
        );

        const newAccessToken = generateAccessToken({
        user_id: userWithRoles.user_id,
        tenant_id: userWithRoles.tenant_id,
        roles,
        permissions,
        });

        const newRefreshToken = generateRefreshToken();
        const newRefreshTokenHash = hashToken(newRefreshToken);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

        await tokenRepository.createRefreshToken(
        userWithRoles.user_id,
        newRefreshTokenHash,
        expiresAt
        );

        return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        expires_in: 900,
        token_type: 'Bearer',
        user: mapToUserDTO(userWithRoles),
        };
    },


    async logout(refreshToken: string): Promise<void> {
        const tokenHash = hashToken(refreshToken);
        const storedToken = await tokenRepository.findByTokenHash(tokenHash);

        if (storedToken) {
        await tokenRepository.revokeToken(storedToken.token_id);
        }
    },
}