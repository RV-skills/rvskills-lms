import { beforeEach, describe, expect, it, vi } from "vitest";
import { userService } from '../user.service';
import { userRepository } from '../../repositories/user.repository';
import { ConflictError, NotFoundError } from '@rv-lms/shared-utils';

vi.mock("../../repositories/user.repository", () => ({
    userRepository: {
        findById: vi.fn(),
        findByEmail: vi.fn(),
        findByUsername: vi.fn(),
        findWithRoles: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
        assignRole: vi.fn(),
        findRoleByName: vi.fn(),
    },
}));


describe("userService.register", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("registers a new user successfully", async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue(null as never);
        vi.mocked(userRepository.findByUsername).mockResolvedValue(null as never);
        vi.mocked(userRepository.create).mockResolvedValue({
            user_id: "user-1",
            tenant_id: "rv-skills-tenant",
            email: "test@rv-skills.com"
        } as never);
        vi.mocked(userRepository.findRoleByName).mockResolvedValue({
            role_id: "role-student"
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
                { role: { role_id: "role-student", role_name: "Student" } },
            ],
        } as never);
        const result = await userService.register({
            first_name: "Test",
            last_name: "User",
            username: "testuser",
            email: "test@rvskills.com",
            password: "password123",
        });

        expect(result.email).toBe("test@rvskills.com");
        expect(result).not.toHaveProperty("password_hash");
        expect(userRepository.assignRole).toHaveBeenCalledWith(
            "user-1",
            "role-student"
        );
    });


    it("throws ConflictError if email already exists", async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue({
            user_id: "existing-user"
        } as never);

        await expect(
            userService.register({
                first_name: 'Test',
                last_name: 'User',
                username: 'testuser',
                email: 'taken@rvskills.com',
                password: 'password123',
            })
          ).rejects.toThrow(ConflictError);
        });

    it('throws ConflictError if username already exists', async () => {
        vi.mocked(userRepository.findByEmail).mockResolvedValue(null as never);
        vi.mocked(userRepository.findByUsername).mockResolvedValue({
          user_id: 'existing-user',
        } as never);

        await expect(
          userService.register({
            first_name: 'Test',
            last_name: 'User',
            username: 'takenuser',
            email: 'new@rvskills.com',
            password: 'password123',
          })
        ).rejects.toThrow(ConflictError);
      });
});

describe("userService.getProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user profile when found', async () => {
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
      user_roles: [],
    } as never);

    const result = await userService.getProfile('user-1');

    expect(result.user_id).toBe('user-1');
  });

  it('throws NotFoundError when user does not exist', async () => {
    vi.mocked(userRepository.findWithRoles).mockResolvedValue(null as never);

    await expect(
      userService.getProfile('missing-user')
    ).rejects.toThrow(NotFoundError);
  });
});