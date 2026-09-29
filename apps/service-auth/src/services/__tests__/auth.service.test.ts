import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { authService } from "../auth.service"
import { userRepository } from "../../repositories/user.repository";
import { tokenRepository } from "../../repositories/token.repository";
import { UnauthorizedError } from "@rv-lms/shared-utils";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

vi.mock("../../repositories/user.repository", () => ({
    userRepository: {
        findByEmail: vi.fn(),
        findWithRoles: vi.fn()
    },
}));

vi.mock("../../repositories/token.repository", () => ({
    tokenRepository: {
        createRefreshToken: vi.fn(),
        findByTokenHash: vi.fn(),
        revokeToken: vi.fn(),
        revokeAllUsersTokens: vi.fn()
    }
}));

vi.mock("jsonwebtoken");

const REAL_PASSWORD = "correct-password-123";
let REAL_PASSWORD_HASH: string;

beforeAll(async () => {
  REAL_PASSWORD_HASH = await bcrypt.hash(REAL_PASSWORD, 12);
});

describe("authService.login", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    })

    it("logs in successfully with correct credentials", async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            email: "test@rvskills.com",
            password_hash: REAL_PASSWORD_HASH
        } as never);

        vi.mocked(userRepository.findWithRoles).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            first_name: "Test",
            last_name: "User",
            username: "testuser",
            email: "test@rvskills.com",
            status: "active",
            created_at: new Date(),
            updated_at: new Date(),
            user_roles: [
                {
                    role: {
                        role_id: "role-student",
                        role_name: "Student",
                        role_permissions: [
                            { permission: { resource: "course", action: "read" } },
                        ],
                    },
                },
            ],
        } as never);

        vi.mocked(jwt.sign).mockReturnValue("fake-access-token" as never);

        vi.mocked(tokenRepository.createRefreshToken).mockResolvedValue({
            token_id: "token-1"
        } as never);

        const result = await authService.login("test@rvskills.com", REAL_PASSWORD);

        expect(result.access_token).toBe("fake-access-token");
        expect(result.refresh_token).toBeDefined()
    })

    it("throws UnauthorizedError if user is not found", async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue(null as never);

        await expect(
            authService.login("missing@rvskills.com", "anypassword")
        ).rejects.toThrow(UnauthorizedError);
    });

    it("throws Unauthorized if password is incorrect", async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            email: "test@rvskills.com",
            password_hash: REAL_PASSWORD_HASH
        } as never);

        await expect(
            authService.login("test@rvskills.com", "totally-wronged-password")
        ).rejects.toThrow(UnauthorizedError);
    })
})

describe("authService.refreshAccessToken", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("rotates tokens successfully with a valid refresh token", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        vi.mocked(tokenRepository.findByTokenHash).mockResolvedValue({
            token_id: "old-token-id",
            user_id: "user-1",
            expires_at: futureDate
        } as never);
        vi.mocked(tokenRepository.revokeToken).mockResolvedValue({} as never);

        vi.mocked(userRepository.findWithRoles).mockResolvedValue({
            user_id: 'user-1',
            tenant_id: 'rv-skills-tenant',
            first_name: 'Test',
            last_name: 'User',
            username: 'testuser',
            email: 'test@rvskills.com',
            status: 'active',
            created_at: new Date(),
            updated_at: new Date(),
            user_roles: [
                {
                role: {
                    role_id: 'role-student',
                    role_name: 'Student',
                    role_permissions: [
                    { permission: { resource: 'course', action: 'read' } },
                    ],
                },
                },
            ],
        } as never);

    vi.mocked(jwt.sign).mockReturnValue('new-fake-access-token' as never);

    vi.mocked(tokenRepository.createRefreshToken).mockResolvedValue({
        token_id: 'new-token-id',
    } as never);

    const result = await authService.refreshAccessToken('some-old-refresh-token-value');

    expect(result.access_token).toBe('new-fake-access-token');
    expect(result.refresh_token).toBeDefined();
    expect(tokenRepository.revokeToken).toHaveBeenCalledWith('old-token-id');

    });

    it('throws UnauthorizedError if token is not found', async () => {
        vi.mocked(tokenRepository.findByTokenHash).mockResolvedValue(null as never);

        await expect(
            authService.refreshAccessToken('nonexistent-token')
        ).rejects.toThrow(UnauthorizedError);
        });

    it('throws UnauthorizedError if token has expired', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        vi.mocked(tokenRepository.findByTokenHash).mockResolvedValue({
            token_id: 'expired-token-id',
            user_id: 'user-1',
            expires_at: pastDate,
        } as never);

        await expect(
            authService.refreshAccessToken('expired-token-value')
        ).rejects.toThrow(UnauthorizedError);
    });

    it('does not throw when token does not exist (idempotent)', async () => {
        vi.mocked(tokenRepository.findByTokenHash).mockResolvedValue(null as never);

        await expect(
        authService.logout('nonexistent-token')
        ).resolves.not.toThrow();

        expect(tokenRepository.revokeToken).not.toHaveBeenCalled();

    });
});