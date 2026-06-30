import { authService } from "../auth.service"
import { userRepository } from "../../repositories/user.repository"
import { tokenRepository } from "../../repositories/token.repository";
import { UnauthorizedError } from "@rv-lms/shared-utils";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

jest.mock("../../repositories/user.repository", () => ({
    userRepository: {
        findByEmail: jest.fn(),
        findWithRoles: jest.fn()
    },
}));

jest.mock("../../repositories/token.repository", () => ({
    tokenRepository: {
        createRefreshToken: jest.fn(),
        findByTokenHash: jest.fn(),
        revokeToken: jest.fn(),
        revokeAllUsersTokens: jest.fn()
    }
}));

jest.mock("jsonwebtoken");

const REAL_PASSWORD = "correct-password-123";
let REAL_PASSWORD_HASH: string;

beforeAll(async () => {
  REAL_PASSWORD_HASH = await bcrypt.hash(REAL_PASSWORD, 12);
});

describe("authService.login", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    })

    it("logs in successfully with correct credentials", async () => {
        (userRepository.findByEmail as jest.Mock).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            email: "test@rvskills.com",
            password_hash: REAL_PASSWORD_HASH
        });

        (userRepository.findWithRoles as jest.Mock).mockResolvedValue({
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
        });

        (jwt.sign as jest.Mock).mockReturnValue("fake-access-token");

        ( tokenRepository.createRefreshToken as jest.Mock).mockResolvedValue({
            token_id: "token-1"
        });

        const result = await authService.login("test@rvskills.com", REAL_PASSWORD);

        expect(result.access_token).toBe("fake-access-token");
        expect(result.refresh_token).toBeDefined()
    })

    it("throws UnauthorizedError if user is not found", async () => {
        (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);

        await expect(
            authService.login("missing@rvskills.com", "anypassword")
        ).rejects.toThrow(UnauthorizedError);
    });

    it("throws Unauthorized if password is incorrect", async () => {
        (userRepository.findByEmail as jest.Mock).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            email: "test@rvskills.com",
            password_hash: REAL_PASSWORD_HASH
        });

        await expect(
            authService.login("test@rvskills.com", "totally-wronged-password")
        ).rejects.toThrow(UnauthorizedError);
    })
})

describe("authService.refreshAccessToken", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("rotates tokens successfully with a valid refresh token", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);

        (tokenRepository.findByTokenHash as jest.Mock).mockResolvedValue({
            token_id: "old-token-id",
            user_id: "user-1",
            expires_at: futureDate
        });
        (tokenRepository.revokeToken as jest.Mock).mockResolvedValue({});

        (userRepository.findWithRoles as jest.Mock).mockResolvedValue({
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
        });

    (jwt.sign as jest.Mock).mockReturnValue('new-fake-access-token');

    (tokenRepository.createRefreshToken as jest.Mock).mockResolvedValue({
        token_id: 'new-token-id',
    });

    const result = await authService.refreshAccessToken('some-old-refresh-token-value');

    expect(result.access_token).toBe('new-fake-access-token');
    expect(result.refresh_token).toBeDefined();
    expect(tokenRepository.revokeToken).toHaveBeenCalledWith('old-token-id');

    });

    it('throws UnauthorizedError if token is not found', async () => {
        (tokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(null);

        await expect(
            authService.refreshAccessToken('nonexistent-token')
        ).rejects.toThrow(UnauthorizedError);
        });

    it('throws UnauthorizedError if token has expired', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        (tokenRepository.findByTokenHash as jest.Mock).mockResolvedValue({
            token_id: 'expired-token-id',
            user_id: 'user-1',
            expires_at: pastDate,
        });

        await expect(
            authService.refreshAccessToken('expired-token-value')
        ).rejects.toThrow(UnauthorizedError);
    });

    it('does not throw when token does not exist (idempotent)', async () => {
        (tokenRepository.findByTokenHash as jest.Mock).mockResolvedValue(null);

        await expect(
        authService.logout('nonexistent-token')
        ).resolves.not.toThrow();
    
        expect(tokenRepository.revokeToken).not.toHaveBeenCalled();

    });
});